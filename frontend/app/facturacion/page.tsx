'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Search, X, FileText, Eye, Ban, ShieldCheck, Code, CloudLightning, RefreshCw, Mail, CheckCircle, Send, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import XmlViewer from '@/components/XmlViewer';
interface InvoiceItem { description: string; quantity: number; unitPrice: number; taxRate: number; subtotal: number; tax: number; total: number; unit: string; }
interface Invoice { id: string; folio: string; customerId: string; customerName: string; date: string; dueDate: string; total: number; currency: string; status: 'VIGENTE' | 'COBRADA' | 'CANCELADA'; uuid?: string; xmlContent?: string; }

const demoInvoices: Invoice[] = [
  { id:'1', folio:'F-1001', customerId:'C-01', customerName:'Cliente ABC, SA de CV', date:'2024-03-20', dueDate:'2024-04-20', total:15400.50, currency:'MXN', status:'COBRADA' },
  { id:'2', folio:'F-1002', customerId:'C-02', customerName:'Distribuidora Global', date:'2024-03-25', dueDate:'2024-04-25', total:8900.00, currency:'MXN', status:'VIGENTE' },
  { id:'3', folio:'F-1003', customerId:'C-01', customerName:'Cliente ABC, SA de CV', date:'2024-03-28', dueDate:'2024-04-28', total:5200.00, currency:'MXN', status:'VIGENTE' },
];

const fmt = (n: number, c = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: c, minimumFractionDigits: 2 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(n);
const STATUS_MAP: Record<string, string> = { VIGENTE: 'badge-info', COBRADA: 'badge-success', CANCELADA: 'badge-danger' };
const PM_MAP: Record<string, string> = { PUE: 'Pago en una sola exhibición', PPD: 'Pago en parcialidades' };
const PF_MAP: Record<string, string> = { '01': 'Efectivo', '03': 'Transferencia', '04': 'Tarjeta de crédito', '99': 'Por definir' };

export default function FacturacionPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(demoInvoices);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [viewInv, setViewInv] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, unitPrice: 0, taxRate: 0.16, subtotal: 0, tax: 0, total: 0, unit: 'PZA' }]);
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({ clientId: '', date: new Date().toISOString().split('T')[0], currency: 'MXN', exchangeRate: 1, paymentMethod: 'PUE', paymentForm: '03', cfdiUse: 'G03' });
  const [stamping, setStamping] = useState<string | null>(null);
  const [bulkStamping, setBulkStamping] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ stamped: number; errors: number } | null>(null);
  const [showXml, setShowXml] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingEmail, setSendingEmail] = useState(false);
  const [cancelModal, setCancelModal] = useState<{ inv: Invoice } | null>(null);
  const [cancelMotivo, setCancelMotivo] = useState<'01' | '02' | '03' | '04'>('02');
  const [cancelUuidSustituto, setCancelUuidSustituto] = useState('');
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  async function handleBulkStamp() {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Timbrar ${selectedIds.size} factura(s) ante el SAT? Esta acción genera UUID fiscales.`)) return;
    setBulkStamping(true);
    setBulkResult(null);
    try {
      const companyId = localStorage.getItem('companyId') || '';
      const res = await apiFetch('/api/invoices/bulk-stamp', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds: Array.from(selectedIds), companyId }),
      });
      const data = await res.json();
      setBulkResult({ stamped: data.stamped?.length ?? 0, errors: data.errors?.length ?? 0 });
      setSelectedIds(new Set());
      fetchInvoices();
    } catch { alert('Error en timbrado masivo'); }
    setBulkStamping(false);
  }

  async function handleBulkEmail() {
    if (selectedIds.size === 0) return;
    setSendingEmail(true);
    try {
      const res = await apiFetch('/api/invoices/bulk-send-email', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds: Array.from(selectedIds) })
      });
      if (res.ok) {
        alert('Correos enviados satisfactoriamente');
        setSelectedIds(new Set());
        fetchInvoices();
      }
    } catch (e) {
      alert('Error al enviar correos');
    }
    setSendingEmail(false);
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  async function fetchInvoices() {
    setLoading(true);
    try {
      const r = await apiFetch('/api/invoices');
      const d = await r.json();
      setInvoices(Array.isArray(d) ? d : demoInvoices);

      const rc = await apiFetch('/api/clients');
      const dc = await rc.json();
      setClients(dc);
    } catch (e) {}
    setLoading(false);
  }

  async function handleSaveInvoice() {
    if (!form.clientId) return alert('Seleccione un cliente');
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    
    try {
      const res = await apiFetch('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          companyId: cid,
          subtotal,
          tax: totalTax,
          total,
          folio: Math.floor(Math.random() * 10000), // En real usaríamos secuencia
          items: items.map(i => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
            subtotal: i.subtotal,
            tax: i.tax,
            total: i.total
          }))
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchInvoices();
      } else {
        const err = await res.json();
        alert(`Error al guardar: ${err.message}`);
      }
    } catch (e) {
      alert('Error de conexión');
    }
  }

  async function handleCancel() {
    if (!cancelModal) return;
    setCanceling(true);
    try {
      const res = await apiFetch(`/api/invoices/${cancelModal.inv.id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({
          motivo: cancelMotivo,
          uuidSustituto: cancelMotivo === '01' ? cancelUuidSustituto : undefined,
        }),
      });
      if (res.ok) {
        setCancelModal(null);
        setCancelMotivo('02');
        setCancelUuidSustituto('');
        fetchInvoices();
      } else {
        const err = await res.json();
        alert(`Error al cancelar: ${err.message}`);
      }
    } catch {
      alert('Error de conexión');
    }
    setCanceling(false);
  }

  async function handleStamp(id: string) {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    setStamping(id);
    try {
      const res = await apiFetch(`/api/stamping/invoice/${id}`, {
        method: 'POST',
        body: JSON.stringify({ companyId: cid })
      });
      if (res.ok) {
        alert('Factura timbrada exitosamente (CFDI 4.0)');
        fetchInvoices();
      } else {
        const err = await res.json();
        alert(`Error al timbrar: ${err.message}`);
      }
    } catch (e) {
      alert('Error de conexión al PAC');
    }
    setStamping(null);
  }

  function calcItem(i: number, field: string, value: any) {
    const updated = items.map((item, idx) => {
      if (idx !== i) return item;
      const upd = { ...item, [field]: value };
      upd.subtotal = upd.quantity * upd.unitPrice;
      upd.tax = upd.subtotal * upd.taxRate;
      upd.total = upd.subtotal + upd.tax;
      return upd;
    });
    setItems(updated);
  }

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalTax = items.reduce((s, i) => s + i.tax, 0);
  const total = subtotal + totalTax;

  const filtered = invoices.filter((inv: Invoice) => filter === '' || inv.customerName.toLowerCase().includes(filter.toLowerCase()) || inv.folio.includes(filter.toUpperCase()));
  const totalPendiente = invoices.filter((inv: Invoice) => inv.status === 'VIGENTE').reduce((s: number, inv: Invoice) => s + inv.total, 0);
  const totalCobrado = invoices.filter((inv: Invoice) => inv.status === 'COBRADA').reduce((s: number, inv: Invoice) => s + inv.total, 0);

  return (
    <>
      <header className="main-header">
        <div className="header-title"><h1>Facturación CFDI</h1><p>Facturas emitidas y comprobantes fiscales digitales</p></div>
        <div className="header-actions">
          <div className="search-wrapper"><Search size={15} /><input className="search-input" placeholder="Buscar folio o cliente..." value={filter} onChange={e => setFilter(e.target.value)} /></div>
          {selectedIds.size > 0 && (
            <>
              <button className="btn btn-secondary flex items-center gap-2 animate-in fade-in zoom-in" onClick={handleBulkStamp} disabled={bulkStamping}>
                {bulkStamping ? <RefreshCw size={14} className="animate-spin" /> : <CloudLightning size={14} />}
                Timbrar {selectedIds.size} en lote
              </button>
              <button className="btn btn-secondary flex items-center gap-2 animate-in fade-in zoom-in" onClick={handleBulkEmail} disabled={sendingEmail}>
                {sendingEmail ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar {selectedIds.size} por Email
              </button>
            </>
          )}
          {bulkResult && (
            <span className="text-xs text-success animate-in fade-in">
              ✓ {bulkResult.stamped} timbradas{bulkResult.errors > 0 ? `, ${bulkResult.errors} con error` : ''}
            </span>
          )}
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} />Nueva Factura</button>
        </div>
      </header>
      <main className="main-content">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="kpi-card"><p className="kpi-card-label">Total Cobrado</p><p className="kpi-card-value" style={{fontSize:20}}>{fmt(totalCobrado)}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Facturas</p><p className="kpi-card-value">{invoices.length}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Pendiente</p><p className="kpi-card-value" style={{fontSize:20}}>{fmt(totalPendiente)}</p></div>
          <div className="kpi-card"><p className="kpi-card-label">Canceladas</p><p className="kpi-card-value" style={{color:'var(--danger)'}}>{invoices.filter(i=>i.status==='CANCELADA').length}</p></div>
        </div>
        <div className="panel">
          <div className="panel-header"><p className="panel-title">Facturas Emitidas (CFDI)</p></div>
          <div className="panel-body table-responsive">
            <table>
              <thead><tr><th style={{width: 40}}></th><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {loading ? <tr className="loading-row"><td colSpan={7}>Cargando...</td></tr>
                  : filtered.map(inv => (
                    <tr key={inv.id} className={selectedIds.has(inv.id) ? 'bg-primary-500/5' : ''}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(inv.id)} 
                          onChange={() => toggleSelect(inv.id)} 
                        />
                      </td>
                      <td className="td-primary">
                        <div className="flex flex-col">
                          <span>{inv.folio}</span>
                          {inv.uuid && <span className="text-[9px] text-muted font-mono">{inv.uuid}</span>}
                        </div>
                      </td>
                      <td>{new Date(inv.date).toLocaleDateString('es-MX')}</td>
                      <td style={{color:'var(--text-primary)',fontWeight:500}}>{inv.customerName}</td>
                      <td className="td-amount" style={{fontWeight:700,color:'var(--text-primary)'}}>{fmtNum(inv.total)}</td>
                      <td><span className={`badge ${STATUS_MAP[inv.status] || 'badge-info'}`}>{inv.status}</span></td>
                      <td>
                        <div className="flex gap-2">
                           {!inv.uuid && (
                             <button 
                               className="btn btn-ghost btn-sm text-primary-400 p-1" 
                               onClick={() => handleStamp(inv.id)}
                               disabled={stamping === inv.id}
                               title="Timbrar CFDI"
                             >
                               {stamping === inv.id ? <RefreshCw size={14} className="animate-spin" /> : <CloudLightning size={14} />}
                             </button>
                           )}
                           {inv.uuid && (
                             <button className="btn btn-ghost btn-sm text-info-400 p-1" onClick={() => setShowXml(inv.xmlContent || '')} title="Ver XML">
                               <Code size={14} />
                             </button>
                           )}
                           <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setViewInv(inv)}><Eye size={13} /></button>
                           {inv.status === 'VIGENTE' && (
                             <button className="btn btn-ghost btn-sm text-danger p-1" onClick={() => { setCancelModal({ inv }); setCancelMotivo('02'); setCancelUuidSustituto(''); }} title="Cancelar factura">
                               <Ban size={13} />
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-body">
              <div className="form-grid" style={{marginBottom:20}}>
                <div className="form-group full-width">
                  <label>Cliente</label>
                  <select value={form.clientId} onChange={e=>setForm({...form,clientId:e.target.value})}>
                    <option value="">-- Seleccionar Cliente --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.rfc})</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Fecha</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
                <div className="form-group"><label>Moneda</label><select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option>MXN</option><option>USD</option></select></div>
                {form.currency === 'USD' && <div className="form-group"><label>Tipo de Cambio</label><input type="number" step="0.01" value={form.exchangeRate} onChange={e=>setForm({...form,exchangeRate:+e.target.value})} /></div>}
                <div className="form-group"><label>Método de Pago</label><select value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}><option value="PUE">PUE - Una sola exhibición</option><option value="PPD">PPD - Parcialidades</option></select></div>
                <div className="form-group"><label>Forma de Pago</label><select value={form.paymentForm} onChange={e=>setForm({...form,paymentForm:e.target.value})}><option value="01">01 - Efectivo</option><option value="03">03 - Transferencia</option><option value="04">04 - Tarjeta crédito</option><option value="99">99 - Por definir</option></select></div>
                <div className="form-group"><label>Uso CFDI</label><select value={form.cfdiUse} onChange={e=>setForm({...form,cfdiUse:e.target.value})}><option value="G01">G01 - Adquisición de mercancias</option><option value="G03">G03 - Gastos en general</option><option value="P01">P01 - Por definir</option></select></div>
              </div>
              <h4 style={{marginBottom:12,fontSize:13,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.8px'}}>Conceptos</h4>
              <div className="table-responsive">
                <table>
                  <thead><tr><th>Descripción</th><th>Cant.</th><th>Precio U.</th><th>IVA %</th><th>Sub.</th><th>IVA</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td><input style={{minWidth:180}} placeholder="Descripción del concepto" value={item.description} onChange={e=>calcItem(i,'description',e.target.value)} /></td>
                        <td><input type="number" min="0" step="1" style={{width:70}} value={item.quantity} onChange={e=>calcItem(i,'quantity',+e.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" style={{width:100}} value={item.unitPrice||''} onChange={e=>calcItem(i,'unitPrice',+e.target.value)} /></td>
                        <td><select style={{width:80}} value={item.taxRate} onChange={e=>calcItem(i,'taxRate',+e.target.value)}><option value={0.16}>16%</option><option value={0}>0%</option><option value={0.08}>8%</option></select></td>
                        <td className="td-amount">{fmtNum(item.subtotal)}</td>
                        <td className="td-amount">{fmtNum(item.tax)}</td>
                        <td className="td-amount" style={{fontWeight:700}}>{fmtNum(item.total)}</td>
                        <td><button className="btn btn-ghost btn-sm btn-icon" onClick={()=>setItems(items.filter((_,idx)=>idx!==i))}><X size={12}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-ghost btn-sm mt-4" onClick={()=>setItems([...items,{description:'',quantity:1,unitPrice:0,taxRate:0.16,subtotal:0,tax:0,total:0,unit:'PZA'}])}><Plus size={13}/> Agregar concepto</button>
              <div style={{marginTop:20,padding:'16px 20px',background:'var(--surface-2)',borderRadius:'var(--radius-lg)',border:'1px solid var(--border-subtle)',textAlign:'right'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{color:'var(--text-muted)'}}>Subtotal:</span><span>{fmtNum(subtotal)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{color:'var(--text-muted)'}}>IVA 16%:</span><span>{fmtNum(totalTax)}</span></div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:18,fontWeight:800,color:'var(--text-primary)',borderTop:'1px solid var(--border-default)',paddingTop:10,marginTop:6}}><span>TOTAL {form.currency}:</span><span>{fmtNum(total)}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveInvoice}><FileText size={14}/>Guardar Factura</button>
            </div>
          </div>
        </div>
      )}
      {showXml && (
        <XmlViewer xml={showXml} onClose={() => setShowXml(null)} title="Visualizador de XML Sellado" />
      )}

      {cancelModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCancelModal(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="flex items-center gap-2"><AlertTriangle size={16} className="text-danger" />Cancelar Factura</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setCancelModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.07)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', marginBottom: 18 }}>
                <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>
                  <strong>{cancelModal.inv.folio}</strong> — {cancelModal.inv.customerName}
                </p>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Motivo de Cancelación (SAT)</label>
                <select value={cancelMotivo} onChange={e => setCancelMotivo(e.target.value as '01' | '02' | '03' | '04')}>
                  <option value="01">01 — Comprobante emitido con errores con relación</option>
                  <option value="02">02 — Comprobante emitido con errores sin relación</option>
                  <option value="03">03 — No se llevó a cabo la operación</option>
                  <option value="04">04 — Operación nominativa relacionada con una factura global</option>
                </select>
              </div>
              {cancelMotivo === '01' && (
                <div className="form-group">
                  <label>UUID Factura Sustituta</label>
                  <input
                    placeholder="UUID del CFDI que sustituye a este"
                    value={cancelUuidSustituto}
                    onChange={e => setCancelUuidSustituto(e.target.value)}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Requerido para motivo 01 (con sustitución)</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCancelModal(null)}>Cancelar</button>
              <button
                className="btn btn-danger"
                onClick={handleCancel}
                disabled={canceling || (cancelMotivo === '01' && !cancelUuidSustituto.trim())}
              >
                {canceling ? <RefreshCw size={14} className="animate-spin" /> : <Ban size={14} />}
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
