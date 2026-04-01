import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../middleware/requestLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// JWT secret - MUST be set in environment for security
// SECURITY: No fallback - local auth is disabled if JWT_SECRET is not set
const JWT_SECRET = process.env.JWT_SECRET || null;
const JWT_EXPIRY = '24h';

// User data file path
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Available roles (in order of privilege)
export const ROLES = {
  USER: 'user',
  DEVELOPER: 'developer',
  MANAGER: 'manager',
  ADMIN: 'admin',
};

// Role hierarchy for permission checks
const ROLE_LEVELS = {
  [ROLES.USER]: 1,
  [ROLES.DEVELOPER]: 2,
  [ROLES.MANAGER]: 3,
  [ROLES.ADMIN]: 4,
};

// In-memory user store
let users = [];

/**
 * Ensure data directory exists
 */
function ensureDataDir() {
  // Skip directory creation in Electron/asar environments
  if (DATA_DIR.includes('.asar') || process.env.ELECTRON_RUN_AS_NODE) {
    return false;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      logger.info({ dir: DATA_DIR }, 'Created data directory');
    }
    return true;
  } catch (error) {
    logger.warn({ dir: DATA_DIR, error: error.message }, 'Cannot create data directory (may be in read-only bundle)');
    return false;
  }
}

/**
 * Load users from JSON file
 */
function loadUsersFromFile() {
  if (!ensureDataDir()) {
    return []; // Can't access data directory
  }

  if (!fs.existsSync(USERS_FILE)) {
    return [];
  }

  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to load users file');
    return [];
  }
}

/**
 * Save users to JSON file
 */
function saveUsersToFile() {
  if (!ensureDataDir()) {
    logger.warn('Cannot save users - data directory unavailable');
    return; // Can't save in Electron/asar mode
  }

  try {
    // Only save non-env users (those without isEnvUser flag)
    const usersToSave = users.filter(u => !u.isEnvUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersToSave, null, 2));
    logger.info({ count: usersToSave.length }, 'Users saved to file');
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to save users file');
    throw new Error('Failed to save user data');
  }
}

/**
 * Load admin users from environment variables
 * Format: CAPRA_ADMIN_1=username:password:Display Name
 */
function loadEnvAdmins() {
  const envAdmins = [];

  for (let i = 1; i <= 10; i++) {
    const adminEnv = process.env[`CAPRA_ADMIN_${i}`];
    if (!adminEnv) continue;

    const parts = adminEnv.split(':');
    if (parts.length < 2) {
      logger.warn({ index: i }, 'Invalid admin format, use username:password');
      continue;
    }

    const [username, password, ...nameParts] = parts;
    const name = nameParts.length > 0 ? nameParts.join(':') : username;

    if (!username || !password) {
      logger.warn({ index: i }, 'Empty username or password, skipping');
      continue;
    }

    envAdmins.push({
      username: username.toLowerCase().trim(),
      password: bcrypt.hashSync(password.trim(), 10),
      name: name.trim(),
      roles: [ROLES.ADMIN],
      isEnvUser: true,
      createdAt: new Date().toISOString(),
    });
  }

  return envAdmins;
}

/**
 * Initialize users from file and environment
 */
function initializeUsers() {
  const fileUsers = loadUsersFromFile();
  const envAdmins = loadEnvAdmins();

  // Merge: env admins take precedence over file users with same username
  const envUsernames = new Set(envAdmins.map(u => u.username));
  const mergedUsers = [
    ...envAdmins,
    ...fileUsers.filter(u => !envUsernames.has(u.username)),
  ];

  if (envAdmins.length > 0) {
    logger.info({ count: envAdmins.length }, 'Admin users loaded from environment');
  }

  if (fileUsers.length > 0) {
    logger.info({ count: fileUsers.length }, 'Users loaded from file');
  }

  if (mergedUsers.length === 0) {
    logger.warn('No users configured. Set CAPRA_ADMIN_1=username:password for initial admin.');
  }

  return mergedUsers;
}

// Load users on startup
users = initializeUsers();

/**
 * Register a new user (no roles assigned yet)
 */
export async function registerUser(username, password, name) {
  if (!username || !password) {
    return { success: false, error: 'Username and password required' };
  }

  const normalizedUsername = username.toLowerCase().trim();

  // Check if user already exists
  if (users.find(u => u.username === normalizedUsername)) {
    return { success: false, error: 'Username already exists' };
  }

  // Validate username format
  if (!/^[a-z0-9_-]{3,20}$/.test(normalizedUsername)) {
    return { success: false, error: 'Username must be 3-20 characters, letters, numbers, underscores, or hyphens' };
  }

  // Validate password strength
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  const newUser = {
    username: normalizedUsername,
    password: bcrypt.hashSync(password, 10),
    name: (name || username).trim(),
    roles: [], // No roles initially - admin must assign
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsersToFile();

  logger.info({ username: normalizedUsername }, 'New user registered (pending approval)');

  return {
    success: true,
    message: 'Registration successful. Please wait for admin approval.',
    user: {
      username: newUser.username,
      name: newUser.name,
      roles: newUser.roles,
    },
  };
}

/**
 * Authenticate user and return JWT token
 */
export async function authenticateUser(username, password) {
  // Check if local auth is configured
  if (!JWT_SECRET) {
    return { success: false, error: 'Local authentication not configured' };
  }

  if (!username || !password) {
    return { success: false, error: 'Username and password required' };
  }

  const user = users.find(u => u.username === username.toLowerCase());

  if (!user) {
    logger.warn({ username }, 'Login attempt for unknown user');
    return { success: false, error: 'Invalid credentials' };
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    logger.warn({ username }, 'Invalid password attempt');
    return { success: false, error: 'Invalid credentials' };
  }

  // Check if user has any role assigned
  if (!user.roles || user.roles.length === 0) {
    logger.warn({ username }, 'Login attempt by user without roles');
    return { success: false, error: 'Account pending approval. Please contact an administrator.' };
  }

  // Generate JWT token
  const token = jwt.sign(
    {
      username: user.username,
      name: user.name,
      roles: user.roles,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  logger.info({ username, roles: user.roles }, 'User logged in');

  return {
    success: true,
    token,
    user: {
      username: user.username,
      name: user.name,
      roles: user.roles,
    },
  };
}

/**
 * Verify JWT token
 * Returns invalid if JWT_SECRET not configured (local auth disabled)
 */
export function verifyToken(token) {
  // If JWT_SECRET not set, local auth is disabled
  if (!JWT_SECRET) {
    return { valid: false, error: 'Local auth not configured' };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user, requiredRole) {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  // Admin has access to everything
  if (user.roles.includes(ROLES.ADMIN)) {
    return true;
  }

  return user.roles.includes(requiredRole);
}

/**
 * Check if user has minimum role level
 */
export function hasMinRole(user, minRole) {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  const minLevel = ROLE_LEVELS[minRole] || 0;
  const userMaxLevel = Math.max(...user.roles.map(r => ROLE_LEVELS[r] || 0));

  return userMaxLevel >= minLevel;
}

/**
 * Get all users (for admin)
 */
export function getAllUsers() {
  return users.map(u => ({
    username: u.username,
    name: u.name,
    roles: u.roles,
    createdAt: u.createdAt,
    isEnvUser: u.isEnvUser || false,
  }));
}

/**
 * Get pending users (users without roles)
 */
export function getPendingUsers() {
  return users
    .filter(u => !u.roles || u.roles.length === 0)
    .map(u => ({
      username: u.username,
      name: u.name,
      createdAt: u.createdAt,
    }));
}

/**
 * Update user roles (admin only)
 */
export function updateUserRoles(username, roles) {
  const user = users.find(u => u.username === username.toLowerCase());

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (user.isEnvUser) {
    return { success: false, error: 'Cannot modify environment-configured admin users' };
  }

  // Validate roles
  const validRoles = Object.values(ROLES);
  const invalidRoles = roles.filter(r => !validRoles.includes(r));
  if (invalidRoles.length > 0) {
    return { success: false, error: `Invalid roles: ${invalidRoles.join(', ')}` };
  }

  user.roles = roles;
  saveUsersToFile();

  logger.info({ username, roles }, 'User roles updated');

  return {
    success: true,
    user: {
      username: user.username,
      name: user.name,
      roles: user.roles,
    },
  };
}

/**
 * Delete user (admin only)
 */
export function deleteUser(username) {
  const userIndex = users.findIndex(u => u.username === username.toLowerCase());

  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }

  if (users[userIndex].isEnvUser) {
    return { success: false, error: 'Cannot delete environment-configured admin users' };
  }

  users.splice(userIndex, 1);
  saveUsersToFile();

  logger.info({ username }, 'User deleted');

  return { success: true };
}

/**
 * Check if LOCAL authentication is enabled
 * Requires both JWT_SECRET and at least one user with roles
 */
export function isAuthEnabled() {
  if (!JWT_SECRET) return false;
  return users.some(u => u.roles && u.roles.length > 0);
}

/**
 * Reload users
 */
export function reloadUsers() {
  users = initializeUsers();
  return users.length;
}

/**
 * Get user count
 */
export function getUserCount() {
  return users.length;
}
