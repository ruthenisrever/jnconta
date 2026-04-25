'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Plus, ChevronRight, Trash2, Check, RefreshCw, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const STATUS_FLOW = ['COTIZACION', 'PEDIDO', 'REMISION', 'FACTURADA'];
const STATUS_COLOR: Record<string, string> = {
  COTIZACION: 'badge-warning', PEDIDO: 'badge-info', REMISION: 'badge-primary',
  FACTURADA: 'badge-success', CANCELADA: 'badge-danger',
};

type Item = { description: string; quantity: number; unitPrice: number; discount: number; iva: number; subtotal: number; total: number };
const emptyItem = (): Item => ({ description: '', quantity: 1, unitPrice: 0, discount: 0, iva: 16, subtotal: 0, total: 0 });

export default function CotizacionesPage() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('lista');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [form, setForm] = useState({ clientName: '', clientRfc: '', serie: 'COT', status: 'COTIZACION', validUntil: '', notes: '' });
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    load(cid);
  }, []);

  const load = async (cid: string, status = '') => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/quotes?companyId=${cid}${status ? `&status=${status}` : ''}`);
      setQuotes(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const calcItem = (i: Item): Item => {
    const sub = i.quantity * i.unitPrice * (1 - i.discount / 100);
    return { ...i, subtotal: sub, total: sub * (1 + i.iva / 100) };
  };

  const setItem = (idx: number, field: keyof Item, val: any) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = calcItem({ ...next[idx], [field]: Number.isNaN(+val) ? val : +val });
      return next;
    });
  };

  const totals = items.reduce((acc, i) => ({ sub: acc.sub + i.subtotal, iva: acc.iva + (i.subtotal * i.iva / 100), total: acc.total + i.total }), { sub: 0, iva: 0, total: 0 });

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/quotes', { method: 'POST', body: JSON.stringify({ ...form, companyId, items }) });
      setTab('lista'); load(companyId);
      setForm({ clientName: '', clientRfc: '', serie: 'COT', status: 'COTIZACION', validUntil: '', notes: '' });
      setItems([emptyItem()]);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const advance = async (q: any) => {
    const idx = STATUS_FLOW.indexOf(q.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 2) return;
    await apiFetch(`/api/quotes/${q.id}/status`, { method: 'PUT', body: JSON.stringify({ status: STATUS_FLOW[idx + 1] }) });
    load(companyId, statusFilter);
  };

  const toInvoice = async (q: any) => {
    if (!confirm('¿Convertir esta remisión en factura CFDI?')) return;
    await apiFetch(`/api/quotes/${q.id}/to-invoice`, { method: 'POST' });
    load(companyId, statusFilter);
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar?')) return;
    await apiFetch(`/api/quotes/${id}`, { method: 'DELETE' });
    load(companyId, statusFilter);
  };

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Cotizaciones / Pedidos / Remisiones</h1>
          <p>Flujo pre-factura: Cotización → Pedido → Remisión → Factura CFDI</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => load(companyId, statusFilter)}><RefreshCw size={16} /></button>
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setTab('nueva')}><Plus size={16} /> Nueva Cotización</button>
        </div>
      </header>

      {/* KPIs por estado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {STATUS_FLOW.map(s => (
          <div key={s} className="kpi-card cursor-pointer" onClick={() => { setStatusFilter(s); load(companyId, s); }}>
            <div className="kpi-card-label">{s}</div>
            <div className="kpi-card-value">{quotes.filter(q => q.status === s).length}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-surface-3">
        {[['lista', 'Lista'], ['nueva', 'Nueva Cotización']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === id ? 'border-primary-500 text-primary-400' : 'border-transparent text-muted hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'lista' && (
        <div className="panel">
          <div className="flex gap-3 mb-4">
            <select className="input w-48" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); load(companyId, e.target.value); }}>
              <option value="">Todos los estados</option>
              {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {loading ? <div className="spinner mx-auto" /> : (
            <div className="table-responsive">
              <table className="report-table">
                <thead><tr><th>Folio</th><th>Serie</th><th>Cliente</th><th>Fecha</th><th className="text-right">Total</th><th>Estado</th><th /></tr></thead>
                <tbody>
                  {quotes.map(q => (
                    <tr key={q.id}>
                      <td className="font-mono font-bold">{q.serie}-{q.folio}</td>
                      <td className="text-muted text-xs">{q.serie}</td>
                      <td>
                        <div className="font-medium text-sm">{q.clientName || q.client?.name || '—'}</div>
                        <div className="text-xs text-muted">{q.clientRfc}</div>
                      </td>
                      <td className="text-xs">{new Date(q.date).toLocaleDateString('es-MX')}</td>
                      <td className="text-right font-bold">{fmt(q.total)}</td>
                      <td><span className={`badge ${STATUS_COLOR[q.status] ?? 'badge-warning'}`}>{q.status}</span></td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          {q.status !== 'FACTURADA' && q.status !== 'CANCELADA' && STATUS_FLOW.indexOf(q.status) < STATUS_FLOW.length - 2 && (
                            <button className="btn btn-ghost btn-sm p-1 text-primary-400" title={`Avanzar a ${STATUS_FLOW[STATUS_FLOW.indexOf(q.status) + 1]}`} onClick={() => advance(q)}>
                              <ArrowRight size={15} />
                            </button>
                          )}
                          {q.status === 'REMISION' && (
                            <button className="btn btn-ghost btn-sm p-1 text-success" title="Facturar" onClick={() => toInvoice(q)}>
                              <Check size={15} />
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm p-1 text-danger" onClick={() => del(q.id)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quotes.length === 0 && <p className="text-center text-muted py-8">No hay cotizaciones.</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'nueva' && (
        <div className="panel space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Serie</label>
              <select className="input" value={form.serie} onChange={e => setForm(p => ({ ...p, serie: e.target.value }))}>
                <option value="COT">COT — Cotización</option>
                <option value="PED">PED — Pedido</option>
                <option value="REM">REM — Remisión</option>
              </select>
            </div>
            <div>
              <label className="label">Cliente</label>
              <input className="input" placeholder="Nombre del cliente" value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} />
            </div>
            <div>
              <label className="label">RFC</label>
              <input className="input" placeholder="RFC" value={form.clientRfc} onChange={e => setForm(p => ({ ...p, clientRfc: e.target.value }))} />
            </div>
            <div>
              <label className="label">Válida hasta</label>
              <input type="date" className="input" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Notas</label>
              <input className="input" placeholder="Observaciones..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Partidas</h3>
              <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => setItems(p => [...p, emptyItem()])}>
                <Plus size={14} /> Agregar partida
              </button>
            </div>
            <div className="table-responsive">
              <table className="report-table text-xs">
                <thead><tr><th>Descripción</th><th>Cant.</th><th>P. Unit.</th><th>Desc %</th><th>IVA %</th><th className="text-right">Subtotal</th><th /></tr></thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td><input className="input text-xs py-1" value={item.description} onChange={e => setItem(idx, 'description', e.target.value)} /></td>
                      <td><input type="number" className="input text-xs py-1 w-20" value={item.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} /></td>
                      <td><input type="number" className="input text-xs py-1 w-28" value={item.unitPrice} onChange={e => setItem(idx, 'unitPrice', e.target.value)} /></td>
                      <td><input type="number" className="input text-xs py-1 w-16" value={item.discount} onChange={e => setItem(idx, 'discount', e.target.value)} /></td>
                      <td><input type="number" className="input text-xs py-1 w-16" value={item.iva} onChange={e => setItem(idx, 'iva', e.target.value)} /></td>
                      <td className="text-right font-bold">{fmt(item.subtotal)}</td>
                      <td><button className="btn btn-ghost btn-sm p-1 text-danger" onClick={() => setItems(p => p.filter((_, i) => i !== idx))}><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-8 mt-4 text-sm">
              <span>Subtotal: <strong>{fmt(totals.sub)}</strong></span>
              <span>IVA: <strong>{fmt(totals.iva)}</strong></span>
              <span>Total: <strong className="text-lg">{fmt(totals.total)}</strong></span>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setTab('lista')}>Cancelar</button>
            <button className="btn btn-primary flex items-center gap-2" onClick={save} disabled={saving}>
              <FileText size={16} /> {saving ? 'Guardando...' : 'Guardar Cotización'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
