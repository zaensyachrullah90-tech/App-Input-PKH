export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ⚠️ PASTE URL GOOGLE APPS SCRIPT ANDA DI BAWAH INI:
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz6js5imyGi17Qvdh7r_xu2TyWkphLN8N_fSTCqI-5ssrEpSgu5LiZyyas6wYtDGw/exec";

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(req.body) // Vercel menembak langsung ke Script Anda (Anti-CORS)
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return res.status(200).json(data);
  } catch (error) {
    console.error('Bypass Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
