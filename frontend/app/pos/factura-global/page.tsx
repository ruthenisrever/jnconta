'use client';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

export default function FacturaGlobalPage() {
  const [periodo, setPeriodo] = useState('MENSUAL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState(new Date().getDate());
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

  const generate = async () => {
    setLoading(true); setResult(null);
    const r = await apiFetch('/api/pos/factura-global', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: cid, periodo, year, month, day }) });
    const d = await r.json();
    setResult(d); setLoading(false);
  };

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">CFDI Global POS</h1>
          <p className="page-subtitle">Genera una factura global CFDI 4.0 por los tickets de POS no facturados del periodo</p>
        </div>
      </div>

      <div style={{ maxWidth: 600 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Configurar Período</h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 6 }}>Periodicidad</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['DIARIO', 'SEMANAL', 'MENSUAL'].map(p => (
                <button key={p} onClick={() => setPeriodo(p)} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: periodo === p ? 'var(--primary-600)' : 'var(--surface-2)', color: periodo === p ? '#fff' : 'var(--text-muted)' }}>{p}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: periodo === 'DIARIO' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Año</label>
              <input type="number" className="input" value={year} onChange={e => setYear(Number(e.target.value))} />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Mes</label>
              <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
            {periodo === 'DIARIO' && (
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Día</label>
                <input type="number" className="input" value={day} min={1} max={31} onChange={e => setDay(Number(e.target.value))} />
              </div>
            )}
          </div>

          <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, marginBottom: 20, border: '1px solid var(--border)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>
              Se incluirán todos los tickets POS con estatus <strong style={{ color: 'var(--teal-400)' }}>COBRADO</strong> que no tengan factura asignada en el período seleccionado. El CFDI se emitirá a nombre del público en general (XAXX010101000).
            </p>
          </div>

          <button className="btn-primary" onClick={generate} disabled={loading} style={{ width: '100%', padding: '12px' }}>{loading ? 'Generando CFDI...' : 'Generar Factura Global'}</button>
        </div>

        {result && (
          <div style={{ background: result.error ? '#ef444410' : '#10b98110', border: `1px solid ${result.error ? '#ef4444' : '#10b981'}`, borderRadius: 12, padding: 20 }}>
            {result.error ? (
              <p style={{ color: '#ef4444', fontWeight: 700 }}>⚠ {result.error}</p>
            ) : (
              <>
                <p style={{ color: '#10b981', fontWeight: 800, fontSize: 16, marginBottom: 12 }}>✓ Factura Global Generada</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['Folio', result.folio], ['Tickets incluidos', result.tickets], ['Subtotal', fmt(result.subtotal)], ['IVA', fmt(result.iva)], ['Total', fmt(result.total)]].map(([k, v]) => (
                    <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #10b98120', paddingBottom: 6 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{k}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
