import React, { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDatabase, faFilter, faFileDownload, faFileExcel, faPrint, faTimes, faFilePdf } from '@fortawesome/free-solid-svg-icons';
import toast, { Toaster } from 'react-hot-toast';

export default function Responses() {
  const [responses, setResponses] = useState([]);
  const [forms, setForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeSchema, setActiveSchema] = useState([]);

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMeta, setExportMeta] = useState({
    noSurat: '', jabatan: 'KEPALA INSTANSI', nama: '', nik: ''
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

  const handleExportExcel = () => {
    if (responses.length === 0) return toast.error('Tidak ada arsip data untuk diekspor.');
    const formTitle = forms.find(f => f.id === selectedFormId)?.title || 'Data_Export';

    const headerMetadata = [
      ['LAMPIRAN LAPORAN RESMI'],
      ['NOMOR SURAT', `="${exportMeta.noSurat.toUpperCase()}"`],
      ['PERIHAL', `="LAPORAN DATA ${formTitle.toUpperCase()}"`],
      ['TANGGAL CETAK', `="${new Date().toLocaleDateString('id-ID')}"`],
      [] 
    ];

    const tableHeaders = ['Waktu Masuk', 'No. Registrasi Sistem', ...activeSchema.map(col => col.label)];
    const reversedResponses = [...responses].reverse();

    const csvData = reversedResponses.map((res, index) => {
      const row = [new Date(res.created_at).toLocaleString('id-ID'), res.data.nomor_registrasi || '-'];
      activeSchema.forEach(col => {
        const colNameLower = col.name.toLowerCase();
        const colLabelLower = col.label.toLowerCase();
        if (colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor') {
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
    const footerMetadata = [
      [], [], 
      [...emptyPadding, 'Mengetahui,'],
      [...emptyPadding, `="${exportMeta.jabatan.toUpperCase()}"`],
      [], [], [], 
      [...emptyPadding, `="${exportMeta.nama.toUpperCase()}"`],
      [...emptyPadding, `="NIK/NIP. ${exportMeta.nik}"`]
    ];

    const csvContent = [...headerMetadata.map(e => e.join(',')), tableHeaders.join(','), ...csvData.map(e => e.join(',')), ...footerMetadata.map(e => e.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `Lampiran_Excel_${formTitle.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Berkas Excel resmi berhasil diunduh!');
    setShowExportModal(false);
  };

  const handleExportPDF = () => {
    if (responses.length === 0) return toast.error('Tidak ada data untuk dicetak.');
    const formTitle = forms.find(f => f.id === selectedFormId)?.title || 'LAPORAN';
    const printWindow = window.open('', '_blank');
    const reversedResponses = [...responses].reverse();

    const tableHeadersHTML = `<th>Waktu Masuk</th><th>No. Registrasi</th>${activeSchema.map(col => `<th>${col.label}</th>`).join('')}`;
    const tableRowsHTML = reversedResponses.map((res, index) => {
      return `<tr>
          <td>${new Date(res.created_at).toLocaleString('id-ID')}</td>
          <td><strong>${res.data.nomor_registrasi || '-'}</strong></td>
          ${activeSchema.map(col => {
            const colNameLower = col.name.toLowerCase();
            const colLabelLower = col.label.toLowerCase();
            let val = res.data[col.name] || '-';
            if (colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor') val = index + 1;
            return `<td>${val}</td>`;
          }).join('')}
        </tr>`;
    }).join('');

    printWindow.document.write(`
      <html>
      <head>
        <title>Lampiran Laporan - ${formTitle}</title>
        <style>
          body { font-family: 'Arial', sans-serif; color: #000; padding: 30px; line-height: 1.5; background: #fff; }
          .kop-surat { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 25px; }
          .kop-surat h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
          .kop-surat p { margin: 4px 0 0 0; font-size: 12px; color: #333; }
          .meta-info { margin-bottom: 20px; font-size: 13px; }
          .meta-info table { width: auto; border: none; margin: 0; }
          .meta-info td { padding: 3px 8px 3px 0; border: none; font-weight: bold; text-transform: uppercase; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          table.data-table th { background: #f3f4f6; border: 1px solid #000; padding: 8px; text-align: left; text-transform: uppercase; font-weight: bold; }
          table.data-table td { border: 1px solid #000; padding: 7px; }
          .ttd-block { margin-top: 45px; float: right; text-align: left; min-width: 240px; font-size: 13px; page-break-inside: avoid; }
          .ttd-space { height: 75px; }
          .clear { clear: both; }
          @media print { body { padding: 0; } @page { size: A4 portrait; margin: 15mm; } }
        </style>
      </head>
      <body>
        <div class="kop-surat">
          <h1>LAMPIRAN DOKUMEN LAPORAN RESMI PERKANTORAN</h1>
          <p>Sistem Pengolahan Data Otomatis Terintegrasi Cloud & AI Environment</p>
        </div>
        <div class="meta-info">
          <table>
            <tr><td>NOMOR SURAT</td><td>: ${exportMeta.noSurat.toUpperCase() || '-'}</td></tr>
            <tr><td>PERIHAL</td><td>: LAPORAN REKAP DATA ${formTitle.toUpperCase()}</td></tr>
            <tr><td>TANGGAL CETAK</td><td>: ${new Date().toLocaleDateString('id-ID')}</td></tr>
          </table>
        </div>
        <table class="data-table">
          <thead><tr>${tableHeadersHTML}</tr></thead>
          <tbody>${tableRowsHTML}</tbody>
        </table>
        <div class="ttd-block">
          <div>Mengetahui,</div>
          <div style="font-weight: bold; text-transform: uppercase; margin-top: 2px;">${exportMeta.jabatan}</div>
          <div class="ttd-space"></div>
          <div style="font-weight: bold; text-decoration: underline; text-transform: uppercase;">${exportMeta.nama || '-'}</div>
          <div>NIK/NIP. ${exportMeta.nik || '-'}</div>
        </div>
        <div class="clear"></div>
        <script>window.onload = function() { window.print(); setTimeout(function(){ window.close(); }, 500); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
    toast.success('Dokumen Laporan PDF siap dicetak!');
    setShowExportModal(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 p-2 md:p-0 animate-fade-in relative">
      <Toaster position="top-right" toastOptions={{ style: { background: '#111827', color: '#fff', border: '1px solid #374151' } }} />
      
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-darker border border-gray-700 w-full max-w-lg p-6 md:p-8 rounded-3xl shadow-2xl relative animate-fade-in-up">
            <button onClick={() => setShowExportModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FontAwesomeIcon icon={faTimes} size="lg" /></button>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-1 flex items-center"><FontAwesomeIcon icon={faPrint} className="mr-3 text-primary" /> Cetak Laporan Instansi</h3>
            <p className="text-gray-400 text-xs mb-6 border-b border-gray-800 pb-4">Lengkapi data otentikasi di bawah ini untuk mengunduh laporan resmi.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nomor Surat / Lampiran</label>
                <input type="text" value={exportMeta.noSurat} onChange={e => setExportMeta({...exportMeta, noSurat: e.target.value})} placeholder="Cth: 045.2/PKH-TAPIN/2026" className="w-full p-3.5 rounded-xl bg-dark/80 border border-gray-600 text-white text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Jabatan Penandatangan</label>
                <input type="text" value={exportMeta.jabatan} onChange={e => setExportMeta({...exportMeta, jabatan: e.target.value})} className="w-full p-3.5 rounded-xl bg-dark/80 border border-gray-600 text-white text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nama Lengkap Penandatangan</label>
                <input type="text" value={exportMeta.nama} onChange={e => setExportMeta({...exportMeta, nama: e.target.value})} placeholder="Nama beserta gelar lengkap..." className="w-full p-3.5 rounded-xl bg-dark/80 border border-gray-600 text-white text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">NIK / NIP Nomer Pegawai</label>
                <input type="number" value={exportMeta.nik} onChange={e => setExportMeta({...exportMeta, nik: e.target.value})} placeholder="Masukkan NIK/NIP..." className="w-full p-3.5 rounded-xl bg-dark/80 border border-gray-600 text-white text-sm outline-none focus:border-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <button onClick={handleExportExcel} className="p-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all">
                <FontAwesomeIcon icon={faFileExcel} size="lg" /> Simpan Excel
              </button>
              <button onClick={handleExportPDF} className="p-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-2 transition-all">
                <FontAwesomeIcon icon={faFilePdf} size="lg" /> Cetak PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-800 pb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white uppercase tracking-wide flex items-center">
            <FontAwesomeIcon icon={faDatabase} className="mr-3 text-primary" /> Executive Data Table
          </h2>
          <p className="text-gray-400 mt-1 text-xs md:text-sm">Monitoring basis data seluruh tanggapan masuk beserta opsi cetak laporan perkantoran.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-3 bg-darker border border-gray-700 p-1.5 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
            <FontAwesomeIcon icon={faFilter} className="text-gray-500 ml-3" />
            <select 
              value={selectedFormId} 
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="p-1.5 bg-transparent text-white focus:outline-none text-xs md:text-sm font-bold w-full sm:w-48"
            >
              {forms.map(f => <option key={f.id} value={f.id} className="bg-darker">{f.title.toUpperCase()}</option>)}
            </select>
          </div>
          <button onClick={() => setShowExportModal(true)} className="w-full sm:w-auto px-5 py-3.5 bg-primary hover:bg-yellow-500 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center shadow-lg">
            <FontAwesomeIcon icon={faPrint} className="mr-2" /> Cetak Laporan
          </button>
        </div>
      </div>
      
      <div className="bg-darker rounded-3xl shadow-2xl overflow-hidden border border-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs md:text-sm whitespace-nowrap">
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
                <tr><td colSpan={activeSchema.length + 2} className="text-center py-10 text-gray-500">Memetakan basis data cloud...</td></tr>
              ) : responses.length > 0 ? (
                responses.map((res, index) => (
                  <tr key={res.id} className={`${index % 2 === 0 ? 'bg-dark/20' : 'bg-darker'} hover:bg-primary/5 transition-colors`}>
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{new Date(res.created_at).toLocaleString('id-ID')}</td>
                    <td className="px-6 py-4 font-black text-white">{res.data.nomor_registrasi || '-'}</td>
                    
                    {activeSchema.map(col => {
                      const colNameLower = col.name.toLowerCase();
                      const colLabelLower = col.label.toLowerCase();
                      let displayValue = res.data[col.name] || '-';

                      if (colNameLower === 'no' || colLabelLower === 'no' || colNameLower === 'nomor') {
                        displayValue = responses.length - index; 
                      }

                      return (
                        <td key={col.name} className="px-6 py-4 text-gray-300 truncate max-w-[200px]">
                          {String(displayValue).startsWith('http') ? (
                            <a href={displayValue} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center font-bold">
                              <FontAwesomeIcon icon={faFileDownload} className="mr-1.5" /> LIHAT BERKAS
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
                <tr><td colSpan={activeSchema.length + 2} className="text-center py-10 text-gray-500">Arsip data kosong untuk modul form ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
