require('dotenv').config();
const express = require('express');
const cors = require('cors');
const syncGoogle = require('./api/sync-google.js'); // Pastikan ini mengarah ke file API Anda

const app = express();
app.use(cors());
// Wajib 50mb agar upload lampiran file base64 tidak error/tertolak
app.use(express.json({ limit: '50mb' })); 

// Menyambungkan rute React ke file API
app.post('/api/sync-google', syncGoogle);

app.listen(3000, () => {
  console.log('✅ Mesin API Google menyala di port 3000');
});