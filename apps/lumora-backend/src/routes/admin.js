import { Router } from 'express';
import { getAdminConfigSnapshot, setAdminConfigValue, deleteAdminConfigValue } from '../services/adminConfig.js';

const router = Router();

const PROVIDERS = ['gemini', 'anthropic', 'deepseek', 'openrouter'];

const OWNER_EMAILS = (() => {
  const raw = (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '');
  return raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
})();

function requireOwner(req, res, next) {
  if (!req.user?.email || !OWNER_EMAILS.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function getEnvKey(provider) {
  switch (provider) {
    case 'gemini': return process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || null;
    case 'anthropic': return process.env.ANTHROPIC_API_KEY || null;
    case 'deepseek': return process.env.DEEPSEEK_API_KEY || null;
    case 'openrouter': return process.env.OPENROUTER_API_KEY || null;
    default: return null;
  }
}

function maskKey(key) {
  if (!key || key.length < 12) return '***';
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

router.get('/api-keys', requireOwner, async (req, res) => {
  try {
    const config = await getAdminConfigSnapshot();
    const providers = PROVIDERS.map(p => {
      const dbKey = config[`provider.${p}.api_key`] || null;
      const envKey = getEnvKey(p);
      const activeKey = dbKey || envKey;
      return {
        provider: p,
        configured: !!activeKey,
        source: dbKey ? 'db' : (envKey ? 'env' : 'none'),
        masked: activeKey ? maskKey(activeKey) : null,
      };
    });
    res.json({
      providers,
      primaryProvider: config['provider.primary'] || 'gemini',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api-keys', requireOwner, async (req, res) => {
  const { provider, apiKey, primaryProvider } = req.body;
  try {
    if (primaryProvider !== undefined) {
      if (!PROVIDERS.includes(primaryProvider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }
      await setAdminConfigValue('provider.primary', primaryProvider);
    }
    if (provider !== undefined) {
      if (!PROVIDERS.includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }
      if (!apiKey) {
        await deleteAdminConfigValue(`provider.${provider}.api_key`);
      } else {
        await setAdminConfigValue(`provider.${provider}.api_key`, apiKey.trim());
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
