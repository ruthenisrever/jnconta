import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';

@Controller('branches')
@UseGuards(JwtAuthGuard)
export class BranchesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('companyId') companyId: string) {
    return this.prisma.branch.findMany({ where: { companyId, isActive: true }, orderBy: { name: 'asc' } });
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.branch.create({ data: { code: body.code, name: body.name, address: body.address, phone: body.phone, manager: body.manager, companyId: body.companyId } });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.branch.update({ where: { id }, data: { name: body.name, address: body.address, phone: body.phone, manager: body.manager, isActive: body.isActive } });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.branch.update({ where: { id }, data: { isActive: false } });
  }
}
