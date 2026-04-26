/**
 * Connection pool for the jobportal database (separate from the main Camora DB).
 */
import pg from 'pg';
const { Pool } = pg;

const JOBS_DB_URL = process.env.JOBS_DATABASE_URL;

let pool = null;

function getJobsPool() {
  if (!pool && JOBS_DB_URL) {
    pool = new Pool({
      connectionString: JOBS_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function queryJobs(text, params) {
  const p = getJobsPool();
  if (!p) throw new Error('Jobs database not configured');
  return p.query(text, params);
}
