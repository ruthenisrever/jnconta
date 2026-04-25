'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function SerialsLotsPage() {
  const [serials, setSerials] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tab, setTab] = useState<'series' | 'lotes'>('series');
  const [sForm, setSForm] = useState({ productId: '', serials: '', warehouseId: '' });
  const [lForm, setLForm] = useState({ productId: '', lotNumber: '', quantity: 1, expiryDate: '' });
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [s, l, p] = await Promise.all([
      apiFetch(`/api/serials-lots/serials?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/serials-lots/lots?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/products?companyId=${cid}`).then(r => r.json()),
    ]);
    setSerials(Array.isArray(s) ? s : []);
    setLots(Array.isArray(l) ? l : []);
    setProducts(Array.isArray(p) ? p : []);
  };

  const createSerials = async () => {
    const serialList = sForm.serials.split('\n').map(s => s.trim()).filter(Boolean);
    await apiFetch('/api/serials-lots/serials/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: sForm.productId, serials: serialList, warehouseId: sForm.warehouseId || undefined, companyId: cid }) });
    setSForm({ productId: '', serials: '', warehouseId: '' }); load();
  };

  const createLot = async () => {
    await apiFetch('/api/serials-lots/lots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...lForm, companyId: cid }) });
    setLForm({ productId: '', lotNumber: '', quantity: 1, expiryDate: '' }); load();
  };

  const statusColor: Record<string, string> = { DISPONIBLE: '#10b981', VENDIDO: '#6b7280', DAÑADO: '#ef4444' };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Series y Lotes</h1>
          <p className="page-subtitle">Control de números de serie y lotes de producción por producto</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['series', 'lotes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: tab === t ? 'var(--primary-600)' : 'var(--surface-2)', color: tab === t ? '#fff' : 'var(--text-muted)' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'series' && (
        <>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Registrar Números de Serie</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Producto</label>
                <select className="input" value={sForm.productId} onChange={e => setSForm(f => ({ ...f, productId: e.target.value }))}>
                  <option value="">-- Seleccionar --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Números de serie (uno por línea)</label>
                <textarea className="input" rows={4} value={sForm.serials} onChange={e => setSForm(f => ({ ...f, serials: e.target.value }))} placeholder="SN-001&#10;SN-002&#10;SN-003" style={{ resize: 'vertical' }} />
              </div>
            </div>
            <button className="btn-primary" onClick={createSerials} disabled={!sForm.productId || !sForm.serials.trim()}>Registrar Series</button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Producto</th><th>Número de Serie</th><th>Estatus</th><th>Almacén</th><th>Fecha</th></tr></thead>
              <tbody>
                {serials.map(s => (
                  <tr key={s.id}>
                    <td>{s.product?.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--teal-400)', fontWeight: 700 }}>{s.serial}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusColor[s.status] ?? '#6b7280'}20`, color: statusColor[s.status] ?? '#6b7280' }}>{s.status}</span></td>
                    <td>{s.warehouse?.name ?? '—'}</td>
                    <td>{new Date(s.createdAt).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
                {serials.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin series registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'lotes' && (
        <>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Registrar Lote</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <select className="input" value={lForm.productId} onChange={e => setLForm(f => ({ ...f, productId: e.target.value }))}>
                <option value="">-- Producto --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
              </select>
              <input className="input" placeholder="Nº de Lote" value={lForm.lotNumber} onChange={e => setLForm(f => ({ ...f, lotNumber: e.target.value }))} />
              <input type="number" className="input" placeholder="Cantidad" value={lForm.quantity} onChange={e => setLForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
              <input type="date" className="input" value={lForm.expiryDate} onChange={e => setLForm(f => ({ ...f, expiryDate: e.target.value }))} title="Fecha de caducidad" />
            </div>
            <button className="btn-primary" onClick={createLot} disabled={!lForm.productId || !lForm.lotNumber}>Registrar Lote</button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Producto</th><th>Nº Lote</th><th>Cantidad Inicial</th><th>Restante</th><th>Caducidad</th></tr></thead>
              <tbody>
                {lots.map(l => (
                  <tr key={l.id}>
                    <td>{l.product?.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--teal-400)', fontWeight: 700 }}>{l.lotNumber}</td>
                    <td>{l.quantity}</td>
                    <td style={{ fontWeight: 700, color: l.remaining <= 0 ? '#ef4444' : '#10b981' }}>{l.remaining}</td>
                    <td style={{ color: l.expiryDate && new Date(l.expiryDate) < new Date() ? '#ef4444' : 'var(--text-primary)' }}>{l.expiryDate ? new Date(l.expiryDate).toLocaleDateString('es-MX') : 'N/A'}</td>
                  </tr>
                ))}
                {lots.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin lotes registrados</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
