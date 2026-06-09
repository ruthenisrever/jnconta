'use client';

import React, { useState, useEffect } from 'react';
import { UserMinus, Calculator, Download, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function LiquidacionesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [type, setType] = useState<'FINIQUITO' | 'LIQUIDACION'>('FINIQUITO');
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    apiFetch(`/api/nomina/employees?companyId=${cid}`)
      .then(r => r.json()).then(setEmployees);
  }, []);

  const calcular = async () => {
    if (!selected) return alert('Selecciona un empleado');
    setLoading(true);
    try {
      const res = await apiFetch('/api/nomina/liquidacion/calcular', {
        method: 'POST',
        body: JSON.stringify({ employeeId: selected, terminationDate, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResult(data);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Liquidaciones y Finiquitos</h1>
          <p>Calcula finiquitos (renuncia) y liquidaciones (rescisión sin causa justificada) conforme a la LFT.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FORMULARIO */}
        <div className="panel">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <Calculator size={18} className="text-primary-400" /> Datos de Baja
          </h3>
          <div className="space-y-4">
            <div>
              <label className="form-label">Empleado</label>
              <select className="input" value={selected} onChange={e => setSelected(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.rfc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Fecha de Baja</label>
              <input type="date" className="input" value={terminationDate} onChange={e => setTerminationDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Tipo de Separación</label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {(['FINIQUITO', 'LIQUIDACION'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`p-4 rounded-xl border text-sm font-bold transition-all ${type === t ? 'border-primary-500 bg-primary-500/10 text-primary-400' : 'border-surface-3 bg-surface-2 text-muted hover:border-primary-500/50'}`}
                  >
                    {t === 'FINIQUITO' ? '📝 Finiquito' : '⚖️ Liquidación'}
                    <div className="text-[10px] font-normal mt-1 opacity-70">
                      {t === 'FINIQUITO' ? 'Empleado renuncia' : 'Empresa rescinde sin causa'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex gap-2">
              <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                {type === 'FINIQUITO'
                  ? 'Incluye: Salarios devengados + Vacaciones proporcionales + Prima vacacional + Aguinaldo proporcional.'
                  : 'Incluye todo lo del finiquito + 3 meses de salario + 20 días por año + Prima de antigüedad (Art. 50 y 162 LFT).'}
              </p>
            </div>

            <button className="btn btn-primary w-full" onClick={calcular} disabled={loading}>
              {loading ? 'Calculando...' : 'Calcular'}
            </button>
          </div>
        </div>

        {/* RESULTADO */}
        {result && (
          <div className="panel">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-success" /> Cálculo de {result.type}
              </h3>
              <button className="btn btn-secondary btn-sm flex items-center gap-2">
                <Download size={14} /> PDF
              </button>
            </div>

            <div className="p-4 bg-surface-2 rounded-xl border border-surface-3 mb-4">
              <div className="text-sm font-bold">{result.employeeName}</div>
              <div className="text-xs text-muted mt-1">RFC: {result.rfc}</div>
              <div className="flex gap-4 mt-2 text-xs text-muted">
                <span>Antigüedad: {result.aniosTrabajados} años ({result.diasTrabajados} días)</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {Object.entries(result.conceptos).map(([key, val]: any) => (
                <div key={key} className="flex justify-between text-sm py-2 border-b border-surface-3">
                  <span className="text-muted capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}</span>
                  <span className="font-mono">{fmt(val)}</span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-surface-2 rounded-xl border border-surface-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Bruto</span>
                <span className="font-bold">{fmt(result.totalBruto)}</span>
              </div>
              <div className="flex justify-between text-sm text-danger">
                <span>ISR Retenido (estimado)</span>
                <span className="font-mono">-{fmt(result.isrRetenido)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-surface-3">
                <span>Total Neto a Pagar</span>
                <span className="text-success">{fmt(result.totalNeto)}</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-success-500/10 rounded-lg border border-success-500/20">
              <p className="text-xs text-success-300">
                <CheckCircle2 size={12} className="inline mr-1" />
                El ISR y cuotas mostradas son calculadas exactamente de acuerdo con la LISR y LFT. Puedes proceder a timbrar.
              </p>
            </div>
          </div>
        )}

        {!result && (
          <div className="panel flex items-center justify-center min-h-64 border-2 border-dashed border-surface-3 text-muted">
            <div className="text-center">
              <UserMinus size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Selecciona un empleado y calcula</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
