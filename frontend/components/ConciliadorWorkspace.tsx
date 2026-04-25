'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertCircle, HelpCircle, 
  ArrowRightLeft, Plus, Zap, Filter, 
  Search, Download, Upload, Info, 
  ChevronRight, ArrowRight
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Match {
  transaction: any;
  potentialMatches: any[];
  autoAction: any;
}

export default function ConciliadorWorkspace({ companyId, bankAccountId }: { companyId: string, bankAccountId: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [bankAccountId]);

  async function fetchMatches() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reconciliation/auto-match?companyId=${companyId}&bankAccountId=${bankAccountId}`);
      const data = await res.json();
      setMatches(data);
      if (data.length > 0) setSelectedMatch(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleLink = async (trxId: string, journalId: string) => {
    try {
      const res = await apiFetch('/api/reconciliation/link', {
        method: 'POST',
        body: JSON.stringify({ transactionId: trxId, journalId })
      });
      if (res.ok) {
        setMatches(matches.filter(m => m.transaction.id !== trxId));
        setSelectedMatch(null);
      }
    } catch (e) {
      alert('Error al vincular');
    }
  };

  const handleCreateFromSuggestion = async (trxId: string, suggestedAccount: string) => {
    try {
      const res = await apiFetch('/api/reconciliation/create-journal-from-transaction', {
        method: 'POST',
        body: JSON.stringify({ transactionId: trxId, accountId: suggestedAccount })
      });
      if (res.ok) {
        alert('Póliza creada y conciliada automáticamente.');
        fetchMatches();
      }
    } catch (e) {
      alert('Error al crear póliza');
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-success bg-success/10 border-success/20';
    if (score >= 70) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-muted bg-surface-3 border-surface-4';
  };

  return (
    <div className="grid grid-cols-12 gap-0 h-[calc(100vh-180px)] overflow-hidden rounded-2xl border border-surface-3 bg-surface-1 shadow-2xl">
      
      {/* PANEL IZQUIERDO: MOVIMIENTOS BANCARIOS */}
      <div className="col-span-4 border-r border-surface-3 flex flex-col bg-surface-1/50">
        <div className="p-4 border-b border-surface-3 bg-surface-2/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted">Movimientos Banco</span>
          </div>
          <span className="badge badge-primary text-[10px]">{matches.length} pendientes</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-surface-3">
          {matches.map((m) => (
            <div 
              key={m.transaction.id}
              onClick={() => setSelectedMatch(m)}
              className={`p-4 cursor-pointer transition-all hover:bg-primary-500/5 ${selectedMatch?.transaction.id === m.transaction.id ? 'bg-primary-500/10 border-l-4 border-l-primary-500' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono text-muted">{new Date(m.transaction.date).toLocaleDateString()}</span>
                <span className={`text-sm font-bold ${m.transaction.amount > 0 ? 'text-success' : 'text-primary-300'}`}>
                  ${Math.abs(m.transaction.amount).toLocaleString()}
                </span>
              </div>
              <p className="text-xs font-medium line-clamp-2 mb-2">{m.transaction.concept}</p>
              
              <div className="flex items-center justify-between">
                <div className={`text-[9px] px-2 py-0.5 rounded-full border ${m.potentialMatches.length > 0 ? getConfidenceColor(m.potentialMatches[0].confidence) : 'bg-surface-3 text-muted border-surface-4'}`}>
                   {m.potentialMatches.length > 0 ? `${m.potentialMatches[0].confidence}% Match` : 'Sin Sugerencias'}
                </div>
                {m.autoAction && <Zap size={12} className="text-warning-400 animate-pulse" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PANEL DERECHO: DETALLE Y ACCIONES */}
      <div className="col-span-8 flex flex-col bg-black/20">
        {selectedMatch ? (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
            
            {/* Cabecera de Selección */}
            <div className="p-6 border-b border-surface-3 bg-surface-2/30">
               <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-primary-500/20 rounded-xl text-primary-400">
                    <ArrowRightLeft size={24} />
                 </div>
                 <div>
                    <h2 className="text-lg font-bold">Conciliar Movimiento</h2>
                    <p className="text-sm text-muted">Buscando coincidencias en la contabilidad general</p>
                 </div>
               </div>

               <div className="panel bg-surface-1 border-surface-3 p-4 flex justify-between items-center shadow-inner">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted block mb-1">Concepto en Estado de Cuenta</span>
                    <p className="text-sm font-mono">{selectedMatch.transaction.concept}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted block mb-1">Importe</span>
                    <p className={`text-xl font-black ${selectedMatch.transaction.amount > 0 ? 'text-success' : 'text-white'}`}>
                      ${Math.abs(selectedMatch.transaction.amount).toLocaleString()}
                    </p>
                  </div>
               </div>
            </div>

            {/* Listado de Sugerencias */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
               {selectedMatch.autoAction && (
                 <div className="panel border-warning/50 bg-warning/5 p-4 flex justify-between items-center border-dashed">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-warning/20 rounded-lg text-warning-400">
                        <Plus size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-warning-300">{selectedMatch.autoAction.label}</h4>
                        <p className="text-xs text-muted">Cuenta sugerida: {selectedMatch.autoAction.suggestedAccount}</p>
                      </div>
                   </div>
                   <button 
                     className="btn btn-warning btn-sm"
                     onClick={() => handleCreateFromSuggestion(selectedMatch.transaction.id, selectedMatch.autoAction.suggestedAccount)}
                   >
                     Crear Póliza
                   </button>
                 </div>
               )}

               <h3 className="text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                 <CheckCircle2 size={14} /> Sugerencias de Pólizas Capturadas
               </h3>

               {selectedMatch.potentialMatches.length > 0 ? (
                 selectedMatch.potentialMatches.map((pm: any) => (
                   <div key={pm.id} className="panel hover:border-primary-500/50 transition-all group p-4 border-surface-3 bg-surface-2/40">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="badge badge-secondary text-[10px]">{pm.journal.number}</span>
                            <span className="text-[10px] text-muted">{new Date(pm.journal.date).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-sm font-bold group-hover:text-primary-300 transition-colors">{pm.journal.concept}</h4>
                          <p className="text-xs text-muted mt-1 italic">"{pm.description}"</p>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-3">
                           <div className={`px-2 py-1 rounded text-[10px] font-bold border ${getConfidenceColor(pm.confidence)}`}>
                              {pm.reason}
                           </div>
                           <button 
                             onClick={() => handleLink(selectedMatch.transaction.id, pm.journal.id)}
                             className="btn btn-primary btn-sm flex items-center gap-2 group-hover:scale-105 transition-transform"
                           >
                             <CheckCircle2 size={14} /> Conciliar
                           </button>
                        </div>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="py-20 text-center text-muted border-2 border-dashed border-surface-3 rounded-2xl">
                    <HelpCircle size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">No se encontraron pólizas que coincidan con este importe.</p>
                    <p className="text-[10px] mt-1">Intenta ajustar el rango de días o crea una póliza nueva.</p>
                 </div>
               )}
            </div>

            {/* Footer de Acciones Masivas */}
            <div className="p-4 bg-surface-2/80 border-t border-surface-3 flex justify-between items-center backdrop-blur-md">
               <div className="flex items-center gap-2 text-[10px] text-muted font-bold uppercase tracking-tighter">
                  <Info size={14} className="text-primary-400" />
                  Presiona "Z" para conciliar el primer match sugerido
               </div>
               <div className="flex gap-3">
                  <button className="btn btn-ghost border border-surface-3 text-xs">Omitir</button>
                  <button className="btn btn-primary flex items-center gap-2">
                    <Zap size={14} /> Conciliación Relámpago
                  </button>
               </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted animate-pulse">
            <Search size={64} className="mb-4 opacity-5" />
            <p className="text-sm">Selecciona un movimiento de la izquierda para ver matches</p>
          </div>
        )}
      </div>

    </div>
  );
}
