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
 * GET /filters — Available filter values for dropdowns.
 *
 * Returns distinct sources, locations, departments, companies, and salary range.
 */
router.get('/filters', async (req, res, next) => {
  try {
    const [sourcesResult, locationsResult, departmentsResult, companiesResult, salaryResult] = await Promise.all([
      queryJobs(
        `SELECT source, COUNT(*) AS count
         FROM jobs WHERE is_active = true AND source IS NOT NULL
         GROUP BY source ORDER BY count DESC`,
      ),
      queryJobs(
        `SELECT location, COUNT(*) AS count FROM jobs
         WHERE is_active = true AND location IS NOT NULL AND location != ''
         GROUP BY location ORDER BY count DESC`,
      ),
      queryJobs(
        `SELECT department, COUNT(*) AS count
         FROM jobs WHERE is_active = true AND department IS NOT NULL AND department != ''
         GROUP BY department ORDER BY count DESC LIMIT 50`,
      ),
      queryJobs(
        `SELECT c.name, COUNT(*) AS count
         FROM jobs j JOIN companies c ON j.company_id = c.id
         WHERE j.is_active = true
         GROUP BY c.name ORDER BY count DESC LIMIT 100`,
      ),
      queryJobs(
        `SELECT MIN(salary_min) AS min, MAX(salary_max) AS max
         FROM jobs WHERE is_active = true AND salary_min IS NOT NULL`,
      ),
    ]);

    // Extract real city/country locations — skip remote/hybrid variations
    const remotePattern = /\b(remote|hybrid|work from home|wfh|telecommute)\b/i;
    const locationCounts = new Map(); // normalized key → { display, count }
    for (const row of locationsResult.rows) {
      const loc = row.location;
      const rowCount = parseInt(row.count, 10);
      if (!loc) continue;
      const parts = loc.split(/[•;|,]/);
      for (const part of parts) {
        let trimmed = part.trim();
        if (!trimmed) continue;
        // Skip pure remote/hybrid entries — those belong in Work Type filter
        if (remotePattern.test(trimmed)) continue;
        // Skip generic country-only entries like "United States" that are too broad
        // but keep "City, State" or "City, Country" formats
        const key = trimmed.toLowerCase();
        const existing = locationCounts.get(key);
        if (existing) {
          existing.count += rowCount;
        } else {
          locationCounts.set(key, { name: trimmed, count: rowCount });
        }
      }
    }

    // Sort by count descending — only real cities/regions
    const cityLocs = Array.from(locationCounts.values())
      .sort((a, b) => b.count - a.count);

    res.json({
      sources: sourcesResult.rows.map((r) => ({
        name: r.source,
        count: parseInt(r.count, 10),
      })),
      locations: cityLocs.slice(0, 100),
      departments: departmentsResult.rows.map((r) => ({
        name: r.department,
        count: parseInt(r.count, 10),
      })),
      companies: companiesResult.rows.map((r) => ({
        name: r.name,
        count: parseInt(r.count, 10),
      })),
      salary_range: {
        min: salaryResult.rows[0]?.min ? parseInt(salaryResult.rows[0].min, 10) : null,
        max: salaryResult.rows[0]?.max ? parseInt(salaryResult.rows[0].max, 10) : null,
      },
    });
  } catch (err) {
    if (err.message === 'Jobs database not configured') {
      return res.status(503).json({ detail: 'Jobs database not configured' });
    }
    next(err);
  }
});

/**
 * GET / — List jobs with advanced filters.
 *
 * Query params:
 *   role          — filter by title (ILIKE)
 *   location      — filter by location (ILIKE)
 *   min_salary    — minimum salary_min value
 *   max_salary    — maximum salary_max value
 *   search        — search title or job_description (ILIKE)
 *   company       — filter by company name (ILIKE)
 *   source        — filter by job source (exact match)
 *   work_type     — filter by remote/hybrid/onsite (location-based)
 *   department    — filter by department (ILIKE)
 *   posted_within — days since posted (e.g. 1, 7, 14, 30)
 *   experience    — experience level keyword (e.g. senior, staff, principal)
 *   limit         — results per page (default 50, max 200)
 *   offset        — pagination offset (default 0)
 */
router.get('/', async (req, res, next) => {
  try {
    const conditions = ['j.is_active = true'];
    const params = [];
    let paramIdx = 1;

    if (req.query.role) {
      // Category-specific keyword expansion for broader matching
      const categoryKeywords = {
        devops: ['devops', 'dev ops', 'devsecops', 'release engineer', 'build engineer', 'ci/cd', 'ci cd'],
        sre: ['sre', 'site reliability', 'reliability engineer'],
        ml: ['machine learning', 'ml engineer', 'deep learning', 'nlp', 'artificial intelligence', 'ai engineer', 'ai research', 'computer vision'],
        data: ['data engineer', 'data scientist', 'data analyst', 'analytics', 'etl', 'data platform', 'data infrastructure', 'business intelligence', 'bi engineer'],
        fullstack: ['full stack', 'fullstack', 'full-stack'],
        frontend: ['frontend', 'front-end', 'front end', 'ui engineer', 'ui developer', 'react engineer', 'react developer'],
        backend: ['backend', 'back-end', 'back end', 'server engineer', 'api engineer', 'api developer'],
        platform: ['platform engineer', 'platform developer', 'platform architect', 'developer experience', 'developer tools', 'dx engineer'],
        cloud: ['cloud engineer', 'cloud architect', 'aws engineer', 'azure engineer', 'gcp engineer', 'infrastructure engineer', 'infra engineer'],
      };
      const role = req.query.role.toLowerCase();
      const keywords = categoryKeywords[role];
      if (keywords) {
        const roleConds = keywords.map((kw) => {
          const cond = `j.title ILIKE $${paramIdx}`;
          params.push(`%${kw}%`);
          paramIdx++;
          return cond;
        });
        conditions.push(`(${roleConds.join(' OR ')})`);
      } else {
        // Fallback for unknown roles — plain ILIKE
        conditions.push(`j.title ILIKE $${paramIdx}`);
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

    if (req.query.max_salary) {
      const maxSalary = parseInt(req.query.max_salary, 10);
      if (!isNaN(maxSalary)) {
        conditions.push(`(j.salary_max <= $${paramIdx} OR (j.salary_max IS NULL AND j.salary_min <= $${paramIdx}))`);
        params.push(maxSalary);
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

    if (req.query.source) {
      conditions.push(`j.source = $${paramIdx}`);
      params.push(req.query.source);
      paramIdx++;
    }

    if (req.query.work_type) {
      const wt = req.query.work_type.toLowerCase();
      if (wt === 'remote') {
        conditions.push(`j.location ILIKE '%remote%'`);
      } else if (wt === 'hybrid') {
        conditions.push(`j.location ILIKE '%hybrid%'`);
      } else if (wt === 'onsite') {
        conditions.push(`j.location NOT ILIKE '%remote%' AND j.location NOT ILIKE '%hybrid%'`);
      }
    }

    if (req.query.department) {
      conditions.push(`j.department ILIKE $${paramIdx}`);
      params.push(`%${req.query.department}%`);
      paramIdx++;
    }

    if (req.query.posted_within) {
      const days = parseInt(req.query.posted_within, 10);
      if (!isNaN(days) && days > 0) {
        conditions.push(`(j.posted_date >= NOW() - INTERVAL '${days} days' OR j.date_found >= NOW() - INTERVAL '${days} days')`);
      }
    }

    if (req.query.experience) {
      const exp = req.query.experience.toLowerCase();
      const expKeywords = {
        intern: ['intern', 'internship'],
        entry: ['entry', 'junior', 'associate', 'new grad', 'graduate'],
        mid: ['mid level', 'intermediate'],
        senior: ['senior', 'sr.', 'sr '],
        staff: ['staff'],
        principal: ['principal', 'distinguished', 'fellow'],
        lead: ['lead', 'manager', 'director', 'head of', 'vp'],
      };
      const keywords = expKeywords[exp];
      if (keywords) {
        const expConds = keywords.map((kw) => {
          const cond = `j.title ILIKE $${paramIdx}`;
          params.push(`%${kw}%`);
          paramIdx++;
          return cond;
        });
        conditions.push(`(${expConds.join(' OR ')})`);
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

    // Run data query, count query, and last-updated query in parallel
    const [dataResult, countResult, lastUpdatedResult] = await Promise.all([
      queryJobs(sql, params),
      queryJobs(countSql, params.slice(0, -2)), // exclude limit/offset
      queryJobs('SELECT GREATEST(MAX(date_found), MAX(posted_date)) AS last_updated FROM jobs WHERE is_active = true'),
    ]);

    res.json({
      jobs: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      last_updated: lastUpdatedResult.rows[0]?.last_updated || null,
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
        } catch { /* ignore update failure */ }
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
 * POST /backfill-salaries — Extract salaries from job descriptions in bulk.
 *
 * Finds jobs with NULL salary_min and a non-empty description,
 * runs salary extraction, and updates the database.
 * Returns count of updated jobs.
 */
router.post('/backfill-salaries', async (req, res, next) => {
  try {
    const batchSize = Math.min(parseInt(req.query.limit) || 500, 2000);

    const result = await queryJobs(
      `SELECT id, job_description FROM jobs
       WHERE salary_min IS NULL AND salary_max IS NULL
         AND job_description IS NOT NULL AND LENGTH(job_description) > 100
         AND is_active = true
       LIMIT $1`,
      [batchSize],
    );

    let updated = 0;
    for (const row of result.rows) {
      const salary = extractSalary(row.job_description);
      if (salary && (salary.min || salary.max)) {
        await queryJobs(
          'UPDATE jobs SET salary_min = $1, salary_max = $2 WHERE id = $3',
          [salary.min, salary.max, row.id],
        );
        updated++;
      }
    }

    res.json({
      processed: result.rows.length,
      updated,
      remaining: result.rows.length === batchSize ? 'more jobs may exist, run again' : 0,
    });
  } catch (err) {
    if (err.message === 'Jobs database not configured') {
      return res.status(503).json({ detail: 'Jobs database not configured' });
    }
    next(err);
  }
});

export default router;
