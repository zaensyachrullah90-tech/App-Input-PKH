import { google } from 'googleapis';
import { Readable } from 'stream';

// MAKSIMALKAN TENAGA VERCEL UNTUK MENERIMA FILE
export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

export default async function handler(req, res) {
  // BYPASS CORS SECURITY BLOCK
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body;
    
    // TANGKAP DAN PERBAIKI JSON VERCEL SECARA OTOMATIS (ANTI GAGAL)
    let credsRaw = process.env.GOOGLE_CREDENTIALS;
    if (!credsRaw) return res.status(500).json({ error: 'ENV GOOGLE_CREDENTIALS kosong di Vercel.' });
    
    let credentials;
    try {
      // Bersihkan tanda kutip tambahan atau escape character yang merusak kunci dari Vercel
      if (credsRaw.startsWith('"') && credsRaw.endsWith('"')) {
        credsRaw = credsRaw.slice(1, -1);
      }
      credsRaw = credsRaw.replace(/\\"/g, '"').replace(/\\\\n/g, '\\n');
      credentials = JSON.parse(credsRaw);
    } catch (e) {
      return res.status(500).json({ error: 'Sistem Gagal Membaca Kunci JSON Anda. Pastikan murni copy-paste.' });
    }

    // OTORISASI MUTLAK GOOGLE
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

    // 1. MESIN UPLOAD BERKAS
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
        console.error("DRIVE ERROR:", driveErr);
        return res.status(500).json({ error: `Gagal ke Drive: ${driveErr.message}` });
      }
    }

    // 2. MESIN PEMBUAT FORM SPREADSHEET
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

    // 3. MESIN PENULIS DATA KE SPREADSHEET
    if (action === 'appendRow') {
      try {
        const { spreadsheetId, schema, rowData } = req.body;
        const rowValues = schema.map(col => rowData[col.name] || '');
        await sheets.spreadsheets.values.append({
          spreadsheetId, range: 'Sheet1!A1', valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowValues] }
        });
        return res.status(200).json({ success: true });
      } catch (sheetErr) {
        return res.status(500).json({ error: `Gagal Isi Sheet: ${sheetErr.message}` });
      }
    }

    return res.status(400).json({ error: 'Aksi API tidak dikenali' });

  } catch (error) {
    console.error('SYSTEM ERROR:', error);
    return res.status(500).json({ error: `Sistem Error: ${error.message}` });
  }
}
