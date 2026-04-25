'use client';

import React, { useState, useEffect } from 'react';
import { FileMinus, Search, Plus, X, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function NotaCreditoPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ invoiceId: '', motive: 'DEVOLUCION', amount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    loadData(cid);
  }, []);

  const loadData = async (cid: string) => {
    setLoading(true);
    try {
      const [invRes, cnRes] = await Promise.all([
        apiFetch(`/api/invoices?companyId=${cid}`),
        apiFetch(`/api/invoices/credit-notes?companyId=${cid}`),
      ]);
      const invData = await invRes.json();
      const cnData = await cnRes.json();
      setInvoices(Array.isArray(invData) ? invData.filter((i: any) => i.status === 'VIGENTE') : []);
      setCreditNotes(Array.isArray(cnData) ? cnData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.invoiceId || !form.amount) return alert('Selecciona una factura e ingresa el monto');
    setSaving(true);
    try {
      const res = await apiFetch('/api/invoices/credit-notes', {
        method: 'POST',
        body: JSON.stringify({ ...form, companyId, amount: Number(form.amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setShowForm(false);
      setForm({ invoiceId: '', motive: 'DEVOLUCION', amount: '', notes: '' });
      loadData(companyId);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const motivos = [
    { value: 'DEVOLUCION', label: 'Devolución de mercancía' },
    { value: 'DESCUENTO', label: 'Descuento o bonificación' },
    { value: 'ERROR_PRECIO', label: 'Error en precio' },
    { value: 'CANCELACION_PARCIAL', label: 'Cancelación parcial' },
    { value: 'OTRO', label: 'Otro motivo' },
  ];

  const selectedInvoice = invoices.find(i => i.id === form.invoiceId);

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Notas de Crédito (CFDI E)</h1>
          <p>Emite notas de crédito CFDI tipo E para devoluciones, descuentos y cancelaciones parciales.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nueva Nota de Crédito
          </button>
        </div>
      </header>

      {/* FORMULARIO */}
      {showForm && (
        <div className="panel mb-8 border-primary-500/30">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center gap-2">
              <FileMinus size={18} className="text-primary-400" /> Nueva Nota de Crédito
            </h3>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm p-1">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Factura Original</label>
              <select className="input" value={form.invoiceId} onChange={e => setForm({ ...form, invoiceId: e.target.value })}>
                <option value="">-- Seleccionar Factura --</option>
                {invoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.series}{inv.folio} — {inv.clientName || inv.client?.name} — {fmt(inv.total)}
                  </option>
                ))}
              </select>
              {selectedInvoice && (
                <div className="mt-2 p-2 bg-surface-2 rounded text-xs text-muted">
                  Total factura: {fmt(selectedInvoice.total)} | Fecha: {new Date(selectedInvoice.date).toLocaleDateString('es-MX')}
                </div>
              )}
            </div>
            <div>
              <label className="form-label">Motivo</label>
              <select className="input" value={form.motive} onChange={e => setForm({ ...form, motive: e.target.value })}>
                {motivos.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Monto de la Nota de Crédito ($)</label>
              <input
                type="number"
                className="input"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
              {selectedInvoice && Number(form.amount) > selectedInvoice.total && (
                <p className="text-xs text-danger mt-1">
                  <AlertTriangle size={12} className="inline" /> El monto excede el total de la factura original.
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Notas Adicionales</label>
              <input
                type="text"
                className="input"
                placeholder="Descripción del ajuste..."
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Nota de Crédito'}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* LISTADO */}
      <div className="panel">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <FileMinus size={18} className="text-primary-400" /> Notas de Crédito Emitidas
        </h3>
        {loading ? (
          <div className="py-12 text-center text-muted">Cargando...</div>
        ) : creditNotes.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-surface-3 rounded-2xl text-muted">
            No hay notas de crédito emitidas.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>UUID / Folio</th>
                  <th>Factura Original</th>
                  <th>Cliente</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                  <th className="text-right">Monto</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((cn: any) => (
                  <tr key={cn.id}>
                    <td className="font-mono text-xs">{cn.uuid ? cn.uuid.slice(0, 8) + '...' : cn.id.slice(0, 8) + '...'}</td>
                    <td className="text-xs text-muted">{cn.relatedInvoice?.series}{cn.relatedInvoice?.folio}</td>
                    <td>{cn.clientName || cn.client?.name}</td>
                    <td className="text-xs">{cn.motive}</td>
                    <td className="text-xs">{new Date(cn.date || cn.createdAt).toLocaleDateString('es-MX')}</td>
                    <td className="text-right font-bold">{fmt(cn.amount || cn.total)}</td>
                    <td>
                      <span className={`badge ${cn.status === 'TIMBRADO' ? 'badge-success' : cn.status === 'CANCELADO' ? 'badge-danger' : 'badge-default'}`}>
                        {cn.status || 'BORRADOR'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm p-1" title="Descargar XML">
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
