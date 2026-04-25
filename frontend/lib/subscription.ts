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

// Plan máximo — todas las funciones desbloqueadas
const ALL_FEATURES: PlanFeatures = {
  accounting: true, chartOfAccounts: true, invoicing: true, clients: true,
  payments: true, suppliers: true, bills: true, inventory: true,
  banks: true, reconciliation: true, treasury: true, payroll: true,
  assets: true, satXml: true, satSync: true, diot: true, taxCalc: true,
  electronicAccounting: true, fiscalClose: true, multiCurrency: true,
  budgets: true, segments: true, audit: true, ai: true, maxCompanies: 9999,
};

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  lite: ALL_FEATURES,
  pro: ALL_FEATURES,
  business: ALL_FEATURES,
  despacho: ALL_FEATURES,
};

export const PLAN_LABELS: Record<string, string> = {
  despacho: 'Despacho Elite',
};

export const UPGRADE_PLAN: Record<string, string> = {
  despacho: 'despacho',
};

// Default — plan más completo, todo activo, sin restricciones
export const DEFAULT_STATUS: SubscriptionStatus = {
  planId: 'despacho',
  planName: 'Despacho Elite',
  status: 'ACTIVE',
  stampingUsed: 0,
  stampingLimit: 999999,
  tokenUsed: 0,
  tokenLimit: 9_999_999,
  endDate: null,
  features: ALL_FEATURES,
};
