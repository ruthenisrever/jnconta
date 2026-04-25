'use client';

import React, { useState, useEffect } from 'react';
import {
  FileLock2, AlertTriangle, CheckCircle2,
  Settings, Save,
  History, Info, Zap, Calculator
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function CierreAnualPage() {
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedDestAccount, setSelectedDestAccount] = useState('');
  const [result, setResult] = useState<any>(null);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    setCompanyId(cid);
    fetchEquityAccounts(cid);
  }, []);

  const fetchEquityAccounts = async (cid: string) => {
    try {
      const res = await apiFetch(`/api/accounts?companyId=${cid}&nature=ACREEDORA`);
      const data = await res.json();
      setAccounts(data.filter((a: any) => a.code.startsWith('3')));
    } catch (e) {
      console.error('Error fetching accounts:', e);
    }
  };

  const handleCloseYear = async () => {
    if (!selectedDestAccount) {
      alert('Selecciona una cuenta de destino para el resultado del ejercicio.');
      return;
    }

    if (!confirm(`¿Estás seguro de cerrar el ejercicio ${year}? Esta acción generará pólizas de saldos y es un proceso fiscal crítico.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/api/fiscal/close-year?companyId=${companyId}`, {
        method: 'POST',
        body: JSON.stringify({ year, destinationAccountId: selectedDestAccount }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        alert(data.message || 'Error al cerrar el año.');
      }
    } catch (e: any) {
      alert('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <header className="page-header mb-8">
        <div className="page-header-left">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-warning-600/20 rounded-lg">
               <FileLock2 size={24} className="text-warning-400" />
             </div>
             <div>
               <h1>Cierre del Ejercicio</h1>
               <p className="text-muted">Proceso anual de traspaso de resultados y apertura de saldos.</p>
             </div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CONFIGURACIÓN DEL CIERRE */}
        <div className="panel glass p-8 relative overflow-hidden">
           <div className="absolute -top-12 -right-12 opacity-5">
              <Settings size={180} />
           </div>

           <div className="flex items-center gap-2 mb-6">
              <Zap size={18} className="text-primary-400" />
              <h3 className="text-lg">Parámetros de Cierre</h3>
           </div>
           
           <div className="space-y-6">
              <div className="form-group">
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-2 block">Ejercicio a Cerrar</label>
                <select className="search-input w-full" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
              </div>

              <div className="form-group">
                <label className="text-xs font-bold uppercase tracking-wider text-muted mb-2 block">Cuenta de Resultado (Capital)</label>
                <select className="search-input w-full" value={selectedDestAccount} onChange={(e) => setSelectedDestAccount(e.target.value)}>
                   <option value="">-- Seleccionar Cuenta --</option>
                   {accounts.map(acc => (
                     <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                   ))}
                </select>
                <p className="text-[10px] text-muted mt-2">
                  <Info size={10} className="inline mr-1" /> Generalmente "Utilidad o Pérdida del Ejercicio".
                </p>
              </div>

              <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl">
                 <div className="flex gap-3">
                    <AlertTriangle className="text-warning" size={20} />
                    <div className="text-xs">
                       <p className="font-bold text-warning mb-1">Avisos Preventivos:</p>
                       <ul className="list-disc ml-4 space-y-1 text-muted">
                          <li>Todas las pólizas del año deben estar en "Contabilizada".</li>
                          <li>Se generará un asiento de diario con fecha 31 de diciembre.</li>
                          <li>Este proceso no bloquea el año, pero requiere cuidado profesional.</li>
                       </ul>
                    </div>
                 </div>
              </div>

              <button 
                className="btn btn-primary w-full py-4 text-sm font-bold flex items-center justify-center gap-2"
                disabled={loading || !selectedDestAccount}
                onClick={handleCloseYear}
              >
                {loading ? <span className="spinner" /> : <Save size={18} />}
                {loading ? 'Procesando Cierre...' : 'EJECUTAR CIERRE ANUAL'}
              </button>
           </div>
        </div>

        {/* LOG DE RESULTADOS O HISTORIAL */}
        <div className="flex flex-col gap-6">
           {result ? (
             <div className="panel glass p-8 border-success/30 shadow-success/10 animate-in zoom-in-95">
                <div className="text-center mb-6">
                   <CheckCircle2 size={64} className="text-success m-auto mb-4" />
                   <h2 className="text-success">Cierre Exitoso</h2>
                   <p className="text-muted">Se ha generado la póliza de resultados para el ejercicio {year}.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-surface-2 rounded-xl text-center">
                      <div className="text-[10px] text-muted uppercase font-bold">Asientos Generados</div>
                      <div className="text-2xl font-bold">{result.entriesCount}</div>
                   </div>
                   <div className="p-4 bg-surface-2 rounded-xl text-center">
                      <div className="text-[10px] text-muted uppercase font-bold">Resultado Neto</div>
                      <div className={`text-2xl font-bold ${result.netResult > 0 ? 'text-success' : 'text-danger'}`}>
                        ${Math.abs(result.netResult).toLocaleString()}
                      </div>
                   </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                   <div className="flex justify-between text-xs p-3 bg-surface-3 rounded border border-border-subtle">
                      <span>Póliza ID:</span>
                      <span className="font-mono">{result.journal.number}</span>
                   </div>
                   <button className="btn btn-ghost w-full flex items-center justify-center gap-2 mt-2">
                     <History size={16} /> Ver Historial de Cierres
                   </button>
                </div>
             </div>
           ) : (
             <div className="panel glass p-8 flex flex-col items-center justify-center text-center h-full">
                <Calculator size={64} className="text-surface-3 mb-4" />
                <h4 className="text-muted opacity-50">Esperando ejecución de cierre</h4>
                <p className="text-xs text-muted max-w-[280px]">Configura los parámetros para iniciar el proceso de cálculo fiscal.</p>
             </div>
           )}
        </div>
      </div>

      <style jsx>{`
        .glass { background: rgba(16, 24, 39, 0.4); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .text-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .animate-in { animation: fadeIn 0.4s ease-out backwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
