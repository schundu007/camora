import { query } from '../config/database.js';

let _cache = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

async function warmCache() {
  try {
    const result = await query('SELECT key, value FROM camora_admin_config');
    _cache = {};
    for (const row of result.rows) {
      _cache[row.key] = row.value;
    }
    _cacheExpiry = Date.now() + CACHE_TTL_MS;
  } catch {
    _cache = _cache || {};
    _cacheExpiry = Date.now() + 5_000; // retry in 5s on error
  }
}

export async function loadAdminConfig() {
  await warmCache();
}

export function getApiKey(provider) {
  if (!_cache) return null;
  return _cache[`provider.${provider}.api_key`] || null;
}

export function getPrimaryProvider() {
  if (!_cache) return null;
  return _cache['provider.primary'] || null;
}

export async function setAdminConfigValue(key, value) {
  await query(
    `INSERT INTO camora_admin_config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
  if (_cache) _cache[key] = value;
}

export async function deleteAdminConfigValue(key) {
  await query('DELETE FROM camora_admin_config WHERE key = $1', [key]);
  if (_cache) delete _cache[key];
}

export async function getAdminConfigSnapshot() {
  if (!_cache || Date.now() >= _cacheExpiry) await warmCache();
  return { ..._cache };
}
