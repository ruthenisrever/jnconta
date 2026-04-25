'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, Users, Calendar } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function RetencionesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [allRetentions, setAllRetentions] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    apiFetch(`/api/nomina/employees?companyId=${cid}`)
      .then(r => r.json()).then(setEmployees);
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/nomina/retenciones-anuales?companyId=${companyId}&year=${year}`);
      const data = await res.json();
      setAllRetentions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Constancias de Retenciones</h1>
          <p>Genera las constancias anuales de retenciones de ISR e IMSS para entrega a empleados (Art. 99 LISR).</p>
        </div>
        <div className="header-actions">
          <select className="input w-28" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary flex items-center gap-2" onClick={loadAll} disabled={loading}>
            <Users size={16} /> {loading ? 'Cargando...' : 'Generar Todas'}
          </button>
        </div>
      </header>

      {allRetentions.length > 0 && (
        <div className="panel mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <FileText size={18} className="text-primary-400" /> Resumen Retenciones {year}
            </h3>
            <button className="btn btn-secondary flex items-center gap-2">
              <Download size={14} /> Descargar Todo
            </button>
          </div>
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>RFC</th>
                  <th className="text-right">Total Percepciones</th>
                  <th className="text-right">ISR Retenido</th>
                  <th className="text-right">IMSS Obrero</th>
                  <th className="text-right">Total Deducciones</th>
                  <th className="text-right">Neto Pagado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {allRetentions.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="font-medium">{r.employeeName || r.name}</td>
                    <td className="font-mono text-xs">{r.rfc}</td>
                    <td className="text-right">{fmt(r.totalPerceptions)}</td>
                    <td className="text-right text-danger">{fmt(r.totalIsr)}</td>
                    <td className="text-right text-danger">{fmt(r.totalImss)}</td>
                    <td className="text-right">{fmt(r.totalDeductions)}</td>
                    <td className="text-right font-bold text-success">{fmt(r.netPaid || r.totalPerceptions - r.totalDeductions)}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm p-1" title="Descargar constancia PDF">
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={2}>TOTAL</td>
                  <td className="text-right">{fmt(allRetentions.reduce((s, r) => s + (r.totalPerceptions || 0), 0))}</td>
                  <td className="text-right text-danger">{fmt(allRetentions.reduce((s, r) => s + (r.totalIsr || 0), 0))}</td>
                  <td className="text-right text-danger">{fmt(allRetentions.reduce((s, r) => s + (r.totalImss || 0), 0))}</td>
                  <td className="text-right">{fmt(allRetentions.reduce((s, r) => s + (r.totalDeductions || 0), 0))}</td>
                  <td className="text-right text-success">{fmt(allRetentions.reduce((s, r) => s + (r.netPaid || r.totalPerceptions - r.totalDeductions || 0), 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="panel">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-primary-400" /> Información
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-muted">
          <div className="space-y-2">
            <p className="font-bold text-white">¿Cuándo entregar la constancia?</p>
            <p>A más tardar el último día de <strong className="text-amber-400">febrero</strong> del año siguiente al que corresponde.</p>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-white">¿Qué contiene?</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Total de percepciones anuales</li>
              <li>ISR retenido total del año</li>
              <li>Cuotas IMSS retenidas</li>
              <li>Subsidio al empleo acreditable</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
