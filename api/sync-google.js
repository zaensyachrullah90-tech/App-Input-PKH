export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // URL SCRIPT ANDA SUDAH TERPASANG MATI
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz6js5imyGi17Qvdh7r_xu2TyWkphLN8N_fSTCqI-5ssrEpSgu5LiZyyas6wYtDGw/exec";

  try {
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    let data;
    try { 
      data = JSON.parse(text); 
    } catch(e) { 
      throw new Error('Gagal membaca balasan dari Google: ' + text); 
    }
    
    if (data.error) throw new Error(data.error);

    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
