import { Controller, Get, Post, Put, Query, Body, Param, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('pos')
export class PosController {
  constructor(private prisma: PrismaService) {}

  @Get('tickets')
  async listTickets(@Query('companyId') companyId: string, @Query('date') date?: string) {
    if (!companyId) throw new BadRequestException('companyId es requerido');
    const start = date ? new Date(date) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return this.prisma.posTicket.findMany({
      where: { companyId, createdAt: { gte: start, lt: end } },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('products')
  async listProducts(@Query('companyId') companyId: string, @Query('q') q?: string) {
    if (!companyId) throw new BadRequestException('companyId es requerido');
    return this.prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
        ...(q ? { OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
        ]} : {}),
      },
      take: 50,
    });
  }

  @Post('tickets')
  async createTicket(@Body() body: any) {
    const { companyId, items = [], payMethod = 'EFECTIVO' } = body;
    if (!companyId) throw new BadRequestException('companyId es requerido');

    const last = await this.prisma.posTicket.findFirst({ where: { companyId }, orderBy: { folio: 'desc' } });
    const folio = (last?.folio ?? 0) + 1;

    const subtotal = items.reduce((s: number, i: any) => s + (i.subtotal ?? i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100)), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    return this.prisma.posTicket.create({
      data: {
        folio, payMethod, subtotal, iva, total, status: 'COBRADO', companyId,
        items: {
          create: items.map((i: any) => {
            const sub = i.subtotal ?? (i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100));
            return {
              productId: i.productId ?? null,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              discount: i.discount ?? 0,
              subtotal: sub,
              total: sub * 1.16,
            };
          }),
        },
      },
      include: { items: true },
    });
  }

  @Put('tickets/:id/cancel')
  async cancelTicket(@Param('id') id: string) {
    return this.prisma.posTicket.update({ where: { id }, data: { status: 'CANCELADO' } });
  }

  @Get('summary')
  async summary(@Query('companyId') companyId: string, @Query('date') date?: string) {
    if (!companyId) throw new BadRequestException('companyId es requerido');
    const start = date ? new Date(date) : new Date(new Date().setHours(0, 0, 0, 0));
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const tickets = await this.prisma.posTicket.findMany({
      where: { companyId, status: 'COBRADO', createdAt: { gte: start, lt: end } },
    });

    const totalVentas = tickets.reduce((s, t) => s + t.total, 0);
    const totalIva = tickets.reduce((s, t) => s + t.iva, 0);

    const byMethod: Record<string, number> = {};
    for (const t of tickets) {
      byMethod[t.payMethod] = (byMethod[t.payMethod] ?? 0) + t.total;
    }

    return { totalTickets: tickets.length, totalVentas, totalIva, byMethod };
  }

  @Post('factura-global')
  async facturaGlobal(@Body() body: { companyId: string; periodo: string; year: number; month: number; day?: number }) {
    const { companyId, periodo, year, month, day } = body;
    let from: Date, to: Date;

    if (periodo === 'DIARIO' && day) {
      from = new Date(year, month - 1, day);
      to = new Date(year, month - 1, day + 1);
    } else if (periodo === 'SEMANAL') {
      const now = new Date(year, month - 1, day ?? 1);
      const dow = now.getDay();
      from = new Date(now); from.setDate(now.getDate() - dow);
      to = new Date(from); to.setDate(from.getDate() + 7);
    } else {
      from = new Date(year, month - 1, 1);
      to = new Date(year, month, 1);
    }

    const tickets = await this.prisma.posTicket.findMany({ where: { companyId, status: 'COBRADO', invoiceId: null, createdAt: { gte: from, lt: to } }, include: { items: true } });
    if (tickets.length === 0) return { error: 'No hay tickets sin facturar en el periodo' };

    const subtotal = tickets.reduce((s, t) => s + t.subtotal, 0);
    const iva = tickets.reduce((s, t) => s + t.iva, 0);
    const total = tickets.reduce((s, t) => s + t.total, 0);

    const last = await this.prisma.invoice.findFirst({ where: { companyId }, orderBy: { folio: 'desc' } });
    const folio = (last?.folio ?? 0) + 1;
    const cliente = await this.prisma.client.findFirst({ where: { companyId, rfc: 'XAXX010101000' } }) || await this.prisma.client.findFirst({ where: { companyId } });
    if (!cliente) throw new BadRequestException('No hay cliente público para la factura global');

    const invoice = await this.prisma.invoice.create({
      data: {
        serie: 'G', folio, date: new Date(), clientId: cliente.id,
        subtotal, tax: iva, total, currency: 'MXN', exchangeRate: 1,
        paymentMethod: 'PUE', paymentForm: '01', cfdiUse: 'CP01', cfdiType: 'I', status: 'VIGENTE',
        companyId,
        items: { create: [{ description: `Venta global ${periodo} ${from.toISOString().substring(0,10)} al ${to.toISOString().substring(0,10)} — ${tickets.length} tickets`, quantity: 1, unitPrice: subtotal, subtotal, tax: iva, total, taxRate: 0.16, unit: 'ACT', satCode: '01010101' }] },
      },
    });

    await this.prisma.posTicket.updateMany({ where: { id: { in: tickets.map(t => t.id) } }, data: { invoiceId: invoice.id } });
    return { invoiceId: invoice.id, folio: `G-${folio}`, tickets: tickets.length, subtotal, iva, total };
  }
}
