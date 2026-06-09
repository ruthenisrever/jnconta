'use client';
import React, { useState } from 'react';
import { 
  ShieldCheck, Download, Calendar, AlertCircle, ChevronRight, 
  FileText, Database, Layers, FileCode, Info, Loader2, Eye,
  CheckCircle2, AlertTriangle
} from 'lucide-react';
import { apiFetch, API_BASE } from '@/lib/api';

type Tab = 'coe' | 'diot';

export default function SatPage() {
  const [tab, setTab] = useState<Tab>('coe');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [type, setType] = useState('N');
  const [loading, setLoading] = useState(false);
  const [diotPreview, setDiotPreview] = useState<any[]>([]);
  const [diotLoading, setDiotLoading] = useState(false);
  const [diotLoaded, setDiotLoaded] = useState(false);

  const months = [
    { v: '01', l: 'Enero' }, { v: '02', l: 'Febrero' }, { v: '03', l: 'Marzo' },
    { v: '04', l: 'Abril' }, { v: '05', l: 'Mayo' }, { v: '06', l: 'Junio' },
    { v: '07', l: 'Julio' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Septiembre' },
    { v: '10', l: 'Octubre' }, { v: '11', l: 'Noviembre' }, { v: '12', l: 'Diciembre' },
  ];

  const cid = () => localStorage.getItem('companyId') || '';

  const handleDownloadCoe = (endpoint: string) => {
    const url = `${API_BASE}/api/sat-exports/${endpoint}?companyId=${cid()}&year=${year}&month=${month}${endpoint === 'balanza' ? `&type=${type}` : ''}`;
    setLoading(true);
    window.location.href = url;
    setTimeout(() => setLoading(false), 2500);
  };

  const loadDiotPreview = async () => {
    setDiotLoading(true);
    setDiotLoaded(false);
    try {
      const data = await apiFetch(`/api/diot/preview?companyId=${cid()}&month=${parseInt(month)}&year=${year}`);
      setDiotPreview(Array.isArray(data) ? data : []);
      setDiotLoaded(true);
    } catch (e) {
      console.error(e);
      setDiotPreview([]);
      setDiotLoaded(true);
    } finally {
      setDiotLoading(false);
    }
  };

  const handleDownloadDiot = () => {
    const url = `${API_BASE}/api/diot/export?companyId=${cid()}&month=${parseInt(month)}&year=${year}`;
    setLoading(true);
    window.location.href = url;
    setTimeout(() => setLoading(false), 2500);
  };

  const fmt = (n: number) => n?.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) ?? '$0.00';

  const diotTotals = diotPreview.reduce((acc, r) => ({
    base16: acc.base16 + (r.base16 || 0),
    iva16: acc.iva16 + (r.iva16 || 0),
    base0: acc.base0 + (r.base0 || 0),
    total: acc.total + (r.totalPaid || 0),
    count: acc.count + (r.billCount || 0),
  }), { base16: 0, iva16: 0, base0: 0, total: 0, count: 0 });

  return (
    <div className="main-content" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* HEADER */}
      <header className="page-header" style={{ marginBottom: 32 }}>
        <div className="page-header-left">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ShieldCheck size={30} style={{ color: '#22d3ee' }} />
            Portal Fiscal SAT
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
            Cumplimiento fiscal — Contabilidad Electrónica &amp; DIOT
          </p>
        </div>
      </header>

      {/* PERIODO SELECTOR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 28 }}>
        <div className="panel" style={{ padding: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: 1 }}>
            <Calendar size={12} style={{ display: 'inline', marginRight: 5 }} />Ejercicio Fiscal
          </label>
          <select value={year} onChange={e => setYear(e.target.value)} style={{ width: '100%', marginTop: 8 }}>
            {['2022','2023','2024','2025','2026'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="panel" style={{ padding: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: 1 }}>
            <Calendar size={12} style={{ display: 'inline', marginRight: 5 }} />Mes de Envío
          </label>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ width: '100%', marginTop: 8 }}>
            {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>
        <div className="panel" style={{ padding: 18 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: 1 }}>
            <AlertCircle size={12} style={{ display: 'inline', marginRight: 5 }} />Tipo de Balanza
          </label>
          <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', marginTop: 8 }}>
            <option value="N">Normal (N)</option>
            <option value="C">Complementaria (C)</option>
            <option value="Z">Cierre de Ejercicio (Z)</option>
          </select>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 0 }}>
        {([['coe', 'Contabilidad Electrónica (COE)'], ['diot', 'DIOT — Terceros']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '10px 24px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              borderBottom: tab === key ? '2px solid #22d3ee' : '2px solid transparent',
              background: 'transparent',
              color: tab === key ? '#22d3ee' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.2s'
            }}
          >{label}</button>
        ))}
      </div>

      {/* TAB: COE */}
      {tab === 'coe' && (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))' }}>
          {[
            { endpoint: 'catalogo-cuentas', icon: <Database size={22}/>, title: 'Catálogo de Cuentas', sub: 'Anexo 24 — Se envía una vez o por cambios', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', items: ['Nivel y Naturaleza por cuenta', 'Códigos agrupadores SAT', 'Compatible con v1.3 del SAT'] },
            { endpoint: 'balanza', icon: <Layers size={22}/>, title: 'Balanza de Comprobación', sub: 'Envío mensual obligatorio', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', items: ['Saldos Iniciales y Finales', 'Movimientos Debe / Haber del mes', 'Normal, Complementaria o Cierre'] },
            { endpoint: 'polizas', icon: <FileText size={22}/>, title: 'Pólizas del Periodo', sub: 'Solo bajo requerimiento del SAT (AF/FC)', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', items: ['Detalle transacción a transacción', 'Asociación de UUIDs (CompNal)', 'Referencia por número de póliza'] },
          ].map(card => (
            <div key={card.endpoint} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 0, overflow: 'hidden' }}>
              <div style={{ padding: '22px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  <div style={{ background: card.bg, color: card.color, padding: 10, borderRadius: 10 }}>{card.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{card.title}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{card.sub}</div>
                  </div>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {card.items.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                      <ChevronRight size={12} style={{ color: card.color, flexShrink: 0 }} />{item}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ padding: '16px 24px' }}>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', background: card.bg, color: card.color, border: `1px solid ${card.color}40` }}
                  onClick={() => handleDownloadCoe(card.endpoint)}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Generar XML
                </button>
              </div>
            </div>
          ))}

          <div style={{ gridColumn: '1/-1', padding: '14px 20px', background: 'rgba(34,211,238,0.05)', borderRadius: 12, border: '1px solid rgba(34,211,238,0.15)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <Info size={16} style={{ color: '#22d3ee', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.7 }}>
              Los archivos generados son compatibles con la <strong style={{color:'rgba(255,255,255,0.7)'}}>versión 1.3 de Contabilidad Electrónica</strong> (Anexo 24 de la RMF). 
              Comprímelos en un archivo <strong style={{color:'rgba(255,255,255,0.7)'}}>.ZIP</strong> antes de subirlos al portal del SAT. 
              Asegúrate de que todas tus cuentas tengan asignado su Código Agrupador SAT.
            </p>
          </div>
        </div>
      )}

      {/* TAB: DIOT */}
      {tab === 'diot' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>DIOT — Operaciones con Terceros</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                Declaración Informativa de Operaciones con Terceros · Formato Pipe-Separated · Anexo 8 RMF
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={loadDiotPreview} disabled={diotLoading}>
                {diotLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                Vista Previa
              </button>
              <button className="btn btn-primary" onClick={handleDownloadDiot} disabled={loading} style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Descargar .TXT
              </button>
            </div>
          </div>

          {/* Resumen KPIs */}
          {diotLoaded && diotPreview.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
              {[
                { label: 'Proveedores en DIOT', value: diotPreview.length, color: '#22d3ee' },
                { label: 'Total Facturas (N°)', value: diotTotals.count, color: '#a78bfa' },
                { label: 'Base Gravable 16%', value: fmt(diotTotals.base16), color: '#34d399' },
                { label: 'IVA Total Pagado', value: fmt(diotTotals.iva16), color: '#f59e0b' },
              ].map(kpi => (
                <div key={kpi.label} className="panel" style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: kpi.color, textTransform: 'uppercase', letterSpacing: 1 }}>{kpi.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 6 }}>{kpi.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tabla Preview */}
          {!diotLoaded && !diotLoading && (
            <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
              <FileCode size={48} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                Presiona <strong>"Vista Previa"</strong> para cargar los proveedores con facturas pagadas en el periodo seleccionado.
              </p>
            </div>
          )}

          {diotLoading && (
            <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
              <Loader2 size={32} className="animate-spin" style={{ color: '#22d3ee', margin: '0 auto 12px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Leyendo facturas de proveedores pagadas...</p>
            </div>
          )}

          {diotLoaded && diotPreview.length === 0 && (
            <div className="panel" style={{ padding: 40, textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ color: '#34d399', margin: '0 auto 16px' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                No se encontraron facturas de proveedores con estatus <strong>PAGADA</strong> en el periodo seleccionado.
              </p>
            </div>
          )}

          {diotLoaded && diotPreview.length > 0 && (
            <div className="panel">
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>RFC / ID Fiscal</th>
                      <th>Proveedor</th>
                      <th>Op.</th>
                      <th style={{ textAlign: 'right' }}>Base 16%</th>
                      <th style={{ textAlign: 'right' }}>IVA 16%</th>
                      <th style={{ textAlign: 'right' }}>Base 0%</th>
                      <th style={{ textAlign: 'right' }}>Facturas</th>
                      <th style={{ textAlign: 'right' }}>Total Pagado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diotPreview.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <span className={`badge ${row.type === '04' ? 'badge-info' : row.type === '05' ? 'badge-primary' : 'badge-success'}`}>
                            {row.type === '04' ? 'Nacional' : row.type === '05' ? 'Extranjero' : 'Global'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.rfc || row.taxId || '—'}</td>
                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                        <td><span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}>{row.operationType}</span></td>
                        <td className="td-amount">{row.base16 > 0 ? fmt(row.base16) : '—'}</td>
                        <td className="td-amount" style={{ color: '#34d399' }}>{row.iva16 > 0 ? fmt(row.iva16) : '—'}</td>
                        <td className="td-amount">{row.base0 > 0 ? fmt(row.base0) : '—'}</td>
                        <td className="td-amount">{row.billCount}</td>
                        <td className="td-amount" style={{ fontWeight: 700 }}>{fmt(row.totalPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 900, color: '#22d3ee' }}>
                      <td colSpan={4}>TOTALES</td>
                      <td className="td-amount">{fmt(diotTotals.base16)}</td>
                      <td className="td-amount" style={{ color: '#34d399' }}>{fmt(diotTotals.iva16)}</td>
                      <td className="td-amount">{fmt(diotTotals.base0)}</td>
                      <td className="td-amount">{diotTotals.count}</td>
                      <td className="td-amount">{fmt(diotTotals.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, padding: '12px 18px', background: 'rgba(245,158,11,0.06)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.7 }}>
              La DIOT solo incluye facturas de proveedores con estatus <strong style={{color:'rgba(255,255,255,0.7)'}}>PAGADA</strong> en el periodo. 
              Asegúrate de marcar las facturas como pagadas en el módulo de <strong style={{color:'rgba(255,255,255,0.7)'}}>Compras</strong> antes de generar el archivo.
              El archivo generado es compatible con la aplicación <strong style={{color:'rgba(255,255,255,0.7)'}}>DPIVA</strong> del SAT.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
