import { google } from 'googleapis';
import stream from 'stream';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Metode Tidak Diizinkan' });

  const { action, title, spreadsheetId, rowData, schema, fileName, mimeType, base64Data, folderId } = req.body;

  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
  );

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  try {
    // AKSI 1: BUAT SPREADSHEET BARU DI FOLDER SPESIFIK
    if (action === 'createForm') {
      const fileMetadata = {
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet'
      };
      
      // Jika Admin menetapkan ID Folder, masukkan ke parents berkas
      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const spreadsheetFile = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
      });

      const newSpreadsheetId = spreadsheetFile.data.id;
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`;

      await drive.permissions.create({
        fileId: newSpreadsheetId,
        requestBody: { role: 'editor', type: 'anyone' },
      });

      return res.status(200).json({
        spreadsheetId: newSpreadsheetId,
        spreadsheetUrl: spreadsheetUrl,
      });
    }

    // AKSI 2: SINKRONISASI DATA KE SPREADSHEET
    if (action === 'appendRow') {
      const headers = schema.map(col => col.label);
      const values = schema.map(col => rowData[col.name] || '');

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A2',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values] },
      });
      return res.status(200).json({ success: true });
    }

    // AKSI 3: UPLOAD FILE KE GOOGLE DRIVE DI FOLDER SPESIFIK
    if (action === 'uploadFile') {
      const bufferStream = new stream.PassThrough();
      bufferStream.end(Buffer.from(base64Data, 'base64'));

      const fileMetadata = { name: fileName || `Upload_${Date.now()}` };
      
      if (folderId) {
        fileMetadata.parents = [folderId];
      }

      const file = await drive.files.create({
        resource: fileMetadata,
        media: { mimeType: mimeType, body: bufferStream },
        fields: 'id, webViewLink',
      });
      
      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
      });
      
      return res.status(200).json({ link: file.data.webViewLink });
    }

  } catch (error) {
    console.error('Google Workspace Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
