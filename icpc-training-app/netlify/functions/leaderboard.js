const { json } = require('./_lib/auth');
const { getLeaderboard } = require('./_lib/store');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const rows = await getLeaderboard();
  return json(200, { rows, updatedAt: new Date().toISOString() });
};
