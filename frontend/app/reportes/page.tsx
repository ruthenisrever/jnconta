'use client';

import React from 'react';
import Link from 'next/link';
import { BarChart3, TrendingUp, Scale, ShieldCheck, History, PieChart } from 'lucide-react';

export default function ReportesHubPage() {
  const reports = [
    {
      title: 'Estado de Resultados',
      description: 'Análisis de ingresos, costos y utilidad neta con drill-down interactivo.',
      href: '/reportes/estado-resultados',
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-700'
    },
    {
      title: 'Balance General',
      description: 'Situación financiera detallada: Activos, Pasivos y Capital Contable.',
      href: '/reportes/balance-general',
      icon: Scale,
      color: 'from-blue-500 to-indigo-700'
    },
    {
      title: 'Balanza de Comprobación',
      description: 'Listado de saldos y movimientos de todas las cuentas del catálogo.',
      href: '#', // We can still use the old tab logic if needed, but for now hub
      icon: BarChart3,
      color: 'from-purple-500 to-purple-800'
    },
    {
      title: 'Auditoría 360°',
      description: 'Verificación de cumplimiento fiscal y detección de discrepancias.',
      href: '/auditoria',
      icon: ShieldCheck,
      color: 'from-red-500 to-rose-700'
    },
    {
      title: 'Auxiliar de Cuentas',
      description: 'Detalle cronológico de movimientos por cuenta contable.',
      href: '/reportes/auxiliar',
      icon: History,
      color: 'from-amber-500 to-orange-700'
    },
    {
      title: 'Análisis de Razones',
      description: 'Indicadores financieros de liquidez, solvencia y rentabilidad.',
      href: '#',
      icon: PieChart,
      color: 'from-cyan-500 to-blue-600'
    }
  ];

  return (
    <div className="min-h-screen p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
          Centro de <span className="text-blue-500">Inteligencia Financiera</span>
        </h1>
        <p className="text-gray-500 mt-2 font-medium">Explora, audita y analiza la salud económica de tu empresa.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {reports.map((report, i) => (
          <Link 
            key={i} 
            href={report.href}
            className="group relative bg-[#111C2E]/40 backdrop-blur-2xl border border-white/5 rounded-[32px] p-8 overflow-hidden hover:scale-[1.02] transition-all hover:border-white/10 hover:shadow-2xl shadow-blue-900/10"
          >
            {/* Background Glow */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${report.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
            
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${report.color} p-3 mb-6 shadow-lg group-hover:rotate-6 transition-transform`}>
              <report.icon className="w-full h-full text-white" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">{report.title}</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{report.description}</p>

            <div className="flex items-center text-blue-400 text-xs font-black uppercase tracking-widest gap-2">
              Explorar Reporte
              <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
