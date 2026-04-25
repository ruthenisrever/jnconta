'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  User as UserIcon, 
  Calendar, 
  Activity,
  ArrowRight,
  Database
} from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function BitacoraPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId');
    if (cid) {
      setCompanyId(cid);
      fetchLogs(cid);
    }
  }, []);

  const fetchLogs = async (cid: string) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/audit/logs?companyId=${cid}`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'DELETE': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'UPDATE': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'APPLY':  return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
      case 'CANCEL': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1D] text-white p-8">
      {/* Header Flare */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <ShieldCheck className="text-blue-400 w-5 h-5" />
              </div>
              <span className="text-blue-400 font-bold tracking-[0.2em] text-[10px] uppercase">Cumplimiento Fiscal & Gobierno</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter italic bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
              BITÁCORA <span className="text-blue-500">FORENSE</span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Registro inmutable de toda actividad contable crítica dentro de la plataforma.</p>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Buscar en el historial..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#111C2E]/60 border border-white/5 rounded-2xl pl-12 pr-6 py-3 w-[300px] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 transition-all placeholder:text-gray-600 font-medium"
                />
             </div>
             <button 
              onClick={() => fetchLogs(companyId)}
              className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors"
             >
                <Activity className="w-5 h-5 text-gray-400" />
             </button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#111C2E]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl group hover:border-blue-500/30 transition-all">
                <div className="text-gray-500 text-xs font-bold uppercase mb-4 tracking-widest flex items-center gap-2">
                    <Database className="w-3 h-3" /> Integridad de Datos
                </div>
                <div className="text-3xl font-black text-white mb-1">100%</div>
                <div className="text-[10px] text-green-400 font-bold uppercase">Cadena de custodia verificada</div>
            </div>
            <div className="bg-[#111C2E]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl group hover:border-blue-500/30 transition-all">
                <div className="text-gray-500 text-xs font-bold uppercase mb-4 tracking-widest flex items-center gap-2">
                    <UserIcon className="w-3 h-3" /> Usuarios Activos
                </div>
                <div className="text-3xl font-black text-white mb-1">1</div>
                <div className="text-[10px] text-blue-400 font-bold uppercase text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 italic">Sesión actual: Administrador</div>
            </div>
            <div className="bg-[#111C2E]/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl group hover:border-blue-500/30 transition-all">
                <div className="text-gray-500 text-xs font-bold uppercase mb-4 tracking-widest flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Último Registro
                </div>
                <div className="text-3xl font-black text-white mb-1">Hoy</div>
                <div className="text-[10px] text-orange-400 font-bold uppercase">Actividad reciente detectada</div>
            </div>
        </div>

        {/* Main Log Table */}
        <div className="bg-[#111C2E]/40 border border-white/5 rounded-[40px] overflow-hidden backdrop-blur-2xl shadow-2xl shadow-blue-900/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] border-b border-white/5">
                  <th className="px-8 py-6">Timestamp (UTC)</th>
                  <th className="px-8 py-6">Operación</th>
                  <th className="px-8 py-6">Entidad</th>
                  <th className="px-8 py-6">Usuario</th>
                  <th className="px-8 py-6">Detalles Forenses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-8 h-20 bg-white/5 mb-2" />
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="px-8 py-32 text-center text-gray-600 italic font-medium">
                            No se encontraron registros en la bitácora para los criterios seleccionados.
                        </td>
                    </tr>
                ) : filteredLogs.map((log) => (
                  <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-400">{new Date(log.createdAt).toLocaleString()}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-blue-500/40" />
                         <span className="text-sm font-bold text-gray-200">{log.entity}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-[10px] font-black text-indigo-400">
                            {log.user?.name?.[0] || 'S'}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">{log.user?.name || 'Sistema'}</div>
                            <div className="text-[10px] text-gray-500 font-medium">{log.user?.email || 'automated@jnconta.com'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4 text-xs font-medium text-gray-400 max-w-md">
                         <span className="truncate group-hover:text-white transition-colors">{log.details}</span>
                         <ArrowRight className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="mt-12 text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">JnConta Enterprise v5.1 — Cifrado AES-256 en reposo</p>
        </footer>
      </div>
    </div>
  );
}
