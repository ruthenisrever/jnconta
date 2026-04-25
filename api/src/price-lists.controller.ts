import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';

@Controller('price-lists')
@UseGuards(JwtAuthGuard)
export class PriceListsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('companyId') companyId: string) {
    return this.prisma.priceList.findMany({
      where: { companyId, isActive: true },
      include: { items: { include: { product: true } }, clients: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.priceList.create({ data: { name: body.name, currency: body.currency ?? 'MXN', companyId: body.companyId } });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.priceList.update({ where: { id }, data: { name: body.name, currency: body.currency, isActive: body.isActive } });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.priceList.update({ where: { id }, data: { isActive: false } });
  }

  @Post(':id/items')
  async addItem(@Param('id') priceListId: string, @Body() body: any) {
    return this.prisma.priceListItem.upsert({
      where: { priceListId_productId: { priceListId, productId: body.productId } },
      update: { price: Number(body.price), minQuantity: Number(body.minQuantity ?? 1) },
      create: { priceListId, productId: body.productId, price: Number(body.price), minQuantity: Number(body.minQuantity ?? 1) },
    });
  }

  @Delete(':id/items/:itemId')
  async removeItem(@Param('itemId') id: string) {
    return this.prisma.priceListItem.delete({ where: { id } });
  }

  @Get('volume-discounts')
  async listDiscounts(@Query('companyId') companyId: string) {
    return this.prisma.volumeDiscount.findMany({ where: { companyId }, include: { product: true }, orderBy: { minQty: 'asc' } });
  }

  @Post('volume-discounts')
  async createDiscount(@Body() body: any) {
    return this.prisma.volumeDiscount.create({ data: { productId: body.productId || undefined, minQty: Number(body.minQty), discountPct: Number(body.discountPct), companyId: body.companyId } });
  }

  @Delete('volume-discounts/:id')
  async deleteDiscount(@Param('id') id: string) {
    return this.prisma.volumeDiscount.delete({ where: { id } });
  }

  @Get('for-product')
  async priceForProduct(@Query('companyId') companyId: string, @Query('productId') productId: string, @Query('clientId') clientId?: string, @Query('qty') qty?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) return { price: 0 };

    let price = product.price;
    const quantity = Number(qty ?? 1);

    if (clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: clientId }, include: { priceList: { include: { items: true } } } });
      if (client?.priceList) {
        const item = client.priceList.items.find((i: any) => i.productId === productId && quantity >= i.minQuantity);
        if (item) price = item.price;
      }
    }

    const volumeDiscount = await this.prisma.volumeDiscount.findFirst({
      where: { companyId, OR: [{ productId }, { productId: null }], minQty: { lte: quantity } },
      orderBy: { minQty: 'desc' },
    });

    const discountPct = volumeDiscount?.discountPct ?? 0;
    return { price, discountPct, finalPrice: price * (1 - discountPct / 100) };
  }
}
