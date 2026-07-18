const { json, getUsernameFromEvent } = require('./_lib/auth');
const { getProfile, saveProfile, publicProfile, computeStats, cleanText, DIFFICULTY_POINTS } = require('./_lib/store');

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

  const problem = cleanText(body.problem, 120);
  const difficulty = body.difficulty;
  if (!problem) return json(400, { error: 'Problem name is required.' });
  if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_POINTS, difficulty)) {
    return json(400, { error: 'Difficulty must be one of: ' + Object.keys(DIFFICULTY_POINTS).join(', ') });
  }

  // Points always come from the server-side map — never trust a client-supplied value.
  const points = DIFFICULTY_POINTS[difficulty];

  profile.submissions = profile.submissions || [];
  profile.submissions.unshift({
    id: 's' + Date.now() + Math.random().toString(36).slice(2, 7),
    problem,
    difficulty,
    points,
    date: new Date().toISOString(),
  });

  await saveProfile(username, profile);

  return json(200, { profile: publicProfile(profile), stats: computeStats(profile) });
};
