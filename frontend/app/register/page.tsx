'use client';
import React, { useState, Suspense } from 'react';
import {
  Lock, Mail, Eye, EyeOff, User, Building2, FileText, ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

function RegisterForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', companyName: '', rfc: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }

    setProcessing(true);
    try {
      const signupRes = await fetch(`${API}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          companyName: form.companyName.trim(),
          rfc: form.rfc.trim().toUpperCase() || undefined,
        }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) throw new Error(signupData.message || 'Error al crear la cuenta');

      localStorage.setItem('jnconta_token', signupData.access_token);
      localStorage.setItem('jnconta_user', JSON.stringify(signupData.user));
      localStorage.setItem('companyId', signupData.user.companyId);
      sessionStorage.removeItem('jnconta_subscription');

      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: 'var(--text-muted)', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: '0.8px',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-sans)', background: 'var(--bg)' }}>
      {/* ── PANEL IZQUIERDO ─────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(135deg, var(--surface-0) 0%, #091524 40%, var(--surface-1) 100%)',
        padding: '60px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(27,152,224,0.12) 0%, transparent 70%)', top: -100, left: -100 }} />
        <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(20,160,133,0.1) 0%, transparent 70%)', bottom: -50, right: -50 }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 420 }}>
          <div className="flex flex-col items-center justify-center mb-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-500/10 flex items-center justify-center border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 mb-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M4 18H20" stroke="white" strokeWidth="0.8" strokeOpacity="0.1" strokeLinecap="round"/>
                <path d="M6 16L9 11L13 14L18 7" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="6" cy="16" r="1.5" fill="#22d3ee"/>
                <circle cx="9" cy="11" r="1.5" fill="#22d3ee"/>
                <circle cx="13" cy="14" r="1.5" fill="#22d3ee"/>
                <circle cx="18" cy="7" r="2" fill="#46dfdf"/>
                <path d="M15 7H18V10" stroke="#46dfdf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ margin: 0, fontWeight: 900, fontSize: '38px', letterSpacing: '-0.05em' }}>
              <span style={{ color: '#0ea5e9' }}>JN</span><span style={{ color: '#22d3ee' }}>Conta</span>
            </h1>
            <div className="mt-2 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20">
              <span style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em' }}>Despacho Elite</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '✅', label: 'Acceso completo', desc: 'Todas las funciones desbloqueadas' },
              { icon: '🧾', label: 'CFDI 4.0 incluido', desc: 'Timbrado directo con el SAT vía PAC' },
              { icon: '💰', label: 'Nómina ISR 2024', desc: 'IMSS, INFONAVIT y RCV calculados' },
              { icon: '🤖', label: 'IA Contable', desc: 'Asistente inteligente integrado' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left', padding: '12px 18px', background: 'var(--unified-block-bg)', borderRadius: 'var(--radius-lg)', border: 'var(--unified-block-border)', borderTop: 'var(--unified-block-border-top)' }}>
                <span style={{ fontSize: 22 }}>{f.icon}</span>
                <div>
                  <p style={{ fontWeight: 700, color: '#fff', margin: 0, fontSize: 13 }}>{f.label}</p>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 11 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── PANEL DERECHO — Formulario directo ──── */}
      <div style={{
        width: 540, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '40px 52px', background: 'var(--surface-0)', borderLeft: 'var(--unified-block-border)',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', zIndex: 10, overflowY: 'auto',
      }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Crear cuenta</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>Completa tus datos para comenzar</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nombre completo</label>
            <div style={{ position: 'relative' }}>
              <User size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" value={form.name} onChange={set('name')} required style={{ width: '100%', paddingLeft: 42 }} placeholder="Juan Pérez" autoComplete="name" autoFocus />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="email" value={form.email} onChange={set('email')} required style={{ width: '100%', paddingLeft: 42 }} placeholder="juan@empresa.com" autoComplete="email" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Nombre de la empresa</label>
            <div style={{ position: 'relative' }}>
              <Building2 size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" value={form.companyName} onChange={set('companyName')} required style={{ width: '100%', paddingLeft: 42 }} placeholder="Mi Empresa S.A. de C.V." />
            </div>
          </div>

          <div>
            <label style={labelStyle}>RFC <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></label>
            <div style={{ position: 'relative' }}>
              <FileText size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" value={form.rfc} onChange={set('rfc')} style={{ width: '100%', paddingLeft: 42, textTransform: 'uppercase' }} placeholder="XAXX010101000" maxLength={13} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')} required style={{ width: '100%', paddingLeft: 42, paddingRight: 44 }} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Confirmar contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type={showPass ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')} required style={{ width: '100%', paddingLeft: 42 }} placeholder="Repite tu contraseña" autoComplete="new-password" />
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={processing} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 24px', fontSize: 14, fontWeight: 700, borderRadius: 10, marginTop: 4, opacity: processing ? 0.7 : 1 }}>
            {processing
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Creando cuenta...</span>
              : <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Crear cuenta y entrar <ArrowRight size={16} /></span>
            }
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" style={{ color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted)' }}>Cargando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
