'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, Calculator, Play, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function DepreciacionPage() {
  const now = new Date();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [companyId, setCompanyId] = useState('');
  const [result, setResult] = useState<any>(null);

  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    loadAssets(cid);
  }, []);

  const loadAssets = async (cid: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/assets/depreciation-preview?companyId=${cid}`);
      const data = await res.json();
      setAssets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const postDepreciation = async () => {
    if (!confirm(`¿Contabilizar depreciación de ${meses[month - 1]} ${year}? Se generará una póliza de diario automática.`)) return;
    setPosting(true);
    try {
      const res = await apiFetch('/api/assets/depreciate/post', {
        method: 'POST',
        body: JSON.stringify({ companyId, year, month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResult(data);
      loadAssets(companyId);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setPosting(false);
    }
  };

  const totalMonthly = assets.reduce((s, a) => s + (a.monthlyDepreciation || 0), 0);
  const totalAcum = assets.reduce((s, a) => s + (a.accumulatedDep || 0), 0);
  const totalNet = assets.reduce((s, a) => s + (a.netValue || 0), 0);
  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const categoryColor: Record<string, string> = {
    MOBILIARIO: 'bg-blue-500/20 text-blue-400',
    EQUIPO_COMPUTO: 'bg-purple-500/20 text-purple-400',
    VEHICULO: 'bg-amber-500/20 text-amber-400',
    MAQUINARIA: 'bg-teal-500/20 text-teal-400',
    EDIFICIO: 'bg-orange-500/20 text-orange-400',
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Depreciación de Activos Fijos</h1>
          <p>Cédula de depreciación mensual conforme a tasas SAT (Art. 34 LISR). Contabilización automática.</p>
        </div>
        <div className="header-actions">
          <select className="input w-32" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {meses.map((m, i) => <option key={i} value={i + 1}>{m} {year}</option>)}
          </select>
          <select className="input w-28" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary flex items-center gap-2">
            <Download size={16} /> Excel
          </button>
          <button
            className="btn btn-primary flex items-center gap-2"
            onClick={postDepreciation}
            disabled={posting || assets.length === 0}
          >
            <Play size={16} /> {posting ? 'Contabilizando...' : 'Contabilizar Depreciación'}
          </button>
        </div>
      </header>

      {result && (
        <div className="p-4 bg-success/10 border border-success/30 rounded-xl flex items-center gap-3 mb-6">
          <CheckCircle2 size={20} className="text-success" />
          <div>
            <div className="font-bold text-success">Depreciación contabilizada correctamente</div>
            <div className="text-xs text-muted">{result.totalAssets} activos procesados — Total: {fmt(result.totalAmount)} — Póliza: {result.journalId?.slice(0, 8)}...</div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="kpi-card">
          <div className="kpi-card-label">Activos en Operación</div>
          <div className="kpi-card-value">{assets.length}</div>
        </div>
        <div className="kpi-card border-l-4 border-l-amber-500">
          <div className="kpi-card-label">Depreciación Mensual</div>
          <div className="kpi-card-value text-amber-400">{fmt(totalMonthly)}</div>
        </div>
        <div className="kpi-card border-l-4 border-l-danger">
          <div className="kpi-card-label">Depreciación Acumulada</div>
          <div className="kpi-card-value text-danger">{fmt(totalAcum)}</div>
        </div>
        <div className="kpi-card border-l-4 border-l-teal-500">
          <div className="kpi-card-label">Valor Neto en Libros</div>
          <div className="kpi-card-value text-teal-400">{fmt(totalNet)}</div>
        </div>
      </div>

      <div className="panel">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <Briefcase size={18} className="text-primary-400" /> Cédula de Depreciación
        </h3>

        {loading ? (
          <div className="py-12 text-center text-muted">Cargando activos...</div>
        ) : assets.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-surface-3 rounded-2xl text-muted">
            No hay activos fijos registrados. Ve a <a href="/activos" className="text-primary-400 underline">Activos Fijos</a> para agregar.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Activo</th>
                  <th>Categoría</th>
                  <th className="text-right">Costo Adquisición</th>
                  <th className="text-right">Tasa SAT</th>
                  <th className="text-right">Dep. Mensual</th>
                  <th className="text-right">Dep. Acumulada</th>
                  <th className="text-right">Valor Neto</th>
                  <th className="text-right">% Depreciado</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a: any) => {
                  const pct = a.acquisitionCost > 0 ? (a.accumulatedDep / a.acquisitionCost) * 100 : 0;
                  return (
                    <tr key={a.id}>
                      <td className="text-xs font-mono text-muted">{a.assetNumber}</td>
                      <td>
                        <div className="font-medium">{a.name}</div>
                        <div className="text-xs text-muted">{a.location}</div>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${categoryColor[a.category] || 'bg-surface-2 text-muted'}`}>
                          {a.category?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="text-right">{fmt(a.acquisitionCost)}</td>
                      <td className="text-right font-mono">{a.depreciationRate}%</td>
                      <td className="text-right font-bold text-amber-400">{fmt(a.monthlyDepreciation)}</td>
                      <td className="text-right text-danger">{fmt(a.accumulatedDep)}</td>
                      <td className="text-right font-bold">{fmt(a.netValue)}</td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-surface-3">
                            <div className="h-full rounded-full bg-danger" style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-muted">{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={5}>TOTALES</td>
                  <td className="text-right text-amber-400">{fmt(totalMonthly)}</td>
                  <td className="text-right text-danger">{fmt(totalAcum)}</td>
                  <td className="text-right">{fmt(totalNet)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {assets.some((a: any) => !a.expenseAccountId || !a.accumulatedAccountId) && (
          <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex gap-2">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-300">
              Algunos activos no tienen cuentas contables configuradas. Asigna las cuentas de <em>Gasto por Depreciación</em> y <em>Depreciación Acumulada</em> en el catálogo del activo para que la póliza sea completa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
