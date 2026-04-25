'use client';

import React, { useState, useEffect } from 'react';
import { Inbox, AlertTriangle, CheckCircle2, Clock, RefreshCw, ExternalLink, FileText, XCircle, ShieldAlert, Download, Filter } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type Tab = 'recibidos' | 'cancelaciones' | 'alertas';

export default function BuzonTributarioPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('recibidos');
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    loadBuzon(cid);
  }, []);

  const loadBuzon = async (cid: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/sat/buzon?companyId=${cid}`);
      const d = await res.json();
      setData(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const verifyBill = async (id: string) => {
    setVerifying(id);
    try {
      await apiFetch(`/api/sat/buzon/bill/${id}/verify`, { method: 'PUT', body: JSON.stringify({ status: 'PROCESADA' }) });
      setData((prev: any) => ({
        ...prev,
        cfdiRecibidos: prev.cfdiRecibidos.map((b: any) => b.id === id ? { ...b, status: 'PROCESADA' } : b),
      }));
    } catch (e) { console.error(e); }
    finally { setVerifying(null); }
  };

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  const filteredRecibidos = (data?.cfdiRecibidos ?? []).filter((b: any) =>
    !search || (b.emisor || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.uuid || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="main-content p-10 text-center"><div className="spinner" /></div>;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Buzón Tributario SAT</h1>
          <p>Centro de notificaciones fiscales: CFDIs recibidos, solicitudes de cancelación y alertas del SAT.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => loadBuzon(companyId)}>
            <RefreshCw size={16} /> Actualizar
          </button>
          <a href="https://wwwmat.sat.gob.mx/aplicacion/operacion/66288/consulta-tu-buzon-tributario" target="_blank" rel="noopener noreferrer" className="btn btn-ghost flex items-center gap-2 text-primary-400 border border-primary-500/30">
            <ExternalLink size={16} /> Portal SAT
          </a>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="kpi-card cursor-pointer" onClick={() => setTab('recibidos')}>
          <div className="kpi-card-icon blue mb-3"><Inbox size={22} /></div>
          <div className="kpi-card-label">CFDIs Recibidos</div>
          <div className="kpi-card-value">{data?.summary?.cfdiRecibidos ?? 0}</div>
        </div>
        <div className="kpi-card cursor-pointer" onClick={() => setTab('cancelaciones')}>
          <div className="kpi-card-icon amber mb-3"><Clock size={22} /></div>
          <div className="kpi-card-label">Cancelaciones Pendientes</div>
          <div className="kpi-card-value text-amber-400">{data?.summary?.cancelacionesPendientes ?? 0}</div>
        </div>
        <div className="kpi-card cursor-pointer" onClick={() => setTab('alertas')}>
          <div className="kpi-card-icon red mb-3"><ShieldAlert size={22} /></div>
          <div className="kpi-card-label">Alertas SAT</div>
          <div className="kpi-card-value text-danger">{data?.summary?.alertasSAT ?? 0}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-icon teal mb-3"><FileText size={22} /></div>
          <div className="kpi-card-label">XMLs en Gestor</div>
          <div className="kpi-card-value">{data?.summary?.xmlsGestor ?? 0}</div>
        </div>
      </div>

      {/* Aviso descarga masiva */}
      <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 flex gap-3 mb-6">
        <AlertTriangle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300">
          <strong>Descarga automática de XMLs:</strong> Para importar tus CFDIs directamente del SAT, ve a{' '}
          <a href="/sat-sync" className="underline text-blue-200">Descarga Masiva SAT</a> e ingresa tu CIEC o e.firma.
          Los CFDIs descargados aparecerán automáticamente en este buzón.
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-6 border-b border-surface-3">
        {([['recibidos', 'CFDIs Recibidos', Inbox], ['cancelaciones', 'Cancelaciones', XCircle], ['alertas', 'Alertas SAT', ShieldAlert]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === id ? 'border-primary-500 text-primary-400' : 'border-transparent text-muted hover:text-white'}`}>
            <Icon size={16} />{label}
            {id === 'cancelaciones' && (data?.summary?.cancelacionesPendientes ?? 0) > 0 && (
              <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{data.summary.cancelacionesPendientes}</span>
            )}
            {id === 'alertas' && (data?.summary?.alertasSAT ?? 0) > 0 && (
              <span className="bg-danger text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{data.summary.alertasSAT}</span>
            )}
          </button>
        ))}
      </div>

      {/* TAB: CFDI RECIBIDOS */}
      {tab === 'recibidos' && (
        <div className="panel">
          <div className="flex gap-3 mb-4">
            <input className="input flex-1" placeholder="Buscar por emisor, UUID..." value={search} onChange={e => setSearch(e.target.value)} />
            <button className="btn btn-secondary flex items-center gap-2"><Filter size={16} /> Filtrar</button>
            <button className="btn btn-secondary flex items-center gap-2"><Download size={16} /> Exportar</button>
          </div>

          {filteredRecibidos.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-surface-3 rounded-2xl text-muted">
              <Inbox size={40} className="mx-auto mb-3 opacity-30" />
              <p>No hay CFDIs recibidos. Usa la <a href="/sat-sync" className="text-primary-400 underline">Descarga Masiva SAT</a> para importarlos.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>UUID</th><th>Emisor</th><th>Concepto</th><th>Fecha</th>
                    <th className="text-right">Total</th><th>Estado</th><th />
                  </tr>
                </thead>
                <tbody>
                  {filteredRecibidos.map((b: any) => (
                    <tr key={b.id}>
                      <td className="font-mono text-xs text-muted">{b.uuid ? b.uuid.slice(0, 18) + '...' : '—'}</td>
                      <td>
                        <div className="font-medium text-sm">{b.emisor}</div>
                        <div className="text-xs text-muted">{b.rfcEmisor}</div>
                      </td>
                      <td className="text-xs max-w-[200px] truncate">{b.concepto}</td>
                      <td className="text-xs">{new Date(b.fecha).toLocaleDateString('es-MX')}</td>
                      <td className="text-right font-bold">{fmt(b.total)}</td>
                      <td>
                        <span className={`badge ${b.status === 'PROCESADA' ? 'badge-success' : b.status === 'CANCELADA' ? 'badge-danger' : 'badge-warning'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        {b.status !== 'PROCESADA' && (
                          <button className="btn btn-ghost btn-sm p-1 text-success" title="Marcar como procesada"
                            onClick={() => verifyBill(b.id)} disabled={verifying === b.id}>
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: CANCELACIONES */}
      {tab === 'cancelaciones' && (
        <div className="panel">
          {(data?.cancelacionesPendientes ?? []).length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-surface-3 rounded-2xl">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-success opacity-60" />
              <p className="text-muted">No hay solicitudes de cancelación pendientes de aceptación por tus clientes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.cancelacionesPendientes.map((c: any) => (
                <div key={c.id} className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock size={16} className="text-amber-400" />
                        <span className="font-bold text-sm">Cancelación pendiente de aceptación</span>
                        <span className="badge bg-amber-500/20 text-amber-300 border-amber-500/30">Motivo {c.motivo}</span>
                      </div>
                      <div className="text-xs text-muted">UUID: {c.uuid}</div>
                      <div className="text-xs text-muted mt-1">Receptor: {c.receptor} | Total: {fmt(c.total)}</div>
                    </div>
                    <div className="text-xs text-muted">{new Date(c.fecha).toLocaleDateString('es-MX')}</div>
                  </div>
                  <div className="mt-3 p-2 bg-amber-500/5 rounded text-xs text-amber-200">
                    El receptor tiene <strong>3 días hábiles</strong> para aceptar o rechazar en su buzón tributario del SAT.
                    Si no responde, la cancelación se acepta automáticamente.
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ALERTAS */}
      {tab === 'alertas' && (
        <div className="panel">
          {(data?.alertasSAT ?? []).length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-surface-3 rounded-2xl">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-success opacity-60" />
              <p className="text-success font-medium">Sin alertas fiscales detectadas</p>
              <p className="text-muted text-sm mt-1">El análisis de riesgo SAT no encontró inconsistencias.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(data.alertasSAT as any[]).map((a: any, i: number) => (
                <div key={i} className={`p-4 rounded-xl border ${a.severity === 'HIGH' ? 'bg-danger/10 border-danger/30' : a.severity === 'MEDIUM' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                  <div className="flex items-start gap-3">
                    <ShieldAlert size={18} className={a.severity === 'HIGH' ? 'text-danger' : a.severity === 'MEDIUM' ? 'text-amber-400' : 'text-blue-400'} />
                    <div>
                      <div className="font-bold text-sm">{a.title}</div>
                      <div className="text-xs text-muted mt-1">{a.description}</div>
                    </div>
                    <span className={`ml-auto px-2 py-0.5 rounded text-[10px] font-bold ${a.severity === 'HIGH' ? 'bg-danger/20 text-danger' : a.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {a.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
