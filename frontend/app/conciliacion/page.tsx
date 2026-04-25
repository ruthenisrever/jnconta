'use client';

import React, { useState, useEffect } from 'react';
import { 
  Landmark, Upload, Search, FileText, 
  ChevronRight, ArrowRight, Library, 
  RefreshCw, Layers, Database, Info
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import ConciliadorWorkspace from '@/components/ConciliadorWorkspace';

export default function ConciliacionPage() {
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState({ csv: '', bankType: 'GENERIC' });

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    setCompanyId(cid);
    fetchBanks(cid);
  }, []);

  async function fetchBanks(cid: string) {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/banks?companyId=${cid}`);
      const data = await res.json();
      setBankAccounts(data);
      if (data.length > 0) setSelectedBankId(data[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleImport = async () => {
    if (!selectedBankId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/reconciliation/import/${selectedBankId}`, {
        method: 'POST',
        body: JSON.stringify(importData)
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Importación completada: ${result.count} movimientos nuevos, ${result.duplicates} duplicados omitidos.`);
        setShowImport(false);
        setImportData({ csv: '', bankType: 'GENERIC' });
        // Recargar el workspace (el componente secundario se recargará por la prop bankAccountId)
      }
    } catch (e) {
      alert('Error al importar');
    } finally {
      setLoading(false);
    }
  };

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId);

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                <Layers size={24} />
              </div>
              <div>
                <h1>Banco vs Libros</h1>
                <p>Conciliación masiva y detección inteligente de movimientos bancarios</p>
              </div>
           </div>
        </div>
        <div className="header-actions">
           <div className="flex bg-surface-2 p-1 rounded-xl border border-surface-3">
              {bankAccounts.map(bank => (
                <button 
                  key={bank.id}
                  onClick={() => setSelectedBankId(bank.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedBankId === bank.id ? 'bg-primary-500 text-white shadow-lg' : 'text-muted hover:bg-surface-3'}`}
                >
                  {bank.name}
                </button>
              ))}
           </div>
           <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowImport(true)}>
             <Upload size={16} /> Importar Estado
           </button>
        </div>
      </header>

      {selectedBankId ? (
        <ConciliadorWorkspace companyId={companyId} bankAccountId={selectedBankId} />
      ) : (
        <div className="panel p-20 text-center opacity-50 border-dashed border-2">
           <RefreshCw className="m-auto mb-4 animate-spin text-muted" size={48} />
           <h3>Cargando cuentas bancarias...</h3>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>Importar Movimientos del Banco</h2>
              <button onClick={() => setShowImport(false)} className="btn btn-ghost btn-icon">✕</button>
            </div>
            <div className="modal-body p-6 space-y-4">
              <div className="form-group">
                <label>Institución Bancaria</label>
                <select value={importData.bankType} onChange={e => setImportData({...importData, bankType: e.target.value})}>
                  <option value="GENERIC">Genérico (CSV: Fecha,Concepto,Importe)</option>
                  <option value="BBVA">BBVA (Excel/CSV)</option>
                  <option value="SANTANDER">Santander (CSV)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Contenido del Archivo (CSV / Texto)</label>
                <textarea 
                  className="h-48 font-mono text-xs" 
                  value={importData.csv} 
                  onChange={e => setImportData({...importData, csv: e.target.value})}
                  placeholder="2026-04-01,PAGO DE NOMINA,-15400.00&#10;2026-04-02,DEPOSITO CLIENTE ABC,5000.00"
                />
              </div>
              <div className="p-3 bg-primary-900/10 border border-primary-500/20 rounded-lg text-[10px] text-primary-300">
                <Info size={14} className="inline mr-2" />
                No te preocupes por duplicados. El sistema filtrará automáticamente los movimientos que ya hayan sido importados previamente.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowImport(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleImport}>Iniciar Importación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
