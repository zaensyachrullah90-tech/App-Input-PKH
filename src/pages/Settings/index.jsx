import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faRobot, faUpload, faSpinner, faPlus, faCog, faCloud, faLink, faFileExcel, faPenNib, faTrash, faPowerOff, faLock, faLockOpen, faEye, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export default function Settings() {
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [creationMode, setCreationMode] = useState('manual');
  const [newForm, setNewForm] = useState({ title: '', description: '', link: '' });
  const [newColumn, setNewColumn] = useState({ name: '', label: '', type: 'text', defaultValue: '', options: '' });
  const [activeSchema, setActiveSchema] = useState([]);

  // STATE UNTUK CRUD FIELD KOLOM
  const [editingColName, setEditingColName] = useState(null);
  const [editColData, setEditColData] = useState({ label: '', type: 'text', defaultValue: '', options: '' });

  useEffect(() => { fetchForms(); }, []);

  useEffect(() => {
    if (selectedFormId) {
      const current = forms.find(f => f.id === selectedFormId);
      if (current) setActiveSchema(current.schema || []);
    }
  }, [selectedFormId, forms]);

  const fetchForms = async () => {
    try {
      const { data, error } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setForms(data);
        if (data.length > 0 && !selectedFormId) setSelectedFormId(data[0].id);
      }
    } catch (error) {
      toast.error('Gagal memuat data formulir dari server.');
    }
  };

  const handleDeleteForm = async (id) => {
    if (!window.confirm('Hapus form ini beserta seluruh datanya secara permanen?')) return;
    try {
      const { error } = await supabase.from('forms').delete().eq('id', id);
      if (error) throw error;
      
      setForms(forms.filter(f => f.id !== id));
      if (selectedFormId === id) setSelectedFormId('');
      toast.success('Formulir berhasil dihapus.');
    } catch (error) {
      toast.error('Gagal menghapus formulir: ' + error.message);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      const { error } = await supabase.from('forms').update({ is_active: newStatus }).eq('id', id);
      if (error) throw error;
      
      setForms(forms.map(f => f.id === id ? { ...f, is_active: newStatus } : f));
      toast.success(newStatus ? 'Form Publik Dibuka' : 'Form Publik Ditutup');
    } catch (error) {
      toast.error('Gagal mengubah status formulir.');
    }
  };

  const handleToggleColumnLock = async (colName) => {
    const updatedSchema = (activeSchema || []).map(col => col.name === colName ? { ...col, adminLocked: !col.adminLocked } : col);
    try {
      const { error } = await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
      if (error) throw error;
      
      setActiveSchema(updatedSchema);
      setForms(forms.map(f => f.id === selectedFormId ? { ...f, schema: updatedSchema } : f));
      toast.success(`Akses kolom ${colName} berhasil diperbarui.`);
    } catch (error) {
      toast.error('Gagal memperbarui hak akses kolom.');
    }
  };

  const handleDeleteColumn = async (colName) => {
    if (!window.confirm(`Yakin ingin menghapus input/kolom "${colName}"? Data yang sudah masuk di kolom ini mungkin tidak akan terhubung lagi.`)) return;
    const updatedSchema = (activeSchema || []).filter(col => col.name !== colName);
    
    try {
      const { error } = await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
      if (error) throw error;

      setActiveSchema(updatedSchema);
      setForms(forms.map(f => f.id === selectedFormId ? { ...f, schema: updatedSchema } : f));
      toast.success(`Kolom ${colName} berhasil dihapus dari form.`);
    } catch (error) {
      toast.error('Gagal menghapus kolom dari database.');
    }
  };

  const startEditColumn = (col) => {
    setEditingColName(col.name);
    setEditColData({
      label: col.label,
      type: col.type,
      defaultValue: col.defaultValue || '',
      options: col.options && Array.isArray(col.options) ? col.options.join(', ') : ''
    });
  };

  const handleUpdateColumn = async (oldName) => {
    const dropdownOptions = editColData.type === 'select' && editColData.options 
      ? editColData.options.split(',').map(opt => opt.trim()).filter(opt => opt !== '') 
      : [];

    const updatedSchema = (activeSchema || []).map(col => {
      if (col.name === oldName) {
        return {
          ...col,
          label: editColData.label.toUpperCase(),
          type: editColData.type,
          defaultValue: editColData.defaultValue,
          options: dropdownOptions
        };
      }
      return col;
    });

    try {
      const { error } = await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
      if (error) throw error;

      setActiveSchema(updatedSchema);
      setForms(forms.map(f => f.id === selectedFormId ? { ...f, schema: updatedSchema } : f));
      toast.success('Pengaturan kolom berhasil diperbarui!');
      setEditingColName(null);
    } catch (error) {
      toast.error('Gagal menyimpan pembaruan kolom.');
    }
  };

  const executeFormCreation = async (finalSchema, finalLink, finalDriveId = '') => {
    try {
      const { error } = await supabase.from('forms').insert([{
        title: newForm.title,
        description: newForm.description,
        spreadsheet_link: finalLink,
        spreadsheet_id: finalDriveId,
        schema: finalSchema,
        is_active: true
      }]);
      if (error) throw error;
      toast.success('Sistem Cerdas Berhasil Di-Generate!', { id: 'create' });
      setNewForm({ title: '', description: '', link: '' });
      fetchForms();
    } catch (err) {
      toast.error('Gagal menyimpan form ke database.', { id: 'create' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateManual = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    toast.loading('Membangun Form & Spreadsheet Manual...', { id: 'create' });
    let finalLink = ''; let driveId = '';
    const schema = [
      { name: 'nik', label: 'NIK / NOMOR IDENTITAS', type: 'number', adminLocked: false, defaultValue: '' },
      { name: 'nama', label: 'NAMA LENGKAP', type: 'text', adminLocked: false, defaultValue: '' }
    ];
    try {
      const res = await fetch('/api/sync-google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createForm', title: newForm.title })
      });
      if (res.ok) {
        const googleData = await res.json();
        finalLink = googleData.spreadsheetUrl; driveId = googleData.spreadsheetId;
      }
    } catch (err) { console.warn('API Google Offline.'); }
    executeFormCreation(schema, finalLink, driveId);
  };

  const handleExtractFromLink = async (e) => {
    e.preventDefault();
    if (!newForm.link) return toast.error('Paste link Spreadsheet terlebih dahulu!');
    const match = newForm.link.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return toast.error('Format Tautan tidak valid.');
    const sheetId = match[1];
    setIsProcessing(true);
    toast.loading('Menyedot Header dari Link Spreadsheet...', { id: 'create' });
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    Papa.parse(csvUrl, {
      download: true, header: false, skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data;
        if (!rows || rows.length === 0) {
          toast.error('Spreadsheet kosong.', { id: 'create' }); setIsProcessing(false); return;
        }
        let headerRow = [];
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          if (rows[i].length > headerRow.length) headerRow = rows[i];
        }
        const generatedSchema = headerRow.map(item => {
          const cleanLabel = item.trim();
          return {
            name: cleanLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            label: cleanLabel.toUpperCase(),
            type: cleanLabel.toLowerCase().includes('tanggal') ? 'date' : cleanLabel.toLowerCase().includes('nik') ? 'number' : 'text',
            adminLocked: false, defaultValue: ''
          };
        }).filter(item => item.name !== '');

        if (!generatedSchema.some(s => s.name === 'nik')) {
          generatedSchema.unshift({ name: 'nik', label: 'NIK / NOMOR IDENTITAS', type: 'number', adminLocked: false, defaultValue: '' });
        }
        toast.success(`Berhasil menyedot ${generatedSchema.length} header dari Link!`, { id: 'create' });
        executeFormCreation(generatedSchema, newForm.link, sheetId);
      },
      error: () => { 
        toast.error('Koneksi internet bermasalah atau gagal mengakses Link.', { id: 'create' }); 
        setIsProcessing(false); 
      }
    });
  };

  const handleExtractFromFile = (e) => {
    const file = e.target.files[0];
    if (!file || !newForm.title) return toast.error('Isi judul form terlebih dahulu!');
    setIsProcessing(true); toast.loading('Memproses File Upload...', { id: 'create' });
    Papa.parse(file, {
      header: false, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        let headerRow = [];
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          if (rows[i].length > headerRow.length) headerRow = rows[i];
        }
        const generatedSchema = headerRow.map(item => {
          const cleanLabel = item.trim();
          return {
            name: cleanLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            label: cleanLabel.toUpperCase(),
            type: cleanLabel.toLowerCase().includes('tanggal') ? 'date' : cleanLabel.toLowerCase().includes('nik') ? 'number' : 'text',
            adminLocked: false, defaultValue: ''
          };
        }).filter(item => item.name !== '');

        let finalLink = ''; let driveId = '';
        try {
          const res = await fetch('/api/sync-google', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'createForm', title: newForm.title })
          });
          if (res.ok) {
            const googleData = await res.json();
            finalLink = googleData.spreadsheetUrl; driveId = googleData.spreadsheetId;
          }
        } catch (err) { console.warn('API Google Offline.'); }
        executeFormCreation(generatedSchema, finalLink, driveId);
      }
    });
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!selectedFormId) return toast.error('Pilih form target!');

    const dropdownOptions = newColumn.type === 'select' && newColumn.options 
      ? newColumn.options.split(',').map(opt => opt.trim()).filter(opt => opt !== '') 
      : [];

    const cleanColName = newColumn.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const updatedSchema = [...(activeSchema || []), { 
      name: cleanColName, 
      label: newColumn.label.toUpperCase(), 
      type: newColumn.type,
      defaultValue: newColumn.defaultValue,
      options: dropdownOptions,
      adminLocked: false
    }];

    try {
      const { error } = await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
      if (error) throw error;

      setActiveSchema(updatedSchema);
      setNewColumn({ name: '', label: '', type: 'text', defaultValue: '', options: '' });
      toast.success('Kolom disuntikkan ke tampilan instan!');
      fetchForms();
    } catch (error) {
      toast.error('Gagal menambahkan kolom ke database.');
    }
  };

  const handleGeminiUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedFormId) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        setIsProcessing(true); const toastId = toast.loading('Gemini AI sedang bekerja memvalidasi data...');
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `Rapikan JSON data berikut ini: ${JSON.stringify(results.data)}. Format penulisan nama gunakan huruf kapital di awal kata. Pastikan NIK bersih dari string non-angka. Kembalikan HANYA array JSON murni tanpa markdown.`;
          const result = await model.generateContent(prompt);
          const cleanedData = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
          const insertPayload = cleanedData.map(row => ({
            form_id: selectedFormId, data: row, kabupaten: row.kabupaten || 'Sistem Enterprise'
          }));
          const { error } = await supabase.from('form_responses').insert(insertPayload);
          if (error) throw error;
          
          toast.success('AI Auto-Fill berhasil memproses & menginjeksi database!', { id: toastId });
        } catch (err) {
          toast.error('AI gagal mengekstrak atau menyimpan data.', { id: toastId });
        } finally { setIsProcessing(false); e.target.value = null; }
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in">
      <div className="border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white uppercase flex items-center">
          <FontAwesomeIcon icon={faCog} className="mr-3 text-primary" /> System Control Center
        </h1>
      </div>

      <div className="bg-darker border border-gray-700 p-8 rounded-2xl relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
        <h2 className="text-xl font-bold mb-6 text-white uppercase flex items-center">
          <FontAwesomeIcon icon={faPlus} className="mr-3 text-primary" /> Auto Form Generator
        </h2>
        <div className="flex space-x-2 mb-6 bg-dark/50 p-1.5 rounded-xl border border-gray-700">
          <button type="button" onClick={() => setCreationMode('manual')} className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase ${creationMode === 'manual' ? 'bg-primary text-darker' : 'text-gray-400 hover:bg-gray-800'}`}>Manual Build</button>
          <button type="button" onClick={() => setCreationMode('file')} className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase ${creationMode === 'file' ? 'bg-primary text-darker' : 'text-gray-400 hover:bg-gray-800'}`}>Extract Excel</button>
          <button type="button" onClick={() => setCreationMode('link')} className={`flex-1 py-3 rounded-lg font-bold text-xs uppercase ${creationMode === 'link' ? 'bg-primary text-darker' : 'text-gray-400 hover:bg-gray-800'}`}>Sync Link</button>
        </div>
        <form onSubmit={creationMode === 'manual' ? handleCreateManual : creationMode === 'link' ? handleExtractFromLink : (e) => e.preventDefault()} className="space-y-4">
          <input type="text" required placeholder="Judul Form (Misal: Casis Sekolah Rakat 2026)" value={newForm.title} onChange={(e) => setNewForm({...newForm, title: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white focus:border-primary outline-none" />
          <textarea placeholder="Deskripsi form..." required value={newForm.description} onChange={(e) => setNewForm({...newForm, description: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white outline-none h-20 resize-none" />
          {creationMode === 'link' && <input type="url" required placeholder="Tautan Google Spreadsheet..." value={newForm.link} onChange={(e) => setNewForm({...newForm, link: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-primary/50 text-white outline-none" />}
          
          {creationMode === 'file' ? (
             <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/50 rounded-xl cursor-pointer bg-dark/50 hover:bg-gray-800 transition-all">
               <div className="flex flex-col items-center justify-center pt-5 pb-6">
                 {isProcessing ? <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-primary mb-2" /> : <FontAwesomeIcon icon={faFileExcel} className="text-3xl text-primary mb-2" />}
                 <p className="text-sm font-bold text-gray-300">Unggah CSV untuk Scan Header</p>
               </div>
               <input type="file" accept=".csv" className="hidden" onChange={handleExtractFromFile} disabled={isProcessing || !newForm.title} />
             </label>
          ) : (
            <button type="submit" disabled={isProcessing} className="w-full bg-primary hover:bg-yellow-600 text-darker font-black py-4 rounded-xl uppercase flex justify-center items-center mt-4">
               {isProcessing ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Generate Form'}
            </button>
          )}
        </form>
      </div>

      <div className="bg-darker border border-gray-700 p-6 rounded-2xl flex items-center space-x-6">
        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest min-w-max">Target Form Aktif:</label>
        <select value={selectedFormId} onChange={(e) => setSelectedFormId(e.target.value)} className="w-full p-4 rounded-xl bg-dark border border-gray-600 text-white focus:border-primary outline-none font-semibold">
          {forms.map(f => <option key={f.id} value={f.id}>{f.title.toUpperCase()}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-darker border border-gray-700 p-8 rounded-2xl h-fit">
          <h2 className="text-lg font-bold mb-4 text-white uppercase border-b border-gray-800 pb-3 flex items-center">
            <FontAwesomeIcon icon={faDatabase} className="mr-3 text-primary" /> Suntik Kolom Baru
          </h2>
          <form onSubmit={handleAddColumn} className="space-y-4">
            <input type="text" required placeholder="Nama Sistem (Cth: provinsi)" value={newColumn.name} onChange={(e) => setNewColumn({...newColumn, name: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white focus:border-primary outline-none text-sm" />
            <input type="text" required placeholder="Label UI (Cth: Asal Provinsi)" value={newColumn.label} onChange={(e) => setNewColumn({...newColumn, label: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white focus:border-primary outline-none text-sm" />
            <select value={newColumn.type} onChange={(e) => setNewColumn({...newColumn, type: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white focus:border-primary outline-none text-sm">
              <option value="text">Teks Pendek</option>
              <option value="number">Angka / Kode</option>
              <option value="date">Tanggal</option>
              <option value="select">Dropdown (Pilihan)</option>
              <option value="file">Upload Berkas (Drive)</option>
            </select>

            {newColumn.type === 'select' && (
              <textarea required placeholder="Masukkan pilihan dipisah koma (Cth: Laki-Laki, Perempuan)" value={newColumn.options} onChange={(e) => setNewColumn({...newColumn, options: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-primary/50 text-white focus:border-primary outline-none text-sm h-20" />
            )}

            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700">
               <label className="text-[10px] text-gray-400 uppercase font-bold mb-2 block">Nilai Bawaan / Default (Opsional)</label>
              <input type="text" placeholder="Cth: Kalimantan Selatan" value={newColumn.defaultValue} onChange={(e) => setNewColumn({...newColumn, defaultValue: e.target.value})} className="w-full p-3 rounded-lg bg-dark border border-gray-600 text-white focus:border-primary outline-none text-sm" />
            </div>

            <button type="submit" className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl uppercase text-xs">
              Injeksi Struktur Kolom
            </button>
          </form>
        </div>

        {/* AREA PENGATURAN CRUD KOLOM YANG BARU DITAMBAHKAN */}
        <div className="bg-darker border border-gray-700 p-8 rounded-2xl lg:col-span-2">
          <h2 className="text-lg font-bold mb-4 text-white uppercase border-b border-gray-800 pb-3 flex items-center">
            <FontAwesomeIcon icon={faLock} className="mr-3 text-primary" /> Pengaturan & Manajemen Form
          </h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {(activeSchema || []).map((col) => (
              <div key={col.name} className="flex flex-col bg-dark/40 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
                
                {editingColName === col.name ? (
                  // UI MODE EDIT
                  <div className="p-5 space-y-3 bg-gray-900/80 rounded-xl border border-primary/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-primary uppercase">Edit Kolom: {col.name}</span>
                      <button type="button" onClick={() => setEditingColName(null)} className="text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} /></button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-400 font-bold mb-1 block uppercase">Label UI</label>
                        <input type="text" value={editColData.label} onChange={(e) => setEditColData({...editColData, label: e.target.value})} className="w-full p-2.5 rounded-lg bg-dark border border-gray-600 text-white focus:border-primary outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-bold mb-1 block uppercase">Tipe Data</label>
                        <select value={editColData.type} onChange={(e) => setEditColData({...editColData, type: e.target.value})} className="w-full p-2.5 rounded-lg bg-dark border border-gray-600 text-white focus:border-primary outline-none text-sm">
                          <option value="text">Teks Pendek</option>
                          <option value="number">Angka / Kode</option>
                          <option value="date">Tanggal</option>
                          <option value="select">Dropdown (Pilihan)</option>
                          <option value="file">Upload Berkas</option>
                        </select>
                      </div>
                    </div>

                    {editColData.type === 'select' && (
                      <div>
                        <label className="text-[10px] text-gray-400 font-bold mb-1 block uppercase">Opsi Dropdown (Pisahkan dengan koma)</label>
                        <textarea value={editColData.options} onChange={(e) => setEditColData({...editColData, options: e.target.value})} className="w-full p-2.5 rounded-lg bg-dark border border-gray-600 text-white focus:border-primary outline-none text-sm h-16" />
                      </div>
                    )}

                    <div>
                      <label className="text-[10px] text-gray-400 font-bold mb-1 block uppercase">Nilai Default (Opsional)</label>
                      <input type="text" value={editColData.defaultValue} onChange={(e) => setEditColData({...editColData, defaultValue: e.target.value})} className="w-full p-2.5 rounded-lg bg-dark border border-gray-600 text-white focus:border-primary outline-none text-sm" />
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button type="button" onClick={() => setEditingColName(null)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold">Batal</button>
                      <button type="button" onClick={() => handleUpdateColumn(col.name)} className="px-4 py-2 bg-primary text-darker rounded-lg text-xs font-bold flex items-center">
                        <FontAwesomeIcon icon={faSave} className="mr-2" /> Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  // UI MODE BACA NORMAL
                  <div className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-bold text-gray-200 text-sm flex items-center">
                        {col.label}
                        {col.defaultValue && <span className="ml-2 bg-primary/20 text-primary text-[9px] px-2 py-0.5 rounded border border-primary/30">DEFAULT: {col.defaultValue}</span>}
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 mt-1 flex items-center">
                        <span className="bg-gray-800 px-1.5 py-0.5 rounded mr-2">name: {col.name}</span>
                        type: {col.type} {col.options?.length > 0 && `| opts: ${col.options.length}`}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Tombol Kunci Akses (Original) */}
                      <button type="button" onClick={() => handleToggleColumnLock(col.name)} className={`px-3 py-2 rounded-lg text-[10px] font-bold flex items-center ${col.adminLocked ? 'bg-red-950/40 text-red-400 border border-red-900/50' : 'bg-green-950/40 text-green-400 border border-green-900/50'}`}>
                        <FontAwesomeIcon icon={col.adminLocked ? faLock : faLockOpen} />
                      </button>

                      {/* Tombol EDIT Kolom (Baru) */}
                      <button type="button" onClick={() => startEditColumn(col)} className="px-3 py-2 bg-blue-950/40 text-blue-400 border border-blue-900/50 rounded-lg text-[10px] hover:bg-blue-900/60 transition-colors">
                        <FontAwesomeIcon icon={faPenNib} />
                      </button>

                      {/* Tombol HAPUS Kolom (Baru) */}
                      <button type="button" onClick={() => handleDeleteColumn(col.name)} className="px-3 py-2 bg-gray-800 text-red-500 border border-gray-700 rounded-lg text-[10px] hover:bg-red-900/40 transition-colors">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {(!activeSchema || activeSchema.length === 0) && (
              <p className="text-gray-500 text-sm text-center py-4">Belum ada kolom terdaftar pada form ini.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-darker border border-gray-700 p-8 rounded-2xl relative">
        <h2 className="text-xl font-black mb-2 text-white uppercase flex items-center"><FontAwesomeIcon icon={faRobot} className="mr-3 text-primary" /> Gemini AI Auto-Fill Data</h2>
        <p className="text-gray-400 mb-6 text-sm">Upload file data mentah. AI akan menyelaraskan data dengan form aktif.</p>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/50 rounded-xl cursor-pointer bg-dark hover:bg-gray-800">
          <input type="file" accept=".csv" className="hidden" onChange={handleGeminiUpload} />
          <FontAwesomeIcon icon={faUpload} className="text-3xl text-primary mb-3" />
        </label>
      </div>

      <div className="bg-darker border border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 bg-dark border-b border-gray-700 flex items-center">
          <FontAwesomeIcon icon={faCloud} className="text-xl text-primary mr-4" />
          <h3 className="font-bold text-white uppercase text-sm">Daftar Link Distribusi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark/50 text-gray-400 text-xs uppercase border-b border-gray-800">
              <tr><th className="p-5">Judul</th><th className="p-5 text-center">Status</th><th className="p-5 text-center">Link</th><th className="p-5 text-right">Aksi</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {forms.map(f => {
                const publicLink = `${window.location.origin}/p/${f.id}`;
                const isActive = f.is_active !== false;
                return (
                  <tr key={f.id} className="hover:bg-gray-800/40">
                    <td className="p-5 font-bold text-gray-200">{f.title}</td>
                    <td className="p-5 text-center">
                      <button type="button" onClick={() => handleToggleStatus(f.id, isActive)} className={`px-3 py-1.5 text-[10px] font-black rounded border ${isActive ? 'text-green-400 border-green-500/20' : 'text-red-400 border-red-500/20'}`}>
                        {isActive ? 'OPEN' : 'CLOSED'}
                      </button>
                    </td>
                    <td className="p-5 text-center">
                      <button type="button" onClick={() => { navigator.clipboard.writeText(publicLink); toast.success('Link disalin!'); }} className="px-4 py-2 bg-primary text-darker font-bold rounded-lg text-xs uppercase hover:bg-yellow-500">
                        Copy Link
                      </button>
                    </td>
                    <td className="p-5 flex justify-end space-x-2">
                      {f.spreadsheet_link && <a href={f.spreadsheet_link} target="_blank" rel="noreferrer" className="p-2.5 bg-gray-800 text-primary rounded-lg"><FontAwesomeIcon icon={faEye} /></a>}
                      <button type="button" onClick={() => handleDeleteForm(f.id)} className="p-2.5 bg-red-950/20 text-red-400 rounded-lg"><FontAwesomeIcon icon={faTrash} /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}