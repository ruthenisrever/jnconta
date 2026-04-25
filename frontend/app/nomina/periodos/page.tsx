'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, CreditCard, Play, FileText, 
  CheckCircle2, RefreshCw, Plus, Calculator,
  ArrowRight, Landmark, User, Download,
  AlertTriangle, ShieldCheck, Code, CloudLightning
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import XmlViewer from '@/components/XmlViewer';

export default function PeriodosPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [stamping, setStamping] = useState(false);
  const [showXml, setShowXml] = useState<string | null>(null);

  // Formulario de Nuevo Periodo
  const [formData, setFormData] = useState({
    name: '1ra Quincena Abril 2026',
    startDate: '2026-04-01',
    endDate: '2026-04-15',
    paymentDate: '2026-04-15',
    type: 'O',
    companyId: ''
  });

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch(`/api/nomina/periods?companyId=${cid}`);
      const data = await res.json();
      setPeriods(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch('/api/nomina/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, companyId: cid })
      });
      if (res.ok) {
        setShowModal(false);
        loadPeriods();
      }
    } catch (err) {
      alert('Error al crear periodo');
    }
  };

  const handleCalculate = async (periodId: string) => {
    setCalculating(true);
    try {
      const res = await apiFetch(`/api/nomina/calculate/${periodId}`, { method: 'POST' });
      if (res.ok) {
        loadPeriods();
        loadReceipts(periodId);
      }
    } catch (e) {
      alert('Error en el cálculo');
    } finally {
      setCalculating(false);
    }
  };

  const handleStampPeriod = async (periodId: string) => {
    if (!confirm('¿Deseas autorizar y timbrar todos los recibos de este periodo? Esta acción generará folios fiscales (UUID) ante el SAT.')) return;
    
    setStamping(true);
    try {
      const cid = localStorage.getItem('companyId');
      for (const receipt of receipts) {
        if (receipt.uuid) continue;
        await apiFetch(`/api/stamping/payroll/${receipt.id}`, {
          method: 'POST',
          body: JSON.stringify({ companyId: cid })
        });
      }
      alert('Periodo timbrado exitosamente.');
      loadPeriods();
      loadReceipts(periodId);
    } catch (e) {
      alert('Error durante el proceso de timbrado masivo.');
    } finally {
      setStamping(false);
    }
  };

  const loadReceipts = async (periodId: string) => {
    try {
      const res = await apiFetch(`/api/nomina/receipts/${periodId}`);
      const data = await res.json();
      setReceipts(data);
      const period = periods.find(p => p.id === periodId);
      setSelectedPeriod(period);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Procesamiento de Nómina</h1>
          <p>Calcula impuestos, cuotas IMSS y genera los recibos del periodo.</p>
        </div>
        <div className="header-actions">
           <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Crear Periodo
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LISTADO DE PERIODOS */}
        <div className="lg:col-span-1 space-y-4">
           <div className="panel border-surface-3">
              <h3 className="font-bold mb-4 flex items-center gap-2"><Calendar size={18} className="text-primary-400" /> Ciclos Recientes</h3>
              <div className="space-y-3">
                 {periods.map((p, idx) => (
                    <button 
                      key={idx} 
                      className={`w-full text-left p-4 rounded-xl border transition-all ${selectedPeriod?.id === p.id ? 'bg-primary-500/10 border-primary-500/50' : 'bg-surface-2 border-surface-3 hover:border-primary-500/30'}`}
                      onClick={() => loadReceipts(p.id)}
                    >
                       <h4 className="font-bold text-sm mb-1">{p.name}</h4>
                       <div className="flex justify-between items-center text-[10px]">
                          <span className="text-muted">{new Date(p.startDate).toLocaleDateString()} al {new Date(p.endDate).toLocaleDateString()}</span>
                          <span className={`uppercase tracking-widest font-bold ${p.status === 'CALCULADA' ? 'text-amber-400' : 'text-teal-400'}`}>
                             {p.status}
                          </span>
                       </div>
                    </button>
                 ))}
              </div>
           </div>
           
           <div className="panel bg-surface-2/50 border-surface-3 border-dashed border-2 p-6 text-center text-xs text-muted">
              Consejo: "JnConta sincroniza automáticamente las tablas de ISR de 2026 para asegurar que tus cálculos sean idénticos a los del SAT."
           </div>
        </div>

        {/* DETALLE DEL PERIODO Y RECIBOS */}
        <div className="lg:col-span-2 space-y-6">
           {selectedPeriod ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                 <div className="panel border-surface-3 bg-surface-1/50 flex justify-between items-center">
                    <div>
                       <h2 className="text-xl font-bold">{selectedPeriod.name}</h2>
                       <p className="text-sm text-muted">Fecha de Pago: <span className="text-white font-mono">{new Date(selectedPeriod.paymentDate).toLocaleDateString()}</span></p>
                    </div>
                    <div className="flex gap-2">
                       {selectedPeriod.status === 'BORRADOR' && (
                          <button 
                            className="btn btn-primary bg-primary-600 hover:bg-primary-500 flex items-center gap-2"
                            onClick={() => handleCalculate(selectedPeriod.id)}
                            disabled={calculating}
                          >
                             {calculating ? <RefreshCw className="animate-spin" /> : <Calculator size={18} />} 
                             Calcular Nómina Completa
                          </button>
                       )}
                       {selectedPeriod.status === 'CALCULADA' && (
                          <button 
                            className="btn btn-secondary flex items-center gap-2 border-teal-500/50 text-teal-400 hover:bg-teal-500/10"
                            onClick={() => handleStampPeriod(selectedPeriod.id)}
                            disabled={stamping}
                          >
                             {stamping ? <RefreshCw className="animate-spin" /> : <ShieldCheck size={18} />} 
                             Autorizar y Timbrar Periodo
                          </button>
                       )}
                       {selectedPeriod.status === 'TIMBRADA' && (
                          <span className="flex items-center gap-2 text-teal-400 text-sm font-bold">
                             <CheckCircle2 size={18} /> PERIODO TIMBRADO
                          </span>
                       )}
                    </div>
                 </div>

                 <div className="panel p-0 border-surface-3">
                    <div className="p-4 border-b border-surface-3 bg-surface-2/30 flex justify-between items-center">
                       <h4 className="text-sm font-bold">Resumen de Cálculo por Empleado</h4>
                       <span className="badge badge-primary">{receipts.length} Trabajadores</span>
                    </div>
                    <div className="overflow-x-auto">
                       <table className="table">
                          <thead>
                             <tr>
                                <th>Empleado</th>
                                <th className="text-right">Percepciones</th>
                                <th className="text-right">Deducciones</th>
                                <th className="text-right">Neto a Pagar</th>
                                <th className="text-center">Estado</th>
                             </tr>
                          </thead>
                          <tbody>
                             {receipts.map((r, idx) => (
                                <tr key={idx} className="hover:bg-surface-2/20">
                                   <td>
                                      <div className="font-bold text-xs">{r.employee.firstName} {r.employee.lastName}</div>
                                      <div className="text-[10px] text-muted">RFC: {r.employee.rfc}</div>
                                   </td>
                                   <td className="text-right font-mono text-xs text-primary-400">${r.totalPerceptions.toLocaleString()}</td>
                                   <td className="text-right font-mono text-xs text-error/80">-${r.totalDeductions.toLocaleString()}</td>
                                   <td className="text-right font-mono text-sm font-bold text-teal-400">${r.netAmount.toLocaleString()}</td>
                                   <td className="text-center">
                                      <span className="badge badge-secondary py-0 text-[9px] uppercase">{r.status}</span>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                    {receipts.length === 0 && (
                       <div className="py-20 text-center text-muted italic">
                          Presione "Calcular Nómina" para generar los recibos de este periodo.
                       </div>
                    )}
                 </div>
              </div>
           ) : (
              <div className="panel border-dashed border-2 border-surface-3 py-32 flex flex-col items-center justify-center text-muted">
                 <Calendar size={48} className="mb-4 opacity-20" />
                 <p>Selecciona un periodo a la izquierda para gestionar el cálculo y timbrado.</p>
              </div>
           )}
        </div>

      </div>

      {/* MODAL: NUEVO PERIODO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-lg border-surface-3 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-surface-3">
                <h2 className="text-xl font-bold flex items-center gap-3">
                   <Plus className="text-primary-500" /> Nuevo Periodo de Pago
                </h2>
                <button className="text-muted hover:text-white" onClick={() => setShowModal(false)}>✕</button>
             </div>

             <form onSubmit={handleCreatePeriod} className="space-y-6">
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Nombre del Periodo</label>
                   <input type="text" className="search-input w-full" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Ej. 1RA QUINCENA ABRIL 2026" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Fecha Inicio</label>
                      <input type="date" className="search-input w-full" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} required />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Fecha Fin</label>
                      <input type="date" className="search-input w-full" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} required />
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Fecha de Pago</label>
                   <input type="date" className="search-input w-full" value={formData.paymentDate} onChange={(e) => setFormData({...formData, paymentDate: e.target.value})} required />
                </div>

                <div className="flex gap-4 justify-end pt-6 border-t border-surface-3">
                   <button type="button" className="btn btn-ghost px-8" onClick={() => setShowModal(false)}>Cancelar</button>
                   <button type="submit" className="btn btn-primary px-8">Crear Ciclo</button>
                </div>
             </form>
          </div>
        </div>
      )}
      {showXml && (
        <XmlViewer xml={showXml} onClose={() => setShowXml(null)} title="Visor de Recibo de Nómina (XML)" />
      )}
    </div>
  );
}
