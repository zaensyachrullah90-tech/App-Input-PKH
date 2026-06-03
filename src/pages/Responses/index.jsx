import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faFilter, faFileDownload, faFileExcel, faPrint, faTimes, faFilePdf, faTrash, faCheck } from '@fortawesome/free-solid-svg-icons';
import toast, { Toaster } from 'react-hot-toast';

export default function Responses() {
  const [responses, setResponses] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSchema, setActiveSchema] = useState([]);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState(() => {
    const cachedMeta = localStorage.getItem('smart_export_meta_cache');
    return cachedMeta ? JSON.parse(cachedMeta) : {
      noSurat: '', jabatan: 'Koordinator Kabupaten PKH', nama: '', nik: ''
    };
  });

  useEffect(() => { fetchForms(); }, []);
  useEffect(() => { if (selectedFormId) fetchResponses(selectedFormId); }, [selectedFormId]);

  const fetchForms = async () => {
    const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false });
    if (data) {
      setForms(data);
      if (data.length > 0) setSelectedFormId(data[0].id);
    }
  };

  const fetchResponses = async (formId) => {
    if (!formId) return;
    setLoading(true);
    const formConfig = forms.find(f => f.id === formId);
    if (formConfig) setActiveSchema(formConfig.schema || []);
    const { data } = await supabase.from('form_responses').select('*, forms(title)').eq('form_id', formId).order('created_at', { ascending: false });
    if (data) setResponses(data);
    setLoading(false);
  };

  const handleMetaChange = (key, value) => {
    const updatedMeta = { ...exportMeta, [key]: value };
    setExportMeta(updatedMeta);
    localStorage.setItem('smart_export_meta_cache', JSON.stringify(updatedMeta));
  };

  // FULL CRUD ADMIN DATA (Menjamin Blueprint tidak terpotong)
  const handleAdminDelete = async (id) => {
    if (!window.confirm('Hapus arsip ini secara permanen?')) return;
    try {
      await supabase.from('form_responses').delete().eq('id', id);
      toast.success('Data dihapus permanen.');
      fetchResponses(selectedFormId);
    } catch (err) {}
  };

  const handleRejectDelete = async (resItem) => {
    try {
      const updatedData = { ...resItem.data };
      delete updatedData.delete_request_status;
      await supabase.from('form_responses').update({ data: updatedData }).eq('id', resItem.id);
      toast.success('Permintaan hapus ditolak.');
      fetchResponses(selectedFormId);
    } catch (err) {}
  };

  const handleExportExcel = () => {
    if (responses.length === 0) return toast.error('Kosong.');
    const formTitle = forms.find(f => f.id === selectedFormId)?.title || 'LAPORAN';

    const headerMetadata = [['LAMPIRAN NOMOR', `="${exportMeta.noSurat.toUpperCase()}"`], ['PERIHAL', `="DATA ${formTitle.toUpperCase()}"`], [] ];
    const tableHeaders = activeSchema.map(col => col.label);
    const reversedResponses = [...responses].reverse();

    const csvData = reversedResponses.map((res, index) => {
      const row = [];
      activeSchema.forEach(col => {
        const colNameLower = col.name.toLowerCase();
        if (colNameLower === 'no' || colNameLower === 'nomor') {
          row.push(index + 1);
        } else {
          let cellValue = res.data[col.name] || '-';
          if (typeof cellValue === 'string') {
            cellValue = cellValue.replace(/"/g, '""');
            if (cellValue.includes(',') || cellValue.includes('\n')) cellValue = `"${cellValue}"`;
          }
          row.push(cellValue);
        }
      });
      return row;
    });

    const emptyPadding = Array(Math.max(1, tableHeaders.length - 2)).fill(''); 
    const footerMetadata = [[], [], [...emptyPadding, 'MENGETAHUI,'], [...emptyPadding, `="${exportMeta.jabatan}"`], [], [], [], [...emptyPadding, `="${exportMeta.nama}"`], [...emptyPadding, `="NIK/NIP. ${exportMeta.nik}"`]];

    const csvContent = [...headerMetadata.map(e => e.join(',')), tableHeaders.join(','), ...csvData.map(e => e.join(',')), ...footerMetadata.map(e => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Lampiran_Excel_${formTitle}.csv`;
    link.click();
    setShowExportModal(false);
  };

  // PDF BERSIH TOTAL
  const handleExportPDF = () => {
    if (responses.length === 0) return toast.error('Kosong.');
    const formTitle = forms.find(f => f.id === selectedFormId)?.title || 'LAPORAN';
    const printWindow = window.open('', '_blank');
    const reversedResponses = [...responses].reverse();

    const tableHeadersHTML = activeSchema.map(col => `<th>${col.label}</th>`).join('');
    const tableRowsHTML = reversedResponses.map((res, index) => {
      return `<tr>${activeSchema.map(col => {
            const colNameLower = col.name.toLowerCase();
            let val = res.data[col.name] || '-';
            if (colNameLower === 'no' || colNameLower === 'nomor') val = index + 1;
            return `<td>${val}</td>`;
          }).join('')}</tr>`;
    }).join('');

    printWindow.document.write(`
      <html><head><title></title>
        <style>
          /* MARGIN 0 MEMBUNUH TULISAN WAKTU DAN URL BROWSER */
          @page { size: landscape; margin: 0; }
          body { font-family: 'Arial', sans-serif; color: #000; padding: 15mm; margin: 0; line-height: 1.4; background: #fff; }
          .meta-info { margin-bottom: 20px; font-size: 13px; }
          .meta-info table { width: auto; border: none; margin: 0; }
          .meta-info td { padding: 4px 10px 4px 0; border: none; font-weight: bold; text-transform: uppercase; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; }
          table.data-table th { background: #f3f4f6; border: 1px solid #000; padding: 8px; text-align: left; text-transform: uppercase; font-weight: bold; }
          table.data-table td { border: 1px solid #000; padding: 7px; text-transform: uppercase; }
          .ttd-block { margin-top: 40px; float: right; text-align: left; min-width: 260px; font-size: 13px; page-break-inside: avoid; }
          .ttd-space { height: 70px; }
          .clear { clear: both; }
          @media print { body { padding: 15mm; -webkit-print-color-adjust: exact; } }
        </style>
      </head><body>
        <div class="meta-info"><table><tr><td>LAMPIRAN NOMOR</td><td>: ${exportMeta.noSurat.toUpperCase() || '-'}</td></tr><tr><td>PERIHAL</td><td>: DATA ${formTitle.toUpperCase()}</td></tr></table></div>
        <table class="data-table"><thead><tr>${tableHeadersHTML}</tr></thead><tbody>${tableRowsHTML}</tbody></table>
        <div class="ttd-block"><div>MENGETAHUI,</div><div style="font-weight: bold; margin-top: 2px;">${exportMeta.jabatan}</div><div class="ttd-space"></div><div style="font-weight: bold; text-decoration: underline;">${exportMeta.nama || '-'}</div><div>NIK/NIP. ${exportMeta.nik || '-'}</div></div>
        <div class="clear"></div><script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
      </body></html>
    `);
    printWindow.document.close();
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-fade-in relative">
      <Toaster position="top-right" toastOptions={{ style: { background: '#111827', color: '#fff', border: '1px solid #374151' } }} />
      
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg p-6 md:p-8 rounded-3xl shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowExportModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1 flex items-center"><FontAwesomeIcon icon={faPrint} className="mr-3 text-primary" /> Konfigurasi Lampiran</h3>
            <p className="text-gray-400 text-xs mb-6 border-b border-white/5 pb-4">Data di bawah ini akan diingat otomatis oleh sistem memori browser (Cache).</p>
            <div className="space-y-4">
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nomor Lampiran</label><input type="text" value={exportMeta.noSurat} onChange={e => handleMetaChange('noSurat', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none uppercase font-semibold" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Jabatan TTD</label><input type="text" value={exportMeta.jabatan} onChange={e => handleMetaChange('jabatan', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-semibold" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Nama TTD</label><input type="text" value={exportMeta.nama} onChange={e => handleMetaChange('nama', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-semibold" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">NIK/NIP TTD</label><input type="number" value={exportMeta.nik} onChange={e => handleMetaChange('nik', e.target.value)} className="w-full p-3.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm outline-none font-semibold" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8">
              <button onClick={handleExportExcel} className="p-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl uppercase text-xs flex items-center justify-center gap-2"><FontAwesomeIcon icon={faFileExcel} size="lg" /> Excel</button>
              <button onClick={handleExportPDF} className="p-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl uppercase text-xs flex items-center justify-center gap-2"><FontAwesomeIcon icon={faFilePdf} size="lg" /> PDF</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6 gap-4">
        <div><h2 className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-wide flex items-center"><FontAwesomeIcon icon={faDatabase} className="mr-3 text-primary" /> Executive Data Table</h2></div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select value={selectedFormId} onChange={(e) => setSelectedFormId(e.target.value)} className="p-3.5 rounded-xl bg-darker border border-gray-700 text-white text-sm font-bold w-full sm:w-48"><option value="">Pilih Form...</option>{forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}</select>
          <button onClick={() => setShowExportModal(true)} className="w-full sm:w-auto px-5 py-3.5 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest"><FontAwesomeIcon icon={faPrint} className="mr-2" /> Cetak Lampiran</button>
        </div>
      </div>
      
      <div className="bg-darker rounded-3xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs md:text-sm whitespace-nowrap">
            <thead className="uppercase tracking-wider border-b-2 border-gray-800 bg-black/50">
              <tr>
                {activeSchema.map(col => <th key={col.name} className="px-6 py-5 font-bold text-gray-300">{col.label}</th>)}
                <th className="px-6 py-5 font-black text-gray-400 text-right">Otoritas Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={activeSchema.length + 1} className="text-center py-10 text-gray-500">Memetakan data...</td></tr>
              ) : responses.length > 0 ? (
                responses.map((res, index) => (
                  <tr key={res.id} className={`${index % 2 === 0 ? 'bg-dark/20' : 'bg-darker'} hover:bg-primary/5`}>
                    {activeSchema.map(col => {
                      const colNameLower = col.name.toLowerCase();
                      let displayValue = res.data[col.name] || '-';
                      if (colNameLower === 'no' || colNameLower === 'nomor') displayValue = responses.length - index; 
                      return (
                        <td key={col.name} className="px-6 py-4 text-gray-300 truncate max-w-[200px]">
                          {String(displayValue).startsWith('http') ? <a href={displayValue} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold"><FontAwesomeIcon icon={faFileDownload} className="mr-1.5" /> UNDUH</a> : displayValue}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 flex justify-end space-x-2 items-center">
                      {res.data.delete_request_status === 'pending' ? (
                        <><span className="text-[9px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded animate-pulse">MINTA HAPUS</span><button onClick={() => handleAdminDelete(res.id)} className="px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[10px]"><FontAwesomeIcon icon={faCheck}/></button><button onClick={() => handleRejectDelete(res)} className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-[10px]"><FontAwesomeIcon icon={faTimes}/></button></>
                      ) : <button onClick={() => handleAdminDelete(res.id)} className="px-3 py-1.5 bg-red-950/40 text-red-500 rounded-lg text-[10px] font-bold"><FontAwesomeIcon icon={faTrash} /> Hapus</button>}
                    </td>
                  </tr>
                ))
              ) : <tr><td colSpan={activeSchema.length + 1} className="text-center py-10 text-gray-500">Kosong.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
