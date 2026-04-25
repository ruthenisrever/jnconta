import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { create } from 'xmlbuilder2';
import * as JSZip from 'jszip';

@Injectable()
export class SatXmlService {
  private readonly logger = new Logger(SatXmlService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Genera el XML del Catálogo de Cuentas (CT)
   */
  async generateCatalogoXml(companyId: string, year: string, month: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const rfc = company?.rfc || 'XAXX010101000';
    const yr = year;
    const mo = month.padStart(2, '0');

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('catalogocuentas:Catalogo', {
        'xmlns:catalogocuentas': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas/CatalogoCuentas_1_3.xsd',
        'Version': '1.3',
        'RFC': rfc,
        'Mes': mo,
        'Anio': yr,
      });

    for (const acc of accounts) {
      root.ele('catalogocuentas:Ctas', {
        'CodAgrup': acc.satCode || '900.01',
        'NumCta': acc.code,
        'Desc': acc.name,
        'Nivel': acc.level.toString(),
        'Natur': acc.nature === 'DEUDORA' ? 'D' : 'A',
      });
    }

    return { 
      xml: root.end({ prettyPrint: true }), 
      filename: `${rfc}${yr}${mo}CT.xml`, 
      zipname: `${rfc}${yr}${mo}CT.zip` 
    };
  }

  /**
   * Genera el XML de la Balanza de Comprobación (BN)
   */
  async generateBalanzaXml(companyId: string, year: string, month: string, type: string = 'N') {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const accounts = await this.prisma.account.findMany({
      where: { companyId },
      include: { journalEntries: true },
      orderBy: { code: 'asc' },
    });

    const rfc = company?.rfc || 'XAXX010101000';
    const yr = year;
    const mo = month.padStart(2, '0');

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('BCE:Balanza', {
        'xmlns:BCE': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion/BalanzaComprobacion_1_3.xsd',
        'Version': '1.3',
        'RFC': rfc,
        'Mes': mo,
        'Anio': yr,
        'TipoEnvio': type,
      });

    const startDate = new Date(parseInt(yr), parseInt(mo) - 1, 1);
    const endDate = new Date(parseInt(yr), parseInt(mo), 0, 23, 59, 59);

    for (const acc of accounts) {
      // 1. Movimientos del periodo
      const currentEntries = acc.journalEntries.filter(e => {
        const d = new Date(e.createdAt);
        return d >= startDate && d <= endDate;
      });
      const totalDebit = currentEntries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = currentEntries.reduce((s, e) => s + e.credit, 0);

      // 2. Saldo Inicial
      const prevEntries = acc.journalEntries.filter(e => new Date(e.createdAt) < startDate);
      const prevDebit = prevEntries.reduce((s, e) => s + e.debit, 0);
      const prevCredit = prevEntries.reduce((s, e) => s + e.credit, 0);
      const saldoInicial = acc.nature === 'DEUDORA' ? prevDebit - prevCredit : prevCredit - prevDebit;

      if (totalDebit === 0 && totalCredit === 0 && saldoInicial === 0) continue;

      const saldoFinal = acc.nature === 'DEUDORA'
        ? saldoInicial + totalDebit - totalCredit
        : saldoInicial + totalCredit - totalDebit;

      root.ele('BCE:Ctas', {
        'NumCta': acc.code,
        'SaldoIni': saldoInicial.toFixed(2),
        'Debe': totalDebit.toFixed(2),
        'Haber': totalCredit.toFixed(2),
        'SaldoFin': saldoFinal.toFixed(2),
      });
    }

    return { 
      xml: root.end({ prettyPrint: true }), 
      filename: `${rfc}${yr}${mo}BN.xml`,
      zipname: `${rfc}${yr}${mo}BN.zip` 
    };
  }

  /**
   * Genera el XML de Pólizas del Periodo (PL)
   */
  async generatePolizasXml(companyId: string, year: string, month: string, typeSolicitud: string = 'AF', numOrden?: string, numTramite?: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const yr = year;
    const mo = month.padStart(2, '0');
    const rfc = company?.rfc || 'XAXX010101000';

    const startDate = new Date(parseInt(yr), parseInt(mo) - 1, 1);
    const endDate = new Date(parseInt(yr), parseInt(mo), 0, 23, 59, 59);

    const journals = await this.prisma.journal.findMany({
      where: { companyId, date: { gte: startDate, lte: endDate } },
      include: { 
        entries: { include: { account: true } }, 
        xmlDocuments: true,
        bankTransaction: true 
      },
      orderBy: { date: 'asc' },
    });

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('PLZ:Polizas', {
        'xmlns:PLZ': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo/PolizasPeriodo_1_3.xsd',
        'Version': '1.3',
        'RFC': rfc,
        'Mes': mo,
        'Anio': yr,
        'TipoSolicitud': typeSolicitud,
        'NumOrden': numOrden,
        'NumTramite': numTramite,
      });

    for (const j of journals) {
      const poliza = root.ele('PLZ:Poliza', {
        'NumUnIdenPol': j.number,
        'Fecha': j.date.toISOString().split('T')[0],
        'Concepto': j.concept,
      });

      for (const entry of j.entries) {
        const trans = poliza.ele('PLZ:Transaccion', {
          'NumCta': entry.account?.code || '',
          'DesCta': entry.account?.name || '',
          'Concepto': entry.description || j.concept,
          'Debe': entry.debit.toFixed(2),
          'Haber': entry.credit.toFixed(2),
        });

        // 1. ASOCIACIÓN DE COMPROBANTES NACIONALES (XMLs)
        for (const doc of j.xmlDocuments) {
          trans.ele('PLZ:CompNal', {
            'UUID_CFDI': doc.uuid || '',
            'RFC': doc.emisorRfc,
            'MontoTotal': doc.total.toFixed(2),
            'Moneda': doc.currency,
            'TipCamb': doc.exchangeRate.toFixed(2),
          });
        }

        // 2. MÉTODOS DE PAGO (Si hay transacción bancaria vinculada)
        if (j.bankTransaction) {
          const bt = j.bankTransaction;
          if (bt.amount < 0) { // Salida de dinero
             // Simplificación: Reportar como Transferencia si no es cheque
             trans.ele('PLZ:Transf', {
                'CtaOri': 'BANCO ORIGEN', // Debería venir de la configuración de la cuenta bankAccount
                'BancoOriExt': 'BANCO NACIONAL',
                'CtaDest': 'BANCO DESTINO',
                'BancoDestExt': 'BANCO BENEFICIARIO',
                'Fecha': bt.date.toISOString().split('T')[0],
                'Beneficitario': j.concept.substring(0, 300),
                'RFC': 'XAXX010101000',
                'Monto': Math.abs(bt.amount).toFixed(2),
             });
          }
        }
      }
    }

    return { 
      xml: root.end({ prettyPrint: true }), 
      filename: `${rfc}${yr}${mo}PL.xml`,
      zipname: `${rfc}${yr}${mo}PL.zip`
    };
  }

  /**
   * Genera un archivo ZIP que contiene un XML
   */
  async createZip(filename: string, content: string) {
    const zip = new JSZip();
    zip.file(filename, content);
    return zip.generateAsync({ type: 'nodebuffer' });
  }
}
