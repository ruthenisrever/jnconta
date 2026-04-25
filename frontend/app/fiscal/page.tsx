'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, Download, FileText, Calendar, 
  ArrowRight, ShieldCheck, Info, RefreshCw,
  TrendingDown, TrendingUp, DollarSign, Percent
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function FiscalWorksheetPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId');
    if (cid) {
      setCompanyId(cid);
      fetchData(cid, month, year);
    }
  }, []);

  const fetchData = async (cid: string, m: number, y: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/fiscal/worksheet?companyId=${cid}&month=${m}&year=${y}`);
      const worksheet = await res.json();
      setData(worksheet);
    } catch (e) {
      console.error('Error fetching fiscal worksheet:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData(companyId, month, year);
  };

  if (!data && !loading) return <div className="main-content flex items-center justify-center h-64">Selecciona una empresa para ver su situación fiscal.</div>;

  const t = data?.summary?.trasladado || {};
  const a = data?.summary?.acreditable || {};
  const r = data?.summary?.retentions || {};

  return (
    <div className="main-content">
      <header className="page-header flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 px-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="badge badge-success flex items-center gap-1">
              <ShieldCheck size={12} /> Cumplimiento SAT 2024
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Papel de Trabajo Fiscal</h1>
          <p className="text-muted">Determinación mensual de Impuesto al Valor Agregado (IVA).</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface-2 p-1 rounded-lg border border-border-subtle">
             <select 
               className="bg-transparent border-none outline-none text-sm px-3 h-9"
               value={month}
               onChange={(e) => setMonth(parseInt(e.target.value))}
             >
               {[...Array(12)].map((_, i) => (
                 <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es-MX', { month: 'long' })}</option>
               ))}
             </select>
             <select 
               className="bg-transparent border-none outline-none text-sm px-3 h-9 border-l border-border-subtle"
               value={year}
               onChange={(e) => setYear(parseInt(e.target.value))}
             >
               <option value={2024}>2024</option>
               <option value={2025}>2025</option>
             </select>
          </div>
          <button className="btn btn-secondary h-11 px-4" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="btn btn-primary h-11 flex items-center gap-2">
            <Download size={18} /> Exportar Excel
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
           <div className="spinner lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 px-4">
          
          {/* COLUMNA CALCULOS IZQUIERDA */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* VENTAS / TRASLADADO */}
            <section className="panel glass overflow-hidden border-l-4 border-l-primary-500">
               <div className="p-6 bg-primary-500/5 border-b border-border-subtle flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary-400" /> IVA Trasladado (Ventas/Cobros)
                  </h3>
                  <span className="text-xs font-mono text-primary-300">BASADO EN FLUJO</span>
               </div>
               <div className="p-0 overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                       <tr className="text-muted border-b border-border-subtle bg-surface-2/30">
                          <th className="px-6 py-3 text-left">Concepto</th>
                          <th className="px-6 py-3 text-right">Base</th>
                          <th className="px-6 py-3 text-right">Tasa</th>
                          <th className="px-6 py-3 text-right">Impuesto</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/30">
                       <tr>
                          <td className="px-6 py-4">Ventas/Actos Gravados al 16%</td>
                          <td className="px-6 py-4 text-right font-mono">${t.base16?.toLocaleString() || '0.00'}</td>
                          <td className="px-6 py-4 text-right">16%</td>
                          <td className="px-6 py-4 text-right font-bold text-primary-300">${t.iva16?.toLocaleString() || '0.00'}</td>
                       </tr>
                       <tr>
                          <td className="px-6 py-4">Ventas/Actos Gravados al 8%</td>
                          <td className="px-6 py-4 text-right font-mono">${t.base8?.toLocaleString() || '0.00'}</td>
                          <td className="px-6 py-4 text-right">8%</td>
                          <td className="px-6 py-4 text-right font-bold text-primary-300">${t.iva8?.toLocaleString() || '0.00'}</td>
                       </tr>
                       <tr>
                          <td className="px-6 py-4">Ventas/Actos al 0%</td>
                          <td className="px-6 py-4 text-right font-mono">${t.base0?.toLocaleString() || '0.00'}</td>
                          <td className="px-6 py-4 text-right">0%</td>
                          <td className="px-6 py-4 text-right font-bold">$0.00</td>
                       </tr>
                       <tr className="bg-surface-2/20 font-bold">
                          <td className="px-6 py-4">TOTAL TRASLADADO</td>
                          <td className="px-6 py-4 text-right border-t border-primary-500/30">${t.totalBase?.toLocaleString() || '0.00'}</td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4 text-right text-primary-400 border-t border-primary-500/30">${t.totalIva?.toLocaleString() || '0.00'}</td>
                       </tr>
                    </tbody>
                  </table>
               </div>
            </section>

            {/* COMPRAS / ACREDITABLE */}
            <section className="panel glass overflow-hidden border-l-4 border-l-success-500">
               <div className="p-6 bg-success-500/5 border-b border-border-subtle flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2">
                    <TrendingDown size={18} className="text-success-400" /> IVA Acreditable (Gastos/Pagos)
                  </h3>
                  <span className="text-xs font-mono text-success-300">PAGADO EN EL MES</span>
               </div>
               <div className="p-0 overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                       <tr className="text-muted border-b border-border-subtle bg-surface-2/30">
                          <th className="px-6 py-3 text-left">Concepto</th>
                          <th className="px-6 py-3 text-right">Base</th>
                          <th className="px-6 py-3 text-right">Tasa</th>
                          <th className="px-6 py-3 text-right">Impuesto</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/30">
                       <tr>
                          <td className="px-6 py-4">Gastos Gravados al 16%</td>
                          <td className="px-6 py-4 text-right font-mono">${a.base16?.toLocaleString() || '0.00'}</td>
                          <td className="px-6 py-4 text-right">16%</td>
                          <td className="px-6 py-4 text-right font-bold text-success-300">${a.iva16?.toLocaleString() || '0.00'}</td>
                       </tr>
                       <tr>
                          <td className="px-6 py-4">Gastos Gravados al 8%</td>
                          <td className="px-6 py-4 text-right font-mono">${a.base8?.toLocaleString() || '0.00'}</td>
                          <td className="px-6 py-4 text-right">8%</td>
                          <td className="px-6 py-4 text-right font-bold text-success-300">${a.iva8?.toLocaleString() || '0.00'}</td>
                       </tr>
                       <tr>
                          <td className="px-6 py-4">Gastos Exentos</td>
                          <td className="px-6 py-4 text-right font-mono">${a.baseExempt?.toLocaleString() || '0.00'}</td>
                          <td className="px-6 py-4 text-right">-</td>
                          <td className="px-6 py-4 text-right font-bold">$0.00</td>
                       </tr>
                       <tr className="bg-surface-2/20 font-bold">
                          <td className="px-6 py-4">TOTAL ACREDITABLE</td>
                          <td className="px-6 py-4 text-right border-t border-success-500/30">${a.totalBase?.toLocaleString() || '0.00'}</td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4 text-right text-success-400 border-t border-success-500/30">${a.totalIva?.toLocaleString() || '0.00'}</td>
                       </tr>
                    </tbody>
                  </table>
               </div>
            </section>
          </div>

          {/* COLUMNA RESUMEN DERECHA */}
          <div className="space-y-6">
             <div className="panel glass p-8 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 text-primary-500/5 rotate-12 group-hover:scale-110 transition-transform">
                   <Calculator size={140} />
                </div>
                
                <h3 className="text-xl font-black mb-6 uppercase tracking-wider">Resumen de Pago</h3>
                
                <div className="space-y-4 mb-8">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted font-bold">IVA TRASLADADO</span>
                      <span className="font-mono text-primary-400 font-bold">${t.totalIva?.toLocaleString() || '0.00'}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted font-bold">(-) IVA ACREDITABLE</span>
                      <span className="font-mono text-success-400 font-bold">${a.totalIva?.toLocaleString() || '0.00'}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm border-b border-border-subtle pb-4">
                      <span className="text-muted font-bold">(-) RETENCIONES IVA</span>
                      <span className="font-mono text-warning-400 font-bold">${r.iva?.toLocaleString() || '0.00'}</span>
                   </div>
                   
                   <div className="pt-4 flex justify-between items-center">
                      <span className="text-lg font-black">{data?.ivaNeto > 0 ? "IVA A CARGO" : "IVA A FAVOR"}</span>
                      <span className={`text-2xl font-black ${data?.ivaNeto > 0 ? "text-danger" : "text-success"}`}>
                         ${(data?.ivaNeto || data?.ivaAFavor)?.toLocaleString() || '0.00'}
                      </span>
                   </div>
                </div>

                <div className="bg-surface-2 rounded-xl p-4 border border-border-subtle/50 mb-6 font-sans">
                   <div className="flex items-center gap-2 mb-2 text-warning text-xs font-bold uppercase">
                      <Info size={14} /> Nota Fiscal 2024
                   </div>
                   <p className="text-[10px] text-muted leading-relaxed">
                      Este cálculo es preliminar basado en los XML importados y conciliados con flujo de efectivo. 
                      Asegúrese de que todas las facturas PUE y complementos de pago estén al día.
                   </p>
                </div>

                <button className="btn btn-primary w-full h-12 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                   Confirmar Determinación <ArrowRight size={18} />
                </button>
             </div>

             <div className="panel glass p-6">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                   <DollarSign size={16} className="text-muted" /> Otras Retenciones
                </h4>
                <div className="space-y-3">
                   <div className="flex justify-between items-center p-3 rounded-lg bg-surface-2/30 border border-border-subtle/30">
                      <div className="text-xs">
                        <div className="font-bold">ISR Retenido (Salarios)</div>
                        <div className="text-[10px] text-muted">Retenciones de Nómina</div>
                      </div>
                      <div className="font-black text-warning">${r.isr?.toLocaleString() || '0.00'}</div>
                   </div>
                   <div className="flex justify-between items-center p-3 rounded-lg bg-surface-2/30 border border-border-subtle/30 cursor-not-allowed opacity-50">
                      <div className="text-xs">
                        <div className="font-bold">Retención ISR (Servicios)</div>
                        <div className="text-[10px] text-muted">Aún no implementado</div>
                      </div>
                      <div className="font-black">$0.00</div>
                   </div>
                </div>
             </div>
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
