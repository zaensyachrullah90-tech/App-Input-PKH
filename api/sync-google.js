import { google } from 'googleapis';
import { Readable } from 'stream';

export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body;
    
    // PEMBACA JSON TAHAN BANTING
    const credentialsRaw = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsRaw) return res.status(500).json({ error: 'Variabel GOOGLE_CREDENTIALS di Vercel Kosong!' });
    
    let credentials;
    try { credentials = JSON.parse(credentialsRaw); } 
    catch (e) { return res.status(500).json({ error: 'Format JSON di GOOGLE_CREDENTIALS Vercel rusak/tidak valid.' }); }

    const privateKey = credentials.private_key.replace(/\\n/g, '\n');

    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    );

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });
    const targetFolderId = req.body.folderId || '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

    if (action === 'uploadFile') {
      const { fileName, mimeType, base64Data } = req.body;
      const buffer = Buffer.from(base64Data, 'base64');
      const stream = Readable.from(buffer);

      const file = await drive.files.create({
        resource: { name: fileName, parents: [targetFolderId] },
        media: { mimeType, body: stream },
        fields: 'id, webViewLink'
      });

      await drive.permissions.create({
        fileId: file.data.id, requestBody: { role: 'reader', type: 'anyone' }
      });
      return res.status(200).json({ link: file.data.webViewLink });
    }

    if (action === 'createForm') {
      const file = await drive.files.create({
        resource: { name: req.body.title, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [targetFolderId] },
        fields: 'id, webViewLink'
      });
      await drive.permissions.create({
        fileId: file.data.id, requestBody: { role: 'writer', type: 'anyone' }
      });
      return res.status(200).json({ spreadsheetId: file.data.id, spreadsheetUrl: file.data.webViewLink });
    }

    if (action === 'appendRow') {
      const { spreadsheetId, schema, rowData } = req.body;
      const rowValues = schema.map(col => rowData[col.name] || '');
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: 'Sheet1!A1', valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] }
      });
      return res.status(200).json({ success: true });
    }
    return res.status(400).json({ error: 'Aksi Sistem tidak dikenali' });
  } catch (error) {
    console.error('Google API Error:', error.message);
    return res.status(500).json({ error: `Gagal ke Cloud: ${error.message}` });
  }
}
