import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faPaperPlane, faLock, faFolderOpen, faListAlt, faEdit, faUpload, faIdBadge, faChevronDown, faTrash, faSearch, faTimes, faUserShield, faDownload, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

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
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [rawFiles, setRawFiles] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const globalFolderId = localStorage.getItem('global_drive_folder_id') || '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

  // SINKRONISASI TAB DENGAN URL MENGGUNAKAN PUSH STATE
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

    if (field.type === 'currency') {
      value = value ? formatRupiah(value) : '';
    } else if (field.type !== 'email' && field.type !== 'password' && !name.includes('email') && !name.includes('password') && !name.includes('user')) {
      value = value.toUpperCase();
    }

    let newFormData = { ...formData, [field.name]: value };

    if (name.includes('kabupaten')) {
      Object.keys(newFormData).forEach(k => {
        if (k.toLowerCase().includes('kecamatan') || k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) newFormData[k] = '';
      });
    } else if (name.includes('kecamatan')) {
      Object.keys(newFormData).forEach(k => {
        if (k.toLowerCase().includes('desa') || k.toLowerCase().includes('kelurahan')) newFormData[k] = '';
      });
    }
    setFormData(newFormData);
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    setRawFiles(prev => ({ ...prev, [fieldName]: file }));
    setFormData(prev => ({ ...prev, [fieldName]: file.name }));
  };

  // =========================================================================
  // PENYEMPURNAAN MUTLAK: SMART IMAGE COMPRESSOR & BASE64 CONVERTER
  // MENCEGAH TIMEOUT VERCEL SECARA INSTAN!
  // =========================================================================
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        // Jika PDF atau file lain, tidak dikompres, langsung base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        return;
      }
      // Jika Gambar/Foto HP (Kompresi 60% via Canvas)
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; const MAX_HEIGHT = 1200;
          let width = img.width; let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Kompresi JPEG 60%
          resolve(dataUrl.split(',')[1]);
        };
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formConfig?.is_active === false) return toast.error('Penerimaan ditutup.');
    if (!formId) return toast.error('Form ID tidak terdeteksi.');
    
    setIsSaving(true);
    let finalData = { ...formData, nomor_registrasi: registrationNo };

    schema.forEach(col => {
      if (col.name.toLowerCase() === 'no' || col.name.toLowerCase() === 'nomor') {
        finalData[col.name] = editingId ? formData[col.name] : (responses.length + 1);
      }
    });

    try {
      const uploadPromises = Object.keys(rawFiles).map(async (key) => {
        const fileObject = rawFiles[key];
        if (fileObject) {
          try {
            const base64String = await compressImage(fileObject); // PANGGIL KOMPRESOR CERDAS
            const res = await fetch('/api/sync-google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'uploadFile', fileName: fileObject.name, mimeType: fileObject.type, base64Data: base64String, folderId: globalFolderId })
            });
            const driveData = await res.json();
            if(res.ok && driveData.link) { finalData[key] = driveData.link; } 
            else { throw new Error('Vercel Timeout'); }
          } catch(err) { finalData[key] = `GAGAL UPLOAD (TIMEOUT)`; }
        }
      });
      await Promise.all(uploadPromises);

      // REALTIME UPDATE TANPA LOADING ULANG
      if (editingId) {
        await supabase.from('form_responses').update({ data: finalData }).eq('id', editingId);
        fetchResponses();
      } else {
        const kabKey = Object.keys(finalData).find(k => k.toLowerCase().includes('kabupaten'));
        const kabupatenVal = kabKey ? finalData[kabKey] : 'Publik';
        const { data: insertedData } = await supabase.from('form_responses').insert([{ form_id: formId, data: finalData, kabupaten: kabupatenVal }]).select().single();
        if (insertedData) {
          setResponses(prev => [insertedData, ...prev]);
        } else {
          fetchResponses();
        }
      }

      // BYPASS SHEET SINKRONISASI
      if (formConfig?.spreadsheet_id && !editingId) {
        fetch('/api/sync-google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'appendRow', spreadsheetId: formConfig.spreadsheet_id, schema: schema, rowData: finalData })
        }).catch(e => console.error("Sheet error:", e));
      }

      toast.success('Data Berhasil Direkam!');
      const newAutoNum = `REG-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
      setRegistrationNo(newAutoNum);
      const resetData = { nomor_registrasi: newAutoNum };
      schema.forEach(field => { if (field.defaultValue) resetData[field.name] = field.defaultValue.toUpperCase(); });
      
      setFormData(resetData); setRawFiles({}); setEditingId(null);
      handleTabSwitch('results'); 
    } catch (err) { toast.error('Gagal merekam data.'); } 
    finally { setIsSaving(false); }
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
    const toastId = toast.loading('Mengirim permohonan...');
    try {
      const updatedData = { ...responseItem.data, delete_request_status: 'pending' };
      await supabase.from('form_responses').update({ data: updatedData }).eq('id', responseItem.id);
      toast.success('Permohonan terkirim!', { id: toastId });
      fetchResponses();
    } catch (err) { toast.error('Gagal.', { id: toastId }); }
  };

  if (loading) return <div className="min-h-screen bg-[#030712] flex flex-col justify-center items-center"><FontAwesomeIcon icon={faSpinner} spin size="2xl" className="text-primary mb-4"/><p className="text-gray-500 font-bold tracking-widest text-xs uppercase">Menyiapkan Sistem...</p></div>;

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 font-sans p-2 sm:p-4 md:p-6 flex justify-center items-start pt-4 md:pt-10 relative overflow-hidden">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#fff', borderRadius: '16px', border: '1px solid #374151' } }} />
      
      {isSaving && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex flex-col justify-center items-center">
          <div className="bg-[#0f172a] border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col items-center shadow-2xl animate-scale-up">
            <FontAwesomeIcon icon={faSpinner} spin size="3xl" className="text-primary mb-4" />
            <p className="text-white text-xs md:text-sm font-black uppercase tracking-widest text-center">Menyimpan & Menghubungkan ke Drive...</p>
            <p className="text-gray-500 text-[10px] mt-2">Upload kilat sedang berlangsung...</p>
          </div>
        </div>
      )}

      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-6xl bg-[#0f172a]/70 backdrop-blur-3xl border border-white/10 p-4 sm:p-6 md:p-10 rounded-2xl md:rounded-[2rem] shadow-2xl relative z-10 animate-fade-in-up">
        
        <div className="flex flex-col mb-6 md:mb-8 border-b border-white/5 pb-4 md:pb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center leading-tight"><FontAwesomeIcon icon={faFolderOpen} className="mr-3 text-primary" /> {formConfig?.title}</h1>
          <p className="text-gray-400 mt-2 text-xs md:text-sm leading-relaxed">{formConfig?.description}</p>
        </div>

        <div className="flex flex-col sm:flex-row bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-6 md:mb-8 gap-2">
          <button onClick={() => handleTabSwitch('input')} className={`flex-1 py-3 md:py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'input' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}>
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" /> Isi Formulir
          </button>
          <button onClick={() => handleTabSwitch('results')} className={`flex-1 py-3 md:py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'results' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}>
            <FontAwesomeIcon icon={faListAlt} className="mr-2" /> Dashboard Publik & Lacak
          </button>
        </div>

        {activeTab === 'input' ? (
          formConfig?.is_active === false ? (
            <div className="text-center p-8 md:p-12 border border-dashed border-red-500/30 rounded-2xl bg-red-950/10 animate-fade-in">
              <FontAwesomeIcon icon={faLock} className="text-4xl text-red-500 mb-4 animate-bounce" />
              <h3 className="text-base md:text-lg font-black text-white uppercase mb-2">Penerimaan Data Ditutup</h3>
              <p className="text-gray-400 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">Formulir ini dinonaktifkan oleh Administrator. Anda <strong>tetap dapat melacak hasil tindak lanjut verifikasi</strong> Anda pada tab Dashboard Publik.</p>
            </div>
          ) : schema.length === 0 ? (
            <div className="text-center p-10 border border-dashed border-white/10 rounded-2xl bg-black/30"><p className="text-gray-500 text-sm">Formulir belum memiliki kolom input.</p></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5 animate-fade-in">
              <div className="bg-primary/5 border border-primary/20 p-4 md:p-5 rounded-2xl flex items-center justify-between mb-4">
                <div>
                  <div className="text-[9px] md:text-[10px] font-bold text-primary uppercase tracking-widest mb-1">NO. REGISTRASI</div>
                  <div className="text-base md:text-lg font-mono font-black text-white tracking-wider">{registrationNo}</div>
                </div>
                <FontAwesomeIcon icon={faIdBadge} className="text-2xl md:text-3xl text-primary/50" />
              </div>

              {editingId && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-xl text-yellow-500 text-[10px] font-bold flex justify-between items-center">
                  <span>MENGEDIT DATA TERDAHULU</span>
                  <button type="button" onClick={() => { setEditingId(null); setFormData({ nomor_registrasi: registrationNo }); setRawFiles({}); }} className="underline hover:text-white">Batal</button>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {schema.map((field) => {
                  const colNameLower = field.name.toLowerCase();
                  const colLabelLower = field.label.toLowerCase();
                  const isNoField = colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor';
                  const isAdminLocked = field.adminLocked === true && !editingId;
                  const finalLockedStatus = isAdminLocked || isNoField;
                  
                  const isRegionField = colNameLower.includes('kabupaten') || colNameLower.includes('kecamatan') || colNameLower.includes('desa') || colNameLower.includes('kelurahan');
                  const isFile = field.type === 'file';
                  const isSelect = field.type === 'select' || isRegionField; 
                  const isCurrency = field.type === 'currency';

                  return (
                    <div key={field.name} className={`flex flex-col relative group ${isFile || colNameLower.includes('keterangan') || colNameLower.includes('alasan') ? 'md:col-span-2' : ''}`}>
                      <label className="text-[10px] md:text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest flex items-center justify-between">
                        <span>{field.label}</span>
                        {finalLockedStatus && <span className="text-[8px] font-black bg-white/10 text-white px-2 py-0.5 rounded-full"><FontAwesomeIcon icon={faLock} className="mr-1" /> {isNoField ? 'SISTEM' : 'OTOMATIS'}</span>}
                      </label>
                      
                      {isFile ? (
                        <div className="relative">
                          <input type="file" onChange={(e) => handleFileChange(e, field.name)} disabled={finalLockedStatus} className="hidden" id={`file-${field.name}`}/>
                          <label htmlFor={`file-${field.name}`} className={`flex items-center justify-center p-4 md:p-5 rounded-xl border border-dashed transition-all duration-300 cursor-pointer ${finalLockedStatus ? 'bg-black/20 border-white/5 text-gray-600' : 'bg-black/40 border-white/20 hover:border-primary text-gray-300 hover:bg-black/60'}`}>
                            <FontAwesomeIcon icon={faUpload} className="mr-3 text-primary text-base" />
                            <span className="font-semibold text-xs md:text-sm truncate px-2">{rawFiles[field.name]?.name || formData[field.name] || 'Pilih Berkas Lampiran...'}</span>
                          </label>
                        </div>
                      ) : isSelect ? (
                        <div className="relative">
                           <select
                              name={field.name} value={formData[field.name] || ''} onChange={(e) => handleInputChange(e, field)} disabled={finalLockedStatus}
                              className={`w-full p-3.5 md:p-4 rounded-xl border outline-none transition-all duration-300 text-xs md:text-sm appearance-none ${finalLockedStatus ? 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/60'}`}
                              required={!finalLockedStatus && !editingId}
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
                                  if (kabKey && kecKey && formData[kabKey] && formData[kecKey] && DATA_WILAYAH[formData[kabKey]] && DATA_WILAYAH[formData[kabKey]][formData[kecKey]]) {
                                    selectOptions = DATA_WILAYAH[formData[kabKey]][formData[kecKey]];
                                  }
                                }
                                return selectOptions.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>);
                              })()}
                           </select>
                           <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="relative flex items-center">
                          {isCurrency && <span className="absolute left-4 font-bold text-xs text-primary">Rp.</span>}
                          <input
                            type={isCurrency ? 'text' : field.type || 'text'}
                            name={field.name}
                            value={isNoField && !editingId ? (responses.length + 1) : (formData[field.name] || '')}
                            onChange={(e) => handleInputChange(e, field)}
                            disabled={finalLockedStatus}
                            placeholder={isCurrency ? '100.000' : `Ketik ${field.label.toLowerCase()}...`}
                            className={`w-full p-3.5 md:p-4 rounded-xl border outline-none transition-all duration-300 text-xs md:text-sm ${isCurrency ? 'pl-10 md:pl-12' : 'pl-3.5 md:pl-4'} ${finalLockedStatus ? 'bg-white/5 text-gray-400 border-white/5 cursor-not-allowed font-semibold' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/60 placeholder-gray-600'}`}
                            required={!finalLockedStatus && !editingId}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-yellow-400 text-black font-black py-4 rounded-xl shadow-lg transition-all duration-300 transform active:scale-[0.98] uppercase tracking-widest mt-6 text-xs md:text-sm">
                Kirim Formulir
              </button>
            </form>
          )
        ) : (
          <div className="space-y-3 md:space-y-4 animate-fade-in max-h-[70vh] overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
            {responses.length === 0 ? (
              <div className="text-center p-8 bg-black/40 rounded-2xl border border-white/5"><p className="text-gray-500 text-xs md:text-sm font-medium">Belum ada data masuk di dashboard ini.</p></div>
            ) : (
              responses.map((res) => (
                <div key={res.id} className="bg-black/40 border border-white/5 p-4 md:p-5 rounded-xl md:rounded-2xl flex flex-col md:flex-row md:justify-between md:items-center text-xs hover:border-white/20 transition-all duration-300 group gap-3 md:gap-4">
                  <div>
                    <div className="font-bold text-white uppercase text-xs md:text-sm mb-1">{res.data.nama || `Registrasi: ${res.data.nomor_registrasi || res.id.substring(0,6)}`}</div>
                    <div className="text-[9px] md:text-[10px] text-gray-500 font-mono">Waktu Lapor: {new Date(res.created_at).toLocaleString('id-ID')}</div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setSelectedDetail(res)} className="flex-1 md:flex-none px-3 md:px-4 py-2 md:py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-lg md:rounded-xl text-[9px] md:text-[10px] transition-all shadow-lg flex items-center justify-center">
                      <FontAwesomeIcon icon={faSearch} className="mr-2" /> Lacak Status
                    </button>

                    {res.data.delete_request_status === 'pending' ? (
                      <span className="flex-1 md:flex-none text-[8px] md:text-[9px] font-black text-yellow-500 bg-yellow-500/10 px-3 py-2 md:py-2.5 rounded-lg md:rounded-xl border border-yellow-500/20 text-center leading-tight">
                        MENUNGGU HAPUS
                      </span>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(res)} disabled={formConfig?.is_active === false} className="px-3 md:px-4 py-2 md:py-2.5 bg-white/10 text-white font-bold uppercase rounded-lg md:rounded-xl text-[9px] md:text-[10px] hover:bg-white/20 transition-colors flex-1 md:flex-none flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
                          <FontAwesomeIcon icon={faEdit} className="md:mr-2 lg:mr-2" /> <span className="md:hidden lg:inline">Edit Data</span>
                        </button>
                        <button onClick={() => handleRequestDelete(res)} title="Minta Hapus Data" className="px-3 md:px-4 py-2 md:py-2.5 bg-red-950/40 text-red-400 font-bold uppercase rounded-lg md:rounded-xl text-[9px] md:text-[10px] hover:bg-red-600 hover:text-white transition-colors flex-none">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL LACAK VERIFIKASI DILENGKAPI TOMBOL KEMBALI DI FOOTER */}
        {/* ========================================================================= */}
        {selectedDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-3 md:p-4">
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-5xl rounded-2xl md:rounded-3xl shadow-2xl relative flex flex-col h-[95vh] md:h-[90vh] animate-fade-in-up">
              
              <div className="flex-none p-4 md:p-6 border-b border-white/10 relative pr-14">
                <button onClick={() => setSelectedDetail(null)} className="absolute top-4 md:top-6 right-4 md:right-6 text-gray-400 hover:text-white z-20 bg-black/50 md:bg-transparent rounded-full p-2 md:p-0"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
                <h3 className="text-lg md:text-2xl font-black text-white uppercase tracking-wider flex items-center leading-tight"><FontAwesomeIcon icon={faSearch} className="mr-2 md:mr-3 text-primary" /> Lacak Verifikasi</h3>
                <p className="text-gray-400 text-[10px] md:text-xs mt-1">Registrasi: <span className="text-primary font-mono font-bold">{selectedDetail.data.nomor_registrasi || '-'}</span></p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 pb-6">
                  <div className="space-y-3 md:space-y-4 bg-black/30 p-4 md:p-5 rounded-xl md:rounded-2xl border border-white/5 shadow-inner">
                     <h4 className="text-xs md:text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2 flex items-center"><FontAwesomeIcon icon={faIdBadge} className="mr-2 text-primary"/> Data Pemohon</h4>
                     <div className="space-y-2 md:space-y-3">
                       {schema.filter(s => !s.adminLocked).map(col => (
                          <div key={col.name} className="flex flex-col border-b border-white/5 pb-2">
                             <span className="text-[8px] md:text-[9px] text-gray-500 uppercase font-bold tracking-widest">{col.label}</span>
                             <span className="text-xs md:text-sm text-gray-200 font-semibold mt-0.5 md:mt-1 break-words">
                               {String(selectedDetail.data[col.name] || '').startsWith('http') ? <a href={selectedDetail.data[col.name]} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center"><FontAwesomeIcon icon={faDownload} className="mr-1.5"/> Buka Berkas Upload</a> : 
                                String(selectedDetail.data[col.name] || '').includes('GAGAL') ? <span className="text-red-400 text-[10px] bg-red-400/10 px-2 py-1 rounded">GAGAL UPLOAD (TIMEOUT)</span> : (selectedDetail.data[col.name] || '-')}
                             </span>
                          </div>
                       ))}
                     </div>
                  </div>

                  <div className="space-y-3 md:space-y-4 bg-blue-900/10 p-4 md:p-5 rounded-xl md:rounded-2xl border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.05)] h-fit">
                     <h4 className="text-xs md:text-sm font-bold text-blue-400 uppercase tracking-widest border-b border-blue-500/20 pb-2 flex items-center"><FontAwesomeIcon icon={faUserShield} className="mr-2"/> Status Tindak Lanjut</h4>
                     <div className="space-y-2 md:space-y-3">
                       {schema.filter(s => s.adminLocked && s.name.toLowerCase() !== 'no' && s.name.toLowerCase() !== 'nomor').length === 0 ? (
                          <p className="text-[10px] md:text-xs text-gray-500 italic p-4 text-center">Belum ada instrumen tindak lanjut dari sistem.</p>
                       ) : (
                          schema.filter(s => s.adminLocked && s.name.toLowerCase() !== 'no' && s.name.toLowerCase() !== 'nomor').map(col => {
                             const value = String(selectedDetail.data[col.name] || '').trim();
                             return (
                               <div key={col.name} className="flex flex-col border-b border-blue-500/10 pb-2">
                                  <span className="text-[8px] md:text-[9px] text-blue-400 uppercase font-bold tracking-widest">{col.label}</span>
                                  <span className="text-xs md:text-sm text-white font-black mt-0.5 md:mt-1 break-words">
                                    {value === '' ? <span className="text-gray-500 italic text-[10px] md:text-xs font-normal">Belum Diverifikasi</span> : 
                                      value.startsWith('http') ? <a href={value} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center"><FontAwesomeIcon icon={faDownload} className="mr-1.5"/> Lihat Dokumen</a> : value}
                                  </span>
                               </div>
                             );
                          })
                       )}
                     </div>
                  </div>
                </div>
              </div>

              {/* FOOTER TOMBOL KEMBALI */}
              <div className="flex-none p-4 md:p-6 border-t border-white/10 bg-[#0f172a] rounded-b-2xl md:rounded-b-3xl flex justify-end">
                <button onClick={() => setSelectedDetail(null)} className="w-full md:w-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all">
                  <FontAwesomeIcon icon={faArrowLeft} className="mr-2"/> Tutup & Kembali
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
