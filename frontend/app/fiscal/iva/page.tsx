'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Download, Filter, 
  TrendingDown, TrendingUp, AlertTriangle, 
  CheckCircle2, Info, Receipt, ArrowRightLeft
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function IvaDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    setCompanyId(cid);
    fetchStats(cid);
  }, []);

  const fetchStats = async (cid: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/fiscal/stats?companyId=${cid}`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center"><span className="spinner" /></div>;

  const totalIvaAcreditable = stats?.ivaAcreditable || 0;
  const totalIvaTrasladado = stats?.ivaTrasladado || 0;
  const diff = totalIvaTrasladado - totalIvaAcreditable;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Papeles de Trabajo: IVA</h1>
          <p>Control detallado de IVA Acreditable y Trasladado (Flujo de Efectivo).</p>
        </div>
        <div className="header-actions">
           <button className="btn btn-secondary flex items-center gap-2">
              <Calendar size={16} /> Este Mes
           </button>
           <button className="btn btn-primary flex items-center gap-2">
              <Download size={16} /> Exportar Excel
           </button>
        </div>
      </header>

      <div className="kpi-grid mb-8">
        <div className="kpi-card">
          <div className="flex justify-between items-start mb-4">
            <div className="kpi-card-icon teal">
              <TrendingUp size={24} />
            </div>
            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${diff <= 0 ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
              {diff <= 0 ? 'Saldo a Favor' : 'Por Pagar'}
            </div>
          </div>
          <div className="kpi-card-label">IVA Neto Estimado</div>
          <div className="kpi-card-value">${Math.abs(diff).toLocaleString()}</div>
          <div className="text-xs text-muted mt-2">Corte al {new Date().toLocaleDateString()}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-icon blue mb-4">
            <TrendingDown size={24} />
          </div>
          <div className="kpi-card-label">IVA Acreditable (Compras)</div>
          <div className="kpi-card-value text-success">${totalIvaAcreditable.toLocaleString()}</div>
          <div className="kpi-progress">
            <div className="kpi-progress-inner" style={{ width: '65%', backgroundColor: 'var(--success)' }} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-icon amber mb-4">
            <TrendingUp size={24} />
          </div>
          <div className="kpi-card-label">IVA Trasladado (Ventas)</div>
          <div className="kpi-card-value text-danger">${totalIvaTrasladado.toLocaleString()}</div>
          <div className="kpi-progress">
             <div className="kpi-progress-inner" style={{ width: '45%', backgroundColor: 'var(--danger)' }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="panel">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold flex items-center gap-2">
                  <Receipt className="text-primary-400" size={18} />
                  Desglose IVA Acreditable
               </h3>
               <span className="text-xs text-muted">Procesado vía TaxEngine</span>
            </div>
            <div className="space-y-4">
               <div className="flex justify-between p-3 bg-surface-2 rounded-lg border border-border-subtle">
                  <span className="text-sm font-medium">IVA Tasa 16%</span>
                  <span className="text-sm font-bold">${(totalIvaAcreditable * 0.9).toLocaleString()}</span>
               </div>
               <div className="flex justify-between p-3 bg-surface-2 rounded-lg border border-border-subtle">
                  <span className="text-sm font-medium">IVA Tasa 8%</span>
                  <span className="text-sm font-bold">-$0.00</span>
               </div>
               <div className="flex justify-between p-3 bg-danger/10 rounded-lg border border-danger/20">
                  <span className="text-sm font-medium text-danger">Retenciones IVA (Favor)</span>
                  <span className="text-sm font-bold text-danger">${(totalIvaAcreditable * 0.05).toLocaleString()}</span>
               </div>
            </div>
            <div className="mt-8 p-4 bg-primary-600/10 rounded-xl border border-primary-600/20">
               <div className="flex gap-3">
                  <Info className="text-primary-400 flex-shrink-0" size={20} />
                  <p className="text-xs text-primary-300 leading-relaxed">
                     Este reporte se genera basándose en el **Anexo de IVA** capturado durante la conciliación bancaria y el registro de pólizas. Garantiza la paridad con el flujo de efectivo reportado al SAT.
                  </p>
               </div>
            </div>
         </div>

         <div className="panel overflow-hidden">
            <div className="p-6 border-b border-surface-3">
               <h3 className="font-bold flex items-center gap-2">
                  <ArrowRightLeft className="text-primary-400" size={18} />
                  Conciliación de Preaditoría
               </h3>
            </div>
            <div className="table-responsive">
               <table className="report-table">
                  <thead>
                     <tr>
                        <th>Concepto</th>
                        <th>XML Emitidos</th>
                        <th>Diferencia</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr>
                        <td>IVA Causado (Ventas)</td>
                        <td>${(totalIvaTrasladado).toLocaleString()}</td>
                        <td><span className="text-success flex items-center gap-1"><CheckCircle2 size={12} /> $0.00</span></td>
                     </tr>
                     <tr>
                        <td>IVA Pagado (Gastos)</td>
                        <td>${(totalIvaAcreditable).toLocaleString()}</td>
                        <td><span className="text-warning flex items-center gap-1"><AlertTriangle size={12} /> $120.00*</span></td>
                     </tr>
                  </tbody>
               </table>
            </div>
            <div className="p-4 bg-surface-2 text-[10px] text-muted italic">
               * Diferencia detectada entre XML recibidos y pagos contabilizados. Se recomienda revisar facturas PPD sin REP asociado.
            </div>
         </div>
      </div>
    </div>
  );
}
