'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  CheckCircle, 
  AlertCircle, 
  Search, 
  FileText, 
  Zap, 
  ArrowRight, 
  Check, 
  Settings, 
  X,
  CreditCard,
  User,
  Save,
  ChevronDown,
  ChevronUp,
  Loader2,
  Filter
} from 'lucide-react';

interface XMLDoc {
  id: string;
  uuid: string;
  emisorName: string;
  emisorRfc: string;
  receptorName: string;
  receptorRfc: string;
  date: string;
  total: number;
  subtotal: number;
  tax: number;
  status: string;
  type: string;
}

interface ProposalEntry {
  accountId: string;
  accountName: string;
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
}

interface Proposal {
  xmlId: string;
  xml: {
    id: string;
    uuid: string;
    total: number;
    rfc: string;
    nombre: string;
    fecha: string;
  };
  ruleFound: boolean;
  proposals: ProposalEntry[];
  error?: string;
  isValid?: boolean;
}

interface Account {
  id: string;
  code: string;
  name: string;
}

export default function ContabilizadorElite() {
  const [xmls, setXmls] = useState<XMLDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [step, setStep] = useState<'SELECT' | 'PREVIEW' | 'APPLYING'>('SELECT');
  const [companyId, setCompanyId] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'RECIBIDA' | 'EMITIDA'>('ALL');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mappingRfc, setMappingRfc] = useState<{rfc: string, name: string, type: string} | null>(null);
  const [mapAccountId, setMapAccountId] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('selectedCompanyId');
    if (saved) {
      setCompanyId(saved);
      fetchData(saved);
    }
  }, []);

  async function fetchData(cid: string) {
    try {
      setLoading(true);
      const [resXml, resAcc] = await Promise.all([
        apiFetch(`/xmls?companyId=${cid}&status=CARGADO`),
        apiFetch(`/cuentas?companyId=${cid}`)
      ]);
      
      if (resXml.ok) setXmls(await resXml.json());
      if (resAcc.ok) setAccounts(await resAcc.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const generateProposals = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    setStep('PREVIEW');
    try {
      const res = await apiFetch('/automation/propose-batch', {
        method: 'POST',
        body: JSON.stringify({ companyId, xmlIds: selectedIds })
      });
      if (res.ok) {
        const data = await res.json();
        const validated = data.map((p: Proposal) => {
          const sumDebit = p.proposals?.reduce((s, e) => s + (e.debit || 0), 0) || 0;
          const sumCredit = p.proposals?.reduce((s, e) => s + (e.credit || 0), 0) || 0;
          return { ...p, isValid: Math.abs(sumDebit - sumCredit) < 0.01 && p.proposals?.length > 0 && !p.proposals.some(e => !e.accountId) };
        });
        setProposals(validated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBatch = async () => {
    const readyItems = proposals.filter(p => p.isValid);
    if (readyItems.length === 0) return alert('No hay pólizas cuadradas y listas para aplicar.');

    setStep('APPLYING');
    setProcessingProgress(0);

    const applyItems = readyItems.map(p => ({
      xmlId: p.xml.id,
      journalData: {
        date: p.xml.fecha,
        concept: `PROVISIÓN: ${p.xml.nombre}`,
        reference: p.xml.uuid.substring(0, 8),
        type: 'DIARIO',
        entries: p.proposals
      }
    }));

    try {
      const res = await apiFetch('/automation/apply-batch', {
        method: 'POST',
        body: JSON.stringify({ companyId, items: applyItems })
      });

      if (res.ok) {
        setProcessingProgress(100);
        setTimeout(() => {
          alert(`¡Éxito! Se generaron ${applyItems.length} pólizas automáticamente.`);
          window.location.reload();
        }, 1500);
      }
    } catch (err) {
      alert('Error aplicando el lote.');
      setStep('PREVIEW');
    } finally {
        setProcessingProgress(0);
    }
  };

  const openMapping = (p: Proposal) => {
    setMappingRfc({
      rfc: p.xml.rfc,
      name: p.xml.nombre,
      type: proposals.find(pr => pr.xml.id === p.xml.id)?.xml.rfc === p.xml.rfc ? 'PROVEEDOR' : 'CLIENTE' // simplified logic
    });
    setMapAccountId('');
  };

  const saveMapping = async () => {
    if (!mappingRfc || !mapAccountId) return;
    try {
      const res = await apiFetch('/automation/rules', {
        method: 'POST',
        body: JSON.stringify({
          companyId,
          rfc: mappingRfc.rfc,
          name: mappingRfc.name,
          type: mappingRfc.type === 'PROVEEDOR' ? 'PROVEEDOR' : 'CLIENTE',
          accountId: mapAccountId
        })
      });
      if (res.ok) {
        setMappingRfc(null);
        generateProposals(); // Regenerate all to show the new rule applied
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredXmls = xmls.filter(x => {
    const name = x.type === 'RECIBIDA' ? x.emisorName : x.receptorName;
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || x.uuid.includes(search);
    const matchesType = filterType === 'ALL' || x.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white p-8">
      {/* HEADER ELITE */}
      <header className="max-w-7xl mx-auto mb-12 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/40">
              <Zap className="w-6 h-6 text-white text-blue-100" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              CONTABILIZADOR <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">FLASH 5.0</span>
            </h1>
          </div>
          <p className="text-gray-400">Automatización Inteligente de Pólizas Contables (XML to Journal)</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-[#141C2F]/80 p-1 rounded-xl border border-white/5">
            <button 
              onClick={() => setStep('SELECT')}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${step === 'SELECT' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              1. Selección
            </button>
            <button 
              disabled={selectedIds.length === 0}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${step === 'PREVIEW' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 cursor-not-allowed'}`}
            >
              2. Revisión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {step === 'SELECT' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* SEARCH & FILTERS */}
            <div className="flex gap-4 items-center mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Buscar por Proveedor o UUID..."
                  className="w-full bg-[#141C2F] border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex bg-[#141C2F] border border-white/10 rounded-2xl p-1">
                {(['ALL', 'RECIBIDA', 'EMITIDA'] as const).map(t => (
                  <button 
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${filterType === t ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                  >
                    {t === 'ALL' ? 'TODOS' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* XML GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredXmls.map(xml => {
                const isSelected = selectedIds.includes(xml.id);
                const isRecibida = xml.type === 'RECIBIDA';
                return (
                  <div 
                    key={xml.id}
                    onClick={() => setSelectedIds(prev => isSelected ? prev.filter(id => id !== xml.id) : [...prev, xml.id])}
                    className={`group relative p-6 rounded-3xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${isSelected ? 'bg-blue-600/10 border-blue-500/50 shadow-2xl shadow-blue-900/20' : 'bg-[#141C2F]/50 border-white/5 hover:border-white/20'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${isRecibida ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'}`}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-white/10'}`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>

                    <div className="space-y-1 mb-6">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-blue-400 transition-colors truncate">
                        {isRecibida ? xml.emisorName : xml.receptorName}
                      </h3>
                      <p className="font-mono text-xs text-blue-500 font-semibold">{isRecibida ? xml.emisorRfc : xml.receptorRfc}</p>
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Total CFDI</p>
                        <p className="text-xl font-black text-white">
                          {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(xml.total)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">{new Date(xml.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FLOATING ACTION BAR */}
            {selectedIds.length > 0 && (
              <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#1A253D]/90 backdrop-blur-2xl border border-white/10 px-8 py-6 rounded-full shadow-2xl flex items-center gap-12 animate-in slide-in-from-bottom duration-500 z-50">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 w-10 h-10 rounded-full flex items-center justify-center font-black">
                    {selectedIds.length}
                  </div>
                  <p className="font-bold text-blue-100">Facturas seleccionadas</p>
                </div>
                
                <div className="w-px h-8 bg-white/10"></div>

                <button 
                  onClick={generateProposals}
                  className="bg-white text-black px-10 py-3 rounded-full font-black flex items-center gap-2 hover:bg-blue-400 transition-all hover:scale-105 active:scale-95"
                >
                  GENERAR PROPUESTAS <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'PREVIEW' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500 pb-32">
            <div className="flex justify-between items-center bg-blue-600/5 p-8 rounded-3xl border border-blue-500/20 mb-8">
              <div>
                <h2 className="text-2xl font-black text-blue-100 flex items-center gap-3">
                  <Settings className="w-8 h-8 text-blue-400" /> REVISIÓN DE PÓLIZAS PROPUESTAS
                </h2>
                <p className="text-blue-300 opacity-60">Valida los asientos contables antes de aplicarlos masivamente</p>
              </div>
              <button 
                onClick={() => setStep('SELECT')}
                className="text-gray-400 hover:text-white font-bold flex items-center gap-2"
              >
                <X className="w-5 h-5" /> Cancelar y Volver
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <p className="font-bold text-gray-400 italic">Javier AI está calculando los asientos óptimos...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {proposals.map((p, idx) => (
                  <div 
                    key={p.xml.id}
                    className={`bg-[#141C2F] rounded-3xl border border-white/5 overflow-hidden transition-all ${!p.isValid ? 'border-red-500/30' : 'hover:border-blue-500/20'}`}
                  >
                    <div className="p-6 bg-white/5 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-black bg-white/10 px-3 py-1 rounded-lg">#{idx + 1}</div>
                        <div>
                          <h4 className="font-bold">{p.xml.nombre}</h4>
                          <p className="text-xs text-gray-500 font-mono">{p.xml.rfc} | {p.xml.uuid.substring(0, 15)}...</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        {!p.ruleFound && (
                          <button 
                            onClick={() => openMapping(p)}
                            className="bg-orange-500/10 text-orange-400 text-[10px] px-3 py-1 rounded-full border border-orange-500/20 font-bold flex items-center gap-2 hover:bg-orange-500/20"
                          >
                            <AlertCircle className="w-3 h-3" /> DEFINIR REGLA
                          </button>
                        )}
                        {p.isValid ? (
                          <div className="flex items-center gap-2 text-green-400 text-xs font-bold bg-green-500/10 px-3 py-1 rounded-full">
                            <CheckCircle className="w-4 h-4" /> CUADRADA
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-500/10 px-3 py-1 rounded-full">
                            <AlertCircle className="w-4 h-4" /> REQUIERE ATENCIÓN
                          </div>
                        )}
                        <div className="text-xl font-black">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(p.xml.total)}</div>
                      </div>
                    </div>

                    <div className="p-6">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-white/5">
                            <th className="pb-4">Código / Cuenta</th>
                            <th className="pb-4">Descripción de Partida</th>
                            <th className="pb-4 text-right">Cargos</th>
                            <th className="pb-4 text-right">Abonos</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {p.proposals?.map((ent, eidx) => (
                            <tr key={eidx} className="text-sm group">
                              <td className="py-3">
                                <div className="font-mono font-bold text-blue-400">{ent.accountCode || '----'}</div>
                                <div className="text-xs text-gray-400">{ent.accountName || '?? SIN CUENTA ??'}</div>
                              </td>
                              <td className="py-3 text-gray-300 italic">{ent.description}</td>
                              <td className="py-3 text-right font-bold text-white">
                                {ent.debit > 0 ? new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(ent.debit) : ''}
                              </td>
                              <td className="py-3 text-right font-bold text-white">
                                {ent.credit > 0 ? new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(ent.credit) : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="text-xs font-black bg-white/5">
                            <td colSpan={2} className="py-3 pl-4">TOTALES</td>
                            <td className="py-3 text-right pr-2">
                              {new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(p.proposals?.reduce((s, e) => s + (e.debit || 0), 0) || 0)}
                            </td>
                            <td className="py-3 text-right pr-2">
                              {new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2 }).format(p.proposals?.reduce((s, e) => s + (e.credit || 0), 0) || 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ACTION BAR PREVIEW */}
            <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#1A253D]/90 backdrop-blur-2xl border border-white/10 px-8 py-6 rounded-full shadow-2xl flex items-center gap-12 z-50">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Listas para aplicar</p>
                <p className="text-2xl font-black text-white">
                  {proposals.filter(p => p.isValid).length} <span className="text-gray-500 text-sm">/ {proposals.length}</span>
                </p>
              </div>
              
              <div className="w-px h-8 bg-white/10"></div>

              <button 
                onClick={handleApplyBatch}
                disabled={loading || proposals.filter(p => p.isValid).length === 0}
                className="bg-blue-600 text-white px-10 py-3 rounded-full font-black flex items-center gap-2 hover:bg-blue-400 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                CONTABILIZAR LOTE AHORA <Zap className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {step === 'APPLYING' && (
          <div className="fixed inset-0 bg-[#0A0F1D]/90 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center p-12">
            <Zap className="w-24 h-24 text-blue-500 animate-pulse mb-12 shadow-2xl shadow-blue-500/20" />
            <h2 className="text-5xl font-black mb-4">CONTABILIZANDO...</h2>
            <p className="text-gray-400 text-xl font-medium mb-12 text-center max-w-2xl">
              Aplicando inteligencia contable y generando pólizas en el Libro Mayor.
            </p>
            
            <div className="w-full max-w-md h-3 bg-white/5 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-blue-600 transition-all duration-500 shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL MAPPING */}
      {mappingRfc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6 text-white">
          <div className="bg-[#141C2F] border border-white/10 p-8 rounded-[40px] max-w-lg w-full shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
              <Settings className="w-8 h-8 text-orange-400" /> APRENDER REGLA
            </h3>
            
            <div className="bg-orange-500/10 p-6 rounded-3xl mb-8 border border-orange-500/20">
              <p className="text-xs text-orange-400 font-bold uppercase tracking-widest mb-1">Entidad</p>
              <p className="text-xl font-bold truncate">{mappingRfc.name}</p>
              <p className="font-mono text-sm text-gray-400">{mappingRfc.rfc}</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">Asignar a Cuenta de Gasto/Ingreso</label>
                <select 
                  className="w-full bg-[#1A253D] border border-white/10 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={mapAccountId}
                  onChange={(e) => setMapAccountId(e.target.value)}
                >
                  <option value="">Seleccionar cuenta del catálogo...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>[{acc.code}] {acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setMappingRfc(null)}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-500 hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveMapping}
                  disabled={!mapAccountId}
                  className="flex-[2] py-4 bg-blue-600 rounded-2xl font-black hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" /> GUARDAR REGLA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        body {
          background-color: #0A0F1D;
          overflow-x: hidden;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0A0F1D;
        }
        ::-webkit-scrollbar-thumb {
          background: #1A253D;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #2A354D;
        }
      `}</style>
    </div>
  );
}
