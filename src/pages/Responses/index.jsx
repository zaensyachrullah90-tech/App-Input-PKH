import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faFilter, faFileDownload, faFolderOpen, faPrint, faTimes, faFilePdf, faTrash, faCheck, faUserShield, faPlus, faSave, faChevronDown, faUpload, faFileExcel, faSpinner, faLock, faArrowLeft, faEdit } from '@fortawesome/free-solid-svg-icons';
import toast, { Toaster } from 'react-hot-toast';

// =========================================================================
// GANTI DENGAN URL GOOGLE APPS SCRIPT ANDA
// =========================================================================
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwXJXIv7D3hqpMM_b-Kg4nqQ0tAtX0HEq6-jSad74eLSuLZAtvtwm-eY5jnDDrhTmz7/exec";

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
  const [formConfig, setFormConfig] = useState(null);
  
  const [isVerifikator, setIsVerifikator] = useState(false);
  const globalFolderId = '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('lengkap');

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

  const [editingColName, setEditingColName] = useState(null);
  const [editColData, setEditColData] = useState({});

  const [rawVerifyFiles, setRawVerifyFiles] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    fetchForms(); 
    checkRole();
  }, []);

  useEffect(() => { if (selectedFormId) fetchResponses(selectedFormId); }, [selectedFormId]);

  const checkRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email?.toLowerCase().includes('verifikator')) setIsVerifikator(true);
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
    const config = forms.find(f => f.id === formId);
    if (config) {
      setFormConfig(config);
      setActiveSchema(config.schema || []);
    }
    const { data } = await supabase.from('form_responses').select('*, forms(title)').eq('form_id', formId).order('created_at', { ascending: false });
    if (data) setResponses(data);
    setLoading(false);
  };

  const handleMetaChange = (key, value) => {
    const updatedMeta = { ...exportMeta, [key]: value };
    setExportMeta(updatedMeta);
    localStorage.setItem('smart_export_meta_cache', JSON.stringify(updatedMeta));
  };

  // =========================================================================
  // OPTIMISTIC DELETE: MENGHANCURKAN BERKAS DAN BARIS SPREADSHEET (VIA VERCEL API)
  // =========================================================================
  const handleAdminDelete = async (id) => {
    if (isVerifikator) return toast.error('Akses Ditolak: Verifikator tidak memiliki akses hapus data utama.');
    if (!window.confirm('Hapus arsip ini secara permanen? Data di Google Sheet & Drive juga akan dihancurkan otomatis.')) return;
    
    const recordToDelete = responses.find(r => r.id === id);
    setResponses(prev => prev.filter(r => r.id !== id));
    toast.success('Data berhasil dihapus kilat!');

    try {
      await supabase.from('form_responses').delete().eq('id', id);

      const fileUrls = [];
      activeSchema.forEach(col => {
        if (col.type === 'file' && recordToDelete.data[col.name]?.startsWith('http')) {
          fileUrls.push(recordToDelete.data[col.name]);
        }
      });

      if (formConfig?.spreadsheet_id) {
        fetch('/api/sync-google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'deleteData',
            spreadsheetId: formConfig.spreadsheet_id,
            nomor_registrasi: recordToDelete.data.nomor_registrasi,
            fileUrls: fileUrls
          })
        }).catch(e => console.error("Gagal Hapus Sheet"));
      }
    } catch (err) { fetchResponses(selectedFormId); }
  };

  const handleRejectDelete = async (resItem) => {
    if (isVerifikator) return toast.error('Akses Ditolak.');
    try {
      const updatedData = { ...resItem.data };
      delete updatedData.delete_request_status;
      await supabase.from('form_responses').update({ data: updatedData }).eq('id', resItem.id);
      toast.success('Permintaan hapus ditolak.');
      setResponses(prev => prev.map(item => item.id === resItem.id ? { ...item, data: updatedData } : item));
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
    const toastId = toast.loading('Menyuntikkan Header ke Database & Spreadsheet...');
    try {
      const dropdownOptions = newVerifyCol.type === 'select' && newVerifyCol.options ? newVerifyCol.options.split(',').map(opt => opt.trim()) : [];
      const newCol = { 
        name: newVerifyCol.name.toLowerCase().replace(/\s+/g, '_'), 
        label: newVerifyCol.label.toUpperCase(), type: newVerifyCol.type, options: dropdownOptions, adminLocked: true, defaultValue: '' 
      };
      
      const updatedSchema = [...activeSchema, newCol];
      setActiveSchema(updatedSchema);
      await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
      
      if (formConfig?.spreadsheet_id) {
        await fetch('/api/sync-google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'updateHeaders', spreadsheetId: formConfig.spreadsheet_id, schema: updatedSchema })
        });
      }

      toast.success('Header Berhasil Dibuat dan Disinkronisasi!', { id: toastId });
      setNewVerifyCol({ name: '', label: '', type: 'text', options: '' });
    } catch (err) { toast.error('Gagal menyuntikkan header.', { id: toastId }); }
  };

  const handleDeleteColumn = async (colName) => {
    if (!window.confirm(`Hapus kolom "${colName}" ini?`)) return;
    const updatedSchema = activeSchema.filter(col => col.name !== colName);
    setActiveSchema(updatedSchema);
    await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
    
    if (formConfig?.spreadsheet_id) {
      fetch('/api/sync-google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateHeaders', spreadsheetId: formConfig.spreadsheet_id, schema: updatedSchema })
      });
    }
    toast.success('Kolom Berhasil Dihapus.');
  };

  const startEditColumn = (col) => {
    setEditingColName(col.name);
    setEditColData({ ...col, options: col.options ? col.options.join(', ') : '' });
  };

  const saveEditColumn = async () => {
    const dropdownOptions = editColData.type === 'select' && editColData.options ? editColData.options.split(',').map(opt => opt.trim()) : [];
    const updatedSchema = activeSchema.map(col => col.name === editingColName ? { ...editColData, options: dropdownOptions } : col);
    setActiveSchema(updatedSchema);
    setEditingColName(null);
    
    await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
    if (formConfig?.spreadsheet_id) {
      fetch('/api/sync-google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateHeaders', spreadsheetId: formConfig.spreadsheet_id, schema: updatedSchema })
      });
    }
    toast.success('Kolom Diperbarui.');
  };

  const handleVerifyFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.size > 3.5 * 1024 * 1024) {
       return toast.error('Maaf, ukuran PDF maksimal 3.5 MB.');
    }
    setRawVerifyFiles(prev => ({ ...prev, [fieldName]: file }));
    setVerifyEditData(prev => ({ ...prev, [fieldName]: file.name }));
  };

  const handleVerifyInputChange = (e, field) => {
    let value = e.target.value;
    const name = e.target.name.toLowerCase();
    if (field.type === 'currency') value = value ? formatRupiah(value) : '';
    else value = value.toUpperCase();

    let newFormData = { ...verifyEditData, [field.name]: value };

    if (name.includes('kabupaten')) {
      Object.keys(newFormData).forEach(k => { if (k.toLowerCase().includes('kecamatan') || k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) newFormData[k] = ''; });
    } else if (name.includes('kecamatan')) {
      Object.keys(newFormData).forEach(k => { if (k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) newFormData[k] = ''; });
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
    if (GAS_WEB_APP_URL.includes("PASTE_URL")) return toast.error("Error: URL Google Apps Script belum dipaste!");

    const toastId = toast.loading('Menyiapkan Upload...');
    let finalData = { ...verifyEditData };

    try {
      const uploadPromises = Object.keys(rawVerifyFiles).map(async (key) => {
        const fileObject = rawVerifyFiles[key];
        if (fileObject) {
          try {
            const base64String = await compressImage(fileObject);
            const res = await fetch(GAS_WEB_APP_URL, {
              method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'uploadFile', fileName: fileObject.name, mimeType: fileObject.type, base64Data: base64String, folderId: globalFolderId, formTitle: formConfig?.title || 'Umum' })
            });
            const driveData = await res.json();
            if(driveData.link) { finalData[key] = driveData.link; } 
            else { throw new Error('Server Error'); }
          } catch(err) { finalData[key] = 'GAGAL UPLOAD'; toast.error(`Gagal upload: ${err.message}`);}
        }
      });
      await Promise.all(uploadPromises);

      // OPTIMISTIC UI: UPDATE LAYAR INSTAN SEBELUM BACKGROUND PROCESS SELESAI
      toast.success('Hasil Verifikasi Disimpan & Sinkron!', { id: toastId });
      setResponses(prev => prev.map(item => item.id === verifyData.id ? { ...item, data: finalData } : item));
      setShowVerifyModal(false);
      setRawVerifyFiles({});

      // BACKGROUND SYNC KE SUPABASE & SPREADSHEET (VIA VERCEL API)
      (async () => {
        try {
          await supabase.from('form_responses').update({ data: finalData }).eq('id', verifyData.id);
          if (formConfig?.spreadsheet_id) {
             fetch('/api/sync-google', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'updateRow', spreadsheetId: formConfig.spreadsheet_id, nomor_registrasi: finalData.nomor_registrasi, schema: activeSchema, rowData: finalData })
             });
          }
        } catch(e) {}
      })();
      
    } catch (err) { toast.error('Gagal.', { id: toastId }); }
  };

  const handleExportExcel = () => {
    if (responses.length === 0) return toast.error('Kosong.');
    const formTitle = forms.find(f => f.id === selectedFormId)?.title || 'LAPORAN';

    const headerMetadata = [['LAMPIRAN NOMOR', `="${exportMeta.noSurat.toUpperCase()}"`], ['PERIHAL', `="DATA ${formTitle.toUpperCase()}"`], [] ];
    const exportSchema = exportType === 'lampiran' ? activeSchema.filter(col => !col.adminLocked || col.name.toLowerCase() === 'no' || col.name.toLowerCase() === 'nomor') : activeSchema;
    const reversedResponses = [...responses].reverse();

    const tableHeadersHTML = exportSchema.map(col => `<th style="background-color: #f3f4f6; border: 1px solid #000; padding: 8px; font-weight: bold; text-transform: uppercase;">${col.label}</th>`).join('');
    const tableRowsHTML = reversedResponses.map((res, index) => {
      return `<tr>${exportSchema.map(col => {
        const colNameLower = col.name.toLowerCase();
        let val = res.data[col.name] || '-';
        if (colNameLower === 'no' || colNameLower === 'nomor') val = index + 1;
        return `<td style="border: 1px solid #000; padding: 5px;">${val}</td>`;
      }).join('')}</tr>`;
    }).join('');

    const excelHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /><style>table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 11px; }</style></head>
      <body>
        <table>
          <tr><td colspan="${exportSchema.length}" style="font-size: 14px; font-weight: bold; text-align: center;">DATA ${formTitle.toUpperCase()}</td></tr>
          <tr><td colspan="${exportSchema.length}" style="text-align: center;">LAMPIRAN NOMOR: ${exportMeta.noSurat.toUpperCase()}</td></tr>
          <tr><td colspan="${exportSchema.length}"></td></tr>
          <tr>${tableHeadersHTML}</tr>${tableRowsHTML}<tr><td colspan="${exportSchema.length}"></td></tr>
          <tr><td colspan="${Math.max(1, exportSchema.length - 2)}"></td><td colspan="2" style="text-align: center;">MENGETAHUI,<br/><br/><br/><br/><b>${exportMeta.jabatan}</b><br/><u>${exportMeta.nama || '-'}</u><br/>NIK/NIP. ${exportMeta.nik || '-'}</td></tr>
        </table>
      </body></html>
    `;
    const blob = new Blob(['\uFEFF' + excelHTML], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `Laporan_Excel_${formTitle}.xls`; link.click();
    setShowExportModal(false);
  };

  const handleExportPDF = () => {
    if (responses.length === 0) return toast.error('Kosong.');
    const formTitle = forms.find(f => f.id === selectedFormId)?.title || 'LAPORAN';
    const printWindow = window.open('', '_blank');
    const reversedResponses = [...responses].reverse();

    const exportSchema = exportType === 'lampiran' ? activeSchema.filter(col => !col.adminLocked || col.name.toLowerCase() === 'no' || col.name.toLowerCase() === 'nomor') : activeSchema;
    const tableHeadersHTML = exportSchema.map(col => `<th style="padding: 8px; border: 1px solid #000; text-align: left; background-color: #f3f4f6;">${col.label}</th>`).join('');
    const tableRowsHTML = reversedResponses.map((res, index) => {
      return `<tr>${exportSchema.map(col => {
            const colNameLower = col.name.toLowerCase();
            let val = res.data[col.name] || '-';
            if (colNameLower === 'no' || colNameLower === 'nomor') val = index + 1;
            return `<td style="padding: 7px; border: 1px solid #000;">${val}</td>`;
          }).join('')}</tr>`;
    }).join('');

    printWindow.document.write(`
      <html><head><title></title><style>
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
        </style></head><body>
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
      
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg p-6 md:p-8 rounded-3xl shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowExportModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1 flex items-center"><FontAwesomeIcon icon={faPrint} className="mr-3 text-primary" /> Konfigurasi Lampiran</h3>
            <p className="text-gray-400 text-xs mb-6 border-b border-white/5 pb-4">Pilih jenis cetak laporan dan isi metadata.</p>
            
            <div className="space-y-4">
              <div className="bg-black/30 p-4 rounded-xl border border-white/10 mb-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Tipe Cetak Dokumen</label>
                <div className="flex flex-col md:flex-row gap-4">
                  <label className="flex items-center space-x-2 text-xs text-white cursor-pointer hover:text-primary transition-colors">
                    <input type="radio" value="lampiran" checked={exportType === 'lampiran'} onChange={() => setExportType('lampiran')} className="accent-primary w-4 h-4" />
                    <span className="font-semibold">Bentuk Lampiran (Hanya Isian Warga)</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-white cursor-pointer hover:text-primary transition-colors">
                    <input type="radio" value="lengkap" checked={exportType === 'lengkap'} onChange={() => setExportType('lengkap')} className="accent-primary w-4 h-4" />
                    <span className="font-semibold">Laporan Penuh (+ Kolom Verifikasi)</span>
                  </label>
                </div>
              </div>

              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nomor Lampiran</label><input type="text" value={exportMeta.noSurat} onChange={e => handleMetaChange('noSurat', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none uppercase font-semibold" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Jabatan TTD</label><input type="text" value={exportMeta.jabatan} onChange={e => handleMetaChange('jabatan', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-semibold" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nama TTD</label><input type="text" value={exportMeta.nama} onChange={e => handleMetaChange('nama', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-semibold" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">NIK/NIP TTD</label><input type="number" value={exportMeta.nik} onChange={e => handleMetaChange('nik', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-semibold" /></div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-8 border-t border-white/5 pt-6">
              <button onClick={handleExportExcel} className="p-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl uppercase text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(22,163,74,0.3)] transition-all"><FontAwesomeIcon icon={faFileExcel} size="lg" /> Cetak Excel Rapi</button>
              <button onClick={handleExportPDF} className="p-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl uppercase text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all"><FontAwesomeIcon icon={faFilePdf} size="lg" /> Cetak PDF</button>
            </div>
          </div>
        </div>
      )}

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
                <div className="max-w-7xl mx-auto
