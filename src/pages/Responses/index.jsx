import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faFilter, faFileDownload } from '@fortawesome/free-solid-svg-icons';

export default function Responses() {
  const [responses, setResponses] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSchema, setActiveSchema] = useState([]);

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    if (selectedFormId) fetchResponses(selectedFormId);
  }, [selectedFormId]);

  const fetchForms = async () => {
    const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
    if (data) {
      setForms(data);
      if (data.length > 0) setSelectedFormId(data[0].id);
    }
  };

  const fetchResponses = async (formId) => {
    setLoading(true);
    const formConfig = forms.find(f => f.id === formId);
    if (formConfig) setActiveSchema(formConfig.schema || []);

    const { data } = await supabase
      .from('form_responses')
      .select('*, forms(title)')
      .eq('form_id', formId)
      .order('created_at', { ascending: false });
      
    if (data) setResponses(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-white uppercase drop-shadow-sm flex items-center">
            <FontAwesomeIcon icon={faDatabase} className="mr-3 text-primary" /> Executive Data Table
          </h2>
          <p className="text-gray-400 mt-2 text-sm">Lihat seluruh arsip data mentah dalam format tabel.</p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
          <select 
            value={selectedFormId} 
            onChange={(e) => setSelectedFormId(e.target.value)}
            className="p-3 rounded-xl bg-darker border border-gray-700 text-white focus:border-primary outline-none text-sm font-bold shadow-xl"
          >
            {forms.map(f => <option key={f.id} value={f.id}>{f.title.toUpperCase()}</option>)}
          </select>
        </div>
      </div>
      
      <div className="bg-darker backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 border-gray-800 bg-black/50">
              <tr>
                <th className="px-6 py-5 font-black text-primary">Waktu Masuk</th>
                <th className="px-6 py-5 font-black text-primary">No. Registrasi</th>
                {activeSchema.map(col => (
                  <th key={col.name} className="px-6 py-5 font-bold text-gray-300">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={activeSchema.length + 2} className="text-center py-10 text-gray-500">Memuat basis data...</td></tr>
              ) : responses.length > 0 ? (
                responses.map((res, index) => (
                  <tr key={res.id} className={`${index % 2 === 0 ? 'bg-dark/20' : 'bg-darker'} hover:bg-primary/5 transition-colors`}>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{new Date(res.created_at).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 font-black text-white">{res.data.nomor_registrasi || '-'}</td>
                    
                    {activeSchema.map(col => (
                      <td key={col.name} className="px-6 py-4 text-gray-300 truncate max-w-[200px]">
                        {String(res.data[col.name]).startsWith('http') ? (
                          <a href={res.data[col.name]} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center">
                            <FontAwesomeIcon icon={faFileDownload} className="mr-2" /> Unduh
                          </a>
                        ) : (
                          res.data[col.name] || '-'
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={activeSchema.length + 2} className="text-center py-10 text-gray-500">Arsip kosong untuk form ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}