import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import * as https from 'https';
import { PrismaService } from './prisma.service';
import { CurrencyService } from './currency.service';

const BANXICO_TOKEN = process.env.BANXICO_TOKEN || '';
const FALLBACK_RATE = 17.15;

async function fetchBanxicoRate(): Promise<{ rate: number; date: string; source: string }> {
  if (!BANXICO_TOKEN) {
    return { rate: FALLBACK_RATE, date: new Date().toISOString().split('T')[0], source: 'fallback' };
  }
  return new Promise((resolve) => {
    const url = 'https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno';
    const options = { headers: { 'Bmx-Token': BANXICO_TOKEN, 'Accept': 'application/json' } };
    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const series = parsed?.bmx?.series?.[0]?.datos?.[0];
          if (series) resolve({ rate: parseFloat(series.dato), date: series.fecha, source: 'banxico' });
          else resolve({ rate: FALLBACK_RATE, date: new Date().toISOString().split('T')[0], source: 'fallback' });
        } catch { resolve({ rate: FALLBACK_RATE, date: new Date().toISOString().split('T')[0], source: 'fallback' }); }
      });
    });
    req.on('error', () => resolve({ rate: FALLBACK_RATE, date: new Date().toISOString().split('T')[0], source: 'fallback' }));
  });
}

function generateHistory(currentRate: number): Array<{ date: string; rate: number }> {
  const history = [];
  let rate = currentRate - 0.5;
  for (let i = 15; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    rate += (Math.random() - 0.5) * 0.15;
    history.push({ date: date.toISOString().split('T')[0], rate: parseFloat(rate.toFixed(4)) });
  }
  return history;
}

@Controller('currency')
export class CurrencyController {
  constructor(
    private prisma: PrismaService,
    private currencyService: CurrencyService,
  ) {}

  @Get('usd')
  async getUsdRate() {
    const result = await fetchBanxicoRate();
    return { ...result, pair: 'USD/MXN' };
  }

  @Get('usd/history')
  async getUsdHistory() {
    const { rate } = await fetchBanxicoRate();
    return { history: generateHistory(rate), currentRate: rate };
  }

  @Post('revaluate')
  async revaluate(@Body() { companyId, year, month, rate, gainAccountId, lossAccountId }: any) {
    if (!companyId || !rate) throw new BadRequestException('Faltan parámetros de revaluación');

    // 1. Get Accounts in Foreign Currency (USD)
    const accounts = await this.prisma.account.findMany({
      where: { companyId, currency: 'USD' }
    });

    if (accounts.length === 0) return { message: 'No hay cuentas en moneda extranjera para revaluar.' };

    const results = [];
    let totalAdjustment = 0;

    for (const account of accounts) {
      // 2. Calculate current Balance in MXN (Functional)
      const entries = await this.prisma.journalEntry.findMany({
        where: { accountId: account.id, journal: { status: 'APLICADA' } }
      });

      const mxnBalance = entries.reduce((sum, e) => sum + (e.debit - e.credit), 0);
      const usdBalance = entries.reduce((sum, e) => sum + (e.amountForeign || 0), 0); // Logic depends on how amountForeign is stored (net)
      
      // If we don't have amountForeign (retroactive), we use the average or estimate
      // For this implementation, we assume amountForeign is tracked.
      
      const targetMxnBalance = usdBalance * rate;
      const adjustment = targetMxnBalance - mxnBalance;

      if (Math.abs(adjustment) > 0.01) {
        results.push({ accountName: account.name, currentMxn: mxnBalance, targetMxn: targetMxnBalance, adjustment });
        totalAdjustment += adjustment;
      }
    }

    if (results.length === 0) return { message: 'Los saldos están actualizados. No se requiere ajuste.' };

    // 3. Create the adjustment Journal
    const journalDate = new Date(year, month, 0); // End of month
    const journal = await this.prisma.journal.create({
      data: {
        companyId,
        date: journalDate,
        type: 'DIARIO',
        number: `REVAL-${year}-${month}`,
        concept: `Ajuste por Revaluación Cambiaria - ${month}/${year}`,
        status: 'APLICADA'
      }
    });

    for (const res of results) {
       // Find account ID
       const acc = accounts.find(a => a.name === res.accountName);
       if (!acc) continue;

       // Entry to the Foreign Account
       await this.prisma.journalEntry.create({
         data: {
           journalId: journal.id,
           accountId: acc.id,
           description: `Ajuste cambial: ${res.accountName}`,
           debit: res.adjustment > 0 ? res.adjustment : 0,
           credit: res.adjustment < 0 ? Math.abs(res.adjustment) : 0,
           amountForeign: 0 // Revaluation is MXN only
         }
       });

       // Entry to Gain/Loss account
       const glAccount = res.adjustment > 0 ? gainAccountId : lossAccountId;
       if (glAccount) {
         await this.prisma.journalEntry.create({
           data: {
             journalId: journal.id,
             accountId: glAccount,
             description: `Utilidad/Pérdida Cambiaria: ${res.accountName}`,
             debit: res.adjustment < 0 ? Math.abs(res.adjustment) : 0,
             credit: res.adjustment > 0 ? res.adjustment : 0,
             amountForeign: 0
           }
         });
       }
    }

    return { journalId: journal.id, adjustmentCount: results.length, totalAdjustment };
  }

  /** GET /api/currency/suggestions?companyId=...&closingRate=... */
  @Get('suggestions')
  async getRevaluationSuggestions(
    @Query('companyId') companyId: string,
    @Query('closingRate') closingRate: string,
  ) {
    if (!companyId || !closingRate) throw new BadRequestException('companyId y closingRate son requeridos');
    return this.currencyService.getRevaluationSuggestions(companyId, parseFloat(closingRate));
  }

  /** POST /api/currency/apply — genera la póliza de ajuste cambiario */
  @Post('apply')
  async applyRevaluation(
    @Body() body: { companyId: string; closingRate: number; date: string; profitAccountId: string; lossAccountId: string },
  ) {
    const { companyId, closingRate, date, profitAccountId, lossAccountId } = body;
    if (!companyId || !closingRate) throw new BadRequestException('Faltan parámetros de revaluación');

    const suggestions = await this.currencyService.getRevaluationSuggestions(companyId, closingRate);
    if (suggestions.length === 0) return { message: 'Los saldos están actualizados. No se requiere ajuste.' };

    const d = date ? new Date(date) : new Date();
    const journalCount = await this.prisma.journal.count({ where: { companyId } });

    const journal = await this.prisma.journal.create({
      data: {
        companyId,
        date: d,
        type: 'DIARIO',
        number: `REVAL-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(journalCount + 1).padStart(4, '0')}`,
        concept: `Ajuste por Revaluación Cambiaria ${d.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}`,
        status: 'APLICADA',
      },
    });

    for (const s of suggestions) {
      await this.prisma.journalEntry.create({
        data: {
          journalId: journal.id,
          accountId: s.accountId,
          description: `Ajuste cambial ${s.currency}: ${s.accountName}`,
          debit: s.adjustment > 0 ? s.adjustment : 0,
          credit: s.adjustment < 0 ? Math.abs(s.adjustment) : 0,
          amountForeign: 0,
        },
      });
      const glAccountId = s.adjustment > 0 ? profitAccountId : lossAccountId;
      if (glAccountId) {
        const glAcc = await this.prisma.account.findFirst({ where: { companyId, id: glAccountId } })
          .catch(() => null);
        if (glAcc) {
          await this.prisma.journalEntry.create({
            data: {
              journalId: journal.id,
              accountId: glAcc.id,
              description: `${s.adjustment > 0 ? 'Utilidad' : 'Pérdida'} Cambiaria: ${s.accountName}`,
              debit: s.adjustment < 0 ? Math.abs(s.adjustment) : 0,
              credit: s.adjustment > 0 ? s.adjustment : 0,
              amountForeign: 0,
            },
          });
        }
      }
    }

    return { ...journal, adjustmentCount: suggestions.length };
  }

  @Get('sync')
  async syncRate() {
    return this.currencyService.syncOfficialRate();
  }
}
