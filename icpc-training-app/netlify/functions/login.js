const bcrypt = require('bcryptjs');
const { json, signSession, setSessionCookieHeader } = require('./_lib/auth');
const { getProfile, publicProfile, cleanText } = require('./_lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON body' });
  }

  const username = cleanText(body.username, 20).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!username || !password) {
    return json(400, { error: 'Enter a username and password.' });
  }

  const profile = await getProfile(username);
  // Same generic error whether the username exists or the password is wrong,
  // so this endpoint can't be used to enumerate valid usernames.
  const genericError = () => json(401, { error: 'Incorrect username or password.' });

  if (!profile) return genericError();

  const match = await bcrypt.compare(password, profile.passwordHash);
  if (!match) return genericError();

  const token = signSession(username);
  return json(
    200,
    { username, profile: publicProfile(profile) },
    { 'Set-Cookie': setSessionCookieHeader(token) }
  );
};
