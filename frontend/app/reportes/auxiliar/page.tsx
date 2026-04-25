'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { apiFetch } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

interface Entry {
  date: string;
  description: string;
  debit: number;
  credit: number;
  journal: {
    id: string;
    number: string;
    concept: string;
  };
}

function AuxiliarContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [accountName, setAccountName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('selectedCompanyId');
    if (saved && code) {
      setCompanyId(saved);
      fetchData(saved, code);
    }
  }, [code]);

  async function fetchData(cid: string, accCode: string) {
    try {
      setLoading(true);
      const res = await apiFetch(`/reports/auxiliar?companyId=${cid}&accountCode=${accCode}&month=4&year=2024`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
        if (data.length > 0) setAccountName(accCode);
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
      <div className="p-8 max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <div className="text-blue-400 font-mono text-xs mb-1 uppercase tracking-widest">Auxiliar de Cuenta</div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              {accountName || code}
            </h1>
          </div>
        </header>

        <div className="bg-[#111C2E]/60 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-blue-300 text-[10px] uppercase tracking-[0.2em] font-bold">
                <th className="p-4">Fecha</th>
                <th className="p-4">Póliza</th>
                <th className="p-4">Concepto / Descripción</th>
                <th className="p-4 text-right">Cargos</th>
                <th className="p-4 text-right">Abonos</th>
                <th className="p-4 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-sm">
              {entries.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500 italic">No hay movimientos en este periodo</td>
                </tr>
              )}
              {entries.map((e, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors group cursor-pointer">
                  <td className="p-4 text-gray-400">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className="text-blue-400 font-bold group-hover:underline">
                       POL-{i+1}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-white">{e.description}</div>
                  </td>
                  <td className="p-4 text-right text-green-400">{e.debit > 0 ? fmt(e.debit) : '-'}</td>
                  <td className="p-4 text-right text-orange-400">{e.credit > 0 ? fmt(e.credit) : '-'}</td>
                  <td className="p-4 text-right font-bold text-blue-200">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AuxiliarPage() {
  return (
    <Suspense fallback={<div className="p-10 text-white font-bold animate-pulse">Cargando Auxiliar...</div>}>
      <AuxiliarContent />
    </Suspense>
  );
}
