'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function ListasPreciosPage() {
  const [lists, setLists] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [tab, setTab] = useState<'listas' | 'volumen'>('listas');
  const [selected, setSelected] = useState<any>(null);
  const [showLForm, setShowLForm] = useState(false);
  const [lForm, setLForm] = useState({ name: '', currency: 'MXN' });
  const [itemForm, setItemForm] = useState({ productId: '', price: 0, minQuantity: 1 });
  const [dForm, setDForm] = useState({ productId: '', minQty: 1, discountPct: 10 });
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [l, d, p] = await Promise.all([
      apiFetch(`/api/price-lists?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/price-lists/volume-discounts?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/products?companyId=${cid}`).then(r => r.json()),
    ]);
    setLists(Array.isArray(l) ? l : []);
    setDiscounts(Array.isArray(d) ? d : []);
    setProducts(Array.isArray(p) ? p : []);
  };

  const createList = async () => {
    await apiFetch('/api/price-lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...lForm, companyId: cid }) });
    setShowLForm(false); setLForm({ name: '', currency: 'MXN' }); load();
  };

  const addItem = async () => {
    if (!selected) return;
    await apiFetch(`/api/price-lists/${selected.id}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemForm) });
    setItemForm({ productId: '', price: 0, minQuantity: 1 }); load();
  };

  const removeItem = async (listId: string, itemId: string) => {
    await apiFetch(`/api/price-lists/${listId}/items/${itemId}`, { method: 'DELETE' });
    load();
  };

  const createDiscount = async () => {
    await apiFetch('/api/price-lists/volume-discounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...dForm, companyId: cid }) });
    setDForm({ productId: '', minQty: 1, discountPct: 10 }); load();
  };

  const deleteDiscount = async (id: string) => {
    await apiFetch(`/api/price-lists/volume-discounts/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Listas de Precios y Descuentos</h1>
          <p className="page-subtitle">Precios especiales por cliente y descuentos por volumen automáticos</p>
        </div>
        <button className="btn-primary" onClick={() => setShowLForm(true)}>+ Nueva Lista</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['listas', 'volumen'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: tab === t ? 'var(--primary-600)' : 'var(--surface-2)', color: tab === t ? '#fff' : 'var(--text-muted)' }}>{t === 'listas' ? 'Listas de Precios' : 'Descuentos por Volumen'}</button>
        ))}
      </div>

      {tab === 'listas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
          <div>
            {showLForm && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <input className="input" placeholder="Nombre de la lista" value={lForm.name} onChange={e => setLForm(f => ({ ...f, name: e.target.value }))} style={{ marginBottom: 8 }} />
                <select className="input" value={lForm.currency} onChange={e => setLForm(f => ({ ...f, currency: e.target.value }))} style={{ marginBottom: 8 }}>
                  <option value="MXN">MXN</option><option value="USD">USD</option>
                </select>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-primary" onClick={createList} style={{ fontSize: 12, padding: '6px 14px' }}>Crear</button>
                  <button onClick={() => setShowLForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              </div>
            )}
            {lists.map(l => (
              <div key={l.id} onClick={() => setSelected(l)} style={{ background: selected?.id === l.id ? 'var(--primary-600)' : 'var(--surface)', border: `1px solid ${selected?.id === l.id ? 'var(--primary-500)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 8, cursor: 'pointer' }}>
                <div style={{ fontWeight: 700, color: selected?.id === l.id ? '#fff' : 'var(--text-primary)' }}>{l.name}</div>
                <div style={{ fontSize: 11, color: selected?.id === l.id ? '#cce' : 'var(--text-muted)' }}>{l.currency} · {l.items?.length ?? 0} productos · {l.clients?.length ?? 0} clientes</div>
              </div>
            ))}
            {lists.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin listas de precios</p>}
          </div>

          <div>
            {selected ? (
              <>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>{selected.name} — Precios</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 12 }}>
                  <select className="input" value={itemForm.productId} onChange={e => { const p = products.find(x => x.id === e.target.value); setItemForm(f => ({ ...f, productId: e.target.value, price: p?.price ?? 0 })); }}>
                    <option value="">-- Producto --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                  </select>
                  <input type="number" className="input" placeholder="Precio" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: Number(e.target.value) }))} />
                  <input type="number" className="input" placeholder="Cant. mínima" value={itemForm.minQuantity} onChange={e => setItemForm(f => ({ ...f, minQuantity: Number(e.target.value) }))} />
                  <button className="btn-primary" onClick={addItem} style={{ padding: '8px 16px', fontSize: 13 }}>Agregar</button>
                </div>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead><tr><th>SKU</th><th>Producto</th><th>Cant. Mín</th><th>Precio</th><th></th></tr></thead>
                    <tbody>
                      {(selected.items ?? []).map((item: any) => (
                        <tr key={item.id}>
                          <td style={{ color: 'var(--teal-400)', fontFamily: 'monospace' }}>{item.product?.sku}</td>
                          <td>{item.product?.name}</td>
                          <td>{item.minQuantity}</td>
                          <td style={{ fontWeight: 700 }}>${item.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                          <td><button onClick={() => removeItem(selected.id, item.id)} style={{ background: '#ef444420', border: 'none', color: '#ef4444', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>✕</button></td>
                        </tr>
                      ))}
                      {(selected.items ?? []).length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Sin productos en esta lista</td></tr>}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-muted)' }}>Selecciona una lista para ver sus precios</div>}
          </div>
        </div>
      )}

      {tab === 'volumen' && (
        <>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Nuevo Descuento por Volumen</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 10 }}>
              <select className="input" value={dForm.productId} onChange={e => setDForm(f => ({ ...f, productId: e.target.value }))}>
                <option value="">Todos los productos</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
              </select>
              <input type="number" className="input" placeholder="Cant. mínima" value={dForm.minQty} onChange={e => setDForm(f => ({ ...f, minQty: Number(e.target.value) }))} />
              <div style={{ position: 'relative' }}>
                <input type="number" className="input" placeholder="% descuento" value={dForm.discountPct} onChange={e => setDForm(f => ({ ...f, discountPct: Number(e.target.value) }))} />
              </div>
              <button className="btn-primary" onClick={createDiscount}>Agregar</button>
            </div>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Producto</th><th>Cantidad Mínima</th><th>Descuento</th><th></th></tr></thead>
              <tbody>
                {discounts.map(d => (
                  <tr key={d.id}>
                    <td>{d.product?.name ?? 'Todos los productos'}</td>
                    <td>{d.minQty} unidades</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>{d.discountPct}%</td>
                    <td><button onClick={() => deleteDiscount(d.id)} style={{ background: '#ef444420', border: 'none', color: '#ef4444', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Eliminar</button></td>
                  </tr>
                ))}
                {discounts.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin descuentos configurados</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
