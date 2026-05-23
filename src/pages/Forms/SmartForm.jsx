import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUpload } from '@fortawesome/free-solid-svg-icons';

export default function SmartForm({ userProfile }) {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  
  const [schema, setSchema] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState(null);

  useEffect(() => { fetchFormSetup(); }, [formId]);

  const fetchFormSetup = async () => {
    const { data: form } = await supabase.from('forms').select('*').eq('id', formId).single();
    if (form) {
      setFormConfig(form);
      setSchema(form.schema || []); 
    }
    setLoading(false);
  };

  const handleFileChange = (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev, [fieldName]: { isFile: true, fileName: file.name, mimeType: file.type, base64Data: reader.result.split(',')[1] }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading('Memproses Arsip...');
    let finalData = { ...formData };

    try {
      // 1. UPLOAD FILE JIKA ADA
      for (const key in finalData) {
        if (finalData[key]?.isFile) {
          toast.loading(`Mengunggah file ke Cloud...`, { id: toastId });
          try {
            const res = await fetch('/api/sync-google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'uploadFile', ...finalData[key] })
            });
            const driveData = await res.json();
            finalData[key] = driveData.link || 'Gagal unggah';
          } catch (e) {
            finalData[key] = 'Tersimpan Lokal';
          }
        }
      }

      // 2. SUPABASE INSERT (Perbaikan Error 400)
      toast.loading('Menyimpan ke Database...', { id: toastId });
      const { error: dbError } = await supabase.from('form_responses').insert([{ 
          form_id: formId, user_id: userProfile.id, data: finalData, kabupaten: userProfile.kabupaten || 'Admin'
      }]);
      if (dbError) throw dbError;

      // 3. SPREADSHEET SYNC
      if (formConfig?.spreadsheet_id) {
        fetch('/api/sync-google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'appendRow', spreadsheetId: formConfig.spreadsheet_id, schema: schema, rowData: finalData })
        }).catch(()=>{});
      }

      toast.success('Data tersimpan dan tersinkronisasi!', { id: toastId });
      setFormData({}); // Kosongkan form setelah sukses
    } catch (err) {
      toast.error('Gagal memperbarui data.', { id: toastId });
    }
  };

  if (loading) return <div className="flex justify-center h-64"><FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary mt-20" /></div>;

  return (
    <div className="max-w-3xl mx-auto pb-10 animate-fade-in-up">
      <button type="button" onClick={() => navigate('/forms')} className="text-gray-400 hover:text-primary mb-6 flex items-center">
        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Kembali ke Direktori
      </button>

      <div className="bg-darker border border-gray-700 p-8 rounded-2xl relative shadow-xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
        <h2 className="text-2xl font-black mb-2 text-white uppercase tracking-wider">{formConfig?.title}</h2>
        <p className="text-gray-400 text-sm mb-6 pb-6 border-b border-gray-800">Formulir Input Data Administratif</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schema.map((field) => {
              const isFile = field.type === 'file';

              return (
                <div key={field.name} className="flex flex-col">
                  <label className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{field.label}</label>
                  
                  {isFile ? (
                    <div className="relative">
                      <input type="file" onChange={(e) => handleFileChange(e, field.name)} className="hidden" id={`sfile-${field.name}`}/>
                      <label htmlFor={`sfile-${field.name}`} className="flex items-center justify-center p-3 rounded-xl border border-dashed bg-dark/50 border-gray-500 hover:border-primary text-gray-300 transition-all cursor-pointer">
                        <FontAwesomeIcon icon={faUpload} className="mr-2 text-primary" />
                        <span className="truncate max-w-[150px] text-sm">{formData[field.name]?.fileName || formData[field.name] || 'Pilih Berkas...'}</span>
                      </label>
                    </div>
                  ) : (
                    <input
                      type={field.type || 'text'} name={field.name} value={formData[field.name] || ''} onChange={handleChange} 
                      className="p-4 rounded-xl border outline-none text-sm bg-dark/80 text-white border-gray-600 focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
                      required
                    />
                  )}
                </div>
              );
            })}
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-yellow-600 text-darker font-black py-4 rounded-xl uppercase tracking-widest transition-transform active:scale-95">
            Simpan & Sinkronisasi
          </button>
        </form>
      </div>
    </div>
  );
}
