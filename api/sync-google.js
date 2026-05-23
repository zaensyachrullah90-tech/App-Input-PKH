import { google } from 'googleapis';
import stream from 'stream';

// 🛡️ FITUR 1: Auto-Cleaner Kunci Privat 
const formatPrivateKey = (key) => {
  if (!key) return '';
  let formattedKey = key;
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }
  if (formattedKey.startsWith("'") && formattedKey.endsWith("'")) {
    formattedKey = formattedKey.slice(1, -1);
  }
  return formattedKey.replace(/\\n/g, '\n');
};

// ⏱️ FITUR 2: Anti-Hang / Pembatas Waktu 
const withTimeout = (promise, ms = 7000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Koneksi Google terlalu lambat (Timeout)')), ms))
  ]);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Metode Tidak Diizinkan' });

  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY);

    if (!email || !privateKey) {
      throw new Error('Kredensial Google (Email/Key) belum terbaca.');
    }

    const auth = new google.auth.JWT({
      email: email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const drive = google.drive({ version: 'v3', auth });

    const { action, title, spreadsheetId, rowData, schema, fileName, mimeType, base64Data } = req.body;

    // AKSI 1: BUAT SPREADSHEET 
    if (action === 'createForm') {
      const spreadsheet = await withTimeout(sheets.spreadsheets.create({
        resource: { properties: { title: title } },
        fields: 'spreadsheetId,spreadsheetUrl',
      }));

      await withTimeout(drive.permissions.create({
        fileId: spreadsheet.data.spreadsheetId,
        requestBody: { role: 'editor', type: 'anyone' },
      }));

      return res.status(200).json({
        spreadsheetId: spreadsheet.data.spreadsheetId,
        spreadsheetUrl: spreadsheet.data.spreadsheetUrl,
      });
    }

    // AKSI 2: SUNTIK DATA KE SPREADSHEET
    if (action === 'appendRow') {
      const values = schema.map(col => rowData[col.name] || '');
      await withTimeout(sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'A1', 
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [values] },
      }));

      return res.status(200).json({ success: true, message: 'Disimpan ke Spreadsheet' });
    }

    // AKSI 3: UPLOAD FILE KE GOOGLE DRIVE
    if (action === 'uploadFile') {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(Buffer.from(base64Data, 'base64'));

      const file = await withTimeout(drive.files.create({
        resource: { name: fileName || `Upload_${Date.now()}` },
        media: { mimeType: mimeType, body: bufferStream },
        fields: 'id, webViewLink',
      }));

      await withTimeout(drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      }));

      return res.status(200).json({ link: file.data.webViewLink });
    }

    return res.status(400).json({ error: 'Aksi tidak ditemukan.' });

  } catch (error) {
    console.error('Sistem Backend Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}