import * as cheerio from 'cheerio';
import { getPlatformCookies } from '../routes/auth.js';
import { getExtensionPlatformCookies } from '../routes/extension.js';

// Platform-specific selectors for extracting problem content
const PLATFORM_SELECTORS = {
  leetcode: [
    '[data-track-load="description_content"]',
    '.content__u3I1',
    '[class*="question-content"]',
    '[class*="elfjS"]', // LeetCode's newer class pattern
    '.question-content__JfgR',
    '[data-key="description-content"]',
  ],
  hackerrank: [
    '.challenge-body-html',
    '.problem-statement',
    '.challenge_problem_statement',
    '.challenge-text',
    '.hr-challenge-description',
  ],
  glider: [
    '.question-description',
    '.problem-description',
    '.coding-question',
    '.question-content',
    '.problem-content',
    '[class*="question-desc"]',
    '[class*="problem-desc"]',
    '.ql-editor', // Glider uses Quill editor
    '.question-body',
  ],
  lark: [
    '.coding-problem',
    '.problem-description',
    '.question-content',
    '[class*="problem-content"]',
    '[class*="question-body"]',
    '.code-problem-desc',
    '.problem-statement',
  ],
  codesignal: [
    '.task-description',
    '.markdown-body',
    '[class*="task-content"]',
  ],
  coderpad: [
    '.question-prompt',
    '.question-description',
    '.problem-statement',
    '.instructions',
    '[class*="question-content"]',
    '[class*="problem-description"]',
    '.markdown-body',
    '.challenge-description',
    '[data-testid="question-prompt"]',
    '.ql-editor',  // CoderPad may use Quill editor
  ],
  codility: [
    '.task-description',
    '[class*="task-description"]',
    '.brinza-task-description',
  ],
  neetcode: [
    '.problem-description',
    '.problem-statement',
    '.question-description',
    '.problem-content',
    '[class*="problem-desc"]',
    '[class*="question-content"]',
    '.markdown-body',
    '.description-content',
  ],
  // Job-board platforms — used by the Lumora prep panel's "Fetch JD"
  // flow. Selectors target the main job-description container so the
  // header/footer/related-postings chrome doesn't bleed into the text.
  greenhouse: [
    '#content',
    '.content',
    '.section-wrapper',
    '#main',
    '[data-mapped="content"]',
  ],
  lever: [
    '.content',
    '.section-wrapper',
    '[data-qa="job-description"]',
    '.posting',
  ],
  workday: [
    '[data-automation-id="jobPostingDescription"]',
    '[data-automation-id="job-posting-details"]',
    '[data-automation-id="primaryDescription"]',
  ],
  ashby: [
    '#root .description',
    '[class*="JobPosting_description"]',
    '[class*="description"]',
  ],
  smartrecruiters: [
    '.job-description',
    '#st-jobDescription',
    '.job-content',
  ],
  linkedin: [
    '.description__text',
    '.show-more-less-html__markup',
    '.jobs-description__content',
  ],
  generic: [
    'article',
    'main',
    '.problem',
    '.description',
    '.content',
    '.question',
    '[role="main"]',
  ],
};

/**
 * Detect platform from URL
 */
function detectPlatform(url) {
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes('leetcode')) return 'leetcode';
  if (hostname.includes('hackerrank')) return 'hackerrank';
  if (hostname.includes('glider')) return 'glider';
  if (hostname.includes('lark') || hostname.includes('larksuite')) return 'lark';
  if (hostname.includes('codesignal')) return 'codesignal';
  if (hostname.includes('coderpad')) return 'coderpad';
  if (hostname.includes('codility')) return 'codility';
  if (hostname.includes('neetcode')) return 'neetcode';

  // Job boards — Fetch JD flow.
  if (hostname.includes('greenhouse.io') || hostname.includes('boards.greenhouse')) return 'greenhouse';
  if (hostname.includes('lever.co')) return 'lever';
  if (hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com')) return 'workday';
  if (hostname.includes('jobs.ashbyhq.com') || hostname.includes('ashbyhq.com')) return 'ashby';
  if (hostname.includes('smartrecruiters.com')) return 'smartrecruiters';
  if (hostname.includes('linkedin.com')) return 'linkedin';

  return 'generic';
}

/**
 * Extract content using platform-specific selectors
 */
function extractContent($, platform) {
  const selectors = [
    ...(PLATFORM_SELECTORS[platform] || []),
    ...PLATFORM_SELECTORS.generic,
  ];

  for (const selector of selectors) {
    const content = $(selector).first().text();
    if (content && content.trim().length > 50) {
      return content;
    }
  }

  return null;
}

/**
 * Strip HTML tags + decode entities, even when the input is the
 * already-text content of a div whose own children are HTML strings
 * (Greenhouse / Workday / SmartRecruiters JD pages frequently embed
 * the description as `<div data-html="<p>..."` or as a JSON-LD
 * `description` value, so cheerio's `.text()` returns the raw
 * angle-bracket markup as a string).
 */
function stripHtmlIfPresent(text) {
  if (!text || typeof text !== 'string') return text;
  // Cheap precondition — only re-parse when the text actually
  // contains tag-shaped substrings. Avoids the cheerio cost on
  // already-clean LeetCode / HackerRank output.
  if (!/<[a-z][^>]{0,300}>/i.test(text)) return text;
  try {
    // Wrap in a synthetic root so cheerio treats the input as a
    // fragment, then read the combined text. Sequential block-level
    // tags get separated by newlines so paragraphs survive.
    const $ = cheerio.load(`<div id="__r">${text}</div>`);
    // Insert newlines between block-level boundaries before extracting
    // text so paragraph spacing isn't lost.
    $('#__r p, #__r br, #__r li, #__r h1, #__r h2, #__r h3, #__r h4, #__r div').each((_, el) => {
      $(el).append('\n');
    });
    let cleaned = $('#__r').text();
    // Decode common HTML entities cheerio leaves in attribute-extracted text.
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return cleaned;
  } catch {
    return text;
  }
}

/**
 * Clean and normalize extracted text
 */
function cleanText(text) {
  return stripHtmlIfPresent(text)
    .replace(/\t/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ ]+/g, ' ')
    .replace(/\n[ ]+/g, '\n')
    .replace(/[ ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Convert inline LaTeX / TeX math (as delivered in HackerRank's clean REST
 * fields — `$n$`, `$1 \le n \le 100$`) into readable Unicode text. Without
 * this the math is either lost (SVG in body_html) or shows as raw `$...$`.
 */
function latexToText(s) {
  if (!s || typeof s !== 'string') return '';
  let t = s;
  // Drop the math delimiters, keep the inner expression.
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, '$1').replace(/\$([^$]*)\$/g, '$1');
  t = t.replace(/\\\(([\s\S]*?)\\\)/g, '$1').replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  const SYMBOLS = [
    [/\\leq\b/g, '≤'], [/\\le\b/g, '≤'], [/\\geq\b/g, '≥'], [/\\ge\b/g, '≥'],
    [/\\neq\b/g, '≠'], [/\\ne\b/g, '≠'], [/\\lt\b/g, '<'], [/\\gt\b/g, '>'],
    [/\\times\b/g, '×'], [/\\cdot\b/g, '·'], [/\\div\b/g, '÷'], [/\\pm\b/g, '±'],
    [/\\ldots\b/g, '…'], [/\\dots\b/g, '…'], [/\\cdots\b/g, '…'], [/\\infty\b/g, '∞'],
    [/\\rightarrow\b/g, '→'], [/\\to\b/g, '→'], [/\\leftarrow\b/g, '←'],
    [/\\Rightarrow\b/g, '⇒'], [/\\sum\b/g, '∑'], [/\\prod\b/g, '∏'], [/\\sqrt\b/g, '√'],
    [/\\alpha\b/g, 'α'], [/\\beta\b/g, 'β'], [/\\gamma\b/g, 'γ'], [/\\theta\b/g, 'θ'],
    [/\\lambda\b/g, 'λ'], [/\\mu\b/g, 'μ'], [/\\pi\b/g, 'π'], [/\\mod\b/g, 'mod'],
    [/\\%/g, '%'], [/\\\$/g, '$'], [/\\&/g, '&'], [/\\_/g, '_'], [/\\#/g, '#'],
    [/\\,/g, ' '], [/\\;/g, ' '], [/\\:/g, ' '], [/\\!/g, ''], [/\\ /g, ' '],
  ];
  for (const [re, rep] of SYMBOLS) t = t.replace(re, rep);
  t = t.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  t = t.replace(/\^\{([^{}]*)\}/g, '^$1').replace(/_\{([^{}]*)\}/g, '_$1');
  // Any remaining \command{inner} → inner; lone \command → dropped.
  t = t.replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, '$1').replace(/\\[a-zA-Z]+/g, '');
  t = t.replace(/[{}]/g, '');
  return t;
}

/**
 * Fetch a HackerRank challenge via its REST API and assemble the problem from
 * the clean, LaTeX-bearing structured fields. The scraped HTML page renders
 * math as MathJax SVG (glyph paths — no text nodes), so cheerio's .text()
 * silently drops every variable/number. The REST payload keeps the real math.
 */
async function fetchHackerRankRest(url, headers) {
  try {
    const m = url.match(/hackerrank\.com\/(?:contests\/([^/]+)\/)?challenges\/([^/?#]+)/i);
    if (!m) return null;
    const contest = m[1] || 'master';
    const slug = m[2];
    const restUrl = `https://www.hackerrank.com/rest/contests/${contest}/challenges/${slug}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let resp;
    try {
      resp = await fetch(restUrl, { headers: { ...headers, Accept: 'application/json' }, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!resp.ok) return null;
    const json = await resp.json();
    const d = json?.model || json;
    if (!d || typeof d.problem_statement !== 'string') return null;
    const parts = [];
    if (d.name) parts.push(String(d.name));
    parts.push(latexToText(d.problem_statement));
    if (d.input_format) parts.push('Input Format\n' + latexToText(d.input_format));
    if (d.constraints) parts.push('Constraints\n' + latexToText(d.constraints));
    if (d.output_format) parts.push('Output Format\n' + latexToText(d.output_format));
    const text = cleanText(parts.join('\n\n'));
    return text && text.length >= 40 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Extract examples/test cases from the page
 */
function extractExamples($) {
  const examples = [];

  // Common example patterns
  const exampleSelectors = [
    '.example',
    '[class*="example"]',
    'pre',
    '.sample-input',
    '.sample-output',
    '[class*="testcase"]',
  ];

  for (const selector of exampleSelectors) {
    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 5 && text.length < 500) {
        examples.push(text);
      }
    });

    if (examples.length >= 3) break;
  }

  return examples.slice(0, 3);
}

/**
 * Extract code template/stub from the page
 * This is the starter code that needs to be completed
 */
function extractCodeTemplate($, platform, html) {
  // Platform-specific template extraction
  if (platform === 'hackerrank') {
    return extractHackerRankTemplate($, html);
  } else if (platform === 'leetcode') {
    return extractLeetCodeTemplate($, html);
  } else if (platform === 'codility') {
    return extractCodilityTemplate($, html);
  }

  // Generic template extraction
  return extractGenericTemplate($);
}

/**
 * Extract HackerRank code template
 */
function extractHackerRankTemplate($, html) {
  // Try to find template in JSON data embedded in script tags
  const scriptTags = $('script').toArray();
  for (const script of scriptTags) {
    const content = $(script).html() || '';

    // Look for code in various JSON structures HackerRank uses
    const patterns = [
      /"code"\s*:\s*"([^"]+)"/,
      /"initial_code"\s*:\s*"([^"]+)"/,
      /"template"\s*:\s*"([^"]+)"/,
      /"stub"\s*:\s*"([^"]+)"/,
      /"boilerplate"\s*:\s*"([^"]+)"/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        try {
          // Unescape the JSON string
          const code = JSON.parse(`"${match[1]}"`);
          if (code && code.length > 20 && looksLikeCode(code)) {
            return { code, language: detectLanguageFromCode(code) };
          }
        } catch (e) {
          // Continue trying other patterns
        }
      }
    }
  }

  // Try textarea elements (some editors use these)
  const textareas = $('textarea').toArray();
  for (const ta of textareas) {
    const code = $(ta).text() || $(ta).val();
    if (code && code.length > 20 && looksLikeCode(code)) {
      return { code, language: detectLanguageFromCode(code) };
    }
  }

  // Try code/pre elements that look like templates
  const codeElements = $('pre code, .code-editor, [class*="editor"] pre, [class*="CodeMirror"]').toArray();
  for (const el of codeElements) {
    const code = $(el).text();
    if (code && code.length > 20 && looksLikeCode(code) && hasIncompleteMarkers(code)) {
      return { code, language: detectLanguageFromCode(code) };
    }
  }

  return null;
}

/**
 * Extract LeetCode code template
 */
function extractLeetCodeTemplate($, html) {
  // LeetCode embeds code in JSON
  const patterns = [
    /"codeSnippets"\s*:\s*\[([^\]]+)\]/,
    /"code"\s*:\s*"([^"]+)"/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        // Try to parse as JSON array
        if (pattern.source.includes('codeSnippets')) {
          const snippets = JSON.parse(`[${match[1]}]`);
          // Find Python snippet preferentially
          const pythonSnippet = snippets.find(s => s.langSlug === 'python3' || s.langSlug === 'python');
          if (pythonSnippet && pythonSnippet.code) {
            return { code: pythonSnippet.code, language: 'python' };
          }
          // Fall back to first snippet
          if (snippets[0] && snippets[0].code) {
            return { code: snippets[0].code, language: snippets[0].langSlug };
          }
        } else {
          const code = JSON.parse(`"${match[1]}"`);
          if (code && code.length > 20 && looksLikeCode(code)) {
            return { code, language: detectLanguageFromCode(code) };
          }
        }
      } catch (e) {
        // Continue
      }
    }
  }

  return null;
}

/**
 * Extract Codility code template
 */
function extractCodilityTemplate($, html) {
  // Codility uses similar patterns
  const codeBlocks = $('[class*="solution"] pre, [class*="editor"] pre, textarea.code').toArray();
  for (const el of codeBlocks) {
    const code = $(el).text();
    if (code && code.length > 20 && looksLikeCode(code)) {
      return { code, language: detectLanguageFromCode(code) };
    }
  }
  return null;
}

/**
 * Generic template extraction
 */
function extractGenericTemplate($) {
  // Look for code blocks that have incomplete function markers
  const codeBlocks = $('pre code, .code-block, [class*="code"]').toArray();
  for (const el of codeBlocks) {
    const code = $(el).text();
    if (code && code.length > 20 && looksLikeCode(code) && hasIncompleteMarkers(code)) {
      return { code, language: detectLanguageFromCode(code) };
    }
  }
  return null;
}

/**
 * Check if text looks like code
 */
function looksLikeCode(text) {
  const codeIndicators = [
    /def\s+\w+\s*\(/,           // Python function
    /function\s+\w+\s*\(/,       // JavaScript function
    /class\s+\w+/,               // Class definition
    /import\s+/,                 // Import statement
    /return\s+/,                 // Return statement
    /public\s+(static\s+)?void/, // Java method
    /int\s+\w+\s*\(/,            // C/C++ function
    /#include/,                  // C/C++ include
    /\bfor\s*\(/,                // For loop
    /\bif\s*\(/,                 // If statement
    /^\s*@\w+/m,                 // Decorator
  ];

  return codeIndicators.some(pattern => pattern.test(text));
}

/**
 * Check if code has markers indicating it needs to be completed
 */
function hasIncompleteMarkers(text) {
  const incompleteMarkers = [
    /# ?(TODO|FIXME|complete|implement|your code|write your)/i,
    /\/\/ ?(TODO|FIXME|complete|implement|your code|write your)/i,
    /pass\s*$/m,                 // Python pass statement
    /raise NotImplementedError/,
    /throw new Error/,
    /# complete the function/i,
    /# write your code/i,
  ];

  return incompleteMarkers.some(pattern => pattern.test(text));
}

/**
 * Detect programming language from code
 */
function detectLanguageFromCode(code) {
  if (/^def\s+\w+|^import\s+\w+|^from\s+\w+\s+import/m.test(code)) return 'python';
  if (/^function\s+\w+|^const\s+\w+\s*=|^let\s+\w+\s*=|^var\s+\w+/m.test(code)) return 'javascript';
  if (/^public\s+class|^import\s+java\./m.test(code)) return 'java';
  if (/^#include|^using\s+namespace/m.test(code)) return 'cpp';
  if (/^package\s+main|^func\s+\w+/m.test(code)) return 'go';
  if (/^use\s+strict|^sub\s+\w+/m.test(code)) return 'perl';
  if (/^require\s+'|^def\s+\w+.*end$/m.test(code)) return 'ruby';
  return 'auto';
}

export async function fetchProblemFromUrl(url, electronCookies = null, req = null) {
  try {
    const platform = detectPlatform(url);

    // Build headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    };

    // Add auth cookies if available for this platform
    // Priority: 1) Electron cookies, 2) Extension-synced cookies, 3) Auth route cookies (user-scoped)
    let cookies = null;
    if (electronCookies && electronCookies[platform]) {
      cookies = electronCookies[platform];
      console.log(`[Scraper] Using Electron cookies for ${platform}`);
    } else {
      cookies = getExtensionPlatformCookies(platform);
      if (cookies) {
        console.log(`[Scraper] Using extension-synced cookies for ${platform}`);
      } else {
        // Pass request context for user/device-scoped cookie lookup
        cookies = getPlatformCookies(platform, req);
        if (cookies) {
          console.log(`[Scraper] Using auth route cookies for ${platform}`);
        }
      }
    }

    if (cookies) {
      headers['Cookie'] = cookies;
    }

    // HackerRank's problem page is a Cloudflare-guarded SPA that frequently
    // 403s from datacenter IPs (like our Railway host), and it renders math as
    // MathJax SVG that cheerio's .text() drops entirely. Its REST API returns
    // clean LaTeX-bearing JSON and needs no HTML, so try it FIRST. Previously
    // the HTML fetch below ran first and threw on a 403 before we ever reached
    // the REST call — which is why HackerRank URLs "weren't detected".
    let problemText = null;
    if (platform === 'hackerrank') {
      problemText = await fetchHackerRankRest(url, headers);
    }

    // Fetch the page HTML. When REST already gave us the problem (HackerRank),
    // this is best-effort — used only for the starter-code template — so an
    // HTTP error or timeout here must NOT abort the whole fetch.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    let response = null;
    try {
      response = await fetch(url, { headers, signal: controller.signal });
    } catch (err) {
      if (!problemText) {
        if (err.name === 'AbortError') {
          throw new Error(`${platform} did not respond in time. Use screenshot or copy-paste instead.`);
        }
        throw err;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    let $ = null;
    let html = '';
    let templateResult = null;
    if (response && response.ok) {
      html = await response.text();
      $ = cheerio.load(html);
      // Extract code template BEFORE removing script tags
      templateResult = extractCodeTemplate($, platform, html);
      // Remove non-content elements
      $('script, style, nav, header, footer, aside, .ads, [class*="sidebar"], [class*="comment"]').remove();
    } else if (!problemText) {
      // No REST fallback text — surface the auth/HTTP error as before.
      if (response && (response.status === 403 || response.status === 401)) {
        const authMsg = cookies
          ? 'Session may have expired. Try syncing again from the extension.'
          : 'Authentication required. Install the Chundu extension and login to the platform.';
        throw new Error(authMsg);
      }
      throw new Error(`Failed to fetch URL: ${response ? response.status : 'no response'}`);
    }

    // Platform-specific extraction (skip when REST already gave us text).
    if (!problemText && $) problemText = extractContent($, platform);

    // Fallback to body text if extraction failed
    if ((!problemText || problemText.length < 100) && $) {
      problemText = $('body').text();
    }

    // Clean up the text
    problemText = cleanText(problemText || '');

    // Extract examples if available
    const examples = $ ? extractExamples($) : [];

    if (!problemText || problemText.length < 20) {
      // Platform-specific error messages
      const platformMessages = {
        coderpad: 'CoderPad interviews are private sessions. Use screenshot or copy-paste the problem text instead.',
        glider: 'Glider requires login. Use screenshot or copy-paste instead.',
        lark: 'Lark requires login. Use screenshot or copy-paste instead.',
        neetcode: 'NeetCode loads content dynamically. Use screenshot or copy-paste the problem text instead.',
      };
      const hint = platformMessages[platform] || 'Try using screenshot or copy-paste instead.';
      throw new Error(`Could not extract problem from ${platform}. ${hint}`);
    }

    // Limit size
    problemText = problemText.substring(0, 8000);

    // If we found a code template, append it to the problem text
    // so the AI knows to complete it rather than write from scratch
    if (templateResult && templateResult.code) {
      const templateSection = `\n\n---\nSTARTER CODE TEMPLATE (Complete this code, do not rewrite from scratch):\n\`\`\`${templateResult.language || ''}\n${templateResult.code}\n\`\`\``;
      problemText = problemText + templateSection;
    }

    return {
      success: true,
      problemText,
      sourceUrl: url,
      platform,
      authenticated: !!cookies,
      examples: examples.length > 0 ? examples : undefined,
      codeTemplate: templateResult || undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      sourceUrl: url,
    };
  }
}
