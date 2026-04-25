import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('companyId') companyId: string, @Query('status') status?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: { include: { product: true } } },
    });
  }

  @Post()
  async create(@Body() body: any) {
    const { companyId, supplierId, expectedDate, notes, items } = body;
    const last = await this.prisma.purchaseOrder.findFirst({ where: { companyId }, orderBy: { folio: 'desc' } });
    const folio = (last?.folio ?? 0) + 1;

    let subtotal = 0, tax = 0;
    const mappedItems = (items || []).map((i: any) => {
      const sub = Number(i.quantity) * Number(i.unitCost);
      const t = sub * Number(i.taxRate ?? 0.16);
      subtotal += sub; tax += t;
      return { description: i.description, quantity: Number(i.quantity), unitCost: Number(i.unitCost), taxRate: Number(i.taxRate ?? 0.16), subtotal: sub, tax: t, total: sub + t, productId: i.productId || undefined, quantityReceived: 0 };
    });

    return this.prisma.purchaseOrder.create({
      data: { folio, companyId, supplierId, expectedDate: expectedDate ? new Date(expectedDate) : undefined, notes, subtotal, tax, total: subtotal + tax, items: { create: mappedItems } },
      include: { supplier: true, items: true },
    });
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: body.status } });
  }

  @Post(':id/receive')
  async receive(@Param('id') id: string, @Body() body: any) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new Error('Orden no encontrada');

    const bill = await this.prisma.bill.create({
      data: {
        folio: `OC-${order.folio}`,
        date: new Date(),
        supplierId: order.supplierId,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        companyId: order.companyId,
        status: 'PENDIENTE',
      },
    });

    await this.prisma.purchaseOrder.update({ where: { id }, data: { status: 'RECIBIDA', billId: bill.id } });

    for (const item of order.items) {
      if (item.productId) {
        await this.prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        await this.prisma.inventoryMovement.create({
          data: { productId: item.productId, type: 'ENTRADA', quantity: item.quantity, unitCost: item.unitCost, totalCost: item.quantity * item.unitCost, reference: `OC-${order.folio}`, companyId: order.companyId },
        });
      }
    }

    return { ok: true, billId: bill.id };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prisma.purchaseOrderItem.deleteMany({ where: { orderId: id } });
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
