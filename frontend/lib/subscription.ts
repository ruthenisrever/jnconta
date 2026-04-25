/**
 * Definición de features por plan — espejo del backend plan-features.ts
 * Usado en el frontend para mostrar/ocultar elementos según el plan.
 */

export interface PlanFeatures {
  accounting: boolean;
  chartOfAccounts: boolean;
  invoicing: boolean;
  clients: boolean;
  payments: boolean;
  suppliers: boolean;
  bills: boolean;
  inventory: boolean;
  banks: boolean;
  reconciliation: boolean;
  treasury: boolean;
  payroll: boolean;
  assets: boolean;
  satXml: boolean;
  satSync: boolean;
  diot: boolean;
  taxCalc: boolean;
  electronicAccounting: boolean;
  fiscalClose: boolean;
  multiCurrency: boolean;
  budgets: boolean;
  segments: boolean;
  audit: boolean;
  ai: boolean;
  maxCompanies: number;
}

export interface SubscriptionStatus {
  planId: string;
  planName: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED' | 'NONE';
  stampingUsed: number;
  stampingLimit: number;
  tokenUsed: number;
  tokenLimit: number;
  endDate: string | null;
  features: PlanFeatures;
}

const LITE: PlanFeatures = {
  accounting: true, chartOfAccounts: true, invoicing: true, clients: true,
  payments: true, suppliers: true, bills: true, inventory: false,
  banks: true, reconciliation: false, treasury: false, payroll: false,
  assets: false, satXml: true, satSync: false, diot: false, taxCalc: false,
  electronicAccounting: false, fiscalClose: false, multiCurrency: false,
  budgets: false, segments: false, audit: false, ai: false, maxCompanies: 1,
};

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  lite: LITE,
  pro: { ...LITE, inventory: true, reconciliation: true, treasury: true, payroll: true, assets: true, diot: true, taxCalc: true, fiscalClose: true, multiCurrency: true, audit: true, maxCompanies: 3 },
  business: { ...LITE, inventory: true, reconciliation: true, treasury: true, payroll: true, assets: true, diot: true, taxCalc: true, fiscalClose: true, multiCurrency: true, audit: true, satSync: true, electronicAccounting: true, budgets: true, segments: true, ai: true, maxCompanies: 10 },
  despacho: { ...LITE, inventory: true, reconciliation: true, treasury: true, payroll: true, assets: true, diot: true, taxCalc: true, fiscalClose: true, multiCurrency: true, audit: true, satSync: true, electronicAccounting: true, budgets: true, segments: true, ai: true, maxCompanies: 50 },
};

export const PLAN_LABELS: Record<string, string> = {
  lite: 'Lite',
  pro: 'Pro',
  business: 'Business',
  despacho: 'Despacho',
};

export const UPGRADE_PLAN: Record<string, string> = {
  lite: 'pro',
  pro: 'business',
  business: 'despacho',
  despacho: 'despacho',
};

// Fallback cuando no hay suscripción cargada aún
export const DEFAULT_STATUS: SubscriptionStatus = {
  planId: 'lite',
  planName: 'Lite (Trial)',
  status: 'TRIAL',
  stampingUsed: 0,
  stampingLimit: 15,
  tokenUsed: 0,
  tokenLimit: 50_000,
  endDate: null,
  features: LITE,
};
