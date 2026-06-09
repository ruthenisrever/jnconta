'use client';

import React, { useState } from 'react';
import { 
  FileArchive, Download, CheckCircle2, 
  AlertTriangle, FileCode, Archive, 
  Calendar, ShieldCheck, Box, Zap
} from 'lucide-react';
import { apiFetch, API_BASE } from '@/lib/api';

export default function SatExportsPage() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [type, setType] = useState('N'); // N=Normal, C=Complementaria, Z=Cierre
  const [solicitud, setSolicitud] = useState('AF'); // AF, FC, DE, CO

  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : '';

  const handleDownload = (endpoint: string) => {
    let url = `/api/sat-exports/${endpoint}?companyId=${companyId}&year=${year}&month=${month}`;
    if (endpoint === 'balanza') url += `&type=${type}`;
    if (endpoint === 'polizas') url += `&typeSolicitud=${solicitud}`;

    window.open(`${API_BASE}${url}`, '_blank');
  };

  const months = [
    { v: '1', n: 'Enero' }, { v: '2', n: 'Febrero' }, { v: '3', n: 'Marzo' },
    { v: '4', n: 'Abril' }, { v: '5', n: 'Mayo' }, { v: '6', n: 'Junio' },
    { v: '7', n: 'Julio' }, { v: '8', n: 'Agosto' }, { v: '9', n: 'Septiembre' },
    { v: '10', n: 'Octubre' }, { v: '11', n: 'Noviembre' }, { v: '12', n: 'Diciembre' },
    { v: '13', n: 'Cierre (Ajustes)' }
  ];

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Contabilidad Electrónica SAT 1.3</h1>
          <p>Genera y descarga los archivos oficiales para el Buzón Tributario.</p>
        </div>
        <div className="header-actions">
           <div className="bg-surface-2 p-1 rounded-lg border border-surface-3 flex items-center gap-2">
              <Calendar size={16} className="ml-2 text-muted" />
              <select className="bg-transparent border-none py-1 text-sm font-bold" value={year} onChange={(e) => setYear(e.target.value)}>
                 {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="bg-transparent border-none py-1 text-sm font-bold border-l border-surface-3 pl-2" value={month} onChange={(e) => setMonth(e.target.value)}>
                 {months.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
              </select>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CARD: CATÁLOGO */}
        <div className="panel group hover:border-primary-500/50 transition-all cursor-default">
          <div className="flex justify-between items-start mb-6">
             <div className="p-3 bg-primary-500/10 rounded-xl text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-all">
                <Box size={24} />
             </div>
             <span className="badge badge-success flex items-center gap-1">
                <ShieldCheck size={12} /> Validado SAT
             </span>
          </div>
          <h3 className="text-xl font-bold mb-2">Catálogo de Cuentas</h3>
          <p className="text-sm text-muted mb-6">Contiene la relación de cuentas con sus códigos agrupadores del SAT. Se envía una sola vez o cuando hay cambios.</p>
          
          <button 
            className="btn btn-secondary w-full flex items-center justify-center gap-2 py-3"
            onClick={() => handleDownload('catalogo-cuentas')}
          >
            <Download size={18} /> Descargar .ZIP (CT)
          </button>
        </div>

        {/* CARD: BALANZA */}
        <div className="panel group hover:border-teal-500/50 transition-all">
          <div className="flex justify-between items-start mb-6">
             <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-all">
                <Zap size={24} />
             </div>
             <div className="flex flex-col items-end gap-1">
                <select 
                  className="text-[10px] bg-surface-2 border border-surface-3 rounded px-1 font-bold uppercase tracking-tighter"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                   <option value="N">Normal</option>
                   <option value="C">Complementaria</option>
                </select>
             </div>
          </div>
          <h3 className="text-xl font-bold mb-2">Balanza de Comprobación</h3>
          <p className="text-sm text-muted mb-6">Saldos iniciales, movimientos y saldos finales de todas las cuentas. Obligación mensual rigurosa.</p>
          
          <button 
            className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 bg-teal-600 hover:bg-teal-500 text-white"
            onClick={() => handleDownload('balanza')}
          >
            <Download size={18} /> Descargar .ZIP (BN)
          </button>
        </div>

        {/* CARD: PÓLIZAS */}
        <div className="panel group hover:border-purple-500/50 transition-all">
          <div className="flex justify-between items-start mb-6">
             <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-all">
                <Archive size={24} />
             </div>
             <select 
                  className="text-[10px] bg-surface-2 border border-surface-3 rounded px-1 font-bold uppercase tracking-tighter"
                  value={solicitud}
                  onChange={(e) => setSolicitud(e.target.value)}
                >
                   <option value="AF">Acto Fiscaliz.</option>
                   <option value="FC">Fiscaliz. Compuls.</option>
                   <option value="DE">Devolución</option>
                   <option value="CO">Compensación</option>
                </select>
          </div>
          <h3 className="text-xl font-bold mb-2">Pólizas del Periodo</h3>
          <p className="text-sm text-muted mb-6">Detalle de cada asiento contable con sus folios fiscales asociados. Solo se envía por requerimiento.</p>
          
          <button 
            className="btn btn-secondary w-full flex items-center justify-center gap-2 py-3 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            onClick={() => handleDownload('polizas')}
          >
            <Download size={18} /> Descargar .ZIP (PL)
          </button>
        </div>
      </div>

      <div className="mt-8 p-6 bg-surface-2 rounded-2xl border border-surface-3 border-l-4 border-l-primary-500 shadow-xl">
         <div className="flex gap-4">
            <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400 h-fit">
               <AlertTriangle size={20} />
            </div>
            <div>
               <h4 className="font-bold mb-1">Recordatorio de Cumplimiento</h4>
               <p className="text-xs text-muted leading-relaxed">
                  Asegúrate de que todas tus cuentas contables de nivel mayor tengan asignado un **Código Agrupador del SAT** válido antes de generar estos archivos. 
                  JnConta valida automáticamente el esquema XML 1.3 para evitar rechazos en el portal.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
