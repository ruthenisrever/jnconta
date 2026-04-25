'use client';
import React, { useState, useEffect } from 'react';
import { CreditCard, BarChart3, Zap, CheckCircle2, AlertTriangle, ArrowUpRight, Star } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const PLANS = [
  { name: 'Lite',     price: '$139', folios: 15,  tokens: '50k',  desc: 'Personas físicas y startups', accent: '#38bdf8' },
  { name: 'Pro',      price: '$295', folios: 60,  tokens: '250k', desc: 'PYMEs y despachos pequeños',   accent: '#818cf8', highlight: true },
  { name: 'Business', price: '$450', folios: 200, tokens: '1M',   desc: 'Empresas con alto volumen',    accent: '#a78bfa' },
  { name: 'Despacho', price: '$1,599', folios: 800, tokens: '5M', desc: 'La estación del contador',     accent: '#34d399' },
];

export default function SuscripcionPage() {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('');

  useEffect(() => {
    const cid = localStorage.getItem('companyId') || '';
    setCompanyId(cid);
    if (cid) fetchSub(cid);
  }, []);

  const fetchSub = async (cid: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/subscriptions/status?companyId=${cid}`);
      if (res.ok) setSub(await res.json());
    } catch { /* offline graceful */ }
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
      alert('Para habilitar los pagos, configure STRIPE_SECRET_KEY en el servidor.');
    }
  };

  const pct = sub ? Math.round((sub.stampingUsed / sub.stampingLimit) * 100) : 0;
  const dangerZone = pct >= 80;

  return (
    <main className="main-content">
      <header className="page-header">
        <div className="page-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: 8, background: 'rgba(99,102,241,0.15)', borderRadius: 10 }}>
              <CreditCard size={22} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <h1 style={{ margin: 0 }}>Mi Suscripción</h1>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Estado de tu plan y consumo mensual</p>
            </div>
          </div>
        </div>
      </header>

      {/* Current Plan Banner */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
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
                <div style={{ height: 26, width: 120, background: 'var(--surface-2)', borderRadius: 6 }} />
              ) : (
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {sub?.planName || 'Trial Lite'}
                  {sub?.status === 'TRIAL' && (
                    <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(251,191,36,0.3)' }}>
                      TRIAL
                    </span>
                  )}
                  {sub?.status === 'ACTIVE' && (
                    <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(34,197,94,0.3)' }}>
                      ACTIVO
                    </span>
                  )}
                </p>
              )}
              {sub?.endDate && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Vence: {new Date(sub.endDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => handleUpgrade('Pro')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #0ea5e9)',
              border: 'none', borderRadius: 10, color: '#fff',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}
          >
            <ArrowUpRight size={16} /> Mejorar Plan
          </button>
        </div>

        {/* Usage meters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
          {/* Folios */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                <BarChart3 size={12} style={{ display: 'inline', marginRight: 4 }} />Folios CFDI
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: dangerZone ? 'var(--danger)' : 'var(--text-primary)' }}>
                {loading ? '...' : `${sub?.stampingUsed ?? 0} / ${sub?.stampingLimit ?? '—'}`}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill${dangerZone ? ' danger' : ''}`}
                style={{ width: loading ? '0%' : `${Math.min(pct, 100)}%` }}
              />
            </div>
            {dangerZone && (
              <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={11} /> Estás al {pct}% de tu límite mensual.
              </p>
            )}
          </div>

          {/* Tokens IA */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                <Zap size={12} style={{ display: 'inline', marginRight: 4 }} />Tokens IA
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {loading ? '...' : `${(sub?.tokenUsed ?? 0).toLocaleString()} / ${(sub?.tokenLimit ?? 0).toLocaleString()}`}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: loading ? '0%' : `${Math.min(Math.round(((sub?.tokenUsed ?? 0) / (sub?.tokenLimit ?? 1)) * 100), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--text-secondary)' }}>Planes disponibles</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {PLANS.map(plan => {
            const isCurrent = sub?.planName?.toLowerCase() === plan.name.toLowerCase();
            return (
              <div
                key={plan.name}
                style={{
                  background: plan.highlight
                    ? `linear-gradient(135deg, rgba(99,102,241,0.08), rgba(14,165,233,0.05))`
                    : 'var(--glass-bg)',
                  border: isCurrent
                    ? `2px solid ${plan.accent}`
                    : plan.highlight
                    ? '1px solid rgba(99,102,241,0.3)'
                    : '1px solid var(--glass-border)',
                  borderRadius: 20,
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  position: 'relative',
                }}
              >
                {isCurrent && (
                  <div style={{
                    position: 'absolute', top: -10, left: 20,
                    background: plan.accent, color: '#000',
                    fontSize: 9, fontWeight: 900, textTransform: 'uppercase',
                    letterSpacing: '0.2em', padding: '3px 10px', borderRadius: 20,
                  }}>
                    Tu plan actual
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: plan.accent, margin: 0 }}>{plan.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>{plan.desc}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{plan.price}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>/mes MXN</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{plan.folios}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Folios/mes</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{plan.tokens}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tokens IA</p>
                  </div>
                </div>

                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.name)}
                  disabled={isCurrent}
                  style={{
                    padding: '9px 0', borderRadius: 10, fontWeight: 700, fontSize: 12,
                    textTransform: 'uppercase', letterSpacing: '0.15em', cursor: isCurrent ? 'default' : 'pointer',
                    border: 'none',
                    background: isCurrent
                      ? 'rgba(255,255,255,0.05)'
                      : `linear-gradient(135deg, ${plan.accent}33, ${plan.accent}22)`,
                    color: isCurrent ? 'var(--text-muted)' : plan.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  {isCurrent ? <><CheckCircle2 size={13} /> Plan Activo</> : <><ArrowUpRight size={13} /> Seleccionar</>}
                </button>
              </div>
            );
          })}
        </div>

        <p style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={12} style={{ color: 'var(--warning)' }} />
          Folio excedente: $1.00 MXN ($0.80 en Plan Despacho). Precios + IVA. Facturación mensual.
        </p>
      </div>
    </main>
  );
}
