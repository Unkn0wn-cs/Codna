const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const COOKIE_NAME = 'session';
const SECRET = process.env.JWT_SECRET;
// See _lib/store.js for why this checks only NETLIFY_DEV: NODE_ENV isn't
// reliably 'production' in the deployed Functions runtime, and falling back
// to "local" there would silently drop the Secure flag on the session cookie.
const isLocalDev = process.env.NETLIFY_DEV === 'true';

if (!SECRET) {
  console.warn(
    'WARNING: JWT_SECRET is not set. Set it in your Netlify environment ' +
    'variables before deploying to production — sessions are not secure without it.'
  );
}
const EFFECTIVE_SECRET = SECRET || 'insecure-dev-only-secret-do-not-use-in-production';

function signSession(username) {
  return jwt.sign({ u: username }, EFFECTIVE_SECRET, { expiresIn: '30d' });
}

function verifySessionToken(token) {
  try {
    const decoded = jwt.verify(token, EFFECTIVE_SECRET);
    return decoded.u || null;
  } catch (e) {
    return null;
  }
}

function getCookieHeader(event) {
  if (event.cookies) {
    if (Array.isArray(event.cookies)) {
      return event.cookies
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            if (typeof item.name === 'string' && typeof item.value === 'string') {
              return `${item.name}=${item.value}`;
            }
            if (typeof item.value === 'string') return item.value;
          }
          return String(item);
        })
        .join('; ');
    }
    if (typeof event.cookies === 'string') return event.cookies;
  }

  const headers = event.headers || {};
  const raw = headers.cookie || headers.Cookie || headers.COOKIE;
  if (Array.isArray(raw)) return raw.join('; ');
  if (typeof raw === 'string') return raw;

  if (event.multiValueHeaders) {
    const multi = event.multiValueHeaders.cookie || event.multiValueHeaders.Cookie || event.multiValueHeaders.COOKIE;
    if (Array.isArray(multi)) return multi.join('; ');
    if (typeof multi === 'string') return multi;
  }

  return '';
}

function getUsernameFromEvent(event) {
  const raw = getCookieHeader(event);
  const parsed = cookie.parse(raw);
  const token = parsed[COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

function setSessionCookieHeader(token) {
  return cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: !isLocalDev,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

function clearSessionCookieHeader() {
  return cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: !isLocalDev,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

function json(statusCode, data, extraHeaders) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
    body: JSON.stringify(data),
  };
}

module.exports = {
  signSession,
  verifySessionToken,
  getUsernameFromEvent,
  setSessionCookieHeader,
  clearSessionCookieHeader,
  json,
};
