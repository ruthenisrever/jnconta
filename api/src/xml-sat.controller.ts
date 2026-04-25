import {
  Controller, Post, Get, Param, Query, Body,
  UploadedFile, UploadedFiles, UseInterceptors, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PrismaService } from './prisma.service';
import { SatService } from './sat.service';
import * as xml2js from 'xml2js';
import * as https from 'https';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getAttr(node: any, attr: string): string {
  return node?.$?.[attr] || node?.['_']?.[attr] || '';
}

async function parseXml(xmlStr: string): Promise<any> {
  return new Promise((resolve, reject) => {
    xml2js.parseString(xmlStr, { explicitArray: false, tagNameProcessors: [xml2js.processors.stripPrefix] }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

function extractCfdiData(parsed: any, filename: string) {
  const comprobante = parsed?.Comprobante || parsed?.comprobante;
  if (!comprobante) throw new BadRequestException('XML no es un CFDI válido');

  const attrs = comprobante.$ || {};
  const emisor = comprobante.Emisor || comprobante.emisor || {};
  const receptor = comprobante.Receptor || comprobante.receptor || {};
  const timbre = comprobante?.Complemento?.TimbreFiscalDigital || comprobante?.complemento?.timbreFiscalDigital || {};
  const conceptos = comprobante.Conceptos?.Concepto || comprobante.conceptos?.concepto || [];

  const subtotal = parseFloat(attrs.SubTotal || attrs.subTotal || '0');
  const descuento = parseFloat(attrs.Descuento || attrs.descuento || '0');
  const total = parseFloat(attrs.Total || attrs.total || '0');
  const tax = total - subtotal + descuento;

  const emisorAttrs = emisor.$ || {};
  const receptorAttrs = receptor.$ || {};
  const timbreAttrs = timbre.$ || {};

  return {
    filename,
    uuid: timbreAttrs.UUID || timbreAttrs.uuid || null,
    type: 'RECIBIDA', // default; can flip based on RFC match
    emisorRfc: emisorAttrs.Rfc || emisorAttrs.rfc || '',
    emisorName: emisorAttrs.Nombre || emisorAttrs.nombre || '',
    receptorRfc: receptorAttrs.Rfc || receptorAttrs.rfc || '',
    receptorName: receptorAttrs.Nombre || receptorAttrs.nombre || '',
    serie: attrs.Serie || attrs.serie || null,
    folio: attrs.Folio || attrs.folio || null,
    subtotal,
    tax,
    discount: descuento,
    total,
    currency: attrs.Moneda || attrs.moneda || 'MXN',
    exchangeRate: parseFloat(attrs.TipoCambio || attrs.tipoCambio || '1'),
    date: new Date(attrs.Fecha || attrs.fecha || new Date().toISOString()),
    paymentMethod: attrs.MetodoPago || attrs.metodoPago || null,
    paymentForm: attrs.FormaPago || attrs.formaPago || null,
    cfdiUse: receptorAttrs.UsoCFDI || receptorAttrs.usoCFDI || null,
    rawXml: '',
    status: 'PENDIENTE',
  };
}

// ─── Validate UUID via SAT Webservice ──────────────────────────────────────────

async function validateUuidSat(
  uuid: string,
  emisorRfc: string,
  receptorRfc: string,
  total: string,
): Promise<string> {
  return new Promise((resolve) => {
    const url = `https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc`;
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <Consulta xmlns="http://tempuri.org/">
      <expresionImpresa><![CDATA[?re=${emisorRfc}&rr=${receptorRfc}&tt=${total}&id=${uuid}]]></expresionImpresa>
    </Consulta>
  </s:Body>
</s:Envelope>`;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://tempuri.org/IConsultaCFDIService/Consulta',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    try {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (data.includes('Vigente')) resolve('Vigente');
          else if (data.includes('Cancelado')) resolve('Cancelado');
          else resolve('No Encontrado');
        });
      });
      req.on('error', () => resolve('Error de conexión SAT'));
      req.setTimeout(8000, () => { req.destroy(); resolve('Timeout SAT'); });
      req.write(body);
      req.end();
    } catch {
      resolve('Error de conexión SAT');
    }
  });
}

// ─── Controller ────────────────────────────────────────────────────────────────

@Controller('xml-sat')
export class XmlSatController {
  constructor(
    private prisma: PrismaService,
    private satService: SatService
  ) {}

  @Get()
  findAll(@Query('companyId') companyId: string, @Query('type') type?: string) {
    return this.prisma.xmlDocument.findMany({
      where: { companyId, ...(type ? { type } : {}) },
      include: { journal: true },
      orderBy: { date: 'desc' },
    });
  }


  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadXml(
    @UploadedFile() file: Express.Multer.File,
    @Body('companyId') companyId: string,
  ) {
    if (!file) throw new BadRequestException('Archivo XML requerido');

    const xmlStr = file.buffer.toString('utf-8');
    let parsed: any;
    try {
      parsed = await parseXml(xmlStr);
    } catch {
      throw new BadRequestException('El archivo no es un XML válido');
    }

    const data = extractCfdiData(parsed, file.originalname);

    // Determine if EMITIDA or RECIBIDA (company RFC match)
    const company = companyId
      ? await this.prisma.company.findUnique({ where: { id: companyId } })
      : null;

    if (company && data.emisorRfc === company.rfc) {
      data.type = 'EMITIDA';
    }

    // Detección proactiva de EFOS
    const risk = await this.satService.checkRfc(data.emisorRfc);
    const status = risk ? 'RECHAZADA' : 'PENDIENTE';

    return this.prisma.xmlDocument.create({
      data: {
        ...data,
        rawXml: xmlStr,
        status,
        companyId: companyId || '',
      },
    });
  }

  @Post('upload-batch')
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('companyId') companyId: string,
  ) {
    if (!files?.length) throw new BadRequestException('Al menos un archivo requerido');

    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const xmlStr = file.buffer.toString('utf-8');
        const parsed = await parseXml(xmlStr);
        const data = extractCfdiData(parsed, file.originalname);

        const company = companyId
          ? await this.prisma.company.findUnique({ where: { id: companyId } })
          : null;
        if (company && data.emisorRfc === company.rfc) data.type = 'EMITIDA';

        const doc = await this.prisma.xmlDocument.create({
          data: { ...data, rawXml: xmlStr, companyId: companyId || '' },
        });
        results.push(doc);
      } catch (e: any) {
        errors.push({ filename: file.originalname, error: e.message });
      }
    }

    return { imported: results.length, errors, documents: results };
  }

  @Post('validate/:id')
  async validateSat(@Param('id') id: string) {
    const doc = await this.prisma.xmlDocument.findUnique({ where: { id } });
    if (!doc) throw new BadRequestException('Documento no encontrado');
    if (!doc.uuid) return { id, satStatus: 'Sin UUID' };

    const satStatus = await validateUuidSat(
      doc.uuid,
      doc.emisorRfc,
      doc.receptorRfc,
      doc.total.toFixed(2),
    );

    await this.prisma.xmlDocument.update({ where: { id }, data: { satStatus } });
    return { id, uuid: doc.uuid, satStatus };
  }

  @Post('auto-journal/:id')
  async autoJournal(@Param('id') id: string, @Query('companyId') companyId: string) {
    return this.generateJournalFromXml(id, companyId);
  }

  @Post('batch-auto-journal')
  async batchAutoJournal(@Body('ids') ids: string[], @Query('companyId') companyId: string) {
    if (!ids?.length) throw new BadRequestException('IDs requeridos');
    
    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const res = await this.generateJournalFromXml(id, companyId);
        results.push(res);
      } catch (e: any) {
        errors.push({ id, error: e.message });
      }
    }

    return { processed: results.length, total: ids.length, errors };
  }

  private async generateJournalFromXml(id: string, companyId: string) {
    const doc = await this.prisma.xmlDocument.findUnique({ where: { id } });
    if (!doc) throw new BadRequestException('Documento no encontrado: ' + id);
    if (doc.journalId) throw new BadRequestException('El documento ya tiene una póliza asociada');

    // Find relevant accounts
    const [accBancos, accProveedores, accIVAAcreditable, accCompras] = await Promise.all([
      this.prisma.account.findFirst({ where: { companyId, code: '1.1.02' } }),
      this.prisma.account.findFirst({ where: { companyId, code: '2.1.01' } }),
      this.prisma.account.findFirst({ where: { companyId, code: '1.1.04' } }),
      this.prisma.account.findFirst({ where: { companyId, code: '5.1.06' } }),
    ]);

    const lastJournal = await this.prisma.journal.findFirst({
      where: { companyId, type: doc.type === 'RECIBIDA' ? 'EGRESO' : 'INGRESO' },
      orderBy: { createdAt: 'desc' },
    });
    const nextNum = ((parseInt(lastJournal?.number || '0', 10)) + 1).toString();

    const entries: any[] = [];

    if (doc.type === 'RECIBIDA') {
      if (accCompras) entries.push({ accountId: accCompras.id, description: `Compra ${doc.emisorName}`, debit: doc.subtotal, credit: 0 });
      if (accIVAAcreditable) entries.push({ accountId: accIVAAcreditable.id, description: 'IVA Acreditable', debit: doc.tax, credit: 0 });
      if (accProveedores) entries.push({ accountId: accProveedores.id, description: `Proveedor ${doc.emisorRfc}`, debit: 0, credit: doc.total });
    } else {
      const [accClientes, accVentas, accIVATrasladado] = await Promise.all([
        this.prisma.account.findFirst({ where: { companyId, code: '1.1.03' } }),
        this.prisma.account.findFirst({ where: { companyId, code: '4.1' } }),
        this.prisma.account.findFirst({ where: { companyId, code: '2.1.02' } }),
      ]);
      if (accClientes) entries.push({ accountId: accClientes.id, description: `Cliente ${doc.receptorRfc}`, debit: doc.total, credit: 0 });
      if (accVentas) entries.push({ accountId: accVentas.id, description: 'Ingresos por ventas', debit: 0, credit: doc.subtotal });
      if (accIVATrasladado) entries.push({ accountId: accIVATrasladado.id, description: 'IVA Trasladado', debit: 0, credit: doc.tax });
    }

    if (entries.length === 0) {
      throw new BadRequestException('No se encontraron cuentas configuradas para auto-póliza');
    }

    const journal = await this.prisma.journal.create({
      data: {
        number: nextNum,
        type: doc.type === 'RECIBIDA' ? 'EGRESO' : 'INGRESO',
        date: doc.date,
        concept: `Auto-póliza XML: ${doc.emisorName || doc.receptorName} | UUID: ${doc.uuid || 'N/A'}`,
        reference: doc.uuid || doc.folio,
        status: 'BORRADOR',
        currency: doc.currency,
        exchangeRate: doc.exchangeRate,
        companyId,
        entries: { create: entries },
      },
    });

    return this.prisma.xmlDocument.update({ 
      where: { id }, 
      data: { status: 'IMPORTADA', journalId: journal.id } 
    });
  }

  @Post('register-cxp/:id')
  async registerCxP(@Param('id') id: string, @Query('companyId') companyId: string) {
    const doc = await this.prisma.xmlDocument.findUnique({ where: { id } });
    if (!doc) throw new BadRequestException('Documento no encontrado');

    // Find or create supplier
    let supplier = await this.prisma.supplier.findFirst({
      where: { companyId, OR: [{ rfc: doc.emisorRfc }] },
    });

    if (!supplier) {
      supplier = await this.prisma.supplier.create({
        data: {
          code: `PRV-${doc.emisorRfc.substring(0, 6)}`,
          name: doc.emisorName || doc.emisorRfc,
          rfc: doc.emisorRfc,
          creditDays: 30,
          companyId,
        },
      });
    }

    const bill = await this.prisma.bill.create({
      data: {
        folio: doc.folio || doc.uuid?.substring(0, 8) || 'XML',
        uuid: doc.uuid,
        date: doc.date,
        supplierId: supplier.id,
        subtotal: doc.subtotal,
        tax: doc.tax,
        total: doc.total,
        currency: doc.currency,
        exchangeRate: doc.exchangeRate,
        status: 'PENDIENTE',
        companyId,
      },
      include: { supplier: true },
    });

    await this.prisma.xmlDocument.update({ where: { id }, data: { status: 'IMPORTADA' } });

    return { bill, supplier };
  }
}
