import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';

@Controller('serials-lots')
@UseGuards(JwtAuthGuard)
export class SerialsLotsController {
  constructor(private prisma: PrismaService) {}

  @Get('serials')
  async listSerials(@Query('companyId') companyId: string, @Query('productId') productId?: string, @Query('status') status?: string) {
    return this.prisma.productSerial.findMany({
      where: { companyId, ...(productId ? { productId } : {}), ...(status ? { status } : {}) },
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('serials')
  async createSerial(@Body() body: any) {
    return this.prisma.productSerial.create({
      data: { productId: body.productId, serial: body.serial, status: body.status ?? 'DISPONIBLE', warehouseId: body.warehouseId || undefined, notes: body.notes, companyId: body.companyId },
    });
  }

  @Post('serials/bulk')
  async createBulkSerials(@Body() body: { productId: string; serials: string[]; warehouseId?: string; companyId: string }) {
    const data = body.serials.map(serial => ({ productId: body.productId, serial, status: 'DISPONIBLE', warehouseId: body.warehouseId || undefined, companyId: body.companyId }));
    return this.prisma.productSerial.createMany({ data, skipDuplicates: true });
  }

  @Put('serials/:id')
  async updateSerial(@Param('id') id: string, @Body() body: any) {
    return this.prisma.productSerial.update({ where: { id }, data: { status: body.status, warehouseId: body.warehouseId, notes: body.notes } });
  }

  @Delete('serials/:id')
  async deleteSerial(@Param('id') id: string) {
    return this.prisma.productSerial.delete({ where: { id } });
  }

  @Get('lots')
  async listLots(@Query('companyId') companyId: string, @Query('productId') productId?: string) {
    return this.prisma.productLot.findMany({
      where: { companyId, ...(productId ? { productId } : {}) },
      include: { product: true, warehouse: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('lots')
  async createLot(@Body() body: any) {
    return this.prisma.productLot.create({
      data: { productId: body.productId, lotNumber: body.lotNumber, quantity: Number(body.quantity), remaining: Number(body.quantity), expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined, warehouseId: body.warehouseId || undefined, companyId: body.companyId },
    });
  }

  @Put('lots/:id')
  async updateLot(@Param('id') id: string, @Body() body: any) {
    return this.prisma.productLot.update({ where: { id }, data: { remaining: Number(body.remaining), expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined } });
  }

  @Delete('lots/:id')
  async deleteLot(@Param('id') id: string) {
    return this.prisma.productLot.delete({ where: { id } });
  }
}
