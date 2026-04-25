'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function SucursalesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', address: '', phone: '', manager: '' });
  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';

  useEffect(() => { load(); }, []);
  const load = async () => {
    const r = await apiFetch(`/api/branches?companyId=${cid}`);
    const d = await r.json();
    setBranches(Array.isArray(d) ? d : []);
  };

  const create = async () => {
    await apiFetch('/api/branches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, companyId: cid }) });
    setShowForm(false); setForm({ code: '', name: '', address: '', phone: '', manager: '' }); load();
  };

  const deactivate = async (id: string) => {
    await apiFetch(`/api/branches/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: false }) });
    load();
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sucursales</h1>
          <p className="page-subtitle">Gestión de sucursales y unidades de negocio dentro de la empresa</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nueva Sucursal</button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 12 }}>Nueva Sucursal</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 12 }}>
            <input className="input" placeholder="Código (ej. SUC-01)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
            <input className="input" placeholder="Nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder="Dirección" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            <input className="input" placeholder="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            <input className="input" placeholder="Responsable" value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={create}>Guardar Sucursal</button>
            <button onClick={() => setShowForm(false)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
        {branches.map(b => (
          <div key={b.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--teal-400)', fontSize: 11, fontWeight: 700, fontFamily: 'monospace' }}>{b.code}</span>
              <span style={{ fontSize: 10, background: '#10b98115', color: '#10b981', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>ACTIVA</span>
            </div>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, marginBottom: 8 }}>{b.name}</h3>
            {b.address && <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>📍 {b.address}</p>}
            {b.phone && <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>📞 {b.phone}</p>}
            {b.manager && <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>👤 {b.manager}</p>}
            <button onClick={() => deactivate(b.id)} style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444', padding: '5px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, width: '100%' }}>Desactivar</button>
          </div>
        ))}
        {branches.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>Sin sucursales registradas</div>}
      </div>
    </div>
  );
}
