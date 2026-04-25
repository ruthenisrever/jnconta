import { Controller, Get, Post, Put, Delete, Query, Body, Param, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('quotes')
export class QuotesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('companyId') companyId: string, @Query('status') status?: string) {
    if (!companyId) throw new BadRequestException('companyId es requerido');
    return this.prisma.quote.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      include: { client: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.prisma.quote.findUnique({ where: { id }, include: { client: true, items: true } });
  }

  @Post()
  async create(@Body() body: any) {
    const { companyId, clientId, clientName, clientRfc, serie = 'COT', status = 'COTIZACION',
      validUntil, notes, items = [] } = body;
    if (!companyId) throw new BadRequestException('companyId es requerido');

    const last = await this.prisma.quote.findFirst({ where: { companyId, serie }, orderBy: { folio: 'desc' } });
    const folio = (last?.folio ?? 0) + 1;

    const subtotal = items.reduce((s: number, i: any) => s + (i.subtotal ?? i.quantity * i.unitPrice), 0);
    const iva = items.reduce((s: number, i: any) => s + ((i.subtotal ?? i.quantity * i.unitPrice) * (i.iva ?? 16) / 100), 0);
    const total = subtotal + iva;

    return this.prisma.quote.create({
      data: {
        folio, serie, status, clientId, clientName, clientRfc,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes, subtotal, iva, total, companyId,
        items: {
          create: items.map((i: any) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount ?? 0,
            iva: i.iva ?? 16,
            subtotal: i.subtotal ?? i.quantity * i.unitPrice,
            total: i.total ?? (i.subtotal ?? i.quantity * i.unitPrice) * (1 + (i.iva ?? 16) / 100),
          })),
        },
      },
      include: { items: true },
    });
  }

  @Put(':id/status')
  async changeStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.prisma.quote.update({ where: { id }, data: { status: body.status } });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const { items, ...data } = body;
    return this.prisma.quote.update({
      where: { id },
      data: {
        ...data,
        ...(items ? {
          items: {
            deleteMany: {},
            create: items.map((i: any) => ({
              description: i.description, quantity: i.quantity, unitPrice: i.unitPrice,
              discount: i.discount ?? 0, iva: i.iva ?? 16,
              subtotal: i.subtotal ?? i.quantity * i.unitPrice,
              total: i.total ?? (i.subtotal ?? i.quantity * i.unitPrice) * 1.16,
            })),
          },
        } : {}),
      },
      include: { items: true },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.quote.delete({ where: { id } });
  }

  /** Convierte una cotización en factura (crea Invoice con los mismos items) */
  @Post(':id/to-invoice')
  async toInvoice(@Param('id') id: string) {
    const quote = await this.prisma.quote.findUnique({ where: { id }, include: { items: true } });
    if (!quote) throw new BadRequestException('Cotización no encontrada');

    const lastInv = await this.prisma.invoice.findFirst({
      where: { companyId: quote.companyId, serie: 'A' },
      orderBy: { folio: 'desc' },
    });
    const folio = (lastInv?.folio ?? 0) + 1;

    if (!quote.clientId) throw new BadRequestException('La cotización debe tener un cliente vinculado para facturar');

    const invoice = await this.prisma.invoice.create({
      data: {
        folio, serie: 'A', status: 'VIGENTE',
        date: new Date(),
        clientId: quote.clientId,
        cfdiUse: 'G03',
        paymentMethod: 'PUE',
        paymentForm: '01',
        subtotal: quote.subtotal,
        tax: quote.iva,
        total: quote.total,
        companyId: quote.companyId,
        items: {
          create: quote.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount,
            taxRate: i.iva / 100,
            subtotal: i.subtotal,
            tax: i.subtotal * (i.iva / 100),
            total: i.total,
            satCode: '01010101',
            unit: 'PZA',
          })),
        },
      },
    });

    await this.prisma.quote.update({ where: { id }, data: { status: 'FACTURADA', invoiceId: invoice.id } });
    return invoice;
  }
}
