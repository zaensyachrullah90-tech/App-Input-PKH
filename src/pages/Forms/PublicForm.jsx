import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faPaperPlane, faLock, faFolderOpen, faListAlt, faEdit, faUpload, faIdBadge, faChevronDown, faTrash, faSearch, faTimes, faUserShield, faDownload, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

// URL GOOGLE APPS SCRIPT ANDA SUDAH SAYA KUNCI MATI DI SINI
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

export default function PublicForm() {
  const { id: formId } = useParams();
  const location = useLocation();
  const [schema, setSchema] = useState([]);
  const [formData, setFormData] = useState({});
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState(null);
  
  const [activeTab, setActiveTab] = useState('input');
  const [editingId, setEditingId] = useState(null);
  const [registrationNo, setRegistrationNo] = useState('');
  const [rawFiles, setRawFiles] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const globalFolderId = '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'results') setActiveTab('results');
  }, [location.search]);

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    window.history.replaceState(null, '', `?tab=${tab}`);
  };

  useEffect(() => {
    if (formId) { fetchFormSetup(); fetchResponses(); }
  }, [formId]);

  const fetchFormSetup = async () => {
    if (!formId) return;
    try {
      const { data: form, error } = await supabase.from('forms').select('*').eq('id', formId).single();
      if (error || !form) throw new Error();
      setFormConfig(form);
      const formSchema = form.schema || [];
      setSchema(formSchema);

      const autoNum = `REG-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
      setRegistrationNo(autoNum);
      const initialData = { nomor_registrasi: autoNum };
      formSchema.forEach(field => {
        if (field.defaultValue) initialData[field.name] = field.defaultValue.toUpperCase();
      });
      setFormData(prev => ({ ...initialData, ...prev }));
    } catch (err) { toast.error('Formulir tidak valid.'); }
    finally { setLoading(false); }
  };

  const fetchResponses = async () => {
    if (!formId) return;
    const { data } = await supabase.from('form_responses').select('*').eq('form_id', formId).order('created_at', { ascending: false });
    if (data) setResponses(data);
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

  const handleInputChange = (e, field) => {
    let value = e.target.value;
    const name = e.target.name.toLowerCase();
    if (field.type === 'currency') value = value ? formatRupiah(value) : '';
    else value = value.toUpperCase();

    let newFormData = { ...formData, [field.name]: value };

    if (name.includes('kabupaten')) {
      Object.keys(newFormData).forEach(k => { if (k.toLowerCase().includes('kecamatan') || k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) newFormData[k] = ''; });
    } else if (name.includes('kecamatan')) {
      Object.keys(newFormData).forEach(k => { if (k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) newFormData[k] = ''; });
    }
    setFormData(newFormData);
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.size > 3.5 * 1024 * 1024) {
       return toast.error('Maaf, ukuran dokumen PDF maksimal 3.5 MB. Kompres mandiri terlebih dahulu.');
    }
    setRawFiles(prev => ({ ...prev, [fieldName]: file }));
    setFormData(prev => ({ ...prev, [fieldName]: file.name }));
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
          const MAX_WIDTH = 1024; const MAX_HEIGHT = 1024;
          let width = img.width; let height = img.height;
          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          let quality = 0.8;
          let base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
          while (base64.length * 0.75 > 700000 && quality > 0.1) {
            quality -= 0.1;
            base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
          }
          resolve(base64);
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formConfig?.is_active === false) return toast.error('Penerimaan ditutup.');
    
    // Pastikan layar terkunci sejak awal proses ditekan
    setIsSaving(true);
    
    let finalData = { ...formData, nomor_registrasi: registrationNo };

    schema.forEach(col => {
      if (col.name.toLowerCase() === 'no' || col.name.toLowerCase() === 'nomor') {
        finalData[col.name] = editingId ? formData[col.name] : (responses.length + 1);
      }
    });

    const googleSchema = [{ name: 'nomor_registrasi', label: 'NO REGISTRASI' }, ...schema];

    try {
      // 1. UPLOAD FILE TERLEBIH DAHULU
      const uploadPromises = Object.keys(rawFiles).map(async (key) => {
        const fileObject = rawFiles[key];
        if (fileObject) {
          try {
            const base64String = await compressImage(fileObject);
            const res = await fetch('/api/sync-google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'uploadFile', fileName: fileObject.name, mimeType: fileObject.type, base64Data: base64String, folderId: globalFolderId, formTitle: formConfig?.title || 'Umum' })
            });
            const driveData = await res.json();
            if(res.ok && driveData.link) { finalData[key] = driveData.link; } 
            else { throw new Error(driveData.error || 'Server Error'); }
          } catch(err) { finalData[key] = `GAGAL UPLOAD`; toast.error(`Berkas gagal: ${err.message}`); }
        }
      });
      await Promise.all(uploadPromises);

      // 2. SIMPAN KE SUPABASE (DATABASE UTAMA)
      const saveEditingId = editingId;
      
      if (saveEditingId) {
        await supabase.from('form_responses').update({ data: finalData }).eq('id', saveEditingId);
      } else {
        const kabKey = Object.keys(finalData).find(k => k.toLowerCase().includes('kabupaten'));
        await supabase.from('form_responses').insert([{ form_id: formId, data: finalData, kabupaten: kabKey ? finalData[kabKey] : 'Publik' }]);
      }

      // 3. SINKRONISASI KE GOOGLE SHEETS
      let currentSheetId = formConfig?.spreadsheet_id;
      
      // >>> PENAMBAHAN ALGORITMA AUTO-EKSTRAK ID <<<
      // Mengekstrak ID asli jika admin mengisi tautan utuh (URL) di dalam Supabase
      if (currentSheetId && (currentSheetId.includes('docs.google.com') || currentSheetId.includes('/d/'))) {
        const match = currentSheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          currentSheetId = match[1]; // Memotong dan hanya menyisakan ID-nya saja
        }
      }
      
      if (!currentSheetId && !saveEditingId) {
        try {
          const createRes = await fetch('/api/sync-google', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'createForm', title: `Data - ${formConfig.title}`, folderId: globalFolderId, formTitle: formConfig.title })
          });
          const createData = await createRes.json();
          
          if (createData.spreadsheetId) {
            currentSheetId = createData.spreadsheetId;
            await supabase.from('forms').update({ spreadsheet_id: currentSheetId, spreadsheet_link: createData.spreadsheetUrl }).eq('id', formId);
            
            const headerRowData = Object.fromEntries(googleSchema.map(col => [col.name, col.label.toUpperCase()]));
            await fetch('/api/sync-google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'appendRow', spreadsheetId: currentSheetId, schema: googleSchema, rowData: headerRowData })
            });
          }
        } catch (e) {
          console.error("Gagal membuat Sheet Baru:", e);
        }
      }

      // Eksekusi pengiriman data final ke Google Spreadsheet
      if (currentSheetId) {
        try {
          await fetch('/api/sync-google', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
               action: saveEditingId ? 'updateRow' : 'appendRow', 
               spreadsheetId: currentSheetId, 
               nomor_registrasi: finalData.nomor_registrasi, 
               schema: googleSchema, 
               rowData: finalData 
            })
          });
        } catch (e) {
          console.error("Gagal update baris di Spreadsheet:", e);
        }
      }

      // 4. SUKSES, UPDATE TAMPILAN DAN RESET
      setIsSaving(false);
      toast.success('Data Berhasil Direkam & Terhubung Ke Spreadsheet!');
      
      if (saveEditingId) {
        setResponses(prev => prev.map(item => item.id === saveEditingId ? { ...item, data: finalData } : item));
      } else {
        fetchResponses(); 
      }

      const newAutoNum = `REG-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
      setRegistrationNo(newAutoNum);
      const resetData = { nomor_registrasi: newAutoNum };
      schema.forEach(field => { if (field.defaultValue) resetData[field.name] = field.defaultValue.toUpperCase(); });
      
      setFormData(resetData); setRawFiles({}); setEditingId(null);
      handleTabSwitch('results'); 

    } catch (err) { 
      setIsSaving(false); 
      toast.error('Gagal merekam data, pastikan koneksi lancar.'); 
      console.error(err);
    } 
  };

  const handleEdit = (responseItem) => {
    setRegistrationNo(responseItem.data.nomor_registrasi || `EDIT-${responseItem.id.substring(0,4)}`);
    setFormData(responseItem.data);
    setEditingId(responseItem.id);
    handleTabSwitch('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestDelete = async (responseItem) => {
    if (!window.confirm('Ajukan permohonan penghapusan data ini kepada Administrator?')) return;
    toast.success('Permohonan hapus terkirim secara instan!');
    const updatedData = { ...responseItem.data, delete_request_status: 'pending' };
    setResponses(prev => prev.map(item => item.id === responseItem.id ? { ...item, data: updatedData } : item));
    supabase.from('form_responses').update({ data: updatedData }).eq('id', responseItem.id).then();
  };

  if (loading) return <div className="min-h-screen bg-[#030712] flex flex-col justify-center items-center"><FontAwesomeIcon icon={faSpinner} spin size="2xl" className="text-primary mb-4"/><p className="text-gray-500 font-bold tracking-widest text-xs uppercase">Menyiapkan Sistem Publik...</p></div>;

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 font-sans p-2 sm:p-4 md:p-6 flex justify-center items-start pt-4 md:pt-10 relative overflow-hidden">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#fff', borderRadius: '16px', border: '1px solid #374151' } }} />
      
      {isSaving && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex flex-col justify-center items-center">
          <div className="bg-[#0f172a] border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col items-center shadow-2xl animate-scale-up">
            <FontAwesomeIcon icon={faSpinner} spin size="3xl" className="text-primary mb-4" />
            <p className="text-white text-xs md:text-sm font-black uppercase tracking-widest text-center">Menyimpan Ke Database & Spreadsheet...</p>
            <p className="text-green-400 font-bold text-[10px] mt-2 text-center">Mohon tidak menutup halaman ini.</p>
          </div>
        </div>
      )}

      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-7xl bg-[#0f172a]/70 backdrop-blur-3xl border border-white/10 p-4 sm:p-6 md:p-10 rounded-2xl md:rounded-[2rem] shadow-2xl relative z-10 animate-fade-in-up">
        
        <div className="flex flex-col mb-6 md:mb-8 border-b border-white/5 pb-4 md:pb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center leading-tight"><FontAwesomeIcon icon={faFolderOpen} className="mr-3 text-primary" /> {formConfig?.title}</h1>
          <p className="text-gray-400 mt-2 text-xs md:text-sm leading-relaxed">{formConfig?.description}</p>
        </div>

        <div className="flex flex-col sm:flex-row bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-6 md:mb-8 gap-2">
          <button onClick={() => handleTabSwitch('input')} className={`flex-1 py-3 md:py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'input' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}>
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" /> Isi Formulir
          </button>
          <button onClick={() => handleTabSwitch('results')} className={`flex-1 py-3 md:py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'results' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}>
            <FontAwesomeIcon icon={faListAlt} className="mr-2" /> Dashboard Publik & Status Lacak
          </button>
        </div>

        {activeTab === 'input' ? (
          formConfig?.is_active === false ? (
            <div className="text-center p-8 md:p-12 border border-dashed border-red-500/30 rounded-2xl bg-red-950/10 animate-fade-in">
              <FontAwesomeIcon icon={faLock} className="text-4xl text-red-500 mb-4 animate-bounce" />
              <h3 className="text-base md:text-lg font-black text-white uppercase mb-2">Penerimaan Data Ditutup</h3>
            </div>
          ) : schema.length === 0 ? (
            <div className="text-center p-10 border border-dashed border-white/10 rounded-2xl bg-black/30"><p className="text-gray-500 text-sm">Formulir belum memiliki kolom input.</p></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5 animate-fade-in max-w-5xl mx-auto">
              <div className="bg-primary/5 border border-primary/20 p-4 md:p-5 rounded-2xl flex items-center justify-between mb-4">
                <div>
                  <div className="text-[9px] md:text-[10px] font-bold text-primary uppercase tracking-widest mb-1">NO. REGISTRASI</div>
                  <div className="text-base md:text-lg font-mono font-black text-white tracking-wider">{registrationNo}</div>
                </div>
                <FontAwesomeIcon icon={faIdBadge} className="text-2xl md:text-3xl text-primary/50" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {schema.filter(field => !field.adminLocked || field.name.toLowerCase() === 'no' || field.name.toLowerCase() === 'nomor').map((field) => {
                  const colNameLower = field.name.toLowerCase();
                  const colLabelLower = field.label.toLowerCase();
                  const isNoField = colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor';
                  const isRegionField = colNameLower.includes('kabupaten') || colNameLower.includes('kecamatan') || colNameLower.includes('desa') || colNameLower.includes('kelurahan');
                  const isFile = field.type === 'file';
                  const isSelect = field.type === 'select' || isRegionField; 
                  const isCurrency = field.type === 'currency';

                  return (
                    <div key={field.name} className={`flex flex-col relative group ${isFile || colNameLower.includes('keterangan') || colNameLower.includes('alasan') ? 'md:col-span-2' : ''}`}>
                      <label className="text-[10px] md:text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest flex items-center justify-between">
                        <span>{field.label}</span>
                        {isNoField && <span className="text-[8px] font-black bg-white/10 text-white px-2 py-0.5 rounded-full"><FontAwesomeIcon icon={faLock} className="mr-1" /> SISTEM</span>}
                      </label>
                      
                      {isFile ? (
                        <div className="relative">
                          <input type="file" onChange={(e) => handleFileChange(e, field.name)} className="hidden" id={`file-${field.name}`}/>
                          <label htmlFor={`file-${field.name}`} className={`flex items-center justify-center p-4 md:p-5 rounded-xl border border-dashed transition-all duration-300 cursor-pointer bg-black/40 border-white/20 hover:border-primary text-gray-300 hover:bg-black/60`}>
                            <FontAwesomeIcon icon={faUpload} className="mr-3 text-primary text-base" />
                            <span className="font-semibold text-xs md:text-sm truncate px-2">{rawFiles[field.name]?.name || formData[field.name] || 'Pilih / Ambil Foto Berkas...'}</span>
                          </label>
                        </div>
                      ) : isSelect ? (
                        <div className="relative">
                           <select
                              name={field.name} value={formData[field.name] || ''} onChange={(e) => handleInputChange(e, field)} disabled={isNoField}
                              className={`w-full p-3.5 md:p-4 rounded-xl border outline-none transition-all duration-300 text-xs md:text-sm appearance-none ${isNoField ? 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/60'}`}
                              required={!isNoField}
                           >
                              <option value="" disabled className="bg-gray-900">-- Pilih {field.label} --</option>
                              {(() => {
                                let selectOptions = field.options || [];
                                if (colNameLower.includes('kabupaten')) selectOptions = Object.keys(DATA_WILAYAH);
                                else if (colNameLower.includes('kecamatan')) {
                                  const kabKey = Object.keys(formData).find(k => k.toLowerCase().includes('kabupaten'));
                                  if (kabKey && formData[kabKey] && DATA_WILAYAH[formData[kabKey]]) selectOptions = Object.keys(DATA_WILAYAH[formData[kabKey]]);
                                } else if (colNameLower.includes('desa') || colNameLower.includes('kelurahan')) {
                                  const kabKey = Object.keys(formData).find(k => k.toLowerCase().includes('kabupaten'));
                                  const kecKey = Object.keys(formData).find(k => k.toLowerCase().includes('kecamatan'));
                                  if (kabKey && kecKey && formData[kabKey] && formData[kecKey] && DATA_WILAYAH[formData[kabKey]][formData[kecKey]]) selectOptions = DATA_WILAYAH[formData[kabKey]][formData[kecKey]];
                                }
                                return selectOptions.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>);
                              })()}
                           </select>
                           <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="relative flex items-center">
                          {isCurrency && <span className="absolute left-4 font-bold text-xs md:text-sm text-primary">Rp.</span>}
                          <input
                            type={isCurrency ? 'text' : field.type || 'text'} name={field.name}
                            value={isNoField ? (editingId ? formData[field.name] : (responses.length + 1)) : (formData[field.name] || '')}
                            onChange={(e) => handleInputChange(e, field)} disabled={isNoField}
                            placeholder={isCurrency ? '100.000' : `Ketik ${field.label.toLowerCase()}...`}
                            className={`w-full p-3.5 md:p-4 rounded-xl border outline-none transition-all duration-300 text-xs md:text-sm ${isCurrency ? 'pl-10 md:pl-12' : 'pl-3.5 md:pl-4'} ${isNoField ? 'bg-white/5 text-gray-400 border-white/5 cursor-not-allowed font-semibold' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/60 placeholder-gray-600'}`}
                            required={!isNoField}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-yellow-400 text-black font-black py-4 rounded-xl shadow-lg transition-all duration-300 transform active:scale-[0.98] uppercase tracking-widest mt-6 md:mt-8 text-xs md:text-sm">
                Kirim Laporan Sekarang
              </button>
            </form>
          )
        ) : (
          <div className="animate-fade-in bg-[#0f172a] rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden border border-white/10 mt-4 md:mt-6">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="min-w-full text-left text-[10px] md:text-xs whitespace-nowrap">
                <thead className="uppercase tracking-wider border-b border-gray-700 bg-black/60">
                  <tr>
                    <th className="px-5 py-4 font-black text-primary sticky left-0 bg-[#0b1120] z-10 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">Data Laporan</th>
                    {schema.filter(s => !s.adminLocked).map(col => (
                      <th key={col.name} className="px-5 py-4 font-bold text-gray-300">{col.label}</th>
                    ))}
                    {schema.filter(s => s.adminLocked && s.name.toLowerCase() !== 'no' && s.name.toLowerCase() !== 'nomor').map(col => (
                      <th key={col.name} className="px-5 py-4 font-black text-blue-400 border-l border-blue-900/50 bg-blue-900/10"><FontAwesomeIcon icon={faUserShield} className="mr-1.5 opacity-50"/> {col.label}</th>
                    ))}
                    <th className="px-5 py-4 font-black text-red-400 text-center border-l border-gray-800">Aksi Pemohon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {responses.length === 0 ? (
                    <tr><td colSpan="100%" className="text-center py-10 text-gray-500 italic">Belum ada data masuk.</td></tr>
                  ) : (
                    responses.map((res) => (
                      <tr key={res.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-5 py-4 font-bold text-primary sticky left-0 bg-[#0b1120] z-10 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
                          {res.data.nomor_registrasi || res.id?.substring(0,6)}
                          <div className="text-[8px] text-gray-500 mt-1 font-normal">{new Date(res.created_at).toLocaleDateString('id-ID')}</div>
                        </td>
                        
                        {schema.filter(s => !s.adminLocked).map(col => {
                           let val = res.data[col.name] || '-';
                           return (
                             <td key={col.name} className="px-5 py-4 text-gray-200">
                               {String(val).startsWith('http') ? <a href={val} target="_blank" rel="noreferrer" className="text-primary hover:text-yellow-400 font-bold flex items-center"><FontAwesomeIcon icon={faDownload} className="mr-1.5"/> Unduh Berkas</a> : 
                                String(val).includes('GAGAL') ? <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded">GAGAL UPLOAD</span> : val}
                             </td>
                           );
                        })}

                        {schema.filter(s => s.adminLocked && s.name.toLowerCase() !== 'no' && s.name.toLowerCase() !== 'nomor').map(col => {
                           let val = String(res.data[col.name] || '').trim();
                           return (
                             <td key={col.name} className="px-5 py-4 border-l border-blue-900/30 bg-blue-900/5">
                               {val === '' ? <span className="text-gray-600 italic">Menunggu...</span> : 
                                val.startsWith('http') ? <a href={val} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-bold flex items-center"><FontAwesomeIcon icon={faDownload} className="mr-1.5"/> Berkas Tinjauan</a> : <span className="text-white font-black">{val}</span>}
                             </td>
                           );
                        })}

                        <td className="px-5 py-4 text-center border-l border-gray-800/50">
                           {res.data.delete_request_status === 'pending' ? (
                             <span className="text-[8px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1.5 rounded border border-yellow-500/20">MENUNGGU ACC</span>
                           ) : (
                             <div className="flex justify-center space-x-2">
                               <button onClick={() => handleEdit(res)} disabled={formConfig?.is_active === false} className="px-3 py-1.5 bg-white/10 text-white font-bold rounded hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                 <FontAwesomeIcon icon={faEdit} />
                               </button>
                               <button onClick={() => handleRequestDelete(res)} className="px-3 py-1.5 bg-red-950/40 text-red-400 font-bold rounded hover:bg-red-600 hover:text-white transition-colors">
                                 <FontAwesomeIcon icon={faTrash} />
                               </button>
                             </div>
                           )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
