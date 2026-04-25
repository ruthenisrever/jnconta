'use client';
import React, { useState, useEffect } from 'react';
import {
  Upload, CheckCircle,
  RefreshCcw, AlertTriangle, ArrowRight,
  FileText, Link as LinkIcon, Banknote
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ReconciliacionPage() {
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [csvData, setCsvData] = useState('');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  async function fetchBankAccounts() {
    const cid = localStorage.getItem('companyId') || '';
    try {
      const r = await apiFetch(`/api/banks?companyId=${cid}`);
      const data = await r.json();
      setBankAccounts(Array.isArray(data) ? data : []);
      if (data.length > 0) setSelectedBankId(data[0].id);
    } catch (e) { console.error(e); }
  }

  async function handleImport() {
    if (!selectedBankId || !csvData) return;
    setImporting(true);
    try {
      const r = await apiFetch(`/api/reconciliation/import/${selectedBankId}`, {
        method: 'POST',
        body: JSON.stringify({ csv: csvData }),
      });
      if (r.ok) {
        alert('Estado de cuenta importado con éxito');
        setCsvData('');
        handleAutoMatch();
      }
    } catch (e) { console.error(e); }
    setImporting(false);
  }

  async function handleAutoMatch() {
    const cid = localStorage.getItem('companyId') || '';
    setLoading(true);
    try {
      const r = await apiFetch(`/api/reconciliation/auto-match?companyId=${cid}&bankAccountId=${selectedBankId}`);
      const data = await r.json();
      setMatches(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleLink(transactionId: string, journalId: string) {
    try {
      const r = await apiFetch(`/api/reconciliation/link`, {
        method: 'POST',
        body: JSON.stringify({ transactionId, journalId }),
      });
      if (r.ok) {
        setMatches(prev => prev.filter(m => m.transaction.id !== transactionId));
      }
    } catch (e) { console.error(e); }
  }

  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

  return (
    <div style={{ padding: '32px' }}>
      <header className="main-header" style={{ marginBottom: '32px' }}>
        <div className="header-title">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RefreshCcw size={28} style={{ color: 'var(--primary-400)' }} />
            Conciliación Bancaria
          </h1>
          <p>Sincroniza tus movimientos bancarios con el libro contable de forma automática.</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar: Import & Config */}
        <div className="col-span-4 space-y-6">
          <div className="panel">
            <div className="panel-header"><p className="panel-title">1. Selección de Cuenta</p></div>
            <div className="panel-body">
              <div className="form-group">
                <label>Banco / Cuenta</label>
                <select value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)} style={{ width: '100%', marginTop: '8px' }}>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header"><p className="panel-title">2. Importar Estado de Cuenta</p></div>
            <div className="panel-body">
              <p className="text-[10px] text-slate-400 mb-3 uppercase font-bold tracking-wider">Formato CSV (Fecha, Concepto, Importe)</p>
              <textarea 
                value={csvData} 
                onChange={e => setCsvData(e.target.value)}
                placeholder="2024-03-01,Pago Proveedor XYZ,-1500.00&#10;2024-03-02,Deposito Cliente ABC,25000.00"
                style={{ width: '100%', height: '150px', background: 'var(--surface-3)', border: 'none', borderRadius: '8px', padding: '12px', fontSize: '11px', color: 'var(--text-primary)', fontFamily: 'monospace' }}
              />
              <button 
                className="btn btn-primary w-full mt-4" 
                onClick={handleImport}
                disabled={importing || !csvData}
              >
                <Upload size={14} /> {importing ? 'Importando...' : 'Cargar Movimientos'}
              </button>
            </div>
          </div>
        </div>

        {/* Main: Matching Area */}
        <div className="col-span-8">
          <div className="panel" style={{ minHeight: '600px' }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                  <p className="panel-title">Movimientos Pendientes vs Pólizas</p>
                  <p className="panel-subtitle">Sugerencias encontradas por monto y fecha cercanía</p>
               </div>
               <button className="btn btn-secondary btn-sm" onClick={handleAutoMatch}>
                 <RefreshCcw size={14} /> Re-escanear
               </button>
            </div>
            <div className="panel-body">
              {loading ? (
                 <div className="flex justify-center p-20 text-slate-500">Buscando coincidencias...</div>
              ) : matches.length === 0 ? (
                 <div className="flex flex-col items-center justify-center p-20 text-slate-500 space-y-4">
                    <CheckCircle size={48} className="text-success opacity-20" />
                    <p>No hay movimientos pendientes de conciliar para esta cuenta.</p>
                 </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((m, idx) => (
                    <div key={idx} className="flex flex-col border border-slate-700/50 rounded-xl overflow-hidden bg-slate-900/30 hover:border-primary-500/50 transition-all">
                       <div className="flex items-center p-4">
                          {/* BANK SIDE */}
                          <div className="flex-1">
                             <div className="flex items-center gap-2 mb-1">
                                <Banknote size={14} className="text-primary-400" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Movimiento Bancario</span>
                             </div>
                             <p className="font-bold text-sm">{m.transaction.concept}</p>
                             <div className="flex gap-4 mt-1 text-xs text-slate-400">
                                <span>{new Date(m.transaction.date).toLocaleDateString()}</span>
                                <span className={m.transaction.amount > 0 ? 'text-success' : 'text-danger'}>{fmt(m.transaction.amount)}</span>
                             </div>
                          </div>

                          <div className="px-6 text-slate-700">
                             <ArrowRight size={24} />
                          </div>

                          {/* MATCH SIDE */}
                          <div className="flex-1">
                             {m.potentialMatches.length > 0 ? (
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <FileText size={14} className="text-teal-400" />
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Póliza Sugerida</span>
                                   </div>
                                   <p className="font-bold text-sm">{m.potentialMatches[0].journal.concept}</p>
                                   <div className="flex gap-4 mt-1 text-xs text-slate-400">
                                      <span>{new Date(m.potentialMatches[0].journal.date).toLocaleDateString()}</span>
                                      <span className="text-teal-400">{fmt(m.potentialMatches[0].debit || m.potentialMatches[0].credit)}</span>
                                   </div>
                                </div>
                             ) : (
                                <div className="flex items-center gap-2 text-warning italic text-xs">
                                   <AlertTriangle size={14} />
                                   No se encontró póliza automática
                                </div>
                             )}
                          </div>

                          {/* ACTION */}
                          <div className="pl-6">
                            {m.potentialMatches.length > 0 ? (
                               <button 
                                 className="btn btn-primary" 
                                 onClick={() => handleLink(m.transaction.id, m.potentialMatches[0].journal.id)}
                               >
                                 <LinkIcon size={14} /> Conciliar
                               </button>
                            ) : (
                               <button className="btn btn-ghost text-[10px] uppercase font-bold text-primary-400">
                                 Buscar Manual
                               </button>
                            )}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
