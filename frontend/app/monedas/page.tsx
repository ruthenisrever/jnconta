'use client';

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, 
  RefreshCw, Calculator, CheckCircle2, 
  AlertCircle, ArrowRight, Save, Landmark,
  Globe, Info
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function MonedasPage() {
  const [loading, setLoading] = useState(true);
  const [closingRate, setClosingRate] = useState('20.45'); // Tasa estimada
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [applying, setApplying] = useState(false);
  const [status, setStatus] = useState<any>(null);

  // Cuentas de resultado (Harcodeadas para demo, deberían venir de config)
  const [profitAccountId, setProfitAccountId] = useState('7.1.01.01'); // Utilidad Cambiaria
  const [lossAccountId, setLossAccountId] = useState('7.2.01.01');   // Pérdida Cambiaria

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch(`/api/accounts?companyId=${cid}`);
      const data = await res.json();
      setAccounts(data.filter((a: any) => a.level === 1)); // Solo cuentas de detalle
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch(`/api/currency/suggestions?companyId=${cid}&closingRate=${closingRate}`);
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
      setStatus(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!confirm('¿Deseas generar la póliza de ajuste de revaluación para todas estas cuentas?')) return;

    setApplying(true);
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch('/api/currency/apply', {
        method: 'POST',
        body: JSON.stringify({
          companyId: cid,
          closingRate: parseFloat(closingRate),
          date: new Date().toISOString(),
          profitAccountId,
          lossAccountId,
        }),
      });
      const data = await res.json();
      setStatus({ success: true, journal: data });
      setSuggestions([]);
    } catch (e) {
      alert('Error al aplicar revaluación');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Revaluación Multimoneda Pro</h1>
          <p>Maneja tus divisas y calcula la utilidad/pérdida cambiaria al cierre de mes.</p>
        </div>
        <div className="header-actions">
           <div className="bg-surface-2 p-2 rounded-xl border border-surface-3 flex items-center gap-3">
              <Globe size={20} className="text-primary-500" />
              <div>
                 <label className="block text-[10px] font-bold text-muted uppercase tracking-widest">TC de Cierre (DOF)</label>
                 <input 
                   type="number" 
                   className="bg-transparent border-none text-lg font-bold w-24 p-0 outline-none" 
                   value={closingRate}
                   onChange={(e) => setClosingRate(e.target.value)}
                   step="0.0001"
                 />
              </div>
              <button 
                className="btn btn-primary h-10 px-4" 
                onClick={handleCalculate}
                disabled={loading}
              >
                {loading ? <RefreshCw className="animate-spin" /> : 'Calcular Ajuste'}
              </button>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PANEL DE CONFIGURACIÓN */}
        <div className="panel lg:col-span-1 border-surface-3 bg-surface-1/50">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Calculator size={20} className="text-primary-400" /> Configuración de Cierre
          </h3>
          
          <div className="space-y-6">
             <div>
                <label className="block text-xs font-bold text-muted mb-2 uppercase">Cuenta de Utilidad Cambiaria</label>
                <select className="search-input w-full" value={profitAccountId} onChange={(e) => setProfitAccountId(e.target.value)}>
                   {accounts.map(a => <option key={a.id} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold text-muted mb-2 uppercase">Cuenta de Pérdida Cambiaria</label>
                <select className="search-input w-full" value={lossAccountId} onChange={(e) => setLossAccountId(e.target.value)}>
                   {accounts.map(a => <option key={a.id} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
             </div>
             
             <div className="pt-6 border-t border-surface-3">
                <div className="flex gap-3 text-xs text-muted mb-6">
                   <Info size={16} className="shrink-0 text-primary-500" />
                   <p>Este proceso generará una póliza de diario que ajusta el saldo en moneda nacional (MXN) de tus cuentas extranjeras para igualarlo al valor actual del mercado.</p>
                </div>
                
                <button 
                  className="btn btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  onClick={handleApply}
                  disabled={suggestions.length === 0 || applying}
                >
                  <Save size={20} /> {applying ? 'Procesando...' : 'Aplicar Revaluación'}
                </button>
             </div>
          </div>
        </div>

        {/* LISTADO DE RESULTADOS */}
        <div className="lg:col-span-2 space-y-6">
           {status?.success && (
              <div className="bg-success/10 border border-success/20 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4">
                 <div className="flex gap-4">
                    <CheckCircle2 size={32} className="text-success shrink-0" />
                    <div>
                       <h4 className="text-lg font-bold text-white mb-1">¡Revaluación Exitosa!</h4>
                       <p className="text-sm text-success-300">
                          Se ha generado la póliza de ajuste <span className="font-bold text-white">{status.journal.number}</span> por fluctuación cambiaria.
                       </p>
                    </div>
                 </div>
              </div>
           )}

           <div className="panel overflow-hidden p-0 border-surface-3">
             <div className="p-6 border-b border-surface-3 flex justify-between items-center bg-surface-2/30">
                <h3 className="font-bold">Resumen de Ajustes Sugeridos</h3>
                <span className="badge badge-secondary">{suggestions.length} Cuentas detectadas</span>
             </div>

             <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cuenta / Divisa</th>
                      <th className="text-right">Saldo USD</th>
                      <th className="text-right">Libros (MXN)</th>
                      <th className="text-right">Revaluado (MXN)</th>
                      <th className="text-right">Ajuste / Fluctuación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.length > 0 ? suggestions.map((s, idx) => (
                      <tr key={idx} className="hover:bg-surface-2/20 transition-colors">
                        <td>
                          <div className="font-bold text-sm">{s.accountCode}</div>
                          <div className="text-[10px] text-muted">{s.accountName}</div>
                          <span className="mt-1 badge badge-primary py-0 text-[9px]">{s.currency}</span>
                        </td>
                        <td className="text-right font-mono text-sm">${s.foreignBalance.toLocaleString()}</td>
                        <td className="text-right font-mono text-sm">${s.localBalance.toLocaleString()}</td>
                        <td className="text-right font-mono text-sm text-primary-300">${s.revaluedBalance.toLocaleString()}</td>
                        <td className="text-right">
                           <div className={`font-bold flex items-center justify-end gap-1 ${s.adjustment >= 0 ? 'text-success' : 'text-error'}`}>
                              {s.adjustment >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              ${Math.abs(s.adjustment).toLocaleString()}
                           </div>
                           <div className="text-[9px] uppercase tracking-widest text-muted">
                              {s.adjustment >= 0 ? 'Utilidad' : 'Pérdida'}
                           </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-muted italic">
                           Ingrese el tipo de cambio y presione "Calcular Ajuste" para ver las sugerencias de cierre mensual.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
             </div>
           </div>
        </div>

      </div>
    </div>
  );
}
