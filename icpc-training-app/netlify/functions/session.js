const { json, getUsernameFromEvent } = require('./_lib/auth');
const { getProfile, publicProfile } = require('./_lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const username = getUsernameFromEvent(event);
  if (!username) return json(401, { error: 'Not logged in' });

  const profile = await getProfile(username);
  if (!profile) return json(401, { error: 'Not logged in' });

  return json(200, { username, profile: publicProfile(profile) });
};
