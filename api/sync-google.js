import { google } from 'googleapis';
import { Readable } from 'stream';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body;
    
    // 1. TANGKAP SELURUH FILE JSON DARI VERCEL
    const credentialsRaw = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsRaw) {
       console.error("Vercel Error: Variabel GOOGLE_CREDENTIALS kosong.");
       return res.status(500).json({ error: 'Kunci API Vercel Kosong.' });
    }

    // 2. PARSE JSON (Sistem otomatis memperbaiki format yang rusak)
    const credentials = JSON.parse(credentialsRaw);

    // 3. OTENTIKASI MUTLAK TAHAN BANTING
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    );

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // PENGUNCI ID FOLDER MUTLAK JIKA DARI BROWSER KOSONG
    const targetFolderId = req.body.folderId || '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

    // ==========================================
    // MESIN UPLOAD BERKAS KE DRIVE
    // ==========================================
    if (action === 'uploadFile') {
      const { fileName, mimeType, base64Data } = req.body;
      
      // Metode Stream Buffer Paling Stabil di Serverless Node.js
      const buffer = Buffer.from(base64Data, 'base64');
      const stream = Readable.from(buffer);

      try {
        const file = await drive.files.create({
          resource: { name: fileName, parents: [targetFolderId] },
          media: { mimeType, body: stream },
          fields: 'id, webViewLink'
        });

        // Buka izin baca agar Verifikator bisa mengklik linknya
        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: { role: 'reader', type: 'anyone' }
        });

        return res.status(200).json({ link: file.data.webViewLink });
      } catch (driveErr) {
        console.error("Google Drive Upload Error:", driveErr.message);
        return res.status(500).json({ error: driveErr.message });
      }
    }

    // ==========================================
    // MESIN PEMBUAT FORM SPREADSHEET
    // ==========================================
    if (action === 'createForm') {
      try {
        const { title } = req.body;
        const file = await drive.files.create({
          resource: { name: title, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [targetFolderId] },
          fields: 'id, webViewLink'
        });
        
        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: { role: 'writer', type: 'anyone' }
        });

        return res.status(200).json({ spreadsheetId: file.data.id, spreadsheetUrl: file.data.webViewLink });
      } catch (err) {
        return res.status(500).json({ error: 'Gagal membuat Sheet.' });
      }
    }

    // ==========================================
    // MESIN PENULIS DATA KE SPREADSHEET
    // ==========================================
    if (action === 'appendRow') {
      try {
        const { spreadsheetId, schema, rowData } = req.body;
        const rowValues = schema.map(col => rowData[col.name] || '');

        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: 'Sheet1!A1',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowValues] }
        });

        return res.status(200).json({ success: true });
      } catch (sheetErr) {
        console.error("Google Sheets Error:", sheetErr.message);
        return res.status(500).json({ error: 'Gagal menulis ke Spreadsheet.' });
      }
    }

    return res.status(400).json({ error: 'Aksi Sistem tidak dikenali' });

  } catch (error) {
    console.error('Core Backend Error:', error.message);
    return res.status(500).json({ error: 'Konfigurasi JSON Kunci Akses Salah.' });
  }
}
