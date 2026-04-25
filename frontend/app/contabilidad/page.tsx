'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, X, Check, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Account { id: string; code: string; name: string; type: string; nature: string; level: number; }
interface JournalEntry { accountId: string; description: string; debit: number; credit: number; account?: Account; }
interface Journal { id: string; number: string; type: string; date: string; concept: string; reference?: string; status: string; currency: string; entries: JournalEntry[]; }

const JOURNAL_TYPES = ['INGRESO', 'EGRESO', 'DIARIO', 'CHEQUE'];
const CURRENCIES = ['MXN', 'USD'];

export default function ContabilidadPage() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [form, setForm] = useState({ number: '', type: 'DIARIO', date: new Date().toISOString().split('T')[0], concept: '', reference: '', currency: 'MXN', exchangeRate: 1 });
  const [entries, setEntries] = useState<JournalEntry[]>([{ accountId: '', description: '', debit: 0, credit: 0 }, { accountId: '', description: '', debit: 0, credit: 0 }]);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const companyId = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
      const [j, a] = await Promise.all([
        apiFetch(`/api/journals?companyId=${companyId}`).then(r => r.json()),
        apiFetch(`/api/accounts?companyId=${companyId}`).then(r => r.json()),
      ]);
      setJournals(Array.isArray(j) ? j : demoJournals);
      setAccounts(Array.isArray(a) ? a : []);
    } catch { setJournals(demoJournals); }
    setLoading(false);
  }

  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  function addEntry() { setEntries([...entries, { accountId: '', description: '', debit: 0, credit: 0 }]); }
  function removeEntry(i: number) { setEntries(entries.filter((_, idx) => idx !== i)); }
  function updateEntry(i: number, field: string, value: any) {
    setEntries(entries.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  }

  const filtered = journals.filter(j =>
    (typeFilter === '' || j.type === typeFilter) &&
    (filter === '' || j.concept.toLowerCase().includes(filter.toLowerCase()) || j.number.includes(filter))
  );

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(n);

  function statusBadge(s: string) {
    const map: Record<string, string> = { APLICADA: 'badge-success', BORRADOR: 'badge-warning', CANCELADA: 'badge-danger' };
    return <span className={`badge ${map[s] || 'badge-muted'}`}>{s}</span>;
  }

  function typeBadge(t: string) {
    const map: Record<string, string> = { INGRESO: 'badge-success', EGRESO: 'badge-danger', DIARIO: 'badge-info', CHEQUE: 'badge-warning' };
    return <span className={`badge ${map[t] || 'badge-muted'}`}>{t}</span>;
  }

  return (
    <>
      <header className="main-header">
        <div className="header-title"><h1>Pólizas Contables</h1><p>Registro de movimientos contables</p></div>
        <div className="header-actions">
          <div className="search-wrapper"><Search size={15} /><input className="search-input" placeholder="Buscar póliza..." value={filter} onChange={e => setFilter(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={15} />Nueva Póliza</button>
        </div>
      </header>

      <main className="main-content">
        {/* FILTROS */}
        <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
          {['', ...JOURNAL_TYPES].map(t => (
            <button key={t} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTypeFilter(t)}>
              {t || 'Todas'}
            </button>
          ))}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div><p className="panel-title">Pólizas del Ejercicio</p><p className="panel-subtitle">{filtered.length} registros</p></div>
          </div>
          <div className="panel-body table-responsive">
            <table>
              <thead><tr><th>Núm.</th><th>Tipo</th><th>Fecha</th><th>Concepto</th><th>Referencia</th><th>Cargo</th><th>Abono</th><th>Moneda</th><th>Estado</th></tr></thead>
              <tbody>
                {loading ? <tr className="loading-row"><td colSpan={9}>Cargando...</td></tr>
                  : filtered.map(j => {
                    const debit = j.entries.reduce((s, e) => s + e.debit, 0);
                    const credit = j.entries.reduce((s, e) => s + e.credit, 0);
                    return (
                      <tr key={j.id}>
                        <td className="td-primary">{j.type.charAt(0)}-{j.number.padStart(4,'0')}</td>
                        <td>{typeBadge(j.type)}</td>
                        <td>{new Date(j.date).toLocaleDateString('es-MX')}</td>
                        <td style={{ color: 'var(--text-primary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.concept}</td>
                        <td>{j.reference || '—'}</td>
                        <td className="td-amount">{fmt(debit)}</td>
                        <td className="td-amount">{fmt(credit)}</td>
                        <td><span className="badge badge-primary">{j.currency}</span></td>
                        <td>{statusBadge(j.status)}</td>
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
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2><BookOpen size={18} style={{ display: 'inline', marginRight: 8 }} />Nueva Póliza</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group"><label>Número</label><input placeholder="0001" value={form.number} onChange={e => setForm({...form, number: e.target.value})} /></div>
                <div className="form-group"><label>Tipo</label><select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>{JOURNAL_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="form-group"><label>Fecha</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div className="form-group"><label>Moneda</label><select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>{CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="form-group full-width"><label>Concepto</label><input placeholder="Descripción del movimiento" value={form.concept} onChange={e => setForm({...form, concept: e.target.value})} /></div>
                <div className="form-group"><label>Referencia</label><input placeholder="Opcional" value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} /></div>
              </div>

              <h4 style={{ marginBottom: 12, fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Partidas</h4>
              <div className="table-responsive">
                <table>
                  <thead><tr><th>Cuenta</th><th>Descripción</th><th>Cargo</th><th>Abono</th><th></th></tr></thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={i}>
                        <td>
                          <select value={e.accountId} onChange={v => updateEntry(i, 'accountId', v.target.value)} style={{ minWidth: 180 }}>
                            <option value="">Seleccionar cuenta</option>
                            {accounts.filter(a => a.level === 3).map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                          </select>
                        </td>
                        <td><input placeholder="Descripción" value={e.description} onChange={v => updateEntry(i, 'description', v.target.value)} /></td>
                        <td><input type="number" min="0" step="0.01" value={e.debit || ''} onChange={v => updateEntry(i, 'debit', parseFloat(v.target.value) || 0)} style={{ width: 110 }} /></td>
                        <td><input type="number" min="0" step="0.01" value={e.credit || ''} onChange={v => updateEntry(i, 'credit', parseFloat(v.target.value) || 0)} style={{ width: 110 }} /></td>
                        <td><button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeEntry(i)} disabled={entries.length <= 2}><X size={13} /></button></td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 12 }}>TOTALES</td>
                      <td className="td-amount" style={{ fontWeight: 700, color: isBalanced ? 'var(--success)' : 'var(--danger)' }}>{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(totalDebit)}</td>
                      <td className="td-amount" style={{ fontWeight: 700, color: isBalanced ? 'var(--success)' : 'var(--danger)' }}>{new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(totalCredit)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button className="btn btn-ghost btn-sm mt-4" onClick={addEntry}><Plus size={13} /> Agregar partida</button>
              {!isBalanced && totalDebit > 0 && (
                <div className="alert alert-warning mt-4">
                  <AlertCircle size={16} /><span>La póliza no está cuadrada. Diferencia: {new Intl.NumberFormat('es-MX',{minimumFractionDigits:2}).format(Math.abs(totalDebit - totalCredit))}</span>
                </div>
              )}
              {isBalanced && <div className="alert alert-success mt-4"><Check size={16} /><span>Póliza cuadrada correctamente</span></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={!isBalanced}><Check size={15} />Guardar Póliza</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const demoJournals: Journal[] = [
  { id: '1', number: '1', type: 'INGRESO', date: '2024-03-05T00:00:00Z', concept: 'Cobro factura A-001 Comercializadora Azteca', reference: 'A-001', status: 'APLICADA', currency: 'MXN', entries: [{ accountId: '', description: 'Bancos', debit: 116000, credit: 0 }, { accountId: '', description: 'Clientes', debit: 0, credit: 100000 }, { accountId: '', description: 'IVA Trasladado', debit: 0, credit: 16000 }] },
  { id: '2', number: '1', type: 'EGRESO', date: '2024-03-05T00:00:00Z', concept: 'Pago nómina febrero 2024', reference: 'NOM-FEB', status: 'APLICADA', currency: 'MXN', entries: [{ accountId: '', description: 'Sueldos', debit: 85000, credit: 0 }, { accountId: '', description: 'Bancos', debit: 0, credit: 85000 }] },
  { id: '3', number: '1', type: 'DIARIO', date: '2024-03-31T00:00:00Z', concept: 'Depreciación mensual activos fijos marzo 2024', status: 'APLICADA', currency: 'MXN', entries: [{ accountId: '', description: 'Depreciaciones', debit: 12500, credit: 0 }, { accountId: '', description: 'Dep. Acumulada', debit: 0, credit: 12500 }] },
];
