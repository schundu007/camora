/**
 * The candidate's own prep kit, as a prompt block.
 *
 * Ported from ascend-backend's askRetrieval.js so the Claude tab grounds the
 * same way Ask Sona does. `lumora_prep_state` is this service's own table, so
 * reading it here is native rather than the cross-service reach it is there.
 *
 * The two blocks it builds are deliberately separate and must stay that way.
 * The JD used to sit inside the identity block, under a heading saying "this
 * is who I am" — so the model read the interviewer's company off the posting
 * and answered "at <their company>, we set SLOs on…" to the people who work
 * there. Said out loud that is an instant credibility loss.
 */
import { query } from '../lib/shared-db.js';

export async function getCandidateBackground(userId, { maxChars = 6000 } = {}) {
  if (!userId) return '';
  try {
    const r = await query('SELECT data FROM lumora_prep_state WHERE user_id = $1', [userId]);
    const data = r.rows[0]?.data;
    if (!data || typeof data !== 'object') return '';
    const company = data.activeCompany || (Array.isArray(data.companies) ? data.companies[0] : null);
    const doc = company ? data.data?.[company] : null;
    if (!doc) return '';

    const blocks = [];

    // WHO THE CANDIDATE IS — resume and cover letter ONLY.
    //
    // The JD used to sit in here too, under a heading that reads "this is who
    // 'I' am … any employer … MUST come from THIS material". So the model read
    // the target company off the JD and answered "at Intuit, we set SLOs on
    // critical dependency metrics" for a candidate who has never worked there
    // and was in the room interviewing with them. Said out loud that is an
    // instant credibility loss, so the two are separate blocks now.
    const own = [];
    if (doc.resume) own.push(`RESUME:\n${doc.resume}`);
    if (doc.coverLetter) own.push(`COVER LETTER:\n${doc.coverLetter}`);
    if (own.length) {
      let body = own.join('\n\n');
      if (body.length > maxChars) body = body.slice(0, maxChars);
      blocks.push(`\n\nCANDIDATE BACKGROUND — this is who "I" am, and the ONLY place a first-person claim may come from. Every employer, title, team, project, date, and metric you attribute to yourself MUST appear below. If it does not cover what was asked, answer in the first person from general knowledge and name no company at all — never fill the gap with a plausible-sounding employer or number.\n\n${body}`);
    }

    // THE JOB BEING INTERVIEWED FOR — deliberately outside the identity block.
    if (doc.jd) {
      let jd = doc.jd;
      if (jd.length > maxChars) jd = jd.slice(0, maxChars);
      const who = company || 'this company';
      // What the role ASKS FOR — never what the candidate already does. Those
      // are opposite directions, and reading the posting as a CV is what put
      // the interviewer's own company in the candidate's mouth.
      const source = own.length ? 'out of the CANDIDATE BACKGROUND above' : 'from general knowledge';
      blocks.push(`\n\nTARGET ROLE — the job being interviewed for RIGHT NOW. ${who} is the INTERVIEWER'S company, NOT an employer of the candidate. The candidate has never worked there.

This is a list of REQUIREMENTS the role is asking for. It is NOT a record of work the candidate has done — read in that direction it is exactly backwards. Nothing below is an accomplishment, a past project, or a team they were on.

Never write "at ${who}, we…", "here we…", "our team at ${who}", or anything else that implies having worked there — that is the single worst thing you can put in the candidate's mouth, because the person listening works there and knows it is false.

Use this block for ONE purpose: aiming the answer. It tells you which tools, scale, and problems to reach for ${source}. Where the role itself needs naming, speak about it in the second person — "the way you'd run this here", "for a team your size" — or in the conditional: "I'd start by…".\n\n${jd}`);
    }

    return blocks.join('');
  } catch (err) {
    console.error('[candidateBackground] load failed:', err?.message || err);
    return '';
  }
}
