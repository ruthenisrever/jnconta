import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('inventory')
export class InventoryController {
  constructor(private prisma: PrismaService) {}

  @Get('kardex/:productId')
  async getKardex(@Param('productId') productId: string, @Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('Falta companyId');

    const movements = await (this.prisma as any).inventoryMovement.findMany({
      where: { productId, companyId },
      orderBy: { date: 'asc' },
    });

    let stockAcumulado = 0;
    let valorTotal = 0;
    const kardexRows = movements.map((m: any) => {
      const q = m.type === 'SALIDA' ? -m.quantity : m.quantity;
      stockAcumulado += q;
      valorTotal += m.type === 'SALIDA' ? -(m.quantity * m.unitCost) : m.totalCost;
      const costoPromedio = stockAcumulado > 0 ? valorTotal / stockAcumulado : 0;
      return { ...m, stockAcumulado, costoPromedio };
    });

    return kardexRows;
  }

  @Post('movement')
  async addMovement(@Body() body: any) {
    const { companyId, productId, type, quantity, unitCost, reference, notes } = body;
    if (!companyId || !productId || !type) throw new BadRequestException('Faltan campos');

    const totalCost = quantity * (unitCost || 0);

    const [mov] = await Promise.all([
      (this.prisma as any).inventoryMovement.create({
        data: { companyId, productId, type, quantity, unitCost: unitCost || 0, totalCost, reference, notes },
      }),
      this.prisma.product.update({
        where: { id: productId },
        data: { stock: type === 'SALIDA' ? { decrement: quantity } : { increment: quantity } },
      }),
    ]);

    return mov;
  }

  /**
   * Re-calcula el stock real de un producto contando todos sus movimientos históricos.
   * Útil para corregir desincronizaciones por errores de secuencia de fechas.
   */
  @Post('recalculate/:productId')
  async recalculate(@Param('productId') productId: string, @Body() body: any) {
    const { companyId } = body;
    if (!companyId) throw new BadRequestException('Falta companyId');

    const movements = await (this.prisma as any).inventoryMovement.findMany({
      where: { productId, companyId },
      orderBy: { date: 'asc' },
    });

    let stockReal = 0;
    for (const m of movements) {
      stockReal += m.type === 'SALIDA' ? -m.quantity : m.quantity;
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { stock: stockReal },
    });

    return { productId, stockRecalculado: stockReal, totalMovements: movements.length };
  }
}
