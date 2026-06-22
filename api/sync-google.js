import { google } from 'googleapis';

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

    // 1. BUAT SPREADSHEET BARU
    if (action === 'createForm') {
      const file = await drive.files.create({
        resource: { name: req.body.title, mimeType: 'application/vnd.google-apps.spreadsheet', parents: [targetFolderId] },
        fields: 'id, webViewLink'
      });
      await drive.permissions.create({ fileId: file.data.id, requestBody: { role: 'writer', type: 'anyone' } });
      return res.status(200).json({ spreadsheetId: file.data.id, spreadsheetUrl: file.data.webViewLink });
    }

    // 2. TAMBAH BARIS DATA WARGA
    if (action === 'appendRow') {
      const { spreadsheetId, schema, rowData } = req.body;
      const rowValues = schema.map(col => rowData[col.name] !== undefined ? String(rowData[col.name]) : '');
      await sheets.spreadsheets.values.append({
        spreadsheetId, range: 'Sheet1!A1', valueInputOption: 'USER_ENTERED', requestBody: { values: [rowValues] }
      });
      return res.status(200).json({ success: true });
    }

    // 3. SINKRONISASI KOLOM VERIFIKATOR (HEADER)
    if (action === 'updateHeaders') {
      const { spreadsheetId, schema } = req.body;
      const headers = schema.map(col => col.label.toUpperCase());
      const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetId = sheetMeta.data.sheets[0].properties.sheetId;
      
      await sheets.spreadsheets.values.update({
        spreadsheetId, range: 'Sheet1!A1', valueInputOption: 'USER_ENTERED', requestBody: { values: [headers] }
      });
      return res.status(200).json({ success: true });
    }

    // 4. UPDATE BARIS (EDIT REALTIME TINDAK LANJUT)
    if (action === 'updateRow') {
      const { spreadsheetId, nomor_registrasi, schema, rowData } = req.body;
      const allDataRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1' });
      const allRows = allDataRes.data.values || [];
      let rowIndex = -1;
      
      for (let i = 0; i < allRows.length; i++) {
         if (allRows[i].includes(nomor_registrasi)) { rowIndex = i; break; }
      }

      const rowValues = schema.map(col => rowData[col.name] !== undefined ? String(rowData[col.name]) : '');
      if (rowIndex !== -1) {
         await sheets.spreadsheets.values.update({
            spreadsheetId, range: `Sheet1!A${rowIndex + 1}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [rowValues] }
         });
      } else {
         await sheets.spreadsheets.values.append({
            spreadsheetId, range: 'Sheet1!A1', valueInputOption: 'USER_ENTERED', requestBody: { values: [rowValues] }
         });
      }
      return res.status(200).json({ success: true });
    }

    // 5. HAPUS BARIS DAN HANCURKAN BERKAS
    if (action === 'deleteData') {
      const { spreadsheetId, nomor_registrasi, fileUrls } = req.body;
      
      // Hapus File Drive
      if (fileUrls && fileUrls.length > 0) {
        for (const url of fileUrls) {
          const matchId = url.match(/id=([a-zA-Z0-9_-]+)/) || url.match(/d\/([a-zA-Z0-9_-]+)/);
          if (matchId && matchId[1]) {
            try { await drive.files.update({ fileId: matchId[1], requestBody: { trashed: true } }); } catch(e) {}
          }
        }
      }
      
      // Hapus Baris Spreadsheet
      const allDataRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Sheet1' });
      const allRows = allDataRes.data.values || [];
      let rowIndex = -1;
      for (let i = 0; i < allRows.length; i++) {
         if (allRows[i].includes(nomor_registrasi)) { rowIndex = i; break; }
      }
      
      if (rowIndex !== -1) {
         const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
         const sheetId = sheetMeta.data.sheets[0].properties.sheetId;
         await sheets.spreadsheets.batchUpdate({
           spreadsheetId, requestBody: { requests: [{ deleteDimension: { range: { sheetId: sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 } } }] }
         });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Aksi API tidak dikenali' });
  } catch (error) {
    return res.status(500).json({ error: `Sistem Error: ${error.message}` });
  }
}
