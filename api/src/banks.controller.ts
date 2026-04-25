import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('banks')
export class BanksController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.prisma.bankAccount.findMany({
      where: { companyId },
      include: { transactions: { orderBy: { date: 'desc' }, take: 10 } },
    });
  }

  @Get(':id/transactions')
  getTransactions(@Param('id') id: string) {
    return this.prisma.bankTransaction.findMany({
      where: { bankAccountId: id },
      orderBy: { date: 'desc' },
    });
  }

  @Post()
  createAccount(@Body() data: any) {
    return this.prisma.bankAccount.create({ data });
  }

  @Post(':id/transactions')
  createTransaction(@Param('id') bankAccountId: string, @Body() data: any) {
    return this.prisma.bankTransaction.create({ data: { ...data, bankAccountId } });
  }
}
