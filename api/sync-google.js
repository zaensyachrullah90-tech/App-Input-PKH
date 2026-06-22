export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // URL GOOGLE APPS SCRIPT ANDA DIKUNCI MATI DI SINI
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz6js5imyGi17Qvdh7r_xu2TyWkphLN8N_fSTCqI-5ssrEpSgu5LiZyyas6wYtDGw/exec";

  try {
    // Vercel Server menembak ke Google (Server to Server = 100% Bebas CORS & Blokir Browser)
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    let data;
    try { 
      data = JSON.parse(text); 
    } catch(e) { 
      throw new Error('Gagal memproses balasan Google.'); 
    }
    
    if (data.error) throw new Error(data.error);

    // Kirim status SUKSES kembali ke Aplikasi Anda
    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy Backend Error:', error.message);
    return res.status(500).json({ error: `Gagal Sinkronisasi: ${error.message}` });
  }
}
