'use client';
import React, { useState, useEffect } from 'react';
import { Building2, ChevronRight, LogOut, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface Company { id: string; name: string; rfc: string; logo: string | null }

export default function SelectCompanyPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    apiFetch('/api/auth/my-companies')
      .then(r => r.json())
      .then(data => { setCompanies(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const select = async (companyId: string) => {
    setSwitching(companyId);
    try {
      const res = await apiFetch('/api/auth/switch-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      localStorage.setItem('jnconta_token', data.access_token);
      localStorage.setItem('companyId', data.company.id);
      // Update user data with new company
      const user = JSON.parse(localStorage.getItem('jnconta_user') || '{}');
      localStorage.setItem('jnconta_user', JSON.stringify({ ...user, companyId: data.company.id, companyName: data.company.name }));
      sessionStorage.removeItem('jnconta_subscription');
      router.replace('/');
    } catch (err: any) {
      alert(err.message || 'Error al cambiar de empresa');
      setSwitching(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('jnconta_token');
    localStorage.removeItem('jnconta_user');
    localStorage.removeItem('companyId');
    router.replace('/login');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: 'var(--font-sans)', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto 20px',
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
          <h1 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Selecciona la empresa
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            Elige la empresa en la que deseas trabajar hoy
          </p>
        </div>

        {/* Company list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} style={{
                height: 76, borderRadius: 12, background: 'var(--surface-1)',
                border: 'var(--unified-block-border)', opacity: 0.5,
                animation: 'pulse 1.5s ease infinite',
              }} />
            ))
          ) : companies.length === 0 ? (
            <div style={{
              padding: '40px 24px', textAlign: 'center',
              background: 'var(--surface-0)', borderRadius: 12,
              border: 'var(--unified-block-border)',
            }}>
              <Building2 size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <div style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
                No tienes empresas asignadas.<br />
                <button onClick={() => router.push('/empresas')} style={{ background: 'none', border: 'none', color: 'var(--primary-400)', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Crea una nueva empresa
                </button>
              </div>
            </div>
          ) : (
            companies.map(company => {
              const isLoading = switching === company.id;
              return (
                <button
                  key={company.id}
                  onClick={() => select(company.id)}
                  disabled={!!switching}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16,
                    padding: '16px 20px', background: 'var(--surface-0)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12, cursor: switching ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease', textAlign: 'left', width: '100%',
                    opacity: switching && !isLoading ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!switching) (e.currentTarget as any).style.background = 'var(--surface-1)'; }}
                  onMouseLeave={e => { (e.currentTarget as any).style.background = 'var(--surface-0)'; }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(6,182,212,0.1))',
                    border: '1px solid rgba(6,182,212,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {company.logo
                      ? <img src={company.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      : <Building2 size={20} style={{ color: '#06b6d4' }} />
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {company.name}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      RFC: {company.rfc || 'Sin RFC'}
                    </p>
                  </div>

                  {/* Arrow / spinner */}
                  {isLoading
                    ? <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid #06b6d4', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                    : <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  }
                </button>
              );
            })
          )}
        </div>

        {/* Add company hint (if plan allows) */}
        <button style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', marginTop: 12, padding: '12px 20px',
          background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 12, cursor: 'pointer', color: 'var(--text-muted)',
          fontSize: 13, fontWeight: 600, transition: 'all 0.15s ease',
        }}
          onClick={() => router.push('/empresas')}
          onMouseEnter={e => { (e.currentTarget as any).style.borderColor = 'rgba(6,182,212,0.3)'; (e.currentTarget as any).style.color = '#06b6d4'; }}
          onMouseLeave={e => { (e.currentTarget as any).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as any).style.color = 'var(--text-muted)'; }}
        >
          <Plus size={16} /> Agregar otra empresa
        </button>

        {/* Logout */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <button onClick={logout} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
          }}>
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  );
}
