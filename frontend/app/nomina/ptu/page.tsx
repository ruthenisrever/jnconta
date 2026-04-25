'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Calculator, Download, Info, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function PtuPage() {
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [ptuPool, setPtuPool] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    setCompanyId(localStorage.getItem('companyId') || '');
  }, []);

  const calcular = async () => {
    if (!ptuPool || Number(ptuPool) <= 0) return alert('Ingresa el monto total de PTU a repartir');
    setLoading(true);
    try {
      const res = await apiFetch('/api/nomina/calculate/ptu', {
        method: 'POST',
        body: JSON.stringify({ companyId, totalPtuPool: Number(ptuPool), year }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResults(data);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const total = results.reduce((s, r) => s + (r.ptu || 0), 0);
  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>PTU — Participación de Utilidades</h1>
          <p>Calcula la PTU por empleado con base en el salario anual (Art. 123 Constitucional y LFT).</p>
        </div>
      </header>

      <div className="panel mb-8">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Calculator size={18} className="text-primary-400" /> Parámetros de Cálculo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="form-label">Año Fiscal</label>
            <select className="input" value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Monto Total PTU a Repartir ($)</label>
            <input
              type="number"
              className="input"
              placeholder="Ej. 150000"
              value={ptuPool}
              onChange={e => setPtuPool(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full flex items-center justify-center gap-2" onClick={calcular} disabled={loading}>
              <Calculator size={16} /> {loading ? 'Calculando...' : 'Calcular PTU'}
            </button>
          </div>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 flex gap-2">
          <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300">
            El monto total de PTU se determina aplicando el 10% sobre la utilidad fiscal declarada ante el SAT.
            La distribución se hace 50% proporcional al salario ganado y 50% proporcional a los días trabajados.
            El plazo máximo de reparto es 60 días después de presentar la declaración anual.
          </p>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="kpi-card">
              <div className="kpi-card-icon amber mb-4"><DollarSign size={24} /></div>
              <div className="kpi-card-label">PTU Total Repartida</div>
              <div className="kpi-card-value">{fmt(total)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-icon blue mb-4"><Users size={24} /></div>
              <div className="kpi-card-label">Empleados Beneficiados</div>
              <div className="kpi-card-value">{results.length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-icon teal mb-4"><Calculator size={24} /></div>
              <div className="kpi-card-label">Promedio PTU</div>
              <div className="kpi-card-value">{fmt(total / results.length)}</div>
            </div>
          </div>

          <div className="panel">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Distribución por Empleado — Año {year}</h3>
              <button className="btn btn-secondary btn-sm flex items-center gap-2">
                <Download size={14} /> Excel
              </button>
            </div>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th className="text-right">Salario Anual</th>
                    <th className="text-right">% del Total</th>
                    <th className="text-right">PTU Calculada</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r: any) => (
                    <tr key={r.employeeId}>
                      <td className="font-medium">{r.name}</td>
                      <td className="text-right">{fmt(r.annualSalary)}</td>
                      <td className="text-right text-muted">
                        {((r.ptu / total) * 100).toFixed(1)}%
                      </td>
                      <td className="text-right font-bold text-success">{fmt(r.ptu)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                    <td>TOTAL</td>
                    <td className="text-right">{fmt(results.reduce((s, r) => s + r.annualSalary, 0))}</td>
                    <td className="text-right">100%</td>
                    <td className="text-right text-success">{fmt(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
