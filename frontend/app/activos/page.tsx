'use client';
import React, { useState } from 'react';
import { Plus, X, Briefcase, Printer, ArrowLeft, Download, CheckCircle } from 'lucide-react';
import DepreciationSchedule from '../../components/DepreciationSchedule';
import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';

const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);

interface FixedAsset { id: string; assetNumber: string; name: string; category: string; acquisitionDate: string; acquisitionCost: number; residualValue: number; usefulLife: number; depreciationRate: number; accumulatedDep: number; netValue: number; currency: string; location?: string; serialNumber?: string; isActive: boolean; expenseAccountId?: string; accumulatedAccountId?: string; }

const CATEGORIES: Record<string, { label: string; color: string }> = {
  EQUIPO_COMPUTO: { label: 'Equipo Cómputo', color: 'badge-info' },
  VEHICULO: { label: 'Vehículo', color: 'badge-warning' },
  MOBILIARIO: { label: 'Mobiliario', color: 'badge-primary' },
  MAQUINARIA: { label: 'Maquinaria', color: 'badge-success' },
  EDIFICIO: { label: 'Edificio', color: 'badge-muted' },
};

// Removal of demoAssets as we switch to backend API

export default function ActivosPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    assetNumber: '', name: '', category: 'EQUIPO_COMPUTO', 
    acquisitionDate: new Date().toISOString().split('T')[0],
    acquisitionCost: 0, residualValue: 0, usefulLife: 5, depreciationRate: 10,
    currency: 'MXN', location: '', serialNumber: '',
    expenseAccountId: '', accumulatedAccountId: ''
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    setLoading(true);
    try {
      const [a, c, acc] = await Promise.all([
        apiFetch(`/api/assets?companyId=${cid}`).then(r => r.json()),
        apiFetch(`/api/companies/${cid}`).then(r => r.json()),
        apiFetch(`/api/accounts?companyId=${cid}`).then(r => r.json())
      ]);
      setAssets(Array.isArray(a) ? a : []);
      setCompany(c);
      setAccounts(Array.isArray(acc) ? acc : []);
    } catch (e) { console.error('Error fetching data:', e); }
    setLoading(false);
  }

  async function handleCreateAsset() {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    try {
      const r = await apiFetch('/api/assets', {
        method: 'POST',
        body: JSON.stringify({ ...form, companyId: cid })
      });
      if (r.ok) {
        setShowModal(false);
        fetchData();
        setForm({
            assetNumber: '', name: '', category: 'EQUIPO_COMPUTO', 
            acquisitionDate: new Date().toISOString().split('T')[0],
            acquisitionCost: 0, residualValue: 0, usefulLife: 5, depreciationRate: 10,
            currency: 'MXN', location: '', serialNumber: '',
            expenseAccountId: '', accumulatedAccountId: ''
          });
      }
    } catch (e) { console.error(e); }
  }

  async function handlePostDepreciation() {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    const d = new Date();
    setPosting(true);
    try {
      const r = await apiFetch('/api/assets/depreciate/post', {
        method: 'POST',
        body: JSON.stringify({ 
          companyId: cid, 
          year: d.getFullYear(), 
          month: d.getMonth() + 1 
        })
      });
      if (r.ok) {
        alert('Depreciación del mes aplicada correctamente en el Libro Diario.');
        fetchData();
      }
    } catch (e) { console.error(e); }
    setPosting(false);
  }

  const totalAcquisition = assets.reduce((s, a) => s + a.acquisitionCost, 0);
  const totalDepreciation = assets.reduce((s, a) => s + a.accumulatedDep, 0);
  const totalNetValue = assets.reduce((s, a) => s + a.netValue, 0);
  const depRate = totalAcquisition > 0 ? (totalDepreciation / totalAcquisition * 100) : 0;

  // Depreciación mensual (línea recta)
  function monthlyDep(asset: FixedAsset) {
    return (asset.acquisitionCost - asset.residualValue) / (asset.usefulLife * 12);
  }

  return (
    <>
      <header className="main-header">
        <div className="header-title"><h1>Activos Fijos</h1><p>Control y depreciación de activos según LISR</p></div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handlePostDepreciation} disabled={posting} style={{ marginRight: '12px' }}>
             {posting ? 'Contabilizando...' : 'Correr Depreciación Mensual'}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowPrint(true)} style={{ marginRight: '12px' }}>
            <Printer size={15} /> Imprimir Cédula
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} /> Nuevo Activo</button>
        </div>
      </header>
      <main className="main-content">
        {/* KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="kpi-card"><div className="kpi-card-icon purple"><Briefcase size={18} /></div><p className="kpi-card-label">Valor Adquisición</p><p className="kpi-card-value" style={{fontSize:18}}>{fmt(totalAcquisition)}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Dep. Acumulada</p><p className="kpi-card-value" style={{fontSize:18,color:'var(--danger)'}}>{fmt(totalDepreciation)}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Valor Neto en Libros</p><p className="kpi-card-value" style={{fontSize:18,color:'var(--success)'}}>{fmt(totalNetValue)}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">% Depreciado</p><p className="kpi-card-value">{depRate.toFixed(1)}%</p>
            <div style={{ marginTop: 8, height: 4, background: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${depRate}%`, background: 'linear-gradient(90deg,var(--primary-400),var(--teal-400))', borderRadius: 2 }} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <p className="panel-title">Catálogo de Activos Fijos</p>
            <p className="panel-subtitle">Depreciación por Línea Recta según tasas LISR</p>
          </div>
          <div className="panel-body table-responsive">
            <table>
              <thead><tr><th>Núm.</th><th>Nombre</th><th>Categoría</th><th>F. Adquisición</th><th>Costo</th><th>Val. Residual</th><th>Vida Útil</th><th>Dep. Mensual</th><th>Dep. Acum.</th><th>Val. Neto</th><th>Ubicación</th><th>Estado</th></tr></thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id}>
                    <td className="td-primary">{a.assetNumber}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{a.name}</td>
                    <td><span className={`badge ${CATEGORIES[a.category]?.color || 'badge-muted'}`}>{CATEGORIES[a.category]?.label || a.category}</span></td>
                    <td>{new Date(a.acquisitionDate).toLocaleDateString('es-MX')}</td>
                    <td className="td-amount">{fmt(a.acquisitionCost)}</td>
                    <td className="td-amount" style={{ color: 'var(--text-muted)' }}>{fmt(a.residualValue)}</td>
                    <td>{a.usefulLife} años</td>
                    <td className="td-amount" style={{ color: 'var(--warning)' }}>{fmt(monthlyDep(a))}</td>
                    <td className="td-amount" style={{ color: 'var(--danger)' }}>{fmt(a.accumulatedDep)}</td>
                    <td className="td-amount" style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(a.netValue)}</td>
                    <td style={{ fontSize: 12 }}>{a.location || '—'}</td>
                    <td><span className={`badge ${a.isActive ? 'badge-success' : 'badge-muted'}`}>{a.isActive ? 'Activo' : 'Baja'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla de depreciación proyectada */}
        <div className="panel">
          <div className="panel-header"><p className="panel-title">Depreciación Mensual Proyectada</p><p className="panel-subtitle">Cargo mensual a gastos por año 2024</p></div>
          <div className="panel-body table-responsive">
            <table className="report-table">
              <thead><tr><th>Activo</th><th>Tasa Anual</th><th>Dep. Mensual</th><th>Dep. Anual</th><th>Cuenta Contable</th></tr></thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id}>
                    <td style={{ color: 'var(--text-primary)' }}>{a.name}</td>
                    <td>{(a.depreciationRate * 100).toFixed(0)}%</td>
                    <td className="td-amount" style={{ color: 'var(--warning)' }}>{fmt(monthlyDep(a))}</td>
                    <td className="td-amount">{fmt(monthlyDep(a) * 12)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>5.1.05 — Depreciaciones</td>
                  </tr>
                ))}
                <tr className="report-total-row">
                  <td colSpan={2}>TOTAL</td>
                  <td className="td-amount">{fmt(assets.reduce((s,a)=>s+monthlyDep(a),0))}</td>
                  <td className="td-amount">{fmt(assets.reduce((s,a)=>s+monthlyDep(a)*12,0))}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

       {/* MODAL NUEVO ACTIVO */}
       {showModal && (
        <div className="modal-overlay no-print">
          <div className="modal modal-lg">
             <div className="modal-header">
               <h2>Registro de Activo Fijo</h2>
               <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={20}/></button>
             </div>
             <div className="modal-body" style={{ padding: '24px' }}>
               <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div className="form-group"><label>Núm. Activo</label><input value={form.assetNumber} onChange={e => setForm({...form, assetNumber: e.target.value})} placeholder="AF-XXX" /></div>
                  <div className="form-group"><label>Nombre del Activo</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  <div className="form-group"><label>Categoría</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Fecha Adquisición</label><input type="date" value={form.acquisitionDate} onChange={e => setForm({...form, acquisitionDate: e.target.value})} /></div>
                  <div className="form-group"><label>Costo Adquisición (MOI)</label><input type="number" value={form.acquisitionCost} onChange={e => setForm({...form, acquisitionCost: parseFloat(e.target.value)})} /></div>
                  <div className="form-group"><label>Valor Residual (Desecho)</label><input type="number" value={form.residualValue} onChange={e => setForm({...form, residualValue: parseFloat(e.target.value)})} /></div>
                  <div className="form-group"><label>Vida Útil (Años)</label><input type="number" value={form.usefulLife} onChange={e => setForm({...form, usefulLife: parseInt(e.target.value)})} /></div>
                  <div className="form-group"><label>Tasa Dep. Anual (%)</label><input type="number" value={form.depreciationRate} onChange={e => setForm({...form, depreciationRate: parseFloat(e.target.value)})} /></div>
                  <div className="form-group"><label>Ubicación</label><input value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
                  
                  <hr style={{ gridColumn: 'span 3', border: 'none', borderTop: '1px solid var(--surface-3)', margin: '8px 0' }} />
                  
                  <div className="form-group"><label>Cuenta de Gasto (Dep.)</label>
                    <select value={form.expenseAccountId} onChange={e => setForm({...form, expenseAccountId: e.target.value})}>
                      <option value="">Seleccione cuenta...</option>
                      {accounts.filter(a => a.level > 1 && a.code.startsWith('5')).map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label>Cuenta Dep. Acumulada</label>
                    <select value={form.accumulatedAccountId} onChange={e => setForm({...form, accumulatedAccountId: e.target.value})}>
                      <option value="">Seleccione cuenta...</option>
                      {accounts.filter(a => a.level > 1 && a.code.startsWith('1')).map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                  </div>
               </div>
             </div>
             <div className="modal-footer">
               <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
               <button className="btn btn-primary" onClick={handleCreateAsset}><CheckCircle size={16} /> Registrar Activo</button>
             </div>
          </div>
        </div>
      )}

      {/* PRINT OVERLAY */}
      {showPrint && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-auto p-12 print:p-0 no-print-background print:relative">
           <div className="max-w-5xl mx-auto no-print mb-8 flex justify-between items-center border-b pb-4">
              <button className="btn btn-secondary flex items-center gap-2" onClick={() => setShowPrint(false)}>
                <ArrowLeft size={16} /> Volver al Catálogo
              </button>
              <div className="flex gap-4">
                <button className="btn btn-primary flex items-center gap-2" onClick={() => window.print()}>
                  <Printer size={16} /> Imprimir / PDF
                </button>
              </div>
           </div>
           
           <DepreciationSchedule assets={assets} company={company} />
           
           <div className="max-w-5xl mx-auto no-print mt-12 bg-primary-900/10 p-6 rounded-lg border border-primary-500/20">
              <h4 className="text-primary-400 font-bold mb-2 flex items-center gap-2">
                <Printer size={18} /> Guía de Impresión SAT
              </h4>
              <p className="text-xs text-slate-400 mb-4 tabular-nums">
                Este reporte cumple con los requisitos del Artículo 31 de la LISR para el control de inversiones.
              </p>
              <ul className="text-[10px] space-y-1 text-slate-500 list-disc pl-4">
                <li>Activa la impresión de "Gráficos de fondo" para ver los colores y bordes.</li>
                <li>Usa orientación "Horizontal" (Landscape) si la tabla excede el ancho de página.</li>
                <li>Diseño balanceado para hojas A4 o Carta.</li>
              </ul>
           </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .main-content { padding: 0 !important; margin: 0 !important; }
          .schedule-container { margin: 0 !important; box-shadow: none !important; border: none !important; }
        }
        .fixed { position: fixed; inset: 0; }
        .z-\[9999\] { z-index: 9999; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .no-print-background {
          background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0);
          background-size: 40px 40px;
          background-color: #0f172a;
        }
      `}</style>
    </>
  );
}
