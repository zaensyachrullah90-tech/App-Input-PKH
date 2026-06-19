import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faPaperPlane, faLock, faFolderOpen, faListAlt, faEdit, faUpload, faIdBadge, faChevronDown, faTrash } from '@fortawesome/free-solid-svg-icons';

const DATA_WILAYAH = {
  "TAPIN": {
    "BINUANG": ["BINUANG", "KARANGAN PUTIH", "A. YANI PURA", "PULAU PINANG", "PULAU PINANG UTARA", "TUNGKAP", "GUNUNG BATU", "PADANG SARI", "MEKAR SARI", "HAUR KUNING"],
    "BUNGUR": ["BUNGUR", "BUNGUR BARU", "BANUA PADANG", "BANUA PADANG HILIR", "KALUMPANG", "LINUH", "PURUT", "RANTAU BUJUR", "SHABAH", "HANGKUI", "TAMPINAS", "BINGKULU"],
    "BAKARANGAN": ["BAKARANGAN", "BAKARANGAN TINGGI", "BUNDUNG", "PARIGI", "GADUNG", "GADUNG KERAMAT", "TANGKUTAN", "WARINGIN", "KETAPANG"],
    "CANDI LARAS SELATAN": ["MARGUSARI", "BERINGIN", "BERINGIN A", "BUNUN RAYA", "CANDI LARAS", "BAUN BANGO", "PABAUNGAN HILIR", "PABAUNGAN HULU", "SUNGAI RUTAS"],
    "CANDI LARAS UTARA": ["MARGASARI HILIR", "MARGASARI HULU", "KELADAN", "PARIGI", "BUBUHAN JATI", "BATALAS", "RAWA MUNING", "SUNGAI SALAI", "TELUK HAWAN"],
    "HATUNGUN": ["HATUNGUN", "KAMBINCIS", "TARUNGIN", "MATANG BATAS", "ASAM RANDAH", "BATU HAPU", "BURUAN", "PANDULANGAN"],
    "LOKPAIKAT": ["LOKPAIKAT", "BITAHAN", "BITAHAN BARU", "BINDANG", "AYUNAN PANGON", "BUDI MULYA"],
    "PIANI": ["MIAWA", "BARAMBAN", "BATU AMPAR", "HARAKIT", "PIPITAK JAYA", "BALAWAIN", "BUNIIN", "KAMPUNG BARU"],
    "SALAM BABARIS": ["SALAM BABARIS", "KAMBANG KUNING", "SUKA RAMAI", "PANTAI CABE", "SUWA TANI", "SUWA LAMA"],
    "TAPIN SELATAN": ["TAMBARANGAN", "RUMINTIN", "LAWASAN", "TANDUI", "SUADENG", "HARAPAN MASA", "SAWAHAN", "TIMBAAN", "TATAKAN", "CEMPAKA", "MARGA SARI"],
    "TAPIN TENGAH": ["KEPALA BATAS", "MANDURIAN", "MANDURIAN HILIR", "SUKAMAI", "TIRIK", "BATANG LANTIK", "PANDAHAN", "SERAWI", "HULU KELANG", "SUNGAI BAHALANG"],
    "TAPIN UTARA": ["RANTAU KANAN", "RANTAU KIWA", "RANGDA MALINGKUNG", "KUPANG", "PERINTIS RAYA", "ANTASAN SENOR", "BANUA HALAT KIRI", "BANUA HALAT KANAN", "KAKARAN", "SUNGAI ULIN"]
  }
};

export default function PublicForm() {
  const { id: formId } = useParams();
  const [schema, setSchema] = useState([]);
  const [formData, setFormData] = useState({});
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('input');
  const [editingId, setEditingId] = useState(null);
  const [registrationNo, setRegistrationNo] = useState('');

  const globalFolderId = localStorage.getItem('global_drive_folder_id') || '';

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

    // KECERDASAN AUTO-FILTER WILAYAH (FUZZY LOGIC CASCADE RESET)
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
          toast.loading(`Mengunggah berkas...`, { id: toastId });
          try {
            const res = await fetch('/api/sync-google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'uploadFile', ...finalData[key], folderId: globalFolderId })
            });
            const driveData = await res.json();
            finalData[key] = driveData.link || 'Gagal Upload';
          } catch (e) { finalData[key] = 'Tersimpan Lokal'; }
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
        toast.loading('Sinkronisasi ke Cloud...', { id: toastId });
        try {
          await fetch('/api/sync-google', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'appendRow', spreadsheetId: formConfig.spreadsheet_id, schema: schema, rowData: finalData })
          });
        } catch(syncError) { console.error(syncError); }
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

  if (loading) return <div className="min-h-screen bg-[#030712] flex flex-col justify-center items-center"><FontAwesomeIcon icon={faSpinner} spin size="2xl" className="text-primary mb-4"/><p className="text-gray-500 font-bold tracking-widest text-xs uppercase">Menyiapkan Form Publik...</p></div>;
  if (formConfig?.is_active === false) return (
    <div className="min-h-screen bg-[#030712] flex justify-center items-center p-6 text-center">
      <div className="bg-[#0f172a] border border-white/5 p-8 rounded-3xl max-w-md w-full"><FontAwesomeIcon icon={faLock} className="text-5xl text-gray-600 mb-6" /><h2 className="text-xl font-black text-white mb-2 uppercase">Pengisian Ditutup</h2></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 font-sans p-3 md:p-6 flex justify-center items-start pt-4 relative overflow-hidden">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#fff', borderRadius: '16px', border: '1px solid #374151' } }} />
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-[#0f172a]/70 backdrop-blur-3xl border border-white/10 p-5 md:p-10 rounded-[2rem] shadow-2xl relative z-10 animate-fade-in-up">
        
        <div className="flex flex-col mb-8 border-b border-white/5 pb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center"><FontAwesomeIcon icon={faFolderOpen} className="mr-3 text-primary" /> {formConfig?.title}</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">{formConfig?.description}</p>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-8">
          <button onClick={() => setActiveTab('input')} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'input' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}><FontAwesomeIcon icon={faPaperPlane} className="mr-2" /> Isi Formulir</button>
          <button onClick={() => setActiveTab('results')} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'results' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}><FontAwesomeIcon icon={faListAlt} className="mr-2" /> Data Masuk</button>
        </div>

        {activeTab === 'input' ? (
          schema.length === 0 ? (
            <div className="text-center p-10 border border-dashed border-white/10 rounded-2xl bg-black/30"><p className="text-gray-500 font-medium">Formulir belum memiliki kolom input.</p></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
              <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl flex items-center justify-between mb-4">
                <div>
                  <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">NO. REGISTRASI</div>
                  <div className="text-lg font-mono font-black text-white tracking-wider">{registrationNo}</div>
                </div>
                <FontAwesomeIcon icon={faIdBadge} className="text-3xl text-primary/50" />
              </div>

              {editingId && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl text-yellow-500 text-xs font-bold flex justify-between items-center">
                  <span>MENGEDIT DATA TERDAHULU</span>
                  <button type="button" onClick={() => { setEditingId(null); setFormData({ nomor_registrasi: registrationNo }); }} className="underline hover:text-white">Batal</button>
                </div>
              )}
              
              <div className="space-y-5">
                {schema.map((field) => {
                  const colNameLower = field.name.toLowerCase();
                  const colLabelLower = field.label.toLowerCase();
                  const isNoField = colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor';
                  const isAdminLocked = field.adminLocked === true && !editingId;
                  const finalLockedStatus = isAdminLocked || isNoField;
                  const isFile = field.type === 'file';
                  const isSelect = field.type === 'select';
                  const isCurrency = field.type === 'currency';

                  return (
                    <div key={field.name} className="flex flex-col relative group">
                      <label className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-widest flex items-center justify-between">
                        <span>{field.label}</span>
                        {finalLockedStatus && <span className="text-[9px] font-black bg-white/10 text-white px-2 py-0.5 rounded-full"><FontAwesomeIcon icon={faLock} className="mr-1" /> {isNoField ? 'SISTEM' : 'OTOMATIS'}</span>}
                      </label>
                      
                      {isFile ? (
                        <div className="relative">
                          <input type="file" onChange={(e) => handleFileChange(e, field.name)} disabled={finalLockedStatus} className="hidden" id={`file-${field.name}`}/>
                          <label htmlFor={`file-${field.name}`} className={`flex items-center justify-center p-5 rounded-2xl border border-dashed transition-all duration-300 cursor-pointer ${finalLockedStatus ? 'bg-black/20 border-white/5 text-gray-600' : 'bg-black/40 border-white/20 hover:border-primary text-gray-300 hover:bg-black/60'}`}>
                            <FontAwesomeIcon icon={faUpload} className="mr-3 text-primary text-lg" />
                            <span className="font-semibold text-sm truncate">{formData[field.name]?.fileName || formData[field.name] || 'Pilih Lampiran Berkas...'}</span>
                          </label>
                        </div>
                      ) : isSelect ? (
                        <div className="relative">
                           <select
                              name={field.name} value={formData[field.name] || ''} onChange={(e) => handleInputChange(e, field)} disabled={finalLockedStatus}
                              className={`w-full p-4 rounded-2xl border outline-none transition-all duration-300 text-sm appearance-none ${finalLockedStatus ? 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/60'}`}
                              required={!finalLockedStatus && !editingId}
                           >
                              <option value="" disabled className="bg-gray-900">-- Pilih {field.label} --</option>
                              {(() => {
                                // MENGGUNAKAN FUZZY LOGIC UNTUK CASCADE DROPDOWN
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
                           <FontAwesomeIcon icon={faChevronDown} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="relative flex items-center">
                          {isCurrency && <span className="absolute left-4 font-bold text-sm text-primary">Rp.</span>}
                          <input
                            type={isCurrency ? 'text' : field.type || 'text'}
                            name={field.name}
                            value={isNoField && !editingId ? (responses.length + 1) : (formData[field.name] || '')}
                            onChange={(e) => handleInputChange(e, field)}
                            disabled={finalLockedStatus}
                            placeholder={isCurrency ? '100.000' : `Ketik ${field.label.toLowerCase()}...`}
                            className={`w-full p-4 rounded-2xl border outline-none transition-all duration-300 text-sm ${isCurrency ? 'pl-12' : 'pl-4'} ${finalLockedStatus ? 'bg-white/5 text-gray-400 border-white/5 cursor-not-allowed font-semibold' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/60 placeholder-gray-600'}`}
                            required={!finalLockedStatus && !editingId}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="submit" disabled={formConfig?.is_active === false} className="w-full bg-primary hover:bg-yellow-400 text-black font-black py-4 md:py-5 rounded-2xl shadow-[0_10px_30px_rgba(234,179,8,0.2)] hover:shadow-[0_10px_40px_rgba(234,179,8,0.4)] transition-all duration-300 transform active:scale-[0.98] uppercase tracking-widest mt-8 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {editingId ? 'Simpan Pembaruan Data' : 'Submit Tanggapan'}
              </button>
            </form>
          )
        ) : (
          <div className="space-y-3 animate-fade-in">
            {responses.length === 0 ? (
              <div className="text-center p-10 bg-black/40 rounded-3xl border border-white/5"><p className="text-gray-500 text-sm font-medium">Belum ada tanggapan arsip.</p></div>
            ) : (
              responses.map((res) => (
                <div key={res.id} className="bg-black/40 border border-white/5 p-4 rounded-xl flex justify-between items-center text-xs hover:border-white/20 transition-all duration-300 group">
                  <div>
                    <div className="font-bold text-gray-200 uppercase">{res.data.nama || `Registrasi: ${res.data.nomor_registrasi || res.id.substring(0,6)}`}</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-1">{new Date(res.created_at).toLocaleString('id-ID')}</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {res.data.delete_request_status === 'pending' ? (
                      <span className="text-[8px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1.5 rounded border border-yellow-500/20 text-center leading-tight max-w-[80px]">
                        MENUNGGU ACC ADMIN
                      </span>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(res)} className="px-3 py-2 bg-white text-black font-bold uppercase rounded-lg text-[10px] hover:bg-gray-200 transition-colors">
                          <FontAwesomeIcon icon={faEdit} className="mr-1" /> Edit
                        </button>
                        <button onClick={() => handleRequestDelete(res)} title="Minta Hapus" className="px-3 py-2 bg-red-950/40 text-red-400 font-bold uppercase rounded-lg text-[10px] hover:bg-red-600 hover:text-white transition-colors">
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
      </div>
    </div>
  );
}
