'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, FileCode, CheckCircle, XCircle, AlertCircle,
  RefreshCw, BookOpen, ShoppingCart, Search, Download, X
} from 'lucide-react';
import Link from 'next/link';

import { apiFetch } from '@/lib/api';

const getCompanyId = () => typeof window !== 'undefined' ? (localStorage.getItem('companyId') || '') : '';

interface XmlDoc {
  id: string; filename: string; uuid?: string; type: string;
  emisorRfc: string; emisorName: string; receptorRfc: string; receptorName: string;
  serie?: string; folio?: string; subtotal: number; tax: number; total: number;
  currency: string; exchangeRate: number; date: string;
  status: string; satStatus?: string; journalId?: string; createdAt: string;
  journal?: { id: string; number: string; concept: string };
}

const fmt = (n: number, c = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: c, minimumFractionDigits: 2 }).format(n);

const SAT_COLORS: Record<string, string> = {
  Vigente: 'badge-success', Cancelado: 'badge-danger',
  'No Encontrado': 'badge-warning', 'Timeout SAT': 'badge-muted',
};
const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: 'badge-warning', IMPORTADA: 'badge-success', RECHAZADA: 'badge-danger',
};

export default function XmlSatPage() {
  const [docs, setDocs] = useState<XmlDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocs(); }, []);

  async function fetchDocs() {
    setLoading(true);
    const cId = getCompanyId();
    try {
      const r = await apiFetch(`/api/xml-sat?companyId=${cId}`);
      if (r.ok) setDocs(await r.json());
    } catch {}
    setLoading(false);
  }

  async function uploadFiles(files: FileList) {
    setUploading(true);
    const cId = JSON.parse(localStorage.getItem('jnconta_user') || '{}').companyId || '';
    const token = localStorage.getItem('jnconta_token') || '';

    for (const file of Array.from(files)) {
      if (!file.name.endsWith('.xml')) continue;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('companyId', getCompanyId());
      try {
        await apiFetch('/api/xml-sat/upload', {
          method: 'POST',
          body: fd,
        });
      } catch {}
    }
    await fetchDocs();
    setUploading(false);
  }

  async function validateSat(id: string) {
    setValidating(id);
    try {
      const r = await apiFetch(`/api/xml-sat/validate/${id}`, { method: 'POST' });
      const data = await r.json();
      setDocs(prev => prev.map(d => d.id === id ? { ...d, satStatus: data.satStatus } : d));
    } catch {}
    setValidating(null);
  }

  async function autoJournal(id: string) {
    setProcessing(id);
    const cId = getCompanyId();
    try {
      const r = await apiFetch(`/api/xml-sat/auto-journal/${id}?companyId=${cId}`, { method: 'POST' });
      if (r.ok) {
        setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'IMPORTADA' } : d));
        alert('✅ Póliza generada correctamente. Ve a Contabilidad > Pólizas para verla.');
      } else {
        const e = await r.json();
        alert('⚠️ ' + (e.message || 'Error generando póliza'));
      }
    } catch {}
    setProcessing(null);
  }
  async function registerCxP(id: string) {
    setProcessing(id);
    const cId = getCompanyId();
    try {
      const r = await apiFetch(`/api/xml-sat/register-cxp/${id}?companyId=${cId}`, { method: 'POST' });
      if (r.ok) {
        setDocs(prev => prev.map(d => d.id === id ? { ...d, status: 'IMPORTADA' } : d));
        alert('✅ Registrado como CxP. Ve a Compras para ver la factura.');
      }
    } catch {}
    setProcessing(null);
  }

  async function handleBatchAutoJournal() {
    if (selectedIds.length === 0) return;
    setBatchProcessing(true);
    const cId = getCompanyId();
    try {
      const r = await apiFetch(`/api/xml-sat/batch-auto-journal?companyId=${cId}`, {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await r.json();
      alert(`✅ Procesamiento completado.\nÉxito: ${data.processed}\nErrores: ${data.errors.length}`);
      await fetchDocs();
      setSelectedIds([]);
    } catch (e) {
      alert('Error en el procesamiento por lotes');
    }
    setBatchProcessing(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(d => d.id));
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  }, []);

  const filtered = docs.filter(d =>
    (typeFilter === '' || d.type === typeFilter) &&
    (filter === '' || d.emisorName.toLowerCase().includes(filter.toLowerCase()) || d.emisorRfc.includes(filter.toUpperCase()) || (d.uuid || '').includes(filter))
  );

  const totalIVA_Acreditable = docs.filter(d => d.type === 'RECIBIDA').reduce((s, d) => s + d.tax, 0);
  const totalIVA_Trasladado = docs.filter(d => d.type === 'EMITIDA').reduce((s, d) => s + d.tax, 0);
  const netIVA = totalIVA_Trasladado - totalIVA_Acreditable;

  return (
    <>
      <header className="main-header">
        <div className="header-title">
          <h1>Gestor XML SAT <span className="badge badge-info" style={{fontSize: 10, verticalAlign: 'middle', marginLeft: 8}}>Paridad CONTPAQ i</span></h1>
          <p>Importa CFDIs, valida ante SAT y genera pólizas automáticamente</p>
        </div>
        <div className="header-actions">
          <div className="search-wrapper"><Search size={15} /><input className="search-input" placeholder="Buscar RFC, UUID, emisor..." value={filter} onChange={e => setFilter(e.target.value)} /></div>
          <button className="btn btn-ghost btn-icon" onClick={fetchDocs}><RefreshCw size={16} /></button>
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} />Subir XMLs
          </button>
          <input ref={fileRef} type="file" accept=".xml" multiple style={{ display: 'none' }} onChange={e => e.target.files && uploadFiles(e.target.files)} />
        </div>
      </header>

      <main className="main-content">
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          <div className="kpi-card" style={{ borderLeft: '4px solid var(--info)' }}>
             <p className="kpi-card-label">IVA Trasladado (Ventas)</p>
             <p className="kpi-card-value" style={{fontSize:18, color: 'var(--info)'}}>{fmt(totalIVA_Trasladado)}</p>
          </div>
          <div className="kpi-card" style={{ borderLeft: '4px solid var(--warning)' }}>
             <p className="kpi-card-label">IVA Acreditable (Gastos)</p>
             <p className="kpi-card-value" style={{fontSize:18, color: 'var(--warning)'}}>{fmt(totalIVA_Acreditable)}</p>
          </div>
          <div className="kpi-card" style={{ borderLeft: `4px solid ${netIVA > 0 ? 'var(--danger)' : 'var(--success)'}` }}>
             <p className="kpi-card-label">{netIVA > 0 ? 'IVA a Pagar (Estimado)' : 'IVA a Favor (Estimado)'}</p>
             <p className="kpi-card-value" style={{fontSize:18, color: netIVA > 0 ? 'var(--danger)' : 'var(--success)'}}>{fmt(Math.abs(netIVA))}</p>
          </div>
          <div className="kpi-card" style={{ borderLeft: '4px solid var(--success)' }}>
             <p className="kpi-card-label">Documentos Polizados</p>
             <p className="kpi-card-value" style={{fontSize:18, color: 'var(--success)'}}>{docs.filter(d=>d.journalId).length} / {docs.length}</p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--primary-400)' : 'var(--border-default)'}`,
            borderRadius: 16, padding: '32px', textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'rgba(27,152,224,0.06)' : 'var(--surface-1)',
            transition: 'all 0.2s ease', marginBottom: 20,
          }}
        >
          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--primary-300)' }}>
              <div style={{ width: 20, height: 20, border: '2px solid rgba(27,152,224,0.3)', borderTop: '2px solid var(--primary-400)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontWeight: 600 }}>Procesando XMLs...</span>
            </div>
          ) : (
            <>
              <FileCode size={40} style={{ color: 'var(--primary-400)', marginBottom: 12 }} />
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', fontSize: 16 }}>
                {dragOver ? 'Suelta los archivos aquí' : 'Arrastra aquí tus archivos XML del SAT'}
              </p>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>
                O haz clic para seleccionar • Compatible con CFDI 3.3 y 4.0 • Hasta 20 archivos por lote
              </p>
            </>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
          {['', 'EMITIDA', 'RECIBIDA'].map(t => (
            <button key={t} className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTypeFilter(t)}>
              {t || 'Todos'} {t && <span style={{marginLeft:6,opacity:0.7}}>{docs.filter(d=>d.type===t).length}</span>}
            </button>
          ))}
        </div>

        {/* Batch Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="panel animate-in" style={{ marginBottom: 20, padding: '12px 20px', background: 'var(--primary-900)', color: 'white', border: '1px solid var(--primary-400)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle size={18} />
              <span style={{ fontWeight: 600 }}>{selectedIds.length} documentos seleccionados</span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={handleBatchAutoJournal} disabled={batchProcessing}>
                {batchProcessing ? 'Procesando...' : `Generar ${selectedIds.length} Pólizas`}
              </button>
              <button className="btn btn-sm btn-ghost" style={{ color: 'white' }} onClick={() => setSelectedIds([])}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="panel">
          <div className="panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
               <p className="panel-title">CFDIs Importados</p>
               <p className="panel-subtitle">{filtered.length} documentos encontrados</p>
            </div>
          </div>
          <div className="panel-body table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /></th>
                  <th>Archivo</th><th>Tipo</th><th>Emisor</th><th>Receptor</th><th>UUID</th><th>Fecha</th><th>Total</th><th>Estado</th><th>SAT</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr className="loading-row"><td colSpan={11}>Cargando...</td></tr>
                  : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        <FileCode size={32} style={{ marginBottom: 12, opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                        Aún no hay XMLs importados. Arrastra tus archivos CFDIs arriba.
                      </td>
                    </tr>
                  )
                  : filtered.map(doc => (
                    <tr key={doc.id} className={selectedIds.includes(doc.id) ? 'row-selected' : ''} style={{ background: selectedIds.includes(doc.id) ? 'rgba(27,152,224,0.05)' : '' }}>
                      <td><input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => toggleSelect(doc.id)} /></td>
                      <td style={{ fontSize: 11, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.filename}>{doc.filename}</td>
                      <td><span className={`badge ${doc.type === 'EMITIDA' ? 'badge-info' : 'badge-warning'}`}>{doc.type}</span></td>
                      <td><div style={{ fontSize: 11 }}><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.emisorName || '—'}</div><div style={{ color: 'var(--text-muted)' }}>{doc.emisorRfc}</div></div></td>
                      <td><div style={{ fontSize: 11 }}><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.receptorName || '—'}</div><div style={{ color: 'var(--text-muted)' }}>{doc.receptorRfc}</div></div></td>
                      <td style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.uuid}>{doc.uuid || 'Sin UUID'}</td>
                      <td style={{ fontSize: 11 }}>{doc.date ? new Date(doc.date).toLocaleDateString('es-MX') : '—'}</td>
                      <td className="td-amount" style={{ fontWeight: 700 }}>{fmt(doc.total, doc.currency)}</td>
                      <td><span className="badge badge-primary" style={{fontSize:9}}>{doc.currency}</span></td>
                      <td><span className={`badge ${STATUS_COLORS[doc.status] || 'badge-muted'}`}>{doc.status}</span></td>
                      <td>
                        {doc.satStatus ? (
                          <span className={`badge ${SAT_COLORS[doc.satStatus] || 'badge-muted'}`}>{doc.satStatus}</span>
                        ) : (
                          <button className="btn btn-ghost btn-sm" style={{padding:'2px 6px', fontSize:10}} onClick={() => validateSat(doc.id)} disabled={validating === doc.id}>
                            {validating === doc.id ? '...' : 'Recuperar'}
                          </button>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {doc.journal ? (
                            <Link href="/contabilidad" className="badge badge-success" style={{ cursor: 'pointer', textDecoration: 'none' }} title={doc.journal.concept}>
                               Póliza #{doc.journal.number}
                            </Link>
                          ) : (
                            <>
                              <button className="btn btn-sm btn-primary" style={{padding:'4px 8px', fontSize:11}} title="Generar póliza contable" onClick={() => autoJournal(doc.id)} disabled={processing === doc.id}>
                                <BookOpen size={12} /> {processing === doc.id ? '...' : 'Generar Póliza'}
                              </button>
                              {doc.type === 'RECIBIDA' && (
                                <button className="btn btn-sm btn-secondary" style={{padding:'4px 8px', fontSize:11}} title="Registrar como CxP" onClick={() => registerCxP(doc.id)} disabled={processing === doc.id}>
                                  <ShoppingCart size={12} /> CxP
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
