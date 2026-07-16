import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faUpload, faChevronDown } from '@fortawesome/free-solid-svg-icons';

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

export default function SmartForm({ userProfile }) {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const [schema, setSchema] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const globalFolderId = localStorage.getItem('global_drive_folder_id') || '';

  useEffect(() => { 
    if (formId) fetchFormSetup(); 
  }, [formId]);

  const fetchFormSetup = async () => {
    if (!formId) return;
    try {
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
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
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
    if (!formId) return;
    setIsSaving(true);
    let finalData = { ...formData };

    try {
      // 1. Upload Berkas
      for (const key in finalData) {
        if (finalData[key]?.isFile) {
          try {
            const res = await fetch('/api/sync-google', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'uploadFile', ...finalData[key], folderId: globalFolderId })
            });
            const driveData = await res.json();
            finalData[key] = driveData.link || 'Gagal';
          } catch(e) { finalData[key] = 'Gagal'; }
        }
      }

      // 2. Simpan Database Instan
      const kabKey = Object.keys(finalData).find(k => k.toLowerCase().includes('kabupaten'));
      const kabupatenVal = kabKey ? finalData[kabKey] : 'Admin';

      const { error: dbError } = await supabase.from('form_responses').insert([{ 
          form_id: formId, user_id: userProfile?.id || null, data: finalData, kabupaten: kabupatenVal
      }]);
      if (dbError) throw dbError;

      // 3. Background Sync (SILENT MODE)
      const backgroundAdminSync = async () => {
         let currentSheetId = formConfig?.spreadsheet_id || formConfig?.spreadsheet_link;
         if (currentSheetId && (currentSheetId.includes('docs.google.com') || currentSheetId.includes('/d/'))) {
           const match = currentSheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
           if (match && match[1]) currentSheetId = match[1]; 
         }
         
         if (currentSheetId) {
           fetch('/api/sync-google', {
             method: 'POST', headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ action: 'appendRow', spreadsheetId: currentSheetId, schema: schema, rowData: finalData })
           }).catch(e => console.error("Silent Sync API Error:", e));
         }
      }
      
      backgroundAdminSync(); // Fire and Forget

      setIsSaving(false);
      toast.success('Data Diamankan! Sinkronisasi otomatis ke Spreadsheet.');
      fetchFormSetup(); 

    } catch (err) { setIsSaving(false); toast.error('Gagal menyimpan.'); }
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
              const colNameLower = field.name.toLowerCase();
              const isRegionField = colNameLower.includes('kabupaten') || colNameLower.includes('kecamatan') || colNameLower.includes('desa') || colNameLower.includes('kelurahan');
              
              const isFile = field.type === 'file';
              const isSelect = field.type === 'select' || isRegionField; 
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
                        {(() => {
                           let selectOptions = field.options || [];
                           
                           if (colNameLower.includes('kabupaten')) {
                             selectOptions = Object.keys(DATA_WILAYAH);
                           } else if (colNameLower.includes('kecamatan')) {
                             const kabKey = Object.keys(formData).find(k => k.toLowerCase().includes('kabupaten'));
                             const kabVal = kabKey ? formData[kabKey] : null;
                             if (kabVal && DATA_WILAYAH[kabVal]) selectOptions = Object.keys(DATA_WILAYAH[kabVal]);
                           } else if (colNameLower.includes('desa') || colNameLower.includes('kelurahan')) {
                             const kabKey = Object.keys(formData).find(k => k.toLowerCase().includes('kabupaten'));
                             const kecKey = Object.keys(formData).find(k => k.toLowerCase().includes('kecamatan'));
                             const kabVal = kabKey ? formData[kabKey] : null;
                             const kecVal = kecKey ? formData[kecKey] : null;
                             if (kabVal && kecVal && DATA_WILAYAH[kabVal] && DATA_WILAYAH[kabVal][kecVal]) selectOptions = DATA_WILAYAH[kabVal][kecVal];
                           }

                           return selectOptions.map(opt => <option key={opt} value={opt} className="bg-darker">{opt}</option>);
                        })()}
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
          <button type="submit" disabled={isSaving} className="w-full bg-primary hover:bg-yellow-600 text-darker font-black py-4 rounded-xl uppercase text-xs tracking-widest flex items-center justify-center">
             {isSaving ? <FontAwesomeIcon icon={faSpinner} spin className="mr-2"/> : ''} {isSaving ? 'Menyimpan...' : 'Simpan & Sinkronisasi'}
          </button>
        </form>
      </div>
    </div>
  );
}
