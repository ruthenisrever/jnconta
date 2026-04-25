import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('bills')
export class BillsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.prisma.bill.findMany({
      where: { companyId },
      include: { supplier: true },
      orderBy: { date: 'desc' },
    });
  }

  @Post()
  async create(@Body() data: any) {
    const { items, ...billData } = data;
    const bill = await this.prisma.bill.create({
      data: billData,
      include: { supplier: true },
    });

    // Registrar ENTRADAs de inventario en paralelo para items con producto físico
    const physicalItems = (Array.isArray(items) ? items : []).filter(
      (item) => item.productId && item.quantity > 0,
    );
    if (physicalItems.length > 0) {
      await Promise.all([
        ...(physicalItems.map((item) => {
          const unitCost = item.unitCost ?? item.unitPrice ?? 0;
          return (this.prisma as any).inventoryMovement.create({
            data: {
              companyId: bill.companyId,
              productId: item.productId,
              type: 'ENTRADA',
              quantity: item.quantity,
              unitCost,
              totalCost: item.quantity * unitCost,
              reference: bill.uuid || `COMP-${bill.folio}`,
              notes: `Compra ${bill.folio} - ${bill.supplier.name}`,
            },
          });
        })),
        ...(physicalItems.map((item) =>
          this.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          }),
        )),
      ]);
    }

    return bill;
  }

  @Put(':id/pay')
  pay(@Param('id') id: string) {
    return this.prisma.bill.update({ where: { id }, data: { status: 'PAGADA' } });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.prisma.bill.update({ where: { id }, data });
  }
}
