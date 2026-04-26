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
      const categoryKeywords = {
        devops: ['devops', 'dev ops', 'devsecops', 'release engineer', 'build engineer', 'ci/cd', 'deployment engineer', 'automation engineer', 'kubernetes', 'terraform'],
        sre: ['sre', 'site reliability', 'reliability engineer', 'production engineer', 'observability'],
        security: ['security engineer', 'security analyst', 'appsec', 'infosec', 'cybersecurity', 'penetration test', 'red team', 'blue team', 'soc analyst', 'security architect'],
        ml: ['machine learning', 'ml engineer', 'ml ops', 'deep learning', 'nlp', 'artificial intelligence', 'ai engineer', 'ai research', 'computer vision', 'generative ai', 'applied scientist', 'research scientist'],
        data: ['data engineer', 'data scientist', 'data analyst', 'analytics engineer', 'etl', 'data platform', 'business intelligence', 'bi engineer', 'data architect', 'database engineer', 'dba'],
        mobile: ['mobile engineer', 'mobile developer', 'ios engineer', 'ios developer', 'android engineer', 'android developer', 'react native', 'flutter'],
        qa: ['qa engineer', 'qa analyst', 'quality assurance', 'test engineer', 'sdet', 'test automation', 'quality engineer'],
        embedded: ['embedded', 'firmware', 'hardware engineer', 'fpga', 'rtos', 'iot engineer', 'robotics engineer'],
        fullstack: ['full stack', 'fullstack', 'full-stack', 'software engineer', 'software developer', 'web developer'],
        frontend: ['frontend', 'front-end', 'front end', 'ui engineer', 'ux engineer', 'react', 'vue', 'angular', 'javascript engineer'],
        backend: ['backend', 'back-end', 'back end', 'server engineer', 'api engineer', 'golang', 'java developer', 'python developer', 'systems engineer'],
        platform: ['platform engineer', 'developer experience', 'developer tools', 'dx engineer', 'internal tools'],
        cloud: ['cloud engineer', 'cloud architect', 'aws', 'azure', 'gcp', 'infrastructure engineer', 'network engineer', 'solutions architect'],
        tech_lead: ['tech lead', 'technical lead', 'team lead', 'engineering lead', 'lead engineer'],
        staff: ['staff engineer', 'staff software', 'senior staff'],
        principal: ['principal engineer', 'distinguished engineer'],
        em: ['engineering manager', 'eng manager', 'director of engineering', 'vp engineering', 'head of engineering'],
        tpm: ['technical program manager', 'tpm', 'program manager'],
        product_manager: ['product manager', 'product owner', 'technical product'],
        architect: ['solutions architect', 'software architect', 'system architect', 'enterprise architect'],
        blockchain: ['blockchain', 'web3', 'smart contract', 'solidity', 'defi'],
        game_dev: ['game developer', 'game engineer', 'unity developer', 'unreal', 'gameplay engineer'],
        ios: ['ios engineer', 'ios developer', 'swift developer'],
        android: ['android engineer', 'android developer', 'kotlin developer'],
        network: ['network engineer', 'network architect', 'network operations'],
      };
      const role = req.query.role.toLowerCase();
      const keywords = categoryKeywords[role];
      if (keywords) {
        const roleConds = keywords.map((kw) => {
          const cond = `(j.title ILIKE $${paramIdx} OR j.job_description ILIKE $${paramIdx})`;
          params.push(`%${kw}%`);
          paramIdx++;
          return cond;
        });
        conditions.push(`(${roleConds.join(' OR ')})`);
      } else {
        conditions.push(`(j.title ILIKE $${paramIdx} OR j.job_description ILIKE $${paramIdx})`);
        params.push(`%${req.query.role}%`);
        paramIdx++;
      }
    }

    if (req.query.location) {
      conditions.push(`j.location ILIKE $${paramIdx}`);
      params.push(`%${req.query.location}%`);
      paramIdx++;
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

    if (req.query.work_type) {
      conditions.push(`j.work_type ILIKE $${paramIdx}`);
      params.push(`%${req.query.work_type}%`);
      paramIdx++;
    }

    // Experience filter — match against j.title using level-specific keyword
    // synonyms. Filtering on a dedicated experience_level column was fragile
    // because the column is mostly NULL (postings rarely tag this explicitly)
    // and was missing on some jobs schemas, causing 500s. Title patterns are
    // both more reliable and schema-independent.
    if (req.query.experience) {
      const level = String(req.query.experience).toLowerCase();
      const SYNONYMS = {
        intern:    ['intern'],
        entry:     ['entry', 'junior', 'jr.', 'associate', 'new grad', 'new-grad', 'graduate'],
        mid:       ['mid-level', 'mid level', 'engineer ii', 'engineer 2'],
        senior:    ['senior', 'sr.', 'sr '],
        staff:     ['staff'],
        principal: ['principal', 'distinguished'],
        lead:      ['lead', 'manager', 'director', 'head of'],
      };
      const patterns = SYNONYMS[level] || [level];
      const orClauses = patterns.map(() => `j.title ILIKE $${paramIdx++}`).join(' OR ');
      conditions.push(`(${orClauses})`);
      patterns.forEach((p) => params.push(`%${p}%`));
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
    next(err);
  }
});

/**
 * GET /filters — Distinct filter values for dropdowns.
 */
router.get('/filters', async (req, res, next) => {
  try {
    const [sources, locations, departments, companies, salaryRange] = await Promise.all([
      queryJobs(`SELECT source AS name, COUNT(*) AS count FROM jobs WHERE source IS NOT NULL AND source != '' AND is_active = true GROUP BY source ORDER BY count DESC LIMIT 50`),
      queryJobs(`SELECT location AS name, COUNT(*) AS count FROM jobs WHERE location IS NOT NULL AND location != '' AND is_active = true GROUP BY location ORDER BY count DESC LIMIT 100`),
      queryJobs(`SELECT department AS name, COUNT(*) AS count FROM jobs WHERE department IS NOT NULL AND department != '' AND is_active = true GROUP BY department ORDER BY count DESC LIMIT 50`),
      queryJobs(`SELECT c.name, COUNT(*) AS count FROM jobs j JOIN companies c ON j.company_id = c.id WHERE j.is_active = true GROUP BY c.name ORDER BY count DESC LIMIT 100`),
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
 */
router.post('/backfill-salaries', async (req, res, next) => {
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
