import { google } from 'googleapis';
import { Readable } from 'stream';

export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body;
    let credsRaw = process.env.GOOGLE_CREDENTIALS;
    
    if (!credsRaw) return res.status(500).json({ error: 'Kunci Rahasia Vercel Kosong!' });
    
    let credentials;
    try {
      if (credsRaw.startsWith('"') && credsRaw.endsWith('"')) credsRaw = credsRaw.slice(1, -1);
      credsRaw = credsRaw.replace(/\\"/g, '"').replace(/\\\\n/g, '\\n');
      credentials = JSON.parse(credsRaw);
    } catch (e) {
      return res.status(500).json({ error: 'Format Kunci JSON rusak di Vercel.' });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });
    const targetFolderId = req.body.folderId || '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

    // =====================================
    // 1. MESIN UPLOAD BERKAS
    // =====================================
    if (action === 'uploadFile') {
      const { fileName, mimeType, base64Data } = req.body;
      const buffer = Buffer.from(base64Data, 'base64');
      const stream = Readable.from(buffer);

      try {
        const file = await drive.files.create({
          resource: { name: fileName, parents: [targetFolderId] },
          media: { mimeType, body: stream },
          fields: 'id, webViewLink'
        });
        await drive.permissions.create({
          fileId: file.data.id, requestBody: { role: 'reader', type: 'anyone' }
        });
        return res.status(200).json({ link: file.data.webViewLink });
      } catch (driveErr) {
        return res.status(500).json({ error: driveErr.message });
      }
    }

    // =====================================
    // 2. MESIN PEMBUAT SPREADSHEET OTOMATIS
    // =====================================
    if (action === 'createForm') {
      try {
        const file = await drive.files.create({
          resource: { name: req.body.title, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [targetFolderId] },
          fields: 'id, webViewLink'
        });
        await drive.permissions.create({
          fileId: file.data.id, requestBody: { role: 'writer', type: 'anyone' }
        });
        return res.status(200).json({ spreadsheetId: file.data.id, spreadsheetUrl: file.data.webViewLink });
      } catch (err) {
        return res.status(500).json({ error: `Gagal Buat Sheet: ${err.message}` });
      }
    }

    // =====================================
    // 3. MESIN PENEMBAK DATA KE SPREADSHEET
    // =====================================
    if (action === 'appendRow') {
      try {
        const { spreadsheetId, schema, rowData } = req.body;
        // Pengecekan ID Ekstra Ketat
        if (!spreadsheetId) return res.status(400).json({ error: "Spreadsheet ID tidak valid." });

        const rowValues = schema.map(col => {
           let val = rowData[col.name];
           return (val !== undefined && val !== null) ? String(val) : '';
        });

        await sheets.spreadsheets.values.append({
          spreadsheetId, range: 'Sheet1!A1', valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowValues] }
        });
        return res.status(200).json({ success: true });
      } catch (sheetErr) {
        // TANGKAP ERROR PERMISSION DENIED DAN BERIKAN PESAN YANG JELAS
        console.error("Google Sheets API Error:", sheetErr);
        let errorMsg = sheetErr.message;
        if (errorMsg.includes('permission') || errorMsg.includes('403')) {
           errorMsg = "Akses Ditolak. Anda belum membagikan Spreadsheet tersebut kepada Email Robot (appinput@...) sebagai Editor.";
        } else if (errorMsg.includes('404')) {
           errorMsg = "Spreadsheet tidak ditemukan atau Link salah.";
        }
        return res.status(500).json({ error: errorMsg });
      }
    }

    return res.status(400).json({ error: 'Aksi API tidak dikenali' });

  } catch (error) {
    return res.status(500).json({ error: `Sistem Error: ${error.message}` });
  }
}
