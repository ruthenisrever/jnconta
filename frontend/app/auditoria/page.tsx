'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertCircle, FileCode, BookOpen, 
  Search, Filter, ArrowRight, CheckCircle2, 
  XCircle, Info, ChevronRight, BarChart3,
  Calendar, Download, ExternalLink, Activity
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function AuditoriaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'missingJournal' | 'missingXml' | 'compliant'>('missingJournal');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [companyId, setCompanyId] = useState('');
  const [verifyingSat, setVerifyingSat] = useState(false);
  const [verifyingEfos, setVerifyingEfos] = useState(false);

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    setCompanyId(cid);
    fetchAudit(cid, year, month);
  }, []);

  const fetchAudit = async (cid: string, y: string, m: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/audit/summary?companyId=${cid}&year=${y}&month=${m}`);
      const auditData = await res.json();
      setData(auditData);
    } catch (e) {
      console.error('Error fetching audit:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    fetchAudit(companyId, year, month);
  };

  const handleVerifySat = async () => {
    setVerifyingSat(true);
    try {
      const res = await apiFetch('/api/audit/verify-sat', {
        method: 'POST',
        body: JSON.stringify({ companyId, year, month })
      });
      if (res.ok) {
        const val = await res.json();
        alert(`Verificación SAT completada.\nXMLs vigentes: ${val.vigentes}\nXMLs Cancelados/Rechazados: ${val.cancelados}`);
        fetchAudit(companyId, year, month);
      }
    } catch(e) {}
    setVerifyingSat(false);
  };

  const handleVerifyEfos = async () => {
    setVerifyingEfos(true);
    try {
      const res = await apiFetch('/api/audit/verify-efos', {
        method: 'POST',
        body: JSON.stringify({ companyId, year, month })
      });
      if (res.ok) {
        const val = await res.json();
        if (val.efosDetectados > 0) {
          alert(`¡ALERTA FISCAL!\nSe detectaron ${val.efosDetectados} facturas de EFOS (Listado 69-B del SAT) en este mes. Se han marcado como rechazadas y no deducibles.\nProveedor: ${val.efosList[0]?.nombre}`);
        } else {
          alert('¡Todo limpio! No se detectaron operaciones con empresas facturadoras de operaciones simuladas (EFOS).');
        }
        fetchAudit(companyId, year, month);
      }
    } catch(e) {}
    setVerifyingEfos(false);
  };

  const complianceScore = data ? Math.round((data.stats.okCount / (data.stats.totalXmls || 1)) * 100) : 0;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600/20 rounded-lg">
              <ShieldCheck className="text-primary-400" size={24} />
            </div>
            <div>
              <h1>Auditoría Fiscal 360°</h1>
              <p>Reconciliación automática y validación contra listas negras (69-B).</p>
            </div>
          </div>
        </div>
        <div className="header-actions flex flex-col gap-2 items-end">
           <div className="flex gap-2">
              <select className="search-input w-24" value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
              </select>
              <select className="search-input w-32" value={month} onChange={(e) => setMonth(e.target.value)}>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>
                    {new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(2024, i))}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary btn-icon" onClick={handleFilter}>
                <Search size={16} />
              </button>
           </div>
           <div className="flex gap-2">
             <button className="btn btn-secondary border border-info-dark text-info text-xs" onClick={handleVerifySat} disabled={verifyingSat}>
               {verifyingSat ? 'Consultando SAT...' : 'Verificar Estatus SAT (Vigencia)'}
             </button>
             <button className="btn btn-secondary border border-danger text-danger text-xs" onClick={handleVerifyEfos} disabled={verifyingEfos}>
               {verifyingEfos ? 'Escaneando Listado...' : 'Auditoría EFOS (69-B)'}
             </button>
           </div>
        </div>
      </header>

      {loading ? (
        <div className="panel p-12 text-center">
          <div className="spinner lg mb-4 m-auto" />
          <p className="text-muted">Analizando discrepancias fiscales...</p>
        </div>
      ) : !data ? (
        <div className="panel p-12 text-center">
           <AlertCircle size={48} className="text-danger m-auto mb-4" />
           <h3>Error al cargar auditoría</h3>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* HERO STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="kpi-card glass animate-in zoom-in-95">
              <div className="flex justify-between items-start mb-2">
                <div className="kpi-card-label">Total XMLs (SAT)</div>
                <FileCode size={16} className="text-primary-400" />
              </div>
              <div className="kpi-card-value">{data.stats.totalXmls}</div>
              <div className="text-[10px] text-muted uppercase mt-1">Cargados en sistema</div>
            </div>

            <div className="kpi-card glass delay-75">
              <div className="flex justify-between items-start mb-2">
                <div className="kpi-card-label">Pólizas Generadas</div>
                <BookOpen size={16} className="text-success" />
              </div>
              <div className="kpi-card-value">{data.stats.totalJournals}</div>
              <div className="text-[10px] text-muted uppercase mt-1">Registros contables</div>
            </div>

            <div className="kpi-card glass delay-150 border-primary-500/30">
               <div className="flex justify-between items-center mb-2">
                  <div className="kpi-card-label">Índice de Cumplimiento</div>
                  <Activity size={16} className="text-primary-300" />
               </div>
               <div className="flex items-end gap-2">
                 <div className="kpi-card-value text-primary-300">{complianceScore}%</div>
                 <div className="mb-2 w-16 h-1 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-400" style={{ width: `${complianceScore}%` }} />
                 </div>
               </div>
            </div>

            <div className={`kpi-card glass delay-200 ${data.stats.unlinkedXmls > 0 ? 'border-danger/30' : 'border-success/30'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="kpi-card-label">Pendientes de Contabilizar</div>
                <AlertCircle size={16} className={data.stats.unlinkedXmls > 0 ? 'text-danger' : 'text-success'} />
              </div>
              <div className={`kpi-card-value ${data.stats.unlinkedXmls > 0 ? 'text-danger' : 'text-success'}`}>
                {data.stats.unlinkedXmls}
              </div>
              <div className="text-[10px] text-muted uppercase mt-1">XMLs sin póliza</div>
            </div>
          </div>

          {/* MAIN AUDIT INTERFACE */}
          <div className="panel overflow-hidden">
            <div className="border-b border-border-subtle bg-surface-2 flex px-2">
               <button 
                 className={`px-6 py-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'missingJournal' ? 'border-danger text-danger' : 'border-transparent opacity-60'}`}
                 onClick={() => setActiveTab('missingJournal')}
               >
                 <XCircle size={14} />
                 XMLs SIN PÓLIZA ({data.missingJournal.length})
               </button>
               <button 
                 className={`px-6 py-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'missingXml' ? 'border-warning text-warning' : 'border-transparent opacity-60'}`}
                 onClick={() => setActiveTab('missingXml')}
               >
                 <AlertCircle size={14} />
                 PÓLIZAS SIN XML ({data.missingXml.length})
               </button>
               <button 
                 className={`px-6 py-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${activeTab === 'compliant' ? 'border-success text-success' : 'border-transparent opacity-60'}`}
                 onClick={() => setActiveTab('compliant')}
               >
                 <CheckCircle2 size={14} />
                 CONCILIADOS ({data.compliant.length})
               </button>
            </div>

            <div className="p-0">
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>{activeTab === 'missingXml' ? 'Póliza / Concepto' : 'Emisor / Folio'}</th>
                      <th>Importe</th>
                      <th>UUID / Referencia</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data[activeTab].map((item: any, i: number) => (
                       <tr key={i} className="animate-in fade-in slide-in-from-left-2" style={{ animationDelay: `${i * 30}ms` }}>
                          <td>{new Date(item.date).toLocaleDateString()}</td>
                          <td>
                            <div className="flex flex-col">
                              {activeTab === 'missingXml' ? (
                                <>
                                  <span className="font-bold">{item.type} {item.number}</span>
                                  <span className="text-[10px] text-muted">{item.concept}</span>
                                </>
                              ) : (
                                <>
                                  <span className="font-bold">{item.emisorName || item.receptorName}</span>
                                  <span className="text-[10px] text-muted">{item.serie}{item.folio}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="font-bold">
                             ${(item.total || item.amount || 0).toLocaleString()}
                          </td>
                          <td className="text-mono text-[10px]">
                            {item.uuid || item.reference || 'N/A'}
                            {item.satStatus && (
                              <div className={`mt-1 inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${item.satStatus === 'CANCELADO' || item.satStatus?.includes('EFOS') ? 'bg-danger/20 text-danger' : 'bg-success/20 text-success'}`}>
                                {item.satStatus}
                              </div>
                            )}
                          </td>
                          <td>
                            {activeTab === 'missingJournal' && (
                              <button className="btn btn-primary btn-sm flex items-center gap-1">
                                <ArrowRight size={10} />
                                Contabilizar
                              </button>
                            )}
                            {activeTab === 'missingXml' && (
                              <button className="btn btn-secondary btn-sm flex items-center gap-1">
                                <FileCode size={10} />
                                Vincular XML
                              </button>
                            )}
                            {activeTab === 'compliant' && (
                              <div className="flex items-center gap-2 text-success text-[10px] font-bold">
                                <CheckCircle2 size={12} />
                                VINCULADO
                              </div>
                            )}
                          </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data[activeTab].length === 0 && (
                <div className="p-12 text-center">
                  <CheckCircle2 size={48} className="text-success m-auto mb-4" />
                  <h4 className="text-muted">¡Sin discrepancias en esta categoría!</h4>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .glass { background: rgba(16, 24, 39, 0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .text-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .animate-in { animation: fadeIn 0.4s ease-out backwards; }
        .delay-75 { animation-delay: 75ms; }
        .delay-150 { animation-delay: 150ms; }
        .delay-200 { animation-delay: 200ms; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
