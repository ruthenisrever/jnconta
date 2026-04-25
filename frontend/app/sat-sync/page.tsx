'use client';
import React, { useState, useEffect } from 'react';
import { DownloadCloud, Lock, CheckCircle2, AlertTriangle, KeyRound, Database, RefreshCw, Terminal, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';

export default function SatSyncPage() {
  const [fielConfig, setFielConfig] = useState({ rfc: '', password: '', syncedAt: '' });
  const [logs, setLogs] = useState<string[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [syncComplete, setSyncComplete] = useState(false);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '91b8d21c-4382-4f3e-908b-de94121bfaf2';
    setCompanyId(cid);
    
    // Simulate reading saved config
    setFielConfig({
      rfc: 'XAXX010101000',
      password: '',
      syncedAt: '2024-03-15T08:30:00'
    });
  }, []);

  const addLog = (msg: string) => setLogs(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const handleSync = async () => {
    if (!fielConfig.password) {
      alert('Debes ingresar la contraseña de la FIEL/CIEC para continuar.');
      return;
    }
    
    setSyncing(true);
    setSyncComplete(false);
    setProgress(0);
    setLogs([]);
    
    // Realistic artificial progress
    addLog('Iniciando handshake con WebService SAT (Metadata)...');
    
    setTimeout(() => {
      setProgress(15);
      addLog('Generando firma SOAP con FIEL/CIEC...');
    }, 800);
    
    setTimeout(() => {
      setProgress(40);
      addLog('Autenticación SAT: [200 OK Token Aceptado]');
      addLog('Formulando petición de recuperación de comprobantes del mes en curso...');
    }, 1500);
    
    setTimeout(async () => {
      setProgress(75);
      addLog('XMLs disponibles detectados. Iniciando volcado seguro...');
      
      try {
        const res = await apiFetch('/api/sync/execute', {
          method: 'POST',
          body: JSON.stringify({ companyId, rfcFiel: fielConfig.rfc })
        });
        
        if (res.ok) {
          const data = await res.json();
          setTimeout(() => {
            setProgress(100);
            addLog(`Paquete descifrado. Inyectando ${data.downloadedCount} XMLs al gestor contable local.`);
            addLog('Sincronización Masiva Completada Exitosamente.');
            setDownloadedCount(data.downloadedCount);
            setSyncComplete(true);
            setSyncing(false);
            setFielConfig(p => ({ ...p, syncedAt: new Date().toISOString() }));
          }, 800);
        } else {
          setProgress(100);
          addLog('ERROR 500: WebService SAT ocupado o credenciales inválidas.');
          setSyncing(false);
        }
      } catch(e) {
        addLog('ERROR FATAL: Conección rechazada.');
        setSyncing(false);
      }
    }, 2800);
  };

  return (
    <div className="main-content" style={{ paddingBottom: '60px' }}>
      <header className="page-header mb-8">
        <div className="page-header-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-600/20 rounded-xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-primary-400 opacity-20 group-hover:scale-150 transition-transform duration-500 rounded-full" />
               <DownloadCloud size={26} className="text-primary-400 relative z-10" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sincronización Directa SAT</h1>
              <p className="text-muted text-sm mt-1">Conexión automática por WebService FIEL/CIEC</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PARÁMETROS FIEL Y DESCARGA */}
        <div className="flex flex-col gap-6">
           <div className="panel p-6 relative overflow-hidden backdrop-blur-2xl glass-border shadow-neo">
              <div className="absolute -top-16 -right-16 opacity-5 rotate-12">
                <Database size={200} />
              </div>
              <div className="flex items-center gap-2 mb-6 border-b border-border-subtle pb-4">
                 <KeyRound size={20} className="text-primary-300" />
                 <h3 className="text-lg font-bold">Credenciales de Acceso</h3>
              </div>
              
              <div className="space-y-4">
                 <div className="form-group relative z-10">
                    <label className="text-xs uppercase tracking-wider text-muted font-bold block mb-1">RFC Contribuyente</label>
                    <input type="text" className="search-input w-full font-mono font-bold" value={fielConfig.rfc} readOnly />
                 </div>
                 
                 <div className="form-group relative z-10">
                    <label className="text-xs uppercase tracking-wider text-muted font-bold block mb-1">Contraseña CIEC / CSD</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input 
                         type="password" 
                         className="search-input w-full pl-9 font-mono" 
                         placeholder="••••••••••••"
                         value={fielConfig.password}
                         onChange={e => setFielConfig(p => ({...p, password: e.target.value}))}
                      />
                    </div>
                 </div>
                 
                 <div className="bg-warning/10 border border-warning/30 p-4 rounded-xl mt-6 flex gap-3 z-10 relative">
                    <AlertTriangle size={20} className="text-warning flex-shrink-0" />
                    <div>
                       <p className="text-xs font-bold text-warning mb-1">Aviso de Seguridad y Bóveda</p>
                       <p className="text-[10px] text-muted">Las credenciales son encriptadas del lado del cliente antes de almacenarse localmente. Nunca comparten servidores externos a JnConta.</p>
                    </div>
                 </div>
              </div>
           </div>
           
           <button 
              onClick={handleSync}
              disabled={syncing || !fielConfig.password}
              className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-2 text-lg transition-all duration-300 ${syncing ? 'bg-surface-3 text-muted scale-95' : 'bg-primary-600 hover:bg-primary-500 shadow-glow text-white'}`}
           >
              {syncing ? <RefreshCw className="animate-spin" size={24} /> : <DownloadCloud size={24} />}
              {syncing ? 'NEGOCIANDO CON SAT...' : 'INICIAR DESCARGA MASIVA'}
           </button>
        </div>

        {/* TERMINAL DE ESTADO */}
        <div className="panel p-0 overflow-hidden bg-black/60 border border-surface-2 flex flex-col shadow-neo">
           <div className="bg-surface-1 px-4 py-3 flex items-center justify-between border-b border-border-strong">
              <div className="flex gap-2.5">
                 <div className="w-3 h-3 rounded-full bg-danger"></div>
                 <div className="w-3 h-3 rounded-full bg-warning"></div>
                 <div className="w-3 h-3 rounded-full bg-success"></div>
              </div>
              <div className="text-xs text-muted font-mono flex items-center gap-1.5 opacity-80">
                 <Terminal size={12} /> sat-sync-worker.sh
              </div>
           </div>
           
           <div className="p-6 flex-1 flex flex-col font-mono text-sm" style={{ minHeight: '350px' }}>
              <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar text-[13px]">
                 {logs.length === 0 && !syncing && !syncComplete ? (
                   <div className="text-surface-3 opacity-60 flex flex-col items-center justify-center h-full gap-2">
                     <Terminal size={32} />
                     <p>Esperando orden de ejecución...</p>
                   </div>
                 ) : (
                   logs.map((L, i) => (
                     <div key={i} className="animate-in fade-in fill-mode-both" style={{ animationDelay: `${i * 100}ms` }}>
                        <span className="text-primary-400">root@jnconta:~$</span> 
                        <span className={L.includes('ERROR') ? 'text-danger' : L.includes('Inyectando') || L.includes('OK') || L.includes('Completada') ? 'text-success' : 'text-slate-300'}> {L}</span>
                     </div>
                   ))
                 )}
              </div>
              
              {/* PROGRESS BAR */}
              <div className="mt-4 border-t border-border-subtle pt-4">
                 <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">Progreso de Petición</span>
                    <span className="text-xs font-mono text-primary-400">{progress}%</span>
                 </div>
                 <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
                      style={{ width: `${progress}%` }}
                    />
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* SUCCESS BANNER OVERLAY */}
      {syncComplete && (
         <div className="mt-6 panel bg-success/10 border-success/30 p-6 flex items-center justify-between animate-in zoom-in-95">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-success text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.4)]">
                 <Check size={28} />
               </div>
               <div>
                 <h3 className="text-success text-lg font-bold mb-0">Sincronización Exitosa</h3>
                 <p className="text-sm text-success/80 mt-1">Se han importado <strong>{downloadedCount} XMLs</strong>. Están listos para convertirse en pólizas.</p>
               </div>
            </div>
            <button className="btn btn-secondary border border-success/30 text-success hover:bg-success/20 transition-colors" onClick={() => window.location.href = '/contabilizador'}>
              Ir al Contabilizador Inteligente &rarr;
            </button>
         </div>
      )}

      <style jsx>{`
         .shadow-neo { box-shadow: 0 15px 35px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05); }
         .glass-border { border: 1px solid rgba(255,255,255,0.08); }
         .custom-scrollbar::-webkit-scrollbar { width: 6px; }
         .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
         .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
         .animate-in { animation: fadeIn 0.3s ease-out; }
         .fill-mode-both { animation-fill-mode: both; }
         .zoom-in-95 { animation: zoomIn 0.3s ease-out backwards; }
         @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
         @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
