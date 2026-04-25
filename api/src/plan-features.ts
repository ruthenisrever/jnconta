/**
 * Definición canónica de qué funciones están disponibles por plan.
 * Usado en el backend (subscription status) y espejado en el frontend.
 */

export interface PlanFeatures {
  // Contabilidad
  accounting: boolean;       // Pólizas contables
  chartOfAccounts: boolean;  // Plan de cuentas
  // Ventas
  invoicing: boolean;        // Facturación CFDI emisión
  clients: boolean;          // Clientes / CxC
  payments: boolean;         // Complemento de pagos REP
  // Compras
  suppliers: boolean;        // Proveedores
  bills: boolean;            // Facturas recibidas
  inventory: boolean;        // Inventario / Kardex
  // Tesorería
  banks: boolean;            // Bancos básico
  reconciliation: boolean;   // Conciliación bancaria
  treasury: boolean;         // Flujo de tesorería
  // Nómina y RRHH
  payroll: boolean;          // Nómina CFDI 1.2
  // Activos
  assets: boolean;           // Activos fijos / depreciación
  // SAT / Fiscal
  satXml: boolean;           // Gestor XML SAT (importar CFDIs)
  satSync: boolean;          // Descarga masiva SAT
  diot: boolean;             // Reporte DIOT
  taxCalc: boolean;          // Cálculo de impuestos IVA/ISR
  electronicAccounting: boolean; // Contabilidad electrónica (e-Accounting SAT)
  fiscalClose: boolean;      // Cierre del ejercicio
  multiCurrency: boolean;    // Multimoneda
  // Control gerencial
  budgets: boolean;          // Presupuestos
  segments: boolean;         // Centros de costo
  audit: boolean;            // Bitácora forense / auditoría
  // IA
  ai: boolean;               // Javier IA (Gemini)
  // Multi-empresa
  maxCompanies: number;
}

const LITE: PlanFeatures = {
  accounting: true,
  chartOfAccounts: true,
  invoicing: true,
  clients: true,
  payments: true,
  suppliers: true,
  bills: true,
  inventory: false,
  banks: true,
  reconciliation: false,
  treasury: false,
  payroll: false,
  assets: false,
  satXml: true,
  satSync: false,
  diot: false,
  taxCalc: false,
  electronicAccounting: false,
  fiscalClose: false,
  multiCurrency: false,
  budgets: false,
  segments: false,
  audit: false,
  ai: false,
  maxCompanies: 1,
};

const PRO: PlanFeatures = {
  ...LITE,
  inventory: true,
  reconciliation: true,
  treasury: true,
  payroll: true,
  assets: true,
  diot: true,
  taxCalc: true,
  fiscalClose: true,
  multiCurrency: true,
  audit: true,
  maxCompanies: 3,
};

const BUSINESS: PlanFeatures = {
  ...PRO,
  satSync: true,
  electronicAccounting: true,
  budgets: true,
  segments: true,
  ai: true,
  maxCompanies: 10,
};

const DESPACHO: PlanFeatures = {
  ...BUSINESS,
  maxCompanies: 50,
};

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  lite:     LITE,
  pro:      PRO,
  business: BUSINESS,
  despacho: DESPACHO,
};

export function getPlanFeatures(planId?: string | null): PlanFeatures {
  if (!planId) return LITE;
  return PLAN_FEATURES[planId.toLowerCase()] ?? LITE;
}
