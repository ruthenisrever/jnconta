import { 
  Controller, Get, Post, Body, Param, Query, BadRequestException 
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as xml2js from 'xml2js';
import { TaxEngineService } from './tax-engine.service';

@Controller('automation')
export class AutomationController {
  constructor(
    private prisma: PrismaService,
    private taxEngine: TaxEngineService
  ) {}

  @Get('templates')
  async getTemplates(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required');
    return this.prisma.journalTemplate.findMany({ 
      where: { companyId },
      include: { entries: true },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Propone una póliza para uno o varios XMLs.
   */
  @Post('propose-batch')
  async proposeBatch(@Body() body: { companyId: string, xmlIds: string[], templateId?: string }) {
    const { companyId, xmlIds, templateId } = body;
    const results = [];

    for (const xmlId of xmlIds) {
      try {
        const proposal = await this.proposeJournal(xmlId, companyId, templateId);
        results.push(proposal);
      } catch (e) {
        results.push({ xmlId, error: e.message });
      }
    }

    return results;
  }

  @Get('propose/:xmlId')
  async proposeJournal(
    @Param('xmlId') xmlId: string, 
    @Query('companyId') companyId: string,
    @Query('templateId') templateId?: string
  ) {
    const doc = await this.prisma.xmlDocument.findUnique({ 
      where: { id: xmlId },
      include: { company: true }
    });

    if (!doc) throw new BadRequestException('XML no encontrado');
    if (doc.journalId) throw new BadRequestException('El XML ya tiene póliza');

    const isRecibida = doc.type === 'RECIBIDA' || doc.receptorRfc === doc.company.rfc;
    const rfcInteres = isRecibida ? doc.emisorRfc : doc.receptorRfc;
    const nameInteres = isRecibida ? doc.emisorName : doc.receptorName;

    let proposals = [];

    // LÓGICA DE RETENCIONES (Automática)
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const xmlObj = await parser.parseStringPromise(doc.rawXml);
    const cfdi = xmlObj['cfdi:Comprobante'];
    const impuestos = cfdi['cfdi:Impuestos'];
    
    let retIva = 0;
    let retIsr = 0;

    if (impuestos && impuestos['cfdi:Retenciones']) {
      const rets = Array.isArray(impuestos['cfdi:Retenciones']['cfdi:Retencion']) 
        ? impuestos['cfdi:Retenciones']['cfdi:Retencion'] 
        : [impuestos['cfdi:Retenciones']['cfdi:Retencion']];
      
      for (const r of rets) {
        const attr = r['$'] || r;
        const imp = attr.Impuesto;
        const amt = parseFloat(attr.Importe || 0);
        if (imp === '002' || imp === 'IVA') retIva += amt;
        if (imp === '001' || imp === 'ISR') retIsr += amt;
      }
    }

    // 1. BUSCAR REGLA GUARDADA (Base de Datos)
    const rule = await this.prisma.accountingRule.findFirst({
      where: { rfc: rfcInteres, companyId, type: isRecibida ? 'PROVEEDOR' : 'CLIENTE' },
      include: { account: true }
    });

    // 2. BUSCAR CUENTAS ESTÁNDAR (IVA, Prov/Clie)
    const [accProvClie, accIVA, accRetIva, accRetIsr] = await Promise.all([
      this.prisma.account.findFirst({ where: { companyId, code: isRecibida ? '2.1.01' : '1.1.03' } }),
      this.prisma.account.findFirst({ where: { companyId, code: isRecibida ? '1.1.04' : '2.1.02' } }),
      this.prisma.account.findFirst({ where: { companyId, code: '2.1.03' } }), // Ejemplo Ret IVA
      this.prisma.account.findFirst({ where: { companyId, code: '2.1.04' } })  // Ejemplo Ret ISR
    ]);

    // 3. CONSTRUIR PROPUESTA
    if (isRecibida) {
      // CARGO: Gasto / Compra (basado en regla o genérico)
      proposals.push({
        accountId: rule?.accountId || '',
        accountName: rule?.account.name || 'GASTO (POR DEFINIR)',
        accountCode: rule?.account.code || '',
        description: `Gasto: ${nameInteres}`,
        debit: doc.subtotal,
        credit: 0
      });

      // CARGO: IVA
      if (doc.tax > 0) {
        proposals.push({
          accountId: accIVA?.id || '',
          accountName: accIVA?.name || 'IVA ACREDITABLE Pendiente',
          accountCode: accIVA?.code || '',
          description: 'IVA de operación',
          debit: doc.tax,
          credit: 0
        });
      }

      // ABONO: Retenciones
      if (retIva > 0) {
        proposals.push({ accountId: accRetIva?.id || '', accountName: accRetIva?.name || 'Retención IVA', accountCode: accRetIva?.code || '', description: 'Retención IVA', debit: 0, credit: retIva });
      }
      if (retIsr > 0) {
        proposals.push({ accountId: accRetIsr?.id || '', accountName: accRetIsr?.name || 'Retención ISR', accountCode: accRetIsr?.code || '', description: 'Retención ISR', debit: 0, credit: retIsr });
      }

      // ABONO: Proveedor (Total neto)
      proposals.push({
        accountId: accProvClie?.id || '',
        accountName: accProvClie?.name || 'PROVEEDORES',
        accountCode: accProvClie?.code || '',
        description: `Provisión: ${nameInteres}`,
        debit: 0,
        credit: doc.total
      });

    } else {
      // CARGO: Cliente (Total)
      proposals.push({
        accountId: accProvClie?.id || '',
        accountName: accProvClie?.name || 'CLIENTES',
        accountCode: accProvClie?.code || '',
        description: `Venta a: ${nameInteres}`,
        debit: doc.total,
        credit: 0
      });

      // ABONO: Ingresos (basado en regla o genérico)
      proposals.push({
        accountId: rule?.accountId || '',
        accountName: rule?.account.name || 'INGRESOS (POR DEFINIR)',
        accountCode: rule?.account.code || '',
        description: `Ingreso por venta: ${nameInteres}`,
        debit: 0,
        credit: doc.subtotal
      });

      // ABONO: IVA
      if (doc.tax > 0) {
        proposals.push({
          accountId: accIVA?.id || '',
          accountName: accIVA?.name || 'IVA TRASLADADO Pendiente',
          accountCode: accIVA?.code || '',
          description: 'IVA Trasladado',
          debit: 0,
          credit: doc.tax
        });
      }
    }

    return {
      xml: { id: doc.id, uuid: doc.uuid, total: doc.total, rfc: rfcInteres, nombre: nameInteres, fecha: doc.date },
      ruleFound: !!rule,
      proposals
    };
  }

  @Post('apply-batch')
  async applyBatch(@Body() body: { companyId: string, items: any[] }) {
    const { companyId, items } = body;
    const results = [];

    for (const item of items) {
      const { xmlId, journalData } = item;
      
      // Validar descuadre
      const sumDebit = journalData.entries.reduce((s, e) => s + (e.debit || 0), 0);
      const sumCredit = journalData.entries.reduce((s, e) => s + (e.credit || 0), 0);
      if (Math.abs(sumDebit - sumCredit) > 0.01) {
        throw new BadRequestException(`Póliza descuadrada en XML ${xmlId}`);
      }

      const type = journalData.type || 'DIARIO';
      const lastJournal = await this.prisma.journal.findFirst({
        where: { companyId, type },
        orderBy: { number: 'desc' }
      });
      const nextNum = (parseInt(lastJournal?.number || '0') + 1).toString().padStart(4, '0');

      const journal = await this.prisma.journal.create({
        data: {
          number: nextNum,
          type,
          date: new Date(journalData.date),
          concept: journalData.concept,
          reference: journalData.reference,
          status: 'APLICADA',
          companyId,
          entries: {
            create: journalData.entries.map(e => ({
              accountId: e.accountId,
              description: e.description,
              debit: e.debit,
              credit: e.credit
            }))
          }
        }
      });

      await this.prisma.xmlDocument.update({
        where: { id: xmlId },
        data: { status: 'IMPORTADA', journalId: journal.id }
      });

      // REGISTRAR CONTROL DE IVA
      await this.taxEngine.processXmlTaxes(
        xmlId, 
        companyId, 
        new Date(journalData.date), 
        journalData.type === 'INGRESO' ? 'TRASLADADO' : 'ACREDITABLE',
        undefined, 
        journal.id
      );

      results.push(journal);
    }

    return results;
  }

  @Get('rules')
  async getRules(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required');
    return this.prisma.accountingRule.findMany({
      where: { companyId },
      include: { account: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Post('rules')
  async saveRule(@Body() body: { companyId: string, rfc: string, name: string, type: 'PROVEEDOR'|'CLIENTE', accountId: string }) {
    const { companyId, rfc, name, type, accountId } = body;
    if (!companyId || !rfc || !accountId) throw new BadRequestException('Faltan parámetros obligatorios');

    return this.prisma.accountingRule.upsert({
      where: { rfc_companyId_type: { rfc, companyId, type } },
      update: { accountId, name },
      create: { rfc, companyId, type, accountId, name }
    });
  }
}
