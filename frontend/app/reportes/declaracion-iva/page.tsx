'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, Download, CheckCircle2, AlertTriangle, ArrowRightLeft, Calendar } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function DeclaracionIvaPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState('');

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    loadData(cid, now.getMonth() + 1, now.getFullYear());
  }, []);

  const loadData = async (cid: string, m: number, y: number) => {
    setLoading(true);
    try {
      const [taxRes, invoiceRes, billRes] = await Promise.all([
        apiFetch(`/api/reports/tax-simulator?companyId=${cid}&month=${m}&year=${y}`),
        apiFetch(`/api/invoices?companyId=${cid}`),
        apiFetch(`/api/bills?companyId=${cid}`),
      ]);
      const tax = await taxRes.json();
      setData(tax);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => loadData(companyId, month, year);
  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  const ivaAPagar = data?.iva?.neto ?? 0;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Declaración Mensual de IVA</h1>
          <p>Papeles de trabajo para la declaración de IVA mensual ante el SAT (Art. 5-D LIVA).</p>
        </div>
        <div className="header-actions">
          <select className="input w-36" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="input w-28" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary flex items-center gap-2" onClick={handleFilter} disabled={loading}>
            <BarChart3 size={16} /> {loading ? 'Cargando...' : 'Generar'}
          </button>
          {data && <button className="btn btn-secondary flex items-center gap-2"><Download size={16} /> PDF</button>}
        </div>
      </header>

      {data && (
        <>
          {/* ESTADO */}
          <div className={`p-4 rounded-xl border mb-8 flex items-center gap-4 ${ivaAPagar > 0 ? 'bg-danger/10 border-danger/30' : 'bg-success/10 border-success/30'}`}>
            {ivaAPagar > 0
              ? <AlertTriangle size={24} className="text-danger flex-shrink-0" />
              : <CheckCircle2 size={24} className="text-success flex-shrink-0" />}
            <div>
              <div className="font-bold">{ivaAPagar > 0 ? `IVA a cargo: ${fmt(ivaAPagar)}` : `Saldo a favor: ${fmt(Math.abs(ivaAPagar))}`}</div>
              <div className="text-xs opacity-70 mt-1">
                {ivaAPagar > 0
                  ? `Fecha límite de pago: 17 de ${meses[month] || 'mes siguiente'} ${year}`
                  : 'Puedes solicitar devolución o compensar contra otros impuestos.'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* IVA TRASLADADO */}
            <div className="panel">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-danger" /> IVA Trasladado (Cobrado en Ventas)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-surface-3">
                  <span className="text-sm">Actos o Actividades Gravados al 16%</span>
                  <span className="font-bold">{fmt((data.isr?.ingresos || 0))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-3">
                  <span className="text-sm">IVA Trasladado al 16%</span>
                  <span className="font-bold text-danger">{fmt(data.iva?.trasladado)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-3 text-muted">
                  <span className="text-sm">Actos gravados al 8% (zona fronteriza)</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-3 text-muted">
                  <span className="text-sm">Actos exentos o tasa 0%</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between py-3 bg-danger/10 rounded-lg px-3 font-bold">
                  <span>Total IVA Trasladado</span>
                  <span className="text-danger">{fmt(data.iva?.trasladado)}</span>
                </div>
              </div>
            </div>

            {/* IVA ACREDITABLE */}
            <div className="panel">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <ArrowRightLeft size={18} className="text-success" /> IVA Acreditable (Pagado en Compras)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-surface-3">
                  <span className="text-sm">Gastos y Compras con IVA 16%</span>
                  <span className="font-bold">{fmt((data.isr?.deducciones || 0))}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-3">
                  <span className="text-sm">IVA Acreditable al 16%</span>
                  <span className="font-bold text-success">{fmt(data.iva?.acreditable)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-3 text-muted">
                  <span className="text-sm">IVA acreditable 8%</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between py-2 border-b border-surface-3 text-muted">
                  <span className="text-sm">Retenciones de IVA</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between py-3 bg-success/10 rounded-lg px-3 font-bold">
                  <span>Total IVA Acreditable</span>
                  <span className="text-success">{fmt(data.iva?.acreditable)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* DETERMINACION */}
          <div className="panel">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-400" />
              Determinación del IVA — {meses[month - 1]} {year}
            </h3>
            <div className="max-w-lg mx-auto space-y-3">
              <div className="flex justify-between py-3 border-b border-surface-3 text-sm">
                <span>IVA Trasladado Total</span>
                <span className="font-bold text-danger">{fmt(data.iva?.trasladado)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-surface-3 text-sm">
                <span>(–) IVA Acreditable Total</span>
                <span className="font-bold text-success">({fmt(data.iva?.acreditable)})</span>
              </div>
              <div className="flex justify-between py-3 border-b border-surface-3 text-sm text-muted">
                <span>(–) IVA Retenido por Clientes</span>
                <span>($0.00)</span>
              </div>
              <div className="flex justify-between py-3 border-b border-surface-3 text-sm text-muted">
                <span>(–) Saldo a Favor de Meses Anteriores</span>
                <span>($0.00)</span>
              </div>
              <div className={`flex justify-between py-4 rounded-xl px-4 border font-bold text-lg ${ivaAPagar > 0 ? 'bg-danger/10 border-danger/30' : 'bg-success/10 border-success/30'}`}>
                <span>{ivaAPagar > 0 ? 'IVA a Pagar' : 'Saldo a Favor'}</span>
                <span className={ivaAPagar > 0 ? 'text-danger' : 'text-success'}>
                  {fmt(Math.abs(ivaAPagar))}
                </span>
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-muted">
              Presenta tu declaración en el portal del SAT (sat.gob.mx) usando RFC y Contraseña o e.firma.
              Plazo: día 17 del mes siguiente.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
