const { json, getUsernameFromEvent } = require('./_lib/auth');
const { getProfile, saveProfile, isValidUsername, cleanText } = require('./_lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const username = getUsernameFromEvent(event);
  if (!username) return json(401, { error: 'Not logged in' });

  const requester = await getProfile(username);
  if (!requester || !requester.isCoach) return json(403, { error: 'Coach access required' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return json(400, { error: 'Invalid JSON body' });
  }

  const target = cleanText(body.targetUsername, 20).toLowerCase();
  const text = cleanText(body.text, 200);
  if (!isValidUsername(target)) return json(400, { error: 'Invalid target username' });
  if (!text) return json(400, { error: 'Task text is required' });

  const targetProfile = await getProfile(target);
  if (!targetProfile) return json(404, { error: 'No member found with that username' });

  targetProfile.tasks = targetProfile.tasks || [];
  targetProfile.tasks.push({
    id: 't' + Date.now(),
    t: text,
    meta: 'assigned by ' + requester.displayName,
    done: false,
  });
  await saveProfile(target, targetProfile);

  return json(200, { ok: true });
};
