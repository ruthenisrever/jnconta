import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './prisma.service';
import * as ExcelJS from 'exceljs';

// ─── Shared style helpers ─────────────────────────────────────────────────────

function applyHeaderStyle(cell: ExcelJS.Cell, color = '0F4C75') {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } };
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'center' };
  cell.border = {
    bottom: { style: 'thin', color: { argb: 'FF1B98E0' } },
  };
}

function applyTotalStyle(cell: ExcelJS.Cell) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D3460' } };
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.border = { top: { style: 'medium', color: { argb: 'FF1B98E0' } } };
}


function addCompanyHeader(ws: ExcelJS.Worksheet, title: string, companyName: string, period: string) {
  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = companyName;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1B98E0' } };
  titleCell.alignment = { horizontal: 'center' };

  ws.mergeCells('A2:G2');
  const subtitleCell = ws.getCell('A2');
  subtitleCell.value = title;
  subtitleCell.font = { bold: true, size: 12, color: { argb: 'FF9DB8D2' } };
  subtitleCell.alignment = { horizontal: 'center' };

  ws.mergeCells('A3:G3');
  const periodCell = ws.getCell('A3');
  periodCell.value = period;
  periodCell.font = { size: 10, italic: true, color: { argb: 'FF5C7A9A' } };
  periodCell.alignment = { horizontal: 'center' };

  ws.addRow([]); // spacer
}

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('reports')
export class ReportsController {
  constructor(private prisma: PrismaService) {}

  // ── Existing JSON reports ──────────────────────────────────────────────────

  @Get('balanza')
  async getBalanza(@Query('companyId') companyId: string, @Query('month') month: string, @Query('year') year: string) {
    const mo = parseInt(month || '1');
    const yr = parseInt(year || '2024');
    const startDate = new Date(yr, mo - 1, 1);
    const endDate = new Date(yr, mo, 0, 23, 59, 59);

    const accounts = await this.prisma.account.findMany({
      where: { companyId, level: { lte: 3 } },
      include: { journalEntries: true },
      orderBy: { code: 'asc' },
    });

    return accounts.map(acc => {
      const totalDebit = acc.journalEntries
        .filter(e => { const d = new Date(e.createdAt); return d >= startDate && d <= endDate; })
        .reduce((s, e) => s + e.debit, 0);
      const totalCredit = acc.journalEntries
        .filter(e => { const d = new Date(e.createdAt); return d >= startDate && d <= endDate; })
        .reduce((s, e) => s + e.credit, 0);
      
      const prevEntries = acc.journalEntries.filter(e => new Date(e.createdAt) < startDate);
      const prevDebit = prevEntries.reduce((s, e) => s + e.debit, 0);
      const prevCredit = prevEntries.reduce((s, e) => s + e.credit, 0);
      const saldoInicial = acc.nature === 'DEUDORA' ? prevDebit - prevCredit : prevCredit - prevDebit;

      const balance = acc.nature === 'DEUDORA' 
        ? saldoInicial + totalDebit - totalCredit 
        : saldoInicial + totalCredit - totalDebit;

      return {
        code: acc.code, name: acc.name, type: acc.type, nature: acc.nature,
        initialBalance: parseFloat(saldoInicial.toFixed(2)),
        totalDebit: parseFloat(totalDebit.toFixed(2)),
        totalCredit: parseFloat(totalCredit.toFixed(2)),
        balance: parseFloat(balance.toFixed(2)),
      };
    }).filter(a => a.totalDebit > 0 || a.totalCredit > 0 || a.initialBalance !== 0);
  }

  @Get('auxiliar')
  async getAuxiliar(@Query('companyId') companyId: string, @Query('accountCode') accountCode: string, @Query('month') month: string, @Query('year') year: string) {
    const mo = parseInt(month || '1');
    const yr = parseInt(year || '2024');
    const startDate = new Date(yr, mo - 1, 1);
    const endDate = new Date(yr, mo, 0, 23, 59, 59);

    const account = await this.prisma.account.findFirst({
      where: { companyId, code: accountCode },
      include: { journalEntries: { orderBy: { createdAt: 'asc' } } }
    });

    if (!account) return [];

    return account.journalEntries
      .filter(e => { const d = new Date(e.createdAt); return d >= startDate && d <= endDate; })
      .map(e => ({
        date: e.createdAt,
        description: e.description,
        debit: e.debit,
        credit: e.credit
      }));
  }

  @Get('estado-resultados')
  async getEstadoResultados(@Query('companyId') companyId: string) {
    const [invoices, bills, payroll] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { companyId, status: { not: 'CANCELADA' } }, _sum: { subtotal: true } }),
      this.prisma.bill.aggregate({ where: { companyId }, _sum: { subtotal: true } }),
      (this.prisma as any).payrollReceipt.aggregate({ where: { period: { companyId } }, _sum: { totalDeductions: true, netAmount: true } }),
    ]);
    const ingresos = invoices._sum.subtotal || 0;
    const costoVentas = bills._sum.subtotal || 0;
    const gastosNomina = (payroll._sum.netAmount || 0) + (payroll._sum.totalDeductions || 0);
    const utilidadBruta = ingresos - costoVentas;
    const utilidadOperacion = utilidadBruta - gastosNomina;
    const isr = utilidadOperacion > 0 ? utilidadOperacion * 0.30 : 0;
    
    return {
      sections: [
        { label: 'Ingresos por Ventas', value: ingresos, code: '4.0.01' },
        { label: 'Costo de Ventas (Compras)', value: costoVentas, code: '6.0.01' },
        { label: 'Utilidad Bruta', value: utilidadBruta, isTotal: true },
        { label: 'Gastos de Nómina y Social', value: gastosNomina, code: '6.0.02' },
        { label: 'Utilidad de Operación', value: utilidadOperacion, isTotal: true },
        { label: 'Provisión ISR (30%)', value: isr },
        { label: 'Utilidad Neta', value: utilidadOperacion - isr, isTotal: true, isFinal: true },
      ]
    };
  }

  @Get('balance-general')
  async getBalanceGeneral(@Query('companyId') companyId: string) {
    const [bankAccounts, invoicesPending, billsPending, assets] = await Promise.all([
      this.prisma.bankAccount.aggregate({ where: { companyId }, _sum: { balance: true } }),
      this.prisma.invoice.aggregate({ where: { companyId, status: 'VIGENTE' }, _sum: { total: true } }),
      this.prisma.bill.aggregate({ where: { companyId, status: 'PENDIENTE' }, _sum: { total: true } }),
      this.prisma.fixedAsset.aggregate({ where: { companyId, isActive: true }, _sum: { netValue: true } }),
    ]);
    const efectivo = bankAccounts._sum.balance || 0;
    const cxc = invoicesPending._sum.total || 0;
    const activoFijo = assets._sum.netValue || 0;
    const cxp = billsPending._sum.total || 0;
    const totalActivo = efectivo + cxc + activoFijo;
    const totalPasivo = cxp;
    
    return {
      activo: [
        { label: 'Efectivo y Bancos', value: efectivo, code: '1.1.02' },
        { label: 'Clientes (Cuentas por Cobrar)', value: cxc, code: '1.1.03' },
        { label: 'Activos Fijos Netos', value: activoFijo, code: '1.2.01' },
        { label: 'TOTAL ACTIVO', value: totalActivo, isTotal: true }
      ],
      pasivo: [
        { label: 'Proveedores (Cuentas por Pagar)', value: cxp, code: '2.1.01' },
        { label: 'TOTAL PASIVO', value: totalPasivo, isTotal: true }
      ],
      capital: [
        { label: 'Utilidad y Capital Social', value: totalActivo - totalPasivo, isTotal: true }
      ]
    };
  }

  // ── Excel Exports ──────────────────────────────────────────────────────────

  @Get('excel/balanza')
  async excelBalanza(@Query('companyId') companyId: string, @Query('month') month: string, @Query('year') year: string, @Res() res: Response) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId } });
    const accounts = await this.prisma.account.findMany({
      where: { companyId, level: { lte: 3 } },
      include: { journalEntries: true },
      orderBy: { code: 'asc' },
    });

    const mo = month || (new Date().getMonth() + 1).toString();
    const yr = year || new Date().getFullYear().toString();
    const startDate = new Date(parseInt(yr), parseInt(mo) - 1, 1);
    const endDate = new Date(parseInt(yr), parseInt(mo), 0, 23, 59, 59);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'JnConta Enterprise';
    const ws = wb.addWorksheet('Balanza de Comprobación');

    ws.columns = [
      { key: 'code', width: 14 }, { key: 'name', width: 38 },
      { key: 'type', width: 14 }, { key: 'nature', width: 14 },
      { key: 'debit', width: 18 }, { key: 'credit', width: 18 }, { key: 'balance', width: 18 },
    ];

    addCompanyHeader(ws, 'Balanza de Comprobación', company?.name || 'JnConta', `Período: ${mo}/${yr}`);

    const headerRow = ws.addRow(['Cuenta', 'Nombre', 'Tipo', 'Naturaleza', 'Cargos', 'Abonos', 'Saldo']);
    headerRow.eachCell(cell => applyHeaderStyle(cell));
    headerRow.height = 22;

    let totalD = 0, totalC = 0, totalB = 0;
    for (const acc of accounts) {
      const td = acc.journalEntries
        .filter(e => { const d = new Date(e.createdAt); return d >= startDate && d <= endDate; })
        .reduce((s, e) => s + e.debit, 0);
      const tc = acc.journalEntries
        .filter(e => { const d = new Date(e.createdAt); return d >= startDate && d <= endDate; })
        .reduce((s, e) => s + e.credit, 0);
      
      const prevEntries = acc.journalEntries.filter(e => new Date(e.createdAt) < startDate);
      const prevDebit = prevEntries.reduce((s, e) => s + e.debit, 0);
      const prevCredit = prevEntries.reduce((s, e) => s + e.credit, 0);
      const saldoInicial = acc.nature === 'DEUDORA' ? prevDebit - prevCredit : prevCredit - prevDebit;

      const bal = acc.nature === 'DEUDORA' ? saldoInicial + td - tc : saldoInicial + tc - td;
      if (td === 0 && tc === 0 && saldoInicial === 0) continue;
      
      totalD += td; totalC += tc; totalB += bal;
      const row = ws.addRow([acc.code, acc.name, acc.type, acc.nature, td, tc, bal]);
      row.getCell(5).numFmt = '"$"#,##0.00';
      row.getCell(6).numFmt = '"$"#,##0.00';
      row.getCell(7).numFmt = '"$"#,##0.00';
    }

    const totRow = ws.addRow(['', 'TOTALES', '', '', totalD, totalC, totalB]);
    totRow.eachCell((cell, i) => { if (i >= 2) applyTotalStyle(cell); });
    totRow.getCell(5).numFmt = '"$"#,##0.00';
    totRow.getCell(6).numFmt = '"$"#,##0.00';
    totRow.getCell(7).numFmt = '"$"#,##0.00';

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Balanza_${yr}${mo}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('excel/estado-resultados')
  async excelEstadoResultados(@Query('companyId') companyId: string, @Query('month') month: string, @Query('year') year: string, @Res() res: Response) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId } });
    const [invoices, bills, payroll] = await Promise.all([
      this.prisma.invoice.aggregate({ where: { companyId, status: { not: 'CANCELADA' } }, _sum: { subtotal: true } }),
      this.prisma.bill.aggregate({ where: { companyId }, _sum: { subtotal: true } }),
      (this.prisma as any).payrollReceipt.aggregate({ where: { period: { companyId } }, _sum: { netAmount: true, totalDeductions: true } }),
    ]);

    const ingresos = invoices._sum.subtotal || 0;
    const costo = bills._sum.subtotal || 0;
    const gastos = (payroll._sum.netAmount || 0) + (payroll._sum.totalDeductions || 0);
    const utilBruta = ingresos - costo;
    const utilOp = utilBruta - gastos;
    const isr = utilOp > 0 ? utilOp * 0.30 : 0;
    const utilNeta = utilOp - isr;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'JnConta Enterprise';
    const ws = wb.addWorksheet('Estado de Resultados');
    ws.columns = [{ key: 'concepto', width: 40 }, { key: 'importe', width: 22 }];

    const mo = month || (new Date().getMonth() + 1).toString();
    const yr = year || new Date().getFullYear().toString();
    addCompanyHeader(ws, 'Estado de Resultados', company?.name || 'JnConta', `Período: ${mo}/${yr}`);

    const rows: Array<{ label: string; value: number; isTotal?: boolean; isHeader?: boolean }> = [
      { label: 'INGRESOS', value: ingresos, isHeader: true },
      { label: 'Ventas netas', value: ingresos },
      { label: 'COSTO DE VENTAS', value: costo, isHeader: true },
      { label: 'Compras / Costo directo', value: costo },
      { label: '= UTILIDAD BRUTA', value: utilBruta, isTotal: true },
      { label: 'GASTOS DE OPERACIÓN', value: gastos, isHeader: true },
      { label: 'Nómina y prestaciones sociales', value: gastos },
      { label: '= UTILIDAD DE OPERACIÓN', value: utilOp, isTotal: true },
      { label: 'ISR (30%)', value: isr, isHeader: true },
      { label: '= UTILIDAD NETA DEL PERÍODO', value: utilNeta, isTotal: true },
    ];

    for (const r of rows) {
      const row = ws.addRow([r.label, r.value]);
      row.getCell(2).numFmt = '"$"#,##0.00';
      if (r.isTotal) {
        row.eachCell(cell => applyTotalStyle(cell));
        row.height = 20;
      } else if (r.isHeader) {
        row.getCell(1).font = { bold: true, color: { argb: 'FF1B98E0' } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C1728' } };
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0C1728' } };
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="EstadoResultados_${yr}${mo}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('excel/balance-general')
  async excelBalanceGeneral(@Query('companyId') companyId: string, @Query('year') year: string, @Res() res: Response) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId } });
    const [banks, cxc, cxp, assets] = await Promise.all([
      this.prisma.bankAccount.aggregate({ where: { companyId }, _sum: { balance: true } }),
      this.prisma.invoice.aggregate({ where: { companyId, status: 'VIGENTE' }, _sum: { total: true } }),
      this.prisma.bill.aggregate({ where: { companyId, status: 'PENDIENTE' }, _sum: { total: true } }),
      this.prisma.fixedAsset.aggregate({ where: { companyId, isActive: true }, _sum: { netValue: true } }),
    ]);

    const efectivo = banks._sum.balance || 0;
    const cobrar = cxc._sum.total || 0;
    const actFijo = assets._sum.netValue || 0;
    const totalActivo = efectivo + cobrar + actFijo;
    const cuentasPagar = cxp._sum.total || 0;
    const capital = totalActivo - cuentasPagar;
    const yr = year || new Date().getFullYear().toString();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Balance General');
    ws.columns = [{ key: 'tipo', width: 16 }, { key: 'concepto', width: 34 }, { key: 'importe', width: 22 }];

    addCompanyHeader(ws, 'Balance General', company?.name || 'JnConta', `Al 31 de diciembre de ${yr}`);

    const sections = [
      { header: 'ACTIVO', rows: [
        { label: 'Efectivo y Bancos', value: efectivo },
        { label: 'Cuentas por Cobrar', value: cobrar },
        { label: 'Activo Fijo Neto', value: actFijo },
      ], total: totalActivo, totalLabel: 'TOTAL ACTIVO' },
      { header: 'PASIVO', rows: [
        { label: 'Cuentas por Pagar', value: cuentasPagar },
      ], total: cuentasPagar, totalLabel: 'TOTAL PASIVO' },
      { header: 'CAPITAL CONTABLE', rows: [
        { label: 'Capital Social + Utilidades', value: capital },
      ], total: capital, totalLabel: 'TOTAL CAPITAL' },
    ];

    for (const section of sections) {
      const hRow = ws.addRow([section.header, '', '']);
      hRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF1B98E0' } };
      hRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D3460' } };
      ws.mergeCells(`A${hRow.number}:C${hRow.number}`);

      for (const r of section.rows) {
        const row = ws.addRow(['', r.label, r.value]);
        row.getCell(3).numFmt = '"$"#,##0.00';
      }

      const totalRow = ws.addRow(['', section.totalLabel, section.total]);
      totalRow.eachCell(cell => applyTotalStyle(cell));
      totalRow.getCell(3).numFmt = '"$"#,##0.00';
      ws.addRow([]);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="BalanceGeneral_${yr}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  }

  // ── Executive BI Dashboard Stats ──────────────────────────────────────────

  @Get('dashboard-stats')
  async getDashboardStats(@Query('companyId') companyId: string) {
    const months = [];
    const now = new Date();
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      
      const [income, expenses, payroll] = await Promise.all([
        this.prisma.journalEntry.aggregate({
          where: { 
            journal: { companyId, date: { gte: start, lte: end } },
            account: { type: 'INGRESO' } 
          },
          _sum: { credit: true }
        }),
        this.prisma.journalEntry.aggregate({
          where: { 
            journal: { companyId, date: { gte: start, lte: end } },
            account: { type: 'GASTO' } 
          },
          _sum: { debit: true }
        }),
        (this.prisma as any).payrollReceipt.aggregate({
          where: { period: { companyId, paymentDate: { gte: start, lte: end } } },
          _sum: { netAmount: true, totalDeductions: true }
        })
      ]);

      const totalIncome = Number(income._sum.credit || 0);
      const totalExpenses = Number(expenses._sum.debit || 0) +
                          Number(payroll._sum.netAmount || 0) +
                          Number(payroll._sum.totalDeductions || 0);

      months.push({
        month: d.toLocaleString('es-MX', { month: 'short' }).toUpperCase(),
        income: parseFloat(totalIncome.toFixed(2)),
        expenses: parseFloat(totalExpenses.toFixed(2)),
        profit: parseFloat((totalIncome - totalExpenses).toFixed(2))
      });
    }

    // Tax Forecast (Current Month)
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [taxControl, bankBalance] = await Promise.all([
      this.prisma.taxControl.findMany({
        where: { companyId, date: { gte: startMonth, lte: endMonth } }
      }),
      this.prisma.bankAccount.aggregate({ where: { companyId }, _sum: { balance: true } })
    ]);

    const ivaTrasladado = taxControl.filter(t => t.type === 'TRASLADADO').reduce((s, t) => s + t.iva16 + t.iva8, 0);
    const ivaAcreditable = taxControl.filter(t => t.type === 'ACREDITABLE').reduce((s, t) => s + t.iva16 + t.iva8, 0);
    const ivaNeto = ivaTrasladado - ivaAcreditable;

    return {
      historical: months,
      fiscal: {
        ivaNeto: parseFloat(ivaNeto.toFixed(2)),
        bankLiquidity: Number(bankBalance._sum.balance || 0),
        pendingCxc: await this.prisma.invoice.aggregate({ where: { companyId, status: 'VIGENTE' }, _sum: { total: true } }).then(r => r._sum.total || 0)
      }
    };
  }

  @Get('tax-simulator')
  async getTaxSimulator(@Query('companyId') companyId: string, @Query('month') month: string, @Query('year') year: string) {
    const mo = parseInt(month || String(new Date().getMonth() + 1));
    const yr = parseInt(year || String(new Date().getFullYear()));
    const start = new Date(yr, mo - 1, 1);
    const end = new Date(yr, mo, 0, 23, 59, 59);

    const [invoices, bills, payroll] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { companyId, date: { gte: start, lte: end }, status: { not: 'CANCELADA' } },
        _sum: { subtotal: true, tax: true, total: true }
      }),
      this.prisma.bill.aggregate({
        where: { companyId, date: { gte: start, lte: end }, status: { not: 'CANCELADA' } },
        _sum: { subtotal: true, tax: true, total: true }
      }),
      (this.prisma as any).payrollReceipt.aggregate({
        where: { period: { companyId, paymentDate: { gte: start, lte: end } } },
        _sum: { totalPerceptions: true, totalDeductions: true }
      })
    ]);

    const ivaTrasladado = Number(invoices._sum.tax || 0);
    const ivaAcreditable = Number(bills._sum.tax || 0);
    const ivaNeto = ivaTrasladado - ivaAcreditable;

    const ingresos = Number(invoices._sum.subtotal || 0);
    const deducciones = Number(bills._sum.subtotal || 0) + Number(payroll._sum.totalPerceptions || 0) + Number(payroll._sum.totalDeductions || 0);
    const baseIsr = Math.max(0, ingresos - deducciones);
    const isrEstimado = baseIsr * 0.30;

    return {
      period: `${mo}/${yr}`,
      iva: {
        trasladado: ivaTrasladado,
        acreditable: ivaAcreditable,
        neto: ivaNeto
      },
      isr: {
        ingresos,
        deducciones,
        base: baseIsr,
        estimado: isrEstimado
      },
      summary: {
        totalToPay: Math.max(0, ivaNeto) + isrEstimado
      }
    };
  }

  // ── Antigüedad de Saldos (CxC / CxP) ─────────────────────────────────────

  @Get('aging')
  async getAging(@Query('companyId') companyId: string, @Query('type') type: string = 'CXC') {
    if (!companyId) throw new BadRequestException('companyId es requerido');
    const today = new Date();

    if (type === 'CXC') {
      const invoices = await this.prisma.invoice.findMany({
        where: { companyId, status: { in: ['VIGENTE', 'PENDIENTE'] } },
        include: { client: true },
        orderBy: { date: 'asc' },
      });

      const buckets = { corriente: 0, d30: 0, d60: 0, d90: 0, mas90: 0 };
      const rows = invoices.map((inv: any) => {
        const dueDate = new Date(inv.date);
        dueDate.setDate(dueDate.getDate() + (inv.client?.creditDays ?? 30));
        const dias = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
        let bucket = 'corriente';
        if (dias > 90) bucket = 'mas90';
        else if (dias > 60) bucket = 'd90';
        else if (dias > 30) bucket = 'd60';
        else if (dias > 0) bucket = 'd30';
        (buckets as any)[bucket] += inv.total;
        return { id: inv.id, folio: inv.folio, cliente: inv.client?.name ?? inv.clientName,
          fecha: inv.date, vencimiento: dueDate, diasVencido: Math.max(0, dias), total: inv.total, bucket };
      });

      return { type: 'CXC', rows, totals: buckets };
    } else {
      const bills = await this.prisma.bill.findMany({
        where: { companyId, status: { in: ['PENDIENTE', 'VIGENTE'] } },
        include: { supplier: true },
        orderBy: { date: 'asc' },
      });

      const buckets = { corriente: 0, d30: 0, d60: 0, d90: 0, mas90: 0 };
      const rows = bills.map((b: any) => {
        const dueDate = new Date(b.date);
        dueDate.setDate(dueDate.getDate() + 30);
        const dias = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
        let bucket = 'corriente';
        if (dias > 90) bucket = 'mas90';
        else if (dias > 60) bucket = 'd90';
        else if (dias > 30) bucket = 'd60';
        else if (dias > 0) bucket = 'd30';
        (buckets as any)[bucket] += b.total;
        return { id: b.id, folio: b.folio, proveedor: b.supplier?.name ?? b.supplierName,
          fecha: b.date, vencimiento: dueDate, diasVencido: Math.max(0, dias), total: b.total, bucket };
      });

      return { type: 'CXP', rows, totals: buckets };
    }
  }

  // ── Estado de Flujo de Efectivo (Método Indirecto) ───────────────────────

  @Get('flujo-efectivo')
  async getFlujEfectivo(
    @Query('companyId') companyId: string,
    @Query('year') year: string,
  ) {
    if (!companyId) throw new BadRequestException('companyId es requerido');
    const yr = parseInt(year || String(new Date().getFullYear()));
    const start = new Date(yr, 0, 1);
    const end = new Date(yr, 11, 31, 23, 59, 59);

    const [invoicesPaid, billsPaid, bankTx] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { companyId, status: 'PAGADA', date: { gte: start, lte: end } },
        _sum: { total: true },
      }),
      this.prisma.bill.aggregate({
        where: { companyId, status: 'PAGADA', date: { gte: start, lte: end } },
        _sum: { total: true },
      }),
      this.prisma.bankTransaction.groupBy({
        by: ['type'],
        where: { bankAccount: { companyId }, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    const cobros = Number(invoicesPaid._sum.total ?? 0);
    const pagos = Number(billsPaid._sum.total ?? 0);
    const creditosBancarios = bankTx.filter((t: any) => t.type === 'CREDIT').reduce((s: number, t: any) => s + Number(t._sum.amount ?? 0), 0);
    const cargosBancarios = bankTx.filter((t: any) => t.type === 'DEBIT').reduce((s: number, t: any) => s + Number(t._sum.amount ?? 0), 0);

    const flujoOperacion = cobros - pagos;
    const flujoFinanciamiento = creditosBancarios - cargosBancarios - cobros + pagos;

    return {
      ejercicio: yr,
      operacion: {
        label: 'Actividades de Operación',
        cobrosClientes: cobros,
        pagosProveedores: -pagos,
        neto: flujoOperacion,
      },
      inversion: {
        label: 'Actividades de Inversión',
        adquisicionActivos: 0,
        neto: 0,
      },
      financiamiento: {
        label: 'Actividades de Financiamiento',
        creditosBancarios,
        pagosCreditos: -cargosBancarios,
        neto: flujoFinanciamiento,
      },
      flujoNeto: flujoOperacion + flujoFinanciamiento,
    };
  }

  @Get('declaracion-anual')
  async declaracionAnual(@Query('companyId') companyId: string, @Query('year') year: string) {
    const yr = parseInt(year || String(new Date().getFullYear()));
    const from = new Date(yr, 0, 1);
    const to = new Date(yr + 1, 0, 1);

    const invoices = await this.prisma.invoice.findMany({ where: { companyId, status: { not: 'CANCELADA' }, date: { gte: from, lt: to } } });
    const bills = await this.prisma.bill.findMany({ where: { companyId, date: { gte: from, lt: to } } });

    const ingresosMensuales = Array.from({ length: 12 }, (_, m) => {
      const mes = invoices.filter(i => i.date.getMonth() === m);
      return { mes: m + 1, subtotal: mes.reduce((s, i) => s + i.subtotal, 0), iva: mes.reduce((s, i) => s + i.tax, 0) };
    });

    const totalIngresos = invoices.reduce((s, i) => s + i.subtotal, 0);
    const totalIvaGravado = invoices.reduce((s, i) => s + i.tax, 0);
    const totalDeducciones = bills.reduce((s, b) => s + b.subtotal, 0);
    const totalIvaAcreditable = bills.reduce((s, b) => s + b.tax, 0);

    // ISR anual simplificado (tasa efectiva promedio 30% personas morales)
    const utilidadFiscal = Math.max(0, totalIngresos - totalDeducciones);
    const isrAnual = utilidadFiscal * 0.30;
    const ivaACargo = Math.max(0, totalIvaGravado - totalIvaAcreditable);

    return {
      ejercicio: yr,
      ingresosMensuales,
      totalIngresos,
      totalDeducciones,
      utilidadFiscal,
      isrAnual,
      totalIvaGravado,
      totalIvaAcreditable,
      ivaACargo,
      facturas: invoices.length,
      compras: bills.length,
    };
  }
}
