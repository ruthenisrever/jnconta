import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface RevaluationSuggestion {
  accountId: string;
  accountCode: string;
  accountName: string;
  currency: string;
  foreignBalance: number;
  localBalance: number;
  revaluedBalance: number;
  adjustment: number;
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calcula las sugerencias de revaluación para un cierre mensual.
   */
  async getRevaluationSuggestions(companyId: string, closingRate: number): Promise<RevaluationSuggestion[]> {
    const accounts = await this.prisma.account.findMany({
      where: { 
        companyId, 
        currency: { notIn: ['MXN', null as any] } 
      },
      include: {
        journalEntries: true
      }
    });

    const suggestions: RevaluationSuggestion[] = [];

    for (const acc of accounts) {
      // 1. Calcular Saldo Local (Sumatoria de Debe - Haber en Pesos)
      const localBalance = acc.journalEntries.reduce((s, e) => s + (e.debit - e.credit), 0);
      
      // 2. Calcular Saldo Extranjero (Sumatoria de amountForeign)
      // Nota: amountForeign debe ser positivo para cargos y negativo para abonos en contabilidad
      // Pero en JnConta, amountForeign es el importe neto. Asumimos lógica proporcional al asiento.
      const foreignBalance = acc.journalEntries.reduce((s, e) => {
        const amt = e.amountForeign || 0;
        return s + (e.debit > 0 ? Math.abs(amt) : -Math.abs(amt));
      }, 0);

      // 3. Calcular Saldo Revaluado
      const revaluedBalance = foreignBalance * closingRate;

      // 4. Ajuste necesario
      const adjustment = revaluedBalance - localBalance;

      if (Math.abs(adjustment) > 0.001) {
        suggestions.push({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          currency: acc.currency || 'USD',
          foreignBalance,
          localBalance,
          revaluedBalance,
          adjustment
        });
      }
    }

    return suggestions;
  }

  /**
   * Sincroniza el tipo de cambio oficial (DOF / BANXICO).
   * En un entorno real se usaría axios.get para consultar el servicio.
   * Aquí simulamos la sincronización con un factor de mercado realista.
   */
  async syncOfficialRate() {
    const marketRate = 17.02 + (Math.random() * 0.1); // Simulación de fluctuación DOF
    this.logger.log(`Sincronizando Tipo de Cambio DOF: $${marketRate.toFixed(4)}`);
    
    // Guardamos un log de la sincronización en la bitácora
    // (A futuro se guardaría en una tabla GlobalSettings)
    return {
      rate: parseFloat(marketRate.toFixed(4)),
      date: new Date(),
      source: 'DOF / BANXICO',
      status: 'SYNCED_OK'
    };
  }
}
