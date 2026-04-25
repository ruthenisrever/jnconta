import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('tax')
export class TaxController {
  constructor(private prisma: PrismaService) {}

  @Get('determination')
  async getTaxDetermination(@Query('companyId') companyId: string, @Query('year') year: string, @Query('month') month: string) {
    if (!companyId || !year || !month) throw new BadRequestException('Faltan parámetros: companyId, year, month');

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    // Period dates
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    // To determine "IVA efectivamente cobrado" (Ventas) we look at Invoices with PUE / Pagada
    // Alternatively, using the XmlDocument directly since it tracks exactly the fiscal invoice.
    
    // 1. IVA Trasladado (Ventas / EMITIDAS)
    const xmlEmitidas = await this.prisma.xmlDocument.findMany({
      where: {
        companyId,
        type: 'EMITIDA',
        date: { gte: startDate, lte: endDate },
        status: { not: 'RECHAZADA' }
      }
    });

    let ivaTrasladado = 0;
    let baseGravadaPUE = 0;
    let isrIngresosAcumulables = 0;

    for (const xml of xmlEmitidas) {
        // En un escenario real, consideraríamos PPD vs PUE. Aquí simplificaremos para MVP
        // asumiendo que los PUE o facturas del mes se cobran en el mes.
        ivaTrasladado += xml.tax;
        baseGravadaPUE += xml.subtotal;
        isrIngresosAcumulables += xml.subtotal; 
    }

    // 2. IVA Acreditable (Compras / RECIBIDAS)
    const xmlRecibidas = await this.prisma.xmlDocument.findMany({
      where: {
        companyId,
        type: 'RECIBIDA',
        date: { gte: startDate, lte: endDate },
        status: { not: 'RECHAZADA' }
      }
    });

    let ivaAcreditable = 0;
    let baseDeducible = 0;

    for (const xml of xmlRecibidas) {
        ivaAcreditable += xml.tax;
        baseDeducible += xml.subtotal;
    }

    const ivaCargo = ivaTrasladado - ivaAcreditable;
    const isrCoeficiente = 0.0820; // 8.2% estimación genérica o de ley
    const isrProvisional = isrIngresosAcumulables * isrCoeficiente;

    // Retenciones (Ejemplo simplificado)
    const ivaRetenido = 0;
    const isrRetenido = 0;

    const totalIvaPagar = Math.max(0, ivaCargo - ivaRetenido);
    const saldoFavorIva = Math.abs(Math.min(0, ivaCargo - ivaRetenido));

    return {
      period: `${year}-${month.padStart(2, '0')}`,
      iva: {
        trasladadoCobrado: parseFloat(ivaTrasladado.toFixed(2)),
        acreditablePagado: parseFloat(ivaAcreditable.toFixed(2)),
        retenido: parseFloat(ivaRetenido.toFixed(2)),
        cargo: parseFloat(ivaCargo.toFixed(2)),
        aPagar: parseFloat(totalIvaPagar.toFixed(2)),
        saldoFavor: parseFloat(saldoFavorIva.toFixed(2))
      },
      isr: {
        ingresosNominales: parseFloat(isrIngresosAcumulables.toFixed(2)),
        coeficienteUtilidad: isrCoeficiente,
        utilidadFiscalEstimada: parseFloat((isrIngresosAcumulables * isrCoeficiente).toFixed(2)),
        ingresosDeducibles: parseFloat(baseDeducible.toFixed(2)), // Informativo
        retenido: parseFloat(isrRetenido.toFixed(2)),
        pagoProvisional: parseFloat((isrProvisional - isrRetenido).toFixed(2))
      }
    };
  }
}
