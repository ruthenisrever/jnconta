'use client';

import React, { useState, useEffect } from 'react';
import { Clock, RefreshCw, TrendingDown } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function AntiguedadSaldosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'CXC' | 'CXP'>('CXC');
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    load(cid, 'CXC');
  }, []);

  const load = async (cid: string, t: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reports/aging?companyId=${cid}&type=${t}`);
      setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const buckets = [
    { key: 'corriente', label: 'Corriente', color: 'text-success' },
    { key: 'd30', label: '1–30 días', color: 'text-amber-400' },
    { key: 'd60', label: '31–60 días', color: 'text-orange-400' },
    { key: 'd90', label: '61–90 días', color: 'text-red-400' },
    { key: 'mas90', label: '+90 días', color: 'text-danger' },
  ];

  const bucketColor: Record<string, string> = {
    corriente: 'badge-success', d30: 'badge-warning', d60: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    d90: 'bg-red-500/20 text-red-400 border-red-500/30', mas90: 'badge-danger',
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Antigüedad de Saldos</h1>
          <p>Análisis de cartera vencida por rangos de días — CxC (clientes) y CxP (proveedores).</p>
        </div>
        <div className="header-actions">
          <div className="flex gap-1 bg-surface-2 rounded-xl p-1">
            <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${type === 'CXC' ? 'bg-primary-600 text-white' : 'text-muted hover:text-white'}`}
              onClick={() => { setType('CXC'); load(companyId, 'CXC'); }}>Clientes (CxC)</button>
            <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${type === 'CXP' ? 'bg-primary-600 text-white' : 'text-muted hover:text-white'}`}
              onClick={() => { setType('CXP'); load(companyId, 'CXP'); }}>Proveedores (CxP)</button>
          </div>
          <button className="btn btn-secondary" onClick={() => load(companyId, type)}><RefreshCw size={16} /></button>
        </div>
      </header>

      {/* Resumen por bucket */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {buckets.map(b => (
          <div key={b.key} className="kpi-card">
            <div className="kpi-card-label">{b.label}</div>
            <div className={`kpi-card-value text-xl ${b.color}`}>{fmt(data?.totals?.[b.key] ?? 0)}</div>
          </div>
        ))}
      </div>

      {/* Total vencido */}
      {data && (
        <div className="flex gap-4 mb-6">
          <div className="panel flex-1 flex items-center gap-4">
            <TrendingDown size={32} className="text-danger flex-shrink-0" />
            <div>
              <div className="text-sm text-muted">Total {type === 'CXC' ? 'por cobrar' : 'por pagar'}</div>
              <div className="text-2xl font-bold">{fmt(data.rows.reduce((s: number, r: any) => s + r.total, 0))}</div>
            </div>
            <div className="ml-auto">
              <div className="text-sm text-muted">Vencido (&gt;0 días)</div>
              <div className="text-xl font-bold text-danger">
                {fmt(data.rows.filter((r: any) => r.diasVencido > 0).reduce((s: number, r: any) => s + r.total, 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        {loading ? <div className="spinner mx-auto" /> : (
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>{type === 'CXC' ? 'Cliente' : 'Proveedor'}</th>
                  <th>Folio</th><th>Fecha</th><th>Vencimiento</th>
                  <th className="text-right">Días vencido</th>
                  <th className="text-right">Total</th>
                  <th>Bucket</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-medium text-sm">{r.cliente ?? r.proveedor}</td>
                    <td className="font-mono text-xs text-muted">{r.folio}</td>
                    <td className="text-xs">{new Date(r.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="text-xs">{new Date(r.vencimiento).toLocaleDateString('es-MX')}</td>
                    <td className={`text-right font-bold ${r.diasVencido > 0 ? 'text-danger' : 'text-success'}`}>
                      {r.diasVencido > 0 ? `+${r.diasVencido}` : '—'}
                    </td>
                    <td className="text-right font-bold">{fmt(r.total)}</td>
                    <td><span className={`badge border ${bucketColor[r.bucket]}`}>{buckets.find(b => b.key === r.bucket)?.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(data?.rows ?? []).length === 0 && (
              <p className="text-center text-muted py-8">No hay saldos pendientes. ¡Todo está al corriente!</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
