import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faChartPie, faFolderOpen, faFilter, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function Dashboard() {
  const [forms, setForms] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Dinamis
  const [selectedFormId, setSelectedFormId] = useState('');
  const [groupBy, setGroupBy] = useState(''); // Field yang dipilih untuk dikelompokkan
  const [groupedData, setGroupedData] = useState({});

  useEffect(() => {
    fetchForms();
    const subscription = supabase
      .channel('public:form_responses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'form_responses' }, () => {
        if (selectedFormId) fetchResponses(selectedFormId);
      })
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, [selectedFormId]);

  const fetchForms = async () => {
    setLoading(true);
    const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
    if (data) {
      setForms(data);
      if (data.length > 0) {
        setSelectedFormId(data[0].id);
        fetchResponses(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchResponses = async (formId) => {
    const { data } = await supabase.from('form_responses').select('*').eq('form_id', formId);
    if (data) {
      setResponses(data);
      processGroupedData(data, groupBy);
    }
  };

  // MESIN PENGELOMPOKAN DINAMIS
  const processGroupedData = (dataArray, fieldName) => {
    if (!fieldName) {
      setGroupedData({});
      return;
    }
    const grouped = dataArray.reduce((acc, curr) => {
      // Ambil nilai dari JSON data, jika kosong beri label 'Tidak Disebutkan'
      const key = curr.data[fieldName] || 'Tidak Disebutkan';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    setGroupedData(grouped);
  };

  // Saat dropdown "Group By" berubah
  const handleGroupByChange = (e) => {
    const field = e.target.value;
    setGroupBy(field);
    processGroupedData(responses, field);
  };

  const activeForm = forms.find(f => f.id === selectedFormId);

  if (loading) return <div className="flex justify-center pt-20"><FontAwesomeIcon icon={faSpinner} spin size="3x" className="text-primary" /></div>;

  return (
    <div className="space-y-8 animate-fade-in pb-20 max-w-7xl mx-auto">
      <div className="border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white uppercase drop-shadow-sm">Executive Dashboard</h1>
        <p className="text-gray-400 mt-2">Analitik respons dinamis dan pemantauan data real-time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KARTU 1: TOTAL FORM */}
        <div className="bg-darker border border-gray-700 p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div>
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Total Direktori Form</h3>
            <p className="text-5xl font-black text-white">{forms.length}</p>
          </div>
          <div className="bg-primary/10 p-5 rounded-2xl border border-primary/20">
            <FontAwesomeIcon icon={faFolderOpen} className="text-4xl text-primary" />
          </div>
        </div>

        {/* KARTU 2: TOTAL RESPONDEN FORM AKTIF */}
        <div className="bg-darker border border-gray-700 p-6 rounded-3xl shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full pointer-events-none"></div>
          <div>
            <h3 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Total Responden</h3>
            <p className="text-5xl font-black text-primary">{responses.length}</p>
          </div>
          <div className="bg-primary/20 p-5 rounded-2xl border border-primary/30">
            <FontAwesomeIcon icon={faUsers} className="text-4xl text-primary" />
          </div>
        </div>
      </div>

      {/* FILTER DINAMIS */}
      <div className="bg-darker border border-gray-700 p-8 rounded-3xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center">
            <FontAwesomeIcon icon={faFilter} className="mr-3 text-primary" /> Analitik Dinamis
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <select 
              value={selectedFormId} 
              onChange={(e) => { setSelectedFormId(e.target.value); setGroupBy(''); }}
              className="p-3 rounded-xl bg-dark/80 border border-gray-600 text-white focus:border-primary outline-none text-sm font-semibold"
            >
              {forms.map(f => <option key={f.id} value={f.id}>{f.title.toUpperCase()}</option>)}
            </select>

            <select 
              value={groupBy} 
              onChange={handleGroupByChange}
              className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold focus:border-primary outline-none text-sm"
            >
              <option value="">-- Tampilkan Semua --</option>
              <option value="kabupaten">Wilayah / Kabupaten (Default)</option>
              {activeForm?.schema?.map(col => (
                <option key={col.name} value={col.name}>Kelompokkan: {col.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* HASIL ANALITIK */}
        {!groupBy ? (
          <div className="text-center p-10 border border-dashed border-gray-700 rounded-2xl">
            <p className="text-gray-500">Pilih opsi "Kelompokkan Berdasarkan" di atas untuk melihat rincian data dinamis (Cth: Berdasarkan Provinsi, Jenis Kelamin, dll).</p>
          </div>
        ) : Object.keys(groupedData).length === 0 ? (
          <div className="text-center p-10 bg-dark/50 rounded-2xl">
            <p className="text-gray-500">Belum ada data untuk kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
            {Object.entries(groupedData).map(([key, count]) => (
              <div key={key} className="bg-dark/40 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 flex flex-col justify-between hover:border-primary/50 transition-colors group">
                <div className="flex items-center space-x-3 mb-4">
                  <FontAwesomeIcon icon={faChartPie} className="text-xl text-gray-500 group-hover:text-primary transition-colors" />
                  <h4 className="text-xs text-gray-400 font-bold uppercase truncate" title={key}>{key}</h4>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-4xl font-black text-white">{count}</p>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Data</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}