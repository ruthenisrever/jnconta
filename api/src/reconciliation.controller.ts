import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

import { StatementParserService } from './statement-parser.service';

@Controller('reconciliation')
export class ReconciliationController {
  constructor(
    private prisma: PrismaService,
    private parser: StatementParserService
  ) {}

  @Post('import/:bankAccountId')
  async importStatement(
    @Param('bankAccountId') bankAccountId: string, 
    @Body() body: { csv: string, bankType?: string }
  ) {
    const rows = await this.parser.parse(body.csv, body.bankType || 'GENERIC');
    const imported = [];
    let duplicates = 0;
    
    for (const row of rows) {
      // Evitar duplicados usando el hash único
      const exists = await this.prisma.bankTransaction.findUnique({
        where: { hash: row.hash }
      });

      if (exists) {
        duplicates++;
        continue;
      }

      const trx = await this.prisma.bankTransaction.create({
        data: {
          bankAccount: { connect: { id: bankAccountId } },
          date: row.date,
          concept: row.concept,
          amount: row.amount,
          balance: 0,
          type: row.amount > 0 ? 'DEPOSITO' : 'RETIRO',
          reconciled: false,
          hash: row.hash,
          reference: row.reference
        }
      });
      imported.push(trx);
    }
    
    return { count: imported.length, duplicates, transactions: imported };
  }

  @Get('auto-match')
  async autoMatch(
    @Query('companyId') companyId: string, 
    @Query('bankAccountId') bankAccountId: string,
    @Query('daysTolerance') daysTolerance = '5'
  ) {
    const tolerance = parseInt(daysTolerance);
    if (!bankAccountId) return [];
    const bank = await this.prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bank) return [];
    const ledgerAccountId = bank.accountId;

    const transactions = await this.prisma.bankTransaction.findMany({
      where: { bankAccountId, reconciled: false },
      orderBy: { date: 'asc' }
    });

    const results = [];

    for (const trx of transactions) {
      const startDate = new Date(trx.date);
      startDate.setDate(startDate.getDate() - tolerance);
      const endDate = new Date(trx.date);
      endDate.setDate(endDate.getDate() + tolerance);

      // 1. Buscar matches exactos en Pólizas (Diario)
      const potentialEntries = ledgerAccountId ? await this.prisma.journalEntry.findMany({
        where: {
          accountId: ledgerAccountId,
          journal: {
            companyId,
            date: { gte: startDate, lte: endDate }
          },
          OR: [
            { debit: trx.amount },
            { credit: Math.abs(trx.amount) }
          ]
        },
        include: { journal: true }
      }) : [];

      // 2. Clasificar matches por confianza
      const scoredMatches = potentialEntries.map(entry => {
        let confidence = 70; // Base: Importe + Fecha
        let reason = 'Importe y fecha coinciden';

        if (entry.journal.concept?.toLowerCase().includes(trx.concept.substring(0, 10).toLowerCase())) {
          confidence = 90;
          reason = 'Mismo importe y concepto similar';
        }
        
        if (trx.reference && entry.journal.number?.includes(trx.reference)) {
          confidence = 100;
          reason = 'Referencia mecánica exacta';
        }

        return { ...entry, confidence, reason };
      });

      // 3. Reglas Especiales: Comisiones
      let autoAction = null;
      if (trx.concept.toUpperCase().includes('COMISION') || trx.concept.toUpperCase().includes('COM.')) {
        autoAction = {
          type: 'CREATE_COMMISSION',
          suggestedAccount: '601-84-000', // Gastos Financieros: Comisiones
          label: 'Sugerencia: Crear póliza de Comisión Bancaria'
        };
      }

      results.push({
        transaction: trx,
        potentialMatches: scoredMatches.sort((a, b) => b.confidence - a.confidence),
        autoAction
      });
    }

    return results;
  }

  @Post('link')
  async link(@Body() data: { transactionId: string; journalId: string }) {
    const { transactionId, journalId } = data;

    return this.prisma.$transaction(async (tx) => {
      // Update transaction
      await tx.bankTransaction.update({
        where: { id: transactionId },
        data: { 
          reconciled: true,
          journalId: journalId
        }
      });

      return { success: true };
    });
  }

  @Get('entries-to-reconcile')
  async getEntriesToReconcile(@Query('companyId') companyId: string, @Query('accountId') accountId: string) {
    // Returns journal entries that are not yet linked to a bank transaction
    return this.prisma.journalEntry.findMany({
      where: {
        accountId,
        journal: {
          companyId,
          bankTransaction: null // Uses the back-relation to check for unlinked
        }
      },
      include: {
        journal: true
      }
    });
  }
  @Post('create-journal-from-transaction')
  async createJournalFromTransaction(@Body() data: { transactionId: string; accountId: string; concept: string }) {
    const { transactionId, accountId, concept } = data;
    
    const trx = await this.prisma.bankTransaction.findUnique({
      where: { id: transactionId },
      include: { bankAccount: true }
    });
    
    if (!trx) throw new BadRequestException('Transacción no encontrada.');

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Journal
      const journal = await tx.journal.create({
        data: {
          companyId: trx.bankAccount.companyId,
          date: trx.date,
          number: `BCO-${trx.id.substring(0, 8)}`,
          type: trx.type === 'DEPOSITO' ? 'INGRESO' : 'EGRESO',
          concept: concept || trx.concept,
          status: 'CONTABILIZADA',
          entries: {
            create: [
              {
                accountId: trx.bankAccount.accountId || '1.1.02.01',
                debit: trx.type === 'DEPOSITO' ? trx.amount : 0,
                credit: trx.type === 'RETIRO' ? Math.abs(trx.amount) : 0,
                description: trx.concept
              },
              {
                accountId: accountId,
                debit: trx.type === 'RETIRO' ? Math.abs(trx.amount) : 0,
                credit: trx.type === 'DEPOSITO' ? trx.amount : 0,
                description: trx.concept
              }
            ]
          }
        }
      });

      // 2. Link and Reconcile
      await tx.bankTransaction.update({
        where: { id: transactionId },
        data: { reconciled: true, journalId: journal.id }
      });

      return journal;
    });
  }
}

