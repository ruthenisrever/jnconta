import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.prisma.supplier.findMany({
      where: { companyId },
      include: {
        bills: {
          where: { status: 'PENDIENTE' },
          select: { total: true, dueDate: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  create(@Body() data: any) {
    return this.prisma.supplier.create({ data });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.prisma.supplier.update({ where: { id }, data });
  }
}
