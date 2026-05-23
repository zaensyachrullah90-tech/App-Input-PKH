import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import toast, { Toaster } from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faPaperPlane, faCheckCircle, faLock, faFolderOpen, faListAlt, faEdit, faUpload, faIdBadge, faChevronDown } from '@fortawesome/free-solid-svg-icons';

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

  useEffect(() => {
    fetchFormSetup();
    fetchResponses();
  }, [formId]);

  const fetchFormSetup = async () => {
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
        if (field.defaultValue) initialData[field.name] = field.defaultValue;
      });
      setFormData(prev => ({ ...initialData, ...prev }));

    } catch (err) {
      toast.error('Formulir tidak valid atau sudah dihapus.');
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async () => {
    const { data } = await supabase.from('form_responses').select('*').eq('form_id', formId).order('created_at', { ascending: false });
    if (data) setResponses(data);
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

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formConfig?.is_active === false) return toast.error('Penerimaan ditutup.');
    
    const toastId = toast.loading('Memproses enkripsi data...');
    let finalData = { ...formData, nomor_registrasi: registrationNo };

    // ==========================================
    // AUTO-NUMBER INJECTION SEBELUM DISIMPAN
    // ==========================================
    schema.forEach(col => {
      const colNameLower = col.name.toLowerCase();
      const colLabelLower = col.label.toLowerCase();
      if (colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor') {
        finalData[col.name] = editingId ? formData[col.name] : (responses.length + 1);
      }
    });

    try {
      // PROSES UPLOAD GOOGLE DRIVE
      for (const key in finalData) {
        if (finalData[key]?.isFile) {
          toast.loading(`Mengunggah berkas ${finalData[key].fileName}...`, { id: toastId });
          try {
            const res = await fetch('/api/sync-google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'uploadFile', ...finalData[key] })
            });
            const driveData = await res.json();
            finalData[key] = driveData.link || 'Gagal unggah';
          } catch (e) { finalData[key] = 'Tersimpan Lokal'; }
        }
      }

      toast.loading('Menyimpan ke Pusat Data...', { id: toastId });

      // SIMPAN DATABASE
      if (editingId) {
        await supabase.from('form_responses').update({ data: finalData }).eq('id', editingId);
      } else {
        await supabase.from('form_responses').insert([{ form_id: formId, data: finalData, kabupaten: finalData.provinsi || 'Publik' }]);
      }

      // SPREADSHEET SYNC
      if (formConfig?.spreadsheet_id && !editingId) {
        fetch('/api/sync-google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'appendRow', spreadsheetId: formConfig.spreadsheet_id, schema: schema, rowData: finalData })
        }).catch(()=>{});
      }

      toast.success(editingId ? 'Pembaruan Berhasil!' : 'Data Dikirim!', { id: toastId });
      setEditingId(null);
      
      const newAutoNum = `REG-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
      setRegistrationNo(newAutoNum);
      const resetData = { nomor_registrasi: newAutoNum };
      schema.forEach(field => { if (field.defaultValue) resetData[field.name] = field.defaultValue; });
      setFormData(resetData);
      
      fetchResponses();
      setActiveTab('results');
    } catch (err) {
      toast.error('Gagal mengirimkan formulir.', { id: toastId });
    }
  };

  const handleEdit = (responseItem) => {
    setRegistrationNo(responseItem.data.nomor_registrasi || `EDIT-${responseItem.id.substring(0,4)}`);
    setFormData(responseItem.data);
    setEditingId(responseItem.id);
    setActiveTab('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#030712] flex flex-col justify-center items-center">
      <FontAwesomeIcon icon={faSpinner} spin size="2xl" className="text-primary mb-4" />
      <p className="text-gray-500 font-bold tracking-widest text-xs uppercase">Menyiapkan Form Publik...</p>
    </div>
  );

  if (formConfig?.is_active === false) return (
    <div className="min-h-screen bg-[#030712] flex justify-center items-center p-6 text-center">
      <div className="bg-[#0f172a] border border-white/5 p-8 rounded-3xl max-w-md w-full">
        <FontAwesomeIcon icon={faLock} className="text-5xl text-gray-600 mb-6" />
        <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Pengisian Ditutup</h2>
        <p className="text-gray-500 text-sm">Administrator telah menghentikan penerimaan tanggapan untuk sesi ini.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 font-sans p-3 md:p-8 flex justify-center items-start pt-6 md:pt-12 relative overflow-hidden">
      <Toaster position="top-center" toastOptions={{ style: { background: '#111827', color: '#fff', borderRadius: '16px', border: '1px solid #374151' } }} />
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-yellow-600/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-[#0f172a]/60 backdrop-blur-3xl border border-white/10 p-5 md:p-10 rounded-[2rem] shadow-2xl relative z-10 animate-fade-in-up">
        
        <div className="flex flex-col mb-8 border-b border-white/5 pb-6">
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight flex items-center">
             <FontAwesomeIcon icon={faFolderOpen} className="mr-3 text-primary" />
             {formConfig?.title}
          </h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">{formConfig?.description}</p>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-8">
          <button onClick={() => setActiveTab('input')} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'input' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}>
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2" /> Isi Formulir
          </button>
          <button onClick={() => setActiveTab('results')} className={`flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${activeTab === 'results' ? 'bg-primary text-black shadow-[0_4px_20px_rgba(234,179,8,0.3)]' : 'text-gray-500 hover:text-white'}`}>
            <FontAwesomeIcon icon={faListAlt} className="mr-2" /> Data Masuk
          </button>
        </div>

        {activeTab === 'input' ? (
          schema.length === 0 ? (
            <div className="text-center p-10 border border-dashed border-white/10 rounded-2xl bg-black/30">
              <p className="text-gray-500 font-medium">Formulir belum memiliki kolom input. Hubungi Administrator.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
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
                  
                  // DETEKSI AUTO NUMBER
                  const isNoColumn = colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor';

                  const isAdminLocked = field.adminLocked === true && !editingId;
                  const finalLockedStatus = isAdminLocked || isNoColumn;

                  const isFile = field.type === 'file';
                  const isSelect = field.type === 'select';

                  return (
                    <div key={field.name} className="flex flex-col relative group">
                      <label className="text-[11px] font-bold text-gray-400 mb-2 uppercase tracking-widest flex items-center justify-between">
                        <span>{field.label}</span>
                        {finalLockedStatus && (
                          <span className="text-[9px] font-black bg-white/10 text-white px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                            <FontAwesomeIcon icon={faLock} className="mr-1" /> {isNoColumn ? 'SISTEM' : 'OTOMATIS'}
                          </span>
                        )}
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
                              name={field.name} value={formData[field.name] || ''} onChange={handleChange} disabled={finalLockedStatus}
                              className={`w-full p-4 rounded-2xl border outline-none transition-all duration-300 text-sm appearance-none ${finalLockedStatus ? 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/60'}`}
                              required={!finalLockedStatus && !editingId}
                           >
                              <option value="" disabled className="bg-gray-900">-- Pilih {field.label} --</option>
                              {field.options?.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
                           </select>
                           <FontAwesomeIcon icon={faChevronDown} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                        </div>
                      ) : (
                        <input
                          type={field.type || 'text'} name={field.name} 
                          // Inject nilai otomatis jika ini kolom "NO"
                          value={isNoColumn && !editingId ? (responses.length + 1) : (formData[field.name] || '')} 
                          onChange={handleChange} disabled={finalLockedStatus}
                          placeholder={`Ketik ${field.label.toLowerCase()}...`}
                          className={`w-full p-4 rounded-2xl border outline-none transition-all duration-300 text-sm ${finalLockedStatus ? 'bg-white/5 text-gray-400 border-white/5 cursor-not-allowed font-semibold' : 'bg-black/40 text-white border-white/10 focus:border-primary focus:bg-black/60 placeholder-gray-600'}`}
                          required={!finalLockedStatus && !editingId}
                        />
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
          <div className="animate-fade-in space-y-4">
            {responses.length === 0 ? (
              <div className="text-center p-10 bg-black/40 rounded-3xl border border-white/5">
                <p className="text-gray-500 text-sm font-medium">Belum ada tanggapan arsip.</p>
              </div>
            ) : (
              responses.map((res) => (
                <div key={res.id} className="bg-black/40 border border-white/5 p-5 rounded-2xl hover:border-white/20 transition-all duration-300 group">
                  <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                    <span className="text-[10px] text-primary font-mono tracking-widest font-bold">
                      {res.data.nomor_registrasi || `ID: ${res.id.substring(0,8)}`}
                    </span>
                    <div className="flex items-center space-x-3">
                       <span className="text-[10px] text-gray-500 hidden md:block">{new Date(res.created_at).toLocaleString('id-ID')}</span>
                       <button onClick={() => handleEdit(res)} className="text-[10px] font-black text-black bg-white hover:bg-primary px-3 py-1.5 rounded-lg transition-colors uppercase">
                         <FontAwesomeIcon icon={faEdit} className="mr-1" /> Edit
                       </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-xs">
                    {schema.slice(0, 4).map(field => (
                      <div key={field.name}>
                        <div className="text-gray-500 text-[9px] uppercase font-bold tracking-wider mb-1">{field.label}</div>
                        <div className="text-gray-200 font-medium truncate max-w-[120px] md:max-w-xs">
                          {String(res.data[field.name]).startsWith('http') ? (
                            <a href={res.data[field.name]} target="_blank" rel="noreferrer" className="text-primary hover:underline">Lihat Lampiran</a>
                          ) : (
                            res.data[field.name] || '-'
                          )}
                        </div>
                      </div>
                    ))}
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
