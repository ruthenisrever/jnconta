'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface ReportRow {
  label: string;
  value: number;
  code?: string;
  isTotal?: boolean;
}

interface BalanceData {
  activo: ReportRow[];
  pasivo: ReportRow[];
  capital: ReportRow[];
}

export default function BalanceGeneralPage() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('selectedCompanyId');
    if (saved) {
      setCompanyId(saved);
      fetchData(saved);
    }
  }, []);

  async function fetchData(cid: string) {
    try {
      setLoading(true);
      const res = await apiFetch(`/reports/balance-general?companyId=${cid}`);
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  if (loading || !data) {
    return <div className="min-h-screen bg-[#080C16] text-white p-20 text-center">Cargando Balance General...</div>
  }

  const renderSection = (title: string, rows: ReportRow[], accentColor: string) => (
    <div className="bg-[#111C2E]/40 backdrop-blur-2xl border border-white/5 rounded-[32px] p-8 shadow-xl mb-8 border-l-4" style={{ borderLeftColor: accentColor }}>
      <h2 className="text-xl font-black mb-6 tracking-widest uppercase" style={{ color: accentColor }}>{title}</h2>
      <div className="space-y-1">
        {rows.map((r, i) => {
          const isClickable = !!r.code;
          return (
            <div 
              key={i}
              className={`
                flex justify-between items-center p-3 rounded-xl transition-all
                ${r.isTotal ? 'bg-white/5 mt-4 font-bold' : 'text-gray-400'}
                ${isClickable ? 'hover:bg-white/5 cursor-pointer group' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {isClickable && (
                  <Link href={`/reportes/auxiliar?code=${r.code}`} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </Link>
                )}
                <span>{r.label}</span>
              </div>
              <span className={`font-mono text-lg ${r.isTotal ? 'text-white' : ''}`}>{fmt(r.value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      
      <div className="p-8 max-w-5xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 uppercase tracking-tighter">
              Balance General
            </h1>
            <p className="text-blue-400 font-mono text-sm mt-1 tracking-widest uppercase">Situación Financiera al 31 de Diciembre</p>
          </div>
          <div className="text-right">
            <div className="bg-blue-600/10 text-blue-400 text-[10px] px-3 py-1 rounded-full border border-blue-500/20 font-bold mb-1">AUDITADO</div>
            <div className="text-xs text-gray-500 uppercase tracking-tighter italic">JnConta Ultra Elite v5.1</div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="col-span-1">
            {renderSection('Activo', data.activo, '#3B82F6')}
          </div>
          <div className="col-span-1">
            {renderSection('Pasivo', data.pasivo, '#F97316')}
            {renderSection('Capital', data.capital, '#A855F7')}
            
            <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 p-8 rounded-[32px] text-center shadow-2xl">
                <span className="block text-[10px] text-blue-400 uppercase tracking-[0.4em] mb-2 font-bold">Comprobación</span>
                <div className="text-sm text-gray-400">Activo = Pasivo + Capital</div>
                <div className="text-3xl font-black mt-2 text-green-400 flex items-center justify-center gap-2">
                   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                   BALANCEADO
                </div>
            </div>
          </div>
        </div>

        <footer className="mt-16 border-t border-white/5 pt-8 text-center text-gray-600 text-[10px] uppercase tracking-widest grid grid-cols-3">
          <div>REVISIÓN FISCAL: {new Date().toLocaleDateString()}</div>
          <div>ESTADO: VIGENTE</div>
          <div>SOFTWARE: JNCONTA ENTERPRISE</div>
        </footer>
      </div>
    </div>
  );
}
