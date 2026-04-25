'use client';
import React, { useState, useEffect } from 'react';
import { Target, TrendingDown, TrendingUp, AlertTriangle, Search, Lock, Edit2, LayoutDashboard } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function BudgetsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [amountInput, setAmountInput] = useState('');
  const [accountsLookup, setAccountsLookup] = useState<any[]>([]); // To select account for new budget
 
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2' : '';

  useEffect(() => { fetchComparison(); fetchExpenseAccounts(); }, [year, month]);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/budgets/comparison?companyId=${companyId}&year=${year}&month=${month}`);
      if (res.ok) setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const fetchExpenseAccounts = async () => {
    try {
      // 5: Costs, 6: Expenses
      const res = await apiFetch(`/api/accounts?companyId=${companyId}&nature=DEUDORA`);
      if (res.ok) {
         const accs = await res.json();
         setAccountsLookup(accs.filter((a:any) => a.code.startsWith('5') || a.code.startsWith('6')));
      }
    } catch {}
  };

  const handleSaveBudget = async () => {
    try {
       await apiFetch('/api/budgets', {
         method: 'POST',
         body: JSON.stringify({ companyId, accountId: editingBudget.accountId, year: parseInt(year), month: parseInt(month), amount: parseFloat(amountInput) })
       });
       setEditingBudget(null);
       fetchComparison();
    } catch {}
  };

  return (
    <div className="main-content">
      <header className="page-header mb-8">
        <div className="page-header-left">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-success-600/20 rounded-xl relative">
               <Target size={24} className="text-success" />
             </div>
             <div>
               <h1 className="text-2xl font-bold">Control de Presupuestos Operativos</h1>
               <p className="text-muted text-sm mt-1">Compara el Gasto Autorizado Real en directo.</p>
             </div>
           </div>
        </div>
        <div className="header-actions flex gap-2">
           <select className="search-input w-24" value={year} onChange={e => setYear(e.target.value)}>
             <option value="2023">2023</option><option value="2024">2024</option><option value="2025">2025</option>
           </select>
           <select className="search-input w-36" value={month} onChange={e => setMonth(e.target.value)}>
             {[...Array(12)].map((_, i) => (
               <option key={i+1} value={(i+1).toString().padStart(2, '0')}>{new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(2024, i)).toUpperCase()}</option>
             ))}
           </select>
        </div>
      </header>

      {/* QUICK ADD NEW BUDGET OR OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
         <div className="lg:col-span-2 panel glass-border p-6 relative overflow-hidden flex flex-col justify-center">
            <h3 className="text-lg font-bold mb-2">Salud Presupuestal Global del Mes</h3>
            <div className="flex items-end gap-6 mt-4">
               <div>
                  <div className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1">Tope Autorizado</div>
                  <div className="text-3xl font-bold font-mono text-slate-300">
                    ${data.reduce((s, d) => s + d.budgeted, 0).toLocaleString()}
                  </div>
               </div>
               <div>
                  <div className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1">Gasto Ejecutado</div>
                  <div className="text-3xl font-bold font-mono text-warning">
                    ${data.reduce((s, d) => s + d.actual, 0).toLocaleString()}
                  </div>
               </div>
            </div>
            
            <div className="mt-8 relative w-full h-2 bg-surface-3 rounded-full overflow-hidden">
               {data.length > 0 && (
                 <div 
                   className="absolute top-0 left-0 h-full bg-gradient-to-r from-success to-primary-500 rounded-full" 
                   style={{ width: `${Math.min(100, (data.reduce((s,d)=>s+d.actual,0) / data.reduce((s,d)=>s+d.budgeted,0)) * 100)}%` }} 
                 />
               )}
            </div>
         </div>
         
         <div className="panel p-6 glass-border flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mb-4 text-primary-400">
               <Edit2 size={20} />
            </div>
            <h4 className="font-bold mb-2">Asignar Nuevo Presupuesto</h4>
            <p className="text-xs text-muted mb-4">Abre una partida para proteger tus deducciones y evitar sobregiros.</p>
            <button className="btn btn-secondary border border-primary-500/30 text-primary-300 btn-sm" onClick={() => { setEditingBudget({ isNew: true }); setAmountInput(''); }}>
               Aperturar Partida
            </button>
         </div>
      </div>

      <div className="panel overflow-hidden glass-border p-0">
         <div className="p-4 border-b border-border-subtle bg-surface-2 flex items-center justify-between">
            <h3 className="font-bold text-sm">Desglose de Partidas ({month}/{year})</h3>
            <span className="text-[10px] text-muted flex items-center gap-1"><Lock size={12} /> Bloqueo Contable Inactivo</span>
         </div>
         {loading ? <div className="p-12 text-center text-primary-500"><Search className="animate-spin m-auto" /></div> : (
           <table className="report-table">
              <thead>
                 <tr>
                    <th>Código / Cuenta Contable</th>
                    <th className="text-right">Presupuesto ($)</th>
                    <th className="text-right">Ejecutado ($)</th>
                    <th className="text-right">Desviación</th>
                    <th>Estado de Consumo</th>
                    <th className="text-right">Ajuste</th>
                 </tr>
              </thead>
              <tbody>
                 {data.length === 0 ? (
                   <tr><td colSpan={6} className="text-center p-8 text-muted">Aún no hay presupuestos cargados para este mes.</td></tr>
                 ) : data.map(item => {
                    const overBudget = item.percentUsed > 100;
                    const danger = item.percentUsed > 85;
                    return (
                      <tr key={item.accountId} className="hover:bg-surface-2/50 transition-colors">
                         <td>
                            <div className="font-mono text-xs text-primary-300 font-bold mb-0.5">{item.accountCode}</div>
                            <div className="font-bold">{item.accountName}</div>
                         </td>
                         <td className="text-right font-mono text-muted">${item.budgeted.toLocaleString()}</td>
                         <td className="text-right font-mono font-bold">${item.actual.toLocaleString()}</td>
                         <td className="text-right">
                           <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${overBudget ? 'text-danger bg-danger/20 px-1.5 rounded' : 'text-success'}`}>
                             {overBudget ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                             ${Math.abs(item.variance).toLocaleString()}
                           </span>
                         </td>
                         <td className="w-48">
                            <div className="flex items-center gap-2">
                               <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
                                  <div className={`h-full ${overBudget ? 'bg-danger' : danger ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min(100, item.percentUsed)}%` }} />
                               </div>
                               <span className={`text-[10px] font-bold ${overBudget ? 'text-danger' : 'text-muted'}`}>{Math.round(item.percentUsed)}%</span>
                            </div>
                         </td>
                         <td className="text-right">
                            <button className="text-muted hover:text-white p-1" onClick={() => { setEditingBudget(item); setAmountInput(item.budgeted.toString()); }}>
                               <Edit2 size={14} />
                            </button>
                         </td>
                      </tr>
                    );
                 })}
              </tbody>
           </table>
         )}
      </div>

      {/* EDIT/NEW BUDGET MODAL */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
           <div className="bg-surface-1 border border-border-strong rounded-2xl w-[400px] p-6 shadow-2xl">
              <h2 className="text-lg font-bold mb-4">{editingBudget.isNew ? 'Nueva Apertura Presupuestal' : 'Reasignar Presupuesto'}</h2>
              
              {editingBudget.isNew && (
                <div className="mb-4">
                  <label className="text-[10px] uppercase font-bold text-muted block mb-1">Cuenta de Mayor/Detalle</label>
                  <select className="search-input w-full" onChange={e => setEditingBudget({...editingBudget, accountId: e.target.value})}>
                     <option value="">Selecciona Cuenta</option>
                     {accountsLookup.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
              )}
              
              {!editingBudget.isNew && (
                 <div className="mb-4 p-3 bg-surface-2 rounded-lg border border-border-subtle">
                    <div className="text-[10px] text-muted uppercase">Editando asignación de:</div>
                    <div className="font-bold font-mono text-primary-300">{editingBudget.accountCode} - {editingBudget.accountName}</div>
                 </div>
              )}

              <div className="mb-6">
                 <label className="text-[10px] uppercase font-bold text-muted block mb-1">Techo Financiero ($ Mensual)</label>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold">$</span>
                    <input type="number" className="search-input w-full pl-8 font-mono text-lg" value={amountInput} onChange={e => setAmountInput(e.target.value)} placeholder="0.00" />
                 </div>
              </div>

              <div className="flex justify-end gap-2">
                 <button className="btn btn-secondary" onClick={() => setEditingBudget(null)}>Cancelar</button>
                 <button className="btn btn-primary shadow-glow" onClick={handleSaveBudget} disabled={!amountInput || (editingBudget.isNew && !editingBudget.accountId)}>Inyectar Recurso</button>
              </div>
           </div>
        </div>
      )}

      <style jsx>{`
        .glass-border { border: 1px solid rgba(255,255,255,0.05); background: rgba(16,24,39,0.35); backdrop-filter: blur(12px); }
        .shadow-glow { box-shadow: 0 0 20px rgba(34,211,238,0.2); }
      `}</style>
    </div>
  );
}
