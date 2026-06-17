import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';
import { queryJobs } from './jobsDb.js';

const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'Camora <noreply@cariara.com>';

const CATEGORY_KEYWORDS = {
  devops:          ['devops', 'dev ops', 'devsecops', 'release engineer', 'build engineer', 'deployment engineer', 'automation engineer'],
  sre:             ['sre', 'site reliability', 'reliability engineer', 'production engineer', 'observability engineer'],
  security:        ['security engineer', 'security analyst', 'appsec', 'infosec', 'cybersecurity', 'penetration test', 'red team', 'blue team', 'soc analyst', 'security architect'],
  ml:              ['machine learning', 'ml engineer', 'mlops', 'deep learning', 'nlp engineer', 'ai engineer', 'ai research', 'computer vision', 'generative ai', 'applied scientist', 'research scientist'],
  data:            ['data engineer', 'data scientist', 'data analyst', 'analytics engineer', 'data platform', 'business intelligence', 'bi engineer', 'data architect', 'database engineer', 'dba'],
  mobile:          ['mobile engineer', 'mobile developer', 'ios engineer', 'ios developer', 'android engineer', 'android developer', 'react native developer', 'flutter developer'],
  qa:              ['qa engineer', 'qa analyst', 'quality assurance', 'test engineer', 'sdet', 'test automation', 'quality engineer'],
  embedded:        ['embedded engineer', 'firmware engineer', 'hardware engineer', 'fpga engineer', 'iot engineer', 'robotics engineer'],
  fullstack:       ['full stack', 'fullstack', 'full-stack'],
  frontend:        ['frontend', 'front-end', 'front end', 'ui engineer', 'ux engineer'],
  backend:         ['backend', 'back-end', 'back end', 'server engineer', 'api engineer'],
  platform:        ['platform engineer', 'developer experience', 'developer tools', 'dx engineer', 'internal tools'],
  cloud:           ['cloud engineer', 'cloud architect', 'infrastructure engineer', 'network engineer', 'solutions architect'],
  tech_lead:       ['tech lead', 'technical lead', 'team lead', 'engineering lead', 'lead engineer'],
  staff:           ['staff engineer', 'staff software', 'senior staff'],
  principal:       ['principal engineer', 'distinguished engineer'],
  em:              ['engineering manager', 'eng manager', 'director of engineering', 'vp engineering', 'head of engineering'],
  tpm:             ['technical program manager', 'tpm', 'program manager'],
  product_manager: ['product manager', 'product owner', 'technical product'],
  architect:       ['solutions architect', 'software architect', 'system architect', 'enterprise architect'],
  blockchain:      ['blockchain engineer', 'web3 engineer', 'smart contract engineer', 'solidity engineer'],
  game_dev:        ['game developer', 'game engineer', 'unity developer', 'unreal engineer', 'gameplay engineer'],
  ios:             ['ios engineer', 'ios developer', 'swift developer'],
  android:         ['android engineer', 'android developer', 'kotlin developer'],
  network:         ['network engineer', 'network architect', 'network operations'],
};

function buildRoleCondition(roles, startIdx) {
  if (!roles || !roles.length) return null;
  const params = [];
  let idx = startIdx;
  const groups = [];
  for (const role of roles) {
    const keywords = CATEGORY_KEYWORDS[String(role).toLowerCase()];
    if (keywords) {
      const conds = keywords.map(kw => { params.push(`%${kw}%`); return `title ILIKE $${idx++}`; });
      groups.push(`(${conds.join(' OR ')})`);
    } else {
      params.push(`%${role}%`);
      groups.push(`title ILIKE $${idx++}`);
    }
  }
  return { where: `(${groups.join(' OR ')})`, params, nextIdx: idx };
}

async function fetchCandidateJobs(userRoles, windowHours) {
  const roles = Array.isArray(userRoles) ? userRoles : (userRoles ? [userRoles] : []);
  const conditions = ['j.is_active = true', `j.posted_date >= NOW() - INTERVAL '${windowHours} hours'`];
  const params = [];
  let idx = 1;

  if (roles.length > 0) {
    const built = buildRoleCondition(roles, idx);
    if (built) {
      conditions.push(built.where.replace(/\btitle\b/g, 'j.title'));
      params.push(...built.params);
      idx = built.nextIdx;
    }
  }

  const sql = `
    SELECT j.id, j.title, j.location, j.salary_min, j.salary_max, j.job_url,
           j.posted_date, j.ai_summary,
           c.name AS company_name
    FROM jobs j
    LEFT JOIN companies c ON j.company_id = c.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY j.posted_date DESC NULLS LAST
    LIMIT 50
  `;

  const result = await queryJobs(sql, params);
  return result.rows;
}

async function rankJobsWithClaude(jobs, user) {
  const hasResume = !!(user.resume_text && user.resume_text.trim().length > 50);

  const jobList = jobs.map((j, i) => {
    const salary = j.salary_min || j.salary_max
      ? `$${j.salary_min ? Math.round(j.salary_min / 1000) + 'K' : ''}${j.salary_max ? '-$' + Math.round(j.salary_max / 1000) + 'K' : ''}`
      : 'salary not listed';
    return `[${i + 1}] ${j.title} at ${j.company_name} | ${j.location || 'location TBD'} | ${salary}\n${j.ai_summary || ''}`;
  }).join('\n\n');

  const systemPrompt = hasResume
    ? 'You are a job matching assistant. Select the top 10 most relevant jobs for this candidate and write a 2-sentence personalized summary for each explaining why it matches their specific background.'
    : 'You are a job matching assistant. Select the top 10 most compelling jobs by role fit and seniority, and write a 2-sentence summary highlighting what makes each role interesting.';

  const userContent = hasResume
    ? `RESUME:\n${user.resume_text.slice(0, 3000)}\n\nROLE PREFERENCES: ${(user.job_roles || []).join(', ')}\n\nJOBS:\n${jobList}`
    : `ROLE PREFERENCES: ${(user.job_roles || []).join(', ')}\n\nJOBS:\n${jobList}`;

  const prompt = `${userContent}\n\nReturn ONLY a JSON array of up to 10 objects:\n[{"index":<1-based>,"summary":"<2 sentences>"}]\n\nValid JSON only, no markdown.`;

  if (!anthropic) {
    console.warn('[JobAlerts] ANTHROPIC_API_KEY not set, using recency fallback');
    return jobs.slice(0, 10).map(j => ({ ...j, ai_digest_summary: j.ai_summary || '' }));
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = response.content[0]?.text || '[]';
    const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const rankings = JSON.parse(clean);
    return rankings
      .filter(r => r.index >= 1 && r.index <= jobs.length)
      .slice(0, 10)
      .map(r => ({ ...jobs[r.index - 1], ai_digest_summary: r.summary }));
  } catch (err) {
    console.error('[JobAlerts] Claude ranking failed, using recency fallback:', err.message);
    return jobs.slice(0, 10).map(j => ({ ...j, ai_digest_summary: j.ai_summary || '' }));
  }
}

function formatSalary(min, max) {
  if (!min && !max) return null;
  const fmt = n => `$${Math.round(n / 1000)}K`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max)}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getCompanyDomain(name) {
  return (name || '')
    .toLowerCase()
    .replace(/\s+(inc|corp|ltd|llc|co|group|technologies|labs|systems|platform|platforms|solutions)\.?\s*$/i, '')
    .replace(/[^a-z0-9]/g, '') + '.com';
}

function buildEmailHtml({ user, jobs, hasResume, unsubToken }) {
  const firstName = (user.name || 'there').split(' ')[0];
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const unsubUrl = `https://caprab.cariara.com/api/v1/job-alerts/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

  const resumeBanner = !hasResume ? `
    <div style="background:#111827;border:1px solid #1e3a5f;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="flex-shrink:0;width:32px;height:32px;background:#1e3a5f;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" fill="none" stroke="#60a5fa" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        </div>
        <div>
          <p style="color:#93c5fd;font-size:13px;font-weight:600;margin:0 0 4px;">Matches based on role preferences only</p>
          <p style="color:#6b7280;font-size:12px;margin:0 0 10px;line-height:1.5;">Upload your resume to unlock AI-powered personalized ranking against your actual experience and skills.</p>
          <a href="https://camora.cariara.com/capra/resume" style="display:inline-block;background:#26619C;color:#fff;font-size:12px;font-weight:600;text-decoration:none;padding:7px 16px;border-radius:7px;">Upload Resume</a>
        </div>
      </div>
    </div>` : '';

  const jobCards = jobs.map((job, i) => {
    const salary = formatSalary(job.salary_min, job.salary_max);
    const posted = timeAgo(job.posted_date);
    const domain = getCompanyDomain(job.company_name);
    const meta = [job.location, salary, posted].filter(Boolean).join(' · ');
    const prepUrl = `https://camora.cariara.com/jobs/${job.id}/prepare`;
    const logoUrl = `https://img.logo.dev/${domain}?token=pk_WTNVbqXXTuqc9alm89LirQ&size=32&format=png`;

    return `
    <div style="border-bottom:1px solid #1f1f1f;padding:16px 0;${i === 0 ? 'padding-top:0;' : ''}${i === jobs.length - 1 ? 'border-bottom:none;padding-bottom:0;' : ''}">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
        <img src="${logoUrl}" width="28" height="28" alt="" style="border-radius:6px;object-fit:contain;flex-shrink:0;margin-top:2px;">
        <div style="min-width:0;">
          <div style="color:#ffffff;font-size:14px;font-weight:600;line-height:1.3;margin-bottom:2px;">${job.title}</div>
          <div style="color:#6b7280;font-size:12px;">${job.company_name}${meta ? ' · ' + meta : ''}</div>
        </div>
      </div>
      ${job.ai_digest_summary ? `<p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 10px;padding-left:38px;">${job.ai_digest_summary}</p>` : ''}
      <div style="display:flex;gap:8px;padding-left:38px;">
        <a href="${prepUrl}" style="display:inline-block;background:#26619C;color:#fff;font-size:12px;font-weight:600;text-decoration:none;padding:6px 14px;border-radius:6px;">Prepare</a>
        <a href="${job.job_url}" style="display:inline-block;color:#9ca3af;font-size:12px;font-weight:500;text-decoration:none;padding:6px 14px;border:1px solid #2d2d2d;border-radius:6px;">Apply</a>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <img src="https://camora.cariara.com/camora-logo.png" alt="Camora" width="36" height="36" style="border-radius:9px;">
    </div>
    <div style="background:#111111;border:1px solid #1f1f1f;border-radius:16px;padding:28px 24px;">
      <p style="color:#6b7280;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;">${dateStr}</p>
      <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 6px;line-height:1.3;">Hi ${firstName}, your top ${jobs.length} matches today</h1>
      <p style="color:#6b7280;font-size:13px;margin:0 0 24px;">Jobs posted in the last 24 hours, ranked by AI.</p>
      ${resumeBanner}
      ${jobCards}
      <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #1f1f1f;">
        <a href="https://camora.cariara.com/jobs" style="display:inline-block;color:#9ca3af;font-size:13px;font-weight:500;text-decoration:none;padding:9px 20px;border:1px solid #2d2d2d;border-radius:8px;">View all jobs</a>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#374151;font-size:11px;margin:0 0 4px;">Apply · Prepare · Practice · Attend</p>
      <p style="color:#374151;font-size:11px;margin:0;">
        <a href="${unsubUrl}" style="color:#4b5563;text-decoration:underline;">Unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="https://camora.cariara.com" style="color:#4b5563;text-decoration:underline;">camora.cariara.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendJobAlertDigest(user, { test = false } = {}) {
  if (!resend) {
    console.warn('[JobAlerts] RESEND_API_KEY not set, skipping');
    return false;
  }

  const windowHours = test ? 72 : 24;
  let candidates;
  try {
    candidates = await fetchCandidateJobs(user.job_roles, windowHours);
  } catch (err) {
    console.error(`[JobAlerts] Jobs DB fetch failed for user ${user.id}:`, err.message);
    return false;
  }

  if (!candidates.length) {
    console.log(`[JobAlerts] No candidates for user ${user.id} (${user.email}) in ${windowHours}h window`);
    return false;
  }

  const hasResume = !!(user.resume_text && user.resume_text.trim().length > 50);
  const rankedJobs = await rankJobsWithClaude(candidates, user);
  if (!rankedJobs.length) return false;

  const unsubToken = jwt.sign(
    { sub: user.id, purpose: 'job_alert_unsub' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );

  const html = buildEmailHtml({ user, jobs: rankedJobs, hasResume, unsubToken });
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const subject = `Your top ${rankedJobs.length} job matches — ${today}`;

  try {
    const result = await resend.emails.send({ from: FROM, to: user.email, subject, html });
    console.log(`[JobAlerts] Digest sent to ${user.email} (id: ${result?.data?.id || result?.id})`);
    return true;
  } catch (err) {
    console.error(`[JobAlerts] Resend failed for ${user.email}:`, err.message);
    return false;
  }
}
