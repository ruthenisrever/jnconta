'use client';
import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Landmark, RefreshCw, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const fmt = (n: number, c = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: c, minimumFractionDigits: 2 }).format(n);

interface BankAccount { id: string; name: string; bank: string; accountNumber: string; clabe?: string; currency: string; balance: number; }
interface Transaction { id: string; date: string; concept: string; reference?: string; type: string; amount: number; balance: number; currency: string; reconciled: boolean; }

const demoAccounts: BankAccount[] = [
  { id: '1', name: 'Banamex Operaciones', bank: 'Citibanamex', accountNumber: '****6789', clabe: '002180012345678901', currency: 'MXN', balance: 485320.50 },
  { id: '2', name: 'HSBC USD', bank: 'HSBC México', accountNumber: '****3210', clabe: '021180098765432101', currency: 'USD', balance: 12500.00 },
];

const demoTx: Transaction[] = [
  { id:'1', date:'2024-03-01T00:00:00Z', concept:'Cobro factura CLI-001', reference:'TRF-001', type:'DEPOSITO', amount:116000, balance:116000, currency:'MXN', reconciled:true },
  { id:'2', date:'2024-03-05T00:00:00Z', concept:'Pago nómina febrero', reference:'NOM-FEB-24', type:'RETIRO', amount:85000, balance:31000, currency:'MXN', reconciled:true },
  { id:'3', date:'2024-03-10T00:00:00Z', concept:'Pago proveedor PRV-001', reference:'CXP-001', type:'RETIRO', amount:58000, balance:-27000, currency:'MXN', reconciled:true },
  { id:'4', date:'2024-03-15T00:00:00Z', concept:'Cobro factura CLI-003', reference:'TRF-002', type:'DEPOSITO', amount:290000, balance:263000, currency:'MXN', reconciled:false },
  { id:'5', date:'2024-03-20T00:00:00Z', concept:'Arrendamiento oficinas', reference:'RENTA-MAR', type:'CARGO', amount:35000, balance:228000, currency:'MXN', reconciled:false },
];

const TXType: Record<string, { badge: string; sign: string; color: string }> = {
  DEPOSITO: { badge: 'badge-success', sign: '+', color: 'var(--success)' },
  RETIRO: { badge: 'badge-danger', sign: '-', color: 'var(--danger)' },
  TRANSFERENCIA: { badge: 'badge-info', sign: '±', color: 'var(--info)' },
  CARGO: { badge: 'badge-warning', sign: '-', color: 'var(--warning)' },
};

export default function BancosPage() {
  const [accounts] = useState<BankAccount[]>(demoAccounts);
  const [selected, setSelected] = useState<BankAccount>(demoAccounts[0]);
  const [txs] = useState<Transaction[]>(demoTx);
  const [showModal, setShowModal] = useState(false);
  const [tcUsd, setTcUsd] = useState(17.15);

  useEffect(() => {
    apiFetch('/api/currency/usd')
      .then(r => r.json())
      .then(d => setTcUsd(d.rate))
      .catch(() => {});
  }, []);

  const totalMXN = accounts.filter(a => a.currency === 'MXN').reduce((s, a) => s + a.balance, 0);
  const totalUSD = accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + a.balance, 0);

  return (
    <>
      <header className="main-header">
        <div className="header-title"><h1>Bancos</h1><p>Cuentas bancarias y conciliación</p></div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-icon"><RefreshCw size={16} /></button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} />Nuevo Movimiento</button>
        </div>
      </header>
      <main className="main-content">
        {/* Saldo Resumen */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="kpi-card"><div className="kpi-card-icon teal"><Landmark size={20} /></div><p className="kpi-card-label">Saldo Total MXN</p><p className="kpi-card-value">{fmt(totalMXN)}</p><div className="kpi-card-sub up"><ArrowUpRight size={12}/><span>Banamex + BBVA</span></div></div>
          <div className="kpi-card"><div className="kpi-card-icon blue"><Landmark size={20} /></div><p className="kpi-card-label">Saldo Total USD</p><p className="kpi-card-value">{fmt(totalUSD,'USD')}</p><div className="kpi-card-sub neutral"><span>HSBC USD</span></div></div>
          <div className="kpi-card"><div className="kpi-card-icon green"><TrendingUp size={20} /></div><p className="kpi-card-label">MXN Equivalente ({tcUsd.toFixed(2)})</p><p className="kpi-card-value">{fmt(totalMXN + totalUSD * tcUsd)}</p></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          {/* Lista Cuentas */}
          <div>
            <div className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-header"><p className="panel-title">Mis Cuentas</p></div>
              <div className="panel-body">
                {accounts.map(acc => (
                  <button key={acc.id} onClick={() => setSelected(acc)} style={{
                    width: '100%', padding: '14px 16px', background: selected.id === acc.id ? 'var(--surface-3)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{acc.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{acc.bank} · {acc.accountNumber}</p>
                      </div>
                      <span className="badge badge-primary" style={{ fontSize: 10 }}>{acc.currency}</span>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: acc.balance >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: 6 }}>{fmt(acc.balance, acc.currency)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Movimientos */}
          <div className="panel" style={{ marginBottom: 0 }}>
            <div className="panel-header">
              <div>
                <p className="panel-title">Movimientos — {selected.name}</p>
                <p className="panel-subtitle">CLABE: {selected.clabe || '—'}</p>
              </div>
              <button className="btn btn-secondary btn-sm"><Plus size={13} />Movimiento</button>
            </div>
            <div className="panel-body table-responsive">
              <table>
                <thead><tr><th>Fecha</th><th>Concepto</th><th>Referencia</th><th>Tipo</th><th>Cargo/Abono</th><th>Saldo</th><th>Conc.</th></tr></thead>
                <tbody>
                  {txs.map(tx => {
                    const t = TXType[tx.type] || TXType.DEPOSITO;
                    const isDebit = tx.type === 'DEPOSITO';
                    return (
                      <tr key={tx.id}>
                        <td>{new Date(tx.date).toLocaleDateString('es-MX')}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{tx.concept}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{tx.reference || '—'}</td>
                        <td><span className={`badge ${t.badge}`}>{tx.type}</span></td>
                        <td className="td-amount" style={{ color: t.color }}>{t.sign}{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(tx.amount)}</td>
                        <td className="td-amount">{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(tx.balance)}</td>
                        <td><span className={`badge ${tx.reconciled ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: 10 }}>{tx.reconciled ? 'Conc.' : 'Pend.'}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h2>Nuevo Movimiento Bancario</h2><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full-width"><label>Cuenta Bancaria</label><select>{accounts.map(a => <option key={a.id}>{a.name}</option>)}</select></div>
                <div className="form-group"><label>Tipo de Movimiento</label><select><option>DEPOSITO</option><option>RETIRO</option><option>TRANSFERENCIA</option><option>CARGO</option></select></div>
                <div className="form-group"><label>Fecha</label><input type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
                <div className="form-group full-width"><label>Concepto</label><input placeholder="Descripción del movimiento" /></div>
                <div className="form-group"><label>Referencia</label><input placeholder="Opcional" /></div>
                <div className="form-group"><label>Monto</label><input type="number" step="0.01" min="0" placeholder="0.00" /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary">Registrar Movimiento</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
