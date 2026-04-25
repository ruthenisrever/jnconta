import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class FiscalService {
  private readonly logger = new Logger(FiscalService.name);

  constructor(private prisma: PrismaService) {}

  async getMonthlyTaxWorksheet(companyId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const taxRecords = await this.prisma.taxControl.findMany({
      where: {
        companyId,
        date: { gte: startDate, lte: endDate }
      }
    });

    const summary = {
      trasladado: {
        base16: 0, iva16: 0,
        base8: 0, iva8: 0,
        base0: 0, baseExempt: 0,
        totalBase: 0, totalIva: 0
      },
      acreditable: {
        base16: 0, iva16: 0,
        base8: 0, iva8: 0,
        base0: 0, baseExempt: 0,
        totalBase: 0, totalIva: 0
      },
      retentions: {
        iva: 0, isr: 0
      }
    };

    taxRecords.forEach(rec => {
      const target = rec.type === 'TRASLADADO' ? summary.trasladado : summary.acreditable;
      
      target.base16 += rec.base16;
      target.iva16 += rec.iva16;
      target.base8 += rec.base8;
      target.iva8 += rec.iva8;
      target.base0 += rec.base0;
      target.baseExempt += rec.baseExempt;
      
      summary.retentions.iva += rec.retIva;
      summary.retentions.isr += rec.retIsr;
    });

    // Calculate totals
    summary.trasladado.totalBase = summary.trasladado.base16 + summary.trasladado.base8 + summary.trasladado.base0 + summary.trasladado.baseExempt;
    summary.trasladado.totalIva = summary.trasladado.iva16 + summary.trasladado.iva8;

    summary.acreditable.totalBase = summary.acreditable.base16 + summary.acreditable.base8 + summary.acreditable.base0 + summary.acreditable.baseExempt;
    summary.acreditable.totalIva = summary.acreditable.iva16 + summary.acreditable.iva8;

    const ivaNeto = summary.trasladado.totalIva - summary.acreditable.totalIva - summary.retentions.iva;

    return {
      period: { month, year, startDate, endDate },
      summary,
      ivaNeto: Math.max(0, ivaNeto),
      ivaAFavor: Math.max(0, -ivaNeto)
    };
  }
}
