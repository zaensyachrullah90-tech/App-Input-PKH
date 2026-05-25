import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
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

  // State Form Surat
  const [formData, setFormData] = useState({
    no_surat: `001/SMART-PKH/${new Date().getFullYear()}`,
    perihal: '',
    isi_surat: '',
    ai_prompt: '' // Input untuk menyuruh AI
  });

  useEffect(() => {
    fetchLetters();
  }, []);

  const fetchLetters = async () => {
    setLoading(true);
    const { data } = await supabase.from('letters').select('*').order('created_at', { ascending: false });
    if (data) setLetters(data);
    setLoading(false);
  };

  // MESIN AI: GENERATE DRAF SURAT
  const handleGenerateAI = async () => {
    if (!formData.ai_prompt) return toast.error('Ketik instruksi untuk AI terlebih dahulu!');
    if (!genAI) return toast.error('API Key Gemini tidak ditemukan.');

    setIsProcessing(true);
    const toastId = toast.loading('AI sedang menyusun draf surat resmi...');

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Anda adalah asisten administrasi instansi pemerintahan yang profesional. Buatkan isi draf surat resmi berdasarkan instruksi berikut: "${formData.ai_prompt}". 
      Tuliskan HANYA bagian isi suratnya saja (tanpa kop surat, tanpa nomor surat, tanpa tanggal, dan tanpa blok tanda tangan di bawah, karena sistem akan membuatnya otomatis). Gunakan bahasa Indonesia baku dan formal.`;
      
      const result = await model.generateContent(prompt);
      const generatedText = result.response.text().replace(/```/g, '').trim();

      setFormData({ ...formData, isi_surat: generatedText });
      toast.success('Draf Surat Berhasil Disusun AI!', { id: toastId });
    } catch (err) {
      toast.error('AI gagal menyusun surat.', { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  // SIMPAN KE DATABASE
  const handleSave = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Menyimpan Arsip Surat...');
    try {
      const { error } = await supabase.from('letters').insert([{
        no_surat: formData.no_surat,
        perihal: formData.perihal,
        isi_surat: formData.isi_surat
      }]);
      if (error) throw error;
      
      toast.success('Surat Berhasil Disimpan!', { id: toastId });
      setShowModal(false);
      setFormData({ no_surat: `001/SMART-PKH/${new Date().getFullYear()}`, perihal: '', isi_surat: '', ai_prompt: '' });
      fetchLetters();
    } catch (err) {
      toast.error('Gagal menyimpan surat.', { id: toastId });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus arsip surat ini secara permanen?')) return;
    await supabase.from('letters').delete().eq('id', id);
    toast.success('Surat dihapus.');
    fetchLetters();
  };

  // CETAK SURAT KE PDF (FORMAT RESMI)
  const handlePrint = (letter) => {
    const printWindow = window.open('', '_blank');
    
    // Mengubah newlines (\n) dari AI menjadi tag <br/> HTML
    const formattedContent = letter.isi_surat.replace(/\n/g, '<br/>');

    printWindow.document.write(`
      <html>
      <head>
        <title>Surat Resmi - ${letter.perihal}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; color: #000; padding: 40px; line-height: 1.6; background: #fff; }
          .kop-surat { text-align: center; border-bottom: 4px solid #000; padding-bottom: 15px; margin-bottom: 30px; position: relative; }
          .kop-surat::after { content: ''; position: absolute; bottom: -8px; left: 0; width: 100%; border-bottom: 1px solid #000; }
          .kop-surat h1 { margin: 0; font-size: 22px; text-transform: uppercase; font-weight: bold; }
          .kop-surat h2 { margin: 5px 0 0 0; font-size: 18px; font-weight: bold; }
          .kop-surat p { margin: 5px 0 0 0; font-size: 12px; }
          
          .meta-surat { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 14px; }
          .meta-surat table td { padding: 2px 10px 2px 0; vertical-align: top; }
          
          .isi-surat { text-align: justify; font-size: 14px; margin-bottom: 40px; }
          
          .ttd-block { margin-top: 50px; float: right; text-align: left; min-width: 250px; font-size: 14px; }
          .ttd-space { height: 80px; }
          .clear { clear: both; }
          
          @media print {
            body { padding: 0; }
            @page { size: A4 portrait; margin: 20mm; }
          }
        </style>
      </head>
      <body>
        <div class="kop-surat">
          <h1>PEMERINTAH KABUPATEN TAPIN</h1>
          <h2>DINAS SOSIAL (PROGRAM KELUARGA HARAPAN)</h2>
          <p>Jl. Jenderal Sudirman, Rantau, Kabupaten Tapin, Kalimantan Selatan</p>
        </div>
        
        <div class="meta-surat">
          <table>
            <tr><td>Nomor</td><td>:</td><td><strong>${letter.no_surat}</strong></td></tr>
            <tr><td>Lampiran</td><td>:</td><td>-</td></tr>
            <tr><td>Perihal</td><td>:</td><td><strong>${letter.perihal}</strong></td></tr>
          </table>
          <div>
            Tapin, ${new Date(letter.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        
        <div class="isi-surat">
          ${formattedContent}
        </div>
        
        <div class="ttd-block">
          <div>Kepala Bidang / Koordinator PKH,</div>
          <div class="ttd-space"></div>
          <div style="font-weight: bold; text-decoration: underline;">Nama Penandatangan</div>
          <div>NIP. 1980xxxx xxxx x xxxx</div>
        </div>
        
        <div class="clear"></div>
        <script>
          window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-fade-in relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white uppercase flex items-center">
            <FontAwesomeIcon icon={faEnvelopeOpenText} className="mr-3 text-primary" /> Smart E-Letter
          </h2>
          <p className="text-gray-400 mt-2 text-xs md:text-sm">Buat surat dinas otomatis didukung AI Gemini dan cetak ke format PDF.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="px-5 py-3.5 bg-primary hover:bg-yellow-500 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.2)]">
          <FontAwesomeIcon icon={faPlus} className="mr-2" /> Buat Surat Baru
        </button>
      </div>

      {/* MODAL BUAT SURAT BARU */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-3xl p-6 md:p-8 rounded-3xl shadow-2xl relative my-8">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center border-b border-white/10 pb-4">
              <FontAwesomeIcon icon={faRobot} className="mr-3 text-primary" /> AI Letter Generator
            </h3>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nomor Surat</label>
                  <input type="text" value={formData.no_surat} onChange={e => setFormData({...formData, no_surat: e.target.value})} required className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Perihal / Tujuan</label>
                  <input type="text" value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} placeholder="Contoh: Undangan Rapat Evaluasi" required className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary" />
                </div>
              </div>

              {/* PANEL INSTRUKSI AI */}
              <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl">
                <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-2 flex items-center">
                  <FontAwesomeIcon icon={faRobot} className="mr-2" /> Instruksi AI (Tulis otomatis)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="text" value={formData.ai_prompt} onChange={e => setFormData({...formData, ai_prompt: e.target.value})} placeholder="Cth: Buatkan surat undangan rapat untuk ketua RT besok pagi jam 9." className="flex-1 p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary" />
                  <button type="button" onClick={handleGenerateAI} disabled={isProcessing} className="px-6 py-3 bg-primary hover:bg-yellow-500 text-black font-black uppercase text-xs rounded-xl whitespace-nowrap">
                    {isProcessing ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Generate Draf'}
                  </button>
                </div>
              </div>

              {/* AREA TEKS MANUAL / HASIL AI */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 flex justify-between">
                  <span>Isi Surat (Bisa diedit/diketik manual)</span>
                </label>
                <textarea 
                  value={formData.isi_surat} 
                  onChange={e => setFormData({...formData, isi_surat: e.target.value})} 
                  required 
                  placeholder="Ketik isi surat secara manual di sini, atau gunakan AI di atas untuk menyusun teks otomatis..."
                  className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-white text-sm outline-none focus:border-primary h-64 resize-y font-serif leading-relaxed" 
                />
              </div>

              <button type="submit" disabled={isProcessing} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all">
                <FontAwesomeIcon icon={faSave} className="mr-2" /> Simpan Ke Arsip Surat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DAFTAR SURAT TERSEDIA */}
      <div className="bg-[#0f172a]/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b border-white/10 bg-black/50">
              <tr>
                <th className="px-6 py-5 font-black text-gray-400 text-xs">Info Surat</th>
                <th className="px-6 py-5 font-black text-gray-400 text-xs">Perihal</th>
                <th className="px-6 py-5 font-black text-gray-400 text-xs text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan="3" className="text-center py-10 text-gray-500">Membaca arsip surat...</td></tr>
              ) : letters.length > 0 ? (
                letters.map((letter) => (
                  <tr key={letter.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white tracking-wide">{letter.no_surat}</div>
                      <div className="text-[10px] text-gray-500 mt-1 font-mono uppercase">{new Date(letter.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric'})}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">
                      {letter.perihal.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 flex justify-end items-center space-x-3">
                      <button onClick={() => handlePrint(letter)} className="px-4 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-600/30 rounded-lg text-xs font-bold transition-all uppercase flex items-center">
                        <FontAwesomeIcon icon={faPrint} className="mr-2" /> Cetak PDF
                      </button>
                      <button onClick={() => handleDelete(letter.id)} className="px-3 py-2 bg-red-950/30 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="3" className="text-center py-10 text-gray-500 italic">Belum ada draf surat yang dibuat.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
