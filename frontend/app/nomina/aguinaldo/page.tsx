'use client';

import React, { useState, useEffect } from 'react';
import { Gift, Calculator, Download, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function AguinaldoPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    setCompanyId(localStorage.getItem('companyId') || '');
  }, []);

  const simular = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/nomina/simulate/aguinaldo?companyId=${companyId}&year=${year}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResults(data);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const total = results.reduce((s, r) => s + (r.aguinaldo || 0), 0);
  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Cálculo de Aguinaldo</h1>
          <p>Simula el aguinaldo proporcional por empleado (Art. 87 LFT — mínimo 15 días de salario).</p>
        </div>
        <div className="header-actions">
          <select className="input w-32" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary flex items-center gap-2" onClick={simular} disabled={loading}>
            <Calculator size={16} /> {loading ? 'Calculando...' : 'Simular Aguinaldo'}
          </button>
          {results.length > 0 && (
            <button className="btn btn-secondary flex items-center gap-2">
              <Download size={16} /> Excel
            </button>
          )}
        </div>
      </header>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="kpi-card">
              <div className="kpi-card-icon amber mb-4"><Gift size={24} /></div>
              <div className="kpi-card-label">Total Aguinaldo</div>
              <div className="kpi-card-value">{fmt(total)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-icon blue mb-4"><Users size={24} /></div>
              <div className="kpi-card-label">Empleados</div>
              <div className="kpi-card-value">{results.length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-icon teal mb-4"><Calculator size={24} /></div>
              <div className="kpi-card-label">Promedio por Empleado</div>
              <div className="kpi-card-value">{fmt(total / results.length)}</div>
            </div>
          </div>

          <div className="panel">
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>RFC</th>
                    <th>Salario Diario</th>
                    <th>Días Trabajados</th>
                    <th>Días Aguinaldo</th>
                    <th className="text-right">Aguinaldo Bruto</th>
                    <th className="text-right">ISR</th>
                    <th className="text-right">Aguinaldo Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r: any) => (
                    <tr key={r.employeeId}>
                      <td className="font-medium">{r.name}</td>
                      <td className="text-xs font-mono">{r.rfc}</td>
                      <td>{fmt(r.dailySalary)}</td>
                      <td>{r.diasTrabajados}</td>
                      <td>{parseFloat(r.diasProporcionales?.toFixed(2) ?? r.diasAguinaldo ?? 0)}</td>
                      <td className="text-right font-bold">{fmt(r.aguinaldo)}</td>
                      <td className="text-right text-danger">{fmt(r.isr ?? 0)}</td>
                      <td className="text-right font-bold text-success">{fmt((r.aguinaldo ?? 0) - (r.isr ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold border-t-2 border-primary-500/30">
                    <td colSpan={5}>TOTAL</td>
                    <td className="text-right">{fmt(total)}</td>
                    <td className="text-right text-danger">{fmt(results.reduce((s, r) => s + (r.isr ?? 0), 0))}</td>
                    <td className="text-right text-success">{fmt(results.reduce((s, r) => s + (r.aguinaldo ?? 0) - (r.isr ?? 0), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {!results.length && !loading && (
        <div className="panel flex items-center justify-center min-h-64 border-2 border-dashed border-surface-3 text-muted">
          <div className="text-center">
            <Gift size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Selecciona el año y presiona Simular Aguinaldo</p>
          </div>
        </div>
      )}
    </div>
  );
}
