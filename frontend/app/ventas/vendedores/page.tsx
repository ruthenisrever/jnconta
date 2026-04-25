'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function VendedoresPage() {
  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [tab, setTab] = useState<'vendedores' | 'comisiones'>('vendedores');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', email: '', phone: '', commissionPct: 5 });
  const [calcForm, setCalcForm] = useState({ salespersonId: '', period: '' });
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const [s, c] = await Promise.all([
      apiFetch(`/api/salespeople?companyId=${cid}`).then(r => r.json()),
      apiFetch(`/api/salespeople/commissions?companyId=${cid}`).then(r => r.json()),
    ]);
    setSalespeople(Array.isArray(s) ? s : []);
    setCommissions(Array.isArray(c) ? c : []);
  };

  const create = async () => {
    await apiFetch('/api/salespeople', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, companyId: cid }) });
    setShowForm(false); setForm({ code: '', name: '', email: '', phone: '', commissionPct: 5 }); load();
  };

  const deactivate = async (id: string) => {
    await apiFetch(`/api/salespeople/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: false }) });
    load();
  };

  const calculate = async () => {
    if (!calcForm.salespersonId || !calcForm.period) { alert('Selecciona vendedor y período'); return; }
    const r = await apiFetch('/api/salespeople/commissions/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: cid, ...calcForm }) });
    const d = await r.json();
    alert(`Comisión calculada: ${fmt(d.commissionAmt)} (${d.commissionPct}% de ${fmt(d.invoiceAmount)})`);
    load();
  };

  const pay = async (id: string) => {
    await apiFetch(`/api/salespeople/commissions/${id}/pay`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    load();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendedores y Comisiones</h1>
          <p className="page-subtitle">Gestión de fuerza de ventas y cálculo automático de comisiones</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nuevo Vendedor</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['vendedores', 'comisiones'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, background: tab === t ? 'var(--primary-600)' : 'var(--surface-2)', color: tab === t ? '#fff' : 'var(--text-muted)' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Nuevo Vendedor</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 12 }}>
            <input className="input" placeholder="Código" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <input className="input" placeholder="Nombre completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <input className="input" placeholder="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <div style={{ position: 'relative' }}>
              <input type="number" className="input" placeholder="% Comisión" value={form.commissionPct} onChange={e => setForm(f => ({ ...f, commissionPct: Number(e.target.value) }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={create}>Guardar</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {tab === 'vendedores' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead><tr><th>Código</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>% Comisión</th><th>Acciones</th></tr></thead>
            <tbody>
              {salespeople.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'monospace', color: 'var(--teal-400)', fontWeight: 700 }}>{s.code}</td>
                  <td style={{ fontWeight: 700 }}>{s.name}</td>
                  <td>{s.email ?? '—'}</td>
                  <td>{s.phone ?? '—'}</td>
                  <td style={{ fontWeight: 700, color: '#10b981' }}>{s.commissionPct}%</td>
                  <td><button onClick={() => deactivate(s.id)} style={{ background: '#ef444420', border: 'none', color: '#ef4444', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Desactivar</button></td>
                </tr>
              ))}
              {salespeople.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin vendedores registrados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'comisiones' && (
        <>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Vendedor</label>
              <select className="input" value={calcForm.salespersonId} onChange={e => setCalcForm(f => ({ ...f, salespersonId: e.target.value }))}>
                <option value="">-- Seleccionar --</option>
                {salespeople.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 4 }}>Período (AAAA-MM)</label>
              <input className="input" placeholder="2026-04" value={calcForm.period} onChange={e => setCalcForm(f => ({ ...f, period: e.target.value }))} />
            </div>
            <button className="btn-primary" onClick={calculate}>Calcular Comisión</button>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead><tr><th>Vendedor</th><th>Período</th><th>Venta Total</th><th>% Comisión</th><th>Comisión</th><th>Estatus</th><th>Acciones</th></tr></thead>
              <tbody>
                {commissions.map(c => (
                  <tr key={c.id}>
                    <td>{c.salesperson?.name}</td>
                    <td>{c.period}</td>
                    <td>{fmt(c.invoiceAmount)}</td>
                    <td>{c.commissionPct}%</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>{fmt(c.commissionAmt)}</td>
                    <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.status === 'PAGADA' ? '#10b98120' : '#f59e0b20', color: c.status === 'PAGADA' ? '#10b981' : '#f59e0b' }}>{c.status}</span></td>
                    <td>{c.status === 'PENDIENTE' && <button onClick={() => pay(c.id)} style={{ background: '#10b98120', border: 'none', color: '#10b981', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Marcar Pagada</button>}</td>
                  </tr>
                ))}
                {commissions.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Sin comisiones calculadas</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
