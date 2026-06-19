import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faPaperPlane, faLock, faFolderOpen, faListAlt, faEdit, faUpload, faIdBadge, faChevronDown, faTrash, faSearch, faTimes, faUserShield } from '@fortawesome/free-solid-svg-icons';

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
  const globalFolderId = localStorage.getItem('global_drive_folder_id') || '1mazHH_M_cCg6Dbx2uUOdBw1NWGQ16nop';

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'results') setActiveTab('results');
  }, [location.search]);

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
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, [fieldName]: { isFile: true, fileName: file.name, mimeType: file.type, base64Data: reader.result.split(',')[1] } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formConfig?.is_active === false) return toast.error('Penerimaan ditutup.');
    if (!formId) return toast.error('Form ID tidak terdeteksi.');
    
    const toastId = toast.loading('Memproses enkripsi data...');
    let finalData = { ...formData, nomor_registrasi: registrationNo };

    schema.forEach(col => {
      if (col.name.toLowerCase() === 'no' || col.name.toLowerCase() === 'nomor') {
        finalData[col.name] = editingId ? formData[col.name] : (responses.length + 1);
      }
    });

    try {
      for (const key in finalData) {
        if (finalData[key]?.isFile) {
          toast.loading(`Mengunggah berkas ${key}...`, { id: toastId });
          try {
            const res = await fetch('/api/sync-google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'uploadFile', ...finalData[key], folderId: globalFolderId })
            });
            const driveData = await res.json();
            if(!res.ok) throw new Error(driveData.error);
            finalData[key] = driveData.link || 'Gagal Upload';
          } catch (e) { 
            console.error("Upload Error:", e);
            toast.error(`Berkas ${key} gagal diunggah ke Google Drive. Disimpan Lokal.`, { id: toastId, duration: 4000 });
            finalData[key] = 'Gagal (Lokal)'; 
          }
        }
      }

      toast.loading('Menyimpan ke Pusat Database...', { id: toastId });

      if (editingId) {
        await supabase.from('form_responses').update({ data: finalData }).eq('id', editingId);
      } else {
        const kabKey = Object.keys(finalData).find(k => k.toLowerCase().includes('kabupaten'));
        const kabupatenVal = kabKey ? finalData[kabKey] : 'Publik';
        await supabase.from('form_responses').insert([{ form_id: formId, data: finalData, kabupaten: kabupatenVal }]);
      }

      if (formConfig?.spreadsheet_id && !editingId) {
        toast.loading('Sinkronisasi ke Spreadsheet Cloud...', { id: toastId });
        try {
          const syncRes = await fetch('/api/sync-google', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'appendRow', spreadsheetId: formConfig.spreadsheet_id, schema: schema, rowData: finalData })
          });
          if(!syncRes.ok) throw new Error("Gagal kirim ke sheet");
        } catch(syncError) { 
          console.error(syncError); 
        }
      }

      toast.success('Perekaman Berhasil Terkirim!', { id: toastId });
      
      const newAutoNum = `REG-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
      setRegistrationNo(newAutoNum);
      const resetData = { nomor_registrasi: newAutoNum };
      schema.forEach(field => { if (field.defaultValue) resetData[field.name] = field.defaultValue.toUpperCase(); });
      
      setFormData(resetData);
      setEditingId(null);
      fetchResponses();
      setActiveTab('results'); 
    } catch (err) { toast.error('Gagal mengirim tanggapan.', { id: toastId }); }
  };

  const handleEdit = (responseItem) => {
    setRegistrationNo(responseItem.data.nomor_registrasi || `EDIT-${responseItem.id.substring(0,4)}`);
    setFormData(responseItem.data);
    setEditingId(responseItem.id);
    setActiveTab('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestDelete = async (responseItem) => {
    if (!window.confirm('Ajukan permohonan penghapusan data ini kepada Administrator?')) return;
    const toastId = toast.loading('Mengirim permohonan ke Pusat...');
    try {
      const updatedData = { ...responseItem.data, delete_request_status: 'pending' };
      await supabase.from('form_responses').update({ data: updatedData }).eq('id', responseItem.id);
      toast.success('Permohonan penghapusan terkirim! Menunggu konfirmasi Admin.', { id: toastId });
      fetchResponses();
    } catch (err) {
      toast.error('Gagal mengajukan permohonan.', { id: toastId });
    }
  };

  if (loading) return <div className="min-h-screen bg-[#030712] flex flex-col justify-center items-center"><FontAwesomeIcon icon={faSpinner} spin size="2xl" className="text-primary mb-4"/><p className="text-gray-500 font-bold tracking-widest text-xs uppercase">Menyiapkan Sistem Publik...</p></div>;
  if (formConfig?.is_active === false) return (
    <div className="min-h-screen bg-[#030712] flex justify-center items-center p-4 text-center">
      <div className="bg-[#0f172a] border border-white/5 p-6 md:p-8 rounded-3xl max-w-md w-full"><FontAwesomeIcon icon={faLock} className="text-4xl text-gray-600 mb-6" /><h2 className="text-lg font-black text-white mb-2 uppercase">Akses Ditutup Sementara</h2></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 font-sans p-2 sm:p-4 md:p-6 flex justify-center items-start pt-4 md:pt-10 relative overflow-hidden">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#fff', borderRadius: '16px', border: '1px solid #374151' } }} />
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      {/* DISERAHKAN: STRUKTUR DINDING CONTAINER MAX-W-6XL YANG SANGAT LUAS DI KOMPUTER */}
      <div className="w-full max-w-6xl bg-[#0f172a]/70 backdrop-blur-3xl border border-white/10 p-4 sm:p-6 md:p-10 rounded-2xl md:rounded-[2rem] shadow-2xl relative z-10 animate-fade-in-up">
        
        <div className="flex flex-col mb-6 md:mb-8 border-b border-white/5 pb-4 md:pb-6">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center leading-tight"><FontAwesomeIcon icon={faFolderOpen} className="mr-3 text-primary" /> {formConfig?.title}</h1>
          <p className="text-gray-400 mt-2 text-xs md:text-sm leading-relaxed">{formConfig?.description}</p>
        </div>

        <div className="flex flex-col sm:flex-row bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-6 md:mb-8 gap-2">
          <button onClick={() => setActiveTab('input')} className={`flex-1 py-3 md:py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'input' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}>
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" /> Isi Formulir
          </button>
          <button onClick={() => setActiveTab('results')} className={`flex-1 py-3 md:py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'results' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}>
            <FontAwesomeIcon icon={faListAlt} className="mr-2" /> Dashboard Publik
          </button>
        </div>

        {activeTab === 'input' ? (
          schema.length === 0 ? (
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
                  <button type="button" onClick={() => { setEditingId(null); setFormData({ nomor_registrasi: registrationNo }); }} className="underline hover:text-white">Batal</button>
                </div>
              )}
              
              {/* SISTEM PEMBELAHAN GRID: 2 KOLOM DI DESKTOP, KEMBALI 1 KOLOM DI MOBILE */}
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
                            <span className="font-semibold text-xs md:text-sm truncate px-2">{formData[field.name]?.fileName || formData[field.name] || 'Pilih Lampiran Berkas...'}</span>
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
                                
                                if (colNameLower.includes('kabupaten')) {
                                  selectOptions = Object.keys(DATA_WILAYAH);
                                } else if (colNameLower.includes('kecamatan')) {
                                  const kabKey = Object.keys(formData).find(k => k.toLowerCase().includes('kabupaten'));
                                  const kabVal = kabKey ? formData[kabKey] : null;
                                  if (kabVal && DATA_WILAYAH[kabVal]) {
                                    selectOptions = Object.keys(DATA_WILAYAH[kabVal]);
                                  }
                                } else if (colNameLower.includes('desa') || colNameLower.includes('kelurahan')) {
                                  const kabKey = Object.keys(formData).find(k => k.toLowerCase().includes('kabupaten'));
                                  const kecKey = Object.keys(formData).find(k => k.toLowerCase().includes('kecamatan'));
                                  const kabVal = kabKey ? formData[kabKey] : null;
                                  const kecVal = kecKey ? formData[kecKey] : null;
                                  if (kabVal && kecVal && DATA_WILAYAH[kabVal] && DATA_WILAYAH[kabVal][kecVal]) {
                                    selectOptions = DATA_WILAYAH[kabVal][kecVal];
                                  }
                                }

                                return selectOptions.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>);
                              })()}
                           </select>
                           <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
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
                            className={`w-full p-3.5 md:p-4 rounded-xl border outline-none transition-all duration-300 text-xs md:text-sm ${isCurrency ? 'pl-10' : 'pl-4'} ${finalLockedStatus ? 'bg-white/5 text-gray-400 border-white/5 cursor-not-allowed font-semibold' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/60 placeholder-gray-600'}`}
                            required={!finalLockedStatus && !editingId}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="submit" disabled={formConfig?.is_active === false} className="w-full bg-primary hover:bg-yellow-400 text-black font-black py-4 rounded-xl shadow-lg transition-all duration-300 uppercase tracking-widest mt-6 text-xs md:text-sm">
                {editingId ? 'Simpan Pembaruan Data' : 'Submit Tanggapan'}
              </button>
            </form>
          )
        ) : (
          <div className="space-y-3 md:space-y-4 animate-fade-in max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
            {responses.length === 0 ? (
              <div className="text-center p-8 bg-black/40 rounded-2xl border border-white/5"><p className="text-gray-500 text-xs font-medium">Belum ada data masuk di dashboard ini.</p></div>
            ) : (
              responses.map((res) => (
                <div key={res.id} className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col md:flex-row md:justify-between md:items-center text-xs hover:border-white/20 transition-all duration-300 group gap-3">
                  <div>
                    <div className="font-bold text-white uppercase text-xs sm:text-sm mb-1">{res.data.nama || `Registrasi: ${res.data.nomor_registrasi || res.id.substring(0,6)}`}</div>
                    <div className="text-[9px] text-gray-500 font-mono">Waktu Lapor: {new Date(res.created_at).toLocaleString('id-ID')}</div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <button onClick={() => setSelectedDetail(res)} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-wider rounded-lg text-[9px] transition-all shadow-lg flex items-center justify-center flex-1 md:flex-none">
                      <FontAwesomeIcon icon={faSearch} className="mr-2" /> Lacak Status
                    </button>

                    {res.data.delete_request_status === 'pending' ? (
                      <span className="text-[8px] font-black text-yellow-500 bg-yellow-500/10 px-3 py-2 rounded-lg border border-yellow-500/20 text-center flex-1 md:flex-none">
                        MENUNGGU HAPUS
                      </span>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(res)} className="px-3 py-2 bg-white/10 text-white font-bold uppercase rounded-lg text-[9px] hover:bg-white/20 transition-colors flex-1 md:flex-none">
                          <FontAwesomeIcon icon={faEdit} className="mr-2" /> Edit
                        </button>
                        <button onClick={() => handleRequestDelete(res)} className="px-3 py-2 bg-red-950/40 text-red-400 font-bold uppercase rounded-lg text-[9px] hover:bg-red-600 hover:text-white transition-colors flex-1 md:flex-none">
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

        {/* MODAL DETAIL DATA */}
        {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-3 overflow-hidden">
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-4xl p-4 md:p-8 rounded-2xl shadow-2xl relative my-auto animate-fade-in-up flex flex-col max-h-[90vh]">
              <button onClick={() => setSelectedDetail(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 bg-black/50 rounded-full p-2"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
              
              <div className="border-b border-white/10 pb-3 mb-4">
                <h3 className="text-base md:text-xl font-black text-white uppercase tracking-wider flex items-center"><FontAwesomeIcon icon={faSearch} className="mr-2 text-primary" /> Lacak Verifikasi</h3>
                <p className="text-gray-400 text-[10px] mt-1">Registrasi: <span className="text-primary font-mono font-bold">{selectedDetail.data.nomor_registrasi || '-'}</span></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1 custom-scrollbar pb-4">
                <div className="space-y-3 bg-black/30 p-4 rounded-xl border border-white/5 h-fit shadow-inner">
                   <h4 className="text-xs font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2 flex items-center"><FontAwesomeIcon icon={faIdBadge} className="mr-2 text-primary"/> Data Masuk</h4>
                   <div className="space-y-2">
                     {schema.filter(s => !s.adminLocked).map(col => (
                        <div key={col.name} className="flex flex-col border-b border-white/5 pb-1.5">
                           <span className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">{col.label}</span>
                           <span className="text-xs text-gray-200 font-semibold mt-0.5 break-words">
                             {String(selectedDetail.data[col.name] || '-').startsWith('http') ? <a href={selectedDetail.data[col.name]} target="_blank" rel="noreferrer" className="text-primary hover:underline"><FontAwesomeIcon icon={faUpload} className="mr-1"/> Unduh Berkas</a> : (selectedDetail.data[col.name] || '-')}
                           </span>
                        </div>
                     ))}
                   </div>
                </div>

                <div className="space-y-3 bg-blue-900/10 p-4 rounded-xl border border-blue-500/20 h-fit">
                   <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-blue-500/20 pb-2 flex items-center"><FontAwesomeIcon icon={faUserShield} className="mr-2"/> Tindak Lanjut</h4>
                   <div className="space-y-2">
                     {schema.filter(s => s.adminLocked && s.name.toLowerCase() !== 'no' && s.name.toLowerCase() !== 'nomor').length === 0 ? (
                        <p className="text-[10px] text-gray-500 italic p-4 text-center">Belum ada instrumen tindak lanjut.</p>
                     ) : (
                        schema.filter(s => s.adminLocked && s.name.toLowerCase() !== 'no' && s.name.toLowerCase() !== 'nomor').map(col => {
                           const value = String(selectedDetail.data[col.name] || '').trim();
                           return (
                             <div key={col.name} className="flex flex-col border-b border-blue-500/10 pb-1.5">
                                <span className="text-[8px] text-blue-400 uppercase font-bold tracking-widest">{col.label}</span>
                                <span className="text-xs text-white font-black mt-0.5 break-words">
                                  {value === '' ? <span className="text-gray-500 italic text-[10px] font-normal">Belum Diverifikasi</span> : 
                                    value.startsWith('http') ? <a href={value} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline"><FontAwesomeIcon icon={faUpload} className="mr-1"/> Lihat Dokumen</a> : value}
                                </span>
                             </div>
                           );
                        })
                     )}
                   </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
