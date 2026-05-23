import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faRobot, faUpload, faSpinner, faPlus, faCog, faCloud, faLink, faFileExcel, faPenNib, faTrash, faPowerOff, faLock, faLockOpen, faEye, faEdit, faSave, faTimes, faFolder } from '@fortawesome/free-solid-svg-icons';

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
  
  // STATE EDIT KOLOM (FULL CRUD) YANG DIKEMBALIKAN UTUH
  const [editingColName, setEditingColName] = useState(null);
  const [editColData, setEditColData] = useState({});
  
  // STATE CONFIG ID FOLDER GOOGLE DRIVE
  const [driveFolderId, setDriveFolderId] = useState(localStorage.getItem('global_drive_folder_id') || '');

  useEffect(() => { fetchForms(); }, []);

  useEffect(() => {
    if (selectedFormId) {
      const current = forms.find(f => f.id === selectedFormId);
      if (current) setActiveSchema(current.schema || []);
    }
  }, [selectedFormId, forms]);

  const saveFolderId = () => {
    localStorage.setItem('global_drive_folder_id', driveFolderId.trim());
    toast.success('ID Folder Google Drive berhasil dikunci permanen!');
  };

  const fetchForms = async () => {
    const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
    if (data) {
      setForms(data);
      if (data.length > 0 && !selectedFormId) setSelectedFormId(data[0].id);
    }
  };

  const handleDeleteForm = async (id) => {
    if (!window.confirm('Hapus form ini beserta seluruh datanya secara permanen?')) return;
    setForms(forms.filter(f => f.id !== id));
    if (selectedFormId === id) setSelectedFormId('');
    await supabase.from('forms').delete().eq('id', id);
    toast.success('Formulir berhasil dihapus.');
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    setForms(forms.map(f => f.id === id ? { ...f, is_active: newStatus } : f));
    toast.success(newStatus ? 'Form Publik Dibuka' : 'Form Publik Ditutup');
    await supabase.from('forms').update({ is_active: newStatus }).eq('id', id);
  };

  const executeFormCreation = async (finalSchema, finalLink, finalDriveId = '') => {
    try {
      const { error } = await supabase.from('forms').insert([{ title: newForm.title, description: newForm.description, spreadsheet_link: finalLink, spreadsheet_id: finalDriveId, schema: finalSchema, is_active: true }]);
      if (error) throw error;
      toast.success('Sistem Cerdas Berhasil Di-Generate!', { id: 'create' });
      setNewForm({ title: '', description: '', link: '' });
      fetchForms();
    } catch (err) { toast.error('Gagal menyimpan form ke database.', { id: 'create' }); } 
    finally { setIsProcessing(false); }
  };

  const handleCreateManual = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    toast.loading('Membangun Form...', { id: 'create' });
    let finalLink = ''; let driveId = '';
    const schema = [
      { name: 'no', label: 'NO', type: 'number', adminLocked: true, defaultValue: '' },
      { name: 'nama', label: 'NAMA LENGKAP', type: 'text', adminLocked: false, defaultValue: '' }
    ];
    try {
      const res = await fetch('/api/sync-google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createForm', title: newForm.title, folderId: driveFolderId })
      });
      if (res.ok) {
        const googleData = await res.json();
        finalLink = googleData.spreadsheetUrl; driveId = googleData.spreadsheetId;
      }
    } catch (err) { console.warn('API Offline.'); }
    executeFormCreation(schema, finalLink, driveId);
  };

  const handleExtractFromLink = async (e) => {
    e.preventDefault();
    if (!newForm.link) return toast.error('Paste link Spreadsheet!');
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
        if (!rows || rows.length === 0) { toast.error('Spreadsheet kosong.', { id: 'create' }); setIsProcessing(false); return; }
        let headerRow = [];
        for (let i = 0; i < Math.min(5, rows.length); i++) { if (rows[i].length > headerRow.length) headerRow = rows[i]; }
        const generatedSchema = headerRow.map(item => {
          const cleanLabel = item.trim();
          return {
            name: cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '_'), label: cleanLabel.toUpperCase(),
            type: cleanLabel.toLowerCase().includes('tanggal') ? 'date' : cleanLabel.toLowerCase().includes('nik') ? 'number' : 'text',
            adminLocked: false, defaultValue: ''
          };
        }).filter(item => item.name !== '');

        if (!generatedSchema.some(s => s.name === 'no')) {
          generatedSchema.unshift({ name: 'no', label: 'NO', type: 'number', adminLocked: true, defaultValue: '' });
        }
        executeFormCreation(generatedSchema, newForm.link, sheetId);
      },
      error: () => { toast.error('Gagal mengakses Link.', { id: 'create' }); setIsProcessing(false); }
    });
  };

  const handleExtractFromFile = (e) => {
    const file = e.target.files[0];
    if (!file || !newForm.title) return toast.error('Isi judul form!');
    setIsProcessing(true); toast.loading('Memproses File Upload...', { id: 'create' });
    Papa.parse(file, {
      header: false, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        let headerRow = [];
        for (let i = 0; i < Math.min(5, rows.length); i++) { if (rows[i].length > headerRow.length) headerRow = rows[i]; }
        const generatedSchema = headerRow.map(item => {
          const cleanLabel = item.trim();
          return {
            name: cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '_'), label: cleanLabel.toUpperCase(),
            type: cleanLabel.toLowerCase().includes('tanggal') ? 'date' : cleanLabel.toLowerCase().includes('nik') ? 'number' : 'text',
            adminLocked: false, defaultValue: ''
          };
        }).filter(item => item.name !== '');

        let finalLink = ''; let driveId = '';
        try {
          const res = await fetch('/api/sync-google', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'createForm', title: newForm.title, folderId: driveFolderId })
          });
          if (res.ok) {
            const googleData = await res.json();
            finalLink = googleData.spreadsheetUrl; driveId = googleData.spreadsheetId;
          }
        } catch (err) {}
        executeFormCreation(generatedSchema, finalLink, driveId);
      }
    });
  };

  // TAMBAH KOLOM
  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!selectedFormId) return toast.error('Pilih form target!');
    const dropdownOptions = newColumn.type === 'select' && newColumn.options ? newColumn.options.split(',').map(opt => opt.trim()) : [];
    const updatedSchema = [...activeSchema, { 
      name: newColumn.name.toLowerCase().replace(/\s+/g, '_'), 
      label: newColumn.label.toUpperCase(), type: newColumn.type, defaultValue: newColumn.defaultValue, options: dropdownOptions, adminLocked: false
    }];
    setActiveSchema(updatedSchema);
    setNewColumn({ name: '', label: '', type: 'text', defaultValue: '', options: '' });
    toast.success('Kolom ditambahkan!');
    await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
    fetchForms();
  };

  // HAPUS KOLOM (CRUD)
  const handleDeleteColumn = async (colName) => {
    if (!window.confirm(`Hapus kolom "${colName}" dari database? Data yang masuk tidak akan terhapus, hanya disembunyikan.`)) return;
    const updatedSchema = activeSchema.filter(col => col.name !== colName);
    setActiveSchema(updatedSchema);
    await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
    toast.success('Kolom dihapus.');
    fetchForms();
  };

  // EDIT KOLOM (CRUD)
  const startEditColumn = (col) => {
    setEditingColName(col.name);
    setEditColData({ ...col, options: col.options ? col.options.join(', ') : '' });
  };

  const saveEditColumn = async () => {
    const dropdownOptions = editColData.type === 'select' && editColData.options ? editColData.options.split(',').map(opt => opt.trim()) : [];
    const updatedSchema = activeSchema.map(col => col.name === editingColName ? { ...editColData, options: dropdownOptions } : col);
    setActiveSchema(updatedSchema);
    setEditingColName(null);
    toast.success('Perubahan kolom disimpan!');
    await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
    fetchForms();
  };

  const handleToggleColumnLock = async (colName) => {
    const updatedSchema = activeSchema.map(col => col.name === colName ? { ...col, adminLocked: !col.adminLocked } : col);
    setActiveSchema(updatedSchema);
    await supabase.from('forms').update({ schema: updatedSchema }).eq('id', selectedFormId);
  };

  const handleGeminiUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedFormId) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        setIsProcessing(true); const toastId = toast.loading('Gemini AI memvalidasi data...');
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const prompt = `Rapikan JSON berikut: ${JSON.stringify(results.data)}. Kapitalisasi nama. NIK angka murni. Kembalikan HANYA array JSON murni tanpa markdown.`;
          const result = await model.generateContent(prompt);
          const cleanedData = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
          const insertPayload = cleanedData.map(row => ({ form_id: selectedFormId, data: row, kabupaten: row.kabupaten || 'Sistem' }));
          await supabase.from('form_responses').insert(insertPayload);
          toast.success('AI Auto-Fill berhasil!', { id: toastId });
        } catch (err) { toast.error('AI gagal ekstrak.', { id: toastId }); } finally { setIsProcessing(false); e.target.value = null; }
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 p-3 md:p-0 animate-fade-in">
      <div className="border-b border-gray-800 pb-6"><h1 className="text-3xl font-extrabold text-white uppercase flex items-center"><FontAwesomeIcon icon={faCog} className="mr-3 text-primary" /> System Control Center</h1></div>

      <div className="bg-darker border border-gray-700 p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-green-600"></div>
        <label className="text-xs font-black text-green-400 uppercase tracking-widest block mb-2"><FontAwesomeIcon icon={faFolder} className="mr-2" /> Google Drive Destination Folder ID</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder="Masukkan ID Folder Cloud (Contoh: 1lPl2iqUKuxWi5vag23...)" value={driveFolderId} onChange={(e) => setDriveFolderId(e.target.value)} className="flex-1 p-3.5 rounded-xl bg-dark border border-gray-600 text-white font-mono text-xs focus:border-green-500 outline-none" />
          <button type="button" onClick={saveFolderId} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase rounded-xl">Kunci Folder ID</button>
        </div>
      </div>

      <div className="bg-darker border border-gray-700 p-5 md:p-8 rounded-2xl relative">
        <h2 className="text-xl font-bold mb-6 text-white uppercase flex items-center"><FontAwesomeIcon icon={faPlus} className="mr-3 text-primary" /> Auto Form Generator</h2>
        <div className="flex bg-dark/50 p-1.5 rounded-xl border border-gray-700 mb-4 overflow-x-auto">
          <button type="button" onClick={() => setCreationMode('manual')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase whitespace-nowrap ${creationMode === 'manual' ? 'bg-primary text-darker' : 'text-gray-400'}`}>Manual Build</button>
          <button type="button" onClick={() => setCreationMode('file')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase whitespace-nowrap ${creationMode === 'file' ? 'bg-primary text-darker' : 'text-gray-400'}`}>Extract Excel</button>
          <button type="button" onClick={() => setCreationMode('link')} className={`flex-1 py-3 px-4 rounded-lg font-bold text-xs uppercase whitespace-nowrap ${creationMode === 'link' ? 'bg-primary text-darker' : 'text-gray-400'}`}>Sync Link</button>
        </div>
        <form onSubmit={creationMode === 'manual' ? handleCreateManual : creationMode === 'link' ? handleExtractFromLink : (e) => e.preventDefault()} className="space-y-4">
          <input type="text" required placeholder="Judul Form Utama" value={newForm.title} onChange={(e) => setNewForm({...newForm, title: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white outline-none" />
          <textarea placeholder="Deskripsi form..." required value={newForm.description} onChange={(e) => setNewForm({...newForm, description: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white outline-none h-20 resize-none" />
          {creationMode === 'link' && <input type="url" required placeholder="Tautan Google Spreadsheet..." value={newForm.link} onChange={(e) => setNewForm({...newForm, link: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-primary/50 text-white outline-none" />}
          {creationMode === 'file' ? (
             <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/50 rounded-xl cursor-pointer bg-dark/50 hover:bg-gray-800">
               <input type="file" accept=".csv" className="hidden" onChange={handleExtractFromFile} disabled={isProcessing || !newForm.title} />
               <FontAwesomeIcon icon={faFileExcel} className="text-3xl text-primary mb-2" />
               <p className="text-sm font-bold text-gray-300">Unggah CSV untuk Scan Header</p>
             </label>
          ) : (
            <button type="submit" disabled={isProcessing} className="w-full bg-primary text-darker font-black py-4 rounded-xl uppercase tracking-widest flex justify-center items-center">
              {isProcessing ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Generate Form'}
            </button>
          )}
        </form>
      </div>

      <div className="bg-darker border border-gray-700 p-6 rounded-2xl flex items-center space-x-6">
        <label className="text-sm font-bold text-gray-400 uppercase tracking-widest min-w-max">Target Form Aktif:</label>
        <select value={selectedFormId} onChange={(e) => setSelectedFormId(e.target.value)} className="w-full p-4 rounded-xl bg-dark border border-gray-600 text-white outline-none font-semibold">
          {forms.map(f => <option key={f.id} value={f.id}>{f.title.toUpperCase()}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-darker border border-gray-700 p-5 md:p-8 rounded-2xl h-fit">
          <h2 className="text-lg font-bold mb-4 text-white uppercase border-b border-gray-800 pb-3 flex items-center"><FontAwesomeIcon icon={faDatabase} className="mr-3 text-primary" /> Suntik Kolom Baru</h2>
          <form onSubmit={handleAddColumn} className="space-y-4">
            <input type="text" required placeholder="ID Database (Tanpa Spasi)" value={newColumn.name} onChange={(e) => setNewColumn({...newColumn, name: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white text-sm outline-none" />
            <input type="text" required placeholder="Label Tampilan UI" value={newColumn.label} onChange={(e) => setNewColumn({...newColumn, label: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white text-sm outline-none" />
            <select value={newColumn.type} onChange={(e) => setNewColumn({...newColumn, type: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white text-sm outline-none">
              <option value="text">Teks Pendek</option><option value="number">Angka / Kode</option><option value="date">Tanggal</option>
              <option value="currency">Mata Uang Rp.</option><option value="select">Dropdown (Pilihan)</option><option value="file">Upload Berkas (Drive)</option>
            </select>
            {newColumn.type === 'select' && <textarea required placeholder="Pilihan dipisah koma (Cth: A, B, C)" value={newColumn.options} onChange={(e) => setNewColumn({...newColumn, options: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-primary/50 text-white text-sm outline-none h-20" />}
            <input type="text" placeholder="Nilai Bawaan / Default Value" value={newColumn.defaultValue} onChange={(e) => setNewColumn({...newColumn, defaultValue: e.target.value})} className="w-full p-4 rounded-xl bg-dark/50 border border-gray-600 text-white text-sm outline-none" />
            <button type="submit" className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl uppercase text-xs">Suntik Struktur Kolom</button>
          </form>
        </div>

        {/* FULL CRUD EDITOR KOLOM */}
        <div className="bg-darker border border-gray-700 p-5 md:p-8 rounded-2xl lg:col-span-2">
          <h2 className="text-lg font-bold mb-4 text-white uppercase border-b border-gray-800 pb-3 flex items-center"><FontAwesomeIcon icon={faPenNib} className="mr-3 text-primary" /> Manajemen Struktur Skema (CRUD)</h2>
          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {activeSchema.map((col) => (
              <div key={col.name} className="flex flex-col p-4 bg-dark/40 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
                {editingColName === col.name ? (
                  <div className="space-y-3 animate-fade-in bg-black/50 p-4 rounded-lg border border-primary/30">
                     <div className="text-xs font-bold text-primary mb-2">EDIT KOLOM: {col.name}</div>
                     <input type="text" value={editColData.label} onChange={(e) => setEditColData({...editColData, label: e.target.value})} className="w-full p-2 bg-dark border border-gray-600 text-white text-xs rounded" placeholder="Label UI" />
                     <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                       <select value={editColData.type} onChange={(e) => setEditColData({...editColData, type: e.target.value})} className="w-full sm:w-1/2 p-2 bg-dark border border-gray-600 text-white text-xs rounded">
                         <option value="text">Teks</option><option value="number">Angka</option><option value="date">Tanggal</option><option value="currency">Mata Uang Rp.</option><option value="select">Dropdown</option><option value="file">File</option>
                       </select>
                       <input type="text" value={editColData.defaultValue || ''} onChange={(e) => setEditColData({...editColData, defaultValue: e.target.value})} className="w-full sm:w-1/2 p-2 bg-dark border border-gray-600 text-white text-xs rounded" placeholder="Default Value" />
                     </div>
                     {editColData.type === 'select' && <textarea value={editColData.options} onChange={(e) => setEditColData({...editColData, options: e.target.value})} className="w-full p-2 bg-dark border border-gray-600 text-white text-xs rounded h-16" placeholder="Opsi A, Opsi B" />}
                     <div className="flex justify-end space-x-2 pt-2">
                       <button onClick={() => setEditingColName(null)} className="px-3 py-1 bg-gray-700 text-white text-xs rounded"><FontAwesomeIcon icon={faTimes} /> Batal</button>
                       <button onClick={saveEditColumn} className="px-3 py-1 bg-primary text-black font-bold text-xs rounded"><FontAwesomeIcon icon={faSave} /> Simpan</button>
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-200 text-sm flex items-center">{col.label} {col.defaultValue && <span className="ml-2 bg-primary/20 text-primary text-[9px] px-2 py-0.5 rounded border border-primary/30">DEF: {col.defaultValue}</span>}</div>
                      <div className="text-[10px] font-mono text-gray-500 mt-1">type: {col.type} | field_id: {col.name}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => handleToggleColumnLock(col.name)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center ${col.adminLocked ? 'bg-red-950/40 text-red-400 border border-red-900/50' : 'bg-green-950/40 text-green-400 border border-green-900/50'}`}><FontAwesomeIcon icon={col.adminLocked ? faLock : faLockOpen} className="mr-1" /> {col.adminLocked ? 'LOCK' : 'OPEN'}</button>
                      <button onClick={() => startEditColumn(col)} className="px-3 py-1.5 bg-blue-950/40 text-blue-400 border border-blue-900/50 rounded-lg text-[10px]"><FontAwesomeIcon icon={faEdit}/></button>
                      <button onClick={() => handleDeleteColumn(col.name)} className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-[10px]"><FontAwesomeIcon icon={faTrash}/></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-darker border border-gray-700 p-8 rounded-2xl relative">
        <h2 className="text-xl font-black mb-2 text-white uppercase flex items-center"><FontAwesomeIcon icon={faRobot} className="mr-3 text-primary" /> Gemini AI Auto-Fill Data</h2>
        <p className="text-gray-400 mb-6 text-sm">Upload file data mentah. AI akan menyelaraskan data dengan form aktif secara cerdas.</p>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/50 rounded-xl cursor-pointer bg-dark hover:bg-gray-800">
          <input type="file" accept=".csv" className="hidden" onChange={handleGeminiUpload} />
          <FontAwesomeIcon icon={faUpload} className="text-3xl text-primary mb-3" />
        </label>
      </div>

      <div className="bg-darker border border-gray-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 bg-dark border-b border-gray-700 flex items-center"><FontAwesomeIcon icon={faCloud} className="text-xl text-primary mr-4" /><h3 className="font-bold text-white uppercase text-sm">Daftar Link Distribusi</h3></div>
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
                    <td className="p-5 text-center"><button type="button" onClick={() => handleToggleStatus(f.id, isActive)} className={`px-3 py-1.5 text-[10px] font-black rounded border ${isActive ? 'text-green-400 border-green-500/20' : 'text-red-400 border-red-500/20'}`}>{isActive ? 'OPEN' : 'CLOSED'}</button></td>
                    <td className="p-5 text-center"><button type="button" onClick={() => { navigator.clipboard.writeText(publicLink); toast.success('Link disalin!'); }} className="px-4 py-2 bg-primary text-darker font-bold rounded-lg text-xs uppercase">Copy Link</button></td>
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
