import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faFilter, faFileDownload, faFolderOpen, faPrint, faTimes, faFilePdf, faTrash, faCheck, faUserShield, faPlus, faSave, faChevronDown, faUpload, faFileExcel, faSpinner, faLock, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import toast, { Toaster } from 'react-hot-toast';

const DATA_WILAYAH = {
  "TAPIN": {
    "BAKARANGAN": [ "BAKARANGAN", "BUNDUNG", "GADUNG", "GADUNG KARAMAT", "KETAPANG", "MASTA", "PARIGI", "PARIGI KECIL", "PAUL", "TANGKAWANG", "TANGKAWANG BARU", "WARINGIN" ],
    "BINUANG": [ "A. YANI PURA", "BINUANG", "GUNUNG BATU", "KARANGAN PUTIH", "MEKARSARI", "PADANG SARI", "PUALAM SARI", "PULAU PINANG", "PULAU PINANG UTARA", "RAYA BELANTI", "TUNGKAP" ],
    "BUNGUR": [ "BANUA PADANG", "BANUA PADANG HILIR", "BUNGUR", "BUNGUR BARU", "HANGUI", "KALUMPANG", "LINUH", "PARING GULING", "PURUT", "RANTAU BUJUR", "SHABAH", "TIMBUNG" ],
    "CANDI LARAS SELATAN": [ "BARINGIN A", "BARINGIN B", "BAULIN", "CANDI LARAS", "MARAMPIAU", "MARAMPIAU HILIR", "MARGASARI HULU", "PABAUNGAN HILIR", "PABAUNGAN HULU", "PABAUNGAN PANTAI", "SUNGAI RUTAS", "SUNGAI RUTAS HULU" ],
    "CANDI LARAS UTARA": [ "BATALAS", "BUAS-BUAS", "BUAS-BUAS HILIR", "KALADAN", "MARGASARI HILIR", "PARIOK", "RAWANA", "RAWANA HULU", "SAWAJA", "SUNGAI PUTING", "SUNGAI SALAI", "SUNGAI SALAI HILIR", "TELUK HAUR" ],
    "HATUNGUN": [ "ASAM RANDAH", "BAGAK", "BATU HAPU", "BURAKAI", "HATUNGUN", "KAMBANG KUNING", "MATANG BATAS", "TARUNGIN" ],
    "LOKPAIKAT": [ "AYUNAN PAPAN", "BATARATAT", "BINDERANG", "BITAHAN", "BITAHAN BARU", "BUDI MULYA", "LOKPAIKAT", "PARANDAKAN", "PUNCAK HARAPAN" ],
    "PIANI": [ "BALAWAIAN", "BARAMBAN", "BATU AMPAR", "BATUNG", "BUNIIN JAYA", "HARAKIT", "MIAWA", "PIPITAK JAYA" ],
    "SALAM BABARIS": [ "KAMBANG HABANG BARU", "KAMBANG HABANG LAMA", "PANTAI CABE", "SALAM BABARIS", "SUATO BARU", "SUATO LAMA" ],
    "TAPIN SELATAN": [ "CEMPAKA", "HARAPAN MASA", "HATIWIN", "LAWAHAN", "RUMINTIN", "SAWANG", "SUATO TATAKAN", "TAMBARANGAN", "TANDUI", "TATAKAN", "TIMBAAN" ],
    "TAPIN TENGAH": [ "ANDHIKA", "BATANG LANTIK", "HIYUNG", "KEPAYANG", "LABUNG", "MANDURIAN", "MANDURIAN HILIR", "PANDAHAN", "PANDULANGAN", "PAPAGAN MAKMUR", "PEMATANG KARANGAN", "PEMATANG KARANGAN HILIR", "PEMATANG KARANGAN HULU", "SERAWI", "SUKA RAMAI", "SUNGAI BAHALANG", "TIRIK" ],
    "TAPIN UTARA": [ "ANTASARI", "ANTASARI HILIR", "BADAUN", "BANUA HALAT KANAN", "BANUA HALAT KIRI", "BANUA HANYAR", "BANUA HANYAR HULU", "JINGAH BABARIS", "KAKARAN", "KERAMAT", "KUPANG", "LUMBU RAYA", "PERINTIS RAYA", "RANGDA MALINGKUNG", "RANTAU KANAN", "RANTAU KIWA" ]
  }
};

export default function Responses() {
  const [responses, setResponses] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSchema, setActiveSchema] = useState([]);
  
  const [isVerifikator, setIsVerifikator] = useState(false);
  const globalFolderId = '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

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

  const [rawVerifyFiles, setRawVerifyFiles] = useState({});
  const [isSaving, setIsSaving] = useState(false);

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

  const handleVerifyFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.size > 3.5 * 1024 * 1024) {
       return toast.error('Maaf, ukuran maksimal dokumen PDF/Berkas non-foto adalah 3.5 MB.');
    }
    setRawVerifyFiles(prev => ({ ...prev, [fieldName]: file }));
    setVerifyEditData(prev => ({ ...prev, [fieldName]: file.name }));
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
        if (k.toLowerCase().includes('kecamatan') || k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) newFormData[k] = '';
      });
    } else if (name.includes('kecamatan')) {
      Object.keys(newFormData).forEach(k => {
        if (k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) newFormData[k] = '';
      });
    }

    setVerifyEditData(newFormData);
  };

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
          let width = img.width; let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.5).split(',')[1]);
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSaveVerify = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    let finalData = { ...verifyEditData };

    try {
      const uploadPromises = Object.keys(rawVerifyFiles).map(async (key) => {
        const fileObject = rawVerifyFiles[key];
        if (fileObject) {
          try {
            const base64String = await compressImage(fileObject);
            const res = await fetch('/api/sync-google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'uploadFile', fileName: fileObject.name, mimeType: fileObject.type, base64Data: base64String, folderId: globalFolderId })
            });
            const textResponse = await res.text();
            let driveData;
            try { driveData = JSON.parse(textResponse); } 
            catch(err) { throw new Error('API Vercel Terblokir / Timeout.'); }

            if(!res.ok) throw new Error(driveData.error || 'Server Timeout');
            finalData[key] = driveData.link;
          } catch(err) { finalData[key] = `ERROR: ${err.message}`; }
        }
      });

      await Promise.all(uploadPromises);

      await supabase.from('form_responses').update({ data: finalData }).eq('id', verifyData.id);
      
      toast.success('Hasil Verifikasi Berhasil Diamankan!');
      
      // Update tabel real-time tanpa refresh
      setResponses(prev => prev.map(item => item.id === verifyData.id ? { ...item, data: finalData } : item));
      setShowVerifyModal(false);
      setRawVerifyFiles({});
    } catch (err) { 
      toast.error('Gagal menyimpan verifikasi.'); 
    } finally { setIsSaving(false); }
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
    <div className="space-y-6 max-w-7xl mx-auto pb-20 p-2 md:p-4 lg:p-0 animate-fade-in relative">
      <Toaster position="top-right" toastOptions={{ style: { background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '16px' } }} />
      
      {isSaving && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex flex-col justify-center items-center">
          <div className="bg-[#0f172a] border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col items-center shadow-2xl animate-scale-up">
            <FontAwesomeIcon icon={faSpinner} spin size="3xl" className="text-primary mb-4" />
            <p className="text-white text-xs md:text-sm font-black uppercase tracking-widest text-center">Menyimpan Tindak Lanjut...</p>
            <p className="text-gray-500 text-[10px] mt-2">Kompresi cerdas aktif mengamankan file.</p>
          </div>
        </div>
      )}

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

      {/* ===================================================================== */}
      {/* RUANG VERIFIKATOR - FULL SCREEN DESKTOP DAN FULL RESPONSIVE FIX */}
      {/* ===================================================================== */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[100] flex bg-[#0f172a] md:bg-black/95">
          <div className="bg-[#0f172a] w-full h-full md:w-screen md:h-screen flex flex-col animate-fade-in-up overflow-hidden">
            
            <div className="flex-none p-4 md:p-8 border-b border-white/10 relative bg-darker pr-14 shadow-md z-10">
              <button onClick={() => { setShowVerifyModal(false); setRawVerifyFiles({}); }} className="absolute top-4 md:top-8 right-4 md:right-8 text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full w-10 h-10 flex items-center justify-center transition-all z-20"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
              <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-widest flex items-center leading-tight"><FontAwesomeIcon icon={faUserShield} className="mr-3 md:mr-4 text-primary" /> Ruang Tindak Lanjut Data</h3>
              <p className="text-gray-400 text-xs md:text-sm mt-2">Registrasi Pemohon: <span className="text-primary font-mono font-bold tracking-widest">{verifyData?.data?.nomor_registrasi || '-'}</span></p>
            </div>

            <form onSubmit={handleSaveVerify} className="flex flex-col flex-1 min-h-0 bg-[#0f172a]">
              
              <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar relative">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
                  
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-blue-900/10 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-blue-500/20 shadow-inner">
                      <h4 className="text-sm md:text-base font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center"><FontAwesomeIcon icon={faUserShield} className="mr-3 text-xl" /> {isVerifikator ? 'Mode Verifikator' : 'Mode Administrator'}</h4>
                      <p className="text-xs md:text-sm text-gray-400 leading-relaxed">Seluruh isian data awal pemohon telah <strong>dikunci mati oleh sistem keamanan</strong>. Anda hanya dapat mengisi kolom verifikasi yang telah disediakan di panel kanan.</p>
                    </div>
                    
                    {!isVerifikator && (
                      <div className="bg-black/40 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/5 shadow-inner">
                        <h4 className="text-xs md:text-sm font-black text-primary uppercase tracking-widest mb-4 flex items-center border-b border-primary/20 pb-3"><FontAwesomeIcon icon={faPlus} className="mr-3" /> Suntik Header Khusus</h4>
                        <div className="space-y-4">
                          <input type="text" placeholder="ID Database (Tanpa Spasi)" value={newVerifyCol.name} onChange={(e) => setNewVerifyCol({...newVerifyCol, name: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white text-xs md:text-sm outline-none focus:border-primary transition-all" />
                          <input type="text" placeholder="Label Tampilan Tabel" value={newVerifyCol.label} onChange={(e) => setNewVerifyCol({...newVerifyCol, label: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white text-xs md:text-sm outline-none focus:border-primary transition-all" />
                          <select value={newVerifyCol.type} onChange={(e) => setNewVerifyCol({...newVerifyCol, type: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white text-xs md:text-sm outline-none focus:border-primary transition-all">
                            <option value="text">Teks Pendek</option><option value="number">Angka</option><option value="date">Tanggal</option>
                            <option value="currency">Mata Uang Rp.</option><option value="select">Dropdown</option>
                            <option value="file">Upload Berkas (Drive)</option>
                          </select>
                          {newVerifyCol.type === 'select' && <textarea placeholder="Pilihan dipisah koma (Cth: Layak, Tidak)" value={newVerifyCol.options} onChange={(e) => setNewVerifyCol({...newVerifyCol, options: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-primary/50 text-white text-xs md:text-sm h-20 outline-none" />}
                          <button type="button" onClick={handleAddVerifyColumn} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-black py-4 rounded-xl uppercase text-xs tracking-widest transition-all shadow-lg mt-2">Buat Header</button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 bg-black/20 p-4 md:p-8 rounded-2xl md:rounded-3xl border border-white/5">
                      {activeSchema.map((field) => {
                        const colNameLower = field.name.toLowerCase();
                        const isRegionField = colNameLower.includes('kabupaten') || colNameLower.includes('kecamatan') || colNameLower.includes('desa') || colNameLower.includes('kelurahan');
                        const isSelect = field.type === 'select' || isRegionField;
                        const isCurrency = field.type === 'currency';
                        const isSystemGenerated = colNameLower === 'no' || colNameLower === 'nomor';
                        const isFile = field.type === 'file';
                        
                        // KUNCI MUTLAK: Pemohon data tidak bisa diedit Verifikator
                        const isApplicantData = !field.adminLocked;
                        const isDisabled = isSystemGenerated || isApplicantData;
                        
                        const existingValue = verifyEditData[field.name];
                        const hasFileUploaded = typeof existingValue === 'string' && existingValue.startsWith('http');

                        return (
                          <div key={field.name} className={`flex flex-col relative ${field.adminLocked ? 'bg-primary/5 p-4 md:p-5 rounded-2xl border border-primary/20 shadow-sm' : 'opacity-70 grayscale-[30%]'} ${isFile ? 'md:col-span-2' : ''}`}>
                            <label className="text-[10px] md:text-xs font-black text-gray-400 mb-2 uppercase tracking-widest flex items-center justify-between">
                              <span className="flex items-center">{field.label} {isDisabled && !isSystemGenerated && <span className="ml-2 text-[8px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded uppercase border border-red-500/30"><FontAwesomeIcon icon={faLock} className="mr-1"/> Kunci</span>}</span>
                              {hasFileUploaded && (
                                <a href={existingValue} target="_blank" rel="noreferrer" className="text-[9px] md:text-[10px] text-primary hover:text-yellow-400 underline font-black uppercase tracking-widest flex items-center transition-colors"><FontAwesomeIcon icon={faFolderOpen} className="mr-1.5"/> Buka Berkas Asli</a>
                              )}
                            </label>

                            {isFile ? (
                              <div className="relative mt-1">
                                <input type="file" onChange={(e) => handleVerifyFileChange(e, field.name)} disabled={isDisabled} className="hidden" id={`vfile-${field.name}`}/>
                                <label htmlFor={`vfile-${field.name}`} className={`flex items-center justify-center p-4 md:p-6 rounded-xl md:rounded-2xl border border-dashed transition-all duration-300 cursor-pointer text-xs md:text-sm font-semibold ${isDisabled ? 'bg-white/5 border-white/5 text-gray-600 cursor-not-allowed' : 'bg-black/40 border-white/20 hover:border-primary hover:text-primary hover:bg-primary/5 text-gray-300 shadow-inner'}`}>
                                  <FontAwesomeIcon icon={faUpload} className="mr-3 text-lg" />
                                  <span className="truncate max-w-[200px] md:max-w-md">
                                    {rawVerifyFiles[field.name]?.name || (hasFileUploaded ? 'Berkas Tersimpan (Klik Ganti)' : 'Unggah / Ambil Foto Dokumen Fisik...')}
                                  </span>
                                </label>
                              </div>
                            ) : isSelect ? (
                              <div className="relative mt-1">
                                 <select name={field.name} value={verifyEditData[field.name] || ''} onChange={(e) => handleVerifyInputChange(e, field)} disabled={isDisabled} className={`w-full p-3.5 md:p-4 rounded-xl border outline-none text-xs md:text-sm font-semibold appearance-none transition-all ${isDisabled ? 'bg-white/5 border-white/5 text-gray-500 cursor-not-allowed' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/80 shadow-inner'}`}>
                                    <option value="" disabled className="bg-gray-900">-- Pilih Opsi --</option>
                                    {(() => {
                                       let selectOptions = field.options || [];
                                       if (colNameLower.includes('kabupaten')) {
                                         selectOptions = Object.keys(DATA_WILAYAH);
                                       } else if (colNameLower.includes('kecamatan')) {
                                         const kabKey = Object.keys(verifyEditData).find(k => k.toLowerCase().includes('kabupaten'));
                                         const kabVal = kabKey ? verifyEditData[kabKey] : null;
                                         if (kabVal && DATA_WILAYAH[kabVal]) selectOptions = Object.keys(DATA_WILAYAH[kabVal]);
                                       } else if (colNameLower.includes('desa') || colNameLower.includes('kelurahan')) {
                                         const kabKey = Object.keys(verifyEditData).find(k => k.toLowerCase().includes('kabupaten'));
                                         const kecKey = Object.keys(verifyEditData).find(k => k.toLowerCase().includes('kecamatan'));
                                         const kabVal = kabKey ? verifyEditData[kabKey] : null;
                                         const kecVal = kecKey ? verifyEditData[kecKey] : null;
                                         if (kabVal && kecVal && DATA_WILAYAH[kabVal] && DATA_WILAYAH[kabVal][kecVal]) selectOptions = DATA_WILAYAH[kabVal][kecVal];
                                       }
                                       return selectOptions.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>);
                                    })()}
                                 </select>
                                 <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                              </div>
                            ) : (
                              <div className="relative flex items-center mt-1">
                                {isCurrency && <span className="absolute left-4 font-black text-xs md:text-sm text-primary">Rp</span>}
                                <input
                                  type={isCurrency ? 'text' : field.type || 'text'}
                                  name={field.name}
                                  value={isSystemGenerated ? (verifyEditData[field.name] || '-') : (verifyEditData[field.name] || '')}
                                  onChange={(e) => handleVerifyInputChange(e, field)}
                                  disabled={isDisabled}
                                  placeholder={isCurrency ? '0' : `Ketik...`}
                                  className={`w-full p-3.5 md:p-4 rounded-xl border outline-none text-xs md:text-sm font-semibold transition-all ${isCurrency ? 'pl-10 md:pl-12' : 'pl-4'} ${isDisabled ? 'bg-white/5 border-white/5 text-gray-500 cursor-not-allowed' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/80 shadow-inner'}`}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* FOOTER TOMBOL KEMBALI DAN SIMPAN */}
              <div className="flex-none p-4 md:p-6 border-t border-white/10 bg-darker flex flex-col md:flex-row justify-end gap-3 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <button type="button" onClick={() => { setShowVerifyModal(false); setRawVerifyFiles({}); }} className="w-full md:w-auto px-8 py-4 md:py-3 bg-gray-800 hover:bg-gray-700 text-white font-black rounded-xl text-xs md:text-sm uppercase tracking-widest transition-all">
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-3" /> Kembali
                </button>
                <button type="submit" className="w-full md:w-auto px-10 py-4 md:py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs md:text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                  <FontAwesomeIcon icon={faSave} className="mr-3" /> Simpan Tindak Lanjut
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* HEADER MONITORING PANEL UTAMA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-4 md:pb-6 gap-3 md:gap-4">
        <div><h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white uppercase tracking-wide flex items-center"><FontAwesomeIcon icon={faDatabase} className="mr-2 md:mr-3 text-primary" /> Executive Data Table</h2></div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 md:space-x-3 bg-darker border border-gray-700 p-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
            <FontAwesomeIcon icon={faFilter} className="text-gray-500 ml-2 md:ml-3" />
            <select value={selectedFormId} onChange={(e) => setSelectedFormId(e.target.value)} className="p-1.5 md:p-2 bg-transparent text-white focus:outline-none text-[10px] md:text-xs lg:text-sm font-bold w-full sm:w-40 md:w-48">
              {forms.map(f => <option key={f.id} value={f.id} className="bg-[#0f172a]">{f.title.toUpperCase()}</option>)}
            </select>
          </div>
          <button onClick={() => setShowExportModal(true)} className="w-full sm:w-auto px-4 md:px-5 py-3 md:py-3.5 bg-primary hover:bg-yellow-500 text-black rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex justify-center items-center"><FontAwesomeIcon icon={faPrint} className="mr-2" /> Cetak Lampiran</button>
        </div>
      </div>
      
      {/* DATA VIEW */}
      <div className="bg-darker rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full text-left text-[10px] md:text-xs lg:text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 border-gray-800 bg-black/50">
              <tr>
                {activeSchema.map(col => <th key={col.name} className="px-4 md:px-6 py-4 md:py-5 font-bold text-gray-300">{col.label}</th>)}
                <th className="px-4 md:px-6 py-4 md:py-5 font-black text-gray-400 text-right sticky right-0 bg-darker z-10 shadow-[-10px_0_15px_rgba(0,0,0,0.5)]">Otoritas Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={activeSchema.length + 1} className="text-center py-8 md:py-10 text-gray-500">Memetakan data...</td></tr>
              ) : responses.length > 0 ? (
                responses.map((res, index) => (
                  <tr key={res.id} className={`${index % 2 === 0 ? 'bg-dark/20' : 'bg-darker'} hover:bg-primary/5`}>
                    {activeSchema.map(col => {
                      const colNameLower = col.name.toLowerCase();
                      let displayValue = res.data[col.name] || '-';
                      if (colNameLower === 'no' || colNameLower === 'nomor') displayValue = responses.length - index; 
                      return (
                        <td key={col.name} className="px-4 md:px-6 py-3 md:py-4 text-gray-300 truncate max-w-[150px] md:max-w-[200px]">
                          {String(displayValue).startsWith('http') ? <a href={displayValue} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold"><FontAwesomeIcon icon={faFileDownload} className="mr-1.5" /> UNDUH</a> : 
                           String(displayValue).includes('GAGAL') || String(displayValue).includes('ERROR') ? <span className="text-red-400 font-bold bg-red-400/10 px-2 py-1.5 rounded-md text-[9px] border border-red-500/20">{displayValue}</span> : displayValue}
                        </td>
                      );
                    })}
                    
                    <td className="px-4 md:px-6 py-3 md:py-4 flex justify-end space-x-2 items-center sticky right-0 bg-darker/90 backdrop-blur z-10 shadow-[-10px_0_15px_rgba(0,0,0,0.5)]">
                      <button onClick={() => { setVerifyData(res); setVerifyEditData(res.data); setShowVerifyModal(true); }} className="px-2 md:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[9px] md:text-xs font-black uppercase tracking-widest transition-all shadow-md">
                        <FontAwesomeIcon icon={faUserShield} className="md:mr-2" /> <span className="hidden md:inline">Tindak Lanjut</span>
                      </button>

                      {!isVerifikator && (
                        res.data.delete_request_status === 'pending' ? (
                          <><span className="text-[8px] md:text-[9px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded animate-pulse hidden sm:inline">MINTA HAPUS</span><button onClick={() => handleAdminDelete(res.id)} className="px-2 md:px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[9px] md:text-[10px]"><FontAwesomeIcon icon={faCheck}/></button><button onClick={() => handleRejectDelete(res)} className="px-2 md:px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-[9px] md:text-[10px]"><FontAwesomeIcon icon={faTimes}/></button></>
                        ) : <button onClick={() => handleAdminDelete(res.id)} className="px-2 md:px-3 py-1.5 bg-red-950/40 text-red-500 rounded-lg text-[9px] md:text-[10px] font-bold border border-red-900/50 hover:bg-red-600 hover:text-white"><FontAwesomeIcon icon={faTrash} /></button>
                      )}
                    </td>
                  </tr>
                ))
              ) : <tr><td colSpan={activeSchema.length + 1} className="text-center py-8 md:py-10 text-gray-500">Kosong.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
