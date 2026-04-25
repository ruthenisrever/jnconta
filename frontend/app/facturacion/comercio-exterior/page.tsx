'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Plus, Download, RefreshCw, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const INCOTERMS = ['DAP','DDP','FOB','CIF','CFR','EXW','FCA','CPT','CIP','DAT'];
const PAISES = [
  { code: 'USA', name: 'Estados Unidos' }, { code: 'CAN', name: 'Canadá' },
  { code: 'DEU', name: 'Alemania' }, { code: 'ESP', name: 'España' },
  { code: 'CHN', name: 'China' }, { code: 'JPN', name: 'Japón' },
  { code: 'GBR', name: 'Reino Unido' }, { code: 'FRA', name: 'Francia' },
  { code: 'BRA', name: 'Brasil' }, { code: 'ARG', name: 'Argentina' },
];

const emptyItem = () => ({ description: '', quantity: 1, unitPrice: 0, satCode: '01010101', unit: 'KGM', fraccionArancelaria: '', noIdentificacion: '', unidadAduana: '06' });

export default function ComercioExteriorPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([emptyItem()]);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    clientId: '', clientName: '', clientRfc: 'XEXX010101000',
    currency: 'USD', exchangeRate: '17.50',
    cfdiUse: 'G01', paymentMethod: 'PUE', paymentForm: '03',
    comercioExterior: {
      tipoOperacion: '2', clavePedimento: 'A1', incoterm: 'DAP',
      paisDestino: 'USA', estadoDestino: '', cpDestino: '',
      calleDestino: '', numRegIdTrib: '', certificadoOrigen: '0',
      observaciones: '', subdivision: '0',
    },
  });

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    load(cid);
    apiFetch(`/api/clients?companyId=${cid}`).then(r => r.json()).then(setClients).catch(() => {});
  }, []);

  const load = async (cid: string) => {
    setLoading(true);
    try {
      const r = await apiFetch(`/api/invoices/comercio-exterior?companyId=${cid}`);
      setList(await r.json());
    } catch { }
    setLoading(false);
  };

  const setItemField = (idx: number, field: string, val: any) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);
  const totalUSD = subtotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/invoices/comercio-exterior', {
        method: 'POST',
        body: JSON.stringify({ ...form, companyId, items }),
      });
      setShowForm(false);
      setItems([emptyItem()]);
      load(companyId);
    } catch { alert('Error al guardar'); }
    setSaving(false);
  };

  const fmt = (n: number, cur = 'USD') => `${cur} $${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="main-content p-10 text-center"><div className="spinner" /></div>;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Comercio Exterior — CFDI con Complemento CE 1.1</h1>
          <p>Facturación internacional con complemento SAT de Comercio Exterior. Exportaciones con fracción arancelaria e Incoterm.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => load(companyId)}><RefreshCw size={16} /></button>
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowForm(v => !v)}>
            <Plus size={16} /> Nueva Exportación
          </button>
        </div>
      </header>

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="panel mb-6 space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2"><Globe size={18} className="text-primary-400" /> Nueva Factura de Exportación</h3>

          {/* Datos generales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Moneda</label>
              <select className="input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                {['USD','EUR','CAD','GBP','JPY'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipo de Cambio</label>
              <input className="input" type="number" step="0.01" value={form.exchangeRate} onChange={e => setForm(f => ({ ...f, exchangeRate: e.target.value }))} />
            </div>
            <div>
              <label className="label">Incoterm</label>
              <select className="input" value={form.comercioExterior.incoterm} onChange={e => setForm(f => ({ ...f, comercioExterior: { ...f.comercioExterior, incoterm: e.target.value } }))}>
                {INCOTERMS.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Receptor */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Cliente (si aplica)</label>
              <select className="input" value={form.clientId} onChange={e => {
                const c = clients.find(cl => cl.id === e.target.value);
                setForm(f => ({ ...f, clientId: e.target.value, clientName: c?.name ?? f.clientName, clientRfc: c?.rfc ?? f.clientRfc }));
              }}>
                <option value="">— Receptor extranjero —</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Nombre receptor</label>
              <input className="input" placeholder="Company Name Inc." value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Num. Reg. ID Tributario</label>
              <input className="input" placeholder="Tax ID / EIN / VAT" value={form.comercioExterior.numRegIdTrib} onChange={e => setForm(f => ({ ...f, comercioExterior: { ...f.comercioExterior, numRegIdTrib: e.target.value } }))} />
            </div>
          </div>

          {/* Destino */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">País destino</label>
              <select className="input" value={form.comercioExterior.paisDestino} onChange={e => setForm(f => ({ ...f, comercioExterior: { ...f.comercioExterior, paisDestino: e.target.value } }))}>
                {PAISES.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estado destino</label>
              <input className="input" placeholder="CA, TX..." value={form.comercioExterior.estadoDestino} onChange={e => setForm(f => ({ ...f, comercioExterior: { ...f.comercioExterior, estadoDestino: e.target.value } }))} />
            </div>
            <div>
              <label className="label">CP destino</label>
              <input className="input" placeholder="90001" value={form.comercioExterior.cpDestino} onChange={e => setForm(f => ({ ...f, comercioExterior: { ...f.comercioExterior, cpDestino: e.target.value } }))} />
            </div>
            <div>
              <label className="label">Clave pedimento</label>
              <input className="input" placeholder="A1" value={form.comercioExterior.clavePedimento} onChange={e => setForm(f => ({ ...f, comercioExterior: { ...f.comercioExterior, clavePedimento: e.target.value } }))} />
            </div>
          </div>

          {/* Mercancías */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="label mb-0">Mercancías</label>
              <button type="button" className="btn btn-ghost btn-sm flex items-center gap-1 text-primary-400" onClick={() => setItems(p => [...p, emptyItem()])}>
                <Plus size={14} /> Agregar
              </button>
            </div>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-2 md:grid-cols-7 gap-2 p-3 bg-surface-2 rounded-xl border border-surface-3 items-end">
                  <div className="md:col-span-2">
                    <label className="label text-xs">Descripción</label>
                    <input className="input" placeholder="Product description" value={it.description} onChange={e => setItemField(idx, 'description', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label text-xs">Fracción Aranc.</label>
                    <input className="input" placeholder="8471300000" value={it.fraccionArancelaria} onChange={e => setItemField(idx, 'fraccionArancelaria', e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-xs">Cantidad</label>
                    <input className="input" type="number" min="0.001" step="any" value={it.quantity} onChange={e => setItemField(idx, 'quantity', e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-xs">Unidad</label>
                    <select className="input" value={it.unit} onChange={e => setItemField(idx, 'unit', e.target.value)}>
                      {['KGM','H87','MTR','LTR','SET','XBX','DZN'].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Valor unit. ({form.currency})</label>
                    <input className="input" type="number" min="0" step="0.01" value={it.unitPrice} onChange={e => setItemField(idx, 'unitPrice', e.target.value)} />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="label text-xs">Subtotal</label>
                      <div className="input bg-surface-3 text-right font-mono text-sm">{fmt(it.quantity * it.unitPrice, form.currency)}</div>
                    </div>
                    {items.length > 1 && (
                      <button type="button" className="btn btn-ghost btn-sm p-1 text-danger mb-0.5" onClick={() => setItems(p => p.filter((_, i) => i !== idx))}><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totales y submit */}
          <div className="flex justify-between items-center pt-4 border-t border-surface-3">
            <div className="text-sm text-muted">Tasa IVA exportación: <strong className="text-success">0%</strong> (Art. 29 LIVA)</div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-muted">Total {form.currency}</div>
                <div className="text-xl font-bold text-primary-400">{fmt(totalUSD, form.currency)}</div>
                <div className="text-xs text-muted">≈ MXN ${(totalUSD * Number(form.exchangeRate)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
              </div>
              <button type="submit" className="btn btn-primary px-8" disabled={saving}>
                {saving ? 'Guardando...' : 'Crear CFDI Exportación'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Listado */}
      <div className="panel">
        <div className="table-responsive">
          <table className="report-table">
            <thead>
              <tr>
                <th>Serie / Folio</th><th>Receptor</th><th>Fecha</th>
                <th>Moneda</th><th className="text-right">Total</th>
                <th>Incoterm</th><th>Estado</th><th />
              </tr>
            </thead>
            <tbody>
              {list.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="font-mono font-bold">{inv.serie}-{inv.folio}</td>
                  <td>
                    <div className="font-medium text-sm">{inv.client?.name ?? inv.clientName ?? '—'}</div>
                    <div className="text-xs text-muted">{inv.client?.rfc}</div>
                  </td>
                  <td className="text-xs">{new Date(inv.date).toLocaleDateString('es-MX')}</td>
                  <td><span className="badge badge-info">{inv.currency}</span></td>
                  <td className="text-right font-bold">{inv.currency} ${Number(inv.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td className="text-xs text-muted">—</td>
                  <td><span className={`badge ${inv.status === 'VIGENTE' ? 'badge-success' : 'badge-danger'}`}>{inv.status}</span></td>
                  <td>
                    <button className="btn btn-ghost btn-sm flex items-center gap-1 text-primary-400" title="Descargar XML"
                      onClick={() => inv.xmlContent && window.open(`data:application/xml;charset=utf-8,${encodeURIComponent(inv.xmlContent)}`)}>
                      <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <div className="py-16 text-center text-muted">
              <Globe size={40} className="mx-auto mb-3 opacity-20" />
              <p>No hay exportaciones registradas. Crea tu primera factura de exportación.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
