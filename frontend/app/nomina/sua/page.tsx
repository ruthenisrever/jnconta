'use client';

import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, Users, ShieldCheck } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function SuaPage() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    apiFetch(`/api/nomina/periods?companyId=${cid}`)
      .then(r => r.json())
      .then(d => { setPeriods(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const downloadSUA = async (periodId: string, periodName: string) => {
    const cid = localStorage.getItem('companyId') || '';
    setDownloading(periodId);
    try {
      const res = await apiFetch(`/api/nomina/sua/${periodId}?companyId=${cid}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SUA_${periodName.replace(/\s/g, '_')}.sua`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const downloadSIPARE = async (periodId: string, periodName: string) => {
    setDownloading(periodId + '_sipare');
    try {
      const res = await apiFetch(`/api/nomina/sipare/${periodId}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SIPARE_${periodName.replace(/\s/g, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>SUA / SIPARE — IMSS</h1>
          <p>Genera los archivos de pago de cuotas IMSS para el SUA y el sistema SIPARE.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="panel bg-blue-500/5 border-blue-500/20">
          <ShieldCheck size={28} className="text-blue-400 mb-3" />
          <h4 className="font-bold mb-1">Archivo SUA</h4>
          <p className="text-xs text-muted">Sistema Único de Autodeterminación — formato .sua para cargar en el portal IMSS.</p>
        </div>
        <div className="panel bg-teal-500/5 border-teal-500/20">
          <FileText size={28} className="text-teal-400 mb-3" />
          <h4 className="font-bold mb-1">Archivo SIPARE</h4>
          <p className="text-xs text-muted">Sistema de Pago Referenciado — archivo de texto para pago en banco.</p>
        </div>
        <div className="panel bg-amber-500/5 border-amber-500/20">
          <Calendar size={28} className="text-amber-400 mb-3" />
          <h4 className="font-bold mb-1">Vencimiento IMSS</h4>
          <p className="text-xs text-muted">Las cuotas IMSS vencen el día 17 de cada mes (o día hábil siguiente).</p>
        </div>
      </div>

      <div className="panel">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <Users size={18} className="text-primary-400" /> Periodos de Nómina
        </h3>

        {loading ? (
          <div className="py-12 text-center text-muted">Cargando periodos...</div>
        ) : periods.length === 0 ? (
          <div className="py-12 text-center text-muted border-2 border-dashed border-surface-3 rounded-2xl">
            No hay periodos calculados. Ve a Nómina &gt; Periodos para crear uno.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Periodo</th>
                  <th>Fechas</th>
                  <th>Empleados</th>
                  <th>Estado</th>
                  <th className="text-right">Descargas</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p: any) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-xs text-muted">
                      {new Date(p.startDate).toLocaleDateString('es-MX')} — {new Date(p.endDate).toLocaleDateString('es-MX')}
                    </td>
                    <td>{p.receipts?.length ?? 0} trabajadores</td>
                    <td>
                      <span className={`badge ${p.status === 'TIMBRADA' ? 'badge-success' : p.status === 'CALCULADA' ? 'badge-warning' : 'badge-default'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                          onClick={() => downloadSUA(p.id, p.name)}
                          disabled={downloading === p.id}
                        >
                          <Download size={12} />
                          {downloading === p.id ? '...' : 'SUA'}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm flex items-center gap-1"
                          onClick={() => downloadSIPARE(p.id, p.name)}
                          disabled={downloading === p.id + '_sipare'}
                        >
                          <Download size={12} />
                          {downloading === p.id + '_sipare' ? '...' : 'SIPARE'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
