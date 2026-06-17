/**
 * Jobs API routes — proxy to the jobportal PostgreSQL database.
 *
 * Serves job listings, stats, and detail views to the Camora frontend.
 * Requires JOBS_DATABASE_URL env var pointing to the jobportal database.
 */
import { Router } from 'express';
import { queryJobs } from '../services/jobsDb.js';
import { authenticate } from '../middleware/authenticate.js';
import { extractSalary } from '../services/salaryExtractor.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

const CATEGORY_KEYWORDS = {
  devops: ['devops', 'dev ops', 'devsecops', 'release engineer', 'build engineer', 'deployment engineer', 'automation engineer'],
  sre: ['sre', 'site reliability', 'reliability engineer', 'production engineer', 'observability engineer'],
  security: ['security engineer', 'security analyst', 'appsec', 'infosec', 'cybersecurity', 'penetration test', 'red team', 'blue team', 'soc analyst', 'security architect'],
  ml: ['machine learning', 'ml engineer', 'mlops', 'deep learning', 'nlp engineer', 'ai engineer', 'ai research', 'computer vision', 'generative ai', 'applied scientist', 'research scientist'],
  data: ['data engineer', 'data scientist', 'data analyst', 'analytics engineer', 'data platform', 'business intelligence', 'bi engineer', 'data architect', 'database engineer', 'dba'],
  mobile: ['mobile engineer', 'mobile developer', 'ios engineer', 'ios developer', 'android engineer', 'android developer', 'react native developer', 'flutter developer'],
  qa: ['qa engineer', 'qa analyst', 'quality assurance', 'test engineer', 'sdet', 'test automation', 'quality engineer'],
  embedded: ['embedded engineer', 'firmware engineer', 'hardware engineer', 'fpga engineer', 'iot engineer', 'robotics engineer'],
  fullstack: ['full stack', 'fullstack', 'full-stack'],
  frontend: ['frontend', 'front-end', 'front end', 'ui engineer', 'ux engineer'],
  backend: ['backend', 'back-end', 'back end', 'server engineer', 'api engineer'],
  platform: ['platform engineer', 'developer experience', 'developer tools', 'dx engineer', 'internal tools'],
  cloud: ['cloud engineer', 'cloud architect', 'infrastructure engineer', 'network engineer', 'solutions architect'],
  tech_lead: ['tech lead', 'technical lead', 'team lead', 'engineering lead', 'lead engineer'],
  staff: ['staff engineer', 'staff software', 'senior staff'],
  principal: ['principal engineer', 'distinguished engineer'],
  em: ['engineering manager', 'eng manager', 'director of engineering', 'vp engineering', 'head of engineering'],
  tpm: ['technical program manager', 'tpm', 'program manager'],
  product_manager: ['product manager', 'product owner', 'technical product'],
  architect: ['solutions architect', 'software architect', 'system architect', 'enterprise architect'],
  blockchain: ['blockchain engineer', 'web3 engineer', 'smart contract engineer', 'solidity engineer'],
  game_dev: ['game developer', 'game engineer', 'unity developer', 'unreal engineer', 'gameplay engineer'],
  ios: ['ios engineer', 'ios developer', 'swift developer'],
  android: ['android engineer', 'android developer', 'kotlin developer'],
  network: ['network engineer', 'network architect', 'network operations'],
};

/**
 * Build a SQL WHERE snippet + params array for a comma-separated role string.
 * Returns null if roleStr is empty/falsy.
 * startIdx: the $N index for the first param.
 */
function buildRoleCondition(roleStr, startIdx) {
  if (!roleStr) return null;
  const roles = roleStr.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (!roles.length) return null;
  const params = [];
  let idx = startIdx;
  const groups = [];
  for (const role of roles) {
    const keywords = CATEGORY_KEYWORDS[role];
    if (keywords) {
      const conds = keywords.map((kw) => { params.push(`%${kw}%`); return `title ILIKE $${idx++}`; });
      groups.push(`(${conds.join(' OR ')})`);
    } else {
      params.push(`%${role}%`);
      groups.push(`title ILIKE $${idx++}`);
    }
  }
  return { where: `(${groups.join(' OR ')})`, params, nextIdx: idx };
}

/**
 * GET /stats — Job statistics.
 *
 * Returns total active jobs, total companies, and jobs by source.
 * NOTE: This route must be defined before /:id to avoid "stats" matching as an id.
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [totalResult, companiesResult, sourceResult] = await Promise.all([
      queryJobs('SELECT COUNT(*) AS total FROM jobs WHERE is_active = true'),
      queryJobs('SELECT COUNT(DISTINCT id) AS total FROM companies'),
      queryJobs(
        `SELECT source, COUNT(*) AS count
         FROM jobs
         WHERE is_active = true
         GROUP BY source
         ORDER BY count DESC`,
      ),
    ]);

    res.json({
      total_active_jobs: parseInt(totalResult.rows[0].total, 10),
      total_companies: parseInt(companiesResult.rows[0].total, 10),
      jobs_by_source: sourceResult.rows.map((r) => ({
        source: r.source,
        count: parseInt(r.count, 10),
      })),
    });
  } catch (err) {
    if (err.message === 'Jobs database not configured') {
      return res.status(503).json({ detail: 'Jobs database not configured' });
    }
    next(err);
  }
});

/**
 * GET / — List jobs with filters.
 *
 * Query params:
 *   role       — filter by title (ILIKE)
 *   location   — filter by location (ILIKE)
 *   min_salary — minimum salary_min value
 *   search     — search title or job_description (ILIKE)
 *   company    — filter by company name (ILIKE)
 *   limit      — results per page (default 50, max 200)
 *   offset     — pagination offset (default 0)
 */
router.get('/', async (req, res, next) => {
  try {
    const conditions = ['j.is_active = true'];
    const params = [];
    let paramIdx = 1;

    if (req.query.role) {
      // Role keywords match the JOB TITLE only — matching against
      // j.job_description was producing massive over-matching: a backend
      // role whose description mentions "may collaborate with frontend"
      // came back under both backend AND frontend filters; a Java backend
      // role mentioning "we use React on the client" came back under
      // frontend; etc. The title is the authoritative role signal — if
      // a role isn't in the title, the JD reference is incidental.
      //
      // Tightened keyword lists too: removed generic terms like
      // "software engineer" / "software developer" from `fullstack`
      // (they matched ~80% of all postings), and pulled tech-stack tokens
      // (react / vue / angular / kubernetes / terraform / aws / azure / gcp)
      // out of role categories — those belong in a separate tech-stack
      // filter, not as title-keyword proxies.
      const built = buildRoleCondition(req.query.role, paramIdx);
      if (built) {
        conditions.push(built.where.replace(/\btitle\b/g, 'j.title'));
        params.push(...built.params);
        paramIdx = built.nextIdx;
      }
    }

    if (req.query.location) {
      conditions.push(`j.location ILIKE $${paramIdx}`);
      params.push(`%${req.query.location}%`);
      paramIdx++;
    }

    if (req.query.country) {
      const country = req.query.country.trim();
      if (country.toLowerCase() === 'united states' || country.toLowerCase() === 'us') {
        // On-site US: state abbreviation suffix ("San Francisco, CA") or explicit country name.
        // Remote: include jobs with "remote" in location UNLESS they explicitly restrict to
        // an unfriendly/non-English-speaking region. Remote jobs open to US/Canada/UK/global
        // pass through; "Remote - India only", "Remote (LATAM)", "Remote Europe" are excluded.
        const UNFRIENDLY = [
          '%india%', '%europe only%', '%europe - %', '% europe%remote%',
          '%latam%', '%latin america%', '%apac%', '%asia pacific%',
          '%mena%', '%africa%', '%pakistan%', '%ukraine%',
          '%philippines%', '%nigeria%', '%brazil%', '%mexico%', '%colombia%',
        ];
        const p = paramIdx;
        params.push('%United States%');  // p
        params.push('%, USA%');          // p+1
        params.push('%remote%');         // p+2
        UNFRIENDLY.forEach((r) => params.push(r)); // p+3 … p+2+N
        const notClauses = UNFRIENDLY.map((_, i) => `AND NOT j.location ILIKE $${p + 3 + i}`).join(' ');
        conditions.push(`(
          j.location ~ ', [A-Z]{2}$'
          OR j.location ~ ', [A-Z]{2} '
          OR j.location ILIKE $${p}
          OR j.location ILIKE $${p + 1}
          OR (j.location ILIKE $${p + 2} ${notClauses})
        )`);
        paramIdx += 3 + UNFRIENDLY.length;
        // Also exclude jobs whose title reveals a non-US geographic restriction.
        // e.g. "Staff Solutions Architect - Australia" with location "Remote"
        // passes the location filter but is clearly Australia-specific.
        conditions.push(`NOT j.title ILIKE ANY(ARRAY[
          '% - australia', '% - australia %', '%(australia)%', '% - anz%',
          '% apj', '% apj %', '%(apj)%', '%- apj%',
          '% - emea', '% - emea %', '%(emea)%', '% emea %',
          '% - apac', '% - apac %', '%(apac)%', '% apac %',
          '% - latam', '% - latam %', '%(latam)%', '% latam %',
          '% - india', '% - india %', '%(india)%',
          '% - europe', '% - europe %', '%(europe)%',
          '% - mena', '% - mena %', '%(mena)%',
          '% - japan', '% - korea', '% - china',
          '% - singapore', '% - brazil', '% - mexico',
          '% - colombia', '% - pakistan', '% - philippines', '% - nigeria'
        ])`);
      } else {
        conditions.push(`j.location ILIKE $${paramIdx}`);
        params.push(`%${country}%`);
        paramIdx++;
      }
    }

    if (req.query.min_salary) {
      const minSalary = parseInt(req.query.min_salary, 10);
      if (!isNaN(minSalary)) {
        conditions.push(`j.salary_min >= $${paramIdx}`);
        params.push(minSalary);
        paramIdx++;
      }
    }

    if (req.query.search) {
      conditions.push(
        `(j.title ILIKE $${paramIdx} OR j.job_description ILIKE $${paramIdx})`,
      );
      params.push(`%${req.query.search}%`);
      paramIdx++;
    }

    if (req.query.company) {
      conditions.push(`c.name ILIKE $${paramIdx}`);
      params.push(`%${req.query.company}%`);
      paramIdx++;
    }

    if (req.query.max_salary) {
      const maxSalary = parseInt(req.query.max_salary, 10);
      if (!isNaN(maxSalary)) {
        conditions.push(`j.salary_max <= $${paramIdx}`);
        params.push(maxSalary);
        paramIdx++;
      }
    }

    if (req.query.source) {
      conditions.push(`j.source ILIKE $${paramIdx}`);
      params.push(`%${req.query.source}%`);
      paramIdx++;
    }

    if (req.query.department) {
      conditions.push(`j.department ILIKE $${paramIdx}`);
      params.push(`%${req.query.department}%`);
      paramIdx++;
    }

    // work_type filter — j.work_type column is mostly NULL on the
    // jobportal dataset (ATS scrapers don't reliably tag this), so the
    // UI's card label uses location-keyword detection. To keep the
    // sidebar filter consistent with the displayed labels, match
    // EITHER the structured column OR the location text. Special-case
    // "onsite" to also cover "on-site" hyphenation, and treat onsite
    // as the negation of remote+hybrid keywords (since most onsite
    // postings just list a city without a tag).
    if (req.query.work_type) {
      const wt = String(req.query.work_type).toLowerCase().trim();
      if (wt === 'remote') {
        conditions.push(`(j.work_type ILIKE $${paramIdx} OR j.location ILIKE $${paramIdx})`);
        params.push('%remote%');
        paramIdx++;
      } else if (wt === 'hybrid') {
        conditions.push(`(j.work_type ILIKE $${paramIdx} OR j.location ILIKE $${paramIdx})`);
        params.push('%hybrid%');
        paramIdx++;
      } else if (wt === 'onsite' || wt === 'on-site' || wt === 'on site') {
        // On-site = neither Remote nor Hybrid in the location/work_type
        // (job description may still mention the words, but the location
        // field is the authoritative signal here).
        conditions.push(
          `(j.work_type IS NULL OR (j.work_type NOT ILIKE $${paramIdx} AND j.work_type NOT ILIKE $${paramIdx + 1}))`
          + ` AND (j.location IS NULL OR (j.location NOT ILIKE $${paramIdx} AND j.location NOT ILIKE $${paramIdx + 1}))`,
        );
        params.push('%remote%', '%hybrid%');
        paramIdx += 2;
      } else {
        conditions.push(`(j.work_type ILIKE $${paramIdx} OR j.location ILIKE $${paramIdx})`);
        params.push(`%${wt}%`);
        paramIdx++;
      }
    }

    // Experience filter — match against j.title using level-specific
    // keyword synonyms. The structured experience_level column is mostly
    // NULL on the jobportal dataset, so title patterns are both more
    // reliable and schema-independent.
    //
    // For "mid", strict synonym matching (only "mid-level" / "engineer II")
    // missed almost every plain "Software Engineer" posting. Mirroring the
    // UI badge logic, "mid" is now NEGATIVE: it's any title that DOES NOT
    // contain a junior or senior+ keyword. This keeps Mid as the implicit
    // bucket — same way most candidates read these postings — and brings
    // the backend filter into agreement with the experience-badge color
    // shown on each card.
    if (req.query.experience) {
      const levels = String(req.query.experience).toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
      const SYNONYMS = {
        intern:    ['intern'],
        entry:     ['entry', 'junior', 'jr.', 'associate', 'new grad', 'new-grad', 'graduate'],
        mid:       null, // handled as negative filter
        senior:    ['senior', 'sr.', 'sr '],
        staff:     ['staff'],
        principal: ['principal', 'distinguished'],
        lead:      ['lead', 'manager', 'director', 'head of'],
      };
      const MID_NEGATIVES = [
        'intern', 'junior', 'jr.', 'jr ', 'associate', 'new grad', 'new-grad',
        'entry', 'senior', 'sr.', 'sr ', 'staff', 'principal', 'distinguished',
        'lead', 'manager', 'director', 'head of', 'vp ', 'vice president',
        'chief', 'fellow',
      ];
      const levelGroups = [];
      for (const level of levels) {
        if (level === 'mid') {
          const notClauses = MID_NEGATIVES.map(() => `j.title NOT ILIKE $${paramIdx++}`).join(' AND ');
          levelGroups.push(`(j.title IS NOT NULL AND ${notClauses})`);
          MID_NEGATIVES.forEach((p) => params.push(`%${p}%`));
        } else {
          const patterns = SYNONYMS[level] || [level];
          const orClauses = patterns.map(() => `j.title ILIKE $${paramIdx++}`).join(' OR ');
          levelGroups.push(`(${orClauses})`);
          patterns.forEach((p) => params.push(`%${p}%`));
        }
      }
      if (levelGroups.length > 0) {
        conditions.push(`(${levelGroups.join(' OR ')})`);
      }
    }

    if (req.query.h1b_only === 'true') {
      const USC_PATTERNS = [
        '%us citizen%', '%u.s. citizen%', '%usc only%', '%must be a us citizen%',
        '%green card%', '%permanent resident%', '%gc required%', '%gc holder%',
        '%requires citizenship%', '%require citizenship%',
        '%security clearance%', '%active clearance%', '%secret clearance%',
        '%top secret%', '%ts/sci%', '%ts / sci%',
      ];
      for (const pat of USC_PATTERNS) {
        conditions.push(`(j.job_description IS NULL OR j.job_description NOT ILIKE $${paramIdx})`);
        params.push(pat);
        paramIdx++;
      }
    }

    if (req.query.posted_within) {
      const days = parseInt(req.query.posted_within, 10);
      if (!isNaN(days) && days > 0 && days <= 365) {
        conditions.push(`j.posted_date >= NOW() - INTERVAL '${days} days'`);
      }
    }

    let limit = parseInt(req.query.limit, 10) || 50;
    if (limit < 1) limit = 1;
    if (limit > 200) limit = 200;

    let offset = parseInt(req.query.offset, 10) || 0;
    if (offset < 0) offset = 0;

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT j.id, j.title, j.location, j.salary_min, j.salary_max, j.job_url,
             j.source, j.posted_date, j.department, j.ai_summary, j.ai_tech_stack,
             j.is_active, j.date_found,
             c.name AS company_name, c.website AS company_website, c.industry AS company_industry
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE ${whereClause}
      ORDER BY j.posted_date DESC NULLS LAST, j.date_found DESC NULLS LAST
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `;

    params.push(limit, offset);

    const countSql = `
      SELECT COUNT(*) AS total
      FROM jobs j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE ${whereClause}
    `;

    // Run data query and count query in parallel
    const [dataResult, countResult] = await Promise.all([
      queryJobs(sql, params),
      queryJobs(countSql, params.slice(0, -2)), // exclude limit/offset
    ]);

    res.json({
      jobs: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      limit,
      offset,
    });
  } catch (err) {
    if (err.message === 'Jobs database not configured') {
      return res.status(503).json({ detail: 'Jobs database not configured' });
    }
    // Surface the actual failure into the Railway log so a 500 on a
    // filter click doesn't require redeploying with extra prints to
    // diagnose. Logs the pg-error shape (code/position/detail) plus the
    // offending query params so the failure can be reproduced locally.
    console.error('[jobs] GET / failed', {
      query: req.query,
      message: err?.message,
      code: err?.code,
      position: err?.position,
      detail: err?.detail,
    });
    next(err);
  }
});

/**
 * GET /filters — Distinct filter values for dropdowns.
 *
 * Query params:
 *   role          — filter counts to jobs matching this role category
 *   posted_within — filter counts to jobs posted within N days
 *   country       — filter counts to jobs in the specified country/region
 *                   (supports "united states" / "us" with regex location matching)
 */
router.get('/filters', async (req, res, next) => {
  try {
    // If role filter is active, location/source/company counts reflect only
    // matching jobs so the sidebar numbers match what the user actually sees.
    const roleFilter = req.query.role || '';
    const built = buildRoleCondition(roleFilter, 1);
    const roleWhere = built
      ? `AND ${built.where} `
      : '';
    const roleParams = built ? built.params : [];

    let postedWhere = '';
    if (req.query.posted_within) {
      const days = parseInt(req.query.posted_within, 10);
      if (!isNaN(days) && days > 0 && days <= 365) {
        postedWhere = `AND posted_date >= NOW() - INTERVAL '${days} days' `;
      }
    }

    let countryWhere = '';
    if (req.query.country) {
      const c = req.query.country.trim().toLowerCase();
      if (c === 'united states' || c === 'us') {
        // Only count US-pattern locations + remote in the sidebar
        countryWhere = `AND (location ~ ', [A-Z]{2}$' OR location ~ ', [A-Z]{2} ' OR location ILIKE '%United States%' OR location ILIKE '%remote%') `;
      }
    }

    const [sources, locations, departments, companies, salaryRange] = await Promise.all([
      queryJobs(
        `SELECT source AS name, COUNT(*) AS count FROM jobs WHERE source IS NOT NULL AND source != '' AND is_active = true ${roleWhere}${postedWhere}${countryWhere}GROUP BY source ORDER BY count DESC LIMIT 50`,
        roleParams,
      ),
      queryJobs(
        `SELECT location AS name, COUNT(*) AS count FROM jobs WHERE location IS NOT NULL AND location != '' AND is_active = true ${roleWhere}${postedWhere}${countryWhere}GROUP BY location ORDER BY count DESC LIMIT 200`,
        roleParams,
      ),
      queryJobs(
        `SELECT department AS name, COUNT(*) AS count FROM jobs WHERE department IS NOT NULL AND department != '' AND is_active = true ${roleWhere}${postedWhere}${countryWhere}GROUP BY department ORDER BY count DESC LIMIT 50`,
        roleParams,
      ),
      queryJobs(
        `SELECT name, COUNT(*) AS count FROM (SELECT c.name FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.is_active = true ${roleWhere}${postedWhere}${countryWhere.replace(/\blocation\b/g, 'j.location')}) sub GROUP BY name ORDER BY count DESC LIMIT 100`,
        roleParams,
      ),
      queryJobs(`SELECT MIN(salary_min) AS min, MAX(salary_max) AS max FROM jobs WHERE is_active = true AND salary_min IS NOT NULL`),
    ]);
    res.json({
      sources: sources.rows.map(r => ({ name: r.name, count: parseInt(r.count, 10) })),
      locations: locations.rows.map(r => ({ name: r.name, count: parseInt(r.count, 10) })),
      departments: departments.rows.map(r => ({ name: r.name, count: parseInt(r.count, 10) })),
      companies: companies.rows.map(r => ({ name: r.name, count: parseInt(r.count, 10) })),
      salary_range: salaryRange.rows[0] ? { min: salaryRange.rows[0].min, max: salaryRange.rows[0].max } : { min: null, max: null },
    });
  } catch (err) {
    if (err.message === 'Jobs database not configured') {
      return res.status(503).json({ detail: 'Jobs database not configured' });
    }
    next(err);
  }
});

/**
 * GET /:id — Single job detail.
 *
 * Returns full job with description, company info, and tech stack.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    if (isNaN(jobId)) {
      return res.status(400).json({ detail: 'Invalid job ID' });
    }

    const result = await queryJobs(
      `SELECT j.id, j.title, j.location, j.salary_min, j.salary_max, j.job_url,
              j.job_description, j.source, j.posted_date, j.department,
              j.ai_summary, j.ai_tech_stack, j.is_active, j.date_found,
              c.name AS company_name, c.website AS company_website,
              c.industry AS company_industry, c.location AS company_location
       FROM jobs j
       LEFT JOIN companies c ON j.company_id = c.id
       WHERE j.id = $1`,
      [jobId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ detail: 'Job not found' });
    }

    const job = result.rows[0];

    // Lazy backfill: extract salary from description if missing
    if (!job.salary_min && !job.salary_max && job.job_description) {
      const salary = extractSalary(job.job_description);
      if (salary && (salary.min || salary.max)) {
        try {
          await queryJobs(
            'UPDATE jobs SET salary_min = COALESCE(salary_min, $1), salary_max = COALESCE(salary_max, $2) WHERE id = $3',
            [salary.min, salary.max, job.id],
          );
          job.salary_min = salary.min;
          job.salary_max = salary.max;
        } catch { /* ignore */ }
      }
    }

    res.json(job);
  } catch (err) {
    if (err.message === 'Jobs database not configured') {
      return res.status(503).json({ detail: 'Jobs database not configured' });
    }
    next(err);
  }
});

/**
 * POST /backfill-salaries — Bulk extract salaries from job descriptions.
 *
 * Admin-gated: this issues up to 2000 UPDATE writes against the jobs DB
 * per call. Without the admin check any authenticated free-tier user
 * could trigger destructive bulk writes / scrape rate-limit upstream
 * services on demand.
 */
router.post('/backfill-salaries', async (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Admin access required', code: 'ADMIN_REQUIRED' });
  }
  try {
    const batchSize = Math.min(parseInt(req.query.limit) || 500, 2000);
    const result = await queryJobs(
      `SELECT id, job_description FROM jobs
       WHERE salary_min IS NULL AND salary_max IS NULL
         AND job_description IS NOT NULL AND LENGTH(job_description) > 100
         AND is_active = true LIMIT $1`,
      [batchSize],
    );
    let updated = 0;
    for (const row of result.rows) {
      const salary = extractSalary(row.job_description);
      if (salary && (salary.min || salary.max)) {
        await queryJobs('UPDATE jobs SET salary_min = $1, salary_max = $2 WHERE id = $3', [salary.min, salary.max, row.id]);
        updated++;
      }
    }
    res.json({ processed: result.rows.length, updated });
  } catch (err) {
    if (err.message === 'Jobs database not configured') return res.status(503).json({ detail: 'Jobs database not configured' });
    next(err);
  }
});

export default router;
