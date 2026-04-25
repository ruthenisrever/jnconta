'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Users, TrendingUp, CreditCard } from 'lucide-react';
import { apiFetch } from '@/lib/api';
const fmt = (n: number, c = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(n);

interface Client { id: string; code: string; name: string; rfc?: string; email?: string; phone?: string; creditLimit: number; creditDays: number; currency: string; isActive: boolean; invoices?: Array<{ total: number; status: string }>; }

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>(demoClients);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', rfc: '', email: '', phone: '', creditLimit: 0, creditDays: 30, currency: 'MXN' });

  useEffect(() => {
    apiFetch('/api/clients').then(r => r.json())
      .then(d => setClients(Array.isArray(d) ? d : demoClients))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(c => filter === '' || c.name.toLowerCase().includes(filter.toLowerCase()) || (c.rfc || '').includes(filter));

  const totalCxC = clients.reduce((s, c) => s + (c.invoices || []).filter(i => i.status === 'VIGENTE').reduce((a, i) => a + i.total, 0), 0);

  return (
    <>
      <header className="main-header">
        <div className="header-title"><h1>Clientes (CxC)</h1><p>Cuentas por cobrar y gestión de clientes</p></div>
        <div className="header-actions">
          <div className="search-wrapper"><Search size={15} /><input className="search-input" placeholder="Buscar cliente o RFC..." value={filter} onChange={e => setFilter(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} />Nuevo Cliente</button>
        </div>
      </header>
      <main className="main-content">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
          <div className="kpi-card"><div className="kpi-card-icon blue"><Users size={18} /></div><p className="kpi-card-label">Total Clientes</p><p className="kpi-card-value">{clients.length}</p></div>
          <div className="kpi-card"><div className="kpi-card-icon orange"><CreditCard size={18} /></div><p className="kpi-card-label">CxC Pendiente</p><p className="kpi-card-value">{fmt(totalCxC)}</p></div>
          <div className="kpi-card"><div className="kpi-card-icon green"><TrendingUp size={18} /></div><p className="kpi-card-label">Crédito Promedio</p><p className="kpi-card-value">{clients.length ? Math.round(clients.reduce((s,c) => s+c.creditDays, 0)/clients.length) : 0} días</p></div>
        </div>
        <div className="panel">
          <div className="panel-header"><p className="panel-title">Directorio de Clientes</p><p className="panel-subtitle">{filtered.length} clientes</p></div>
          <div className="panel-body table-responsive">
            <table>
              <thead><tr><th>Código</th><th>Nombre</th><th>RFC</th><th>Email</th><th>Teléfono</th><th>Lím. Crédito</th><th>Días</th><th>Moneda</th><th>CxC</th><th>Estado</th></tr></thead>
              <tbody>
                {loading ? <tr className="loading-row"><td colSpan={10}>Cargando...</td></tr>
                  : filtered.map(c => {
                    const pendiente = (c.invoices || []).filter(i => i.status === 'VIGENTE').reduce((s, i) => s + i.total, 0);
                    return (
                      <tr key={c.id}>
                        <td className="td-primary">{c.code}</td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</td>
                        <td>{c.rfc || '—'}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.phone || '—'}</td>
                        <td className="td-amount">{fmt(c.creditLimit, c.currency)}</td>
                        <td>{c.creditDays} días</td>
                        <td><span className="badge badge-primary">{c.currency}</span></td>
                        <td className="td-amount" style={{ color: pendiente > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{fmt(pendiente, c.currency)}</td>
                        <td><span className={`badge ${c.isActive ? 'badge-success' : 'badge-danger'}`}>{c.isActive ? 'Activo' : 'Inactivo'}</span></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h2>Nuevo Cliente</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Código</label><input placeholder="CLI-001" value={form.code} onChange={e => setForm({...form, code: e.target.value})} /></div>
                <div className="form-group"><label>RFC</label><input placeholder="AAA010101AAA" value={form.rfc} onChange={e => setForm({...form, rfc: e.target.value})} /></div>
                <div className="form-group full-width"><label>Nombre / Razón Social</label><input placeholder="Nombre completo del cliente" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="form-group"><label>Email</label><input type="email" placeholder="correo@empresa.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="form-group"><label>Teléfono</label><input placeholder="55-1234-5678" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                <div className="form-group"><label>Límite de Crédito</label><input type="number" value={form.creditLimit} onChange={e => setForm({...form, creditLimit: +e.target.value})} /></div>
                <div className="form-group"><label>Días de Crédito</label><input type="number" value={form.creditDays} onChange={e => setForm({...form, creditDays: +e.target.value})} /></div>
                <div className="form-group"><label>Moneda</label><select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}><option>MXN</option><option>USD</option></select></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary">Guardar Cliente</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const demoClients: Client[] = [
  { id: '1', code: 'CLI-001', name: 'Comercializadora Azteca S.A. de C.V.', rfc: 'CAZ990101XYZ', email: 'compras@azteca.mx', phone: '55-2222-3333', creditLimit: 150000, creditDays: 30, currency: 'MXN', isActive: true, invoices: [{ total: 116000, status: 'COBRADA' }, { total: 290000, status: 'VIGENTE' }] },
  { id: '2', code: 'CLI-002', name: 'Tech Solutions USA LLC', rfc: undefined, email: 'billing@techsolutions.com', phone: '+1-555-0100', creditLimit: 50000, creditDays: 45, currency: 'USD', isActive: true, invoices: [{ total: 4640, status: 'VIGENTE' }] },
  { id: '3', code: 'CLI-003', name: 'Grupo Industrial del Norte S.A.', rfc: 'GIN850615MNO', email: 'cuentas@industrial.mx', phone: '81-3333-4444', creditLimit: 200000, creditDays: 60, currency: 'MXN', isActive: true, invoices: [] },
];
