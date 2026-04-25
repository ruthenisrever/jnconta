'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, Download, TrendingUp, TrendingDown, BarChart3, Info, Calendar } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function IsrProvisionalPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    loadData(cid, now.getMonth() + 1, now.getFullYear());
  }, []);

  const loadData = async (cid: string, m: number, y: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reports/tax-simulator?companyId=${cid}&month=${m}&year=${y}`);
      const d = await res.json();
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => loadData(companyId, month, year);
  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>ISR Provisional Mensual</h1>
          <p>Estimación del pago provisional de ISR (Art. 14 LISR) — Personas Morales Régimen General.</p>
        </div>
        <div className="header-actions">
          <select className="input w-36" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-28" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary flex items-center gap-2" onClick={handleFilter} disabled={loading}>
            <Calculator size={16} /> {loading ? 'Calculando...' : 'Calcular'}
          </button>
          {data && (
            <button className="btn btn-secondary flex items-center gap-2">
              <Download size={16} /> PDF
            </button>
          )}
        </div>
      </header>

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="kpi-card border-l-4 border-l-teal-500">
              <div className="kpi-card-label">Ingresos del Periodo</div>
              <div className="kpi-card-value text-teal-400">{fmt(data.isr?.ingresos)}</div>
            </div>
            <div className="kpi-card border-l-4 border-l-red-500">
              <div className="kpi-card-label">Deducciones Autorizadas</div>
              <div className="kpi-card-value text-danger">{fmt(data.isr?.deducciones)}</div>
            </div>
            <div className="kpi-card border-l-4 border-l-amber-500">
              <div className="kpi-card-label">Base Gravable</div>
              <div className="kpi-card-value text-amber-400">{fmt(data.isr?.base)}</div>
            </div>
            <div className="kpi-card border-l-4 border-l-primary-500">
              <div className="kpi-card-label">ISR Estimado a Pagar</div>
              <div className="kpi-card-value text-primary-400">{fmt(data.isr?.estimado)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CALCULO ISR */}
            <div className="panel">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <Calculator size={18} className="text-primary-400" />
                Cédula ISR Provisional — {meses[month - 1]} {year}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-3 border-b border-surface-3">
                  <span className="text-sm">Ingresos Nominales del Periodo</span>
                  <span className="font-bold text-teal-400">{fmt(data.isr?.ingresos)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-surface-3">
                  <span className="text-sm text-muted">(–) Deducciones Autorizadas</span>
                  <span className="font-bold text-danger">({fmt(data.isr?.deducciones)})</span>
                </div>
                <div className="flex justify-between py-3 border-b border-surface-3 bg-surface-2 px-3 rounded">
                  <span className="text-sm font-bold">Base para ISR Provisional</span>
                  <span className="font-bold">{fmt(data.isr?.base)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-surface-3">
                  <span className="text-sm text-muted">Tasa Aplicable (Art. 9 LISR)</span>
                  <span className="font-mono text-amber-400">30%</span>
                </div>
                <div className="flex justify-between py-3 border-b border-surface-3">
                  <span className="text-sm text-muted">(–) Pagos Provisionales Anteriores</span>
                  <span className="font-mono text-muted">$0.00*</span>
                </div>
                <div className="flex justify-between py-4 bg-primary-500/10 rounded-xl px-4 border border-primary-500/20">
                  <span className="font-bold">ISR a Pagar este Mes</span>
                  <span className="font-bold text-xl text-primary-400">{fmt(data.isr?.estimado)}</span>
                </div>
              </div>
              <p className="text-xs text-muted mt-3 italic">* Los pagos provisionales anteriores deben actualizarse manualmente en el sistema.</p>
            </div>

            {/* IVA PANEL */}
            <div className="panel">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <BarChart3 size={18} className="text-teal-400" />
                IVA Estimado — {meses[month - 1]} {year}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-3 border-b border-surface-3">
                  <span className="text-sm">IVA Trasladado (Ventas 16%)</span>
                  <span className="font-bold text-danger">{fmt(data.iva?.trasladado)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-surface-3">
                  <span className="text-sm text-muted">(–) IVA Acreditable (Compras)</span>
                  <span className="font-bold text-success">({fmt(data.iva?.acreditable)})</span>
                </div>
                <div className={`flex justify-between py-4 rounded-xl px-4 border ${(data.iva?.neto ?? 0) > 0 ? 'bg-danger/10 border-danger/20' : 'bg-success/10 border-success/20'}`}>
                  <span className="font-bold">IVA Neto a Pagar / Favor</span>
                  <span className={`font-bold text-xl ${(data.iva?.neto ?? 0) > 0 ? 'text-danger' : 'text-success'}`}>
                    {(data.iva?.neto ?? 0) < 0 ? 'SALDO A FAVOR ' : ''}{fmt(Math.abs(data.iva?.neto ?? 0))}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-surface-2 rounded-xl border border-surface-3">
                <h4 className="font-bold mb-3 text-sm flex items-center gap-2">
                  <TrendingUp size={16} className="text-amber-400" /> Resumen Obligaciones del Mes
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>ISR Provisional</span>
                    <span className="font-bold">{fmt(data.isr?.estimado)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IVA a Cargo</span>
                    <span className="font-bold">{fmt(Math.max(0, data.iva?.neto ?? 0))}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-surface-3">
                    <span>Total Obligaciones Fiscales</span>
                    <span className="text-primary-400">{fmt(data.summary?.totalToPay)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 flex gap-3">
            <Info size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300 space-y-1">
              <p className="font-bold">Aviso importante</p>
              <p>Este cálculo es una <strong>estimación</strong> basada en los datos registrados en JnConta. Para presentar tu declaración provisional, utiliza el portal del SAT (DeclaraSAT) o consulta a tu contador. Los pagos provisionales de ISR vencen el día 17 del mes siguiente al periodo declarado.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
