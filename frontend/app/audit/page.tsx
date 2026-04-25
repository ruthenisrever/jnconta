'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, ShieldCheck, AlertTriangle, Search, 
  RefreshCw, FileWarning, CheckCircle, ExternalLink,
  Zap, Info, List, ArrowDown
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function AuditPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId');
    if (cid) {
      setCompanyId(cid);
      fetchHealth(cid);
    }
  }, []);

  const fetchHealth = async (cid: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/audit/health-audit?companyId=${cid}`);
      const health = await res.json();
      setData(health);
    } catch (e) {
      console.error('Error fetching health audit:', e);
    } finally {
      setLoading(false);
    }
  }

  const handleSyncEfos = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/audit/sync-blacklist', { method: 'POST' });
      fetchHealth(companyId);
    } catch (e) {
      console.error('Error syncing EFOS:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading) return <div className="main-content">Selecciona una empresa para auditar.</div>;

  return (
    <div className="main-content">
      <header className="page-header mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <span className="badge badge-primary flex items-center gap-1">
               <ShieldAlert size={12} /> Auditoría Fiscal Proactiva
             </span>
           </div>
           <h1 className="text-3xl font-extrabold tracking-tight">Audit & SAT Compliance</h1>
           <p className="text-muted">Cumplimiento con la lista 69-B del SAT (EFOS) e integridad de documentos.</p>
        </div>
        
        <div className="flex gap-3">
          <button className="btn btn-secondary flex items-center gap-2" onClick={handleSyncEfos} disabled={loading}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Actualizar Listas SAT
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <Search size={18} /> Escaneo Masivo
          </button>
        </div>
      </header>

      {loading ? (
         <div className="flex items-center justify-center h-64"><div className="spinner lg" /></div>
      ) : (
        <div className="space-y-8">
           
           {/* RISK SCORE CARD */}
           <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="panel glass p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                 <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity ${data?.status === 'HEALTHY' ? 'bg-success' : data?.status === 'WARNING' ? 'bg-warning' : 'bg-danger'}`} />
                 
                 <div className={`w-32 h-32 rounded-full border-8 flex items-center justify-center mb-4 ${data?.status === 'HEALTHY' ? 'border-success/20 text-success' : data?.status === 'WARNING' ? 'border-warning/20 text-warning' : 'border-danger/20 text-danger'}`}>
                    <span className="text-4xl font-black">{data?.riskScore}</span>
                 </div>
                 <h3 className="text-xl font-bold mb-1">Fiscal Health Score</h3>
                 <p className={`text-sm font-bold uppercase tracking-widest ${data?.status === 'HEALTHY' ? 'text-success' : data?.status === 'WARNING' ? 'text-warning' : 'text-danger'}`}>
                   Estado: {data?.status}
                 </p>
              </div>

              <div className="lg:col-span-2 grid grid-cols-2 gap-6">
                 <div className="panel glass p-6">
                    <h4 className="text-muted text-xs font-black mb-4 uppercase tracking-tighter">Integridad Documental</h4>
                    <div className="space-y-4">
                       <div>
                          <div className="flex justify-between items-center mb-1 text-sm font-bold">
                             <span>Facturas Recibidas vs XML</span>
                             <span className="font-mono">{data?.integrity?.bills?.withXml} / {data?.integrity?.bills?.total}</span>
                          </div>
                          <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                             <div className="bg-primary h-full rounded-full" style={{ width: `${(data?.integrity?.bills?.withXml / (data?.integrity?.bills?.total || 1)) * 100}%` }} />
                          </div>
                       </div>
                       <div>
                          <div className="flex justify-between items-center mb-1 text-sm font-bold">
                             <span>Facturas Emitidas vs SAT</span>
                             <span className="font-mono">{data?.integrity?.invoices?.withXml} / {data?.integrity?.invoices?.total}</span>
                          </div>
                          <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                             <div className="bg-success h-full rounded-full" style={{ width: `${(data?.integrity?.invoices?.withXml / (data?.integrity?.invoices?.total || 1)) * 100}%` }} />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="panel glass p-6 border-l-4 border-l-danger">
                    <h4 className="text-danger text-xs font-black mb-4 uppercase tracking-tighter flex items-center gap-2">
                       <Zap size={14} /> Alerta de Riesgo EFOS
                    </h4>
                    <div className="flex flex-col items-center justify-center h-full gap-2 -mt-4">
                       <span className={`text-5xl font-black ${data?.efos?.detected > 0 ? 'text-danger animate-pulse' : 'text-muted'}`}>
                          {data?.efos?.detected}
                       </span>
                       <span className="text-xs text-muted font-bold">Proveedores en el listado 69-B</span>
                    </div>
                 </div>
              </div>
           </section>

           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              
              {/* LISTA EFOS DETECTADOS */}
              <section className="panel glass overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex items-center justify-between bg-danger/5">
                    <h3 className="font-bold flex items-center gap-2"><FileWarning className="text-danger" size={18} /> Proveedores Sancionados (EFOS)</h3>
                    <span className="badge badge-danger">Crítico</span>
                 </div>
                 <div className="p-0 max-h-[400px] overflow-y-auto">
                    {data?.efos?.items?.length === 0 ? (
                       <div className="p-12 text-center text-muted">
                          <CheckCircle size={48} className="mx-auto mb-4 text-success opacity-20" />
                          <p className="font-medium text-success/60">No se detectaron proveedores en listas negras del SAT.</p>
                       </div>
                    ) : (
                       <table className="w-full text-sm">
                          <thead className="bg-surface-2/30 text-muted sticky top-0">
                             <tr>
                                <th className="px-6 py-3 text-left">RFC / Razón Social</th>
                                <th className="px-6 py-3 text-right">Estatus SAT</th>
                                <th className="px-6 py-3 text-right">Acción</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {data?.efos?.items?.map((item: any, i: number) => (
                                <tr key={i} className="hover:bg-white/5 transition-colors">
                                   <td className="px-6 py-4">
                                      <div className="font-black">{item.rfc}</div>
                                      <div className="text-xs text-muted truncate max-w-xs">{item.name}</div>
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      <span className="badge badge-danger text-[10px]">{item.status}</span>
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      <button className="text-primary hover:text-white transition-colors"><ExternalLink size={14} /></button>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    )}
                 </div>
              </section>

              {/* CONCILIACIÓN XML VS CONTABILIDAD */}
              <section className="panel glass overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2"><List className="text-primary" size={18} /> Integridad de Captura</h3>
                    <span className="text-xs text-muted font-mono">VS JOURNALS</span>
                 </div>
                 <div className="p-8">
                    <div className="flex items-start gap-4 mb-8">
                       <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20">
                          <AlertTriangle className="text-warning" size={24} />
                       </div>
                       <div>
                          <h4 className="font-bold text-lg mb-1">Recomendación Fiscal</h4>
                          <p className="text-sm text-muted">
                             Se detectaron <strong>24 archivos XML</strong> sin una póliza contable asociada. 
                             Esto podría generar discrepancias en la balanza de comprobación mensual.
                          </p>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <button className="btn btn-secondary w-full justify-between h-14 group">
                          <span className="flex items-center gap-2">
                             <FileWarning size={18} className="text-warning" /> Ver XMLs sin Contabilizar
                          </span>
                          <span className="badge badge-warning group-hover:bg-white/10">24 pendientes</span>
                       </button>
                       <button className="btn btn-secondary w-full justify-between h-14 group">
                          <span className="flex items-center gap-2">
                             <ShieldCheck size={18} className="text-success" /> Historial de Validaciones
                          </span>
                          <ArrowDown size={18} className="text-muted" />
                       </button>
                    </div>
                 </div>
              </section>
           </div>
        </div>
      )}

      <style jsx>{`
        .glass { 
          background: rgba(16, 24, 39, 0.4); 
          backdrop-filter: blur(12px); 
          border: 1px solid rgba(255, 255, 255, 0.05);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
      `}</style>
    </div>
  );
}
