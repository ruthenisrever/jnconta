'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  FileText, 
  ChevronRight,
  TrendingUp,
  Scale
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function FiscalAuditPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [risks, setRisks] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalRisks: 0, highRiskAmount: 0, cleanInvoiceCount: 0 });

  useEffect(() => {
    fetchAudit();
  }, []);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch(`/api/sat/risk-analysis?companyId=${cid}`);
      if (res.ok) {
        const data = await res.json();
        setRisks(data);
        setStats({
          totalRisks: data.length,
          highRiskAmount: data.filter((r: any) => r.type === 'COMPRA').reduce((s: number, r: any) => s + r.amount, 0),
          cleanInvoiceCount: 0 // Sería ideal traer total facturas vs riesgos
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncBlacklist = async () => {
    setSyncing(true);
    try {
      const res = await apiFetch('/api/sat/sync-efos', { method: 'POST' });
      if (res.ok) {
        alert('Lista negra del SAT (EFOS 69-B) sincronizada correctamente.');
        fetchAudit();
      }
    } catch (err) {
      alert('Error sincronizando con el SAT.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="p-8 text-muted animate-pulse">ANALIZANDO CUMPLIMIENTO FISCAL...</div>;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="flex items-center gap-3">
             <ShieldAlert className="text-error" /> Auditor Fiscal 360°
          </h1>
          <p>Detección automática de EFOS y operaciones de riesgo (Art. 69-B LISR).</p>
        </div>
        <div className="header-actions">
           <button 
              onClick={syncBlacklist}
              disabled={syncing}
              className="btn btn-secondary flex items-center gap-2"
           >
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
              Sincronizar EFOS (SAT)
           </button>
           <button onClick={fetchAudit} className="btn btn-primary flex items-center gap-2">
              <Search size={18} /> Re-escanear Empresa
           </button>
        </div>
      </header>

      {/* RISK STATUS PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div className={`panel border-l-4 ${risks.length > 0 ? 'border-l-error bg-error/5' : 'border-l-success bg-success/5'}`}>
            <div className="flex justify-between items-start mb-4">
               <span className="text-[10px] font-black uppercase tracking-widest text-muted">Integridad Fiscal</span>
               {risks.length > 0 ? <AlertTriangle className="text-error" /> : <ShieldCheck className="text-success" />}
            </div>
            <h3 className={`text-2xl font-black ${risks.length > 0 ? 'text-error' : 'text-success'}`}>
               {risks.length > 0 ? 'RIESGO DETECTADO' : 'ESTADO SALUDABLE'}
            </h3>
            <p className="text-xs text-muted mt-1">
               {risks.length > 0 
                  ? `Se han identificado ${risks.length} operaciones con EFOS.` 
                  : 'No se encontraron RFCs sancionados en su facturación.'}
            </p>
         </div>

         <div className="panel bg-surface-1 border-surface-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-4">Monto en Riesgo (Deducibilidad)</span>
            <div className="text-3xl font-black text-white">${stats.highRiskAmount.toLocaleString()}</div>
            <div className="flex items-center gap-2 text-xs text-error mt-2 font-bold">
               <TrendingUp size={14} /> Riesgo de No Deducibilidad
            </div>
         </div>

         <div className="panel bg-surface-1 border-surface-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-4">Seguimiento Legal</span>
            <div className="text-3xl font-black text-white">0</div>
            <div className="flex items-center gap-2 text-xs text-blue-400 mt-2 font-bold">
               <Scale size={14} /> Oficios de Aclaración
            </div>
         </div>
      </div>

      {/* RESULTS LIST */}
      <div className="panel border-surface-3">
         <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold">Análisis Detallado de Facturación</h3>
            <div className="px-3 py-1 bg-surface-3 rounded-full text-[10px] font-bold text-muted">FACTURAS ESCANEADAS</div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="text-[10px] uppercase font-black tracking-widest text-muted border-b border-surface-3 bg-surface-1/50">
                     <th className="px-4 py-3">Tipo</th>
                     <th className="px-4 py-3">Folio/Factura</th>
                     <th className="px-4 py-3">RFC Contraparte</th>
                     <th className="px-4 py-3">Importe</th>
                     <th className="px-4 py-3">Estatus Riesgo</th>
                     <th className="px-4 py-3">Acción</th>
                  </tr>
               </thead>
               <tbody className="text-sm">
                  {risks.length > 0 ? risks.map((r, i) => (
                     <tr key={i} className="border-b border-surface-3 hover:bg-surface-2 transition-colors group">
                        <td className="px-4 py-4">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.type === 'COMPRA' ? 'bg-error/10 text-error' : 'bg-blue-500/10 text-blue-400'}`}>
                              {r.type}
                           </span>
                        </td>
                        <td className="px-4 py-4 font-mono font-bold text-xs">{r.number}</td>
                        <td className="px-4 py-4 font-bold">{r.rfc}</td>
                        <td className="px-4 py-4 font-black">${r.amount.toLocaleString()}</td>
                        <td className="px-4 py-4">
                           <div className="flex items-center gap-2 text-error font-bold text-xs">
                              <AlertTriangle size={14} /> {r.risk}
                           </div>
                        </td>
                        <td className="px-4 py-4">
                           <button className="p-2 hover:bg-surface-3 rounded-lg text-muted hover:text-white transition-all">
                              <FileText size={16} />
                           </button>
                        </td>
                     </tr>
                  )) : (
                     <tr>
                        <td colSpan={6} className="py-12 text-center text-muted italic">
                           No se han detectado riesgos fiscales en la empresa seleccionada.
                        </td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
