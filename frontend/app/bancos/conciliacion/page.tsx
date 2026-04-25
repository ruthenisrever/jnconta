'use client';

import React, { useState, useEffect } from 'react';
import { Landmark, Download, Plus, RefreshCw, Database, Zap, Info } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function ConciliacionPage() {
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importBankType, setImportBankType] = useState('GENERIC');
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch(`/api/banks?companyId=${cid}`);
      const banks = await res.json();
      setBankAccounts(banks);
      if (banks.length > 0) {
        handleSelectBank(banks[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBank = async (bank: any) => {
    setSelectedBank(bank);
    setLoading(true);
    try {
      const cid = localStorage.getItem('companyId');
      // 1. Obtener sugerencias de Match
      const matchRes = await apiFetch(`/api/reconciliation/auto-match?companyId=${cid}&bankAccountId=${bank.id}`);
      const matchData = await matchRes.json();
      setMatches(matchData);

      // 2. Obtener pólizas pendientes de conciliar para esta cuenta contable
      if (bank.accountId) {
        const entryRes = await apiFetch(`/api/reconciliation/entries-to-reconcile?companyId=${cid}&accountId=${bank.accountId}`);
        const entryData = await entryRes.json();
        setLedgerEntries(entryData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (transactionId: string, journalId: string) => {
    try {
      await apiFetch('/api/reconciliation/link', {
        method: 'POST',
        body: JSON.stringify({ transactionId, journalId }),
      });
      handleSelectBank(selectedBank);
    } catch (e) {
      alert('Error al conciliar');
    }
  };

  const handleImport = async () => {
    if (!importCsv.trim()) { alert('Pega el contenido CSV del estado de cuenta.'); return; }
    if (!selectedBank) { alert('Selecciona una cuenta bancaria primero.'); return; }
    setImportLoading(true);
    try {
      const res = await apiFetch(`/api/reconciliation/import/${selectedBank.id}`, {
        method: 'POST',
        body: JSON.stringify({ csv: importCsv, bankType: importBankType }),
      });
      const data = await res.json();
      if (res.ok) {
        setImporting(false);
        setImportCsv('');
        setImportBankType('GENERIC');
        alert(`✅ ${data.count} movimientos importados. Ejecutando conciliación automática...`);
        handleSelectBank(selectedBank);
      } else {
        alert(data.message || 'Error al procesar el archivo.');
      }
    } catch (e) {
      alert('Error de conexión al importar.');
    } finally {
      setImportLoading(false);
    }
  };

  if (loading && bankAccounts.length === 0) return <div className="p-10 text-center"><span className="spinner" /></div>;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Conciliación Bancaria 360°</h1>
          <p>Sincroniza tus estados de cuenta con la contabilidad mediante IA.</p>
        </div>
        <div className="header-actions">
           <select 
             className="search-input py-2 bg-surface-2" 
             value={selectedBank?.id} 
             onChange={(e) => handleSelectBank(bankAccounts.find(b => b.id === e.target.value))}
           >
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.name} - {b.accountNumber}</option>
              ))}
           </select>
           <button className="btn btn-primary flex items-center gap-2" onClick={() => setImporting(true)}>
              <Download size={16} /> Importar Estado de Cuenta
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-220px)]">
        {/* LADO IZQUIERDO: BANCO */}
        <div className="panel flex flex-col overflow-hidden border-teal-500/20">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="font-bold flex items-center gap-2 text-teal-400">
              <Landmark size={20} /> Movimientos Bancarios
            </h3>
            <span className="badge badge-secondary">{matches.length} Pendientes</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
            {matches.map((item, idx) => (
              <div key={idx} className="bg-surface-2 p-4 rounded-xl border border-surface-3 hover:border-teal-500/30 transition-all group">
                <div className="flex justify-between items-start mb-2">
                   <div>
                      <div className="text-[10px] font-bold text-muted uppercase tracking-wider">{new Date(item.transaction.date).toLocaleDateString()}</div>
                      <div className="text-sm font-bold group-hover:text-teal-300 transition-colors">{item.transaction.concept}</div>
                   </div>
                   <div className={`text-sm font-bold ${item.transaction.amount > 0 ? 'text-success' : 'text-white'}`}>
                      ${item.transaction.amount.toLocaleString()}
                   </div>
                </div>

                {/* SUGERENCIAS DE CONCILIACIÓN */}
                <div className="mt-4 border-t border-surface-3 pt-3">
                   {item.potentialMatches.length > 0 || item.suggestedJournals?.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-[9px] font-bold text-teal-500 flex items-center gap-1">
                          <Zap size={10} fill="currentColor" /> SUGERENCIAS JNCONTA
                        </div>
                        {item.potentialMatches.map((m: any, midx: number) => (
                          <div key={midx} className="flex justify-between items-center bg-teal-500/10 p-2 rounded-lg border border-teal-500/20">
                             <div className="text-[11px]">
                                <span className="font-bold">{m.journal.number}</span> — {m.journal.concept}
                             </div>
                             <button 
                               className="btn btn-primary p-1 rounded-md text-[10px]"
                               onClick={() => handleLink(item.transaction.id, m.journal.id)}
                             >
                               Conciliar
                             </button>
                          </div>
                        ))}
                      </div>
                   ) : (
                      <div className="flex justify-between items-center italic text-muted text-[11px]">
                        <span>Sin póliza detectada</span>
                        <button className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-bold">
                           <Plus size={12} /> Generar Póliza
                        </button>
                      </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LADO DERECHO: CONTABILIDAD */}
        <div className="panel flex flex-col overflow-hidden border-primary-500/20">
           <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="font-bold flex items-center gap-2 text-primary-400">
              <Database size={20} /> Auxiliar Contable (Libros)
            </h3>
            <span className="badge badge-primary">{ledgerEntries.length} Disponibles</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
             {ledgerEntries.length > 0 ? ledgerEntries.map((entry, idx) => (
                <div key={idx} className="bg-surface-2 p-3 rounded-lg border border-surface-3 border-l-4 border-l-primary-500">
                   <div className="flex justify-between items-center">
                      <div>
                         <div className="text-[10px] font-bold text-muted">{new Date(entry.journal.date).toLocaleDateString()}</div>
                         <div className="text-xs font-medium">{entry.journal.concept}</div>
                         <div className="text-[9px] text-primary-400 font-bold">{entry.journal.number}</div>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-bold text-white">
                            ${(entry.debit || entry.credit).toLocaleString()}
                         </div>
                         <div className="text-[9px] uppercase tracking-widest text-muted">
                            {entry.debit > 0 ? 'CARGO' : 'ABONO'}
                         </div>
                      </div>
                   </div>
                </div>
             )) : (
                <div className="h-full flex flex-col items-center justify-center text-muted opacity-50 italic text-sm">
                   <RefreshCw size={48} className="mb-4 opacity-20" />
                   Todas las pólizas de este período <br/> están conciliadas.
                </div>
             )}
          </div>

          <div className="mt-4 p-4 bg-primary-600/10 rounded-xl border border-primary-600/20 flex gap-3 text-xs text-primary-300">
             <Info size={16} className="shrink-0" />
             <p>Arrastra un movimiento del banco sobre una póliza contable para conciliarlos manualmente si el sistema no los identificó.</p>
          </div>
        </div>
      </div>

      {importing && (
         <div className="modal-overlay">
            <div className="panel w-full max-w-md shadow-2xl animate-in zoom-in">
               <h2 className="mb-4">Importar Estado de Cuenta</h2>
               <p className="text-sm text-muted mb-6">Selecciona el formato de tu banco y pega el contenido CSV para procesar.</p>
               
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold uppercase mb-2">Banco</label>
                     <select
                       className="search-input w-full bg-surface-2"
                       value={importBankType}
                       onChange={e => setImportBankType(e.target.value)}
                     >
                        <option value="GENERIC">Genérico (Fecha, Concepto, Importe)</option>
                        <option value="BBVA">BBVA México</option>
                        <option value="SANTANDER">Santander</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-xs font-bold uppercase mb-2">Contenido CSV</label>
                     <textarea
                       className="search-input w-full bg-surface-2 h-48 font-mono text-[10px]"
                       placeholder="Fecha, Concepto, Importe..."
                       value={importCsv}
                       onChange={e => setImportCsv(e.target.value)}
                     />
                  </div>
               </div>

               <div className="flex justify-end gap-3 mt-8">
                  <button className="btn btn-secondary" onClick={() => setImporting(false)}>Cancelar</button>
                  <button className="btn btn-primary" onClick={handleImport} disabled={importLoading}>
                    {importLoading ? 'Procesando...' : 'Procesar Importación'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
