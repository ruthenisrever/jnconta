'use client';
import React, { useState, useEffect } from 'react';
import { Lock, Mail, Eye, EyeOff, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@jnconta.com');
  const [password, setPassword] = useState('ADMIN123!');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('jnconta_token')) {
      router.replace('/');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Credenciales inválidas');
      localStorage.setItem('jnconta_token', data.access_token);
      localStorage.setItem('jnconta_user', JSON.stringify(data.user));
      localStorage.setItem('companyId', data.user.companyId);
      sessionStorage.removeItem('jnconta_subscription');

      // Verificar si el usuario administra múltiples empresas
      const companiesRes = await fetch(`${API}/api/auth/my-companies`, {
        headers: { 'Authorization': `Bearer ${data.access_token}` },
      });
      const companiesData = companiesRes.ok ? await companiesRes.json() : [];
      if (Array.isArray(companiesData) && companiesData.length > 1) {
        router.replace('/select-company');
      } else {
        router.replace('/');
      }
    } catch (err: any) {
      if (err.message === 'Failed to fetch') {
        setError('El servidor (API) está fuera de línea. Verifica que está corriendo en puerto 3005.');
      } else {
        setError(err.message || 'Error de conexión con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-sans)',
      background: 'var(--bg)',
    }}>
      {/* LEFT PANEL — Branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        background: 'linear-gradient(135deg, var(--surface-0) 0%, #091524 40%, var(--surface-1) 100%)',
        padding: '60px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Animated background orbs */}
        <div style={{
          position: 'absolute', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(27,152,224,0.12) 0%, transparent 70%)',
          top: -100, left: -100,
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,160,133,0.1) 0%, transparent 70%)',
          bottom: -50, right: -50,
        }} />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 420 }}>
          {/* LOGOTIPO VECTORIAL CALCADO (AZUL PETRÓLEO ACUA) */}
          <div className="flex flex-col items-center justify-center mb-10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-500/10 flex items-center justify-center border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 mb-6">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 18H20" stroke="white" strokeWidth="0.8" strokeOpacity="0.1" strokeLinecap="round"/>
                  <path d="M6 16L9 11L13 14L18 7" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6" cy="16" r="1.5" fill="#22d3ee" />
                  <circle cx="9" cy="11" r="1.5" fill="#22d3ee" />
                  <circle cx="13" cy="14" r="1.5" fill="#22d3ee" />
                  <circle cx="18" cy="7" r="2" fill="#46dfdf" />
                  <path d="M15 7H18V10" stroke="#46dfdf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 style={{ margin: 0, fontWeight: 900, fontSize: '38px', letterSpacing: '-0.05em' }}>
              <span style={{ color: '#0ea5e9' }}>JN</span><span style={{ color: '#22d3ee' }}>Conta</span>
            </h1>
            <div className="mt-2 px-3 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20">
              <span style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em' }}>
                Ultra Elite
              </span>
            </div>
          </div>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', margin: '0 0 40px' }}>Sistema Contable Integral</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: '📊', label: 'Contabilidad CFDI', desc: 'Pólizas, balanza y contabilidad electrónica' },
              { icon: '💰', label: 'Nómina Real', desc: 'ISR 2024 · IMSS · INFONAVIT · RCV' },
              { icon: '🧾', label: 'Gestor XML SAT', desc: 'Importa CFDIs y genera pólizas automáticas' },
            ].map(f => (
              <div key={f.label} style={{
                display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                padding: '14px 20px', background: 'var(--unified-block-bg)', borderRadius: 'var(--radius-lg)',
                border: 'var(--unified-block-border)', borderTop: 'var(--unified-block-border-top)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <span style={{ fontSize: 24 }}>{f.icon}</span>
                <div>
                  <p style={{ fontWeight: 700, color: '#fff', margin: 0, fontSize: 14 }}>{f.label}</p>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 12 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Login form */}
      <div style={{
        width: 480, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 52px', background: 'var(--surface-0)', borderLeft: 'var(--unified-block-border)',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', zIndex: 10,
      }}>
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Iniciar Sesión</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Correo Electrónico
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: 44 }}
                placeholder="admin@jnconta.com"
              />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ width: '100%', paddingLeft: 44, paddingRight: 44 }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex',
              }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              marginBottom: 20, padding: '12px 16px', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444',
              fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
            }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, marginTop: -8 }}>
            <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--primary-400)', textDecoration: 'none', fontWeight: 600 }}>
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{
            width: '100%', justifyContent: 'center', padding: '14px 24px',
            fontSize: 14, fontWeight: 700, borderRadius: 10,
            opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Verificando...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><LogIn size={16} />Ingresar al Sistema</span>
            )}
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          ¿No tienes cuenta?{' '}
          <Link href="/register" style={{ color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}>
            Regístrate gratis
          </Link>
        </p>

        <p style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
          JnConta Enterprise v2.0 — <span style={{ color: 'var(--primary-400)' }}>Contabilidad con paridad ContPAQi</span>
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
