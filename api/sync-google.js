import { google } from 'googleapis';
import { Readable } from 'stream';

// TINGKATKAN BATAS PAYLOAD VERCEL AGAR KUAT MENERIMA FILE FOTO DARI HP
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body;
    
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    );

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    if (action === 'uploadFile') {
      const { fileName, mimeType, base64Data, folderId } = req.body;
      const buffer = Buffer.from(base64Data, 'base64');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileMetadata = { name: fileName, parents: [folderId] };
      const media = { mimeType, body: stream };

      const file = await drive.files.create({
        resource: fileMetadata, media: media, fields: 'id, webViewLink'
      });

      await drive.permissions.create({
        fileId: file.data.id, requestBody: { role: 'reader', type: 'anyone' }
      });

      return res.status(200).json({ link: file.data.webViewLink });
    }

    if (action === 'createForm') {
      const { title, folderId } = req.body;
      const fileMetadata = { name: title, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [folderId] };
      const file = await drive.files.create({ resource: fileMetadata, fields: 'id, webViewLink' });
      
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
    console.error('Google API Error:', error);
    return res.status(500).json({ error: error.message || 'Gagal terhubung ke Google Cloud.' });
  }
}
