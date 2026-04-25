'use client';
import React from 'react';
import { Lock, Zap } from 'lucide-react';
import { PlanFeatures, PLAN_LABELS, UPGRADE_PLAN } from '@/lib/subscription';

interface Props {
  feature: keyof Omit<PlanFeatures, 'maxCompanies'>;
  features: PlanFeatures;
  planId: string;
  children: React.ReactNode;
  /** Si true, solo muestra ícono de lock en lugar de un overlay completo */
  inline?: boolean;
}

export default function FeatureGate({ feature, features, planId, children, inline }: Props) {
  const hasAccess = features[feature] === true;

  if (hasAccess) return <>{children}</>;

  const nextPlan = UPGRADE_PLAN[planId] ?? 'pro';
  const nextPlanName = PLAN_LABELS[nextPlan] ?? 'Pro';

  if (inline) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.4, cursor: 'not-allowed' }}>
        <Lock size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <span style={{ fontSize: 'inherit', color: 'inherit' }}>{(children as any)?.props?.children ?? children}</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: 300 }}>
      {/* Blurred preview */}
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
        {children}
      </div>

      {/* Upgrade overlay */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', zIndex: 10,
        background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(2px)',
        borderRadius: 'var(--radius-lg)', border: '1px solid rgba(245,158,11,0.2)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', marginBottom: 16,
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={24} style={{ color: '#f59e0b' }} />
        </div>

        <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 18, margin: '0 0 8px', textAlign: 'center' }}>
          Función no disponible
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 24px', textAlign: 'center', maxWidth: 320 }}>
          Esta función requiere el plan <strong style={{ color: '#f59e0b' }}>{nextPlanName}</strong> o superior.
          Tu plan actual es <strong style={{ color: 'var(--primary-400)' }}>{PLAN_LABELS[planId] ?? planId}</strong>.
        </p>

        <a href="/#precios" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 24px', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: '#000', fontWeight: 900, fontSize: 13, textDecoration: 'none',
          borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <Zap size={15} /> Mejorar a {nextPlanName}
        </a>
      </div>
    </div>
  );
}
