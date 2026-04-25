import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';

@Controller('salespeople')
@UseGuards(JwtAuthGuard)
export class SalespeopleController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('companyId') companyId: string) {
    return this.prisma.salesperson.findMany({ where: { companyId, isActive: true }, orderBy: { name: 'asc' } });
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.salesperson.create({ data: { code: body.code, name: body.name, email: body.email, phone: body.phone, commissionPct: Number(body.commissionPct ?? 0), companyId: body.companyId } });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.salesperson.update({ where: { id }, data: { name: body.name, email: body.email, phone: body.phone, commissionPct: Number(body.commissionPct), isActive: body.isActive } });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.salesperson.update({ where: { id }, data: { isActive: false } });
  }

  @Get('commissions')
  async commissions(@Query('companyId') companyId: string, @Query('period') period?: string) {
    return this.prisma.salespersonCommission.findMany({
      where: { companyId, ...(period ? { period } : {}) },
      include: { salesperson: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('commissions/calculate')
  async calculate(@Body() body: { companyId: string; salespersonId: string; period: string }) {
    const sp = await this.prisma.salesperson.findUnique({ where: { id: body.salespersonId } });
    if (!sp) throw new Error('Vendedor no encontrado');

    const [year, month] = body.period.split('-').map(Number);
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const invoices = await this.prisma.invoice.findMany({
      where: { companyId: body.companyId, status: 'VIGENTE', date: { gte: from, lt: to } },
    });

    const totalSales = invoices.reduce((s, i) => s + i.subtotal, 0);
    const commissionAmt = totalSales * (sp.commissionPct / 100);

    return this.prisma.salespersonCommission.create({
      data: { salespersonId: body.salespersonId, invoiceAmount: totalSales, commissionPct: sp.commissionPct, commissionAmt, period: body.period, status: 'PENDIENTE', companyId: body.companyId },
    });
  }

  @Put('commissions/:id/pay')
  async payCommission(@Param('id') id: string) {
    return this.prisma.salespersonCommission.update({ where: { id }, data: { status: 'PAGADA' } });
  }
}
