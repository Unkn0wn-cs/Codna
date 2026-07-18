const fs = require('fs');
const path = require('path');
const { getStore } = require('@netlify/blobs');

const DIFFICULTY_POINTS = { Easy: 10, Medium: 25, Hard: 50, Regional: 100 };
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
// `NETLIFY_DEV` is the one flag Netlify actually guarantees: set to 'true' by
// `netlify dev` and unset on every real deploy (production, deploy previews,
// branch deploys). NODE_ENV and a site-id var are not reliably set by the
// deployed Functions runtime, so gating on those made this fall back to disk
// storage in production too — which fails outright there (read-only FS).
const isLocalDev = process.env.NETLIFY_DEV === 'true';

function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json')) || fs.existsSync(path.join(dir, 'netlify.toml'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function findNetlifyDevRoot(startDir) {
  let dir = path.resolve(startDir);
  while (true) {
    if (path.basename(dir) === '.netlify') {
      return path.dirname(dir);
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const PROJECT_ROOT =
  findProjectRoot(process.cwd()) ||
  findProjectRoot(__dirname) ||
  findProjectRoot(findNetlifyDevRoot(process.cwd()) || '') ||
  findProjectRoot(findNetlifyDevRoot(__dirname) || '') ||
  path.resolve(process.cwd());

function localStore(name) {
  const storePath = path.join(PROJECT_ROOT, '.localblobs', name);
  async function ensureDir() {
    await fs.promises.mkdir(storePath, { recursive: true });
  }

  return {
    async get(key, options) {
      await ensureDir();
      const file = path.join(storePath, `${key}.json`);
      try {
        const content = await fs.promises.readFile(file, 'utf8');
        if (options && options.type === 'json') return JSON.parse(content);
        return content;
      } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
      }
    },
    async setJSON(key, value) {
      await ensureDir();
      const file = path.join(storePath, `${key}.json`);
      await fs.promises.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
    },
  };
}

function getAppStore(name) {
  if (isLocalDev) {
    return localStore(name);
  }
  return getStore(name);
}

function profilesStore() {
  return getAppStore('profiles');
}
function metaStore() {
  return getAppStore('meta');
}

async function getProfile(username) {
  if (!username) return null;
  return await profilesStore().get(username, { type: 'json' });
}

async function saveProfile(username, profile) {
  await profilesStore().setJSON(username, profile);
  await updateLeaderboardEntry(username, profile);
}

async function updateLeaderboardEntry(username, profile) {
  const meta = metaStore();
  const board = (await meta.get('leaderboard', { type: 'json' })) || {};
  const stats = computeStats(profile);
  board[username] = {
    displayName: profile.displayName,
    isCoach: !!profile.isCoach,
    points: stats.points,
    solved: stats.solved,
    rating: stats.rating,
  };
  await meta.setJSON('leaderboard', board);
}

async function getLeaderboard() {
  const meta = metaStore();
  const board = (await meta.get('leaderboard', { type: 'json' })) || {};
  return Object.entries(board)
    .map(([username, v]) => ({ username, ...v }))
    .sort((a, b) => b.points - a.points);
}

function computeStats(profile) {
  const submissions = profile.submissions || [];
  const solved = submissions.length;
  const points = submissions.reduce((sum, s) => sum + (s.points || 0), 0);
  const rating = 1200 + points * 3;

  // s.date is stored as a UTC ISO timestamp, so the "day" it falls on must be
  // compared in UTC too — mixing it with a locally-interpreted "today" made
  // the streak drop to 0 for anyone west of UTC once local time crossed
  // midnight but UTC hadn't yet (or vice versa east of UTC).
  const days = [...new Set(submissions.map((s) => s.date.slice(0, 10)))].sort().reverse();
  let streak = 0;
  if (days.length) {
    const todayStr = new Date().toISOString().slice(0, 10);
    let cursor = new Date(todayStr + 'T00:00:00Z');
    for (const d of days) {
      const dDate = new Date(d + 'T00:00:00Z');
      if (dDate.getTime() === cursor.getTime()) {
        streak++;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      } else {
        break;
      }
    }
  }
  return { solved, points, rating, streak };
}

function defaultTasks() {
  const now = Date.now();
  return [
    { id: 't' + now + '0', t: 'Introduce yourself in the group chat + your strongest language', meta: 'onboarding', done: false },
    { id: 't' + now + '1', t: 'Come to your first Monday practice round', meta: 'onboarding', done: false },
    { id: 't' + now + '2', t: 'Log your first solve once you finish a problem', meta: 'onboarding', done: false },
  ];
}

// Strips sensitive/internal fields before anything is sent to the client.
function publicProfile(profile) {
  const { passwordHash, ...rest } = profile;
  return rest;
}

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_RE.test(username);
}

// Basic length-capped string sanitization for user-supplied free text.
function cleanText(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

module.exports = {
  DIFFICULTY_POINTS,
  getProfile,
  saveProfile,
  getLeaderboard,
  computeStats,
  defaultTasks,
  publicProfile,
  isValidUsername,
  cleanText,
};
