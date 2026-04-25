'use client';
import React, { useState, useEffect } from 'react';
import { Calculator, Download, ExternalLink, Calendar, ChevronRight, DollarSign, Wallet2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';
const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);

export default function ImpuestosPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    if (cid) fetchData(cid, year, month);
  }, [month, year]);

  const fetchData = async (cid: string, y: string, m: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/tax/determination?companyId=${cid}&year=${y}&month=${m}`);
      if (res.ok) {
         setData(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="main-content" style={{ paddingBottom: '100px' }}>
      <header className="page-header" style={{ marginBottom: 30 }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Calculator size={26} style={{ color: '#22d3ee' }} />
            Tablero de Impuestos (IVA / ISR)
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
            Determinación automática en tiempo real basada en flujo de efectivo y emisión
          </p>
        </div>
        <div className="header-actions">
          <div className="flex gap-2 bg-surface-2 p-1 rounded-xl border border-border-default">
             <select 
                value={month} onChange={e => setMonth(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', padding: '4px 8px' }}
              >
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={i} value={i+1}>{m}</option>
                ))}
             </select>
             <div style={{ width: 1, background: 'var(--border-subtle)' }} />
             <select 
                value={year} onChange={e => setYear(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', outline: 'none', padding: '4px 8px' }}
              >
                {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
          <button className="btn btn-primary" style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }}>
            <Download size={15} /> Papel de Trabajo
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
           <span className="spinner" style={{ margin: '0 auto' }}></span>
           <p className="mt-4 text-muted">Calculando determinación...</p>
        </div>
      ) : !data ? (
        <div className="panel p-6 text-center">
          <AlertTriangle size={48} className="text-warning mx-auto mb-4" />
          <h3 className="text-lg font-bold">Sin información</h3>
          <p className="text-muted">No encontramos XMLs en este periodo para el cálculo.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* TABLERO DE IVA */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-header" style={{ background: 'rgba(52, 211, 153, 0.05)', borderBottom: '1px solid rgba(52, 211, 153, 0.1)' }}>
               <h3 className="flex items-center gap-2 text-success font-bold m-0"><Wallet2 size={18} /> Determinación de I.V.A.</h3>
               <span className="badge badge-success text-[10px]">Cálculo Definitivo Menusal</span>
            </div>
            
            <div className="p-6">
               <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                 <div className="text-sm text-disabled">IVA Trasladado (Cobrado)</div>
                 <div className="text-lg font-bold">{fmt(data.iva.trasladadoCobrado)}</div>
               </div>
               <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                 <div className="text-sm text-disabled flex items-center gap-2">(-) IVA Acreditable (Pagado) <span className="text-[10px] text-primary-400 bg-primary-900 px-2 py-0.5 rounded">Gasto/Compra</span></div>
                 <div className="text-lg font-bold text-danger">-{fmt(data.iva.acreditablePagado)}</div>
               </div>
               <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                 <div className="text-sm text-disabled">(=) IVA a Cargo</div>
                 <div className="text-lg font-bold">{fmt(data.iva.cargo)}</div>
               </div>
               <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                 <div className="text-sm text-disabled">(-) IVA Retenido</div>
                 <div className="text-lg font-bold text-danger">-{fmt(data.iva.retenido)}</div>
               </div>
               
               <div className="mt-6 p-5 rounded-xl border" style={{ background: data.iva.aPagar > 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(34, 211, 238, 0.1)', borderColor: data.iva.aPagar > 0 ? 'rgba(52, 211, 153, 0.3)' : 'rgba(34, 211, 238, 0.3)' }}>
                  <div className="text-xs font-bold mb-1" style={{ color: data.iva.aPagar > 0 ? 'var(--success)' : '#22d3ee' }}>
                    {data.iva.aPagar > 0 ? 'I.V.A. A PAGAR EN EL MES' : 'I.V.A. A FAVOR (SALdo)'}
                  </div>
                  <div className="text-3xl font-black" style={{ color: data.iva.aPagar > 0 ? 'var(--success)' : '#22d3ee' }}>
                    {fmt(data.iva.aPagar > 0 ? data.iva.aPagar : data.iva.saldoFavor)}
                  </div>
               </div>
            </div>
          </div>

          {/* TABLERO DE ISR */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-header" style={{ background: 'rgba(34, 211, 238, 0.05)', borderBottom: '1px solid rgba(34, 211, 238, 0.1)' }}>
               <h3 className="flex items-center gap-2 text-[#22d3ee] font-bold m-0"><DollarSign size={18} /> Pago Provisional I.S.R.</h3>
               <span className="badge badge-info text-[10px]">Persona Moral / Resico</span>
            </div>
            
            <div className="p-6">
               <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                 <div className="text-sm text-disabled flex items-center gap-2">Ingresos Nominales <span className="text-[10px] text-muted">(del mes)</span></div>
                 <div className="text-lg font-bold">{fmt(data.isr.ingresosNominales)}</div>
               </div>
               <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                 <div className="text-sm text-disabled">(x) Coeficiente de Utilidad</div>
                 <div className="text-lg font-bold font-mono text-primary-300">{(data.isr.coeficienteUtilidad * 100).toFixed(2)}%</div>
               </div>
               <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                 <div className="text-sm text-disabled flex items-center gap-2">(=) Utilidad Fiscal Estimada</div>
                 <div className="text-lg font-bold">{fmt(data.isr.utilidadFiscalEstimada)}</div>
               </div>
               <div className="flex justify-between items-center py-3 border-b border-border-subtle">
                 <div className="text-sm text-disabled">(-) I.S.R. Retenido (Bancos/Terceros)</div>
                 <div className="text-lg font-bold text-danger">-{fmt(data.isr.retenido)}</div>
               </div>
               
               <div className="mt-6 p-5 rounded-xl border border-primary-500 bg-surface-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><DollarSign size={64}/></div>
                  <div className="text-xs font-bold text-muted mb-1 uppercase tracking-wider">
                    I.S.R. a Cargo / Estimado
                  </div>
                  <div className="text-3xl font-black text-white relative z-10">
                    {fmt(data.isr.pagoProvisional)}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Auditoría Footer Note */}
      {data && (
        <div className="mt-6 panel p-4 rounded-xl flex items-start gap-4 border border-info-dark bg-[#0c1e30]">
           <ShieldCheck size={24} className="text-[#22d3ee] flex-shrink-0" />
           <div>
             <h4 className="text-sm font-bold text-[#22d3ee] mb-1">Certeza Fiscal JnConta (360°)</h4>
             <p className="text-xs text-muted leading-relaxed">
               Este cálculo excluye automáticamente los montos de facturas donde el proveedor figure en el <strong className="text-white">Listado 69-B del SAT (EFOS)</strong> y considera el estatus vigente en tiempo real mediante web scraping a los servidores del SAT. Para el cruce definitivo, imprime el papel de trabajo.
             </p>
           </div>
        </div>
      )}
    </div>
  );
}
