'use client';
import React, { useState, useEffect } from 'react';
import {
  Download, FileText, RefreshCw, AlertCircle,
  Settings
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

interface DiotRow {
  supplierId: string;
  name: string;
  rfc: string;
  type: string;
  operationType: string;
  totalPaid: number;
  base: number;
  iva: number;
}

export default function DiotPage() {
  const [year, setYear] = useState('2024');
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());
  const [data, setData] = useState<DiotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const getCompanyId = () =>
    typeof window !== 'undefined' ? localStorage.getItem('companyId') || '' : '';

  useEffect(() => {
    fetchPreview();
  }, [month, year]);

  async function fetchPreview() {
    setLoading(true);
    try {
      const cid = getCompanyId();
      const r = await apiFetch(`/api/diot/preview?companyId=${cid}&month=${month}&year=${year}`);
      if (r.ok) setData(await r.json());
    } catch (e) {
      console.error('Error fetching DIOT preview', e);
    }
    setLoading(false);
  }

  async function exportDiot() {
    setExporting(true);
    try {
      const cid = getCompanyId();
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      window.location.href = `${base}/api/diot/export?companyId=${cid}&month=${month}&year=${year}`;
    } catch (e) {
      alert('Error al exportar DIOT');
    }
    setExporting(false);
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  return (
    <div className="diot-page" style={{ padding: '24px' }}>
      <header className="main-header" style={{ marginBottom: '24px' }}>
        <div className="header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={28} style={{ color: 'var(--primary-400)' }} />
            Generación de DIOT (SAT)
          </h1>
          <p>Declaración Informativa de Operaciones con Terceros — Base en Flujo de Efectivo</p>
        </div>
        <div className="header-actions">
           <div className="flex gap-2">
              <select className="search-input" style={{ width: '120px' }} value={year} onChange={e => setYear(e.target.value)}>
                {[2022,2023,2024,2025].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="search-input" style={{ width: '150px' }} value={month} onChange={e => setMonth(e.target.value)}>
                {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
           </div>
           <button className="btn btn-primary" onClick={exportDiot} disabled={exporting || data.length === 0}>
             <Download size={16} /> 
             {exporting ? 'Generando...' : 'Descargar Layout (.txt)'}
           </button>
        </div>
      </header>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '24px' }}>
        <div className="kpi-card">
          <p className="kpi-card-label">Proveedores en el Mes</p>
          <p className="kpi-card-value">{data.length}</p>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--primary-400)' }}>
          <p className="kpi-card-label">Total Egresos (Pagado)</p>
          <p className="kpi-card-value" style={{ color: 'var(--primary-300)' }}>{fmt(data.reduce((s, r)=>s+r.totalPaid, 0))}</p>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--success)' }}>
          <p className="kpi-card-label">IVA Acreditable (16%)</p>
          <p className="kpi-card-value" style={{ color: 'var(--success)' }}>{fmt(data.reduce((s, r)=>s+r.iva, 0))}</p>
        </div>
        <div className="kpi-card" style={{ borderLeft: '4px solid var(--info)' }}>
          <p className="kpi-card-label">Base DIOT</p>
          <p className="kpi-card-value" style={{ color: 'var(--info)' }}>{fmt(data.reduce((s, r)=>s+r.base, 0))}</p>
        </div>
      </div>

      <div className="panel animate-in">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="panel-title">Vista Previa de la Declaración</p>
            <p className="panel-subtitle">Verifica los montos antes de generar el archivo para el SAT</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchPreview}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
        <div className="panel-body table-responsive">
          <table>
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>RFC</th>
                <th>Tipo Tercero</th>
                <th>Operación</th>
                <th className="td-amount">Valor Actos (Base)</th>
                <th className="td-amount">IVA Pagado</th>
                <th className="td-amount">Total Pagado</th>
                <th style={{ width: 60 }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={8}>Cargando datos fiscaless...</td></tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.3, display: 'block', margin: '0 auto' }} />
                    No se encontraron pagos a proveedores en este período.
                  </td>
                </tr>
              ) : data.map(row => (
                <tr key={row.supplierId}>
                  <td className="td-primary" style={{ fontWeight: 600 }}>{row.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{row.rfc || '—'}</td>
                  <td>
                    <span className="badge badge-secondary" style={{ fontSize: '10px' }}>
                      {row.type === '04' ? '04-Local' : row.type === '05' ? '05-Extranjero' : '15-Global'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-ghost" style={{ fontSize: '10px' }}>
                      {row.operationType === '03' ? '03-Servicios' : row.operationType === '06' ? '06-Bienes' : '85-Otros'}
                    </span>
                  </td>
                  <td className="td-amount" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(row.base)}</td>
                  <td className="td-amount" style={{ color: 'var(--success)' }}>{fmt(row.iva)}</td>
                  <td className="td-amount">{fmt(row.totalPaid)}</td>
                  <td>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Configurar Proveedor">
                      <Settings size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '24px', border: '1px solid var(--primary-100)', background: 'rgba(27,152,224,0.02)' }}>
        <div className="panel-body" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
           <div style={{ background: 'var(--primary-400)', color: 'white', padding: '12px', borderRadius: '12px' }}>
             <AlertCircle size={24} />
           </div>
           <div>
             <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>Reglas Fiscales de la DIOT</h3>
             <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
               El sistema captura automáticamente los pagos realizados desde cuentas bancarias a cuentas de pasivo (Proveedores). 
               Asegúrate de que tus pólizas de Egreso tengan vinculado el RFC del beneficiario para una atribución correcta.
             </p>
           </div>
        </div>
      </div>

      <style jsx>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
