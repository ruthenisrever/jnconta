'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function OrdenesCompraPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ supplierId: '', expectedDate: '', notes: '', items: [{ productId: '', description: '', quantity: 1, unitCost: 0, taxRate: 0.16 }] });
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [o, s, p] = await Promise.all([
      apiFetch(`/api/purchase-orders?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/suppliers?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/products?companyId=${cid}`).then(r => r.json()),
    ]);
    setOrders(Array.isArray(o) ? o : []);
    setSuppliers(Array.isArray(s) ? s : []);
    setProducts(Array.isArray(p) ? p : []);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { productId: '', description: '', quantity: 1, unitCost: 0, taxRate: 0.16 }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, field: string, val: any) => setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [field]: val }; return { ...f, items }; });

  const submit = async () => {
    setLoading(true);
    await apiFetch('/api/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, companyId: cid }) });
    setShowForm(false); setForm({ supplierId: '', expectedDate: '', notes: '', items: [{ productId: '', description: '', quantity: 1, unitCost: 0, taxRate: 0.16 }] });
    load(); setLoading(false);
  };

  const receive = async (id: string) => {
    if (!confirm('¿Confirmar recepción total? Se generará una factura de compra.')) return;
    const r = await apiFetch(`/api/purchase-orders/${id}/receive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await r.json();
    alert(`Recibido. Bill ID: ${d.billId}`);
    load();
  };

  const cancel = async (id: string) => {
    await apiFetch(`/api/purchase-orders/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELADA' }) });
    load();
  };

  const statusColor: Record<string, string> = { BORRADOR: '#6b7280', ENVIADA: '#f59e0b', RECIBIDA_PARCIAL: '#3b82f6', RECIBIDA: '#10b981', CANCELADA: '#ef4444' };
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Órdenes de Compra</h1>
          <p className="page-subtitle">Gestiona OC → Recepción → Factura de compra</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nueva Orden</button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Nueva Orden de Compra</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Proveedor</label>
              <select className="input" value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}>
                <option value="">-- Proveedor --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Fecha esperada entrega</label>
              <input type="date" className="input" value={form.expectedDate} onChange={e => setForm(f => ({ ...f, expectedDate: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Notas</label>
              <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas opcionales..." />
            </div>
          </div>

          <h4 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Partidas</h4>
          {form.items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
              <select className="input" value={item.productId} onChange={e => { const p = products.find(x => x.id === e.target.value); updateItem(i, 'productId', e.target.value); if (p) { updateItem(i, 'description', p.name); updateItem(i, 'unitCost', p.cost); } }}>
                <option value="">-- Producto --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
              </select>
              <input className="input" placeholder="Descripción" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
              <input type="number" className="input" placeholder="Cant." value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} />
              <input type="number" className="input" placeholder="Costo unit." value={item.unitCost} onChange={e => updateItem(i, 'unitCost', Number(e.target.value))} />
              <select className="input" value={item.taxRate} onChange={e => updateItem(i, 'taxRate', Number(e.target.value))}>
                <option value={0.16}>16%</option><option value={0.08}>8%</option><option value={0}>0%</option>
              </select>
              <button onClick={() => removeItem(i)} style={{ background: '#ef444420', border: 'none', color: '#ef4444', borderRadius: 6, cursor: 'pointer', padding: '0 10px' }}>✕</button>
            </div>
          ))}
          <button onClick={addItem} style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)', padding: '6px 16px', borderRadius: 8, cursor: 'pointer', marginBottom: 16 }}>+ Agregar Partida</button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={submit} disabled={loading}>{loading ? 'Guardando...' : 'Crear Orden'}</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 20px', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Folio</th><th>Proveedor</th><th>Fecha</th><th>Entrega Esp.</th><th>Total</th><th>Estatus</th><th>Acciones</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight: 700, color: 'var(--teal-400)' }}>OC-{o.folio}</td>
                <td>{o.supplier?.name}</td>
                <td>{new Date(o.date).toLocaleDateString('es-MX')}</td>
                <td>{o.expectedDate ? new Date(o.expectedDate).toLocaleDateString('es-MX') : '—'}</td>
                <td style={{ fontWeight: 700 }}>{fmt(o.total)}</td>
                <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusColor[o.status] ?? '#6b7280'}20`, color: statusColor[o.status] ?? '#6b7280' }}>{o.status}</span></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  {o.status === 'BORRADOR' && <button onClick={() => receive(o.id)} style={{ background: '#10b98120', border: 'none', color: '#10b981', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Recibir</button>}
                  {(o.status === 'BORRADOR' || o.status === 'ENVIADA') && <button onClick={() => cancel(o.id)} style={{ background: '#ef444420', border: 'none', color: '#ef4444', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancelar</button>}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin órdenes de compra</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
