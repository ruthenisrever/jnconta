'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, DollarSign } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function FlujoEfectivoPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    load(cid, year);
  }, []);

  const load = async (cid: string, yr: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reports/flujo-efectivo?companyId=${cid}&year=${yr}`);
      setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fmt = (n: number) => {
    const abs = Math.abs(n || 0);
    const str = `$${abs.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    return n < 0 ? `(${str})` : str;
  };

  const Section = ({ title, items, neto, icon: Icon, color }: any) => (
    <div className="panel mb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${color}`}><Icon size={20} /></div>
        <h3 className="font-bold text-sm">{title}</h3>
        <div className={`ml-auto font-bold text-lg ${neto >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(neto)}</div>
      </div>
      <div className="space-y-2">
        {items.map(([label, val]: [string, number]) => (
          <div key={label} className="flex justify-between text-sm py-1 border-b border-surface-3">
            <span className="text-muted">{label}</span>
            <span className={`font-medium ${val < 0 ? 'text-danger' : 'text-white'}`}>{fmt(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Estado de Flujo de Efectivo</h1>
          <p>Método indirecto — NIF B-2. Actividades de operación, inversión y financiamiento.</p>
        </div>
        <div className="header-actions">
          <select className="input w-28" value={year} onChange={e => { setYear(e.target.value); load(companyId, e.target.value); }}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => load(companyId, year)}><RefreshCw size={16} /></button>
        </div>
      </header>

      {loading ? <div className="spinner mx-auto mt-20" /> : data && (
        <div className="max-w-2xl">
          {/* Encabezado */}
          <div className="p-4 bg-surface-2 rounded-xl mb-6 text-center">
            <div className="text-sm text-muted">Flujo Neto de Efectivo — Ejercicio {data.ejercicio}</div>
            <div className={`text-4xl font-bold mt-2 ${data.flujoNeto >= 0 ? 'text-success' : 'text-danger'}`}>
              {fmt(data.flujoNeto)}
            </div>
          </div>

          <Section
            title={data.operacion.label}
            icon={TrendingUp}
            color="bg-success/20 text-success"
            neto={data.operacion.neto}
            items={[
              ['Cobros a clientes', data.operacion.cobrosClientes],
              ['Pagos a proveedores', data.operacion.pagosProveedores],
            ]}
          />

          <Section
            title={data.inversion.label}
            icon={DollarSign}
            color="bg-primary-500/20 text-primary-400"
            neto={data.inversion.neto}
            items={[
              ['Adquisición de activos fijos', data.inversion.adquisicionActivos],
            ]}
          />

          <Section
            title={data.financiamiento.label}
            icon={TrendingDown}
            color="bg-amber-500/20 text-amber-400"
            neto={data.financiamiento.neto}
            items={[
              ['Créditos bancarios recibidos', data.financiamiento.creditosBancarios],
              ['Pagos de créditos', data.financiamiento.pagosCreditos],
            ]}
          />

          <div className="panel border border-primary-500/30">
            <div className="flex justify-between items-center">
              <span className="font-bold">Flujo Neto del Período</span>
              <span className={`text-2xl font-bold ${data.flujoNeto >= 0 ? 'text-success' : 'text-danger'}`}>{fmt(data.flujoNeto)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
