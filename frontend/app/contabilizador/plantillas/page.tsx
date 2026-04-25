'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileJson, Plus, Save, Trash2, ArrowLeft, 
  Settings, ChevronRight, Calculator,
  Library, AlertCircle, CheckCircle2
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export default function PlantillasContabilizadorPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    setCompanyId(cid);
    fetchData(cid);
  }, []);

  const fetchData = async (cid: string) => {
    setLoading(true);
    try {
      const [tRes, aRes] = await Promise.all([
        apiFetch(`/api/templates?companyId=${cid}`),
        apiFetch(`/api/accounts?companyId=${cid}`)
      ]);
      setTemplates(await tRes.json());
      setAccounts(await aRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTemplate = () => {
    setSelectedTemplate({
      name: 'Nueva Plantilla',
      type: 'DIARIO',
      description: '',
      companyId,
      entries: [
        { accountType: 'FIXED', accountId: '', action: 'DEBIT', amountSource: 'SUBTOTAL', position: 1 },
        { accountType: 'FIXED', accountId: '', action: 'CREDIT', amountSource: 'TOTAL', position: 2 }
      ]
    });
  };

  const handleSave = async () => {
    try {
      const method = selectedTemplate.id ? 'PUT' : 'POST';
      const url = selectedTemplate.id ? `/api/templates/${selectedTemplate.id}` : '/api/templates';
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(selectedTemplate)
      });
      
      if (res.ok) {
        alert('Asiento Modelo guardado correctamente.');
        fetchData(companyId);
        setSelectedTemplate(null);
      }
    } catch (e) {
      alert('Error al guardar plantilla');
    }
  };

  const addEntry = () => {
    setSelectedTemplate({
      ...selectedTemplate,
      entries: [
        ...selectedTemplate.entries,
        { accountType: 'FIXED', accountId: '', action: 'DEBIT', amountSource: 'TAX', position: selectedTemplate.entries.length + 1 }
      ]
    });
  };

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
           <Link href="/contabilizador" className="text-muted hover:text-white transition-colors">
              <ArrowLeft size={20} className="mb-2" />
           </Link>
           <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600/20 rounded-lg">
              <Settings className="text-primary-400" size={24} />
            </div>
            <div>
              <h1>Configurador de Asientos Modelo</h1>
              <p>Define reglas dinámicas para automatizar tu contabilidad.</p>
            </div>
          </div>
        </div>
        <div className="header-actions">
           <button className="btn btn-primary flex items-center gap-2" onClick={handleNewTemplate}>
              <Plus size={16} />
              Crar Asiento Modelo
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LISTA DE PLANTILLAS */}
        <div className="md:col-span-1 flex flex-col gap-4">
           {templates.map((t) => (
             <div 
               key={t.id} 
               onClick={() => setSelectedTemplate(t)}
               className={`panel p-4 cursor-pointer hover:border-primary-500/50 transition-all ${selectedTemplate?.id === t.id ? 'border-primary-500 ring-1 ring-primary-500' : ''}`}
             >
                <div className="flex justify-between items-start">
                   <h3 className="text-sm font-bold">{t.name}</h3>
                   <span className="text-[10px] bg-surface-3 px-1.5 py-0.5 rounded text-muted uppercase font-bold">{t.type}</span>
                </div>
                <p className="text-xs text-muted mt-1">{t.description || 'Sin descripción'}</p>
                <div className="mt-3 text-[10px] text-primary-400 flex items-center gap-1">
                   <Calculator size={10} />
                   {t.entries.length} Partidas configuradas
                </div>
             </div>
           ))}
           {templates.length === 0 && !loading && (
             <div className="p-8 text-center text-muted border-2 border-dashed border-surface-3 rounded-xl">
                <Library size={32} className="m-auto mb-2 opacity-20" />
                <p className="text-xs">No hay asientos modelo creados.</p>
             </div>
           )}
        </div>

        {/* EDITOR DE PLANTILLA */}
        <div className="md:col-span-2">
           {selectedTemplate ? (
             <div className="panel animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-lg font-bold">Configuración de Asiento</h2>
                   <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTemplate(null)}>Cancelar</button>
                      <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={handleSave}>
                         <Save size={14} />
                         Guardar
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                   <div className="input-field">
                      <label>Nombre del Asiento</label>
                      <input 
                        type="text" 
                        value={selectedTemplate.name} 
                        onChange={(e) => setSelectedTemplate({...selectedTemplate, name: e.target.value})}
                      />
                   </div>
                   <div className="input-field">
                      <label>Tipo de Póliza</label>
                      <select 
                        value={selectedTemplate.type}
                        onChange={(e) => setSelectedTemplate({...selectedTemplate, type: e.target.value})}
                      >
                         <option value="INGRESO">INGRESO</option>
                         <option value="EGRESO">EGRESO</option>
                         <option value="DIARIO">DIARIO</option>
                      </select>
                   </div>
                </div>

                <div className="mb-6">
                   <div className="flex justify-between items-center mb-4">
                      <label className="text-xs font-bold uppercase text-muted">Definición de Partidas</label>
                      <button className="text-primary-400 text-xs flex items-center gap-1 hover:underline" onClick={addEntry}>
                        <Plus size={12} /> Añadir Movimiento
                      </button>
                   </div>

                   <div className="table-responsive border border-surface-3 rounded-lg overflow-hidden">
                      <table className="report-table">
                         <thead>
                            <tr>
                               <th>Mov.</th>
                               <th>Cuenta</th>
                               <th>Acción</th>
                               <th>Monto de XML</th>
                               <th></th>
                            </tr>
                         </thead>
                         <tbody>
                            {selectedTemplate.entries.map((entry: any, i: number) => (
                               <tr key={i}>
                                  <td className="text-xs text-muted w-12">{i+1}</td>
                                  <td>
                                     <select 
                                       className="search-input text-[10px] py-1"
                                       value={entry.accountId}
                                       onChange={(e) => {
                                         const entries = [...selectedTemplate.entries];
                                         entries[i].accountId = e.target.value;
                                         setSelectedTemplate({...selectedTemplate, entries});
                                       }}
                                     >
                                        <option value="">Seleccionar Cuenta...</option>
                                        {accounts.map(acc => (
                                          <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                                        ))}
                                     </select>
                                  </td>
                                  <td>
                                     <select 
                                       className="search-input text-[10px] py-1"
                                       value={entry.action}
                                       onChange={(e) => {
                                         const entries = [...selectedTemplate.entries];
                                         entries[i].action = e.target.value;
                                         setSelectedTemplate({...selectedTemplate, entries});
                                       }}
                                     >
                                        <option value="DEBIT">CARGO (Dr)</option>
                                        <option value="CREDIT">ABONO (Cr)</option>
                                     </select>
                                  </td>
                                  <td>
                                     <select 
                                        className="search-input text-[10px] py-1"
                                        value={entry.amountSource}
                                        onChange={(e) => {
                                          const entries = [...selectedTemplate.entries];
                                          entries[i].amountSource = e.target.value;
                                          setSelectedTemplate({...selectedTemplate, entries});
                                        }}
                                     >
                                        <option value="SUBTOTAL">SUBTOTAL</option>
                                        <option value="TAX">IVA (16%)</option>
                                        <option value="TOTAL">TOTAL</option>
                                        <option value="DISCOUNT">DESCUENTO</option>
                                        <option value="RET_IVA">RET. IVA</option>
                                        <option value="RET_ISR">RET. ISR</option>
                                     </select>
                                  </td>
                                  <td>
                                     <button 
                                       className="text-danger hover:text-danger-light p-1"
                                       onClick={() => {
                                         const entries = selectedTemplate.entries.filter((_: any, idx: number) => idx !== i);
                                         setSelectedTemplate({...selectedTemplate, entries});
                                       }}
                                     >
                                        <Trash2 size={14} />
                                     </button>
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
           ) : (
             <div className="panel p-12 text-center border-dashed border-2 bg-transparent opacity-50">
                <FileJson size={64} className="m-auto mb-4 text-muted" />
                <h3 className="text-muted">Selecciona o crea un asiento modelo</h3>
                <p className="text-xs text-muted max-w-xs m-auto mt-2">
                   Los asientos modelo te permiten mapear los valores del XML directamente a tus cuentas contables preferidas.
                </p>
             </div>
           )}
        </div>
      </div>

      <style jsx>{`
         .panel { background: rgba(16, 24, 39, 0.4); backdrop-filter: blur(10px); }
         .animate-in { animation: fadeIn 0.3s ease-out; }
         @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
