const { json, getUsernameFromEvent } = require('./_lib/auth');
const { getProfile, computeStats, isValidUsername } = require('./_lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  const username = getUsernameFromEvent(event);
  if (!username) return json(401, { error: 'Not logged in' });

  const requester = await getProfile(username);
  if (!requester || !requester.isCoach) return json(403, { error: 'Coach access required' });

  const target = (event.queryStringParameters && event.queryStringParameters.username || '').toLowerCase();
  if (!isValidUsername(target)) return json(400, { error: 'Invalid username' });

  const targetProfile = await getProfile(target);
  if (!targetProfile) return json(404, { error: 'No member found with that username' });

  const stats = computeStats(targetProfile);
  return json(200, {
    username: target,
    displayName: targetProfile.displayName,
    stats,
  });
};
