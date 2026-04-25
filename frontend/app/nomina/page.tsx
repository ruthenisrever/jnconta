'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, FileText, CheckCircle2, 
  AlertCircle, Play, Download, UserPlus, 
  Briefcase, Landmark, ShieldCheck, Zap,
  GanttChartSquare, Landmark as Bank, Wallet2
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function NominaDashboard() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [stats, setStats] = useState({ employees: 0, activePeriods: 0, pendingStamps: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const cid = localStorage.getItem('companyId');
      const [pRes, eRes] = await Promise.all([
        apiFetch(`/api/nomina/periods?companyId=${cid}`),
        apiFetch(`/api/nomina/employees?companyId=${cid}`)
      ]);
      const pData = await pRes.json();
      const eData = await eRes.json();
      
      setPeriods(pData);
      setStats({
        employees: eData.length,
        activePeriods: pData.filter((p: any) => p.status === 'CALCULADA').length,
        pendingStamps: pData.filter((p: any) => p.status === 'TIMBRADA').length
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostBatch = async () => {
    if (!confirm('¿Deseas contabilizar masivamente todos los periodos CALCULADOS? Se generará una póliza de diario agrupada.')) return;
    
    try {
      const cid = localStorage.getItem('companyId');
      // En una implementación real, estas cuentas se configurarían en parámetros del sistema.
      // Aquí usamos IDs genéricos que el backend deberá resolver o recibir.
      const res = await apiFetch(`/api/payroll/post-batch`, {
        method: 'POST',
        body: JSON.stringify({
          companyId: cid,
          startDate: '2024-01-01', // Rango amplio para demo
          endDate: '2026-12-31',
          expenseAccountId: '601-01-000', // Ejemplo
          bankAccountId: '102-01-000',
          taxAccountId: '205-01-000'
        })
      });
      
      if (res.ok) {
        alert('Cálculos contabilizados con éxito. Poliza generada.');
        loadDashboardData();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.message || 'No se pudo procesar la provisión.'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Nómina Digital CFDI 1.2</h1>
          <p>Gestión integral de personal, cálculos de ISR/IMSS y timbrado masivo.</p>
        </div>
        <div className="header-actions">
           <button className="btn btn-secondary flex items-center gap-2" onClick={() => window.location.href='/nomina/empleados'}>
              <UserPlus size={18} /> Nuevo Empleado
           </button>
           <button className="btn btn-primary flex items-center gap-2" onClick={() => window.location.href='/nomina/periodos'}>
              <Calendar size={18} /> Nuevo Periodo
           </button>
           <button 
              className="btn bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-2"
              onClick={handlePostBatch}
              title="Contabilizar masivamente periodos CALCULADOS a la contabilidad general"
           >
              <Zap size={18} /> Contabilizar Periodos
           </button>
        </div>
      </header>

      {/* METRICAS RAPIDAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="stat-card">
           <div className="stat-icon bg-primary-500/20 text-primary-400">
              <Users size={24} />
           </div>
           <div className="stat-info">
              <span className="stat-label">Plantilla Total</span>
              <span className="stat-value">{stats.employees}</span>
           </div>
        </div>
        <div className="stat-card">
           <div className="stat-icon bg-amber-500/20 text-amber-400">
              <Zap size={24} />
           </div>
           <div className="stat-info">
              <span className="stat-label">Periodos Activos</span>
              <span className="stat-value">{stats.activePeriods}</span>
           </div>
        </div>
        <div className="stat-card">
           <div className="stat-icon bg-teal-500/20 text-teal-400">
              <CheckCircle2 size={24} />
           </div>
           <div className="stat-info">
              <span className="stat-label">Timbrados Hoy</span>
              <span className="stat-value">{stats.pendingStamps}</span>
           </div>
        </div>
        <div className="stat-card">
           <div className="stat-icon bg-blue-500/20 text-blue-400">
              <ShieldCheck size={24} />
           </div>
           <div className="stat-info">
              <span className="stat-label">Estado SAT</span>
              <span className="stat-value text-sm">Conectado (PAC)</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LISTADO DE PERIODOS RECIENTES */}
        <div className="lg:col-span-2 space-y-6">
           <div className="panel border-surface-3">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold">Periodos en Proceso</h3>
                 <button className="btn btn-ghost btn-sm text-primary-400">Ver todos</button>
              </div>

              <div className="space-y-4">
                 {periods.length > 0 ? periods.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-surface-2/40 rounded-xl border border-surface-3 hover:border-primary-500/30 transition-all group">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-surface-3 rounded-lg text-muted group-hover:text-primary-400">
                             <Calendar size={20} />
                          </div>
                          <div>
                             <h4 className="font-bold text-sm">{p.name}</h4>
                             <div className="flex gap-3 text-[10px] text-muted">
                                <span>{new Date(p.startDate).toLocaleDateString()} al {new Date(p.endDate).toLocaleDateString()}</span>
                                <span className={`uppercase font-bold ${p.status === 'CALCULADA' ? 'text-amber-400' : 'text-teal-400'}`}>
                                   • {p.status}
                                </span>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          {p.status === 'BORRADOR' && (
                             <button className="btn btn-secondary btn-sm flex items-center gap-1">
                                <Play size={14} /> Calcular
                             </button>
                          )}
                          <button className="btn btn-ghost btn-sm p-2 hover:bg-primary-500/10">
                             <FileText size={16} />
                          </button>
                       </div>
                    </div>
                 )) : (
                    <div className="py-12 text-center text-muted italic border-2 border-dashed border-surface-3 rounded-2xl capitalize">
                       No hay periodos de nómina recientes.
                    </div>
                 )}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="panel border-surface-3 bg-surface-1/50">
                 <h4 className="font-bold mb-4 flex items-center gap-2"><Briefcase size={18} className="text-primary-400" /> Accesos Rápidos</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <button className="p-4 bg-surface-2 rounded-xl text-center hover:bg-primary-500/10 transition-colors">
                       <Users size={20} className="mx-auto mb-2" />
                       <span className="text-[10px] block font-bold">EMPLEADOS</span>
                    </button>
                    <button className="p-4 bg-surface-2 rounded-xl text-center hover:bg-primary-500/10 transition-colors">
                       <Download size={20} className="mx-auto mb-2" />
                       <span className="text-[10px] block font-bold">DISPERSION</span>
                    </button>
                 </div>
              </div>
              <div className="panel border-surface-3 bg-surface-1/50">
                 <h4 className="font-bold mb-4 flex items-center gap-2"><Landmark size={18} className="text-amber-400" /> Próximas Fechas</h4>
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-muted">Cierre Quincenal</span>
                       <span className="font-mono text-amber-300">15 Abr 2026</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-muted">Pago IMSS</span>
                       <span className="font-mono text-error">17 Abr 2026</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* PANEL LATERAL: ALERTAS / ASISTENTE */}
        <div className="space-y-6">
           <div className="panel bg-primary-500/5 border-primary-500/20 border-l-4 border-l-primary-500">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-primary-400">
                 <AlertCircle size={18} /> Tareas Pendientes
              </h3>
              <ul className="space-y-3 text-xs">
                 <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5" />
                    <span>Hay 3 empleados sin Cuenta CLABE registrada para dispersión.</span>
                 </li>
                 <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5" />
                    <span>Realizar el pre-cálculo de la 1RA QUINCENA ABRIL.</span>
                 </li>
              </ul>
           </div>

           <div className="panel border-surface-3">
              <h3 className="font-bold mb-4">Ayuda Fiscal Nómina</h3>
              <div className="p-4 bg-surface-2 rounded-xl text-[11px] leading-relaxed text-muted mb-4">
                 "El ISR de sueldos y salarios se basa en las tablas mensuales del Artículo 96 de la LISR. JnConta las mantiene actualizadas automáticamente."
              </div>
              <button className="btn btn-ghost w-full border border-surface-3">Instructivo SAT 1.2</button>
           </div>
        </div>

      </div>
    </div>
  );
}
