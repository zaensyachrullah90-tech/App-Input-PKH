import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { action } = req.body;
    let credsRaw = process.env.GOOGLE_CREDENTIALS;
    if (!credsRaw) return res.status(500).json({ error: 'ENV GOOGLE_CREDENTIALS Kosong' });
    
    let credentials;
    try {
      if (credsRaw.startsWith('"') && credsRaw.endsWith('"')) credsRaw = credsRaw.slice(1, -1);
      credsRaw = credsRaw.replace(/\\"/g, '"').replace(/\\\\n/g, '\\n');
      credentials = JSON.parse(credsRaw);
    } catch (e) { return res.status(500).json({ error: 'Format JSON Rusak' }); }

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: credentials.client_email, private_key: credentials.private_key.replace(/\\n/g, '\n') },
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });
    const targetFolderId = req.body.folderId || '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

    if (action === 'createForm') {
      const file = await drive.files.create({
        resource: { name: req.body.title, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [targetFolderId] },
        fields: 'id, webViewLink'
      });
      await drive.permissions.create({ fileId: file.data.id, requestBody: { role: 'writer', type: 'anyone' } });
      return res.status(200).json({ spreadsheetId: file.data.id, spreadsheetUrl: file.data.webViewLink });
    }

    if (action === 'appendRow') {
      const { spreadsheetId, schema, rowData } = req.body;
      const rowValues = schema.map(col => rowData[col.name] || '');
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: 'Sheet1!A1', valueInputOption: 'USER_ENTERED', requestBody: { values: [rowValues] }
      });
      return res.status(200).json({ success: true });
    }

    // FITUR BARU: SINKRONISASI KOLOM VERIFIKATOR KE SPREADSHEET
    if (action === 'updateHeaders') {
      const { spreadsheetId, schema } = req.body;
      const headers = schema.map(col => col.label.toUpperCase());
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: 'Sheet1!A1', valueInputOption: 'USER_ENTERED', requestBody: { values: [headers] }
      });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Aksi API tidak dikenali' });
  } catch (error) {
    return res.status(500).json({ error: `Sistem Error: ${error.message}` });
  }
}
