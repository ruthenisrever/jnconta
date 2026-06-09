'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Edit3, 
  Trash2, Landmark, Briefcase, Mail, 
  Phone, Hash, ShieldCheck, CheckCircle2,
  RefreshCw, Plus
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showIncidenceModal, setShowIncidenceModal] = useState(false);
  const [selectedEmpForIncidence, setSelectedEmpForIncidence] = useState<any>(null);
  const [incidenceData, setIncidenceData] = useState({
    type: 'VACACIONES',
    days: 1,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  // Formulario de Nuevo Empleado
  const [formData, setFormData] = useState({
    code: '',
    firstName: '',
    lastName: '',
    rfc: '',
    curp: '',
    nss: '',
    email: '',
    hiredDate: new Date().toISOString().split('T')[0],
    jobPost: '',
    dailySalary: 300,
    sdi: 345.50, // Salario Diario Integrado estimado
    contractType: '01',
    regimeType: '02',
    periodicidad: '04',
    payType: 'MENSUAL',
    hourlyRate: 0,
    destajoRate: 0,
    companyId: ''
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch(`/api/nomina/employees?companyId=${cid}`);
      const data = await res.json();
      setEmployees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch('/api/nomina/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, companyId: cid })
      });
      if (res.ok) {
        setShowModal(false);
        loadEmployees();
      }
    } catch (err) {
      alert('Error al guardar empleado');
    }
  };

  const handleSubmitIncidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForIncidence) return;
    try {
      // Find active period or assume a dummy periodId for testing
      const cid = localStorage.getItem('companyId');
      const res = await apiFetch('/api/payroll/incidences', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: selectedEmpForIncidence.id,
          periodId: 'dummy-period-uuid', // Idealmente seleccionar periodo
          ...incidenceData
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al guardar incidencia');
      }
      alert('Incidencia guardada con éxito. Si son vacaciones, se descontó del saldo.');
      setShowIncidenceModal(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = employees.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.rfc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <h1>Catálogo de Personal</h1>
          <p>Administra los expedientes digitales y salarios de tus trabajadores.</p>
        </div>
        <div className="header-actions">
           <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
              <UserPlus size={18} /> Registrar Empleado
           </button>
        </div>
      </header>

      <div className="panel mb-8 border-surface-3">
         <div className="flex gap-4">
            <div className="relative flex-1">
               <Search className="absolute left-4 top-3 text-muted" size={20} />
               <input 
                 type="text" 
                 placeholder="Buscar por nombre, RFC o número de empleado..." 
                 className="search-input w-full pl-12"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <button className="btn btn-secondary px-6" onClick={loadEmployees}>
               <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filtered.length > 0 ? filtered.map((emp, idx) => (
            <div key={idx} className="panel group hover:border-primary-500/40 transition-all border-surface-3">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-surface-2 rounded-xl text-primary-400">
                     <Users size={24} />
                  </div>
                  <div className="text-[10px] bg-surface-3 px-2 py-1 rounded font-bold text-muted uppercase">
                     Emp. #{emp.code}
                  </div>
               </div>
               
               <h3 className="text-lg font-bold mb-1">{emp.firstName} {emp.lastName}</h3>
               <p className="text-xs text-muted mb-4 flex items-center gap-1">
                  <Briefcase size={12} /> {emp.jobPost || 'Puesto no asignado'}
               </p>

               <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-[11px]">
                     <span className="text-muted">RFC:</span>
                     <span className="font-mono font-bold">{emp.rfc}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                     <span className="text-muted">NSS:</span>
                     <span className="font-mono">{emp.nss || 'S/N'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] border-t border-surface-3 pt-2">
                     <span className="text-muted">Salario Diario:</span>
                     <span className="font-bold text-primary-400">${emp.dailySalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                     <span className="text-muted">SDI (IMSS):</span>
                     <span className="font-bold text-teal-400">${emp.sdi.toLocaleString()}</span>
                  </div>
               </div>

               <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm flex-1 border border-surface-3 hover:bg-primary-500/10">
                     <Edit3 size={14} className="mr-2" /> Editar
                  </button>
                  <button className="btn btn-ghost btn-sm flex-1 border border-surface-3 hover:bg-amber-500/10 text-amber-500"
                    onClick={() => { setSelectedEmpForIncidence(emp); setShowIncidenceModal(true); }}>
                     Incidencias
                  </button>
                  <button className="btn btn-ghost btn-sm text-error hover:bg-error/10">
                     <Trash2 size={14} />
                  </button>
               </div>
            </div>
         )) : (
            <div className="col-span-full py-32 text-center text-muted italic">
               No se encontraron empleados registrados.
            </div>
         )}
      </div>

      {/* MODAL: REGISTRO DE EMPLEADO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-4xl max-h-[90vh] overflow-y-auto border-surface-3 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8 pb-4 border-b border-surface-3">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                   <UserPlus className="text-primary-500" /> Registro de Personal
                </h2>
                <button className="text-muted hover:text-white" onClick={() => setShowModal(false)}>✕</button>
             </div>

             <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Número de Empleado</label>
                      <input type="text" className="search-input w-full" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required placeholder="001" />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Nombre(s)</label>
                      <input type="text" className="search-input w-full" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} required />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Apellidos</label>
                      <input type="text" className="search-input w-full" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} required />
                   </div>
                   
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest text-primary-400">RFC (SAT)</label>
                      <input type="text" className="search-input w-full font-mono uppercase" value={formData.rfc} onChange={(e) => setFormData({...formData, rfc: e.target.value})} required />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest text-primary-400">CURP</label>
                      <input type="text" className="search-input w-full font-mono uppercase" value={formData.curp} onChange={(e) => setFormData({...formData, curp: e.target.value})} required />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest text-teal-400">NSS (IMSS)</label>
                      <input type="text" className="search-input w-full font-mono" value={formData.nss} onChange={(e) => setFormData({...formData, nss: e.target.value})} />
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Tipo de Pago</label>
                      <select className="search-input w-full" value={formData.payType} onChange={(e) => setFormData({...formData, payType: e.target.value})}>
                        <option value="MENSUAL">Salario mensual / quincenal</option>
                        <option value="POR_HORA">Por hora</option>
                        <option value="DESTAJO">Destajo (por pieza)</option>
                        <option value="COMISION">Salario + comisión variable</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Salario Diario (Base)</label>
                      <input type="number" className="search-input w-full" value={formData.dailySalary} onChange={(e) => setFormData({...formData, dailySalary: parseFloat(e.target.value)})} required />
                   </div>
                   {formData.payType === 'POR_HORA' && (
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Tarifa por Hora ($)</label>
                      <input type="number" className="search-input w-full" value={formData.hourlyRate} onChange={(e) => setFormData({...formData, hourlyRate: parseFloat(e.target.value)})} />
                   </div>
                   )}
                   {formData.payType === 'DESTAJO' && (
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Tarifa por Pieza ($)</label>
                      <input type="number" className="search-input w-full" value={formData.destajoRate} onChange={(e) => setFormData({...formData, destajoRate: parseFloat(e.target.value)})} />
                   </div>
                   )}
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Salario Diario Integrado</label>
                      <input type="number" className="search-input w-full" value={formData.sdi} onChange={(e) => setFormData({...formData, sdi: parseFloat(e.target.value)})} required />
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-muted mb-2 uppercase">Fecha de Alta</label>
                      <input type="date" className="search-input w-full" value={formData.hiredDate} onChange={(e) => setFormData({...formData, hiredDate: e.target.value})} />
                   </div>
                </div>

                <div className="flex gap-4 justify-end pt-6 border-t border-surface-3">
                   <button type="button" className="btn btn-ghost px-8" onClick={() => setShowModal(false)}>Cancelar</button>
                   <button type="submit" className="btn btn-primary px-8">Guardar Expediente</button>
                </div>
             </form>
          </div>
        </div>
      )}
    
      {/* MODAL: REGISTRO DE INCIDENCIA */}
      {showIncidenceModal && selectedEmpForIncidence && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="panel w-full max-w-md border-surface-3 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6 pb-4 border-b border-surface-3">
                <h2 className="text-xl font-bold">Registrar Incidencia</h2>
                <button className="text-muted hover:text-white" onClick={() => setShowIncidenceModal(false)}>✕</button>
             </div>
             <p className="text-sm text-muted mb-4">Empleado: <strong>{selectedEmpForIncidence.firstName} {selectedEmpForIncidence.lastName}</strong></p>

             <form onSubmit={handleSubmitIncidence} className="space-y-4">
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Tipo de Incidencia</label>
                   <select className="search-input w-full" value={incidenceData.type} onChange={(e) => setIncidenceData({...incidenceData, type: e.target.value})}>
                     <option value="VACACIONES">Vacaciones</option>
                     <option value="FALTA_INJUSTIFICADA">Falta Injustificada</option>
                     <option value="INCAPACIDAD">Incapacidad (IMSS)</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Fecha</label>
                   <input type="date" className="search-input w-full" value={incidenceData.date} onChange={(e) => setIncidenceData({...incidenceData, date: e.target.value})} required />
                </div>
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Cantidad de Días</label>
                   <input type="number" className="search-input w-full" value={incidenceData.days} onChange={(e) => setIncidenceData({...incidenceData, days: parseFloat(e.target.value)})} required min="1" />
                </div>
                <div>
                   <label className="block text-xs font-bold text-muted mb-2 uppercase">Notas</label>
                   <input type="text" className="search-input w-full" value={incidenceData.notes} onChange={(e) => setIncidenceData({...incidenceData, notes: e.target.value})} />
                </div>

                <div className="flex gap-4 justify-end pt-6 border-t border-surface-3">
                   <button type="button" className="btn btn-ghost px-6" onClick={() => setShowIncidenceModal(false)}>Cancelar</button>
                   <button type="submit" className="btn btn-primary px-6">Guardar</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
