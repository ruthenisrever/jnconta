'use client';
import React, { useState, useEffect } from 'react';
import {
  Settings, Save, Building2, Globe, Calendar, Users,
  ShieldCheck, Upload, Trash2, CheckCircle2,
  AlertTriangle, Key, FileText, RefreshCw, Lock,
  User, Server, Activity, AlertCircle, KeyRound, CreditCard, Star, BarChart3, Zap, ArrowUpRight,
  UserPlus, UserX, Mail, Crown
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

type TabType = 'empresa' | 'fiscal' | 'pac' | 'certificados' | 'usuarios' | 'sistema' | 'suscripcion';

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<TabType>('empresa');
  const [saved, setSaved] = useState(false);

  // ── Shared ──────────────────────────────────────────────────
  const [companyId, setCompanyId] = useState('');
  const [company, setCompany] = useState<any>(null);

  // ── PAC ─────────────────────────────────────────────────────
  const [pacConfig, setPacConfig] = useState({
    pacUsername: '',
    pacPassword: '',
    pacUrl: 'https://demo-itv.finkok.com/servicios/soap/stamp',
    pacTestMode: true,
  });
  const [pacSaving, setPacSaving] = useState(false);
  const [pacTesting, setPacTesting] = useState(false);
  const [pacMessage, setPacMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Certificados ─────────────────────────────────────────────
  const [certs, setCerts] = useState<any[]>([]);
  const [certsLoading, setCertsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [certForm, setCertForm] = useState({
    cerFile: '', keyFile: '', password: '', serialNumber: '', expiryDate: '',
  });

  // ── Usuarios ─────────────────────────────────────────────────
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'accountant' });
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // ── Data fetching ────────────────────────────────────────────
  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    if (cid) {
      fetchCompany(cid);
      fetchCerts(cid);
      fetchUsers(cid);
    }
  }, []);

  const fetchCompany = async (cid: string) => {
    try {
      const res = await apiFetch(`/api/companies/${cid}`);
      if (res.ok) {
        const data = await res.json();
        setCompany(data);
        setPacConfig({
          pacUsername: data.pacUsername || '',
          pacPassword: data.pacPassword || '',
          pacUrl: data.pacUrl || 'https://demo-itv.finkok.com/servicios/soap/stamp',
          pacTestMode: data.pacTestMode ?? true,
        });
      }
    } catch (e) {
      console.error('Error loading company:', e);
    }
  };

  const fetchCerts = async (cid: string) => {
    setCertsLoading(true);
    try {
      const res = await apiFetch(`/api/certificates?companyId=${cid}`);
      const data = await res.json();
      setCerts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setCertsLoading(false);
    }
  };

  const fetchUsers = async (cid: string) => {
    setUsersLoading(true);
    try {
      const res = await apiFetch(`/api/companies/${cid}/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleInvite = async () => {
    setInviteError('');
    if (!inviteForm.email) { setInviteError('El correo es obligatorio.'); return; }
    setInviteSaving(true);
    try {
      const res = await apiFetch(`/api/companies/${companyId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Error al agregar usuario');
      }
      setShowInvite(false);
      setInviteForm({ email: '', name: '', role: 'accountant' });
      fetchUsers(companyId);
    } catch (e: any) {
      setInviteError(e.message || 'Error de conexión');
    } finally {
      setInviteSaving(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('¿Quitar el acceso de este usuario a la empresa?')) return;
    await apiFetch(`/api/companies/${companyId}/users/${userId}`, { method: 'DELETE' });
    fetchUsers(companyId);
  };

  // ── PAC actions ──────────────────────────────────────────────
  const savePac = async () => {
    setPacSaving(true);
    setPacMessage(null);
    try {
      const res = await apiFetch(`/api/companies/${companyId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pacConfig),
      });
      setPacMessage(res.ok
        ? { type: 'success', text: 'Configuración guardada. Ya puedes realizar timbrados.' }
        : { type: 'error', text: 'Error al guardar la configuración.' });
    } catch {
      setPacMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
    } finally {
      setPacSaving(false);
    }
  };

  const testPacConnection = async () => {
    setPacTesting(true);
    setPacMessage(null);
    try {
      const res = await apiFetch(`/api/stamping/verify-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: pacConfig.pacUsername,
          password: pacConfig.pacPassword,
          url: pacConfig.pacUrl
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPacMessage({ type: 'success', text: `Conexión exitosa con Finkok. Créditos disponibles: ${data.credits || 'Ilimitados'}` });
      } else {
        setPacMessage({ type: 'error', text: data.error || 'No se pudo conectar con el PAC. Verifica tus credenciales.' });
      }
    } catch {
      setPacMessage({ type: 'error', text: 'No se pudo alcanzar el servidor del PAC.' });
    } finally {
      setPacTesting(false);
    }
  };

  // ── Certificate actions ──────────────────────────────────────
  const uploadCert = async () => {
    try {
      const res = await apiFetch('/api/certificates', {
        method: 'POST',
        body: JSON.stringify({ ...certForm, companyId }),
      });
      if (res.ok) {
        setShowUpload(false);
        setCertForm({ cerFile: '', keyFile: '', password: '', serialNumber: '', expiryDate: '' });
        fetchCerts(companyId);
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch {
      alert('Error registrando certificado');
    }
  };

  const deleteCert = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este certificado?')) return;
    try {
      await apiFetch(`/api/certificates/${id}`, { method: 'DELETE' });
      fetchCerts(companyId);
    } catch (e) { console.error(e); }
  };

  const activateCert = async (id: string) => {
    try {
      await apiFetch(`/api/certificates/${id}/activate`, {
        method: 'POST',
        body: JSON.stringify({ companyId }),
      });
      fetchCerts(companyId);
    } catch (e) { console.error(e); }
  };

  // ── General save ─────────────────────────────────────────────
  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const TABS: { key: TabType; label: string; icon: React.ElementType }[] = [
    { key: 'empresa',       label: 'Empresa',       icon: Building2   },
    { key: 'fiscal',        label: 'Datos Fiscales', icon: Globe       },
    { key: 'pac',           label: 'PAC / Timbrado', icon: Server      },
    { key: 'certificados',  label: 'Certificados',   icon: ShieldCheck },
    { key: 'usuarios',      label: 'Usuarios',       icon: Users       },
    { key: 'suscripcion',   label: 'Suscripción',    icon: CreditCard   },
    { key: 'sistema',       label: 'Sistema',        icon: Settings    },
  ];

  const activeCert = certs.find(c => c.isActive);

  return (
    <>
      <header className="main-header">
        <div className="header-title">
          <h1>Configuración</h1>
          <p>Parámetros del sistema, datos fiscales y credenciales de timbrado</p>
        </div>
        <div className="header-actions">
          {(tab === 'empresa' || tab === 'fiscal' || tab === 'sistema') && (
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={15} />{saved ? '¡Guardado!' : 'Guardar Cambios'}
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <div className="tabs" style={{ marginBottom: 0, borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', overflow: 'hidden' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={14} style={{ display: 'inline', marginRight: 6 }} />{t.label}
            </button>
          ))}
        </div>

        <div className="panel" style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>

          {/* ── EMPRESA ─────────────────────────────────────── */}
          {tab === 'empresa' && (
            <div className="panel-body p-6">
              <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Datos de la Empresa</h3>
              <div className="form-grid">
                <div className="form-group full-width"><label>Razón Social</label><input defaultValue="JNConta Enterprise S.A. de C.V." /></div>
                <div className="form-group"><label>RFC</label><input defaultValue="JNC240101ABC" /></div>
                <div className="form-group"><label>Teléfono</label><input defaultValue="55-1234-5678" /></div>
                <div className="form-group"><label>Email</label><input defaultValue="admin@jnconta.com" /></div>
                <div className="form-group full-width"><label>Domicilio Fiscal</label><input defaultValue="Av. Insurgentes Sur 1234, Col. Del Valle, CDMX" /></div>
                <div className="form-group"><label>Moneda Principal</label><select defaultValue="MXN"><option>MXN</option><option>USD</option></select></div>
                <div className="form-group"><label>Ejercicio Fiscal</label><select><option>2024</option><option>2025</option></select></div>
              </div>
            </div>
          )}

          {/* ── FISCAL ──────────────────────────────────────── */}
          {tab === 'fiscal' && (
            <div className="panel-body p-6">
              <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Datos Fiscales</h3>
              <div className="form-grid">
                <div className="form-group"><label>Régimen Fiscal SAT</label>
                  <select defaultValue="601">
                    <option value="601">601 - General de Ley PM</option>
                    <option value="612">612 - Personas Físicas A. Emp.</option>
                    <option value="626">626 - Simplificado de Confianza</option>
                    <option value="630">630 - Enajenación de acciones</option>
                  </select>
                </div>
                <div className="form-group"><label>Tasa ISR Corporativo</label>
                  <select defaultValue="0.30">
                    <option value="0.30">30% (Personas Morales)</option>
                    <option value="0.35">35% (Régimen Especial)</option>
                  </select>
                </div>
                <div className="form-group"><label>Tasa IVA</label>
                  <select defaultValue="0.16">
                    <option value="0.16">16%</option>
                    <option value="0.08">8% (Zona Fronteriza)</option>
                    <option value="0">0% (Exento)</option>
                  </select>
                </div>
                <div className="form-group"><label>Periodicidad Declaraciones</label>
                  <select><option>Mensual</option><option>Trimestral</option></select>
                </div>
                <div className="form-group"><label>UMA Diaria 2024</label><input defaultValue="108.57" type="number" step="0.01" /></div>
                <div className="form-group"><label>Salario Mínimo Diario 2024</label><input defaultValue="248.93" type="number" step="0.01" /></div>
              </div>
              <div className="alert alert-info mt-4">
                <Globe size={15} /><span>Los cálculos de ISR y IMSS usarán automáticamente estas tasas en el módulo de Nómina.</span>
              </div>
            </div>
          )}

          {/* ── PAC ─────────────────────────────────────────── */}
          {tab === 'pac' && (
            <div className="panel-body p-6 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }} className="flex items-center gap-2">
                  <Globe size={16} className="text-primary-400" /> Configuración del PAC (Finkok)
                </h3>
                <span className={`badge ${pacConfig.pacTestMode ? 'badge-warning' : 'badge-success'}`}>
                  {pacConfig.pacTestMode ? 'SANDBOX / TEST' : 'PRODUCCIÓN REAL'}
                </span>
              </div>

              {pacMessage && (
                <div className={`alert ${pacMessage.type === 'success' ? 'alert-success' : 'alert-error'} flex items-center gap-3`}>
                  <Activity size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">{pacMessage.text}</span>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label className="flex items-center gap-2"><User size={13} className="text-muted" /> Usuario Finkok</label>
                  <input
                    value={pacConfig.pacUsername}
                    onChange={e => setPacConfig({ ...pacConfig, pacUsername: e.target.value })}
                    placeholder="ej. integrador@tuempresa.com"
                  />
                </div>
                <div className="form-group">
                  <label className="flex items-center gap-2"><KeyRound size={13} className="text-muted" /> Contraseña / API Key</label>
                  <input
                    type="password"
                    value={pacConfig.pacPassword}
                    onChange={e => setPacConfig({ ...pacConfig, pacPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="form-group full-width">
                  <label className="flex items-center gap-2"><Server size={13} className="text-muted" /> URL del Web Service (WSDL)</label>
                  <input
                    value={pacConfig.pacUrl}
                    onChange={e => setPacConfig({ ...pacConfig, pacUrl: e.target.value })}
                    placeholder="https://demo-itv.finkok.com/servicios/soap/stamp"
                  />
                  <p className="text-[10px] text-muted mt-1 italic">
                    Producción: https://facturacion.finkok.com/servicios/soap/stamp
                  </p>
                </div>
              </div>

              <div className="p-4 bg-surface-2 rounded-xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={15} className={pacConfig.pacTestMode ? 'text-warning-400' : 'text-success'} />
                    Modo de Operación
                  </h4>
                  <p className="text-xs text-muted mt-0.5">
                    {pacConfig.pacTestMode
                      ? 'Entorno de Pruebas — No consume folios reales'
                      : 'Entorno de Producción — Timbrado con validez ante el SAT'}
                  </p>
                </div>
                <button
                  onClick={() => setPacConfig({ ...pacConfig, pacTestMode: !pacConfig.pacTestMode })}
                  className={`w-14 h-8 rounded-full relative transition-colors duration-300 ${pacConfig.pacTestMode ? 'bg-warning-600' : 'bg-success'}`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow ${pacConfig.pacTestMode ? 'left-1' : 'left-7'}`} />
                </button>
              </div>

              {!pacConfig.pacTestMode && company && (
                <div className="alert alert-warning text-xs">
                  <AlertTriangle size={14} />
                  <span>Modo Producción activo. Cada factura timbrada consumirá un folio de Finkok. RFC registrado: <strong>{company.rfc}</strong></span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  onClick={testPacConnection}
                  disabled={pacTesting || !pacConfig.pacUsername}
                >
                  {pacTesting ? <RefreshCw size={15} className="animate-spin" /> : <Activity size={15} />}
                  Probar Conexión
                </button>
                <button
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  onClick={savePac}
                  disabled={pacSaving}
                >
                  {pacSaving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Guardar Configuración PAC
                </button>
              </div>
            </div>
          )}

          {/* ── CERTIFICADOS ─────────────────────────────────── */}
          {tab === 'certificados' && (
            <div className="panel-body">
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Certificados de Sello Digital (CSD)</h3>
                  <p className="text-xs text-muted mt-0.5">Archivos .cer y .key para el timbrado CFDI 4.0</p>
                </div>
                <div className="flex items-center gap-3">
                  {activeCert && (
                    <span className="text-xs text-muted">
                      CSD activo vence en <strong className="text-warning-400">
                        {Math.ceil((new Date(activeCert.expiryDate).getTime() - Date.now()) / 86400000)} días
                      </strong>
                    </span>
                  )}
                  <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => setShowUpload(true)}>
                    <Upload size={14} /> Cargar CSD
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                <div className="lg:col-span-2 space-y-4">
                  {certsLoading ? (
                    <div className="p-12 text-center"><RefreshCw className="animate-spin m-auto" /></div>
                  ) : certs.length > 0 ? (
                    certs.map(cert => (
                      <div key={cert.id} className={`panel border-l-4 ${cert.isActive ? 'border-l-success' : 'border-l-surface-4'} relative overflow-hidden`}>
                        {cert.isActive && (
                          <div className="absolute top-0 right-0 bg-success/10 text-success text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                            <CheckCircle2 size={12} /> ACTIVO PARA TIMBRADO
                          </div>
                        )}
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-lg ${cert.isActive ? 'bg-success/20 text-success' : 'bg-surface-3 text-muted'}`}>
                            <ShieldCheck size={24} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-bold">No. de Serie: {cert.serialNumber}</h3>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <Calendar size={14} />
                                <span>Vencimiento: <strong className="text-surface-foreground">{new Date(cert.expiryDate).toLocaleDateString()}</strong></span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted">
                                <Lock size={14} />
                                <span>Estado: <strong className={cert.isActive ? 'text-success' : 'text-surface-foreground'}>{cert.isActive ? 'Vigente y Activo' : 'Inactivo'}</strong></span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {!cert.isActive && (
                              <button className="btn btn-ghost btn-sm text-xs border border-surface-4" onClick={() => activateCert(cert.id)}>Activar</button>
                            )}
                            <button className="btn btn-ghost btn-sm text-danger" onClick={() => deleteCert(cert.id)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="panel p-12 text-center opacity-50 border-dashed border-2">
                      <Key size={48} className="m-auto mb-4 text-muted" />
                      <h3>No hay certificados registrados</h3>
                      <p className="text-sm text-muted">Sube tus archivos CSD para comenzar a timbrar facturas.</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="panel bg-primary-900/10 border-primary-500/20">
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-primary-400">
                      <AlertTriangle size={16} /> Requisitos del SAT
                    </h3>
                    <ul className="text-xs space-y-2 text-muted">
                      <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1 shrink-0" /><span>Solo se aceptan CSD, no la e.firma (FIEL).</span></li>
                      <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1 shrink-0" /><span>La contraseña debe coincidir exactamente.</span></li>
                      <li className="flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-1 shrink-0" /><span>Nuevos certificados pueden tardar 72h en reconocerse ante el SAT.</span></li>
                    </ul>
                  </div>
                  <div className="panel bg-warning-900/10 border-warning-500/20">
                    <h3 className="text-sm font-bold mb-2 flex items-center gap-2 text-warning-400">
                      <Lock size={16} /> Seguridad
                    </h3>
                    <ul className="text-xs space-y-2 text-warning-200/70">
                      <li>• Archivos cifrados en reposo en nuestros servidores.</li>
                      <li>• La llave privada nunca se comparte fuera del proceso de timbrado.</li>
                    </ul>
                  </div>
                  {activeCert && (
                    <div className="panel bg-black/20">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="text-info-400" size={16} />
                        <h4 className="text-xs font-bold uppercase tracking-widest text-muted">Próximo Vencimiento</h4>
                      </div>
                      <div className="text-2xl font-bold text-info-300">
                        {Math.ceil((new Date(activeCert.expiryDate).getTime() - Date.now()) / 86400000)} días
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── USUARIOS ─────────────────────────────────────── */}
          {tab === 'usuarios' && (
            <div className="panel-body">
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {usersLoading ? 'Cargando...' : `${users.length} usuario${users.length !== 1 ? 's' : ''} con acceso a esta empresa`}
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowInvite(true); setInviteError(''); }}>
                  <UserPlus size={13} />Agregar Usuario
                </button>
              </div>
              <table>
                <thead>
                  <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Tipo de acceso</th><th></th></tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Cargando usuarios...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No hay usuarios registrados</td></tr>
                  ) : users.map((u: any) => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {u.memberRole === 'owner' && <Crown size={13} style={{ color: '#f59e0b' }} />}
                          {u.name}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                          {u.role === 'admin' ? 'Administrador' : u.role === 'accountant' ? 'Contador' : 'Usuario'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.memberRole === 'owner' ? 'badge-warning' : 'badge-success'}`}>
                          {u.memberRole === 'owner' ? 'Propietario' : 'Asignado'}
                        </span>
                      </td>
                      <td>
                        {u.memberRole !== 'owner' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleRemoveUser(u.id)}
                            title="Quitar acceso" style={{ color: '#ef4444' }}>
                            <UserX size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Modal invitar usuario */}
              {showInvite && (
                <div className="modal-overlay">
                  <div className="modal modal-sm">
                    <div className="modal-header">
                      <h2>Agregar Usuario</h2>
                      <button onClick={() => setShowInvite(false)} className="btn btn-ghost btn-icon"><Trash2 size={18} /></button>
                    </div>
                    <div className="modal-body p-6" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div className="form-group">
                        <label>Correo electrónico *</label>
                        <div style={{ position: 'relative' }}>
                          <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input type="email" value={inviteForm.email} placeholder="correo@ejemplo.com"
                            onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                            style={{ paddingLeft: 36 }} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Nombre (opcional)</label>
                        <div style={{ position: 'relative' }}>
                          <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input type="text" value={inviteForm.name} placeholder="Nombre del usuario"
                            onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                            style={{ paddingLeft: 36 }} />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Rol</label>
                        <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}>
                          <option value="accountant">Contador</option>
                          <option value="user">Usuario</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                      {inviteError && (
                        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
                          ⚠️ {inviteError}
                        </div>
                      )}
                    </div>
                    <div className="modal-footer">
                      <button className="btn btn-ghost" onClick={() => setShowInvite(false)}>Cancelar</button>
                      <button className="btn btn-primary" onClick={handleInvite} disabled={inviteSaving}>
                        <UserPlus size={14} />{inviteSaving ? 'Guardando...' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SISTEMA ──────────────────────────────────────── */}
          {tab === 'sistema' && (
            <div className="panel-body p-6">
              <h3 style={{ marginBottom: 20, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Preferencias del Sistema</h3>
              <div className="form-grid">
                <div className="form-group"><label>Idioma</label><select defaultValue="es-MX"><option value="es-MX">Español (México)</option><option value="en-US">English (US)</option></select></div>
                <div className="form-group"><label>Formato de Fecha</label><select><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></div>
                <div className="form-group"><label>Formato Número</label><select><option>1,234.56 (MX)</option><option>1.234,56 (EU)</option></select></div>
                <div className="form-group"><label>Tipo de Cambio USD/MXN</label><input type="number" step="0.01" defaultValue="17.15" /></div>
              </div>
              <div className="alert alert-info mt-4">
                <Settings size={15} /><span>Versión JnConta Enterprise v2.0.0 — Backend NestJS + PostgreSQL + Prisma ORM</span>
              </div>
            </div>
          )}

          {/* ── SUSCRIPCIÓN ──────────────────────────────────── */}
          {tab === 'suscripcion' && (
            <SubscriptionTabContent companyId={companyId} />
          )}

        </div>
      </main>

      {/* ── MODAL CARGA CSD ─────────────────────────────────── */}
      {showUpload && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h2>Cargar Certificado de Sello Digital</h2>
              <button onClick={() => setShowUpload(false)} className="btn btn-ghost btn-icon"><Trash2 size={18} /></button>
            </div>
            <div className="modal-body p-6 space-y-4">
              <div className="form-group">
                <label>Archivo Certificado (.cer) — Base64</label>
                <div className="flex gap-2">
                  <textarea className="flex-1 text-[10px] font-mono" rows={3}
                    value={certForm.cerFile}
                    onChange={e => setCertForm({ ...certForm, cerFile: e.target.value })}
                    placeholder="MIIF... (contenido base64)"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Archivo Llave (.key) — Base64</label>
                <div className="flex gap-2">
                  <textarea className="flex-1 text-[10px] font-mono" rows={3}
                    value={certForm.keyFile}
                    onChange={e => setCertForm({ ...certForm, keyFile: e.target.value })}
                    placeholder="MIIE... (contenido base64)"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Contraseña del Certificado</label>
                <input type="password"
                  value={certForm.password}
                  onChange={e => setCertForm({ ...certForm, password: e.target.value })}
                  placeholder="Contraseña establecida en el SAT"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label>No. de Serie (Opcional)</label>
                  <input value={certForm.serialNumber} onChange={e => setCertForm({ ...certForm, serialNumber: e.target.value })} placeholder="00001000000..." />
                </div>
                <div className="form-group">
                  <label>Vencimiento (Opcional)</label>
                  <input type="date" value={certForm.expiryDate} onChange={e => setCertForm({ ...certForm, expiryDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer p-6 border-t border-white/5">
              <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>Cancelar</button>
              <button className="btn btn-primary px-8" onClick={uploadCert}>Validar y Guardar CSD</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── COMPONENTES INTERNOS ──────────────────────────────────────────────────────

function SubscriptionTabContent({ companyId }: { companyId: string }) {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const PLANS = [
    { name: 'Lite',     price: '$139', folios: 15,  tokens: '50k',  desc: 'Personas físicas y startups', accent: '#38bdf8' },
    { name: 'Pro',      price: '$295', folios: 60,  tokens: '250k', desc: 'PYMEs y despachos pequeños',   accent: '#818cf8', highlight: true },
    { name: 'Business', price: '$450', folios: 200, tokens: '1M',   desc: 'Empresas con alto volumen',    accent: '#a78bfa' },
    { name: 'Despacho', price: '$1,599', folios: 800, tokens: '5M', desc: 'La estación del contador',     accent: '#34d399' },
  ];

  useEffect(() => {
    if (companyId) fetchSub(companyId);
  }, [companyId]);

  const fetchSub = async (cid: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/subscriptions/status?companyId=${cid}`);
      if (res.ok) setSub(await res.json());
    } catch { /* offline grace */ }
    setLoading(false);
  };

  const handleUpgrade = async (planName: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('jnconta_user') || '{}');
      const res = await apiFetch('/api/subscriptions/checkout', {
        method: 'POST',
        body: JSON.stringify({ planId: planName.toLowerCase(), tenantId: user.tenantId || companyId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert('Configura tus llaves de Stripe en producción para habilitar los pagos.');
    } catch {
      alert('Error al procesar el pago. Verifica la configuración de Stripe.');
    }
  };

  const pct = sub ? Math.round((sub.stampingUsed / sub.stampingLimit) * 100) : 0;
  const dangerZone = pct >= 80;

  return (
    <div className="panel-body p-6">
      {/* Current Plan Banner */}
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 20,
        padding: '24px',
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(14,165,233,0.15))',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Star size={24} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 2px' }}>Plan Actual</p>
            {loading ? (
              <div className="skeleton" style={{ height: 26, width: 120, background: 'var(--surface-3)', borderRadius: 6 }} />
            ) : (
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {sub?.planName || 'Trial Lite'}
                {sub?.status === 'TRIAL' && (
                  <span className="badge badge-warning" style={{ marginLeft: 10 }}>TRIAL</span>
                )}
                {sub?.status === 'ACTIVE' && (
                  <span className="badge badge-success" style={{ marginLeft: 10 }}>ACTIVO</span>
                )}
              </p>
            )}
            {sub?.endDate && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Vencimiento: {new Date(sub.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <button onClick={() => handleUpgrade('Pro')} className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: 12 }}>
          <ArrowUpRight size={16} /> Mejorar mi Plan
        </button>
      </div>

      {/* Consumption */}
      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>Consumo del Mes</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
        <div className="panel bg-black/10 p-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}><BarChart3 size={12} className="inline mr-1" /> Folios CFDI</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: dangerZone ? 'var(--danger)' : 'var(--text-primary)' }}>
              {loading ? '...' : `${sub?.stampingUsed ?? 0} / ${sub?.stampingLimit ?? 0}`}
            </span>
          </div>
          <div className="progress-bar" style={{ height: 8, background: 'var(--surface-3)' }}>
            <div className={`progress-fill ${dangerZone ? 'bg-danger' : 'bg-primary'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Válido para facturas, nómina y complementos.</p>
        </div>

        <div className="panel bg-black/10 p-5">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}><Zap size={12} className="inline mr-1" /> Inteligencia Artificial</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
              {loading ? '...' : `${((sub?.tokenUsed ?? 0) / 1000).toFixed(1)}k / ${((sub?.tokenLimit ?? 0) / 1000).toFixed(0)}k tokens`}
            </span>
          </div>
          <div className="progress-bar" style={{ height: 8, background: 'var(--surface-3)' }}>
            <div className="progress-fill bg-info" style={{ width: `${Math.min(Math.round(((sub?.tokenUsed ?? 0) / (sub?.tokenLimit || 1)) * 100), 100)}%` }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Utilizado en estados financieros y auditoría IA.</p>
        </div>
      </div>

      {/* Plan Grid */}
      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1px' }}>Cambiar de Plan</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {PLANS.map(plan => {
          const isCurrent = sub?.planName?.toLowerCase() === plan.name.toLowerCase() || (plan.name === 'Lite' && !sub?.planName);
          return (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? 'rgba(6,182,212,0.05)' : 'var(--surface-1)',
                border: isCurrent ? `2px solid ${plan.accent}` : '1px solid var(--border-subtle)',
                borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
                position: 'relative'
              }}
            >
              {isCurrent && (
                <div style={{ position: 'absolute', top: -10, right: 20, background: plan.accent, color: '#000', fontSize: 9, fontWeight: 900, padding: '2px 8px', borderRadius: 10 }}>ACTIVO</div>
              )}
              <div>
                <h5 style={{ fontSize: 18, fontWeight: 800, color: plan.accent, margin: 0 }}>{plan.name}</h5>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>{plan.desc}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{plan.price}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ mes</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success" /> {plan.folios} Folios mensuales</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success" /> {plan.tokens} Tokens IA</li>
                {plan.name === 'Despacho' && <li className="flex items-center gap-2"><CheckCircle2 size={12} className="text-success" /> Soporte prioritario</li>}
              </ul>
              <button
                disabled={isCurrent}
                onClick={() => handleUpgrade(plan.name)}
                className={`btn btn-sm ${isCurrent ? 'btn-ghost' : 'btn-primary'}`}
                style={{ marginTop: 'auto', borderRadius: 12, fontSize: 11, fontWeight: 700 }}
              >
                {isCurrent ? 'Plan Actual' : 'Seleccionar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
