import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';

@Controller('payroll')
export class PayrollController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService
  ) {}

  @Get('employees')
  findEmployees(@Query('companyId') companyId: string) {
    return (this.prisma as any).employee.findMany({
      where: { companyId },
      include: { receipts: { orderBy: { createdAt: 'desc' }, take: 3 } },
      orderBy: { firstName: 'asc' },
    });
  }

  @Post('employees')
  async createEmployee(@Body() data: any) {
    const { startDate, endDate, ...rest } = data;
    try {
      const employee = await (this.prisma as any).employee.create({
        data: {
          ...rest,
          salary: Number(rest.salary) || 0,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          companyId: rest.companyId || 'default-company-uuid'
        }
      });

      // Audit Log
      await this.audit.logAction('SYSTEM', employee.companyId, 'CREATE', 'Employee', `Created employee ${employee.name} ${employee.lastName}`, employee.id);
      
      return employee;
    } catch (e: any) {
      console.error('Error creating employee:', e.message);
      throw new BadRequestException('Error al crear empleado: ' + e.message);
    }
  }

  @Get('periods')
  findPeriods(@Query('companyId') companyId: string) {
    return (this.prisma as any).payrollPeriod.findMany({
      where: { companyId },
      include: { receipts: { include: { employee: true }, take: 10 } },
      orderBy: { startDate: 'desc' },
    });
  }

  @Post('calculate')
  async calculatePayroll(@Body() data: { employeeId: string; startDate: string; endDate: string; paymentDate: string; companyId: string }) {
    const employee = await (this.prisma as any).employee.findUnique({ where: { id: data.employeeId } });
    if (!employee) throw new BadRequestException('Empleado no encontrado');

    const existing = await (this.prisma as any).payrollPeriod.findFirst({
      where: {
        employeeId: data.employeeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      }
    });
    if (existing) throw new BadRequestException('Ya existe un cálculo para este periodo y empleado');

    const UMA_DIARIA = 108.57;
    const sueldo_mensual = (Number(employee.salary) || 0) * 30;
    const factor_integracion = 1.0493;
    const sdi = (Number(employee.salary) || 0) * factor_integracion;

    const ISR_TABLE = [
      { lower: 0.01, upper: 746.04, cuota: 0, rate: 0.0192 },
      { lower: 746.05, upper: 6332.05, cuota: 14.32, rate: 0.0640 },
      { lower: 6332.06, upper: 11128.01, cuota: 371.83, rate: 0.1088 },
      { lower: 11128.02, upper: 12935.82, cuota: 893.63, rate: 0.16 },
      { lower: 12935.83, upper: 15487.71, cuota: 1182.88, rate: 0.1792 },
      { lower: 15487.72, upper: 31236.49, cuota: 1640.18, rate: 0.2136 },
      { lower: 31236.50, upper: 49233.00, cuota: 5004.12, rate: 0.2352 },
      { lower: 49233.01, upper: 93993.90, cuota: 9236.89, rate: 0.30 },
      { lower: 93993.91, upper: 125325.20, cuota: 22665.17, rate: 0.32 },
      { lower: 125325.21, upper: 375975.61, cuota: 32691.18, rate: 0.34 },
      { lower: 375975.62, upper: Infinity, cuota: 117912.32, rate: 0.35 },
    ];

    const isrRow = ISR_TABLE.find(r => sueldo_mensual >= r.lower && sueldo_mensual <= r.upper);
    const isr = isrRow ? isrRow.cuota + (sueldo_mensual - isrRow.lower) * isrRow.rate : 0;

    const sdiCapped = Math.min(sdi, UMA_DIARIA * 25);
    const imssEmployee = parseFloat((sdiCapped * 30 * 0.02375).toFixed(2));
    const imssEmployer = parseFloat((sdiCapped * 30 * 0.25).toFixed(2));

    const totalPerceptions = sueldo_mensual;
    const totalDeductions = isr + imssEmployee;
    const netPay = totalPerceptions - totalDeductions;

    const period = await (this.prisma as any).payrollPeriod.create({
      data: {
        employeeId: data.employeeId,
        companyId: data.companyId || employee.companyId,
        periodType: 'MENSUAL',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        paymentDate: new Date(data.paymentDate),
        baseSalary: sueldo_mensual,
        totalPerceptions,
        isr: parseFloat(isr.toFixed(2)),
        imssEmployee,
        imssEmployer,
        totalDeductions: parseFloat(totalDeductions.toFixed(2)),
        netPay: parseFloat(netPay.toFixed(2)),
        status: 'CALCULADO',
      },
      include: { employee: true },
    });

    // Audit Log
    await this.audit.logAction('SYSTEM', period.companyId, 'CALCULATE', 'PayrollPeriod', `Calculated payroll for ${employee.name}`, period.id);

    return period;
  }

  @Get(':id/xml')
  async getXml(@Param('id') id: string) {
    const period = await (this.prisma as any).payrollPeriod.findUnique({
      where: { id },
      include: { employee: true, company: true }
    });
    if (!period) throw new BadRequestException('No se encontró el recibo');

    const emp = period.employee;
    const comp = period.company;

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:nomina12="http://www.sat.gob.mx/nomina12" Version="4.0" Fecha="${new Date(period.paymentDate).toISOString()}" TipoDeComprobante="N" Moneda="MXN" Total="${Number(period.netPay).toFixed(2)}" SubTotal="${Number(period.totalPerceptions).toFixed(2)}">
  <cfdi:Emisor Rfc="${comp?.rfc || ''}" Nombre="${comp?.name || ''}" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="${emp?.rfc || ''}" Nombre="${emp?.name || ''} ${emp?.lastName || ''}" RegimenFiscalReceptor="605" DomicilioFiscalReceptor="00000" UsoCFDI="CN01"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="84111505" Cantidad="1" ClaveUnidad="ACT" Descripcion="Pago de nómina" ValorUnitario="${Number(period.totalPerceptions).toFixed(2)}" Importe="${Number(period.totalPerceptions).toFixed(2)}" Descuento="${Number(period.totalDeductions).toFixed(2)}"/>
  </cfdi:Conceptos>
  <cfdi:Complemento>
    <nomina12:Nomina Version="1.2" TipoNomina="O" FechaPago="${new Date(period.paymentDate).toISOString().split('T')[0]}" NumDiasPagados="30" TotalPercepciones="${Number(period.totalPerceptions).toFixed(2)}" TotalDeducciones="${Number(period.totalDeductions).toFixed(2)}" TotalOtrosPagos="0.00">
      <nomina12:Receptor Curp="${emp?.curp || ''}" NumSeguridadSocial="${emp?.nss || ''}" FechaInicioRelLaboral="${new Date(emp?.startDate).toISOString().split('T')[0]}" NumEmpleado="${emp?.employeeNumber || ''}" RegularidadPago="04" SalarioDiarioIntegrado="${Number(emp?.salary).toFixed(2)}"/>
      <nomina12:Percepciones TotalExento="0.00" TotalGravado="${Number(period.totalPerceptions).toFixed(2)}">
        <nomina12:Percepcion TipoPercepcion="001" Clave="SUE" Concepto="Sueldo" ImporteExento="0.00" ImporteGravado="${Number(period.totalPerceptions).toFixed(2)}"/>
      </nomina12:Percepciones>
      <nomina12:Deducciones TotalImpuestosRetenidos="${Number(period.isr).toFixed(2)}" TotalOtrasDeducciones="${Number(period.imssEmployee).toFixed(2)}">
        <nomina12:Deduccion TipoDeducción="002" Clave="ISR" Concepto="ISR" Importe="${Number(period.isr).toFixed(2)}"/>
        <nomina12:Deduccion TipoDeducción="001" Clave="IMS" Concepto="IMSS" Importe="${Number(period.imssEmployee).toFixed(2)}"/>
      </nomina12:Deducciones>
    </nomina12:Nomina>
  </cfdi:Complemento>
</cfdi:Comprobante>`;

    return { xml };
  }

  @Post(':id/post-ledger')
  async postToLedger(@Param('id') id: string, @Body() { expenseAccountId, bankAccountId }: any) {
    const period = await (this.prisma as any).payrollPeriod.findUnique({
      where: { id },
      include: { employee: true }
    });
    if (!period) throw new BadRequestException('No se encontró el recibo');

    const journal = await (this.prisma as any).journal.create({
      data: {
        companyId: period.companyId,
        date: period.paymentDate,
        type: 'EGRESO',
        number: `NOM-${period.employee?.employeeNumber || '00'}-${period.id.slice(0,4)}`,
        concept: `Pago Nómina ${period.employee?.name || ''} ${period.employee?.lastName || ''} - Quincena/Mes`,
        status: 'APLICADA',
        entries: {
          create: [
            { accountId: expenseAccountId, description: 'Gastos de Sueldos y Salarios', debit: Number(period.totalPerceptions), credit: 0 },
            { accountId: bankAccountId, description: 'Pago de Nómina (Neto)', debit: 0, credit: Number(period.netPay) },
            { accountId: bankAccountId, description: 'Impuestos Retenidos (Páguelo después)', debit: 0, credit: Number(period.totalDeductions) },
          ]
        }
      }
    });

    await (this.prisma as any).payrollPeriod.update({ where: { id }, data: { status: 'PAGADO' } });
    
    // Audit Log
    await this.audit.logAction('SYSTEM', period.companyId, 'APPLY', 'PayrollPeriod', `Posted payroll to ledger. Journal: ${journal.number}`, period.id);

    return { journalId: journal.id };
  }

  @Post('post-batch')
  async postBatch(@Body() body: { companyId: string, startDate: string, endDate: string, expenseAccountId: string, bankAccountId: string, taxAccountId: string }) {
    const { companyId, startDate, endDate, expenseAccountId, bankAccountId, taxAccountId } = body;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const periods = await (this.prisma as any).payrollPeriod.findMany({
      where: { 
        companyId, 
        startDate: { gte: start }, 
        endDate: { lte: end },
        status: 'CALCULADO' 
      },
      include: { employee: true }
    });
    
    if (periods.length === 0) throw new BadRequestException('No hay nóminas pendientes de contabilizar en este periodo');
    
    const totals = periods.reduce((acc: any, p: any) => ({
      perceptions: acc.perceptions + Number(p.totalPerceptions),
      deductions: acc.deductions + Number(p.totalDeductions),
      net: acc.net + Number(p.netPay),
      isr: acc.isr + Number(p.isr),
      imss: acc.imss + Number(p.imssEmployee)
    }), { perceptions: 0, deductions: 0, net: 0, isr: 0, imss: 0 });
    
    const journal = await (this.prisma as any).journal.create({
      data: {
        companyId,
        date: end,
        type: 'DIARIO',
        number: `NOM-PROV-${end.getFullYear()}-${end.getMonth() + 1}`,
        concept: `Provisión de Nómina: ${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        status: 'APLICADA',
        entries: {
          create: [
            { accountId: expenseAccountId, description: 'Gasto: Sueldos y Salarios (Global)', debit: totals.perceptions, credit: 0 },
            { accountId: taxAccountId, description: 'Pasivo: Retenciones ISR Nómina', debit: 0, credit: totals.isr },
            { accountId: taxAccountId, description: 'Pasivo: Retenciones IMSS Obrero', debit: 0, credit: totals.imss },
            { accountId: bankAccountId, description: 'Pasivo: Sueldos por Pagar (Neto)', debit: 0, credit: totals.net },
          ]
        }
      }
    });
    
    // Update all periods to PAGADO
    await (this.prisma as any).payrollPeriod.updateMany({
      where: { id: { in: periods.map((p: any) => p.id) } },
      data: { status: 'PAGADO' }
    });
    
    await this.audit.logAction('SYSTEM', companyId, 'APPLY', 'PayrollBatch', `Mass post-provision for ${periods.length} employees`, journal.id);
    
    return { journalId: journal.id, count: periods.length };
  }
}
