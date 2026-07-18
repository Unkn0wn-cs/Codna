const { json, getUsernameFromEvent } = require('./_lib/auth');
const { getProfile, saveProfile, publicProfile, cleanText } = require('./_lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const username = getUsernameFromEvent(event);
  if (!username) return json(401, { error: 'Not logged in' });

  const profile = await getProfile(username);
  if (!profile) return json(401, { error: 'Not logged in' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON body' });
  }

  const text = cleanText(body.text, 200);
  if (!text) return json(400, { error: 'Task text is required.' });

  profile.tasks = profile.tasks || [];
  profile.tasks.push({ id: 't' + Date.now(), t: text, meta: 'self-assigned', done: false });
  await saveProfile(username, profile);

  return json(200, { profile: publicProfile(profile) });
};
