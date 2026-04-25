import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { FiscalService } from './fiscal.service';

@Controller('fiscal')
export class FiscalController {
  constructor(
    private prisma: PrismaService,
    private fiscalService: FiscalService
  ) {}

  @Get('stats')
  async getFiscalStats(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required');

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [invoiceStats, billStats, bankStats] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { companyId, status: { not: 'CANCELADA' }, date: { gte: firstDay, lte: lastDay } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.bill.aggregate({
        where: { companyId, status: 'PENDIENTE' },
        _sum: { total: true },
      }),
      this.prisma.bankAccount.aggregate({
        where: { companyId },
        _sum: { balance: true },
      }),
    ]);

    return {
      ingresosMes: invoiceStats._sum.total || 0,
      facturasMes: invoiceStats._count || 0,
      cxpPendiente: billStats._sum.total || 0,
      saldoBancario: bankStats._sum.balance || 0,
    };
  }

  @Get('worksheet')
  async getWorksheet(
    @Query('companyId') companyId: string,
    @Query('month') month: string,
    @Query('year') year: string
  ) {
    if (!companyId || !month || !year) {
      throw new BadRequestException('companyId, month and year are required');
    }
    return this.fiscalService.getMonthlyTaxWorksheet(companyId, parseInt(month), parseInt(year));
  }

  @Post('close-year')
  async closeYear(
    @Query('companyId') companyId: string,
    @Body() body: { year: number; destinationAccountId: string }
  ) {
    if (!companyId) throw new BadRequestException('companyId is required');
    const { year, destinationAccountId } = body;

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    // 1. Get all accounts with their entries for the year
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true, type: { in: ['INGRESO', 'GASTO'] } },
      include: {
        journalEntries: {
          include: { journal: true },
          where: { journal: { date: { gte: startDate, lte: endDate }, status: { not: 'CANCELADA' } } },
        },
      },
    });

    // 2. Calculate net balance per account
    const closingLines: { accountId: string; debit: number; credit: number; description: string }[] = [];
    let netResult = 0;

    for (const acc of accounts) {
      const totalDebit = acc.journalEntries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = acc.journalEntries.reduce((s, e) => s + e.credit, 0);
      const balance = totalDebit - totalCredit; // positive = debit balance

      if (balance === 0 && totalDebit === 0) continue;

      if (acc.type === 'INGRESO') {
        // Income accounts have credit balance (totalCredit > totalDebit)
        // Closing: Debit the income account to zero it out
        if (totalCredit - totalDebit > 0) {
          closingLines.push({
            accountId: acc.id,
            debit: totalCredit - totalDebit,
            credit: 0,
            description: `Cierre ${year} - ${acc.name}`,
          });
          netResult += totalCredit - totalDebit;
        }
      } else if (acc.type === 'GASTO') {
        // Expense accounts have debit balance
        // Closing: Credit the expense account to zero it out
        if (totalDebit - totalCredit > 0) {
          closingLines.push({
            accountId: acc.id,
            debit: 0,
            credit: totalDebit - totalCredit,
            description: `Cierre ${year} - ${acc.name}`,
          });
          netResult -= totalDebit - totalCredit;
        }
      }
    }

    if (closingLines.length === 0) {
      throw new BadRequestException('No hay saldos de ingresos o gastos para cerrar en el ejercicio seleccionado.');
    }

    // 3. Balancing entry to destination account (Utilidad/Pérdida)
    if (netResult > 0) {
      closingLines.push({
        accountId: destinationAccountId,
        debit: 0,
        credit: netResult,
        description: `Utilidad neta del ejercicio ${year}`,
      });
    } else if (netResult < 0) {
      closingLines.push({
        accountId: destinationAccountId,
        debit: Math.abs(netResult),
        credit: 0,
        description: `Pérdida neta del ejercicio ${year}`,
      });
    }

    // 4. Create the closing journal
    const journalCount = await this.prisma.journal.count({ where: { companyId } });
    const journal = await this.prisma.journal.create({
      data: {
        number: `CRE-${year}-${String(journalCount + 1).padStart(4, '0')}`,
        type: 'DIARIO',
        date: new Date(year, 11, 31),
        concept: `Cierre del Ejercicio ${year}`,
        status: 'APLICADA',
        companyId,
        entries: {
          create: closingLines.map(l => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
    });

    return {
      success: true,
      journal,
      entriesCount: closingLines.length,
      netResult,
    };
  }
}
