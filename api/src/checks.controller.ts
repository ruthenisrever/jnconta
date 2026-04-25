import { Controller, Get, Post, Put, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';

@Controller('checks')
@UseGuards(JwtAuthGuard)
export class ChecksController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query('companyId') companyId: string, @Query('status') status?: string) {
    return this.prisma.check.findMany({
      where: { companyId, ...(status ? { status } : {}) },
      include: { bankAccount: true },
      orderBy: { date: 'desc' },
    });
  }

  @Post()
  async create(@Body() body: any) {
    const check = await this.prisma.check.create({
      data: {
        number: body.number,
        date: new Date(body.date),
        beneficiary: body.beneficiary,
        concept: body.concept,
        amount: Number(body.amount),
        bankAccountId: body.bankAccountId,
        status: 'EMITIDO',
        billId: body.billId || undefined,
        companyId: body.companyId,
      },
    });

    await this.prisma.bankAccount.update({ where: { id: body.bankAccountId }, data: { balance: { decrement: Number(body.amount) } } });
    await this.prisma.bankTransaction.create({
      data: {
        bankAccountId: body.bankAccountId,
        date: new Date(body.date),
        concept: `Cheque #${body.number} - ${body.beneficiary}`,
        reference: body.number,
        type: 'RETIRO',
        amount: Number(body.amount),
        balance: 0,
        currency: 'MXN',
      },
    });

    return check;
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.prisma.check.update({ where: { id }, data: { status: body.status } });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.prisma.check.delete({ where: { id } });
  }

  @Get('summary')
  async summary(@Query('companyId') companyId: string) {
    const checks = await this.prisma.check.findMany({ where: { companyId } });
    const emitidos = checks.filter(c => c.status === 'EMITIDO').reduce((s, c) => s + c.amount, 0);
    const cobrados = checks.filter(c => c.status === 'COBRADO').reduce((s, c) => s + c.amount, 0);
    const cancelados = checks.filter(c => c.status === 'CANCELADO').length;
    return { total: checks.length, emitidos, cobrados, cancelados };
  }
}
