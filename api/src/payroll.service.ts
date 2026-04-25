import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PayrollTaxesService } from './payroll-taxes.service';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private taxes: PayrollTaxesService
  ) {}

  async calculatePeriod(periodId: string) {
    const period = await (this.prisma as any).payrollPeriod.findUnique({
      where: { id: periodId }, include: { company: true }
    });
    if (!period) throw new BadRequestException('Periodo no encontrado.');

    await (this.prisma as any).payrollReceipt.deleteMany({ where: { periodId } });

    const employees = await (this.prisma as any).employee.findMany({
      where: { companyId: period.companyId, isActive: true }
    });

    const receipts = [];
    for (const emp of employees) {
      const r = await this.calculateEmployeeReceipt(emp.id, period.id);
      if (r) receipts.push(r);
    }

    await (this.prisma as any).payrollPeriod.update({
      where: { id: periodId }, data: { status: 'CALCULADA' }
    });

    return { periodId, count: receipts.length, receipts };
  }

  async calculateEmployeeReceipt(
    employeeId: string,
    periodId: string,
    extras: { horasExtra?: number; bono?: number; comision?: number;
               primaVacacional?: number; aguinaldoAmt?: number; ptuAmt?: number } = {}
  ) {
    const emp    = await (this.prisma as any).employee.findUnique({ where: { id: employeeId } });
    const period = await (this.prisma as any).payrollPeriod.findUnique({ where: { id: periodId } });
    if (!emp || !period) return null;

    const diffMs = Math.abs(new Date(period.endDate).getTime() - new Date(period.startDate).getTime());
    const days   = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

    // Calcular salario base según tipo de pago
    let effectiveDailySalary = Number(emp.dailySalary);
    if (emp.payType === 'POR_HORA') {
      const horasTrabajadas = extras.horasExtra ?? (days * 8);
      effectiveDailySalary = (Number(emp.hourlyRate ?? 0) * horasTrabajadas) / days;
    } else if (emp.payType === 'DESTAJO') {
      const piezas = extras.comision ?? 0; // usamos comision para pasar piezas
      effectiveDailySalary = (Number(emp.destajoRate ?? 0) * piezas) / days;
      extras = { ...extras, comision: 0 };
    } else if (emp.payType === 'COMISION') {
      // salario base + comision variable
    }

    const bd = this.taxes.calculateFullReceipt({
      dailySalary:       effectiveDailySalary,
      sdi:               Number(emp.sdi),
      days,
      horasExtra:        extras.horasExtra       || 0,
      bono:              extras.bono             || 0,
      comision:          extras.comision         || 0,
      primaVacacional:   extras.primaVacacional  || 0,
      aguinaldoAmt:      extras.aguinaldoAmt     || 0,
      ptuAmt:            extras.ptuAmt           || 0,
      fondoAhorroPct:    Number(emp.savingsFundPct)    || 0,
      foodVoucherDaily:  Number(emp.foodVoucherAmt)    || 0,
      loanMonthlyAmt:    Number(emp.loanMonthlyAmt)    || 0,
      infonavitType:     emp.infonavitType              || null,
      infonavitDiscount: Number(emp.infonavitDiscount)  || 0,
    });

    const items: any[] = [];
    const uma = this.taxes.UMA_DIARIA;

    // Percepciones
    if (bd.grossSalary > 0)
      items.push({ type: 'P', satCode: '001', concept: 'Sueldos y Salarios',
        amountTaxable: bd.grossSalary, amountExempt: 0, amountTotal: bd.grossSalary });
    if (bd.horasExtra > 0)
      items.push({ type: 'P', satCode: '019', concept: 'Horas Extra',
        amountTaxable: bd.horasExtra * 0.5, amountExempt: bd.horasExtra * 0.5, amountTotal: bd.horasExtra });
    if (bd.bono > 0)
      items.push({ type: 'P', satCode: '010', concept: 'Premio / Bono',
        amountTaxable: bd.bono, amountExempt: 0, amountTotal: bd.bono });
    if (bd.comision > 0)
      items.push({ type: 'P', satCode: '009', concept: 'Comisiones',
        amountTaxable: bd.comision, amountExempt: 0, amountTotal: bd.comision });
    if (bd.primaVacacional > 0) {
      const ex = Math.min(bd.primaVacacional, uma * 15);
      items.push({ type: 'P', satCode: '006', concept: 'Prima Vacacional',
        amountTaxable: Math.max(0, bd.primaVacacional - ex), amountExempt: ex, amountTotal: bd.primaVacacional });
    }
    if (bd.aguinaldoAmt > 0) {
      const ex = Math.min(bd.aguinaldoAmt, uma * 30);
      items.push({ type: 'P', satCode: '002', concept: 'Aguinaldo',
        amountTaxable: Math.max(0, bd.aguinaldoAmt - ex), amountExempt: ex, amountTotal: bd.aguinaldoAmt });
    }
    if (bd.ptuAmt > 0) {
      const ex = Math.min(bd.ptuAmt, uma * 15);
      items.push({ type: 'P', satCode: '003', concept: 'PTU',
        amountTaxable: Math.max(0, bd.ptuAmt - ex), amountExempt: ex, amountTotal: bd.ptuAmt });
    }
    if (bd.fondoAhorro > 0)
      items.push({ type: 'P', satCode: '025', concept: 'Fondo de Ahorro (Empresa)',
        amountTaxable: 0, amountExempt: bd.fondoAhorro, amountTotal: bd.fondoAhorro });
    if (bd.vales > 0) {
      const ex = Math.min(bd.vales, uma * 0.4 * days);
      items.push({ type: 'P', satCode: '028', concept: 'Vales de Despensa',
        amountTaxable: Math.max(0, bd.vales - ex), amountExempt: ex, amountTotal: bd.vales });
    }
    if (bd.subsidioEmpleo > 0)
      items.push({ type: 'O', satCode: '002', concept: 'Subsidio para el Empleo',
        amountTaxable: 0, amountExempt: bd.subsidioEmpleo, amountTotal: bd.subsidioEmpleo });

    // Deducciones
    if (bd.isrNeto > 0)
      items.push({ type: 'D', satCode: '002', concept: 'ISR',
        amountTaxable: 0, amountExempt: 0, amountTotal: bd.isrNeto });
    if (bd.imssObrero > 0)
      items.push({ type: 'D', satCode: '001', concept: 'Seguridad Social (IMSS)',
        amountTaxable: 0, amountExempt: 0, amountTotal: bd.imssObrero });
    if (bd.infonavitDesc > 0)
      items.push({ type: 'D', satCode: '007', concept: 'INFONAVIT',
        amountTaxable: 0, amountExempt: 0, amountTotal: bd.infonavitDesc });
    if (bd.fondoAhorroDesc > 0)
      items.push({ type: 'D', satCode: '027', concept: 'Fondo de Ahorro (Empleado)',
        amountTaxable: 0, amountExempt: 0, amountTotal: bd.fondoAhorroDesc });
    if (bd.prestamo > 0)
      items.push({ type: 'D', satCode: '014', concept: 'Préstamo',
        amountTaxable: 0, amountExempt: 0, amountTotal: bd.prestamo });

    return (this.prisma as any).payrollReceipt.create({
      data: { employeeId, periodId,
        totalPerceptions: bd.totalPerceptions,
        totalDeductions:  bd.totalDeductions,
        netAmount:        bd.netAmount,
        status: 'PENDIENTE',
        items: { create: items }
      },
      include: { employee: true, items: true }
    });
  }

  async generateSUA(_companyId: string, periodId: string): Promise<string> {
    const period = await (this.prisma as any).payrollPeriod.findUnique({
      where: { id: periodId },
      include: { company: true, receipts: { include: { employee: true } } }
    });
    if (!period) throw new BadRequestException('Periodo no encontrado');
    const comp  = period.company;
    const lines: string[] = [];
    lines.push(`1${(comp.rfc || '').padEnd(13)}${(comp.name || '').substring(0, 40).padEnd(40)}01${new Date(period.paymentDate).getFullYear()}`);
    for (const receipt of period.receipts) {
      const emp  = receipt.employee;
      const sdi  = Number(emp.sdi);
      const diffMs = Math.abs(new Date(period.endDate).getTime() - new Date(period.startDate).getTime());
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
      lines.push([
        '2',
        (emp.nss || '').padEnd(11),
        `${emp.firstName} ${emp.lastName}`.substring(0, 40).padEnd(40),
        sdi.toFixed(2).padStart(9, '0'),
        days.toString().padStart(2, '0'),
        this.taxes.calculateImssObrero(sdi, days).toFixed(2).padStart(10, '0'),
        this.taxes.calculateImssPatronal(sdi, days).toFixed(2).padStart(10, '0'),
        this.taxes.calculateRcvPatronal(sdi, days).toFixed(2).padStart(10, '0'),
        this.taxes.calculateInfonavitPatronal(sdi, days).toFixed(2).padStart(10, '0'),
      ].join(''));
    }
    return lines.join('\n');
  }

  async getRetencionesAnuales(employeeId: string, year: number) {
    const receipts = await (this.prisma as any).payrollReceipt.findMany({
      where: { employeeId,
        period: { startDate: { gte: new Date(year, 0, 1) }, endDate: { lte: new Date(year, 11, 31) } }
      },
      include: { items: true, period: true }
    });
    const totals = receipts.reduce((acc: any, r: any) => {
      const isr      = r.items.filter((i: any) => i.satCode === '002' && i.type === 'D').reduce((s: number, i: any) => s + Number(i.amountTotal), 0);
      const imss     = r.items.filter((i: any) => i.satCode === '001' && i.type === 'D').reduce((s: number, i: any) => s + Number(i.amountTotal), 0);
      const subsidio = r.items.filter((i: any) => i.type === 'O').reduce((s: number, i: any) => s + Number(i.amountTotal), 0);
      return {
        totalPerceptions: acc.totalPerceptions + Number(r.totalPerceptions),
        totalDeductions:  acc.totalDeductions  + Number(r.totalDeductions),
        netAmount:        acc.netAmount        + Number(r.netAmount),
        isr: acc.isr + isr, imss: acc.imss + imss, subsidio: acc.subsidio + subsidio,
      };
    }, { totalPerceptions: 0, totalDeductions: 0, netAmount: 0, isr: 0, imss: 0, subsidio: 0 });
    const emp = await (this.prisma as any).employee.findUnique({ where: { id: employeeId } });
    return { employee: emp, year, periods: receipts.length, ...totals };
  }
}
