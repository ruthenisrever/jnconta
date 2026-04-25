'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Download, Filter, 
  CheckCircle2, AlertCircle, FileJson, 
  Users, RefreshCw, SendHorizonal
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function DiotPage() {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    setCompanyId(cid);
  }, []);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/diot/preview?companyId=${companyId}&month=${month}&year=${year}`);
      const data = await res.json();
      setPreviewData(data);
    } catch (e) {
      alert('Error cargando previsualización de DIOT');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'}/diot/export?companyId=${companyId}&month=${month}&year=${year}`;
    window.location.href = url;
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Declaración Informativa (DIOT)</h1>
          <p>Genera el archivo TXT para la carga masiva en el portal del SAT.</p>
        </div>
        <div className="header-actions">
           <div className="flex gap-2">
              <select className="search-input py-1 text-sm bg-surface-2" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                  <option key={i} value={i+1}>{m}</option>
                ))}
              </select>
              <select className="search-input py-1 text-sm bg-surface-2" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                {[2023, 2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
           </div>
           <button className="btn btn-secondary flex items-center gap-2" onClick={fetchPreview}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Previsualizar
           </button>
           <button 
             className="btn btn-primary flex items-center gap-2" 
             onClick={handleExport}
             disabled={previewData.length === 0}
           >
              <SendHorizonal size={16} />
              Generar Archivo SAT (.txt)
           </button>
        </div>
      </header>

      {previewData.length > 0 ? (
        <div className="panel animate-in fade-in">
          <div className="flex justify-between items-center mb-6 p-4 bg-primary-600/10 rounded-lg border border-primary-600/20">
             <div className="flex items-center gap-3">
                <Users className="text-primary-400" size={24} />
                <div>
                  <h3 className="text-sm font-bold">Total de Terceros Detallados: {previewData.length}</h3>
                  <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Anexo 8 de la RMF - Formato A-29</p>
                </div>
             </div>
             <div className="text-right">
                <div className="text-xs text-muted uppercase">Base IVA 16% Total</div>
                <div className="text-lg font-bold text-primary-300">
                  ${previewData.reduce((acc, r) => acc + r.base16, 0).toLocaleString()}
                </div>
             </div>
          </div>

          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>RFC / Nombre</th>
                  <th>Tipo Op.</th>
                  <th>Bases (16%, 8%, 0%, Ex)</th>
                  <th>IVA Pagado</th>
                  <th>Retenciones</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-bold text-xs">{row.rfc}</span>
                        <span className="text-[10px] text-muted truncate max-w-[200px]">{row.name}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-secondary">{row.operationType}</span></td>
                    <td>
                      <div className="flex gap-2 text-[10px] items-center">
                         <span title="Base 16%" className="text-primary-400 font-bold">${row.base16.toLocaleString()}</span>
                         <span className="text-surface-4">/</span>
                         <span title="Base 0%" className="text-muted">${row.base0.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="font-bold text-success">${row.iva16.toLocaleString()}</td>
                    <td className="text-danger-light">${row.ivaRetained.toLocaleString()}</td>
                    <td>
                      <span className="flex items-center gap-1 text-[10px] text-success font-bold">
                        <CheckCircle2 size={12} /> LISTO
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !loading && (
        <div className="panel p-12 text-center border-dashed border-2 opacity-50">
           <FileText size={64} className="m-auto mb-4 text-muted" />
           <h3>Simulación de DIOT</h3>
           <p className="text-sm text-muted max-w-sm m-auto mt-2">
              Selecciona el periodo y presiona "Previsualizar" para ver el desglose de operaciones con terceros basado en tus pagos realizados.
           </p>
        </div>
      )}

      <style jsx>{`
        .animate-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
