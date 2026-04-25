'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

interface Section {
  label: string;
  value: number;
  code?: string;
  isTotal?: boolean;
  isFinal?: boolean;
}

export default function EstadoResultadosPage() {
  const [sections, setSections] = useState<Section[]>([]);
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
      const res = await apiFetch(`/reports/estado-resultados?companyId=${cid}`);
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  return (
    <div className="min-h-screen">
      
      <div className="p-8 max-w-4xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 uppercase tracking-tighter">
            Estado de Resultados
          </h1>
          <p className="text-blue-400 font-mono text-sm mt-2 tracking-[0.3em] uppercase">Enero - Diciembre 2024</p>
        </header>

        <div className="bg-[#111C2E]/40 backdrop-blur-2xl border border-white/5 rounded-[40px] p-10 shadow-2xl shadow-blue-900/20">
          <div className="space-y-1">
            {sections.map((s, i) => {
              const isClickable = !!s.code;
              
              return (
                <div 
                  key={i}
                  className={`
                    group flex justify-between items-center p-4 rounded-2xl transition-all
                    ${s.isTotal ? 'bg-blue-600/10 mt-4 mb-2' : ''}
                    ${s.isFinal ? 'bg-gradient-to-r from-blue-600 to-indigo-600 !mt-8 py-6' : ''}
                    ${isClickable ? 'hover:bg-white/5 cursor-pointer' : ''}
                  `}
                >
                  <div className="flex items-center gap-4">
                    {isClickable && (
                      <Link 
                        href={`/reportes/auxiliar?code=${s.code}`}
                        className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </Link>
                    )}
                    <span className={`
                      text-lg tracking-tight
                      ${s.isTotal ? 'font-bold text-blue-300' : 'text-gray-400'}
                      ${s.isFinal ? 'text-white text-xl uppercase font-black' : ''}
                    `}>
                      {s.label}
                    </span>
                  </div>
                  
                  <span className={`
                    font-mono text-xl
                    ${s.isTotal ? 'text-blue-200 font-bold' : 'text-white'}
                    ${s.isFinal ? 'text-white text-3xl font-black drop-shadow-lg' : ''}
                  `}>
                    {fmt(s.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="mt-12 text-center text-gray-600 text-xs uppercase tracking-widest">
          JnConta Ultra Elite v5.1 — Información procesada en tiempo real
        </footer>
      </div>

      <style jsx global>{`
        body { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}
