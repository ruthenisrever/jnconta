'use client';

import React, { useState, useEffect } from 'react';
import { XCircle, Search, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const MOTIVOS_CANCELACION = [
  { code: '01', label: '01 — Comprobante emitido con errores con relación' },
  { code: '02', label: '02 — Comprobante emitido con errores sin relación' },
  { code: '03', label: '03 — No se llevó a cabo la operación' },
  { code: '04', label: '04 — Operación nominativa relacionada en la factura global' },
];

export default function CancelacionPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    apiFetch(`/api/invoices?companyId=${cid}`)
      .then(r => r.json())
      .then(d => { setInvoices(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCancel = async (invoiceId: string) => {
    const motivo = motivos[invoiceId];
    if (!motivo) return alert('Selecciona el motivo de cancelación (SAT)');
    if (!confirm('¿Confirmas la cancelación de esta factura ante el SAT?')) return;
    setCancelling(invoiceId);
    try {
      const res = await apiFetch(`/api/invoices/${invoiceId}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ motivo, companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'CANCELADA' } : i));
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setCancelling(null);
    }
  };

  const filtered = invoices.filter(i =>
    i.status === 'VIGENTE' &&
    (search === '' ||
      (i.uuid || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.clientName || i.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      `${i.series}${i.folio}`.toLowerCase().includes(search.toLowerCase()))
  );

  const fmt = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Cancelación de CFDI</h1>
          <p>Cancela facturas ante el SAT usando los motivos establecidos en el Artículo 29-A CFF.</p>
        </div>
      </header>

      <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 flex gap-3 mb-8">
        <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-300 space-y-1">
          <p className="font-bold">Requisitos para cancelar ante el SAT:</p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li>La factura debe haber sido timbrada (contar con UUID del SAT)</li>
            <li>Si el receptor la usó para deducir impuestos, debe aprobar la cancelación en su buzón tributario (plazo 3 días hábiles)</li>
            <li>Facturas con motivo 01 y 02 requieren CSD vigente para enviar la solicitud al SAT</li>
          </ul>
        </div>
      </div>

      {/* BUSQUEDA */}
      <div className="panel mb-6">
        <div className="flex gap-3 items-center">
          <Search size={18} className="text-muted" />
          <input
            type="text"
            className="input flex-1"
            placeholder="Buscar por UUID, cliente o folio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="panel">
        <h3 className="font-bold mb-6 flex items-center gap-2">
          <XCircle size={18} className="text-danger" /> Facturas Vigentes — Selecciona para Cancelar
        </h3>

        {loading ? (
          <div className="py-12 text-center text-muted">Cargando facturas...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-surface-3 rounded-2xl text-muted">
            No hay facturas vigentes{search ? ' que coincidan con la búsqueda' : ''}.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((inv: any) => (
              <div key={inv.id} className="p-4 bg-surface-2 rounded-xl border border-surface-3 hover:border-danger/30 transition-all">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold">{inv.series}{inv.folio}</span>
                      {inv.uuid && (
                        <span className="text-xs font-mono text-muted">{inv.uuid.slice(0, 18)}...</span>
                      )}
                      <span className="badge badge-success text-[10px]">VIGENTE</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted">
                      <span>{inv.clientName || inv.client?.name}</span>
                      <span>{new Date(inv.date).toLocaleDateString('es-MX')}</span>
                      <span className="font-bold text-white">{fmt(inv.total)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2 md:items-center">
                    <select
                      className="input text-sm"
                      value={motivos[inv.id] || ''}
                      onChange={e => setMotivos(prev => ({ ...prev, [inv.id]: e.target.value }))}
                    >
                      <option value="">Motivo SAT...</option>
                      {MOTIVOS_CANCELACION.map(m => (
                        <option key={m.code} value={m.code}>{m.label}</option>
                      ))}
                    </select>
                    <button
                      className="btn btn-sm bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 flex items-center gap-1 whitespace-nowrap"
                      onClick={() => handleCancel(inv.id)}
                      disabled={cancelling === inv.id}
                    >
                      <XCircle size={14} />
                      {cancelling === inv.id ? 'Cancelando...' : 'Cancelar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
