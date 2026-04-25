'use client';
import React, { useState, useEffect, Suspense } from 'react';
import {
  Lock, Mail, Eye, EyeOff, User, Building2, FileText, ArrowRight,
  ArrowLeft, Tag, CheckCircle, CreditCard, Zap, Star, Crown, Sparkles,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

const PLANS = [
  {
    id: 'lite', name: 'Lite', price: 139, folios: 15, tokens: '50k',
    desc: 'Personas físicas y startups',
    features: ['Facturación CFDI 4.0', 'Contabilidad básica', 'Clientes y proveedores', 'Gestor XML SAT'],
    accent: '#38bdf8', icon: Star,
  },
  {
    id: 'pro', name: 'Pro', price: 295, folios: 60, tokens: '250k',
    desc: 'PYMEs y despachos pequeños',
    features: ['Todo Lite +', 'Nómina completa', 'Inventario/Kardex', 'DIOT e impuestos', 'Conciliación bancaria', 'Auditoría'],
    accent: '#818cf8', icon: Zap, highlight: true,
  },
  {
    id: 'business', name: 'Business', price: 449, folios: 200, tokens: '1M',
    desc: 'Empresas con alto volumen',
    features: ['Todo Pro +', 'Contabilidad electrónica', 'Descarga masiva SAT', 'Presupuestos', 'Centros de costo', 'IA Contable'],
    accent: '#a78bfa', icon: Sparkles,
  },
  {
    id: 'despacho', name: 'Despacho', price: 1599, folios: 800, tokens: '5M',
    desc: 'La estación del contador profesional',
    features: ['Todo Business +', 'Hasta 50 empresas', 'Soporte prioritario', 'Onboarding personalizado'],
    accent: '#34d399', icon: Crown,
  },
];

// ── Formulario interior (usa useSearchParams) ──────────────────────────────────
function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 — datos de la cuenta
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', companyName: '', rfc: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [step1Error, setStep1Error] = useState('');

  // Step 2 — plan + promo
  const [selectedPlan, setSelectedPlan] = useState<string>('lite');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<any>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [step2Error, setStep2Error] = useState('');

  // Preseleccionar plan desde URL (?plan=pro)
  useEffect(() => {
    const p = searchParams.get('plan');
    if (p && PLANS.find(pl => pl.id === p)) setSelectedPlan(p);
  }, [searchParams]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Step 1: validar y avanzar ────────────────────────────────────────────────
  const goToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error('');
    if (form.password !== form.confirmPassword) { setStep1Error('Las contraseñas no coinciden.'); return; }
    if (form.password.length < 8) { setStep1Error('La contraseña debe tener al menos 8 caracteres.'); return; }
    setStep(2);
  };

  // ── Validar código de promo ──────────────────────────────────────────────────
  const checkPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoChecking(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const res = await fetch(`${API}/api/subscriptions/validate-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Código inválido');
      setPromoResult(data);
      setSelectedPlan(data.planId);
    } catch (err: any) {
      setPromoError(err.message || 'Error al verificar el código');
    } finally {
      setPromoChecking(false);
    }
  };

  // ── Registrar + aplicar promo (gratis) ─────────────────────────────────────
  const handleFreeActivation = async () => {
    setProcessing(true);
    setStep2Error('');
    try {
      // 1. Crear cuenta
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

      // 2. Aplicar código de promo
      const promoRes = await fetch(`${API}/api/subscriptions/apply-promo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${signupData.access_token}`,
        },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      });
      if (!promoRes.ok) {
        const d = await promoRes.json();
        throw new Error(d.message || 'No se pudo aplicar el código');
      }

      sessionStorage.removeItem('jnconta_subscription');
      router.replace('/');
    } catch (err: any) {
      setStep2Error(err.message || 'Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  // ── Registrar + ir a Stripe ─────────────────────────────────────────────────
  const handlePaidCheckout = async () => {
    setProcessing(true);
    setStep2Error('');
    try {
      // 1. Crear cuenta
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

      // 2. Crear sesión de checkout
      const checkoutRes = await fetch(`${API}/api/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${signupData.access_token}`,
        },
        body: JSON.stringify({ planId: selectedPlan, tenantId: signupData.user.tenantId || signupData.user.companyId }),
      });
      const checkoutData = await checkoutRes.json();

      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      } else {
        // Sin Stripe configurado → ir al dashboard con trial
        router.replace('/');
      }
    } catch (err: any) {
      setStep2Error(err.message || 'Error de conexión');
    } finally {
      setProcessing(false);
    }
  };

  const plan = PLANS.find(p => p.id === selectedPlan) ?? PLANS[0];
  const isFree = promoResult && promoResult.discountPct === 100;

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 700,
    color: 'var(--text-muted)', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: '0.8px',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', fontFamily: 'var(--font-sans)', background: 'var(--bg)',
    }}>
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
              <span style={{ fontSize: '10px', color: '#06b6d4', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4em' }}>Ultra Elite</span>
            </div>
          </div>

          {/* Pasos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
            {[{ n: 1, label: 'Tu cuenta' }, { n: 2, label: 'Tu plan' }].map(({ n, label }, i) => (
              <React.Fragment key={n}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 14,
                    background: step >= n ? 'linear-gradient(135deg, #0ea5e9, #22d3ee)' : 'var(--surface-2)',
                    color: step >= n ? '#000' : 'var(--text-muted)',
                    border: step === n ? '2px solid #22d3ee' : '2px solid transparent',
                    transition: 'all 0.3s',
                  }}>{step > n ? '✓' : n}</div>
                  <span style={{ fontSize: 11, color: step >= n ? '#22d3ee' : 'var(--text-muted)', fontWeight: 700 }}>{label}</span>
                </div>
                {i === 0 && <div style={{ flex: 1, height: 2, background: step > 1 ? 'linear-gradient(90deg,#0ea5e9,#22d3ee)' : 'var(--surface-2)', borderRadius: 2, maxWidth: 60, transition: 'all 0.3s' }} />}
              </React.Fragment>
            ))}
          </div>

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: '✅', label: 'Sin tarjeta de crédito', desc: 'Prueba 30 días completamente gratis' },
                { icon: '🧾', label: 'CFDI 4.0 incluido', desc: 'Timbrado directo con el SAT vía PAC' },
                { icon: '💰', label: 'Nómina ISR 2024', desc: 'IMSS, INFONAVIT y RCV calculados' },
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
          )}

          {step === 2 && (
            <div style={{ textAlign: 'left' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 }}>
                {promoResult
                  ? `🎉 Plan ${promoResult.planName} activado por ${promoResult.months} ${promoResult.months === 1 ? 'mes' : 'meses'}`
                  : 'Selecciona el plan que mejor se adapte a tu negocio'}
              </p>
              {/* Plan seleccionado preview */}
              <div style={{ padding: '20px 24px', background: 'var(--unified-block-bg)', borderRadius: 'var(--radius-lg)', border: `1px solid ${plan.accent}40`, borderTop: `1px solid ${plan.accent}` }}>
                <p style={{ fontSize: 11, color: plan.accent, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5em', margin: '0 0 4px' }}>{plan.name}</p>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 2px' }}>
                  {isFree ? <span style={{ color: '#22c55e' }}>GRATIS</span> : `$${plan.price.toLocaleString()}`}
                  {!isFree && <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)' }}> MXN/mes</span>}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px' }}>{plan.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {plan.features.slice(0, 3).map(f => (
                    <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <CheckCircle size={13} style={{ color: plan.accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PANEL DERECHO ───────────────────────────────────── */}
      <div style={{
        width: 540, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '40px 52px', background: 'var(--surface-0)', borderLeft: 'var(--unified-block-border)',
        boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', zIndex: 10, overflowY: 'auto',
      }}>

        {/* ═══ STEP 1 — Datos de la cuenta ═══ */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px' }}>Crear cuenta</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>Completa tus datos para comenzar</p>
            </div>

            <form onSubmit={goToStep2} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

              {step1Error && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
                  ⚠️ {step1Error}
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px 24px', fontSize: 14, fontWeight: 700, borderRadius: 10, marginTop: 4 }}>
                Continuar <ArrowRight size={16} />
              </button>

              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                Al registrarte aceptas los{' '}
                <a href="#" style={{ color: 'var(--primary-400)' }}>Términos de servicio</a>
              </p>
            </form>

            <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" style={{ color: 'var(--primary-400)', fontWeight: 600, textDecoration: 'none' }}>Iniciar sesión</Link>
            </p>
          </>
        )}

        {/* ═══ STEP 2 — Plan + Promo + Pago ═══ */}
        {step === 2 && (
          <>
            <div style={{ marginBottom: 24 }}>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: 0, marginBottom: 16 }}>
                <ArrowLeft size={15} /> Volver
              </button>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>Elige tu plan</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 13 }}>Comienza gratis 30 días o activa con código de promoción</p>
            </div>

            {/* Código de promoción */}
            <div style={{ marginBottom: 20, padding: '16px 20px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 12 }}>
              <label style={{ ...labelStyle, color: '#34d399', marginBottom: 10 }}>
                <Tag size={13} style={{ display: 'inline', marginRight: 6 }} />Código de promoción
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoResult(null); setPromoError(''); }}
                  onKeyDown={e => e.key === 'Enter' && checkPromo()}
                  placeholder="Ej: DESPACHO2024"
                  style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
                  disabled={!!promoResult}
                />
                {!promoResult ? (
                  <button onClick={checkPromo} disabled={promoChecking || !promoCode.trim()} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap', padding: '0 18px' }}>
                    {promoChecking ? '...' : 'Aplicar'}
                  </button>
                ) : (
                  <button onClick={() => { setPromoResult(null); setPromoCode(''); setSelectedPlan('lite'); }} className="btn btn-ghost btn-sm" style={{ whiteSpace: 'nowrap' }}>
                    Quitar
                  </button>
                )}
              </div>
              {promoError && <p style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0' }}>⚠️ {promoError}</p>}
              {promoResult && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8 }}>
                  <CheckCircle size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                  <div>
                    <p style={{ color: '#22c55e', fontWeight: 700, fontSize: 13, margin: 0 }}>
                      ¡Código válido! Plan {promoResult.planName}
                      {promoResult.discountPct === 100 ? ' gratis' : ` con ${promoResult.discountPct}% off`}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: 0 }}>{promoResult.description} · {promoResult.months} {promoResult.months === 1 ? 'mes' : 'meses'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Cards de planes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {PLANS.map(p => {
                const Icon = p.icon;
                const active = selectedPlan === p.id;
                return (
                  <button key={p.id} onClick={() => { setSelectedPlan(p.id); setPromoResult(null); setPromoCode(''); }}
                    disabled={!!promoResult}
                    style={{
                      padding: '14px 16px', borderRadius: 12, cursor: promoResult ? 'default' : 'pointer',
                      border: active ? `2px solid ${p.accent}` : '2px solid var(--border-subtle)',
                      background: active ? `${p.accent}12` : 'var(--surface-1)',
                      textAlign: 'left', transition: 'all 0.2s',
                      opacity: promoResult && !active ? 0.4 : 1,
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <Icon size={16} style={{ color: p.accent }} />
                      {p.id === 'pro' && <span style={{ fontSize: 9, background: p.accent, color: '#000', borderRadius: 4, padding: '2px 6px', fontWeight: 900 }}>POPULAR</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: active ? '#fff' : 'var(--text-secondary)', margin: '0 0 2px' }}>{p.name}</p>
                    <p style={{ fontSize: 17, fontWeight: 900, color: active ? p.accent : 'var(--text-muted)', margin: 0 }}>
                      ${p.price.toLocaleString()}<span style={{ fontSize: 10, fontWeight: 400 }}>/mes</span>
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Features del plan seleccionado */}
            <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--surface-1)', borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '0 0 8px' }}>Incluye en {plan.name}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <CheckCircle size={12} style={{ color: plan.accent, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {step2Error && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
                ⚠️ {step2Error}
              </div>
            )}

            {/* Botón principal */}
            {isFree ? (
              <button onClick={handleFreeActivation} disabled={processing} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 14, fontWeight: 700, borderRadius: 10, background: 'linear-gradient(135deg, #22c55e, #16a34a)', opacity: processing ? 0.7 : 1 }}>
                {processing
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Activando...</span>
                  : <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={16} />Activar Plan {promoResult.planName} gratis</span>
                }
              </button>
            ) : (
              <button onClick={handlePaidCheckout} disabled={processing} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 24px', fontSize: 14, fontWeight: 700, borderRadius: 10, opacity: processing ? 0.7 : 1 }}>
                {processing
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />Procesando...</span>
                  : <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CreditCard size={16} />
                      {selectedPlan === 'lite'
                        ? 'Comenzar 30 días gratis'
                        : `Pagar $${plan.price.toLocaleString()} MXN con tarjeta`}
                    </span>
                }
              </button>
            )}

            {selectedPlan === 'lite' && !promoResult && (
              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', margin: '10px 0 0' }}>
                Sin tarjeta de crédito. Cancela cuando quieras.
              </p>
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Wrapper con Suspense para useSearchParams
export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted)' }}>Cargando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
