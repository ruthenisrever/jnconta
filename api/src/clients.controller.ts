import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('clients')
export class ClientsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.prisma.client.findMany({
      where: { companyId },
      include: {
        invoices: {
          where: { status: { in: ['VIGENTE', 'COBRADA'] } },
          select: { total: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Post()
  create(@Body() data: any) {
    return this.prisma.client.create({ data });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.prisma.client.update({ where: { id }, data });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.client.update({ where: { id }, data: { isActive: false } });
  }
}
