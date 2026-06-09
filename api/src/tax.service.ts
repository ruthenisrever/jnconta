import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateISR(baseGravable: number, periodicity: string = 'MENSUAL', year: number = 2024): Promise<number> {
    if (baseGravable <= 0) return 0;

    // Find the correct ISR range
    const isrRow = await this.prisma.isrTable.findFirst({
      where: {
        periodicity,
        year,
        lowerLimit: { lte: baseGravable },
        upperLimit: { gte: baseGravable }
      }
    });

    if (!isrRow) {
      console.warn('No ISR row found for base', baseGravable);
      return 0; // Fallback
    }

    // Calculo ISR = CuotaFija + ((Base - LimiteInferior) * Porcentaje)
    const excedente = baseGravable - isrRow.lowerLimit;
    const impuestoMarginal = excedente * isrRow.percentage;
    let isrCausado = isrRow.fixedFee + impuestoMarginal;

    // Subsidio
    const subsidioRow = await this.prisma.subsidioTable.findFirst({
      where: {
        periodicity,
        year,
        lowerLimit: { lte: baseGravable },
        upperLimit: { gte: baseGravable }
      }
    });

    if (subsidioRow) {
      isrCausado -= subsidioRow.amount;
    }

    return isrCausado > 0 ? parseFloat(isrCausado.toFixed(2)) : 0;
  }

  // UMA 2024 = 108.57
  calculateIMSS(sdi: number, days: number = 15, uma: number = 108.57): number {
    if (sdi <= 0) return 0;
    
    // Tope 25 UMAs
    const topSdi = Math.min(sdi, uma * 25);
    
    // Cuota obrera simplificada (Aprox 2.375% de las cuotas retenidas al trabajador normal, 
    // + excedente de enf y mat (0.40% sobre (SDI - 3 UMA)))
    let cuota = 0;
    
    // Especies Gastos Medicos (0.375%) + Invalidez y Vida (0.625%) + Cesantia (1.125%) = 2.125%
    cuota += topSdi * days * 0.02125;
    
    // Excedente 3 UMAs (0.40%)
    if (topSdi > (uma * 3)) {
      cuota += (topSdi - (uma * 3)) * days * 0.0040;
    }

    return parseFloat(cuota.toFixed(2));
  }
}
