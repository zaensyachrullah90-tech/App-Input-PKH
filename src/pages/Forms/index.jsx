import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../config/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolderOpen, faArrowRight, faSpinner } from '@fortawesome/free-solid-svg-icons';

export default function FormList() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('forms').select('*');
      if (error) throw error;
      setForms(data || []); // Pastikan selalu array meskipun kosong
    } catch (error) {
      console.error("Gagal memuat daftar form:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wide drop-shadow-sm flex items-center">
           <FontAwesomeIcon icon={faFolderOpen} className="mr-4 text-primary" />
           E-Arsip Data SDM
        </h2>
        <p className="text-gray-400 mt-2 text-sm md:text-base">Pilih direktori form di bawah ini untuk memulai perekaman data operasional.</p>
      </div>
     
      {loading ? (
        <div className="flex flex-col justify-center items-center h-48 bg-darker/50 rounded-2xl border border-gray-800">
          <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-primary mb-4" />
          <p className="text-gray-500 font-bold tracking-widest uppercase">Memuat Direktori...</p>
        </div>
      ) : forms.length === 0 ? (
        <div className="p-10 text-center bg-darker/50 rounded-2xl border-2 border-dashed border-gray-700 flex flex-col items-center">
          <FontAwesomeIcon icon={faFolderOpen} className="text-5xl text-gray-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-300 mb-2">Direktori Kosong</h3>
          <p className="text-gray-500 text-sm">Belum ada form yang di-generate. Silakan masuk ke menu Pengaturan untuk melakukan Inject Schema baru ke dalam database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {forms.map((form) => (
            <div key={form.id} className="bg-darker border border-gray-700 p-6 rounded-2xl shadow-lg hover:shadow-[0_0_20px_rgba(234,179,8,0.15)] hover:border-primary/50 transition-all flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gray-600 group-hover:bg-primary transition-colors"></div>
              
              <div className="flex items-center mb-4 text-white">
                <div className="bg-primary/20 p-3 rounded-xl border border-primary/30 mr-4">
                  <FontAwesomeIcon icon={faFolderOpen} className="text-2xl text-primary" />
                </div>
                <h3 className="text-xl font-bold uppercase truncate">{form.title || 'Form Tanpa Judul'}</h3>
              </div>
              
              <p className="text-sm text-gray-400 mb-6 flex-grow line-clamp-3">
                {form.description || 'Modul form pintar yang dilengkapi dengan sistem auto-lock dan validasi data secara realtime.'}
              </p>
              
              <Link 
                to={`/form/${form.id}`}
                className="w-full bg-primary hover:bg-yellow-600 text-darker font-extrabold py-3 px-4 rounded-xl text-center transition-transform active:scale-95 flex justify-center items-center uppercase tracking-wide"
              >
                Buka Direktori <FontAwesomeIcon icon={faArrowRight} className="ml-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
