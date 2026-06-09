import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './prisma.service';
import { create } from 'xmlbuilder2';
import * as JSZip from 'jszip';

@Controller('electronic-accounting')
export class ElectronicAccountingController {
  constructor(private prisma: PrismaService) {}

  @Get('catalog')
  async getCatalog(@Query('companyId') companyId: string, @Query('month') month: string, @Query('year') year: string, @Res() res: Response) {
    if (!month || !year) { month = month || String(new Date().getMonth() + 1); year = year || String(new Date().getFullYear()); }
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).send('Company not found');

    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('catalogocuentas:Catalogo', {
        'xmlns:catalogocuentas': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/CatalogoCuentas/CatalogoCuentas_1_3.xsd',
        Version: '1.3',
        RFC: company.rfc,
        Mes: month.padStart(2, '0'),
        Anio: year,
      });

    accounts.forEach(acc => {
      xml.ele('catalogocuentas:Ctas', {
        CodAgrupt: acc.satCode || '000.00',
        NumCta: acc.code,
        Desc: acc.name,
        SubCtaDe: acc.parentId ? accounts.find(a => a.id === acc.parentId)?.code : undefined,
        Nivel: acc.level,
        Natur: acc.nature.substring(0, 1), // D or A
      });
    });

    const xmlString = xml.end({ prettyPrint: true });
    const filename = `${company.rfc}${year}${month.padStart(2, '0')}CT.xml`;
    const zip = new JSZip();
    zip.file(filename, xmlString);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.set('Content-Type', 'application/zip');
    res.attachment(filename.replace('.xml', '.zip'));
    return res.send(zipBuffer);
  }

  @Get('balance')
  async getBalance(@Query('companyId') companyId: string, @Query('month') month: string, @Query('year') year: string, @Res() res: Response) {
    if (!month || !year) { month = month || String(new Date().getMonth() + 1); year = year || String(new Date().getFullYear()); }
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).send('Company not found');

    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true },
      include: { 
        journalEntries: {
          include: { journal: true }
        }
      },
      orderBy: { code: 'asc' },
    });

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Balanza:Balanza', {
        'xmlns:Balanza': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/BalanzaComprobacion/BalanzaComprobacion_1_3.xsd',
        Version: '1.3',
        RFC: company.rfc,
        Mes: month.padStart(2, '0'),
        Anio: year,
        TipoEnvio: 'N',
      });

    accounts.forEach(acc => {
      // 1. Calculate Initial Balance (all entries before startDate)
      const historicalEntries = acc.journalEntries.filter(e => e.journal.date < startDate);
      const histDebit = historicalEntries.reduce((s, e) => s + e.debit, 0);
      const histCredit = historicalEntries.reduce((s, e) => s + e.credit, 0);
      const initialBalance = acc.nature === 'DEUDORA' ? histDebit - histCredit : histCredit - histDebit;

      // 2. Calculate Current Month Movements
      const monthEntries = acc.journalEntries.filter(e => e.journal.date >= startDate && e.journal.date <= endDate);
      const monthDebit = monthEntries.reduce((s, e) => s + e.debit, 0);
      const monthCredit = monthEntries.reduce((s, e) => s + e.credit, 0);

      // 3. Final Balance
      const finalBalance = initialBalance + (acc.nature === 'DEUDORA' ? monthDebit - monthCredit : monthCredit - monthDebit);

      if (initialBalance !== 0 || monthDebit !== 0 || monthCredit !== 0) {
        xml.ele('Balanza:Ctas', {
          NumCta: acc.code,
          SaldoIni: initialBalance.toFixed(2),
          Debe: monthDebit.toFixed(2),
          Haber: monthCredit.toFixed(2),
          SaldoFin: finalBalance.toFixed(2),
        });
      }
    });

    const xmlString = xml.end({ prettyPrint: true });
    const filename = `${company.rfc}${year}${month.padStart(2, '0')}BN.xml`;
    const zip = new JSZip();
    zip.file(filename, xmlString);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.set('Content-Type', 'application/zip');
    res.attachment(filename.replace('.xml', '.zip'));
    return res.send(zipBuffer);
  }

  @Get('polizas')
  async getPolizas(@Query('companyId') companyId: string, @Query('month') month: string, @Query('year') year: string, @Res() res: Response) {
    if (!month || !year) { month = month || String(new Date().getMonth() + 1); year = year || String(new Date().getFullYear()); }
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).send('Company not found');

    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const journals = await this.prisma.journal.findMany({
      where: { companyId, date: { gte: startDate, lte: endDate } },
      include: { entries: { include: { account: true } } },
    });

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('PLZ:Polizas', {
        'xmlns:PLZ': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/PolizasPeriodo/PolizasPeriodo_1_3.xsd',
        Version: '1.3',
        RFC: company.rfc,
        Mes: month.padStart(2, '0'),
        Anio: year,
        TipoSolicitud: 'AF',
      });

    journals.forEach(j => {
      const poliza = xml.ele('PLZ:Poliza', {
        NumUnIdenPol: j.id.substring(0, 50),
        Fecha: j.date.toISOString().split('T')[0],
        Concepto: j.concept.substring(0, 300),
      });

      j.entries.forEach(e => {
        poliza.ele('PLZ:Transaccion', {
          NumCta: e.account.code,
          DesCta: e.account.name.substring(0, 100),
          Concepto: e.description.substring(0, 300),
          Debe: e.debit.toFixed(2),
          Haber: e.credit.toFixed(2),
        });
      });
    });

    const xmlString = xml.end({ prettyPrint: true });
    const filename = `${company.rfc}${year}${month.padStart(2, '0')}PL.xml`;
    const zip = new JSZip();
    zip.file(filename, xmlString);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.set('Content-Type', 'application/zip');
    res.attachment(filename.replace('.xml', '.zip'));
    return res.send(zipBuffer);
  }

  @Get('auxiliar-cuentas')
  async getAuxiliarCuentas(@Query('companyId') companyId: string, @Query('month') month: string, @Query('year') year: string, @Res() res: Response) {
    if (!month || !year) { month = month || String(new Date().getMonth() + 1); year = year || String(new Date().getFullYear()); }
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return res.status(404).send('Company not found');

    const m = parseInt(month);
    const y = parseInt(year);
    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true },
      include: { journalEntries: { where: { journal: { date: { gte: startDate, lte: endDate } } }, include: { journal: true } } },
    });

    const xml = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('AuxiliarCtas:AuxiliarCtas', {
        'xmlns:AuxiliarCtas': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/AuxiliarCtas',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/AuxiliarCtas http://www.sat.gob.mx/esquemas/ContabilidadE/1_3/AuxiliarCtas/AuxiliarCtas_1_3.xsd',
        Version: '1.3',
        RFC: company.rfc,
        Mes: month.padStart(2, '0'),
        Anio: year,
        TipoSolicitud: 'AF',
      });

    accounts.filter(a => a.journalEntries.length > 0).forEach(a => {
      const cta = xml.ele('AuxiliarCtas:Cuenta', {
        NumCta: a.code,
        DesCta: a.name.substring(0, 100),
        SaldoIni: '0.00',
        SaldoFin: '0.00',
      });
      a.journalEntries.forEach(e => {
        cta.ele('AuxiliarCtas:DetalleAux', {
          Fecha: e.journal.date.toISOString().split('T')[0],
          NumUnIdenPol: e.journal.id.substring(0, 50),
          Concepto: e.description.substring(0, 300),
          Debe: e.debit.toFixed(2),
          Haber: e.credit.toFixed(2),
        });
      });
    });

    const xmlString = xml.end({ prettyPrint: true });
    const filename = `${company.rfc}${year}${month.padStart(2, '0')}XC.xml`;
    const zip = new JSZip();
    zip.file(filename, xmlString);
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.set('Content-Type', 'application/zip');
    res.attachment(filename.replace('.xml', '.zip'));
    return res.send(zipBuffer);
  }

}