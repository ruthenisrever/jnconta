import { Controller, Get, Post, Put, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';
import { StampingService } from './stamping.service';

@Controller('advances')
@UseGuards(JwtAuthGuard)
export class AdvancesController {
  constructor(private prisma: PrismaService, private stamping: StampingService) {}

  @Get()
  async list(@Query('companyId') companyId: string, @Query('status') status?: string) {
    return this.prisma.advance.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      include: { client: true },
      orderBy: { date: 'desc' },
    });
  }

  @Post()
  async create(@Body() body: any) {
    const last = await this.prisma.advance.findFirst({ where: { companyId: body.companyId }, orderBy: { folio: 'desc' } });
    const folio = (last?.folio ?? 0) + 1;
    return this.prisma.advance.create({
      data: { folio, clientId: body.clientId, date: new Date(body.date ?? Date.now()), amount: Number(body.amount), applied: 0, remaining: Number(body.amount), status: 'PENDIENTE', companyId: body.companyId },
      include: { client: true },
    });
  }

  @Post(':id/stamp')
  async stamp(@Param('id') id: string, @Query('companyId') companyId: string) {
    const adv = await (this.prisma as any).advance.findUnique({ where: { id } });
    if (!adv) throw new Error('Anticipo no encontrado');
    return this.stamping.stampDocument('ADVANCE', id, companyId || adv.companyId);
  }

  @Put(':id/apply')
  async apply(@Param('id') id: string, @Body() body: { invoiceId: string; amount: number }) {
    const adv = await this.prisma.advance.findUnique({ where: { id } });
    if (!adv) throw new Error('Anticipo no encontrado');
    const newApplied = adv.applied + Number(body.amount);
    const newRemaining = adv.amount - newApplied;
    return this.prisma.advance.update({
      where: { id },
      data: { applied: newApplied, remaining: newRemaining, invoiceId: body.invoiceId, status: newRemaining <= 0 ? 'APLICADO' : 'PARCIAL' },
    });
  }

  @Get('summary')
  async summary(@Query('companyId') companyId: string) {
    const advances = await this.prisma.advance.findMany({ where: { companyId } });
    return {
      total: advances.length,
      pendiente: advances.filter(a => a.status === 'PENDIENTE').reduce((s, a) => s + a.remaining, 0),
      aplicado: advances.filter(a => a.status === 'APLICADO').length,
    };
  }
}
