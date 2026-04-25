import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private prisma: PrismaService) {}

  private async buildWorkbook(sheetName: string, headers: string[], rows: any[][]): Promise<ExcelJS.Workbook> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0EA5E9' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    rows.forEach(r => ws.addRow(r));
    ws.columns.forEach(c => { c.width = 20; });
    return wb;
  }

  @Get('invoices')
  async exportInvoices(@Query('companyId') companyId: string, @Res() res: Response) {
    const data = await this.prisma.invoice.findMany({
      where: { companyId },
      include: { client: true },
      orderBy: { date: 'desc' },
    });
    const headers = ['Serie', 'Folio', 'Fecha', 'Cliente', 'RFC', 'Subtotal', 'IVA', 'Total', 'Estatus', 'UUID'];
    const rows = data.map(i => [i.serie, i.folio, i.date.toISOString().substring(0, 10), i.client.name, i.client.rfc ?? '', i.subtotal, i.tax, i.total, i.status, i.uuid ?? '']);
    const wb = await this.buildWorkbook('Facturas', headers, rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=facturas.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('clients')
  async exportClients(@Query('companyId') companyId: string, @Res() res: Response) {
    const data = await this.prisma.client.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
    const headers = ['Código', 'Nombre', 'RFC', 'Email', 'Teléfono', 'Límite Crédito', 'Días Crédito', 'Moneda', 'Estatus'];
    const rows = data.map(c => [c.code, c.name, c.rfc ?? '', c.email ?? '', c.phone ?? '', c.creditLimit, c.creditDays, c.currency, c.isActive ? 'Activo' : 'Inactivo']);
    const wb = await this.buildWorkbook('Clientes', headers, rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=clientes.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('suppliers')
  async exportSuppliers(@Query('companyId') companyId: string, @Res() res: Response) {
    const data = await this.prisma.supplier.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
    const headers = ['Código', 'Nombre', 'RFC', 'Email', 'Teléfono', 'Días Crédito', 'Moneda'];
    const rows = data.map(s => [s.code, s.name, s.rfc ?? '', s.email ?? '', s.phone ?? '', s.creditDays, s.currency]);
    const wb = await this.buildWorkbook('Proveedores', headers, rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=proveedores.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('products')
  async exportProducts(@Query('companyId') companyId: string, @Res() res: Response) {
    const data = await this.prisma.product.findMany({ where: { companyId }, orderBy: { sku: 'asc' } });
    const headers = ['SKU', 'Nombre', 'Descripción', 'Costo', 'Precio', 'Stock', 'Stock Mínimo', 'Unidad', 'IVA'];
    const rows = data.map(p => [p.sku, p.name, p.description ?? '', p.cost, p.price, p.stock, p.minStock, p.unit, p.taxRate]);
    const wb = await this.buildWorkbook('Productos', headers, rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=productos.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('accounts')
  async exportAccounts(@Query('companyId') companyId: string, @Res() res: Response) {
    const data = await this.prisma.account.findMany({ where: { companyId }, orderBy: { code: 'asc' } });
    const headers = ['Código', 'Nombre', 'Tipo', 'Naturaleza', 'Nivel', 'Código SAT'];
    const rows = data.map(a => [a.code, a.name, a.type, a.nature, a.level, a.satCode ?? '']);
    const wb = await this.buildWorkbook('Plan de Cuentas', headers, rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=cuentas.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('payroll')
  async exportPayroll(@Query('companyId') companyId: string, @Query('periodId') periodId: string, @Res() res: Response) {
    const receipts = await this.prisma.payrollReceipt.findMany({
      where: { period: { companyId }, ...(periodId ? { periodId } : {}) },
      include: { employee: true, period: true, items: true },
    });
    const headers = ['Empleado', 'RFC', 'Periodo', 'Percepciones', 'Deducciones', 'Neto', 'Estatus'];
    const rows = receipts.map(r => [`${r.employee.firstName} ${r.employee.lastName}`, r.employee.rfc, r.period.name, r.totalPerceptions, r.totalDeductions, r.netAmount, r.status]);
    const wb = await this.buildWorkbook('Nómina', headers, rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=nomina.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }

  @Get('bills')
  async exportBills(@Query('companyId') companyId: string, @Res() res: Response) {
    const data = await this.prisma.bill.findMany({ where: { companyId }, include: { supplier: true }, orderBy: { date: 'desc' } });
    const headers = ['Folio', 'Fecha', 'Proveedor', 'RFC', 'Subtotal', 'IVA', 'Total', 'Vencimiento', 'Estatus'];
    const rows = data.map(b => [b.folio, b.date.toISOString().substring(0, 10), b.supplier.name, b.supplier.rfc ?? '', b.subtotal, b.tax, b.total, b.dueDate?.toISOString().substring(0, 10) ?? '', b.status]);
    const wb = await this.buildWorkbook('Compras', headers, rows);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=compras.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }
}
