import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeOpenText, faRobot, faPrint, faSave, faSpinner, faPlus, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export default function Surat() {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // CACHE MEMORY UNTUK PENANDATANGAN SURAT
  const cachedTtd = JSON.parse(localStorage.getItem('smart_surat_ttd_cache')) || {
    ttd_jabatan: 'Ketua TIM PKH Kab. Tapin',
    ttd_nama: 'M. Zaen Syachrullah, S.Pd.I',
    ttd_nip: '19900621 202521 1 050'
  };

  const [formData, setFormData] = useState({
    jenis_surat: 'Nota Dinas',
    no_surat: `01/ND/KATIM-PKH-TAPIN/${new Date().getMonth() + 1}/${new Date().getFullYear()}`,
    kepada: 'Pimpinan PT Bank Mandiri (Persero) Tbk.',
    dari: 'Ketua TIM PKH Tapin',
    sifat: 'Biasa',
    lampiran: '1 Berkas',
    perihal: '',
    isi_surat: '',
    tembusan: 'Arsip',
    ...cachedTtd,
    ai_prompt: ''
  });

  useEffect(() => { fetchLetters(); }, []);

  const fetchLetters = async () => {
    setLoading(true);
    const { data } = await supabase.from('letters').select('*').order('created_at', { ascending: false });
    if (data) setLetters(data);
    setLoading(false);
  };

  const handleJenisSuratChange = (e) => {
    const jenis = e.target.value;
    let autoNum = formData.no_surat;
    if (jenis === 'Nota Dinas') autoNum = `01/ND/KATIM-PKH-TAPIN/${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
    else if (jenis === 'Surat Keluar') autoNum = `460/  /PKH-DINSOS/${new Date().getFullYear()}`;
    else autoNum = `  /SM/${new Date().getFullYear()}`;
    
    setFormData({ ...formData, jenis_surat: jenis, no_surat: autoNum });
  };

  const handleGenerateAI = async () => {
    if (!formData.ai_prompt) return toast.error('Ketik instruksi untuk AI terlebih dahulu!');
    setIsProcessing(true);
    const toastId = toast.loading('AI sedang menyusun draf surat resmi...');
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Anda asisten administrasi. Buat isi surat resmi (Nota Dinas/Surat Keluar) berdasarkan ini: "${formData.ai_prompt}". 
      Tuliskan HANYA kalimat pembuka, isi/badan utama, dan kalimat penutup. DILARANG menulis nomor surat, tanggal, kop, dan tanda tangan. Gunakan bahasa Indonesia sangat formal dan rapi.`;
      
      const result = await model.generateContent(prompt);
      const generatedText = result.response.text().replace(/```/g, '').trim();

      setFormData({ ...formData, isi_surat: generatedText });
      toast.success('Draf Disusun AI!', { id: toastId });
    } catch (err) { toast.error('AI gagal menyusun surat.', { id: toastId }); } 
    finally { setIsProcessing(false); }
  };

  // ==========================================
  // PERBAIKAN ERROR 400 (AI_PROMPT DIHAPUS SEBELUM INSERT)
  // ==========================================
  const handleSave = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Menyimpan Arsip Surat...');
    try {
      // 1. Simpan Cache Tanda Tangan
      localStorage.setItem('smart_surat_ttd_cache', JSON.stringify({
        ttd_jabatan: formData.ttd_jabatan, ttd_nama: formData.ttd_nama, ttd_nip: formData.ttd_nip
      }));

      // 2. Buat duplikat payload dan hapus ai_prompt agar Supabase tidak Error 400
      const payloadToSave = { ...formData };
      delete payloadToSave.ai_prompt;

      // 3. Kirim ke Database
      const { error } = await supabase.from('letters').insert([payloadToSave]);
      if (error) throw error;
      
      toast.success('Surat Tersimpan di Database!', { id: toastId });
      setShowModal(false);
      fetchLetters();
    } catch (err) { toast.error('Gagal menyimpan surat.', { id: toastId }); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus arsip surat ini?')) return;
    await supabase.from('letters').delete().eq('id', id);
    toast.success('Surat dihapus.');
    fetchLetters();
  };

  const handlePrint = (letter) => {
    const printWindow = window.open('', '_blank');
    const formattedContent = letter.isi_surat.replace(/\n/g, '<br/>');
    const dateNow = new Date(letter.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // CSS CETAK BERSIH TANPA HEADER/FOOTER BROWSER
    const printStyles = `
      <style>
        @page { size: A4 portrait; margin: 0; }
        body { font-family: 'Times New Roman', Times, serif; color: #000; padding: 25mm 20mm; line-height: 1.5; background: #fff; margin: 0; }
        .kop-surat { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; margin-bottom: 25px; position: relative; }
        .kop-surat h1 { margin: 0; font-size: 20px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; }
        .kop-surat h2 { margin: 5px 0 0 0; font-size: 16px; font-weight: bold; }
        .kop-surat p { margin: 5px 0 0 0; font-size: 12px; }
        .kop-nota { text-align: center; font-size: 20px; font-weight: bold; text-decoration: underline; margin-bottom: 25px; letter-spacing: 2px; }
        .meta-nota table { width: 100%; border: none; margin-bottom: 25px; font-size: 14px; }
        .meta-nota td { padding: 4px 10px 4px 0; vertical-align: top; }
        .meta-nota .kolom-kiri { width: 80px; }
        .meta-nota .titik-dua { width: 10px; }
        .garis-bawah { border-bottom: 2px solid #000; margin-bottom: 25px; }
        .isi-surat { text-align: justify; font-size: 14px; margin-bottom: 40px; }
        .ttd-block { margin-top: 50px; float: right; text-align: left; min-width: 250px; font-size: 14px; page-break-inside: avoid; }
        .ttd-space { height: 80px; }
        .tembusan { margin-top: 80px; font-size: 12px; clear: both; }
        .clear { clear: both; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    `;

    let htmlContent = '';

    // LOGIKA RENDER BERDASARKAN JENIS SURAT
    if (letter.jenis_surat === 'Nota Dinas') {
      htmlContent = `
        <div class="kop-nota">NOTA DINAS</div>
        <div class="meta-nota">
          <table cellspacing="0" cellpadding="0">
            <tr><td class="kolom-kiri">Kepada Yth</td><td class="titik-dua">:</td><td>${letter.kepada}</td></tr>
            <tr><td>Dari</td><td>:</td><td>${letter.dari}</td></tr>
            <tr><td>Tanggal</td><td>:</td><td>${dateNow}</td></tr>
            <tr><td>Nomor</td><td>:</td><td>${letter.no_surat}</td></tr>
            <tr><td>Sifat</td><td>:</td><td>${letter.sifat}</td></tr>
            <tr><td>Lampiran</td><td>:</td><td>${letter.lampiran || '-'}</td></tr>
            <tr><td>Perihal</td><td>:</td><td><strong>${letter.perihal}</strong></td></tr>
          </table>
        </div>
        <div class="garis-bawah"></div>
        <div class="isi-surat">${formattedContent}</div>
      `;
    } else {
      // Surat Keluar Standar / Pemda
      htmlContent = `
        <div class="kop-surat">
          <h1>PEMERINTAH KABUPATEN TAPIN</h1>
          <h2>DINAS SOSIAL (PROGRAM KELUARGA HARAPAN)</h2>
          <p>Jl. Jenderal Sudirman, Rantau, Kabupaten Tapin, Kalimantan Selatan</p>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px;">
          <table style="width: auto;">
            <tr><td style="width: 80px; padding-bottom: 5px;">Nomor</td><td style="width: 10px;">:</td><td>${letter.no_surat}</td></tr>
            <tr><td style="padding-bottom: 5px;">Sifat</td><td>:</td><td>${letter.sifat}</td></tr>
            <tr><td style="padding-bottom: 5px;">Lampiran</td><td>:</td><td>${letter.lampiran || '-'}</td></tr>
            <tr><td style="padding-bottom: 5px;">Perihal</td><td>:</td><td><strong>${letter.perihal}</strong></td></tr>
          </table>
          <div>Tapin, ${dateNow}</div>
        </div>
        <div style="font-size: 14px; margin-bottom: 15px;">
          Kepada Yth,<br/><strong>${letter.kepada}</strong><br/>di - <br/>&nbsp;&nbsp;&nbsp;&nbsp;Tempat
        </div>
        <div class="isi-surat">${formattedContent}</div>
      `;
    }

    printWindow.document.write(`
      <html><head><title></title>${printStyles}</head><body>
        ${htmlContent}
        <div class="ttd-block">
          <div>${letter.ttd_jabatan}</div>
          <div class="ttd-space"></div>
          <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">${letter.ttd_nama || '-'}</div>
          <div>NIP. ${letter.ttd_nip || '-'}</div>
        </div>
        <div class="clear"></div>
        ${letter.tembusan ? `<div class="tembusan"><strong>Tembusan:</strong><br/>${letter.tembusan.replace(/\n/g, '<br/>')}</div>` : ''}
        <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-fade-in relative p-3 md:p-0">
      <Toaster #374151' '#111827', '#fff', '1px background: border: color: position="top-right" solid style: toastOptions="{{" { } }}/>
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white uppercase flex items-center"><FontAwesomeIcon className="mr-3 text-primary" icon="{faEnvelopeOpenText}"/> Smart E-Letter Archive</h2>
          <p className="text-gray-400 mt-2 text-xs md:text-sm">Database arsip surat menyurat resmi dinamis dengan Auto-Numbering.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-5 py-3.5 bg-primary hover:bg-yellow-500 text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center">
          <FontAwesomeIcon className="mr-2" icon="{faPlus}"/> Tulis Surat Baru
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-4xl p-6 md:p-8 rounded-3xl shadow-2xl relative my-8">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FontAwesomeIcon icon="{faTimes}" size="lg"/></button>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center border-b border-white/10 pb-4"><FontAwesomeIcon className="mr-3 text-primary" icon="{faRobot}"/> Form Dokumen Surat Resmi</h3>
            
            <form onSubmit={handleSave} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/30 p-5 rounded-2xl border border-white/5">
                <div>
                  <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Jenis Dokumen</label>
                  <select value={formData.jenis_surat} onChange={handleJenisSuratChange} className="w-full p-3 rounded-xl bg-dark border border-white/10 text-white text-sm outline-none focus:border-primary font-bold">
                    <option value="Nota Dinas">Nota Dinas</option>
                    <option value="Surat Keluar">Surat Keluar</option>
                    <option value="Surat Masuk">Surat Masuk</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nomor Surat (Otomatis)</label>
                  <input type="text" value={formData.no_surat} onChange={e => setFormData({...formData, no_surat: e.target.value})} required className="w-full p-3 rounded-xl bg-dark/80 border border-white/10 text-white text-sm outline-none focus:border-primary uppercase font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Kepada Yth. / Tujuan</label>
                  <input type="text" value={formData.kepada} onChange={e => setFormData({...formData, kepada: e.target.value})} required className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Dari / Pengirim</label>
                  <input type="text" value={formData.dari} onChange={e => setFormData({...formData, dari: e.target.value})} required className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Sifat Dokumen</label>
                  <select value={formData.sifat} onChange={e => setFormData({...formData, sifat: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none">
                    <option value="Biasa">Biasa</option><option value="Penting">Penting</option><option value="Rahasia">Rahasia</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Lampiran</label>
                  <input type="text" value={formData.lampiran} onChange={e => setFormData({...formData, lampiran: e.target.value})} placeholder="Cth: 1 Berkas" className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-primary uppercase block mb-1">Perihal Utama</label>
                  <input type="text" value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} required className="w-full p-3 rounded-xl bg-primary/10 border border-primary/30 text-white text-sm outline-none font-bold" />
                </div>
              </div>

              {/* AI GENERATOR */}
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center">
                <div className="w-full md:flex-1 relative">
                  <FontAwesomeIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary" icon="{faRobot}"/>
                  <input type="text" value={formData.ai_prompt} onChange={e => setFormData({...formData, ai_prompt: e.target.value})} placeholder="Perintah AI: Buatkan draft undangan kunjungan rumah..." className="w-full p-3 pl-10 rounded-xl bg-dark/80 border border-white/10 text-white text-xs outline-none focus:border-primary" />
                </div>
                <button type="button" onClick={handleGenerateAI} disabled={isProcessing} className="w-full md:w-auto px-5 py-3 bg-primary text-black font-black uppercase text-xs rounded-xl shadow-lg hover:bg-yellow-500 whitespace-nowrap">
                  {isProcessing ? <FontAwesomeIcon icon="{faSpinner}" spin/> : 'Susun Isi (AI)'}
                </button>
              </div>

              {/* TEXTAREA ISI SURAT */}
              <textarea 
                value={formData.isi_surat} 
                onChange={e => setFormData({...formData, isi_surat: e.target.value})} 
                required 
                placeholder="Ketik isi surat atau generate menggunakan AI..."
                className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary h-64 resize-y font-serif leading-relaxed" 
              />

              {/* BLOK TANDA TANGAN */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/10 pt-5">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Jabatan TTD</label>
                  <input type="text" value={formData.ttd_jabatan} onChange={e => setFormData({...formData, ttd_jabatan: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nama TTD</label>
                  <input type="text" value={formData.ttd_nama} onChange={e => setFormData({...formData, ttd_nama: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">NIP TTD</label>
                  <input type="text" value={formData.ttd_nip} onChange={e => setFormData({...formData, ttd_nip: e.target.value})} className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-mono" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Tembusan (Opsional)</label>
                <textarea value={formData.tembusan} onChange={e => setFormData({...formData, tembusan: e.target.value})} placeholder="1. Arsip..." className="w-full p-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none h-16" />
              </div>

              <button type="submit" disabled={isProcessing} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all">
                <FontAwesomeIcon className="mr-2" icon="{faSave}"/> Simpan Ke Arsip Database
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TABEL DATABASE SURAT */}
      <div className="bg-[#0f172a]/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b border-white/10 bg-black/50">
              <tr>
                <th className="px-6 py-5 font-black text-gray-400 text-xs">Identitas Surat</th>
                <th className="px-6 py-5 font-black text-gray-400 text-xs">Perihal & Tujuan</th>
                <th className="px-6 py-5 font-black text-gray-400 text-xs text-right">Manajemen Cetak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="3" className="text-center py-10 text-gray-500">Membaca arsip cloud...</td></tr>
              ) : letters.length > 0 ? (
                letters.map((letter) => (
                  <tr key={letter.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white tracking-wide">{letter.no_surat}</div>
                      <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${letter.jenis_surat === 'Nota Dinas' ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-blue-600/20 text-blue-400 border border-blue-600/30'}`}>{letter.jenis_surat}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">
                      <div className="text-white font-bold">{letter.perihal.toUpperCase()}</div>
                      <div className="text-[10px] text-gray-500 mt-1 uppercase">KEPADA: {letter.kepada}</div>
                    </td>
                    <td className="px-6 py-4 flex justify-end items-center space-x-2">
                      <button onClick={() => handlePrint(letter)} className="px-3 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-600/30 rounded-lg text-xs font-bold transition-all uppercase"><FontAwesomeIcon className="mr-1 md:mr-2" icon="{faPrint}"/> <span className="hidden md:inline">Cetak PDF</span></button>
                      <button onClick={() => handleDelete(letter.id)} className="px-3 py-2 bg-red-950/30 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors"><FontAwesomeIcon icon="{faTrash}"/></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="3" className="text-center py-10 text-gray-500 italic">Belum ada arsip persuratan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
