const { json, getUsernameFromEvent } = require('./_lib/auth');
const { getProfile, saveProfile, publicProfile } = require('./_lib/store');

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

  const id = body.id;
  const task = (profile.tasks || []).find((t) => t.id === id);
  if (!task) return json(404, { error: 'Task not found' });

  task.done = !task.done;
  await saveProfile(username, profile);

  return json(200, { profile: publicProfile(profile) });
};
