const bcrypt = require('bcryptjs');
const { json, signSession, setSessionCookieHeader } = require('./_lib/auth');
const { getProfile, saveProfile, defaultTasks, publicProfile, isValidUsername, cleanText } = require('./_lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON body' });
  }

  const username = cleanText(body.username, 20).toLowerCase();
  const displayName = cleanText(body.displayName, 60) || username;
  const password = typeof body.password === 'string' ? body.password : '';
  const isCoach = !!body.isCoach;

  if (!isValidUsername(username)) {
    return json(400, { error: 'Username must be 3-20 characters: lowercase letters, numbers, underscore only.' });
  }
  if (password.length < 4) {
    return json(400, { error: 'Password must be at least 4 characters.' });
  }

  const existing = await getProfile(username);
  if (existing) {
    return json(409, { error: 'That username is already taken.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const profile = {
    displayName,
    isCoach,
    passwordHash,
    tasks: defaultTasks(),
    submissions: [],
    notes: [],
    createdAt: new Date().toISOString(),
  };
  await saveProfile(username, profile);

  const token = signSession(username);
  return json(
    200,
    { username, profile: publicProfile(profile) },
    { 'Set-Cookie': setSessionCookieHeader(token) }
  );
};
