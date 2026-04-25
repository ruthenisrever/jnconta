'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function AnticiposPage() {
  const [advances, setAdvances] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ clientId: '', date: '', amount: 0 });
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [a, c, s] = await Promise.all([
      apiFetch(`/api/advances?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/clients?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/advances/summary?companyId=${cid}`).then(r => r.json()),
    ]);
    setAdvances(Array.isArray(a) ? a : []);
    setClients(Array.isArray(c) ? c : []);
    setSummary(s ?? {});
  };

  const submit = async () => {
    await apiFetch('/api/advances', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, companyId: cid }) });
    setShowForm(false); setForm({ clientId: '', date: '', amount: 0 }); load();
  };

  const stamp = async (id: string) => {
    await apiFetch(`/api/advances/${id}/stamp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    load();
  };

  const statusColor: Record<string, string> = { PENDIENTE: '#f59e0b', TIMBRADO: '#3b82f6', PARCIAL: '#8b5cf6', APLICADO: '#10b981', CANCELADO: '#ef4444' };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Anticipos CFDI</h1>
          <p className="page-subtitle">Gestión de anticipos de clientes con CFDI tipo ingreso (clave A)</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Anticipo</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[{ label: 'Total Anticipos', value: summary.total ?? 0, color: '#06b6d4', fmt: false }, { label: 'Monto Pendiente', value: summary.pendiente ?? 0, color: '#f59e0b', fmt: true }, { label: 'Aplicados', value: summary.aplicado ?? 0, color: '#10b981', fmt: false }].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{k.label}</p>
            <p style={{ color: k.color, fontWeight: 800, fontSize: 22 }}>{k.fmt ? fmt(k.value) : k.value}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Nuevo Anticipo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Cliente</label>
              <select className="input" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
                <option value="">-- Seleccionar cliente --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.rfc ?? 'S/RFC'})</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Fecha</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Importe del anticipo</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={submit}>Crear Anticipo</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th>Importe</th><th>Aplicado</th><th>Restante</th><th>UUID</th><th>Estatus</th><th>Acciones</th></tr></thead>
          <tbody>
            {advances.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700, color: 'var(--teal-400)' }}>ANT-{a.folio}</td>
                <td>{a.client?.name}</td>
                <td>{new Date(a.date).toLocaleDateString('es-MX')}</td>
                <td style={{ fontWeight: 700 }}>{fmt(a.amount)}</td>
                <td>{fmt(a.applied)}</td>
                <td style={{ fontWeight: 700, color: a.remaining > 0 ? '#f59e0b' : '#6b7280' }}>{fmt(a.remaining)}</td>
                <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{a.uuid ? a.uuid.substring(0, 16) + '...' : '—'}</td>
                <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusColor[a.status] ?? '#6b7280'}20`, color: statusColor[a.status] ?? '#6b7280' }}>{a.status}</span></td>
                <td>{a.status === 'PENDIENTE' && <button onClick={() => stamp(a.id)} style={{ background: '#3b82f620', border: 'none', color: '#3b82f6', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Timbrar</button>}</td>
              </tr>
            ))}
            {advances.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin anticipos registrados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
