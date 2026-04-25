import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getProducts() {
    return this.prisma.product.findMany({
      include: {
        company: true,
      },
    });
  }

  @Get('stats')
  async getStats() {
    const count = await this.prisma.product.count();
    const totalCost = await this.prisma.product.aggregate({
      _sum: {
        cost: true,
      },
    });
    return {
      count,
      totalCost: totalCost._sum.cost || 0,
    };
  }
}
