const { json, getUsernameFromEvent } = require('./_lib/auth');
const { getProfile, saveProfile, publicProfile, computeStats } = require('./_lib/store');

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
  if (!id) return json(400, { error: 'Missing submission id' });

  profile.submissions = (profile.submissions || []).filter((s) => s.id !== id);
  await saveProfile(username, profile);

  return json(200, { profile: publicProfile(profile), stats: computeStats(profile) });
};
