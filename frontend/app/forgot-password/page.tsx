'use client';
import React, { useState } from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocal ? 'http://localhost:3005' : '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
};

const API = getApiUrl();

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      // Always show success to prevent email enumeration
      setSent(true);
    } catch {
      setSent(true); // Still show success
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-sans)', background: 'var(--bg)', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'var(--surface-0)', borderRadius: 'var(--radius-xl)',
        border: 'var(--unified-block-border)', borderTop: 'var(--unified-block-border-top)',
        boxShadow: 'var(--shadow-lg)', padding: '48px 40px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(14,165,233,0.1))',
            border: '1px solid rgba(6,182,212,0.3)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M6 16L9 11L13 14L18 7" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="18" cy="7" r="2" fill="#46dfdf" />
              <path d="M15 7H18V10" stroke="#46dfdf" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ margin: '0 0 4px', fontWeight: 900, fontSize: 26, letterSpacing: '-0.03em' }}>
            <span style={{ color: '#0ea5e9' }}>JN</span><span style={{ color: '#22d3ee' }}>Conta</span>
          </h1>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <span style={{ fontSize: 28 }}>✉️</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 12px' }}>
              Revisa tu correo
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
              Si el correo <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong> está registrado,
              recibirás un enlace para restablecer tu contraseña en los próximos minutos.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 24px' }}>
              Revisa también tu carpeta de spam.
            </p>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              color: 'var(--primary-400)', fontWeight: 600, fontSize: 14, textDecoration: 'none',
            }}>
              <ArrowLeft size={16} /> Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Olvidé mi contraseña
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 28px', lineHeight: 1.6 }}>
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
                  marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.8px',
                }}>
                  Correo electrónico
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    style={{ width: '100%', paddingLeft: 44 }} placeholder="tu@empresa.com"
                    autoComplete="email" autoFocus
                  />
                </div>
              </div>

              {error && (
                <div style={{
                  marginBottom: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8,
                  color: '#ef4444', fontSize: 13,
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary" style={{
                width: '100%', justifyContent: 'center', padding: '13px 24px',
                fontSize: 14, fontWeight: 700, borderRadius: 10,
                opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Enviando...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Send size={16} /> Enviar enlace
                  </span>
                )}
              </button>
            </form>

            <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}>
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
