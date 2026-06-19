import { google } from 'googleapis';
import { Readable } from 'stream';

export default async function handler(req, res) {
  // Hanya menerima metode POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body;
    
    // Inisialisasi Otentikasi Robot Google (Service Account)
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    );

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // ==========================================
    // 1. MESIN UPLOAD BERKAS KE GOOGLE DRIVE
    // ==========================================
    if (action === 'uploadFile') {
      const { fileName, mimeType, base64Data, folderId } = req.body;
      
      const buffer = Buffer.from(base64Data, 'base64');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileMetadata = { name: fileName, parents: [folderId] };
      const media = { mimeType, body: stream };

      const file = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
      });

      // Buka gembok file agar bisa dilihat Publik/Admin via Link
      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: 'reader', type: 'anyone' }
      });

      return res.status(200).json({ link: file.data.webViewLink });
    }

    // ==========================================
    // 2. MESIN PEMBUAT SPREADSHEET (SMART FORM)
    // ==========================================
    if (action === 'createForm') {
      const { title, folderId } = req.body;
      const fileMetadata = {
        name: title,
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [folderId] // Spreadsheet langsung masuk ke folder yang ditentukan
      };

      const file = await drive.files.create({
        resource: fileMetadata,
        fields: 'id, webViewLink'
      });

      await drive.permissions.create({
        fileId: file.data.id,
        requestBody: { role: 'writer', type: 'anyone' } // Buka akses tulis baca
      });

      return res.status(200).json({ spreadsheetId: file.data.id, spreadsheetUrl: file.data.webViewLink });
    }

    // ==========================================
    // 3. MESIN PENULIS DATA KE SPREADSHEET
    // ==========================================
    if (action === 'appendRow') {
      const { spreadsheetId, schema, rowData } = req.body;
      
      // Mengurutkan data sesuai urutan kolom skema di aplikasi
      const rowValues = schema.map(col => rowData[col.name] || '');

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowValues] }
      });

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Aksi Sistem tidak dikenali' });

  } catch (error) {
    console.error('Google API Error:', error);
    return res.status(500).json({ error: error.message || 'Terjadi kesalahan sistem server.' });
  }
}
