'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function DeclaracionAnualPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);
  const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    const r = await apiFetch(`/api/reports/declaracion-anual?companyId=${cid}&year=${year}`);
    const d = await r.json();
    setData(d); setLoading(false);
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = [['Ejercicio', data.ejercicio], ['Ingresos Totales', data.totalIngresos], ['Deducciones Totales', data.totalDeducciones], ['Utilidad Fiscal', data.utilidadFiscal], ['ISR Anual (30%)', data.isrAnual], ['IVA Trasladado', data.totalIvaGravado], ['IVA Acreditable', data.totalIvaAcreditable], ['IVA a Cargo', data.ivaACargo]];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `declaracion-anual-${data.ejercicio}.csv`; a.click();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Declaración Anual ISR</h1>
          <p className="page-subtitle">Resumen fiscal anual — ingresos, deducciones, utilidad e ISR (Art. 9 LISR)</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="input" style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2022, 2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-primary" onClick={load} disabled={loading}>{loading ? 'Calculando...' : 'Calcular'}</button>
          {data && <button onClick={exportCSV} style={{ background: '#10b98120', border: '1px solid #10b98130', color: '#10b981', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Exportar CSV</button>}
        </div>
      </div>

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Ingresos Acumulables', value: data.totalIngresos, color: '#06b6d4' },
              { label: 'Deducciones Autorizadas', value: data.totalDeducciones, color: '#f59e0b' },
              { label: 'Utilidad Fiscal', value: data.utilidadFiscal, color: '#10b981' },
              { label: 'ISR Causado (30%)', value: data.isrAnual, color: '#ef4444' },
            ].map(k => (
              <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6 }}>{k.label}</p>
                <p style={{ color: k.color, fontWeight: 800, fontSize: 20 }}>{fmt(k.value)}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: 16, fontSize: 15 }}>Ingresos Mensuales {data.ejercicio}</h3>
              {(data.ingresosMensuales ?? []).map((m: any) => (
                <div key={m.mes} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, width: 32 }}>{meses[m.mes - 1]}</span>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                    <div style={{ height: 8, background: 'var(--primary-500)', borderRadius: 4, width: `${data.totalIngresos > 0 ? Math.min(100, (m.subtotal / data.totalIngresos) * 100 * 12) : 0}%` }} />
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, minWidth: 90, textAlign: 'right' }}>{fmt(m.subtotal)}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: 16, fontSize: 15 }}>Determinación ISR Anual</h3>
              {[
                ['(+) Ingresos acumulables', data.totalIngresos, '#06b6d4'],
                ['(-) Deducciones autorizadas', data.totalDeducciones, '#f59e0b'],
                ['(=) Utilidad fiscal', data.utilidadFiscal, '#10b981'],
                ['×  Tasa ISR personas morales', '30%', '#8b5cf6'],
                ['(=) ISR causado', data.isrAnual, '#ef4444'],
                ['', null, ''],
                ['IVA trasladado', data.totalIvaGravado, '#06b6d4'],
                ['IVA acreditable', data.totalIvaAcreditable, '#f59e0b'],
                ['IVA a cargo (pagar)', data.ivaACargo, '#ef4444'],
              ].map((row, i) => row[1] === null ? <hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} /> : (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{row[0]}</span>
                  <span style={{ color: row[2] as string, fontWeight: 700, fontSize: 13 }}>{typeof row[1] === 'number' ? fmt(row[1]) : row[1]}</span>
                </div>
              ))}
              <div style={{ marginTop: 16, background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  * Cálculo simplificado para personas morales (Art. 9 LISR). Aplica tasa del 30% sobre la utilidad fiscal del ejercicio. Para personas físicas, la tasa aplicable varía según la tabla del Art. 152 LISR.
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                  Facturas emitidas: <strong style={{ color: 'var(--text-primary)' }}>{data.facturas}</strong> · Facturas de compras: <strong style={{ color: 'var(--text-primary)' }}>{data.compras}</strong>
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 80 }}>
          <p>Selecciona el ejercicio fiscal y haz clic en <strong>Calcular</strong></p>
        </div>
      )}
    </div>
  );
}
