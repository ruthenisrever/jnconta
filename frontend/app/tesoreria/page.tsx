'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Wallet, CalendarDays, Inbox } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function TesoreriaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixDate, setFixDate] = useState('');
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2' : '';

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/treasury/calendar?companyId=${companyId}`);
      if (res.ok) setEvents(await res.json());
    } catch {}
    setLoading(false);
  };

  const handleFixDate = async (event: any) => {
    if (!fixDate) return;
    const newDate = new Date(fixDate).toISOString();
    // Optimistic update — mueve el evento al calendario de inmediato
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, date: newDate } : e));
    setFixingId(null);
    setFixDate('');
    const isInvoice = event.id.startsWith('inv-');
    const recordId = event.id.replace('inv-', '').replace('bill-', '');
    const endpoint = isInvoice ? `/api/invoices/${recordId}` : `/api/bills/${recordId}`;
    try {
      await apiFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify({ dueDate: newDate }),
      });
    } catch {
      // Revertir si falla
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, date: null } : e));
    }
  };

  const scheduled = useMemo(() => events.filter(e => e.date !== null), [events]);
  const unscheduled = useMemo(() => events.filter(e => e.date === null), [events]);

  // Generamos un pseudo-calendario (mes actual)
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  return (
    <div className="main-content">
      <header className="page-header mb-8">
        <div className="page-header-left">
           <div className="flex items-center gap-3">
             <div className="p-2.5 bg-primary-600/20 rounded-xl relative">
               <Wallet size={24} className="text-primary-400" />
             </div>
             <div>
               <h1 className="text-2xl font-bold">Calendario de Tesorería (Cash Flow)</h1>
               <p className="text-muted text-sm mt-1">Monitorea y asigna fechas a tu flujo de efectivo.</p>
             </div>
           </div>
        </div>
      </header>

      {unscheduled.length > 0 && (
         <div className="bg-warning/10 border border-warning/30 p-4 rounded-xl mb-6 flex items-start gap-4 animate-in">
           <AlertTriangle size={24} className="text-warning shrink-0 mt-1" />
           <div>
              <h3 className="font-bold text-warning-300">¡Advertencia! Tienes {unscheduled.length} documentos sin fecha de vencimiento.</h3>
              <p className="text-xs text-warning-400 mt-1 mb-3">
                No es posible pronosticar tu liquidez si estas facturas o gastos no tienen un día mapeado en el calendario.
              </p>
              <div className="flex gap-2 flex-wrap">
                 {unscheduled.slice(0,5).map(un => (
                    <div key={un.id} className="bg-black/20 text-[10px] p-2 rounded flex items-center gap-2 border border-warning/10 flex-wrap">
                       <span className={un.type === 'IN' ? 'text-success' : 'text-danger'}>
                         {un.type === 'IN' ? 'Cobro:' : 'Pago:'} ${Math.abs(un.amount).toLocaleString()}
                       </span>
                       {fixingId === un.id ? (
                         <span className="flex items-center gap-1 ml-auto">
                           <input type="date" className="bg-surface-2 border border-warning/40 rounded px-1 py-0.5 text-[10px] text-white outline-none"
                             value={fixDate} onChange={e => setFixDate(e.target.value)} />
                           <button className="text-success font-bold hover:underline" onClick={() => handleFixDate(un)}>Guardar</button>
                           <button className="text-muted hover:text-white" onClick={() => setFixingId(null)}>✕</button>
                         </span>
                       ) : (
                         <button className="text-warning underline ml-2 hover:text-white" onClick={() => { setFixingId(un.id); setFixDate(''); }}>Fijar Fecha</button>
                       )}
                    </div>
                 ))}
                 {unscheduled.length > 5 && <div className="text-xs text-muted self-center">+{unscheduled.length - 5} más...</div>}
              </div>
           </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         
         <div className="lg:col-span-3 panel glass-border p-6 overflow-hidden">
            <h3 className="font-bold mb-6 flex items-center gap-2"><CalendarDays size={18} className="text-primary-400" /> Mes Actual: {today.toLocaleString('es-MX', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
            
            {loading ? <div className="p-12 text-center text-primary-500"><div className="spinner m-auto"/></div> : (
              <div className="grid grid-cols-7 gap-2">
                {['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'].map(d => (
                  <div key={d} className="text-center text-[10px] font-bold text-muted mb-2 tracking-widest">{d}</div>
                ))}
                
                {/* Blank days for offset (simplified, assume month starts on Tuesday for visual demo) */}
                {Array.from({length: new Date(today.getFullYear(), today.getMonth(), 1).getDay()}).map((_, i) => <div key={`b-${i}`} className="h-24 bg-surface-1/30 rounded-lg" />)}
                
                {days.map(day => {
                   // Match events to this day
                   const dayEvents = scheduled.filter(e => {
                     const ed = new Date(e.date);
                     return ed.getDate() === day && ed.getMonth() === today.getMonth();
                   });

                   const isToday = day === today.getDate();

                   return (
                     <div key={day} className={`h-24 rounded-lg border flex flex-col p-2 overflow-hidden transition-all hover:bg-surface-2 ${isToday ? 'border-primary-500 bg-primary-500/10' : 'border-white/5 bg-surface-1/50'}`}>
                        <div className={`text-xs font-bold text-right mb-1 ${isToday ? 'text-primary-400' : 'text-muted'}`}>{day}</div>
                        <div className="space-y-1 overflow-y-auto no-scrollbar">
                           {dayEvents.map(e => (
                             <div key={e.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${e.type === 'IN' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`} title={e.title}>
                               {e.type === 'IN' ? '+' : '-'}${Math.abs(e.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                             </div>
                           ))}
                        </div>
                     </div>
                   );
                })}
              </div>
            )}
         </div>

         <div className="space-y-6">
            <div className="panel glass-border p-6 bg-gradient-to-b from-surface-2 to-surface-1">
               <h3 className="font-bold mb-4 text-sm">Resumen de Liquidez Real</h3>
               <div className="space-y-4">
                  <div>
                     <div className="text-[10px] text-muted tracking-widest uppercase mb-1">Entradas (Cuentas por Cobrar)</div>
                     <div className="text-xl font-mono text-success font-bold">${scheduled.filter(e=>e.type==='IN').reduce((s,e)=>s+Math.abs(e.amount),0).toLocaleString()}</div>
                  </div>
                  <div>
                     <div className="text-[10px] text-muted tracking-widest uppercase mb-1">Salidas (Cuentas por Pagar)</div>
                     <div className="text-xl font-mono text-danger font-bold">-${scheduled.filter(e=>e.type==='OUT').reduce((s,e)=>s+Math.abs(e.amount),0).toLocaleString()}</div>
                  </div>
                  <div className="border-t border-white/10 pt-4 mt-2">
                     <div className="text-[10px] text-muted tracking-widest uppercase mb-1">Proyección Neta del Mes</div>
                     <div className={`text-2xl font-mono font-bold ${
                       (scheduled.filter(e=>e.type==='IN').reduce((s,e)=>s+Math.abs(e.amount),0) - scheduled.filter(e=>e.type==='OUT').reduce((s,e)=>s+Math.abs(e.amount),0)) >= 0 ? 'text-primary-400' : 'text-warning'
                     }`}>
                       ${(scheduled.filter(e=>e.type==='IN').reduce((s,e)=>s+Math.abs(e.amount),0) - scheduled.filter(e=>e.type==='OUT').reduce((s,e)=>s+Math.abs(e.amount),0)).toLocaleString()}
                     </div>
                  </div>
               </div>
            </div>

            <div className="panel glass-border p-6 flex flex-col items-center justify-center text-center">
               <div className="w-12 h-12 bg-surface-2 rounded-full flex items-center justify-center text-muted mb-3"><Inbox size={20} /></div>
               <h4 className="text-sm font-bold text-slate-300">Bandeja de Pendientes</h4>
               <p className="text-[10px] text-muted mt-1 mb-4">Tienes transacciones en tránsito que no han sido asignadas a una semana operativa.</p>
               <button className="btn btn-secondary btn-sm w-full">Resolver Pendientes</button>
            </div>
         </div>
      </div>

      <style jsx>{`
        .glass-border { border: 1px solid rgba(255,255,255,0.05); background: rgba(16,24,39,0.4); backdrop-filter: blur(12px); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
