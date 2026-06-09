import { TaxService } from './tax.service';
import { Controller, Get, Post, Put, Body, Param, Query, BadRequestException, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './prisma.service';
import { PayrollService } from './payroll.service';
import { PayrollTaxesService } from './payroll-taxes.service';

@Controller('nomina')
export class NominaController {
  constructor(
    private prisma: PrismaService,
    private payrollService: PayrollService,
    private taxes: PayrollTaxesService,
    private taxService: TaxService
  ) {}

  // ── Empleados ──────────────────────────────────────────────────────────────

  @Get('employees')
  getEmployees(@Query('companyId') companyId: string) {
    return (this.prisma as any).employee.findMany({
      where: { companyId },
      orderBy: { lastName: 'asc' }
    });
  }

  @Post('employees')
  async createEmployee(@Body() data: any) {
    const { hiredDate, ...rest } = data;
    return (this.prisma as any).employee.create({
      data: {
        ...rest,
        dailySalary: Number(rest.dailySalary) || 0,
        sdi:         Number(rest.sdi)         || Number(rest.dailySalary) * 1.0493 || 0,
        hiredDate:   hiredDate ? new Date(hiredDate) : new Date(),
        savingsFundPct:   Number(rest.savingsFundPct)   || 0,
        foodVoucherAmt:   Number(rest.foodVoucherAmt)   || 0,
        infonavitDiscount:Number(rest.infonavitDiscount)|| 0,
        vacationDays:     Number(rest.vacationDays)     || 6,
        christmasBonus:   Number(rest.christmasBonus)   || 15,
        loanBalance:      Number(rest.loanBalance)      || 0,
        loanMonthlyAmt:   Number(rest.loanMonthlyAmt)   || 0,
      }
    });
  }

  @Put('employees/:id')
  updateEmployee(@Param('id') id: string, @Body() data: any) {
    const { hiredDate, ...rest } = data;
    return (this.prisma as any).employee.update({
      where: { id },
      data: {
        ...rest,
        ...(hiredDate ? { hiredDate: new Date(hiredDate) } : {}),
        dailySalary:       rest.dailySalary       !== undefined ? Number(rest.dailySalary)        : undefined,
        sdi:               rest.sdi               !== undefined ? Number(rest.sdi)                : undefined,
        savingsFundPct:    rest.savingsFundPct     !== undefined ? Number(rest.savingsFundPct)     : undefined,
        foodVoucherAmt:    rest.foodVoucherAmt     !== undefined ? Number(rest.foodVoucherAmt)     : undefined,
        infonavitDiscount: rest.infonavitDiscount  !== undefined ? Number(rest.infonavitDiscount)  : undefined,
        vacationDays:      rest.vacationDays       !== undefined ? Number(rest.vacationDays)       : undefined,
        christmasBonus:    rest.christmasBonus     !== undefined ? Number(rest.christmasBonus)     : undefined,
        loanMonthlyAmt:    rest.loanMonthlyAmt     !== undefined ? Number(rest.loanMonthlyAmt)     : undefined,
      }
    });
  }

  // ── Períodos ───────────────────────────────────────────────────────────────

  @Get('periods')
  getPeriods(@Query('companyId') companyId: string) {
    return (this.prisma as any).payrollPeriod.findMany({
      where: { companyId },
      include: { receipts: { include: { employee: true } } },
      orderBy: { startDate: 'desc' }
    });
  }

  @Post('periods')
  createPeriod(@Body() data: any) {
    return (this.prisma as any).payrollPeriod.create({
      data: {
        ...data,
        startDate:   new Date(data.startDate),
        endDate:     new Date(data.endDate),
        paymentDate: new Date(data.paymentDate),
      }
    });
  }

  // ── Cálculo ────────────────────────────────────────────────────────────────

  /** Calcular periodo completo (todos los empleados activos) */
  @Post('calculate/:periodId')
  calculate(@Param('periodId') periodId: string) {
    return this.payrollService.calculatePeriod(periodId);
  }

  /** Recalcular recibo individual con percepciones/deducciones extra */
  @Post('calculate/:periodId/employee/:employeeId')
  async calculateOne(
    @Param('periodId') periodId: string,
    @Param('employeeId') employeeId: string,
    @Body() extras: {
      horasExtra?: number; bono?: number; comision?: number;
      primaVacacional?: number; aguinaldoAmt?: number; ptuAmt?: number;
    }
  ) {
    // Borrar recibo existente del empleado en este periodo
    await (this.prisma as any).payrollReceipt.deleteMany({ where: { periodId, employeeId } });
    return this.payrollService.calculateEmployeeReceipt(employeeId, periodId, extras);
  }

  // ── Recibos ────────────────────────────────────────────────────────────────

  @Get('receipts/:periodId')
  getReceipts(@Param('periodId') periodId: string) {
    return (this.prisma as any).payrollReceipt.findMany({
      where: { periodId },
      include: { employee: true, items: true }
    });
  }

  @Get('receipt/:receiptId')
  getReceipt(@Param('receiptId') receiptId: string) {
    return (this.prisma as any).payrollReceipt.findUnique({
      where: { id: receiptId },
      include: { employee: true, items: true, period: { include: { company: true } } }
    });
  }

  // ── Percepciones y deducciones extra (ad-hoc por empleado) ────────────────

  /** Simula el cálculo de aguinaldo para todos los empleados activos */
  @Get('simulate/aguinaldo')
  async simulateAguinaldo(@Query('companyId') companyId: string, @Query('year') year: string) {
    const yr = parseInt(year || new Date().getFullYear().toString());
    const employees = await (this.prisma as any).employee.findMany({
      where: { companyId, isActive: true }
    });
    return employees.map((emp: any) => ({
      employeeId:   emp.id,
      name:         `${emp.firstName} ${emp.lastName}`,
      dailySalary:  emp.dailySalary,
      christmasBonus: emp.christmasBonus || 15,
      aguinaldo:    this.taxes.calculateAguinaldo(
        Number(emp.dailySalary),
        Number(emp.christmasBonus) || 15,
        365 // año completo
      ),
      year: yr,
    }));
  }

  /** Simula prima vacacional para todos los empleados */
  @Get('simulate/prima-vacacional')
  async simulatePrimaVacacional(@Query('companyId') companyId: string) {
    const employees = await (this.prisma as any).employee.findMany({
      where: { companyId, isActive: true }
    });
    return employees.map((emp: any) => ({
      employeeId:      emp.id,
      name:            `${emp.firstName} ${emp.lastName}`,
      vacationDays:    emp.vacationDays || 6,
      primaVacacional: this.taxes.calculatePrimaVacacional(
        Number(emp.dailySalary),
        Number(emp.vacationDays) || 6
      ),
    }));
  }

  /** Calcula PTU proporcional por empleado */
  @Post('calculate/ptu')
  async calculatePtu(@Body() body: { companyId: string; totalPtuPool: number; year: number }) {
    const { companyId, totalPtuPool, year } = body;
    if (!totalPtuPool || !companyId) throw new BadRequestException('companyId y totalPtuPool son requeridos');

    const employees = await (this.prisma as any).employee.findMany({
      where: { companyId, isActive: true }
    });

    // Salario anual por empleado (suma de todos sus recibos en el año)
    const salariosPorEmpleado: { emp: any; annualSalary: number }[] = [];
    for (const emp of employees) {
      const receipts = await (this.prisma as any).payrollReceipt.findMany({
        where: {
          employeeId: emp.id,
          period: {
            startDate: { gte: new Date(year, 0, 1) },
            endDate:   { lte: new Date(year, 11, 31) }
          }
        }
      });
      const annualSalary = receipts.reduce((s: number, r: any) => s + Number(r.totalPerceptions), 0);
      salariosPorEmpleado.push({ emp, annualSalary });
    }

    const totalAnnual = salariosPorEmpleado.reduce((s, e) => s + e.annualSalary, 0);

    return salariosPorEmpleado.map(({ emp, annualSalary }) => ({
      employeeId:    emp.id,
      name:          `${emp.firstName} ${emp.lastName}`,
      annualSalary,
      ptu:           this.taxes.calculatePtuEmployee(totalPtuPool, totalAnnual, annualSalary),
    }));
  }

  // ── Archivo SUA (IMSS) ─────────────────────────────────────────────────────

  @Get('sua/:periodId')
  async downloadSUA(@Param('periodId') periodId: string, @Query('companyId') companyId: string, @Res() res: Response) {
    const content = await this.payrollService.generateSUA(companyId, periodId);
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="SUA_${periodId}.sua"`);
    res.send(content);
  }

  // ── Constancias de retenciones ────────────────────────────────────────────

  @Get('retenciones/:employeeId')
  async getRetenciones(
    @Param('employeeId') employeeId: string,
    @Query('year') year: string
  ) {
    const yr = parseInt(year || new Date().getFullYear().toString());
    return this.payrollService.getRetencionesAnuales(employeeId, yr);
  }

  /** Constancias de todos los empleados del año — para entregar a empleados en Feb */
  @Get('retenciones-anuales')
  async getRetencionesAnuales(@Query('companyId') companyId: string, @Query('year') year: string) {
    const yr = parseInt(year || new Date().getFullYear().toString());
    const employees = await (this.prisma as any).employee.findMany({
      where: { companyId, isActive: true }
    });
    return Promise.all(employees.map((emp: any) =>
      this.payrollService.getRetencionesAnuales(emp.id, yr)
    ));
  }

  // ── Liquidación / Finiquito ────────────────────────────────────────────────

  /**
   * Calcula finiquito o liquidación para un empleado.
   * type=FINIQUITO: empleado renuncia (partes proporcionales + salarios)
   * type=LIQUIDACION: empresa rescinde sin causa justificada (+ 3 meses + 20 días/año)
   */
  @Post('liquidacion/calcular')
  async calcularLiquidacion(
    @Body() body: { employeeId: string; terminationDate: string; type: 'FINIQUITO' | 'LIQUIDACION' }
  ) {
    const { employeeId, terminationDate, type } = body;
    if (!employeeId || !terminationDate || !type) throw new BadRequestException('employeeId, terminationDate y type son requeridos');

    const emp = await (this.prisma as any).employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new BadRequestException('Empleado no encontrado');

    const fechaBaja = new Date(terminationDate);
    const fechaAlta = new Date(emp.hiredDate);
    const diasTrabajados = Math.ceil((fechaBaja.getTime() - fechaAlta.getTime()) / 86400000);
    const aniosTrabajados = diasTrabajados / 365;

    const salarioDiario = Number(emp.dailySalary) || 0;
    const salarioMensual = salarioDiario * 30;

    // Días trabajados en el año actual (para proporcionales)
    const inicioAnio = new Date(fechaBaja.getFullYear(), 0, 1);
    const diasAnioActual = Math.min(diasTrabajados, Math.ceil((fechaBaja.getTime() - inicioAnio.getTime()) / 86400000));

    // Vacaciones proporcionales (Ley Federal del Trabajo Art. 76)
    const diasVacLey = aniosTrabajados >= 1 ? Math.min(6 + (Math.floor(aniosTrabajados) - 1) * 2, 32) : (diasTrabajados / 365) * 6;
    const diasVacProp = (diasAnioActual / 365) * diasVacLey;
    const vacaciones = diasVacProp * salarioDiario;

    // Prima vacacional (25% de vacaciones — mínimo legal Art. 80)
    const primaVacacional = vacaciones * 0.25;

    // Aguinaldo proporcional (15 días mínimo — Art. 87)
    const diasAguinaldo = Number(emp.christmasBonus) || 15;
    const aguinaldo = (diasAnioActual / 365) * diasAguinaldo * salarioDiario;

    // Salarios devengados hasta la fecha de baja
    const diasUltimoMes = fechaBaja.getDate();
    const salariosDevengados = diasUltimoMes * salarioDiario;

    let indemnizacion = 0;
    let tresMeses = 0;
    let veinteDiasPorAnio = 0;
    let primaSeniority = 0;

    if (type === 'LIQUIDACION') {
      tresMeses = salarioMensual * 3;                                          // Art. 50 LFT
      veinteDiasPorAnio = 20 * salarioDiario * aniosTrabajados;               // Art. 50 LFT
      const UMA_DIARIA = 108.57;
      const sdiCapped = Math.min(salarioDiario, UMA_DIARIA * 25);
      primaSeniority = Math.ceil(aniosTrabajados) * 12 * sdiCapped;           // Art. 162 LFT
      indemnizacion = tresMeses + veinteDiasPorAnio + primaSeniority;
    }

    const totalBruto = salariosDevengados + vacaciones + primaVacacional + aguinaldo + indemnizacion;

    // ISR sobre liquidación (exentos los primeros 90 UMAs Art. 93 LISR)
    const UMA_ANUAL = 108.57 * 365;
    const exentoLiquidacion = type === 'LIQUIDACION' ? Math.min(indemnizacion, UMA_ANUAL * 90) : 0;
    const baseGravable = Math.max(0, totalBruto - exentoLiquidacion);
    const isrAprox = await this.taxService.calculateISR(baseGravable, 'MENSUAL', 2024);

    return {
      employeeId,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      rfc: emp.rfc,
      hiredDate: emp.hiredDate,
      terminationDate: fechaBaja,
      diasTrabajados: Math.round(diasTrabajados),
      aniosTrabajados: parseFloat(aniosTrabajados.toFixed(2)),
      type,
      conceptos: {
        salariosDevengados: parseFloat(salariosDevengados.toFixed(2)),
        vacaciones: parseFloat(vacaciones.toFixed(2)),
        primaVacacional: parseFloat(primaVacacional.toFixed(2)),
        aguinaldo: parseFloat(aguinaldo.toFixed(2)),
        ...(type === 'LIQUIDACION' ? {
          tresMeses: parseFloat(tresMeses.toFixed(2)),
          veinteDiasPorAnio: parseFloat(veinteDiasPorAnio.toFixed(2)),
          primaSeniority: parseFloat(primaSeniority.toFixed(2)),
        } : {})
      },
      totalBruto: parseFloat(totalBruto.toFixed(2)),
      isrRetenido: parseFloat(isrAprox.toFixed(2)),
      totalNeto: parseFloat((totalBruto - isrAprox).toFixed(2)),
    };
  }

  // ── SIPARE (IMSS) ─────────────────────────────────────────────────────────

  /** Genera archivo de texto SIPARE para pago de cuotas IMSS/INFONAVIT */
  @Get('sipare/:periodId')
  async downloadSIPARE(
    @Param('periodId') periodId: string,
    @Res() res: Response
  ) {
    const period = await (this.prisma as any).payrollPeriod.findUnique({
      where: { id: periodId },
      include: { company: true, receipts: { include: { employee: true } } }
    });
    if (!period) throw new BadRequestException('Periodo no encontrado');

    const company = period.company;
    const desde = new Date(period.startDate).toISOString().split('T')[0].replace(/-/g, '');
    const hasta = new Date(period.endDate).toISOString().split('T')[0].replace(/-/g, '');

    const lines: string[] = [];
    lines.push(`1|${company.rfc}||${desde}|${hasta}|MENSUAL`);

    for (const r of period.receipts) {
      const emp = r.employee;
      const sdi = Number(emp.sdi) || 0;
      const days = Math.ceil((new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) / 86400000) + 1;
      const imssObrero = parseFloat((sdi * days * 0.02375).toFixed(2));
      const imssPatronal = parseFloat((sdi * days * 0.0775).toFixed(2));
      const rcv = parseFloat((sdi * days * 0.065).toFixed(2));
      const infonavit = parseFloat((sdi * days * 0.05).toFixed(2));
      lines.push(`2|${emp.nss || ''}|${emp.firstName}|${emp.lastName}||${days}|${sdi.toFixed(2)}|${imssObrero}|${imssPatronal}|${rcv}|${infonavit}`);
    }

    const totalImss = period.receipts.reduce((s: number, r: any) => {
      const sdi = Number(r.employee.sdi) || 0;
      const days = Math.ceil((new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) / 86400000) + 1;
      return s + sdi * days * (0.02375 + 0.0775 + 0.065 + 0.05);
    }, 0);

    lines.push(`99|${period.receipts.length}|${totalImss.toFixed(2)}`);

    const content = lines.join('\r\n');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="SIPARE_${periodId}.txt"`);
    res.send(content);
  }

  // ── Cuotas patronales resumen ──────────────────────────────────────────────

  /** Resumen de cuotas patronales IMSS+RCV+INFONAVIT de un periodo */
  @Get('cuotas-patronales/:periodId')
  async getCuotasPatronales(@Param('periodId') periodId: string) {
    const period = await (this.prisma as any).payrollPeriod.findUnique({
      where: { id: periodId },
      include: { receipts: { include: { employee: true } } }
    });
    if (!period) throw new BadRequestException('Periodo no encontrado');

    const diffMs = Math.abs(new Date(period.endDate).getTime() - new Date(period.startDate).getTime());
    const days   = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;

    let totalImss = 0, totalRcv = 0, totalInfonavit = 0;
    const desglose = period.receipts.map((r: any) => {
      const sdi          = Number(r.employee.sdi);
      const imssPatronal = this.taxes.calculateImssPatronal(sdi, days);
      const rcvPatronal  = this.taxes.calculateRcvPatronal(sdi, days);
      const infonavit    = this.taxes.calculateInfonavitPatronal(sdi, days);
      totalImss      += imssPatronal;
      totalRcv       += rcvPatronal;
      totalInfonavit += infonavit;
      return {
        employeeId: r.employeeId,
        name: `${r.employee.firstName} ${r.employee.lastName}`,
        sdi, imssPatronal, rcvPatronal, infonavit,
        total: imssPatronal + rcvPatronal + infonavit
      };
    });

    return {
      periodId, days,
      totals: { imss: totalImss, rcv: totalRcv, infonavit: totalInfonavit,
                grand: totalImss + totalRcv + totalInfonavit },
      desglose
    };
  }
}
