'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Check, Search, RefreshCw, Receipt } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type CartItem = { productId?: string; description: string; quantity: number; unitPrice: number; discount: number; subtotal: number; total: number };

export default function PosPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [payMethod, setPayMethod] = useState('EFECTIVO');
  const [tickets, setTickets] = useState<any[]>([]);
  const [view, setView] = useState<'pos' | 'historial'>('pos');
  const [processing, setProcessing] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [lastTicket, setLastTicket] = useState<any>(null);

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    loadProducts(cid, '');
    loadTickets(cid);
    loadSummary(cid);
  }, []);

  const loadProducts = async (cid: string, q: string) => {
    try {
      const res = await apiFetch(`/api/pos/products?companyId=${cid}&q=${encodeURIComponent(q)}`);
      setProducts(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadTickets = async (cid: string) => {
    try {
      const res = await apiFetch(`/api/pos/tickets?companyId=${cid}`);
      setTickets(await res.json());
    } catch (e) { console.error(e); }
  };

  const loadSummary = async (cid: string) => {
    try {
      const res = await apiFetch(`/api/pos/summary?companyId=${cid}`);
      setSummary(await res.json());
    } catch (e) { console.error(e); }
  };

  const searchProducts = useCallback((q: string) => {
    setSearch(q);
    loadProducts(companyId, q);
  }, [companyId]);

  const addToCart = (p: any) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.productId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = calcItem({ ...next[idx], quantity: next[idx].quantity + 1 });
        return next;
      }
      return [...prev, calcItem({ productId: p.id, description: p.name, quantity: 1, unitPrice: p.price ?? 0, discount: 0, subtotal: 0, total: 0 })];
    });
  };

  const calcItem = (i: CartItem): CartItem => {
    const sub = i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100);
    return { ...i, subtotal: sub, total: sub * 1.16 };
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      const newQty = next[idx].quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== idx);
      next[idx] = calcItem({ ...next[idx], quantity: newQty });
      return next;
    });
  };

  const totals = cart.reduce((acc, i) => ({ sub: acc.sub + i.subtotal, iva: acc.iva + (i.subtotal * 0.16), total: acc.total + i.total }), { sub: 0, iva: 0, total: 0 });

  const checkout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const res = await apiFetch('/api/pos/tickets', { method: 'POST', body: JSON.stringify({ companyId, payMethod, items: cart }) });
      const ticket = await res.json();
      setLastTicket(ticket);
      setCart([]);
      loadTickets(companyId);
      loadSummary(companyId);
    } catch (e) { console.error(e); }
    finally { setProcessing(false); }
  };

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Punto de Venta (POS)</h1>
          <p>Venta rápida al mostrador con ticket y generación opcional de CFDI.</p>
        </div>
        <div className="header-actions">
          <button className={`btn ${view === 'pos' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`} onClick={() => setView('pos')}><ShoppingCart size={16} /> POS</button>
          <button className={`btn ${view === 'historial' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2`} onClick={() => setView('historial')}><Receipt size={16} /> Historial</button>
          <button className="btn btn-ghost" onClick={() => { loadTickets(companyId); loadSummary(companyId); }}><RefreshCw size={16} /></button>
        </div>
      </header>

      {/* KPIs del día */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="kpi-card"><div className="kpi-card-label">Tickets Hoy</div><div className="kpi-card-value">{summary.totalTickets}</div></div>
          <div className="kpi-card"><div className="kpi-card-label">Venta Neta</div><div className="kpi-card-value text-success text-lg">{fmt(summary.totalVentas - summary.totalIva)}</div></div>
          <div className="kpi-card"><div className="kpi-card-label">IVA</div><div className="kpi-card-value text-amber-400 text-lg">{fmt(summary.totalIva)}</div></div>
          <div className="kpi-card"><div className="kpi-card-label">Total Cobrado</div><div className="kpi-card-value text-lg">{fmt(summary.totalVentas)}</div></div>
        </div>
      )}

      {view === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catálogo de productos */}
          <div className="lg:col-span-2 panel">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="input pl-9" placeholder="Buscar producto por nombre o SKU..." value={search} onChange={e => searchProducts(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {products.map(p => (
                <button key={p.id} className="p-3 bg-surface-2 rounded-xl border border-surface-3 hover:border-primary-500/50 text-left transition-colors" onClick={() => addToCart(p)}>
                  <div className="font-medium text-sm truncate">{p.name}</div>
                  <div className="text-xs text-muted mt-1">{p.sku}</div>
                  <div className="text-primary-400 font-bold mt-2">{fmt(p.price ?? 0)}</div>
                </button>
              ))}
              {products.length === 0 && <p className="col-span-3 text-center text-muted py-6 text-sm">No se encontraron productos. <a href="/inventarios" className="text-primary-400 underline">Agregar productos</a></p>}
            </div>
          </div>

          {/* Carrito */}
          <div className="panel flex flex-col">
            <h3 className="font-bold mb-4 flex items-center gap-2"><ShoppingCart size={18} /> Carrito</h3>
            <div className="flex-1 space-y-2 mb-4 overflow-y-auto max-h-96">
              {cart.length === 0 ? (
                <p className="text-center text-muted py-8 text-sm">Selecciona productos del catálogo</p>
              ) : cart.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-surface-2 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{item.description}</div>
                    <div className="text-xs text-muted">{fmt(item.unitPrice)} c/u</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="w-6 h-6 rounded bg-surface-3 flex items-center justify-center hover:bg-primary-600" onClick={() => updateQty(idx, -1)}><Minus size={11} /></button>
                    <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button className="w-6 h-6 rounded bg-surface-3 flex items-center justify-center hover:bg-primary-600" onClick={() => updateQty(idx, 1)}><Plus size={11} /></button>
                  </div>
                  <div className="text-sm font-bold w-20 text-right">{fmt(item.total)}</div>
                  <button className="text-danger hover:text-red-400" onClick={() => setCart(p => p.filter((_, i) => i !== idx))}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="border-t border-surface-3 pt-3 space-y-1 text-sm mb-4">
              <div className="flex justify-between text-muted"><span>Subtotal</span><span>{fmt(totals.sub)}</span></div>
              <div className="flex justify-between text-muted"><span>IVA 16%</span><span>{fmt(totals.iva)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t border-surface-3 pt-2 mt-2"><span>Total</span><span className="text-primary-400">{fmt(totals.total)}</span></div>
            </div>

            {/* Método de pago */}
            <div className="mb-4">
              <label className="label text-xs">Método de pago</label>
              <div className="flex gap-2">
                {['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'].map(m => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${payMethod === m ? 'bg-primary-600 text-white' : 'bg-surface-2 text-muted hover:text-white'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-success w-full flex items-center justify-center gap-2 py-3 text-base" onClick={checkout} disabled={cart.length === 0 || processing}>
              <Check size={20} /> {processing ? 'Procesando...' : `Cobrar ${fmt(totals.total)}`}
            </button>

            {lastTicket && (
              <div className="mt-3 p-3 bg-success/10 rounded-xl border border-success/20 text-xs text-success text-center">
                ✓ Ticket #{lastTicket.folio} cobrado exitosamente
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'historial' && (
        <div className="panel">
          <div className="table-responsive">
            <table className="report-table">
              <thead><tr><th>Folio</th><th>Hora</th><th>Método</th><th>Artículos</th><th className="text-right">Total</th><th>Estado</th></tr></thead>
              <tbody>
                {tickets.map((t: any) => (
                  <tr key={t.id}>
                    <td className="font-mono font-bold">#{t.folio}</td>
                    <td className="text-xs">{new Date(t.createdAt).toLocaleTimeString('es-MX')}</td>
                    <td><span className="badge badge-info text-xs">{t.payMethod}</span></td>
                    <td className="text-muted text-sm">{t.items?.length ?? 0} art.</td>
                    <td className="text-right font-bold">{fmt(t.total)}</td>
                    <td><span className={`badge ${t.status === 'COBRADO' ? 'badge-success' : t.status === 'CANCELADO' ? 'badge-danger' : 'badge-warning'}`}>{t.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tickets.length === 0 && <p className="text-center text-muted py-8">No hay tickets hoy.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
