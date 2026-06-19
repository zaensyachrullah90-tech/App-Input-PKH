import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faFilter, faFileDownload, faFileExcel, faPrint, faTimes, faFilePdf, faTrash, faCheck, faUserShield, faPlus, faSave, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import toast, { Toaster } from 'react-hot-toast';

const DATA_WILAYAH = {
 {
  "TAPIN": {
    "BAKARANGAN": [
      "BAKARANGAN", "BUNDUNG", "GADUNG", "GADUNG KARAMAT", "KETAPANG", "MASTA", "PARIGI", "PARIGI KECIL", "PAUL", "TANGKAWANG", "TANGKAWANG BARU", "WARINGIN"
    ],
    "BINUANG": [
      "A. YANI PURA", "BINUANG", "GUNUNG BATU", "KARANGAN PUTIH", "MEKARSARI", "PADANG SARI", "PUALAM SARI", "PULAU PINANG", "PULAU PINANG UTARA", "RAYA BELANTI", "TUNGKAP"
    ],
    "BUNGUR": [
      "BANUA PADANG", "BANUA PADANG HILIR", "BUNGUR", "BUNGUR BARU", "HANGUI", "KALUMPANG", "LINUH", "PARING GULING", "PURUT", "RANTAU BUJUR", "SHABAH", "TIMBUNG"
    ],
    "CANDI LARAS SELATAN": [
      "BARINGIN A", "BARINGIN B", "BAULIN", "CANDI LARAS", "MARAMPIAU", "MARAMPIAU HILIR", "MARGASARI HULU", "PABAUNGAN HILIR", "PABAUNGAN HULU", "PABAUNGAN PANTAI", "SUNGAI RUTAS", "SUNGAI RUTAS HULU"
    ],
    "CANDI LARAS UTARA": [
      "BATALAS", "BUAS-BUAS", "BUAS-BUAS HILIR", "KALADAN", "MARGASARI HILIR", "PARIOK", "RAWANA", "RAWANA HULU", "SAWAJA", "SUNGAI PUTING", "SUNGAI SALAI", "SUNGAI SALAI HILIR", "TELUK HAUR"
    ],
    "HATUNGUN": [
      "ASAM RANDAH", "BAGAK", "BATU HAPU", "BURAKAI", "HATUNGUN", "KAMBANG KUNING", "MATANG BATAS", "TARUNGIN"
    ],
    "LOKPAIKAT": [
      "AYUNAN PAPAN", "BATARATAT", "BINDERANG", "BITAHAN", "BITAHAN BARU", "BUDI MULYA", "LOKPAIKAT", "PARANDAKAN", "PUNCAK HARAPAN"
    ],
    "PIANI": [
      "BALAWAIAN", "BARAMBAN", "BATU AMPAR", "BATUNG", "BUNIIN JAYA", "HARAKIT", "MIAWA", "PIPITAK JAYA"
    ],
    "SALAM BABARIS": [
      "KAMBANG HABANG BARU", "KAMBANG HABANG LAMA", "PANTAI CABE", "SALAM BABARIS", "SUATO BARU", "SUATO LAMA"
    ],
    "TAPIN SELATAN": [
      "CEMPAKA", "HARAPAN MASA", "HATIWIN", "LAWAHAN", "RUMINTIN", "SAWANG", "SUATO TATAKAN", "TAMBARANGAN", "TANDUI", "TATAKAN", "TIMBAAN"
    ],
    "TAPIN TENGAH": [
      "ANDHIKA", "BATANG LANTIK", "HIYUNG", "KEPAYANG", "LABUNG", "MANDURIAN", "MANDURIAN HILIR", "PANDAHAN", "PANDULANGAN", "PAPAGAN MAKMUR", "PEMATANG KARANGAN", "PEMATANG KARANGAN HILIR", "PEMATANG KARANGAN HULU", "SERAWI", "SUKA RAMAI", "SUNGAI BAHALANG", "TIRIK"
    ],
    "TAPIN UTARA": [
      "ANTASARI", "ANTASARI HILIR", "BADAUN", "BANUA HALAT KANAN", "BANUA HALAT KIRI", "BANUA HANYAR", "BANUA HANYAR HULU", "JINGAH BABARIS", "KAKARAN", "KERAMAT", "KUPANG", "LUMBU RAYA", "PERINTIS RAYA", "RANGDA MALINGKUNG", "RANTAU KANAN", "RANTAU KIWA"
    ]
  }
}

export default function Responses() {
  const [responses, setResponses] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSchema, setActiveSchema] = useState([]);
  
  const [isVerifikator, setIsVerifikator] = useState(false);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState(() => {
    const cachedMeta = localStorage.getItem('smart_export_meta_cache');
    return cachedMeta ? JSON.parse(cachedMeta) : {
      noSurat: '', jabatan: 'Koordinator Kabupaten PKH', nama: '', nik: ''
    };
  });

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyData, setVerifyData] = useState(null); 
  const [verifyEditData, setVerifyEditData] = useState({}); 
  const [newVerifyCol, setNewVerifyCol] = useState({ name: '', label: '', type: 'text', options: '' });

  useEffect(() => { 
    fetchForms(); 
    checkRole();
  }, []);

  useEffect(() => { if (selectedFormId) fetchResponses(selectedFormId); }, [selectedFormId]);

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email?.toLowerCase().includes('verifikator')) {
      setIsVerifikator(true);
    }
  };

  const fetchForms = async () => {
    const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
    if (data) {
      setForms(data);
      if (data.length > 0) setSelectedFormId(data[0].id);
    }
  };

  const fetchResponses = async (formId) => {
    if (!formId) return;
    setLoading(true);
    const formConfig = forms.find(f => f.id === formId);
    if (formConfig) setActiveSchema(formConfig.schema || []);
    const { data } = await supabase.from('form_responses').select('*, forms(title)').eq('form_id', formId).order('created_at', { ascending: false });
    if (data) setResponses(data);
    setLoading(false);
  };

  const handleMetaChange = (key, value) => {
    const updatedMeta = { ...exportMeta, [key]: value };
    setExportMeta(updatedMeta);
    localStorage.setItem('smart_export_meta_cache', JSON.stringify(updatedMeta));
  };

  const handleAdminDelete = async (id) => {
    if (isVerifikator) return toast.error('Akses Ditolak: Verifikator tidak memiliki akses hapus data.');
    if (!window.confirm('Hapus arsip ini secara permanen?')) return;
    try {
      await supabase.from('form_responses').delete().eq('id', id);
      toast.success('Data dihapus permanen.');
      fetchResponses(selectedFormId);
    } catch (err) {}
  };

  const handleRejectDelete = async (resItem) => {
    if (isVerifikator) return toast.error('Akses Ditolak.');
    try {
      const updatedData = { ...resItem.data };
      delete updatedData.delete_request_status;
      await supabase.from('form_responses').update({ data: updatedData }).eq('id', resItem.id);
      toast.success('Permintaan hapus ditolak.');
      fetchResponses(selectedFormId);
    } catch (err) {}
  };

  const formatRupiah = (angka) => {
    const numberString = angka.toString().replace(/[^,\d]/g, '');
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) { rupiah += (sisa ? '.' : '') + ribuan.join('.'); }
    return split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
  };

  const handleAddVerifyColumn = async (e) => {
    e.preventDefault();
    if (isVerifikator) return toast.error('Hanya Admin yang bisa membuat Header baru.');
    if (!newVerifyCol.name || !newVerifyCol.label) return toast.error('Harap lengkapi ID dan Label Header.');
    const toastId = toast.loading('Menyuntikkan Header Verifikasi ke Database...');
    try {
      const dropdownOptions = newVerifyCol.type === 'select' && newVerifyCol.options ? newVerifyCol.options.split(',').map(opt => opt.trim()) : [];
      const newCol = { 
        name: newVerifyCol.name.toLowerCase().replace(/\s+/g, '_'), 
        label: newVerifyCol.label.toUpperCase(), type: newVerifyCol.type, options: dropdownOptions, adminLocked: true, defaultValue: '' 
      };
      
      const updatedSchema = [...activeSchema, newCol];
      setActiveSchema(updatedSchema);
      await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
      
      toast.success('Header Verifikasi Berhasil Dibuat!', { id: toastId });
      setNewVerifyCol({ name: '', label: '', type: 'text', options: '' });
      fetchForms(); 
    } catch (err) { toast.error('Gagal menyuntikkan header.', { id: toastId }); }
  };

  const handleVerifyInputChange = (e, field) => {
    let value = e.target.value;
    const name = e.target.name.toLowerCase();
    if (field.type === 'currency') {
      value = value ? formatRupiah(value) : '';
    } else if (field.type !== 'email' && field.type !== 'password' && !name.includes('email') && !name.includes('password') && !name.includes('user')) {
      value = value.toUpperCase();
    }

    let newFormData = { ...verifyEditData, [field.name]: value };

    if (name.includes('kabupaten')) {
      Object.keys(newFormData).forEach(k => {
        if (k.toLowerCase().includes('kecamatan') || k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) {
          newFormData[k] = '';
        }
      });
    } else if (name.includes('kecamatan')) {
      Object.keys(newFormData).forEach(k => {
        if (k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) {
          newFormData[k] = '';
        }
      });
    }

    setVerifyEditData(newFormData);
  };

  const handleSaveVerify = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Menyimpan Tindak Lanjut Verifikasi...');
    try {
      await supabase.from('form_responses').update({ data: verifyEditData }).eq('id', verifyData.id);
      toast.success('Hasil Verifikasi Berhasil Disimpan!', { id: toastId });
      setShowVerifyModal(false);
      fetchResponses(selectedFormId);
    } catch (err) { toast.error('Gagal menyimpan verifikasi.', { id: toastId }); }
  };

  const handleExportExcel = () => {
    if (responses.length === 0) return toast.error('Kosong.');
    const formTitle = forms.find(f => f.id === selectedFormId)?.title || 'LAPORAN';

    const headerMetadata = [['LAMPIRAN NOMOR', `="${exportMeta.noSurat.toUpperCase()}"`], ['PERIHAL', `="DATA ${formTitle.toUpperCase()}"`], [] ];
    const tableHeaders = activeSchema.map(col => col.label);
    const reversedResponses = [...responses].reverse();

    const csvData = reversedResponses.map((res, index) => {
      const row = [];
      activeSchema.forEach(col => {
        const colNameLower = col.name.toLowerCase();
        if (colNameLower === 'no' || colNameLower === 'nomor') { row.push(index + 1); } 
        else {
          let cellValue = res.data[col.name] || '-';
          if (typeof cellValue === 'string') {
            cellValue = cellValue.replace(/"/g, '""');
            if (cellValue.includes(',') || cellValue.includes('\n')) cellValue = `"${cellValue}"`;
          }
          row.push(cellValue);
        }
      });
      return row;
    });

    const emptyPadding = Array(Math.max(1, tableHeaders.length - 2)).fill(''); 
    const footerMetadata = [[], [], [...emptyPadding, 'MENGETAHUI,'], [...emptyPadding, `="${exportMeta.jabatan}"`], [], [], [], [...emptyPadding, `="${exportMeta.nama}"`], [...emptyPadding, `="NIK/NIP. ${exportMeta.nik}"`]];

    const csvContent = [...headerMetadata.map(e => e.join(',')), tableHeaders.join(','), ...csvData.map(e => e.join(',')), ...footerMetadata.map(e => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Lampiran_Excel_${formTitle}.csv`;
    link.click();
    setShowExportModal(false);
  };

  const handleExportPDF = () => {
    if (responses.length === 0) return toast.error('Kosong.');
    const formTitle = forms.find(f => f.id === selectedFormId)?.title || 'LAPORAN';
    const printWindow = window.open('', '_blank');
    const reversedResponses = [...responses].reverse();

    const tableHeadersHTML = activeSchema.map(col => `<th>${col.label}</th>`).join('');
    const tableRowsHTML = reversedResponses.map((res, index) => {
      return `<tr>${activeSchema.map(col => {
            const colNameLower = col.name.toLowerCase();
            let val = res.data[col.name] || '-';
            if (colNameLower === 'no' || colNameLower === 'nomor') val = index + 1;
            return `<td>${val}</td>`;
          }).join('')}</tr>`;
    }).join('');

    printWindow.document.write(`
      <html><head><title></title>
        <style>
          @page { size: landscape; margin: 0; }
          body { font-family: 'Arial', sans-serif; color: #000; padding: 15mm; margin: 0; line-height: 1.4; background: #fff; }
          .meta-info { margin-bottom: 20px; font-size: 13px; }
          .meta-info table { width: auto; border: none; margin: 0; }
          .meta-info td { padding: 4px 10px 4px 0; border: none; font-weight: bold; text-transform: uppercase; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; }
          table.data-table th { background: #f3f4f6; border: 1px solid #000; padding: 8px; text-align: left; text-transform: uppercase; font-weight: bold; }
          table.data-table td { border: 1px solid #000; padding: 7px; text-transform: uppercase; }
          .ttd-block { margin-top: 40px; float: right; text-align: left; min-width: 260px; font-size: 13px; page-break-inside: avoid; }
          .ttd-space { height: 70px; }
          .clear { clear: both; }
          @media print { body { padding: 15mm; -webkit-print-color-adjust: exact; } }
        </style>
      </head><body>
        <div class="meta-info"><table><tr><td>LAMPIRAN NOMOR</td><td>: ${exportMeta.noSurat.toUpperCase() || '-'}</td></tr><tr><td>PERIHAL</td><td>: DATA ${formTitle.toUpperCase()}</td></tr></table></div>
        <table class="data-table"><thead><tr>${tableHeadersHTML}</tr></thead><tbody>${tableRowsHTML}</tbody></table>
        <div class="ttd-block"><div>MENGETAHUI,</div><div style="font-weight: bold; margin-top: 2px;">${exportMeta.jabatan}</div><div class="ttd-space"></div><div style="font-weight: bold; text-decoration: underline;">${exportMeta.nama || '-'}</div><div>NIK/NIP. ${exportMeta.nik || '-'}</div></div>
        <div class="clear"></div><script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
      </body></html>
    `);
    printWindow.document.close();
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-fade-in relative">
      
      {/* ERROR 1 DIPERBAIKI DI SINI: TOASTER SYNTAX ERROR FIX */}
      <Toaster position="top-right" toastOptions={{ style: { background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '16px' } }} />
      
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg p-6 md:p-8 rounded-3xl shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowExportModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1 flex items-center"><FontAwesomeIcon icon={faPrint} className="mr-3 text-primary" /> Konfigurasi Lampiran</h3>
            <p className="text-gray-400 text-xs mb-6 border-b border-white/5 pb-4">Data di bawah ini akan diingat otomatis oleh sistem memori browser (Cache).</p>
            <div className="space-y-4">
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nomor Lampiran</label><input type="text" value={exportMeta.noSurat} onChange={e => handleMetaChange('noSurat', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none uppercase font-semibold" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Jabatan TTD</label><input type="text" value={exportMeta.jabatan} onChange={e => handleMetaChange('jabatan', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-semibold" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nama TTD</label><input type="text" value={exportMeta.nama} onChange={e => handleMetaChange('nama', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-semibold" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">NIK/NIP TTD</label><input type="number" value={exportMeta.nik} onChange={e => handleMetaChange('nik', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-semibold" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <button onClick={handleExportExcel} className="p-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl uppercase text-xs flex items-center justify-center gap-2"><FontAwesomeIcon icon={faFileExcel} size="lg" /> Excel</button>
              <button onClick={handleExportPDF} className="p-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl uppercase text-xs flex items-center justify-center gap-2"><FontAwesomeIcon icon={faFilePdf} size="lg" /> PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* RUANG KERJA VERIFIKATOR (TINDAK LANJUT) */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto py-10">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-5xl p-6 md:p-8 rounded-3xl shadow-2xl relative my-auto animate-fade-in-up">
            <button onClick={() => setShowVerifyModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
            
            <div className="border-b border-white/10 pb-4 mb-6">
              <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center"><FontAwesomeIcon icon={faUserShield} className="mr-3 text-primary" /> Ruang Tindak Lanjut Data</h3>
              <p className="text-gray-400 text-xs mt-1">Reg: <span className="text-primary font-mono">{verifyData?.data?.nomor_registrasi || '-'}</span> | Pemohon: <span className="text-white font-bold">{verifyData?.data?.nama || '-'}</span></p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {!isVerifikator ? (
                <div className="lg:col-span-1 bg-black/30 p-5 rounded-2xl border border-white/5 h-fit">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4 flex items-center border-b border-primary/20 pb-2"><FontAwesomeIcon icon={faPlus} className="mr-2" /> Suntik Header Khusus</h4>
                  <p className="text-[10px] text-gray-400 mb-4 leading-relaxed">Tambahkan kolom verifikasi yang <span className="text-red-400 font-bold">TERKUNCI DARI PUBLIK</span>.</p>
                  <form onSubmit={handleAddVerifyColumn} className="space-y-3">
                    <input type="text" required placeholder="ID Database (Tanpa Spasi)" value={newVerifyCol.name} onChange={(e) => setNewVerifyCol({...newVerifyCol, name: e.target.value})} className="w-full p-3 rounded-xl bg-dark/50 border border-gray-600 text-white text-xs outline-none focus:border-primary" />
                    <input type="text" required placeholder="Label Tampilan Tabel" value={newVerifyCol.label} onChange={(e) => setNewVerifyCol({...newVerifyCol, label: e.target.value})} className="w-full p-3 rounded-xl bg-dark/50 border border-gray-600 text-white text-xs outline-none focus:border-primary" />
                    <select value={newVerifyCol.type} onChange={(e) => setNewVerifyCol({...newVerifyCol, type: e.target.value})} className="w-full p-3 rounded-xl bg-dark/50 border border-gray-600 text-white text-xs outline-none focus:border-primary">
                      <option value="text">Teks Pendek</option><option value="number">Angka</option><option value="date">Tanggal</option>
                      <option value="currency">Mata Uang Rp.</option><option value="select">Dropdown</option>
                    </select>
                    {newVerifyCol.type === 'select' && <textarea required placeholder="Pilihan dipisah koma (Cth: Layak, Tidak)" value={newVerifyCol.options} onChange={(e) => setNewVerifyCol({...newVerifyCol, options: e.target.value})} className="w-full p-3 rounded-xl bg-dark/50 border border-primary/50 text-white text-xs outline-none h-16" />}
                    <button type="submit" className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl uppercase text-[10px] tracking-widest transition-colors shadow-lg">Buat Header Verifikasi</button>
                  </form>
                </div>
              ) : (
                <div className="lg:col-span-1 bg-blue-900/10 p-5 rounded-2xl border border-blue-500/20 h-fit">
                  <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center"><FontAwesomeIcon icon={faUserShield} className="mr-2" /> Mode Verifikator</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Anda sedang berada di ruang verifikasi. Silakan isi kolom yang tersedia untuk menindaklanjuti data permohonan ini.</p>
                </div>
              )}

              <div className="lg:col-span-2">
                 <form onSubmit={handleSaveVerify} className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeSchema.map((field) => {
                        const colNameLower = field.name.toLowerCase();
                        const isRegionField = colNameLower.includes('kabupaten') || colNameLower.includes('kecamatan') || colNameLower.includes('desa') || colNameLower.includes('kelurahan');
                        const isSelect = field.type === 'select' || isRegionField;
                        const isCurrency = field.type === 'currency';
                        const isSystemGenerated = colNameLower === 'no' || colNameLower === 'nomor';

                        return (
                          <div key={field.name} className={`flex flex-col relative ${field.adminLocked ? 'bg-primary/5 p-3 rounded-xl border border-primary/20' : ''}`}>
                            <label className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest flex items-center justify-between">
                              <span>{field.label}</span>
                              {field.adminLocked && !isSystemGenerated && <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-black">KOLOM VERIFIKASI</span>}
                            </label>

                            {isSelect ? (
                              <div className="relative">
                                 <select name={field.name} value={verifyEditData[field.name] || ''} onChange={(e) => handleVerifyInputChange(e, field)} disabled={isSystemGenerated} className={`w-full p-3 rounded-xl border outline-none text-xs appearance-none ${isSystemGenerated ? 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed' : 'bg-black/40 text-white border-white/10 focus:border-primary'}`}>
                                    <option value="" disabled className="bg-gray-900">-- Pilih --</option>
                                    {(() => {
                                       let selectOptions = field.options || [];
                                       
                                       if (colNameLower.includes('kabupaten')) {
                                         selectOptions = Object.keys(DATA_WILAYAH);
                                       } else if (colNameLower.includes('kecamatan')) {
                                         const kabKey = Object.keys(verifyEditData).find(k => k.toLowerCase().includes('kabupaten'));
                                         const kabVal = kabKey ? verifyEditData[kabKey] : null;
                                         if (kabVal && DATA_WILAYAH[kabVal]) {
                                           selectOptions = Object.keys(DATA_WILAYAH[kabVal]);
                                         }
                                       } else if (colNameLower.includes('desa') || colNameLower.includes('kelurahan')) {
                                         const kabKey = Object.keys(verifyEditData).find(k => k.toLowerCase().includes('kabupaten'));
                                         const kecKey = Object.keys(verifyEditData).find(k => k.toLowerCase().includes('kecamatan'));
                                         const kabVal = kabKey ? verifyEditData[kabKey] : null;
                                         const kecVal = kecKey ? verifyEditData[kecKey] : null;
                                         if (kabVal && kecVal && DATA_WILAYAH[kabVal] && DATA_WILAYAH[kabVal][kecVal]) {
                                           selectOptions = DATA_WILAYAH[kabVal][kecVal];
                                         }
                                       }

                                       return selectOptions.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>);
                                    })()}
                                 </select>
                                 <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-[10px] pointer-events-none" />
                              </div>
                            ) : (
                              <div className="relative flex items-center">
                                {isCurrency && <span className="absolute left-3 font-bold text-xs text-primary">Rp.</span>}
                                <input
                                  type={isCurrency ? 'text' : field.type || 'text'}
                                  name={field.name}
                                  value={isSystemGenerated ? (verifyEditData[field.name] || '-') : (verifyEditData[field.name] || '')}
                                  onChange={(e) => handleVerifyInputChange(e, field)}
                                  disabled={isSystemGenerated}
                                  className={`w-full p-3 rounded-xl border outline-none text-xs transition-all ${isCurrency ? 'pl-10' : 'pl-3'} ${isSystemGenerated ? 'bg-white/5 text-gray-400 border-white/5 cursor-not-allowed font-semibold' : 'bg-black/40 text-white border-white/10 focus:border-primary'}`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="sticky bottom-0 bg-[#0f172a] pt-4 mt-6 border-t border-white/10">
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all text-xs">
                        <FontAwesomeIcon icon={faSave} className="mr-2" /> Simpan Hasil Tindak Lanjut
                      </button>
                    </div>
                 </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER MONITORING PANEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6 gap-4">
        <div><h2 className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-wide flex items-center"><FontAwesomeIcon icon={faDatabase} className="mr-3 text-primary" /> Executive Data Table</h2></div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-3 bg-darker border border-gray-700 p-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
            <FontAwesomeIcon icon={faFilter} className="text-gray-500 ml-3" />
            <select value={selectedFormId} onChange={(e) => setSelectedFormId(e.target.value)} className="p-1.5 bg-transparent text-white focus:outline-none text-xs md:text-sm font-bold w-full sm:w-48">
              {forms.map(f => <option key={f.id} value={f.id} className="bg-[#0f172a]">{f.title.toUpperCase()}</option>)}
            </select>
          </div>
          <button onClick={() => setShowExportModal(true)} className="w-full sm:w-auto px-5 py-3.5 bg-primary hover:bg-yellow-500 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all"><FontAwesomeIcon icon={faPrint} className="mr-2" /> Cetak Lampiran</button>
        </div>
      </div>
      
      {/* TABEL DATA HASIL INPUT */}
      <div className="bg-darker rounded-3xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs md:text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 border-gray-800 bg-black/50">
              <tr>
                {activeSchema.map(col => <th key={col.name} className="px-6 py-5 font-bold text-gray-300">{col.label}</th>)}
                <th className="px-6 py-5 font-black text-gray-400 text-right">Otoritas Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={activeSchema.length + 1} className="text-center py-10 text-gray-500">Memetakan data...</td></tr>
              ) : responses.length > 0 ? (
                responses.map((res, index) => (
                  <tr key={res.id} className={`${index % 2 === 0 ? 'bg-dark/20' : 'bg-darker'} hover:bg-primary/5`}>
                    {activeSchema.map(col => {
                      const colNameLower = col.name.toLowerCase();
                      let displayValue = res.data[col.name] || '-';
                      if (colNameLower === 'no' || colNameLower === 'nomor') displayValue = responses.length - index; 
                      return (
                        <td key={col.name} className="px-6 py-4 text-gray-300 truncate max-w-[200px]">
                          {String(displayValue).startsWith('http') ? <a href={displayValue} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold"><FontAwesomeIcon icon={faFileDownload} className="mr-1.5" /> UNDUH</a> : displayValue}
                        </td>
                      );
                    })}
                    
                    <td className="px-6 py-4 flex justify-end space-x-2 items-center">
                      <button onClick={() => { setVerifyData(res); setVerifyEditData(res.data); setShowVerifyModal(true); }} className="px-3 py-1.5 bg-blue-950/40 text-blue-400 border border-blue-900/50 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-colors mr-1">
                        <FontAwesomeIcon icon={faUserShield} className="mr-1" /> Tindak Lanjut
                      </button>

                      {!isVerifikator && (
                        res.data.delete_request_status === 'pending' ? (
                          <><span className="text-[9px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded animate-pulse">MINTA HAPUS</span><button onClick={() => handleAdminDelete(res.id)} className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[10px]"><FontAwesomeIcon icon={faCheck}/></button><button onClick={() => handleRejectDelete(res)} className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-[10px]"><FontAwesomeIcon icon={faTimes}/></button></>
                        ) : <button onClick={() => handleAdminDelete(res.id)} className="px-3 py-1.5 bg-red-950/40 text-red-500 rounded-lg text-[10px] font-bold border border-red-900/50 hover:bg-red-600 hover:text-white"><FontAwesomeIcon icon={faTrash} /></button>
                      )}
                    </td>
                  </tr>
                ))
              ) : <tr><td colSpan={activeSchema.length + 1} className="text-center py-10 text-gray-500">Kosong.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
