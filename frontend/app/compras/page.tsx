'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Search, X, Building2, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';
const fmt = (n: number | null | undefined, c = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(n || 0);

interface Bill { id: string; folio: string; date: string; supplier?: { name: string; rfc?: string }; subtotal: number; tax: number; total: number; currency: string; exchangeRate: number; dueDate?: string; status: string; uuid?: string; }

export default function ComprasPage() {
  const [bills, setBills] = useState<Bill[]>(demoBills);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    apiFetch('/api/bills').then(r => r.json())
      .then(d => setBills(Array.isArray(d) ? d : demoBills))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = bills.filter(b => filter === '' || b.supplier?.name.toLowerCase().includes(filter.toLowerCase()) || b.folio.includes(filter));
  const totalPending = bills.filter(b => b.status === 'PENDIENTE').reduce((s, b) => s + b.total, 0);

  return (
    <>
      <header className="main-header">
        <div className="header-title"><h1>Facturas Recibidas (CxP)</h1><p>Cuentas por pagar y compras a proveedores</p></div>
        <div className="header-actions">
          <div className="search-wrapper"><Search size={15} /><input className="search-input" placeholder="Buscar proveedor o folio..." value={filter} onChange={e => setFilter(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} />Registrar Factura</button>
        </div>
      </header>
      <main className="main-content">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="kpi-card"><p className="kpi-card-label">CxP Pendiente</p><p className="kpi-card-value" style={{color:'var(--danger)',fontSize:20}}>{fmt(totalPending)}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Facturas Pendientes</p><p className="kpi-card-value">{bills.filter(b=>b.status==='PENDIENTE').length}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Pagadas</p><p className="kpi-card-value" style={{color:'var(--success)'}}>{bills.filter(b=>b.status==='PAGADA').length}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">IVA Acreditable</p><p className="kpi-card-value" style={{fontSize:20}}>{fmt(bills.reduce((s,b)=>s+b.tax,0))}</p></div>
        </div>
        <div className="panel">
          <div className="panel-header"><p className="panel-title">Facturas de Proveedores</p></div>
          <div className="panel-body table-responsive">
            <table>
              <thead><tr><th>Folio Prov.</th><th>UUID SAT</th><th>Fecha</th><th>Proveedor</th><th>Subtotal</th><th>IVA</th><th>Total</th><th>Moneda</th><th>T/C</th><th>Vencimiento</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {loading ? <tr className="loading-row"><td colSpan={12}>Cargando...</td></tr>
                  : filtered.map(b => {
                    const overdue = b.status === 'PENDIENTE' && b.dueDate && new Date(b.dueDate) < new Date();
                    return (
                      <tr key={b.id}>
                        <td className="td-primary">{b.folio}</td>
                        <td style={{fontSize:11,color:'var(--text-muted)'}}>{b.uuid || '—'}</td>
                        <td>{new Date(b.date).toLocaleDateString('es-MX')}</td>
                        <td style={{color:'var(--text-primary)',fontWeight:500}}>{b.supplier?.name}</td>
                        <td className="td-amount">{new Intl.NumberFormat('es-MX',{minimumFractionDigits:2}).format(b.subtotal)}</td>
                        <td className="td-amount">{new Intl.NumberFormat('es-MX',{minimumFractionDigits:2}).format(b.tax)}</td>
                        <td className="td-amount" style={{fontWeight:700}}>{new Intl.NumberFormat('es-MX',{minimumFractionDigits:2}).format(b.total)}</td>
                        <td><span className="badge badge-primary">{b.currency}</span></td>
                        <td>{b.exchangeRate !== 1 ? b.exchangeRate.toFixed(2) : '—'}</td>
                        <td style={{color: overdue ? 'var(--danger)' : 'inherit'}}>{b.dueDate ? new Date(b.dueDate).toLocaleDateString('es-MX') : '—'}</td>
                        <td><span className={`badge ${b.status==='PAGADA'?'badge-success':b.status==='PENDIENTE'?'badge-warning':'badge-danger'}`}>{b.status}</span></td>
                        <td>{b.status==='PENDIENTE' && <button className="btn btn-sm btn-primary"><Check size={12}/> Pagar</button>}</td>
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
            <div className="modal-header"><h2>Registrar Factura de Proveedor</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={()=>setShowModal(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Folio Proveedor</label><input placeholder="F-2024-001" /></div>
                <div className="form-group"><label>UUID SAT</label><input placeholder="12345678-..." /></div>
                <div className="form-group full-width"><label>Proveedor</label><select><option>Distribuidora Nacional S.A.</option><option>Global Imports Inc.</option></select></div>
                <div className="form-group"><label>Fecha</label><input type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
                <div className="form-group"><label>Fecha Vencimiento</label><input type="date" /></div>
                <div className="form-group"><label>Subtotal</label><input type="number" step="0.01" placeholder="0.00" /></div>
                <div className="form-group"><label>IVA</label><input type="number" step="0.01" placeholder="0.00" /></div>
                <div className="form-group"><label>Moneda</label><select><option>MXN</option><option>USD</option></select></div>
                <div className="form-group"><label>Tipo de Cambio</label><input type="number" step="0.01" defaultValue={1} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary">Registrar Factura</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const demoBills: Bill[] = [
  { id:'1', folio:'F-20240310', uuid:'PRV-UUID-001', date:'2024-03-10T00:00:00Z', supplier:{name:'Distribuidora Nacional S.A.',rfc:'DNA010203QRS'}, subtotal:50000, tax:8000, total:58000, currency:'MXN', exchangeRate:1, dueDate:'2024-04-09T00:00:00Z', status:'PAGADA' },
  { id:'2', folio:'INV-5521', date:'2024-03-15T00:00:00Z', supplier:{name:'Global Imports Inc.'}, subtotal:3000, tax:0, total:3000, currency:'USD', exchangeRate:17.15, dueDate:'2024-04-29T00:00:00Z', status:'PENDIENTE' },
];
