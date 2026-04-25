'use client';

import React, { useState, useEffect } from 'react';
import { Percent, Plus, Download, RefreshCw, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const TIPOS = ['ARRENDAMIENTO', 'HONORARIOS', 'DIVIDENDOS', 'INTERESES', 'OTROS'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function RetencionesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [tab, setTab] = useState<'lista' | 'nueva'>('lista');
  const [ejercicio, setEjercicio] = useState(String(new Date().getFullYear()));
  const [form, setForm] = useState({ tipo: 'HONORARIOS', receptorRfc: '', receptorNombre: '', periodo: String(new Date().getMonth() + 1), ejercicio: String(new Date().getFullYear()), montoTotal: '', isrRetenido: '', ivaRetenido: '', iepsRetenido: '' });
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    load(cid);
  }, []);

  const load = async (cid: string, ej = ejercicio) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/retenciones?companyId=${cid}&ejercicio=${ej}`);
      setData(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/retenciones', { method: 'POST', body: JSON.stringify({ ...form, companyId, montoTotal: +form.montoTotal, isrRetenido: +form.isrRetenido, ivaRetenido: +(form.ivaRetenido || 0), iepsRetenido: +(form.iepsRetenido || 0), periodo: +form.periodo, ejercicio: +form.ejercicio }) });
      setTab('lista'); load(companyId);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const downloadXml = async (id: string) => {
    setDownloadingId(id);
    try {
      const res = await apiFetch(`/api/retenciones/${id}/xml`);
      const { xml, folio } = await res.json();
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `retencion-${folio}.xml`; a.click();
      URL.revokeObjectURL(url);
      load(companyId);
    } catch (e) { console.error(e); }
    finally { setDownloadingId(null); }
  };

  const del = async (id: string) => {
    if (!confirm('¿Eliminar retención?')) return;
    await apiFetch(`/api/retenciones/${id}`, { method: 'DELETE' });
    load(companyId);
  };

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  const isrEstimado = form.tipo === 'HONORARIOS' ? (+(form.montoTotal || 0) * 0.10).toFixed(2)
    : form.tipo === 'ARRENDAMIENTO' ? (+(form.montoTotal || 0) * 0.10).toFixed(2)
    : form.tipo === 'DIVIDENDOS' ? (+(form.montoTotal || 0) * 0.10).toFixed(2)
    : (+(form.montoTotal || 0) * 0.10).toFixed(2);

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Complemento de Retenciones CFDI</h1>
          <p>Genera comprobantes de retención de ISR/IVA para honorarios, arrendamiento, dividendos e intereses.</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => load(companyId)}><RefreshCw size={16} /></button>
          <button className="btn btn-primary flex items-center gap-2" onClick={() => setTab('nueva')}><Plus size={16} /> Nueva Retención</button>
        </div>
      </header>

      <div className="flex gap-2 mb-6 border-b border-surface-3">
        {([['lista','Lista'], ['nueva','Nueva']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === id ? 'border-primary-500 text-primary-400' : 'border-transparent text-muted hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'lista' && (
        <div className="panel">
          <div className="flex gap-3 mb-4">
            <select className="input w-32" value={ejercicio} onChange={e => { setEjercicio(e.target.value); load(companyId, e.target.value); }}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {loading ? <div className="spinner mx-auto" /> : (
            <div className="table-responsive">
              <table className="report-table">
                <thead><tr><th>Folio</th><th>Tipo</th><th>Receptor</th><th>Período</th><th className="text-right">Monto</th><th className="text-right">ISR Ret.</th><th className="text-right">IVA Ret.</th><th>Estado</th><th /></tr></thead>
                <tbody>
                  {data.map(r => (
                    <tr key={r.id}>
                      <td className="font-mono font-bold">{r.folio}</td>
                      <td><span className="badge badge-info text-xs">{r.tipo}</span></td>
                      <td>
                        <div className="font-medium text-sm">{r.receptorNombre}</div>
                        <div className="text-xs text-muted">{r.receptorRfc}</div>
                      </td>
                      <td className="text-xs">{MESES[(r.periodo ?? 1) - 1]} {r.ejercicio}</td>
                      <td className="text-right">{fmt(r.montoTotal)}</td>
                      <td className="text-right font-bold text-danger">{fmt(r.isrRetenido)}</td>
                      <td className="text-right">{fmt(r.ivaRetenido)}</td>
                      <td><span className={`badge ${r.status === 'TIMBRADO' ? 'badge-success' : 'badge-warning'}`}>{r.status}</span></td>
                      <td>
                        <div className="flex gap-1 justify-end">
                          <button className="btn btn-ghost btn-sm p-1 text-primary-400" title="Descargar XML" onClick={() => downloadXml(r.id)} disabled={downloadingId === r.id}>
                            <Download size={14} />
                          </button>
                          <button className="btn btn-ghost btn-sm p-1 text-danger" onClick={() => del(r.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length === 0 && <p className="text-center text-muted py-8">No hay retenciones registradas.</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'nueva' && (
        <div className="panel space-y-6 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de Retención</label>
              <select className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Período</label>
              <div className="flex gap-2">
                <select className="input" value={form.periodo} onChange={e => setForm(p => ({ ...p, periodo: e.target.value }))}>
                  {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
                <select className="input w-28" value={form.ejercicio} onChange={e => setForm(p => ({ ...p, ejercicio: e.target.value }))}>
                  {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label">RFC Receptor</label>
              <input className="input" placeholder="XAXX010101000" value={form.receptorRfc} onChange={e => setForm(p => ({ ...p, receptorRfc: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="label">Nombre / Razón Social</label>
              <input className="input" value={form.receptorNombre} onChange={e => setForm(p => ({ ...p, receptorNombre: e.target.value }))} />
            </div>
            <div>
              <label className="label">Monto Total de la Operación</label>
              <input type="number" className="input" placeholder="0.00" value={form.montoTotal} onChange={e => setForm(p => ({ ...p, montoTotal: e.target.value, isrRetenido: (+(e.target.value || 0) * 0.10).toFixed(2) }))} />
            </div>
            <div>
              <label className="label">ISR Retenido (10% estimado)</label>
              <input type="number" className="input" value={form.isrRetenido || isrEstimado} onChange={e => setForm(p => ({ ...p, isrRetenido: e.target.value }))} />
            </div>
            <div>
              <label className="label">IVA Retenido (si aplica)</label>
              <input type="number" className="input" placeholder="0.00" value={form.ivaRetenido} onChange={e => setForm(p => ({ ...p, ivaRetenido: e.target.value }))} />
            </div>
            <div>
              <label className="label">IEPS Retenido (si aplica)</label>
              <input type="number" className="input" placeholder="0.00" value={form.iepsRetenido} onChange={e => setForm(p => ({ ...p, iepsRetenido: e.target.value }))} />
            </div>
          </div>

          <div className="p-4 bg-surface-2 rounded-xl text-sm">
            <p className="text-muted mb-2">Resumen de retención:</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-xs text-muted">Monto operación</div><div className="font-bold">{fmt(+(form.montoTotal||0))}</div></div>
              <div><div className="text-xs text-muted">ISR retenido</div><div className="font-bold text-danger">{fmt(+(form.isrRetenido||isrEstimado))}</div></div>
              <div><div className="text-xs text-muted">Pago neto</div><div className="font-bold text-success">{fmt(+(form.montoTotal||0) - +(form.isrRetenido||isrEstimado))}</div></div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn btn-secondary" onClick={() => setTab('lista')}>Cancelar</button>
            <button className="btn btn-primary flex items-center gap-2" onClick={save} disabled={saving || !form.receptorRfc || !form.montoTotal}>
              <Percent size={16} /> {saving ? 'Guardando...' : 'Registrar Retención'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
