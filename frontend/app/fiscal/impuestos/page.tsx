'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  FileText, 
  DollarSign, 
  ChevronRight, 
  Calendar,
  AlertCircle,
  PieChart,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function TaxSimulatorPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchSimulation();
  }, [month, year]);

  const fetchSimulation = async () => {
    setLoading(true);
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch(`/api/reports/tax-simulator?companyId=${cid}&month=${month}&year=${year}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) return <div className="p-8 text-muted animate-pulse font-black tracking-widest uppercase">Simulando Impuestos...</div>;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="flex items-center gap-3">
             <Calculator className="text-secondary" /> Simulador de Impuestos
          </h1>
          <p>Proyección proactiva de IVA e ISR basada en el flujo de CFDI del mes.</p>
        </div>
        <div className="header-actions">
           <select 
             className="bg-surface-2 border border-surface-3 rounded-lg px-4 py-2 text-sm text-white font-bold"
             value={month}
             onChange={(e) => setMonth(parseInt(e.target.value))}
           >
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                <option key={i+1} value={i+1}>{m}</option>
              ))}
           </select>
           <button onClick={fetchSimulation} className="btn btn-primary">
              <Calendar size={18} /> Actualizar Periodo
           </button>
        </div>
      </header>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
         <div className="panel bg-gradient-to-br from-secondary/10 to-primary/5 border-secondary/20 border-b-4 border-b-secondary relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-10 p-4 transition-transform group-hover:scale-125">
               <DollarSign size={48} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-4">Total a Pagar (Estimado)</span>
            <div className="text-3xl font-black text-secondary">${data?.summary?.totalToPay?.toLocaleString() || '0'}</div>
            <p className="text-[10px] text-muted mt-2 font-bold italic">PROYECCIÓN AL CIERRE</p>
         </div>

         <div className="panel bg-surface-1 border-surface-3 border-b-4 border-b-blue-400">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-4">IVA por Pagar (Neto)</span>
            <div className="text-3xl font-black text-white">${data?.iva?.neto?.toLocaleString() || '0'}</div>
            <div className={`flex items-center gap-2 text-xs mt-2 font-bold ${data?.iva?.neto > 0 ? 'text-amber-400' : 'text-success'}`}>
               {data?.iva?.neto > 0 ? <TrendingUp size={14} /> : <PieChart size={14} />} 
               {data?.iva?.neto > 0 ? 'A Cargo' : 'A Favor'}
            </div>
         </div>

         <div className="panel bg-surface-1 border-surface-3 border-b-4 border-b-purple-400">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-4">ISR Estimado (30%)</span>
            <div className="text-3xl font-black text-white">${data?.isr?.estimado?.toLocaleString() || '0'}</div>
            <div className="flex items-center gap-2 text-xs text-purple-300 mt-2 font-bold tracking-widest">
               SOBRE UTILIDAD BRUTA
            </div>
         </div>

         <div className="panel bg-surface-1 border-surface-3 border-b-4 border-b-green-400">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-4">Utilidad Proyectada</span>
            <div className="text-3xl font-black text-success">${(data?.isr?.base || 0).toLocaleString()}</div>
            <div className="flex items-center gap-2 text-xs text-muted mt-2 font-bold">
               {data?.isr?.ingresos ? ((data?.isr?.base / data?.isr?.ingresos) * 100).toFixed(1) : '0'}% MARGEN BRUTO
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
         {/* IVA DETAIL */}
         <div className="panel border-surface-3 shadow-xl">
            <h3 className="font-bold flex items-center gap-2 mb-8">
               <ArrowDownCircle className="text-blue-400" /> Detalle de IVA (Causación/Acreditamiento)
            </h3>
            <div className="space-y-6">
               <div className="flex justify-between items-center py-4 border-b border-surface-3">
                  <div>
                     <p className="text-xs text-muted font-bold uppercase tracking-widest">IVA Trasladado (Ventas)</p>
                     <p className="text-[10px] text-muted italic">Basado en facturas vigentes</p>
                  </div>
                  <span className="text-xl font-black text-white">+ ${data?.iva?.trasladado?.toLocaleString() || '0'}</span>
               </div>
               <div className="flex justify-between items-center py-4 border-b border-surface-3">
                  <div>
                     <p className="text-xs text-muted font-bold uppercase tracking-widest">IVA Acreditable (Compras/Gastos)</p>
                     <p className="text-[10px] text-muted italic">Basado en facturas recibidas</p>
                  </div>
                  <span className="text-xl font-black text-error">- ${data?.iva?.acreditable?.toLocaleString() || '0'}</span>
               </div>
               <div className="flex justify-between items-center py-4 bg-surface-2 rounded-xl px-4">
                  <p className="font-black text-xs uppercase tracking-widest">Resultado IVA</p>
                  <span className={`text-2xl font-black ${data?.iva?.neto > 0 ? 'text-amber-400' : 'text-success'}`}>
                     ${data?.iva?.neto?.toLocaleString() || '0'}
                  </span>
               </div>
            </div>
         </div>

         {/* ISR DETAIL */}
         <div className="panel border-surface-3 shadow-xl">
            <h3 className="font-bold flex items-center gap-2 mb-8">
               <ArrowUpCircle className="text-purple-400" /> Estimación de ISR (Base Gravable)
            </h3>
            <div className="space-y-6">
               <div className="flex justify-between items-center py-4 border-b border-surface-3">
                  <div>
                     <p className="text-xs text-muted font-bold uppercase tracking-widest">Total Ingresos Acumulables</p>
                     <p className="text-[10px] text-muted italic">Subtotal de ventas del mes</p>
                  </div>
                  <span className="text-xl font-black text-white">${data?.isr?.ingresos?.toLocaleString() || '0'}</span>
               </div>
               <div className="flex justify-between items-center py-4 border-b border-surface-3">
                  <div>
                     <p className="text-xs text-muted font-bold uppercase tracking-widest">Total Deducciones Autorizadas</p>
                     <p className="text-[10px] text-muted italic">Costos, Gastos y Nómina</p>
                  </div>
                  <span className="text-xl font-black text-error">${data?.isr?.deducciones?.toLocaleString() || '0'}</span>
               </div>
               <div className="flex justify-between items-center py-4 bg-surface-2 rounded-xl px-4">
                  <p className="font-black text-xs uppercase tracking-widest">Base de Impuesto</p>
                  <span className="text-2xl font-black text-blue-400">
                     ${data?.isr?.base?.toLocaleString() || '0'}
                  </span>
               </div>
            </div>
         </div>
      </div>

      <div className="panel bg-amber-500/5 border-amber-500/20">
         <div className="flex gap-4">
            <AlertCircle className="text-amber-400 shrink-0" />
            <div className="text-xs text-amber-100/70 leading-relaxed">
               <p className="font-bold text-amber-400 mb-1 tracking-widest uppercase text-[10px]">Nota de Cumplimiento:</p>
               Este simulador es un cálculo preliminar basado únicamente en facturas (CFDI). Los ajustes por depreciación, ajuste anual por inflación y otras partidas no monetarias deben validarse manualmente al cierre del ejercicio.
            </div>
         </div>
      </div>
    </div>
  );
}
