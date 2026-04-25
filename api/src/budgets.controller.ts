import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('budgets')
export class BudgetsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getBudgets(@Query('companyId') companyId: string, @Query('year') year: string) {
    if (!companyId || !year) return [];
    
    // Group all accounts of type GASTO or INGRESO that have a budget
    // For simplicity, we just fetch budgets and join their Account
    const budgets = await (this.prisma as any).budget.findMany({
      where: { companyId, year: parseInt(year) },
      include: { account: true },
      orderBy: { account: { code: 'asc' } }
    });

    return budgets;
  }

  @Post()
  async saveBudget(@Body() body: any) {
    const { companyId, accountId, year, month, amount } = body;
    if (!companyId || !accountId) throw new BadRequestException('Faltan parámetros requeridos');

    // UPSERT
    const existing = await (this.prisma as any).budget.findUnique({
      where: { accountId_year_month_companyId: { accountId, year, month, companyId } }
    });

    if (existing) {
      return (this.prisma as any).budget.update({
        where: { id: existing.id },
        data: { amount }
      });
    } else {
      return (this.prisma as any).budget.create({
        data: { companyId, accountId, year, month, amount }
      });
    }
  }

  @Get('comparison')
  async getComparison(@Query('companyId') companyId: string, @Query('year') year: string, @Query('month') month: string) {
    if (!companyId || !year || !month) return [];
    
    const yr = parseInt(year);
    const mo = parseInt(month);
    
    // 1. Get Budgets for the month
    const budgets = await (this.prisma as any).budget.findMany({
      where: { companyId, year: yr, month: mo },
      include: { account: true }
    });

    if (budgets.length === 0) return [];

    // 2. Calculate actuals from JournalEntries
    const startDate = new Date(yr, mo - 1, 1);
    const endDate = new Date(yr, mo, 0, 23, 59, 59);

    const accountsWithActuals = await this.prisma.account.findMany({
      where: { 
        id: { in: budgets.map((b: any) => b.accountId) }
      },
      include: {
        journalEntries: {
          where: { journal: { date: { gte: startDate, lte: endDate }, status: 'APLICADA' } }
        }
      }
    });

    // 3. Map comparison
    const comparison = budgets.map((b: any) => {
       const acc = accountsWithActuals.find((a: any) => a.id === b.accountId);
       let actual = 0;
       
       if (acc) {
         const debits = acc.journalEntries.reduce((s, e) => s + e.debit, 0);
         const credits = acc.journalEntries.reduce((s, e) => s + e.credit, 0);
         // Simplified sign: Expenses debit increases, Income credit increases
         actual = acc.nature === 'DEUDORA' ? debits - credits : credits - debits;
       }

       return {
         accountId: b.accountId,
         accountCode: b.account.code,
         accountName: b.account.name,
         budgeted: b.amount,
         actual: actual || 0,
         variance: b.amount - (actual || 0),
         percentUsed: b.amount > 0 ? (actual / b.amount) * 100 : 0
       };
    });

    return comparison;
  }
}
