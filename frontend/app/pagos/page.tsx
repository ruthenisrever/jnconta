'use client';
import React, { useState, useEffect } from 'react';
import {
  CreditCard, Plus, CheckCircle, RefreshCw,
  FileText, X, CloudLightning, AlertCircle, Code
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import XmlViewer from '@/components/XmlViewer';

interface PpdInvoice {
  id: string;
  serie: string;
  folio: number;
  uuid?: string;
  date: string;
  total: number;
  currency: string;
  totalPaid: number;
  pendingBalance: number;
  numberOfPayments: number;
  fullyPaid: boolean;
  client: { name: string; rfc: string };
}

interface PaymentComplement {
  id: string;
  invoiceId: string;
  paymentDate: string;
  paymentForm: string;
  currency: string;
  exchangeRate: number;
  amountPaid: number;
  numberOfPayment: number;
  previousBalance: number;
  newBalance: number;
  uuid?: string;
  status: 'PENDIENTE' | 'TIMBRADO';
  xmlContent?: string;
  invoice: { serie: string; folio: number; uuid?: string; client: { name: string; rfc: string } };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);

const PAYMENT_FORMS: { value: string; label: string }[] = [
  { value: '01', label: '01 - Efectivo' },
  { value: '02', label: '02 - Cheque nominativo' },
  { value: '03', label: '03 - Transferencia electrónica' },
  { value: '04', label: '04 - Tarjeta de crédito' },
  { value: '28', label: '28 - Tarjeta de débito' },
  { value: '99', label: '99 - Por definir' },
];

export default function PagosPage() {
  const [ppdInvoices, setPpdInvoices] = useState<PpdInvoice[]>([]);
  const [complements, setComplements] = useState<PaymentComplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stampingId, setStampingId] = useState<string | null>(null);
  const [showXml, setShowXml] = useState<string | null>(null);

  // Modal de nuevo pago
  const [payModal, setPayModal] = useState<{ inv: PpdInvoice } | null>(null);
  const [payForm, setPayForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentForm: '03',
    currency: 'MXN',
    exchangeRate: 1,
    amountPaid: '',
  });
  const [saving, setSaving] = useState(false);

  const cid = typeof window !== 'undefined' ? localStorage.getItem('companyId') || '' : '';

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [invRes, compRes] = await Promise.all([
        apiFetch(`/api/payments/ppd-invoices?companyId=${cid}`),
        apiFetch(`/api/payments/complement?companyId=${cid}`),
      ]);
      if (invRes.ok) setPpdInvoices(await invRes.json());
      if (compRes.ok) setComplements(await compRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function openPayModal(inv: PpdInvoice) {
    setPayForm({
      paymentDate: new Date().toISOString().split('T')[0],
      paymentForm: '03',
      currency: inv.currency,
      exchangeRate: 1,
      amountPaid: inv.pendingBalance.toFixed(2),
    });
    setPayModal({ inv });
  }

  async function handleRegisterPayment() {
    if (!payModal || !payForm.amountPaid) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/payments/complement', {
        method: 'POST',
        body: JSON.stringify({
          invoiceId: payModal.inv.id,
          companyId: cid,
          paymentDate: payForm.paymentDate,
          paymentForm: payForm.paymentForm,
          currency: payForm.currency,
          exchangeRate: payForm.exchangeRate,
          amountPaid: parseFloat(payForm.amountPaid),
        }),
      });
      if (res.ok) {
        setPayModal(null);
        await loadAll();
      } else {
        const err = await res.json();
        alert(err.message || 'Error al registrar el pago');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  }

  async function handleStamp(id: string) {
    setStampingId(id);
    try {
      const res = await apiFetch(`/api/payments/complement/${id}/stamp`, { method: 'POST' });
      if (res.ok) {
        await loadAll();
      } else {
        const err = await res.json();
        alert(err.message || 'Error al timbrar');
      }
    } catch {
      alert('Error de conexión al PAC');
    } finally {
      setStampingId(null);
    }
  }

  const pending = ppdInvoices.filter(i => !i.fullyPaid);
  const totalPendiente = pending.reduce((s, i) => s + i.pendingBalance, 0);
  const pendingComplements = complements.filter(c => c.status === 'PENDIENTE').length;

  return (
    <>
      <header className="main-header">
        <div className="header-title">
          <h1 className="flex items-center gap-3">
            <CreditCard size={24} className="text-primary-400" />
            Complemento de Pagos (REP)
          </h1>
          <p>Registra y timbra los pagos de facturas en parcialidades (PPD) según el Anexo 20 del SAT.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={loadAll}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          <div className="kpi-card">
            <p className="kpi-card-label">Facturas PPD Activas</p>
            <p className="kpi-card-value">{ppdInvoices.filter(i => !i.fullyPaid).length}</p>
          </div>
          <div className="kpi-card" style={{ borderLeft: '4px solid var(--warning)' }}>
            <p className="kpi-card-label">Saldo Pendiente</p>
            <p className="kpi-card-value" style={{ fontSize: 18, color: 'var(--warning)' }}>{fmt(totalPendiente)}</p>
          </div>
          <div className="kpi-card">
            <p className="kpi-card-label">Complementos Registrados</p>
            <p className="kpi-card-value">{complements.length}</p>
          </div>
          <div className="kpi-card" style={{ borderLeft: pendingComplements > 0 ? '4px solid var(--danger)' : '4px solid var(--success)' }}>
            <p className="kpi-card-label">Sin Timbrar</p>
            <p className="kpi-card-value" style={{ color: pendingComplements > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {pendingComplements}
            </p>
          </div>
        </div>

        {pendingComplements > 0 && (
          <div className="alert alert-warning mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>Tienes {pendingComplements} complemento(s) registrado(s) sin timbrar. El SAT requiere que se timbren antes del último día del mes siguiente al pago.</span>
          </div>
        )}

        {/* Facturas PPD pendientes */}
        <div className="panel mb-8">
          <div className="panel-header">
            <p className="panel-title">Facturas PPD — Saldo Pendiente de Pago</p>
            <p className="panel-subtitle">Facturas emitidas con método de pago "En parcialidades" que aún tienen saldo</p>
          </div>
          <div className="panel-body table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Folio / UUID</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th className="text-right">Total Factura</th>
                  <th className="text-right">Pagado</th>
                  <th className="text-right">Saldo</th>
                  <th>Pagos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="loading-row"><td colSpan={8}>Cargando...</td></tr>
                ) : ppdInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-12 text-muted italic">
                      No hay facturas PPD registradas. Las facturas con método de pago "PPD" aparecerán aquí.
                    </td>
                  </tr>
                ) : ppdInvoices.map(inv => (
                  <tr key={inv.id} className={inv.fullyPaid ? 'opacity-40' : ''}>
                    <td className="td-primary">
                      <div>{inv.serie}{inv.folio}</div>
                      {inv.uuid && <div className="text-[9px] text-muted font-mono">{inv.uuid.substring(0, 16)}...</div>}
                    </td>
                    <td>
                      <div className="font-medium">{inv.client.name}</div>
                      <div className="text-[10px] text-muted font-mono">{inv.client.rfc}</div>
                    </td>
                    <td>{new Date(inv.date).toLocaleDateString('es-MX')}</td>
                    <td className="td-amount font-bold">{fmt(inv.total)}</td>
                    <td className="td-amount text-success">{fmt(inv.totalPaid)}</td>
                    <td className="td-amount font-bold" style={{ color: inv.fullyPaid ? 'var(--success)' : 'var(--warning)' }}>
                      {inv.fullyPaid ? '✓ Pagado' : fmt(inv.pendingBalance)}
                    </td>
                    <td>
                      <span className="badge badge-secondary">{inv.numberOfPayments} pago(s)</span>
                    </td>
                    <td>
                      {!inv.fullyPaid && (
                        <button className="btn btn-primary btn-sm" onClick={() => openPayModal(inv)}>
                          <Plus size={13} /> Registrar Pago
                        </button>
                      )}
                      {inv.fullyPaid && (
                        <span className="flex items-center gap-1 text-success text-xs font-bold">
                          <CheckCircle size={14} /> Liquidada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lista de complementos */}
        <div className="panel">
          <div className="panel-header">
            <p className="panel-title">Complementos de Pago Emitidos</p>
            <p className="panel-subtitle">Historial de pagos registrados y su estado de timbrado</p>
          </div>
          <div className="panel-body table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Cliente</th>
                  <th>Fecha Pago</th>
                  <th>Forma</th>
                  <th>Parcialidad</th>
                  <th className="text-right">Monto Pagado</th>
                  <th className="text-right">Saldo Ant.</th>
                  <th className="text-right">Saldo Nuevo</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="loading-row"><td colSpan={10}>Cargando...</td></tr>
                ) : complements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center p-12 text-muted italic">
                      No hay complementos registrados aún.
                    </td>
                  </tr>
                ) : complements.map(c => (
                  <tr key={c.id}>
                    <td className="td-primary">
                      {c.invoice.serie}{c.invoice.folio}
                      {c.invoice.uuid && (
                        <div className="text-[9px] text-muted font-mono">{c.invoice.uuid.substring(0, 12)}...</div>
                      )}
                    </td>
                    <td className="text-sm">{c.invoice.client.name}</td>
                    <td>{new Date(c.paymentDate).toLocaleDateString('es-MX')}</td>
                    <td><span className="badge badge-muted text-[10px]">{c.paymentForm}</span></td>
                    <td className="text-center font-bold">{c.numberOfPayment}ª</td>
                    <td className="td-amount font-bold text-success">{fmt(c.amountPaid)}</td>
                    <td className="td-amount text-muted">{fmt(c.previousBalance)}</td>
                    <td className="td-amount" style={{ color: c.newBalance <= 0.01 ? 'var(--success)' : 'var(--warning)' }}>
                      {fmt(c.newBalance)}
                    </td>
                    <td>
                      {c.status === 'TIMBRADO' ? (
                        <span className="badge badge-success text-[10px]">TIMBRADO</span>
                      ) : (
                        <span className="badge badge-warning text-[10px]">PENDIENTE</span>
                      )}
                      {c.uuid && (
                        <div className="text-[9px] text-muted font-mono mt-1">{c.uuid.substring(0, 12)}...</div>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {c.status === 'PENDIENTE' && (
                          <button
                            className="btn btn-ghost btn-sm text-primary-400 p-1"
                            onClick={() => handleStamp(c.id)}
                            disabled={stampingId === c.id}
                            title="Timbrar complemento"
                          >
                            {stampingId === c.id
                              ? <RefreshCw size={14} className="animate-spin" />
                              : <CloudLightning size={14} />}
                          </button>
                        )}
                        {c.xmlContent && (
                          <button
                            className="btn btn-ghost btn-sm text-info-400 p-1"
                            onClick={() => setShowXml(c.xmlContent!)}
                            title="Ver XML"
                          >
                            <Code size={14} />
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

      {/* Modal: Registrar Pago */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="flex items-center gap-2">
                <CreditCard size={18} className="text-primary-400" />
                Registrar Pago — {payModal.inv.serie}{payModal.inv.folio}
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPayModal(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {/* Resumen de la factura */}
              <div className="bg-surface-2 rounded-xl p-4 mb-6 border border-surface-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted text-[10px] uppercase block mb-1">Cliente</span>
                    <span className="font-bold">{payModal.inv.client.name}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] uppercase block mb-1">Saldo Pendiente</span>
                    <span className="font-bold text-warning text-lg">{fmt(payModal.inv.pendingBalance)}</span>
                  </div>
                  <div>
                    <span className="text-muted text-[10px] uppercase block mb-1">Parcialidad #</span>
                    <span className="font-bold text-primary-300 text-lg">{payModal.inv.numberOfPayments + 1}</span>
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>Fecha de Pago</label>
                  <input
                    type="date"
                    value={payForm.paymentDate}
                    onChange={e => setPayForm(f => ({ ...f, paymentDate: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Forma de Pago</label>
                  <select value={payForm.paymentForm} onChange={e => setPayForm(f => ({ ...f, paymentForm: e.target.value }))}>
                    {PAYMENT_FORMS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Moneda</label>
                  <select value={payForm.currency} onChange={e => setPayForm(f => ({ ...f, currency: e.target.value }))}>
                    <option value="MXN">MXN — Peso Mexicano</option>
                    <option value="USD">USD — Dólar Americano</option>
                  </select>
                </div>
                {payForm.currency !== 'MXN' && (
                  <div className="form-group">
                    <label>Tipo de Cambio</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={payForm.exchangeRate}
                      onChange={e => setPayForm(f => ({ ...f, exchangeRate: +e.target.value }))}
                    />
                  </div>
                )}
                <div className="form-group full-width">
                  <label>Monto Pagado <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={payModal.inv.pendingBalance}
                    value={payForm.amountPaid}
                    onChange={e => setPayForm(f => ({ ...f, amountPaid: e.target.value }))}
                    placeholder="0.00"
                    autoFocus
                  />
                  <span className="text-[10px] text-muted mt-1 block">
                    Saldo nuevo: {fmt(Math.max(0, payModal.inv.pendingBalance - parseFloat(payForm.amountPaid || '0')))}
                  </span>
                </div>
              </div>

              <div className="bg-primary-600/10 border border-primary-600/20 rounded-xl p-3 mt-4 text-xs text-primary-300 flex gap-2">
                <FileText size={14} className="shrink-0 mt-0.5" />
                <p>El complemento de pago quedará en estado <strong>PENDIENTE</strong>. Deberás timbrarlo antes del último día del mes siguiente para cumplir con el SAT (Art. 39 RCFF).</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleRegisterPayment}
                disabled={saving || !payForm.amountPaid || parseFloat(payForm.amountPaid) <= 0}
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                {saving ? 'Guardando...' : 'Registrar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showXml && (
        <XmlViewer xml={showXml} onClose={() => setShowXml(null)} title="XML — Complemento de Pagos (REP)" />
      )}
    </>
  );
}
