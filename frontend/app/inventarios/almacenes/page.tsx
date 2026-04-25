'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function AlmacenesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tab, setTab] = useState<'almacenes' | 'transferencias'>('almacenes');
  const [showWForm, setShowWForm] = useState(false);
  const [showTForm, setShowTForm] = useState(false);
  const [wForm, setWForm] = useState({ code: '', name: '', address: '', isDefault: false });
  const [tForm, setTForm] = useState({ fromWarehouseId: '', toWarehouseId: '', notes: '', items: [{ productId: '', quantity: 1 }] });
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [w, t, p] = await Promise.all([
      apiFetch(`/api/warehouses?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/warehouses/transfers?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/products?companyId=${cid}`).then(r => r.json()),
    ]);
    setWarehouses(Array.isArray(w) ? w : []);
    setTransfers(Array.isArray(t) ? t : []);
    setProducts(Array.isArray(p) ? p : []);
  };

  const createWarehouse = async () => {
    await apiFetch('/api/warehouses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...wForm, companyId: cid }) });
    setShowWForm(false); setWForm({ code: '', name: '', address: '', isDefault: false }); load();
  };

  const addTItem = () => setTForm(f => ({ ...f, items: [...f.items, { productId: '', quantity: 1 }] }));
  const updateTItem = (i: number, field: string, val: any) => setTForm(f => { const items = [...f.items]; items[i] = { ...items[i], [field]: val }; return { ...f, items }; });

  const createTransfer = async () => {
    await apiFetch('/api/warehouses/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tForm, companyId: cid }) });
    setShowTForm(false); setTForm({ fromWarehouseId: '', toWarehouseId: '', notes: '', items: [{ productId: '', quantity: 1 }] }); load();
  };

  const completeTransfer = async (id: string) => {
    await apiFetch(`/api/warehouses/transfer/${id}/complete`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    load();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Almacenes Múltiples</h1>
          <p className="page-subtitle">Control de stock por almacén y transferencias entre bodegas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary" onClick={() => setShowWForm(true)}>+ Almacén</button>
          <button onClick={() => setShowTForm(true)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>+ Transferencia</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['almacenes', 'transferencias'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: tab === t ? 'var(--primary-600)' : 'var(--surface-2)', color: tab === t ? '#fff' : 'var(--text-muted)' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {showWForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Nuevo Almacén</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: 10, marginBottom: 12 }}>
            <input className="input" placeholder="Código" value={wForm.code} onChange={e => setWForm(f => ({ ...f, code: e.target.value }))} />
            <input className="input" placeholder="Nombre" value={wForm.name} onChange={e => setWForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Dirección" value={wForm.address} onChange={e => setWForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', marginBottom: 12 }}>
            <input type="checkbox" checked={wForm.isDefault} onChange={e => setWForm(f => ({ ...f, isDefault: e.target.checked }))} /> Almacén principal
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={createWarehouse}>Guardar</button>
            <button onClick={() => setShowWForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {showTForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Nueva Transferencia</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>De almacén</label>
              <select className="input" value={tForm.fromWarehouseId} onChange={e => setTForm(f => ({ ...f, fromWarehouseId: e.target.value }))}>
                <option value="">-- Origen --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>A almacén</label>
              <select className="input" value={tForm.toWarehouseId} onChange={e => setTForm(f => ({ ...f, toWarehouseId: e.target.value }))}>
                <option value="">-- Destino --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <input className="input" placeholder="Notas" value={tForm.notes} onChange={e => setTForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          {tForm.items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 8, marginBottom: 8 }}>
              <select className="input" value={item.productId} onChange={e => updateTItem(i, 'productId', e.target.value)}>
                <option value="">-- Producto --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
              </select>
              <input type="number" className="input" placeholder="Cantidad" value={item.quantity} onChange={e => updateTItem(i, 'quantity', Number(e.target.value))} />
            </div>
          ))}
          <button onClick={addTItem} style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--text-muted)', padding: '4px 14px', borderRadius: 8, cursor: 'pointer', marginBottom: 12 }}>+ Partida</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={createTransfer}>Crear Transferencia</button>
            <button onClick={() => setShowTForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {tab === 'almacenes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
          {warehouses.map(w => (
            <div key={w.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{w.name}</span>
                {w.isDefault && <span style={{ fontSize: 10, background: '#3b82f620', color: '#3b82f6', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>PRINCIPAL</span>}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10 }}>{w.address ?? 'Sin dirección'}</p>
              <p style={{ color: 'var(--teal-400)', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{w.stock?.length ?? 0} productos</p>
              {(w.stock ?? []).slice(0, 4).map((s: any) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.product?.name}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }}>{s.quantity}</span>
                </div>
              ))}
            </div>
          ))}
          {warehouses.length === 0 && <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>Sin almacenes configurados</p>}
        </div>
      )}

      {tab === 'transferencias' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Folio</th><th>Origen</th><th>Destino</th><th>Fecha</th><th>Estatus</th><th>Acciones</th></tr></thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, color: 'var(--teal-400)' }}>TRF-{t.folio}</td>
                  <td>{t.fromWarehouse?.name}</td>
                  <td>{t.toWarehouse?.name}</td>
                  <td>{new Date(t.date).toLocaleDateString('es-MX')}</td>
                  <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: t.status === 'COMPLETADO' ? '#10b98120' : '#f59e0b20', color: t.status === 'COMPLETADO' ? '#10b981' : '#f59e0b' }}>{t.status}</span></td>
                  <td>{t.status === 'PENDIENTE' && <button onClick={() => completeTransfer(t.id)} style={{ background: '#10b98120', border: 'none', color: '#10b981', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Completar</button>}</td>
                </tr>
              ))}
              {transfers.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin transferencias</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
