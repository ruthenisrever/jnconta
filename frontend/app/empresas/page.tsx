'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Plus, ArrowRight, Search,
  Briefcase, Globe, Mail,
  ShieldCheck
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function EmpresasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', rfc: '', email: '' });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/companies');
      const data = await res.json();
      setCompanies(data);
    } catch (e) {
      console.error('Error fetching companies:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectCompany = (company: any) => {
    localStorage.setItem('companyId', company.id);
    localStorage.setItem('companyName', company.name);
    // Force a reload or navigation to dashboard
    router.push('/');
    setTimeout(() => window.location.reload(), 100);
  };

  const [adding, setAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAddCompany = async () => {
    setErrorMsg('');
    setAdding(true);
    try {
      const res = await apiFetch('/api/companies', {
        method: 'POST',
        body: JSON.stringify(newCompany),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setNewCompany({ name: '', rfc: '', email: '' });
        fetchCompanies();
        
        // Auto select the new company
        localStorage.setItem('companyId', data.id);
        localStorage.setItem('companyName', data.name);
        router.push('/');
        setTimeout(() => window.location.reload(), 500);
      } else {
        setErrorMsg(data.message || 'Error al crear la empresa');
      }
    } catch (e: any) {
      console.error('Error adding company:', e);
      setErrorMsg('Error de red al crear empresa');
    } finally {
      setAdding(false);
    }
  };

  const filteredCompanies = Array.isArray(companies) ? companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.rfc.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="main-content min-h-screen bg-surface-1">
      <header className="page-header mb-12">
        <div className="page-header-left">
           <div className="flex items-center gap-3">
             <div className="p-3 bg-primary-600/20 rounded-xl">
               <Briefcase size={28} className="text-primary-400" />
             </div>
             <div>
               <h1 className="text-2xl font-black tracking-tight">Panel del Despacho</h1>
               <p className="text-muted">Administra las entidades contables de todos tus clientes.</p>
             </div>
           </div>
        </div>
        <div className="header-actions">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary-400 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Buscar empresa por nombre o RFC..." 
                className="search-input pl-10 w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
           </div>
           <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
             <Plus size={18} /> Nueva Empresa Cliente
           </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
           <div className="spinner lg mb-4" />
           <p className="text-muted font-bold animate-pulse">Cargando cartera de clientes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredCompanies.map((company, i) => (
             <div 
               key={company.id} 
               className="company-card group cursor-pointer"
               onClick={() => selectCompany(company)}
               style={{ animationDelay: `${i * 50}ms` }}
             >
                <div className="company-card-inner glass p-6 rounded-2xl border border-border-subtle hover:border-primary-500/50 transition-all duration-300 shadow-lg hover:shadow-primary/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight size={20} className="text-primary-400" />
                   </div>

                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-xl bg-surface-3 flex items-center justify-center overflow-hidden border border-border-strong group-hover:scale-105 transition-transform duration-500">
                         {company.logo ? (
                           <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                         ) : (
                           <Building2 size={32} className="text-muted" />
                         )}
                      </div>
                      <div className="flex-1 min-w-0">
                         <h3 className="font-bold text-lg truncate group-hover:text-primary-300 transition-colors">{company.name}</h3>
                         <span className="badge badge-muted text-[10px] tracking-widest">{company.rfc}</span>
                      </div>
                   </div>

                   <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-xs text-muted">
                         <Globe size={14} className="text-primary-500/50" />
                         <span>Régimen: {company.regimenFiscal || 'General de Ley'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted">
                         <Mail size={14} className="text-primary-500/50" />
                         <span className="truncate">{company.email || 'Sin correo configurado'}</span>
                      </div>
                   </div>

                   <div className="flex justify-between items-center pt-4 border-t border-border-subtle">
                      <div className="flex items-center gap-1 text-[10px] text-success font-black uppercase">
                         <ShieldCheck size={12} /> Estatus Activo
                      </div>
                      <span className="text-[10px] text-muted font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                         CLI-ID: {company.id.substring(0, 8)}
                      </span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* MODAL NUEVA EMPRESA */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="glass p-8 rounded-3xl w-full max-w-md border border-border-strong shadow-2xl animate-in zoom-in-95 duration-300">
              <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                <Plus size={24} className="text-primary-400" /> Alta de Empresa Cliente
              </h2>
              
              {errorMsg && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                 <div className="form-group">
                   <label className="text-xs font-bold text-muted mb-1 block">Nombre de la Empresa</label>
                   <input 
                     className="search-input w-full" 
                     placeholder="Ej. Comercializadora del Norte"
                     value={newCompany.name}
                     onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                   />
                 </div>
                 <div className="form-group">
                   <label className="text-xs font-bold text-muted mb-1 block">RFC Propietario</label>
                   <input 
                     className="search-input w-full" 
                     placeholder="RFC de 12 o 13 posiciones"
                     value={newCompany.rfc}
                     onChange={e => setNewCompany({...newCompany, rfc: e.target.value.toUpperCase()})}
                   />
                 </div>
                 <div className="form-group">
                   <label className="text-xs font-bold text-muted mb-1 block">Correo de contacto</label>
                   <input 
                     className="search-input w-full" 
                     placeholder="contacto@empresa.com"
                     value={newCompany.email}
                     onChange={e => setNewCompany({...newCompany, email: e.target.value})}
                   />
                 </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                 <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={adding}>Cancelar</button>
                 <button 
                   className="btn btn-primary" 
                   onClick={handleAddCompany} 
                   disabled={!newCompany.name || !newCompany.rfc || adding}
                 >
                   {adding ? 'Creando...' : 'Registrar e Ingresar'}
                 </button>
              </div>
           </div>
        </div>
      )}


      <style jsx>{`
        .glass { background: rgba(16, 24, 39, 0.7); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); }
        .company-card { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
