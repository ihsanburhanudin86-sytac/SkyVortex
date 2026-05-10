// api/leaderboard.js
// Proxy ke Supabase — key disimpan di Vercel Environment Variables
// Tidak pernah terekspos ke browser

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // CORS — izinkan akses dari mana saja (web & APK)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ error: 'Server config missing' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + SB_KEY,
  };

  try {
    // GET — ambil leaderboard
    if (req.method === 'GET') {
      const limit = req.query.limit || 50;
      const url = `${SB_URL}/rest/v1/leaderboard?select=name,score,wave,date&order=score.desc&limit=${limit}`;
      const resp = await fetch(url, { headers });
      const data = await resp.json();
      return res.status(resp.status).json(data);
    }

    // POST — simpan skor baru
    if (req.method === 'POST') {
      const { name, score, wave, date } = req.body;

      // Validasi server-side
      if (!name || typeof score !== 'number' || score < 0 || score > 9999999) {
        return res.status(400).json({ error: 'Invalid data' });
      }

      const entry = {
        name: String(name).slice(0, 20).toUpperCase(),
        score: Math.floor(score),
        wave: Math.floor(wave) || 1,
        date: date || Date.now(),
      };

      const resp = await fetch(`${SB_URL}/rest/v1/leaderboard`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify(entry),
      });

      return res.status(resp.ok ? 200 : resp.status).json({ ok: resp.ok });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (e) {
    console.error('[LB API]', e);
    return res.status(500).json({ error: 'Server error' });
  }
}
