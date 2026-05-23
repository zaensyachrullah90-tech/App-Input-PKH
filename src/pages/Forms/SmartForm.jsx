import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUpload, faLock, faChevronDown } from '@fortawesome/free-solid-svg-icons';

export default function SmartForm({ userProfile }) {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const [schema, setSchema] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState(null);
  
  const globalFolderId = localStorage.getItem('global_drive_folder_id') || '';

  useEffect(() => { fetchFormSetup(); }, [formId]);

  const fetchFormSetup = async () => {
    const { data: form } = await supabase.from('forms').select('*').eq('id', formId).single();
    if (form) {
      setFormConfig(form);
      setSchema(form.schema || []); 
      
      const initialData = {};
      (form.schema || []).forEach(field => {
        if (field.defaultValue) initialData[field.name] = field.defaultValue.toUpperCase();
      });
      setFormData(initialData);
    }
    setLoading(false);
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
    const toastId = toast.loading('Menyimpan Berkas...');
    let finalData = { ...formData };

    try {
      for (const key in finalData) {
        if (finalData[key]?.isFile) {
          const res = await fetch('/api/sync-google', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'uploadFile', ...finalData[key], folderId: globalFolderId })
          });
          const driveData = await res.json();
          finalData[key] = driveData.link || 'Gagal';
        }
      }

      const { error: dbError } = await supabase.from('form_responses').insert([{ 
          form_id: formId, user_id: userProfile.id, data: finalData, kabupaten: 'Admin'
      }]);
      if (dbError) throw dbError;

      if (formConfig?.spreadsheet_id) {
        fetch('/api/sync-google', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'appendRow', spreadsheetId: formConfig.spreadsheet_id, schema: schema, rowData: finalData })
        }).catch(()=>{});
      }

      toast.success('Arsip Berhasil Diamankan!', { id: toastId });
      setFormData({});
    } catch (err) { toast.error('Gagal menyimpan.', { id: toastId }); }
  };

  if (loading) return <div className="flex justify-center h-64"><FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary mt-20" /></div>;

  return (
    <div className="max-w-3xl mx-auto pb-10 px-3 md:px-0 animate-fade-in-up">
      <button type="button" onClick={() => navigate('/forms')} className="text-gray-400 hover:text-primary mb-6 flex items-center text-sm">
        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" /> Kembali ke Direktori
      </button>

      <div className="bg-darker border border-gray-700 p-5 md:p-8 rounded-2xl relative shadow-xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
        <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">{formConfig?.title}</h2>
        <p className="text-gray-400 text-xs mt-1 border-b border-gray-800 pb-4">Internal Admin Data Entry</p>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {schema.map((field) => {
              const isFile = field.type === 'file';
              const isSelect = field.type === 'select';
              const isCurrency = field.type === 'currency';

              return (
                <div key={field.name} className="flex flex-col relative">
                  <label className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{field.label}</label>
                  {isFile ? (
                    <div className="relative">
                      <input type="file" onChange={(e) => handleFileChange(e, field.name)} className="hidden" id={`sfile-${field.name}`}/>
                      <label htmlFor={`sfile-${field.name}`} className="flex items-center justify-center p-3.5 rounded-xl border border-dashed bg-dark/50 border-gray-500 text-gray-300 transition-all cursor-pointer text-xs">
                        <FontAwesomeIcon icon={faUpload} className="mr-2 text-primary" /> {formData[field.name]?.fileName || 'Pilih Berkas...'}
                      </label>
                    </div>
                  ) : isSelect ? (
                    <div className="relative">
                      <select name={field.name} value={formData[field.name] || ''} onChange={(e) => handleInputChange(e, field)} className="w-full p-3.5 rounded-xl border bg-dark/80 text-white border-gray-600 focus:border-primary text-sm appearance-none">
                        <option value="" disabled>-- Pilih {field.label} --</option>
                        {field.options?.map(opt => <option key={opt} value={opt} className="bg-darker">{opt}</option>)}
                      </select>
                      <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="relative flex items-center">
                      {isCurrency && <span className="absolute left-4 font-bold text-sm text-primary">Rp.</span>}
                      <input
                        type={isCurrency ? 'text' : field.type || 'text'} name={field.name} value={formData[field.name] || ''} onChange={(e) => handleInputChange(e, field)} 
                        className={`w-full p-3.5 rounded-xl border outline-none text-sm bg-dark/80 text-white border-gray-600 focus:border-primary ${isCurrency ? 'pl-12' : 'pl-4'}`}
                        required
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-yellow-600 text-darker font-black py-4 rounded-xl uppercase text-xs tracking-widest">Simpan & Sinkronisasi</button>
        </form>
      </div>
    </div>
  );
}
