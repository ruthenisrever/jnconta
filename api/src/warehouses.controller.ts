import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';

@Controller('warehouses')
@UseGuards(JwtAuthGuard)
export class WarehousesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('companyId') companyId: string) {
    return this.prisma.warehouse.findMany({ where: { companyId, isActive: true }, include: { stock: { include: { product: true } } }, orderBy: { name: 'asc' } });
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.warehouse.create({ data: { code: body.code, name: body.name, address: body.address, isDefault: body.isDefault ?? false, companyId: body.companyId } });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.warehouse.update({ where: { id }, data: { name: body.name, address: body.address, isDefault: body.isDefault, isActive: body.isActive } });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.warehouse.update({ where: { id }, data: { isActive: false } });
  }

  @Get(':id/stock')
  async stock(@Param('id') id: string) {
    return this.prisma.warehouseStock.findMany({ where: { warehouseId: id }, include: { product: true } });
  }

  @Get('transfers')
  async listTransfers(@Query('companyId') companyId: string) {
    return this.prisma.warehouseTransfer.findMany({
      where: { companyId },
      include: { fromWarehouse: true, toWarehouse: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('transfer')
  async createTransfer(@Body() body: any) {
    const { companyId, fromWarehouseId, toWarehouseId, notes, items } = body;
    const last = await this.prisma.warehouseTransfer.findFirst({ where: { companyId }, orderBy: { folio: 'desc' } });
    const folio = (last?.folio ?? 0) + 1;

    const transfer = await this.prisma.warehouseTransfer.create({
      data: {
        folio, companyId, fromWarehouseId, toWarehouseId, notes,
        items: { create: (items || []).map((i: any) => ({ productId: i.productId, quantity: Number(i.quantity) })) },
      },
      include: { items: true },
    });
    return transfer;
  }

  @Put('transfer/:id/complete')
  async completeTransfer(@Param('id') id: string) {
    const transfer = await this.prisma.warehouseTransfer.findUnique({ where: { id }, include: { items: true } });
    if (!transfer) throw new Error('Transferencia no encontrada');

    for (const item of transfer.items) {
      // Reduce stock in source warehouse
      await this.prisma.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: transfer.fromWarehouseId, productId: item.productId } },
        update: { quantity: { decrement: item.quantity } },
        create: { warehouseId: transfer.fromWarehouseId, productId: item.productId, quantity: -item.quantity },
      });
      // Increase stock in destination warehouse
      await this.prisma.warehouseStock.upsert({
        where: { warehouseId_productId: { warehouseId: transfer.toWarehouseId, productId: item.productId } },
        update: { quantity: { increment: item.quantity } },
        create: { warehouseId: transfer.toWarehouseId, productId: item.productId, quantity: item.quantity },
      });
    }

    return this.prisma.warehouseTransfer.update({ where: { id }, data: { status: 'COMPLETADO' } });
  }
}
