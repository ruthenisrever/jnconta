'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:3005' : '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
};

const API = getApiUrl();

// Componente interior que accede a searchParams (requiere Suspense)
function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get('token');
    if (!t) {
      setError('Enlace inválido o expirado. Solicita uno nuevo.');
    } else {
      setToken(t);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al restablecer la contraseña');
      setDone(true);
      setTimeout(() => router.replace('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div style={{ textAlign: 'center' }}>
      <CheckCircle size={56} style={{ color: '#22c55e', marginBottom: 16 }} />
      <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' }}>
        ¡Contraseña actualizada!
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px', lineHeight: 1.6 }}>
        Serás redirigido al inicio de sesión en unos segundos.
      </p>
      <Link href="/login" style={{ color: 'var(--primary-400)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
        Ir al inicio de sesión
      </Link>
    </div>
  );

  return (
    <>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Nueva contraseña</h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
        Elige una contraseña segura de al menos 8 caracteres.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {(['Nueva contraseña', 'Confirmar contraseña'] as const).map((label, i) => (
          <div key={label}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {label}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type={showPass ? 'text' : 'password'}
                value={i === 0 ? password : confirmPassword}
                onChange={e => i === 0 ? setPassword(e.target.value) : setConfirmPassword(e.target.value)}
                required style={{ width: '100%', paddingLeft: 44, paddingRight: i === 0 ? 44 : undefined }}
                placeholder={i === 0 ? 'Mínimo 8 caracteres' : 'Repite tu contraseña'}
                autoComplete="new-password" autoFocus={i === 0} disabled={!token}
              />
              {i === 0 && (
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex',
                }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          </div>
        ))}

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}

        <button type="submit" disabled={loading || !token} className="btn btn-primary" style={{
          width: '100%', justifyContent: 'center', padding: '13px 24px', fontSize: 14, fontWeight: 700, borderRadius: 10,
          opacity: (loading || !token) ? 0.7 : 1, cursor: (loading || !token) ? 'not-allowed' : 'pointer',
        }}>
          {loading
            ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Guardando...</span>
            : 'Restablecer contraseña'
          }
        </button>
      </form>
      <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        <Link href="/login" style={{ color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}>
          Volver al inicio de sesión
        </Link>
      </p>
    </>
  );
}

// Outer page — provee el Suspense boundary que Next.js requiere para useSearchParams
export default function ResetPasswordPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', background: 'var(--bg)', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 440, background: 'var(--surface-0)',
        borderRadius: 'var(--radius-xl)', border: 'var(--unified-block-border)',
        borderTop: 'var(--unified-block-border-top)', boxShadow: 'var(--shadow-lg)', padding: '48px 40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(14,165,233,0.1))',
            border: '1px solid rgba(6,182,212,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M6 16L9 11L13 14L18 7" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="18" cy="7" r="2" fill="#46dfdf" />
              <path d="M15 7H18V10" stroke="#46dfdf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em' }}>
            <span style={{ color: '#0ea5e9' }}>JN</span><span style={{ color: '#22d3ee' }}>Conta</span>
          </h1>
        </div>

        <Suspense fallback={<div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Verificando enlace...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
