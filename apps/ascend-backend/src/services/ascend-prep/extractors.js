/**
 * Helpers for ascend prep generation:
 *  - searchInterviewQuestions: pulls real interview questions from
 *    LeetCode discussions + Glassdoor (best-effort, non-fatal on failure).
 *  - extractCompanyName / extractRoleName: pattern-match a JD blob.
 *  - cleanupText / cleanupResult: strip extra whitespace from streamed
 *    strings and recursively clean an object's string fields.
 *
 * Lifted out of services/ascendPrep.js to keep the orchestration file
 * focused on generation flow. cheerio import lives here so the
 * generator path doesn't pull it.
 */
import * as cheerio from 'cheerio';

/**
 * Search for real interview questions from the internet.
 * Tries LeetCode discussions and Glassdoor; returns whatever it finds.
 */
export async function searchInterviewQuestions(companyName, roleName, questionType = 'coding') {
  const results = [];

  // LeetCode discussions
  try {
    const leetcodeUrl = `https://leetcode.com/discuss/interview-question?currentPage=1&orderBy=hot&query=${encodeURIComponent(companyName)}`;
    const response = await fetch(leetcodeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      $('a[href*="/discuss/interview-question/"]').slice(0, 5).each((_, el) => {
        const title = $(el).text().trim();
        if (title && title.length > 10) {
          results.push({ source: 'LeetCode', question: title });
        }
      });
    }
  } catch (err) {
    console.log('[AscendPrep] LeetCode search failed:', err.message);
  }

  // Glassdoor
  try {
    const response = await fetch(`https://www.glassdoor.com/Interview/index.htm?sc.keyword=${encodeURIComponent(companyName + ' ' + roleName)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (response.ok) {
      const html = await response.text();
      const $ = cheerio.load(html);
      $('.interview-question, [class*="interviewQuestion"]').slice(0, 5).each((_, el) => {
        const question = $(el).text().trim();
        if (question && question.length > 10) {
          results.push({ source: 'Glassdoor', question });
        }
      });
    }
  } catch (err) {
    console.log('[AscendPrep] Glassdoor search failed:', err.message);
  }

  // Suppress unused var lint — questionType is a documented arg even if the
  // current implementations don't filter on it (LeetCode/Glassdoor return
  // mixed types; the generator filters downstream).
  void questionType;
  return results;
}

/** Extract company name from job description */
export function extractCompanyName(jobDescription) {
  const patterns = [
    /(?:company|employer|organization)[\s:]+([A-Z][A-Za-z0-9\s&]+?)(?:\s+is|\s+seeks|\s+looking|,|\n)/i,
    /(?:join|work at|working at)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+as|\s+and|,|\n|!)/i,
    /^([A-Z][A-Za-z0-9\s&]{2,30})\s+(?:is seeking|is looking|seeks|hiring)/im,
    /about\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s*:|\s*\n)/i,
  ];

  for (const pattern of patterns) {
    const match = jobDescription.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/** Extract role/position from job description */
export function extractRoleName(jobDescription) {
  const patterns = [
    /(?:position|role|title)[\s:]+([^\n,]+)/i,
    /(?:seeking|hiring|looking for)(?:\s+a)?\s+([^\n,]+?)(?:\s+to|\s+who|\s+with|\.)/i,
    /^([A-Za-z\s]+(?:Engineer|Developer|Architect|Manager|Lead|Senior|Staff|Principal)[^\n]*)/im,
  ];

  for (const pattern of patterns) {
    const match = jobDescription.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return 'Software Engineer';
}

/** Clean up text content — remove extra whitespace and empty lines */
export function cleanupText(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/[ \t]+/g, ' ')           // Multiple spaces to single
    .replace(/\n\s*\n\s*\n/g, '\n\n')  // 3+ newlines to 2
    .replace(/^\s+$/gm, '')            // Remove whitespace-only lines
    .replace(/\n{3,}/g, '\n\n')        // Max 2 consecutive newlines
    .trim();
}

/** Recursively clean all string values in an object */
export function cleanupResult(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'string') return cleanupText(item);
      if (typeof item === 'object') return cleanupResult(item);
      return item;
    }).filter(item => item !== '');
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const cleanedValue = cleanupText(value);
      if (cleanedValue) cleaned[key] = cleanedValue;
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = cleanupResult(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
