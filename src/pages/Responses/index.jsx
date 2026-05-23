import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faFilter, faFileDownload, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import toast, { Toaster } from 'react-hot-toast';

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

  // ==========================================
  // FITUR EKSPOR KE EXCEL (.CSV)
  // ==========================================
  const handleExportExcel = () => {
    if (responses.length === 0) return toast.error('Tidak ada arsip data untuk diekspor.');

    const headers = ['Waktu Masuk', 'No. Registrasi', ...activeSchema.map(col => col.label)];
    // Reverse array agar data yang diekspor urut dari yang paling lama ke yang terbaru
    const reversedResponses = [...responses].reverse();

    const csvData = reversedResponses.map((res, index) => {
      const row = [
        new Date(res.created_at).toLocaleString('id-ID'),
        res.data.nomor_registrasi || '-'
      ];

      activeSchema.forEach(col => {
        const colNameLower = col.name.toLowerCase();
        const colLabelLower = col.label.toLowerCase();
        
        // LOGIKA PENOMORAN OTOMATIS SAAT EKSPOR EXCEL
        if (colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor') {
          row.push(index + 1);
        } else {
          let cellValue = res.data[col.name] || '-';
          if (typeof cellValue === 'string') {
            cellValue = cellValue.replace(/"/g, '""'); // Hindari bentrok tanda kutip
            if (cellValue.includes(',') || cellValue.includes('\n')) {
              cellValue = `"${cellValue}"`; // Bungkus dalam kutip jika ada koma
            }
          }
          row.push(cellValue);
        }
      });
      return row;
    });

    const csvContent = [headers.join(','), ...csvData.map(e => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM UTF-8 agar terbaca Excel
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const formTitle = forms.find(f => f.id === selectedFormId)?.title || 'Data_Export';

    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Excel_${formTitle.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Berhasil mengekspor ke Excel!');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-fade-in">
      <Toaster position="top-right" toastOptions={{ style: { background: '#111827', color: '#fff', border: '1px solid #374151' } }} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white uppercase drop-shadow-sm flex items-center">
            <FontAwesomeIcon icon={faDatabase} className="mr-3 text-primary" /> Executive Data Table
          </h2>
          <p className="text-gray-400 mt-2 text-sm">Lihat seluruh arsip data mentah dalam format tabel dan ekspor ke Excel.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-3 bg-darker border border-gray-700 p-1 rounded-xl">
            <FontAwesomeIcon icon={faFilter} className="text-gray-500 ml-3" />
            <select 
              value={selectedFormId} 
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="p-2 bg-transparent text-white focus:outline-none text-sm font-bold w-48"
            >
              {forms.map(f => <option key={f.id} value={f.id} className="bg-darker">{f.title.toUpperCase()}</option>)}
            </select>
          </div>
          {/* TOMBOL EXPORT EXCEL BARU */}
          <button onClick={handleExportExcel} className="px-5 py-3 bg-green-600/20 text-green-500 hover:bg-green-600 hover:text-white border border-green-600/30 rounded-xl text-sm font-bold transition-all flex items-center shadow-lg">
            <FontAwesomeIcon icon={faFileExcel} className="mr-2" /> Export Excel
          </button>
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
                    
                    {activeSchema.map(col => {
                      const colNameLower = col.name.toLowerCase();
                      const colLabelLower = col.label.toLowerCase();
                      let displayValue = res.data[col.name] || '-';

                      // LOGIKA PENOMORAN OTOMATIS SAAT TAMPIL DI TABEL UI
                      if (colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor') {
                        // Karena array responses berurutan dari yang terbaru (descending), maka no 1 ada di index paling bawah
                        displayValue = responses.length - index; 
                      }

                      return (
                        <td key={col.name} className="px-6 py-4 text-gray-300 truncate max-w-[200px]">
                          {String(displayValue).startsWith('http') ? (
                            <a href={displayValue} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center">
                              <FontAwesomeIcon icon={faFileDownload} className="mr-2" /> Unduh
                            </a>
                          ) : (
                            displayValue
                          )}
                        </td>
                      );
                    })}
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
