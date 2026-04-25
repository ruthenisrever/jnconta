import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as xml2js from 'xml2js';

@Injectable()
export class TaxEngineService {
  private readonly logger = new Logger(TaxEngineService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Procesa un XML para extraer el desglose de impuestos y crear un registro en TaxControl.
   */
  async processXmlTaxes(xmlId: string, companyId: string, date: Date, type: 'ACREDITABLE' | 'TRASLADADO', bankTransactionId?: string, journalId?: string) {
    const doc = await this.prisma.xmlDocument.findUnique({ where: { id: xmlId } });
    if (!doc) return null;

    try {
      const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
      const result = await parser.parseStringPromise(doc.rawXml);
      
      const cfdi = result['cfdi:Comprobante'];
      const impuestos = cfdi['cfdi:Impuestos'];
      
      let iva16 = 0;
      let iva8 = 0;
      let base16 = 0;
      let base8 = 0;
      let base0 = 0;
      let baseExempt = 0;
      let retIva = 0;
      let retIsr = 0;

      // Procesar Traslados (IVA 16, 8, 0...)
      if (impuestos && impuestos['cfdi:Traslados']) {
        const traslados = Array.isArray(impuestos['cfdi:Traslados']['cfdi:Traslado']) 
          ? impuestos['cfdi:Traslados']['cfdi:Traslado'] 
          : [impuestos['cfdi:Traslados']['cfdi:Traslado']];

        for (const t of traslados) {
          const attrs = t['$'] || t;
          const tasa = parseFloat(attrs.TasaOCuota);
          const importe = parseFloat(attrs.Importe || 0);
          const base = parseFloat(attrs.Base || 0);

          if (tasa >= 0.16) { iva16 += importe; base16 += base; }
          else if (tasa > 0 && tasa <= 0.08) { iva8 += importe; base8 += base; }
          else if (tasa === 0) { base0 += base; }
          // Nota: Si no hay base en el nodo Impuestos, el motor puede inferirla del subtotal (simplificación)
        }
      }

      // Procesar Retenciones
      if (impuestos && impuestos['cfdi:Retenciones']) {
        const retenciones = Array.isArray(impuestos['cfdi:Retenciones']['cfdi:Retencion']) 
          ? impuestos['cfdi:Retenciones']['cfdi:Retencion'] 
          : [impuestos['cfdi:Retenciones']['cfdi:Retencion']];

        for (const r of retenciones) {
          const attrs = r['$'] || r;
          const impuesto = attrs.Impuesto; // 002: IVA, 001: ISR
          const importe = parseFloat(attrs.Importe || 0);

          if (impuesto === '002' || impuesto === 'IVA') retIva += importe;
          if (impuesto === '001' || impuesto === 'ISR') retIsr += importe;
        }
      }

      // Crear el registro de Control de Impuestos (Causación/Acreditamiento)
      return this.prisma.taxControl.upsert({
        where: { journalId: journalId || '' },
        update: {
          base16, base8, base0, baseExempt,
          iva16, iva8, retIva, retIsr,
          date, type,
          bankTransactionId
        },
        create: {
          companyId,
          journalId,
          bankTransactionId,
          type,
          date,
          base16, base8, base0, baseExempt,
          iva16, iva8, retIva, retIsr,
          rfc: type === 'ACREDITABLE' ? doc.emisorRfc : doc.receptorRfc,
          supplierId: type === 'ACREDITABLE' ? (await this.prisma.supplier.findFirst({ where: { rfc: doc.emisorRfc, companyId } }))?.id : null
        }
      });

    } catch (e) {
      this.logger.error(`Error procesando impuestos del XML ${xmlId}: ${e.message}`);
      return null;
    }
  }
}
