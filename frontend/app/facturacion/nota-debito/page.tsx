'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function NotaDebitoPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: '', relatedInvoiceId: '', reason: '', amount: 0, description: '' });
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [i, c, n] = await Promise.all([
      apiFetch(`/api/invoices?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/clients?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/invoices?companyId=${cid}&cfdiType=E&relationType=02`).then(r => r.json()),
    ]);
    setInvoices(Array.isArray(i) ? i.filter((x: any) => x.cfdiType === 'I' && x.status === 'VIGENTE') : []);
    setClients(Array.isArray(c) ? c : []);
    setNotes(Array.isArray(n) ? n.filter((x: any) => x.relationshipType === '02') : []);
  };

  const submit = async () => {
    const relInv = invoices.find(i => i.id === form.relatedInvoiceId);
    if (!relInv) { alert('Selecciona una factura original'); return; }
    const iva = form.amount * 0.16;
    const last = await apiFetch(`/api/invoices?companyId=${cid}`).then(r => r.json());
    const maxFolio = Array.isArray(last) ? Math.max(...last.map((x: any) => x.folio), 0) : 0;

    await apiFetch('/api/invoices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: cid, clientId: form.clientId || relInv.clientId,
        serie: 'D', folio: maxFolio + 1,
        date: new Date().toISOString(), subtotal: form.amount, tax: iva, total: form.amount + iva,
        cfdiType: 'E', relationshipType: '02', relatedInvoiceId: form.relatedInvoiceId,
        relatedUuid: relInv.uuid, paymentMethod: 'PUE', paymentForm: '99', cfdiUse: 'CP01',
        items: [{ description: form.description || `Nota de débito — ${form.reason}`, quantity: 1, unitPrice: form.amount, subtotal: form.amount, tax: iva, total: form.amount + iva, taxRate: 0.16, unit: 'ACT', satCode: '01010101' }],
      }),
    });
    setShowForm(false); setForm({ clientId: '', relatedInvoiceId: '', reason: '', amount: 0, description: '' }); load();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notas de Débito</h1>
          <p className="page-subtitle">CFDI tipo egreso con relación 02 — cargos adicionales al cliente</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nueva Nota de Débito</button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Nueva Nota de Débito (CFDI E / Relación 02)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Factura original a debitar</label>
              <select className="input" value={form.relatedInvoiceId} onChange={e => { const inv = invoices.find(i => i.id === e.target.value); setForm(f => ({ ...f, relatedInvoiceId: e.target.value, clientId: inv?.clientId ?? '' })); }}>
                <option value="">-- Seleccionar factura --</option>
                {invoices.map(i => <option key={i.id} value={i.id}>{i.serie}-{i.folio} — {i.client?.name} — {fmt(i.total)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Motivo del débito</label>
              <input className="input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Recargo por mora, intereses, etc." />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Descripción en el CFDI</label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción detallada..." />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Importe (sin IVA)</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
              {form.amount > 0 && <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>IVA: {fmt(form.amount * 0.16)} · Total: {fmt(form.amount * 1.16)}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={submit}>Crear Nota de Débito</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Importe</th><th>IVA</th><th>Total</th><th>UUID</th><th>Estatus</th></tr></thead>
          <tbody>
            {notes.map(n => (
              <tr key={n.id}>
                <td style={{ fontWeight: 700, color: 'var(--teal-400)' }}>D-{n.folio}</td>
                <td>{n.client?.name}</td>
                <td>{new Date(n.date).toLocaleDateString('es-MX')}</td>
                <td>{fmt(n.subtotal)}</td>
                <td>{fmt(n.tax)}</td>
                <td style={{ fontWeight: 700 }}>{fmt(n.total)}</td>
                <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{n.uuid ? n.uuid.substring(0, 16) + '...' : '—'}</td>
                <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: n.status === 'VIGENTE' ? '#10b98120' : '#ef444420', color: n.status === 'VIGENTE' ? '#10b981' : '#ef4444' }}>{n.status}</span></td>
              </tr>
            ))}
            {notes.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin notas de débito</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
