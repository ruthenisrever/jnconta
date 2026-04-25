'use client';

import React from 'react';
import { Building, Calculator, Calendar, FileText } from 'lucide-react';

interface DepreciationScheduleProps {
  assets: any[];
  company: any;
}

export default function DepreciationSchedule({ assets, company }: DepreciationScheduleProps) {
  const fmt = (n: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);
  
  const totalAcquisition = assets.reduce((s, a) => s + a.acquisitionCost, 0);
  const totalDepreciation = assets.reduce((s, a) => s + a.accumulatedDep, 0);
  const totalNetValue = assets.reduce((s, a) => s + a.netValue, 0);
  const totalMonthly = assets.reduce((s, a) => s + ((a.acquisitionCost - a.residualValue) / (a.usefulLife * 12)), 0);

  return (
    <div className="schedule-container bg-white text-slate-800 p-10 max-w-5xl mx-auto border border-slate-200 shadow-2xl print:shadow-none print:border-none print:p-0">
      {/* HEADER */}
      <div className="flex justify-between items-start mb-10 border-b-2 border-slate-900 pb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tighter text-slate-900">{company?.name || 'JNCONTA SOLUTIONS'}</h1>
          <p className="text-sm font-mono text-slate-500">RFC: {company?.rfc || 'XAXX010101000'}</p>
          <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-widest">Cédula de Depreciación de Activos Fijos</p>
        </div>
        <div className="text-right">
          <div className="bg-slate-900 text-white px-3 py-1 text-[10px] font-bold inline-block mb-2">EJERCICIO 2024</div>
          <p className="text-xs text-slate-500 font-bold">Fecha de Reporte: {new Date().toLocaleDateString('es-MX')}</p>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        <div className="border border-slate-200 p-4 rounded bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Monto Original (MOI)</p>
          <p className="text-lg font-bold font-mono">{fmt(totalAcquisition)}</p>
        </div>
        <div className="border border-slate-200 p-4 rounded bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Dep. Acumulada</p>
          <p className="text-lg font-bold font-mono text-rose-600">{fmt(totalDepreciation)}</p>
        </div>
        <div className="border border-slate-200 p-4 rounded bg-slate-50">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Valor en Libros</p>
          <p className="text-lg font-bold font-mono text-emerald-600">{fmt(totalNetValue)}</p>
        </div>
        <div className="border border-slate-200 p-4 rounded bg-slate-900 text-white">
          <p className="text-[10px] uppercase font-bold opacity-60 mb-1">Cargo Mensual Proyectado</p>
          <p className="text-lg font-bold font-mono">{fmt(totalMonthly)}</p>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div className="mb-10 overflow-hidden border border-slate-200 rounded">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-500 border-b border-slate-200 uppercase text-[9px] font-bold">
              <th className="p-3 text-left">Activo / Descripción</th>
              <th className="p-3 text-left">F. Adquisición</th>
              <th className="p-3 text-right">MOI</th>
              <th className="p-3 text-right">Tasa LISR</th>
              <th className="p-3 text-right">Meses Dep.</th>
              <th className="p-3 text-right">Dep. Período</th>
              <th className="p-3 text-right">Dep. Acumulada</th>
              <th className="p-3 text-right">Saldo por Dep.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {assets.map((a, i) => {
               const monthly = (a.acquisitionCost - a.residualValue) / (a.usefulLife * 12);
               return (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-bold text-slate-700">
                    <span className="text-[9px] text-slate-400 block font-mono">{a.assetNumber}</span>
                    {a.name}
                  </td>
                  <td className="p-3">{new Date(a.acquisitionDate).toLocaleDateString('es-MX')}</td>
                  <td className="p-3 text-right font-mono">{fmt(a.acquisitionCost)}</td>
                  <td className="p-3 text-right">{(a.depreciationRate * 100).toFixed(0)}%</td>
                  <td className="p-3 text-right">{a.usefulLife * 12}</td>
                  <td className="p-3 text-right font-bold text-rose-600 font-mono">{fmt(monthly)}</td>
                  <td className="p-3 text-right font-mono">{fmt(a.accumulatedDep)}</td>
                  <td className="p-3 text-right font-bold text-emerald-600 font-mono">{fmt(a.netValue)}</td>
                </tr>
               )
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-900">
             <tr>
               <td colSpan={2} className="p-4 text-sm font-bold uppercase">Totales Consolidados</td>
               <td className="p-4 text-right font-mono text-sm">{fmt(totalAcquisition)}</td>
               <td colSpan={2}></td>
               <td className="p-4 text-right font-mono text-sm">{fmt(totalMonthly)}</td>
               <td className="p-4 text-right font-mono text-sm">{fmt(totalDepreciation)}</td>
               <td className="p-4 text-right font-mono text-sm">{fmt(totalNetValue)}</td>
             </tr>
          </tfoot>
        </table>
      </div>

      {/* FOOTER */}
      <div className="grid grid-cols-2 gap-20 pt-12 text-center text-[10px] uppercase font-bold text-slate-300">
        <div className="border-t border-slate-200 pt-4">Contador General / Auditor</div>
        <div className="border-t border-slate-200 pt-4">Representante Legal</div>
      </div>

      <style jsx>{`
        @media print {
          .schedule-container {
            width: 100% !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
}
