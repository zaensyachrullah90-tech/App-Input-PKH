export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // URL GOOGLE APPS SCRIPT ANDA SUDAH SAYA KUNCI MATI DI SINI
  const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwXJXIv7D3hqpMM_b-Kg4nqQ0tAtX0HEq6-jSad74eLSuLZAtvtwm-eY5jnDDrhTmz7/exec";

  try {
    // PERBAIKAN: Mencegah 'Double Stringify' yang membuat GAS gagal membaca data
    const payloadData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadData,
      redirect: 'follow' // Wajib dipertahankan agar Next.js mengikuti redirect Google
    });

    const text = await response.text();
    let data;
    try { 
      data = JSON.parse(text); 
    } catch(e) { 
      console.error("Error Parsing dari GAS:", text);
      throw new Error('Balasan dari Google tidak valid. Cek log server.'); 
    }
    
    if (data.error) throw new Error(data.error);

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
