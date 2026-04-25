'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Building2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const fmt = (n: number, c = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(n);

interface Supplier { id: string; code: string; name: string; rfc?: string; email?: string; phone?: string; creditDays: number; currency: string; isActive: boolean; bills?: Array<{ total: number; status: string; dueDate?: string }>; }

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(demoSuppliers);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    apiFetch('/api/suppliers').then(r => r.json())
      .then(d => setSuppliers(Array.isArray(d) ? d : demoSuppliers))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter(s => filter === '' || s.name.toLowerCase().includes(filter.toLowerCase()) || (s.rfc || '').includes(filter));
  const totalCxP = suppliers.reduce((s, sup) => s + (sup.bills || []).filter(b => b.status === 'PENDIENTE').reduce((a, b) => a + b.total, 0), 0);

  return (
    <>
      <header className="main-header">
        <div className="header-title"><h1>Proveedores (CxP)</h1><p>Directorio de proveedores y cuentas por pagar</p></div>
        <div className="header-actions">
          <div className="search-wrapper"><Search size={15} /><input className="search-input" placeholder="Buscar proveedor o RFC..." value={filter} onChange={e => setFilter(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} />Nuevo Proveedor</button>
        </div>
      </header>
      <main className="main-content">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="kpi-card"><div className="kpi-card-icon red"><Building2 size={18} /></div><p className="kpi-card-label">Total Proveedores</p><p className="kpi-card-value">{suppliers.length}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">CxP Pendiente</p><p className="kpi-card-value" style={{color:'var(--danger)',fontSize:20}}>{fmt(totalCxP)}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Crédito Promedio</p><p className="kpi-card-value">{suppliers.length ? Math.round(suppliers.reduce((s,p)=>s+p.creditDays,0)/suppliers.length):0} días</p></div>
        </div>
        <div className="panel">
          <div className="panel-header"><p className="panel-title">Directorio de Proveedores</p></div>
          <div className="panel-body table-responsive">
            <table>
              <thead><tr><th>Código</th><th>Nombre</th><th>RFC</th><th>Email</th><th>Teléfono</th><th>Días Crédito</th><th>Moneda</th><th>CxP Pendiente</th><th>Estado</th></tr></thead>
              <tbody>
                {filtered.map(s => {
                  const pendiente = (s.bills || []).filter(b => b.status === 'PENDIENTE').reduce((a, b) => a + b.total, 0);
                  return (
                    <tr key={s.id}>
                      <td className="td-primary">{s.code}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.name}</td>
                      <td>{s.rfc || '—'}</td>
                      <td>{s.email || '—'}</td>
                      <td>{s.phone || '—'}</td>
                      <td>{s.creditDays} días</td>
                      <td><span className="badge badge-primary">{s.currency}</span></td>
                      <td className="td-amount" style={{ color: pendiente > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{pendiente > 0 ? fmt(pendiente, s.currency) : '—'}</td>
                      <td><span className={`badge ${s.isActive ? 'badge-success' : 'badge-muted'}`}>{s.isActive ? 'Activo' : 'Inactivo'}</span></td>
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
            <div className="modal-header"><h2>Nuevo Proveedor</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Código</label><input placeholder="PRV-003" /></div>
                <div className="form-group"><label>RFC</label><input placeholder="AAA010101AAA" /></div>
                <div className="form-group full-width"><label>Nombre / Razón Social</label><input placeholder="Nombre completo del proveedor" /></div>
                <div className="form-group"><label>Email</label><input type="email" /></div>
                <div className="form-group"><label>Teléfono</label><input /></div>
                <div className="form-group"><label>Banco</label><input placeholder="BBVA, Banamex..." /></div>
                <div className="form-group"><label>Cuenta / CLABE</label><input placeholder="18 dígitos" /></div>
                <div className="form-group"><label>Días de Crédito</label><input type="number" defaultValue={30} /></div>
                <div className="form-group"><label>Moneda</label><select><option>MXN</option><option>USD</option></select></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button className="btn btn-primary">Guardar Proveedor</button></div>
          </div>
        </div>
      )}
    </>
  );
}

const demoSuppliers: Supplier[] = [
  { id:'1', code:'PRV-001', name:'Distribuidora Nacional S.A. de C.V.', rfc:'DNA010203QRS', email:'ventas@distribuidora.mx', phone:'55-4444-5555', creditDays:30, currency:'MXN', isActive:true, bills:[{total:58000,status:'PAGADA'}] },
  { id:'2', code:'PRV-002', name:'Global Imports Inc.', rfc:undefined, email:'orders@globalimports.com', phone:'+1-555-0200', creditDays:45, currency:'USD', isActive:true, bills:[{total:3000,status:'PENDIENTE',dueDate:'2024-04-29'}] },
];
