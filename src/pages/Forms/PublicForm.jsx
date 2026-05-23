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

  const globalFolderId = localStorage.getItem('global_drive_folder_id') || '';

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
        if (field.defaultValue) initialData[field.name] = field.defaultValue.toUpperCase();
      });
      setFormData(prev => ({ ...initialData, ...prev }));
    } catch (err) { toast.error('Formulir tidak valid.'); }
    finally { setLoading(false); }
  };

  const fetchResponses = async () => {
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
    setFormData({ ...formData, [field.name]: value });
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
    
    const toastId = toast.loading('Memproses data...');
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

      toast.loading('Menyimpan...', { id: toastId });

      if (editingId) {
        await supabase.from('form_responses').update({ data: finalData }).eq('id', editingId);
      } else {
        await supabase.from('form_responses').insert([{ form_id: formId, data: finalData, kabupaten: 'Publik' }]);
      }

      if (formConfig?.spreadsheet_id && !editingId) {
        fetch('/api/sync-google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'appendRow', spreadsheetId: formConfig.spreadsheet_id, schema: schema, rowData: finalData })
        }).catch(()=>{});
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

  if (loading) return <div className="min-h-screen bg-[#030712] flex justify-center items-center"><FontAwesomeIcon icon={faSpinner} spin size="2xl" className="text-primary"/></div>;
  if (formConfig?.is_active === false) return (
    <div className="min-h-screen bg-[#030712] flex justify-center items-center p-6 text-center">
      <div className="bg-[#0f172a] border border-white/5 p-8 rounded-3xl max-w-md w-full"><FontAwesomeIcon icon={faLock} className="text-5xl text-gray-600 mb-6" /><h2 className="text-xl font-black text-white mb-2 uppercase">Pengisian Ditutup</h2></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 font-sans p-3 md:p-6 flex justify-center items-start pt-4 relative overflow-hidden">
      <Toaster position="top-center" />
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-[#0f172a]/70 backdrop-blur-3xl border border-white/10 p-4 md:p-10 rounded-3xl shadow-2xl relative z-10">
        <div className="flex flex-col mb-6 border-b border-white/5 pb-4">
          <h1 className="text-xl md:text-2xl font-black text-white uppercase flex items-center"><FontAwesomeIcon icon={faFolderOpen} className="mr-3 text-primary" /> {formConfig?.title}</h1>
          <p className="text-gray-400 mt-1 text-xs leading-relaxed">{formConfig?.description}</p>
        </div>

        <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-6">
          <button onClick={() => setActiveTab('input')} className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-widest ${activeTab === 'input' ? 'bg-primary text-black' : 'text-gray-500'}`}>Formulir</button>
          <button onClick={() => setActiveTab('results')} className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase tracking-widest ${activeTab === 'results' ? 'bg-primary text-black' : 'text-gray-500'}`}>Data Masuk</button>
        </div>

        {activeTab === 'input' ? (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
            {editingId && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-2xl text-yellow-500 text-xs font-bold flex justify-between items-center">
                <span>MENGEDIT DATA TERDAHULU</span>
                <button type="button" onClick={() => { setEditingId(null); setFormData({ nomor_registrasi: registrationNo }); }} className="underline hover:text-white">Batal</button>
              </div>
            )}
            {schema.map((field) => {
              const isNoField = field.name.toLowerCase() === 'no' || field.name.toLowerCase() === 'nomor';
              const isAdminLocked = field.adminLocked === true && !editingId;
              const isLockedState = isAdminLocked || isNoField;
              const isFile = field.type === 'file';
              const isSelect = field.type === 'select';
              const isCurrency = field.type === 'currency';

              return (
                <div key={field.name} className="flex flex-col relative group">
                  <label className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest flex items-center justify-between">
                    <span>{field.label}</span>
                    {isLockedState && <span className="text-[8px] font-black bg-white/10 text-white px-2 py-0.5 rounded-full"><FontAwesomeIcon icon={faLock} /> KUNCI</span>}
                  </label>

                  {isFile ? (
                    <div className="relative">
                      <input type="file" onChange={(e) => handleFileChange(e, field.name)} disabled={isLockedState} className="hidden" id={`file-${field.name}`}/>
                      <label htmlFor={`file-${field.name}`} className="flex items-center justify-center p-4 rounded-xl border border-dashed bg-black/40 border-white/10 text-gray-300 font-semibold text-xs cursor-pointer">
                        <FontAwesomeIcon icon={faUpload} className="mr-2 text-primary" /> {formData[field.name]?.fileName || 'Pilih Lampiran Berkas...'}
                      </label>
                    </div>
                  ) : isSelect ? (
                    <div className="relative">
                      <select name={field.name} value={formData[field.name] || ''} onChange={(e) => handleInputChange(e, field)} disabled={isLockedState} className="w-full p-3.5 rounded-xl border bg-black/40 text-white border-white/10 focus:border-primary text-sm appearance-none">
                        <option value="" disabled>-- Pilih {field.label} --</option>
                        {field.options?.map(opt => <option key={opt} value={opt} className="bg-gray-900">{opt}</option>)}
                      </select>
                      <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      {isCurrency && <span className="absolute left-4 font-bold text-sm text-primary">Rp.</span>}
                      <input
                        type={isCurrency ? 'text' : field.type || 'text'}
                        name={field.name}
                        value={isNoField && !editingId ? (responses.length + 1) : (formData[field.name] || '')}
                        onChange={(e) => handleInputChange(e, field)}
                        disabled={isLockedState}
                        placeholder={isCurrency ? '100.000' : `Ketik ${field.label.toLowerCase()}...`}
                        className={`w-full p-3.5 rounded-xl border outline-none text-sm transition-all ${isCurrency ? 'pl-12' : 'pl-4'} ${isLockedState ? 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed' : 'bg-black/40 text-white border-white/10 focus:border-primary'}`}
                        required={!isLockedState}
                      />
                    </div>
                  )}
                </div>
              );
            })}
            <button type="submit" className="w-full bg-primary text-black font-black py-4 rounded-xl shadow-xl uppercase tracking-widest text-xs mt-4">Kirim Tanggapan</button>
          </form>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {responses.map((res) => (
              <div key={res.id} className="bg-black/40 border border-white/5 p-4 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-gray-200 uppercase">{res.data.nama || `Registrasi: ${res.data.nomor_registrasi || res.id.substring(0,6)}`}</div>
                  <div className="text-[10px] text-gray-500 font-mono mt-1">{new Date(res.created_at).toLocaleString('id-ID')}</div>
                </div>
                <button onClick={() => { setFormData(res.data); setEditingId(res.id); setActiveTab('input'); }} className="px-3 py-1.5 bg-white text-black font-bold uppercase rounded text-[10px]"><FontAwesomeIcon icon={faEdit} /> Edit</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
