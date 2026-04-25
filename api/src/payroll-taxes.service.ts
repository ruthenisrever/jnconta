import { Injectable } from '@nestjs/common';

// ─── Constantes fiscales 2025 ─────────────────────────────────────────────────
const UMA_DIARIA_2025   = 113.14;   // DOF 2025
const SMG_2025          = 278.80;   // Salario Mínimo General 2025

// Tabla ISR mensual 2025 (SAT - Art. 96 LISR)
const ISR_TABLE_2025 = [
  { lowerLimit:       0.01, fixedFee:       0.00, rate: 0.0192 },
  { lowerLimit:     746.05, fixedFee:      14.32, rate: 0.0640 },
  { lowerLimit:   6_332.06, fixedFee:     371.83, rate: 0.1088 },
  { lowerLimit:  11_128.02, fixedFee:     893.63, rate: 0.1600 },
  { lowerLimit:  12_935.83, fixedFee:   1_182.88, rate: 0.1792 },
  { lowerLimit:  15_487.72, fixedFee:   1_640.18, rate: 0.2136 },
  { lowerLimit:  31_236.50, fixedFee:   5_004.12, rate: 0.2352 },
  { lowerLimit:  49_233.01, fixedFee:   9_236.89, rate: 0.3000 },
  { lowerLimit:  93_993.91, fixedFee:  22_665.17, rate: 0.3200 },
  { lowerLimit: 125_325.21, fixedFee:  32_691.18, rate: 0.3400 },
  { lowerLimit: 375_975.62, fixedFee: 117_912.32, rate: 0.3500 },
];

// Subsidio al empleo mensual 2025 (SAT)
const SUBSIDY_TABLE_2025 = [
  { lowerLimit:     0.01, upperLimit:   1_768.96, subsidy: 407.02 },
  { lowerLimit: 1_768.97, upperLimit:   2_653.38, subsidy: 406.83 },
  { lowerLimit: 2_653.39, upperLimit:   3_472.84, subsidy: 406.62 },
  { lowerLimit: 3_472.85, upperLimit:   3_537.87, subsidy: 392.77 },
  { lowerLimit: 3_537.88, upperLimit:   4_446.15, subsidy: 382.46 },
  { lowerLimit: 4_446.16, upperLimit:   4_717.18, subsidy: 354.23 },
  { lowerLimit: 4_717.19, upperLimit:   5_335.42, subsidy: 324.87 },
  { lowerLimit: 5_335.43, upperLimit:   6_224.67, subsidy: 294.63 },
  { lowerLimit: 6_224.68, upperLimit:   7_113.90, subsidy: 253.54 },
  { lowerLimit: 7_113.91, upperLimit:   7_382.33, subsidy: 217.61 },
  { lowerLimit: 7_382.34, upperLimit: Infinity,   subsidy:   0.00 },
];

// Cuotas IMSS obrero 2025
const IMSS_OBRERO = {
  enfermedadEspecieExcedente: 0.004,
  gastosMedicos:              0.00375,
  invalidezVida:              0.00625,
  cesantiaVejez:              0.01125,
};

// Cuotas IMSS patronal 2025
const IMSS_PATRONAL = {
  enfermedadEspecie:          0.00705,
  enfermedadEspecieExcedente: 0.0154,
  gastosMedicos:              0.01050,
  invalidezVida:              0.01750,
  cesantiaVejez:              0.03150,
  riesgosLaborales:           0.00543,
  guarderia:                  0.01000,
};

const RCV_PATRONAL   = { retiro: 0.02, cesantiaVejez: 0.03150 };
const INFONAVIT_PTRL = 0.05;

export interface PayrollBreakdown {
  grossSalary:       number;
  horasExtra:        number;
  bono:              number;
  comision:          number;
  primaVacacional:   number;
  aguinaldoAmt:      number;
  ptuAmt:            number;
  fondoAhorro:       number;
  vales:             number;
  totalPerceptions:  number;
  isrBruto:          number;
  subsidioEmpleo:    number;
  isrNeto:           number;
  imssObrero:        number;
  infonavitDesc:     number;
  fondoAhorroDesc:   number;
  prestamo:          number;
  totalDeductions:   number;
  netAmount:         number;
  imssPatronal:      number;
  rcvPatronal:       number;
  infonavitPatronal: number;
  totalCostoEmpresa: number;
}

@Injectable()
export class PayrollTaxesService {

  readonly UMA_DIARIA = UMA_DIARIA_2025;
  readonly SMG        = SMG_2025;

  // ── ISR ────────────────────────────────────────────────────────────────────

  calculateIsr(monthlyIncome: number): number {
    if (monthlyIncome <= 0) return 0;
    const row = [...ISR_TABLE_2025].reverse().find(r => monthlyIncome >= r.lowerLimit);
    if (!row) return 0;
    return r2(row.fixedFee + (monthlyIncome - row.lowerLimit) * row.rate);
  }

  calculateSubsidio(monthlyIncome: number): number {
    const row = SUBSIDY_TABLE_2025.find(r => monthlyIncome >= r.lowerLimit && monthlyIncome <= r.upperLimit);
    return row ? row.subsidy : 0;
  }

  calculateIsrNeto(monthlyIncome: number): number {
    return r2(Math.max(0, this.calculateIsr(monthlyIncome) - this.calculateSubsidio(monthlyIncome)));
  }

  // ── IMSS Obrero ────────────────────────────────────────────────────────────

  calculateImssObrero(sdi: number, days: number): number {
    const base = sdi * days;
    const uma  = this.UMA_DIARIA;
    const especieExc = sdi > 3 * uma ? (sdi - 3 * uma) * days * IMSS_OBRERO.enfermedadEspecieExcedente : 0;
    return r2(
      especieExc +
      base * IMSS_OBRERO.gastosMedicos +
      base * IMSS_OBRERO.invalidezVida +
      base * IMSS_OBRERO.cesantiaVejez
    );
  }

  // ── IMSS Patronal ──────────────────────────────────────────────────────────

  calculateImssPatronal(sdi: number, days: number): number {
    const base     = sdi * days;
    const uma      = this.UMA_DIARIA;
    const baseEsp  = Math.min(SMG_2025, 25 * uma) * days;
    const espFija  = baseEsp * IMSS_PATRONAL.enfermedadEspecie;
    const espExc   = sdi > 3 * uma ? (sdi - 3 * uma) * days * IMSS_PATRONAL.enfermedadEspecieExcedente : 0;
    return r2(
      espFija + espExc +
      base * IMSS_PATRONAL.gastosMedicos +
      base * IMSS_PATRONAL.invalidezVida +
      base * IMSS_PATRONAL.cesantiaVejez +
      base * IMSS_PATRONAL.riesgosLaborales +
      base * IMSS_PATRONAL.guarderia
    );
  }

  // ── RCV Patronal ──────────────────────────────────────────────────────────

  calculateRcvPatronal(sdi: number, days: number): number {
    return r2(sdi * days * (RCV_PATRONAL.retiro + RCV_PATRONAL.cesantiaVejez));
  }

  // ── INFONAVIT ─────────────────────────────────────────────────────────────

  calculateInfonavitPatronal(sdi: number, days: number): number {
    return r2(sdi * days * INFONAVIT_PTRL);
  }

  calculateInfonavitObrero(sdi: number, days: number, type: string | null, discount: number): number {
    if (!type || !discount) return 0;
    switch (type) {
      case 'VSM': return r2(discount * SMG_2025 * days);
      case 'CF':  return r2((discount / 30.4) * days);
      case 'PC':  return r2(sdi * days * (discount / 100));
      default:    return 0;
    }
  }

  // ── Percepciones especiales ───────────────────────────────────────────────

  calculateAguinaldo(dailySalary: number, christmasBonusDays: number, workedDaysInYear = 365): number {
    return r2(dailySalary * (christmasBonusDays / 365) * workedDaysInYear);
  }

  calculatePrimaVacacional(dailySalary: number, vacationDays: number): number {
    return r2(dailySalary * vacationDays * 0.25);
  }

  calculatePtuEmployee(totalPtuPool: number, totalAnnualSalaries: number, employeeAnnualSalary: number): number {
    if (totalAnnualSalaries <= 0) return 0;
    return r2((totalPtuPool / totalAnnualSalaries) * employeeAnnualSalary);
  }

  // ── Cálculo completo del recibo ───────────────────────────────────────────

  calculateFullReceipt(params: {
    dailySalary:        number;
    sdi:                number;
    days:               number;
    horasExtra?:        number;
    bono?:              number;
    comision?:          number;
    primaVacacional?:   number;
    aguinaldoAmt?:      number;
    ptuAmt?:            number;
    fondoAhorroPct?:    number;
    foodVoucherDaily?:  number;
    loanMonthlyAmt?:    number;
    infonavitType?:     string | null;
    infonavitDiscount?: number;
  }): PayrollBreakdown {
    const {
      dailySalary, sdi, days,
      horasExtra = 0, bono = 0, comision = 0,
      primaVacacional = 0, aguinaldoAmt = 0, ptuAmt = 0,
      fondoAhorroPct = 0, foodVoucherDaily = 0,
      loanMonthlyAmt = 0,
      infonavitType = null, infonavitDiscount = 0,
    } = params;

    const grossSalary = r2(dailySalary * days);

    // Vales de despensa (exentos hasta 40% UMA diaria)
    const vales = r2(foodVoucherDaily * days);
    const valesGravable = r2(Math.max(0, foodVoucherDaily - this.UMA_DIARIA * 0.4) * days);

    // Fondo de ahorro: empresa aporta igual que empleado
    const fondoAhorroDesc = r2(grossSalary * (fondoAhorroPct / 100));
    const fondoAhorro     = fondoAhorroDesc; // percepción = lo que empresa aporta

    const totalPerceptions = r2(
      grossSalary + horasExtra + bono + comision +
      primaVacacional + aguinaldoAmt + ptuAmt +
      fondoAhorro + vales
    );

    // Base gravable mensual equivalente para tablas ISR
    const gravableMonthly = r2(
      ((grossSalary + horasExtra * 0.5 + bono + comision + valesGravable) / days) * 30.4
    );

    // ISR
    const isrBrutoMensual  = this.calculateIsr(gravableMonthly);
    const subsidioMensual  = this.calculateSubsidio(gravableMonthly);
    const isrNetoMensual   = Math.max(0, isrBrutoMensual - subsidioMensual);
    const isrBruto         = r2((isrBrutoMensual / 30.4) * days);
    const subsidioEmpleo   = r2((subsidioMensual / 30.4) * days);
    const isrNeto          = r2((isrNetoMensual / 30.4) * days);

    // IMSS obrero
    const imssObrero = this.calculateImssObrero(sdi, days);

    // INFONAVIT descuento empleado
    const infonavitDesc = this.calculateInfonavitObrero(sdi, days, infonavitType, infonavitDiscount);

    // Préstamo (prorrateado al periodo)
    const prestamo = r2((loanMonthlyAmt / 30.4) * days);

    const totalDeductions = r2(isrNeto + imssObrero + infonavitDesc + fondoAhorroDesc + prestamo);
    const netAmount       = r2(totalPerceptions - totalDeductions);

    // Cuotas patronales
    const imssPatronal       = this.calculateImssPatronal(sdi, days);
    const rcvPatronal        = this.calculateRcvPatronal(sdi, days);
    const infonavitPatronal  = this.calculateInfonavitPatronal(sdi, days);
    const totalCostoEmpresa  = r2(netAmount + imssPatronal + rcvPatronal + infonavitPatronal + fondoAhorro);

    return {
      grossSalary, horasExtra, bono, comision,
      primaVacacional, aguinaldoAmt, ptuAmt,
      fondoAhorro, vales, totalPerceptions,
      isrBruto, subsidioEmpleo, isrNeto,
      imssObrero, infonavitDesc, fondoAhorroDesc, prestamo,
      totalDeductions, netAmount,
      imssPatronal, rcvPatronal, infonavitPatronal, totalCostoEmpresa,
    };
  }
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
