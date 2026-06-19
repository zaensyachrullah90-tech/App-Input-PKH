import { google } from 'googleapis';
import { Readable } from 'stream';

// TINGKATKAN BATAS PAYLOAD KE MAKSIMAL VERCEL (25MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.body;
    
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKeyRaw) {
       return res.status(500).json({ error: 'Kunci API Vercel Kosong. Hubungi Administrator.' });
    }

    // ALGORITMA ANTI-PATAH: Memperbaiki format kunci Vercel yang rusak akibat kutip ganda
    let formattedKey = privateKeyRaw.replace(/\\n/g, '\n');
    if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
      formattedKey = formattedKey.slice(1, -1);
    }

    // Otorisasi Robot
    const auth = new google.auth.JWT(
      clientEmail,
      null,
      formattedKey,
      ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets']
    );

    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });

    // TARGET FOLDER HARDCODE MUTLAK
    const targetFolderId = req.body.folderId || '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

    // 1. MESIN UPLOAD BERKAS
    if (action === 'uploadFile') {
      const { fileName, mimeType, base64Data } = req.body;
      const buffer = Buffer.from(base64Data, 'base64');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      try {
        const file = await drive.files.create({
          resource: { name: fileName, parents: [targetFolderId] },
          media: { mimeType, body: stream },
          fields: 'id, webViewLink'
        });

        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: { role: 'reader', type: 'anyone' }
        });

        return res.status(200).json({ link: file.data.webViewLink });
      } catch (driveErr) {
        console.error("Drive Error:", driveErr.message);
        return res.status(500).json({ error: `Gagal Akses Drive: Pastikan email robot sudah jadi Editor di folder.` });
      }
    }

    // 2. MESIN PEMBUAT FORM SPREADSHEET
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
        return res.status(500).json({ error: 'Gagal membuat Google Sheet.' });
      }
    }

    // 3. MESIN PENULIS BARIS SPREADSHEET
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
        console.error("Sheet Error:", sheetErr.message);
        return res.status(500).json({ error: 'Gagal menulis ke Spreadsheet. Pastikan Google Sheets API aktif.' });
      }
    }

    return res.status(400).json({ error: 'Aksi Sistem tidak dikenali' });

  } catch (error) {
    console.error('Core Backend Error:', error.message);
    return res.status(500).json({ error: 'Kunci Akses Google JSON Salah atau Kedaluwarsa.' });
  }
}
