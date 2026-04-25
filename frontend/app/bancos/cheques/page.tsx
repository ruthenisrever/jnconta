'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function ChequesPage() {
  const [checks, setChecks] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number: '', date: '', beneficiary: '', concept: '', amount: 0, bankAccountId: '' });
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [c, a, s] = await Promise.all([
      apiFetch(`/api/checks?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/banks?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/checks/summary?companyId=${cid}`).then(r => r.json()),
    ]);
    setChecks(Array.isArray(c) ? c : []);
    setAccounts(Array.isArray(a) ? a : []);
    setSummary(s ?? {});
  };

  const submit = async () => {
    await apiFetch('/api/checks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, companyId: cid }) });
    setShowForm(false); setForm({ number: '', date: '', beneficiary: '', concept: '', amount: 0, bankAccountId: '' }); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/api/checks/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    load();
  };

  const statusColor: Record<string, string> = { EMITIDO: '#f59e0b', COBRADO: '#10b981', CANCELADO: '#ef4444', DEVUELTO: '#6b7280' };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Control de Cheques</h1>
          <p className="page-subtitle">Emisión y seguimiento de cheques bancarios</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Emitir Cheque</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[{ label: 'Total Cheques', value: summary.total ?? 0, color: '#06b6d4', isCount: true }, { label: 'Monto Emitido', value: summary.emitidos ?? 0, color: '#f59e0b' }, { label: 'Monto Cobrado', value: summary.cobrados ?? 0, color: '#10b981' }].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{k.label}</p>
            <p style={{ color: k.color, fontWeight: 800, fontSize: 22 }}>{k.isCount ? k.value : fmt(k.value)}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Nuevo Cheque</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Cuenta bancaria</label>
              <select className="input" value={form.bankAccountId} onChange={e => setForm(f => ({ ...f, bankAccountId: e.target.value }))}>
                <option value="">-- Seleccionar --</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} — {a.bank}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Nº de cheque</label>
              <input className="input" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="001234" />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Fecha</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Beneficiario</label>
              <input className="input" value={form.beneficiary} onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))} placeholder="Nombre del beneficiario" />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Concepto</label>
              <input className="input" value={form.concept} onChange={e => setForm(f => ({ ...f, concept: e.target.value }))} placeholder="Pago de..." />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Importe</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={submit}>Emitir Cheque</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="data-table-container">
        <table className="data-table">
          <thead><tr><th>Nº Cheque</th><th>Fecha</th><th>Beneficiario</th><th>Concepto</th><th>Banco</th><th>Importe</th><th>Estatus</th><th>Acciones</th></tr></thead>
          <tbody>
            {checks.map(c => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--teal-400)' }}>{c.number}</td>
                <td>{new Date(c.date).toLocaleDateString('es-MX')}</td>
                <td>{c.beneficiary}</td>
                <td>{c.concept}</td>
                <td>{c.bankAccount?.bank} - {c.bankAccount?.name}</td>
                <td style={{ fontWeight: 700 }}>{fmt(c.amount)}</td>
                <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${statusColor[c.status] ?? '#6b7280'}20`, color: statusColor[c.status] ?? '#6b7280' }}>{c.status}</span></td>
                <td style={{ display: 'flex', gap: 4 }}>
                  {c.status === 'EMITIDO' && <>
                    <button onClick={() => updateStatus(c.id, 'COBRADO')} style={{ background: '#10b98120', border: 'none', color: '#10b981', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Cobrado</button>
                    <button onClick={() => updateStatus(c.id, 'CANCELADO')} style={{ background: '#ef444420', border: 'none', color: '#ef4444', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>Cancelar</button>
                  </>}
                </td>
              </tr>
            ))}
            {checks.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin cheques registrados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
