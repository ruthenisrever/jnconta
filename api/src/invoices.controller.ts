import { Controller, Get, Post, Put, Body, Param, Query, BadRequestException, Res } from '@nestjs/common';
import { Response } from 'express';
import * as JSZip from 'jszip';
import { PrismaService } from './prisma.service';
import { EmailService } from './email.service';
import { StampingService } from './stamping.service';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private stampingService: StampingService,
  ) {}

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.prisma.invoice.findMany({
      where: { companyId },
      include: { client: true, items: true },
      orderBy: { date: 'desc' },
    });
  }

  @Post()
  async create(@Body() data: any) {
    const { items, ...invoiceData } = data;
    const invoice = await this.prisma.invoice.create({
      data: { ...invoiceData, items: { create: items } },
      include: { client: true, items: { include: { product: true } } },
    });

    // Registrar SALIDAs de inventario en paralelo para items con producto físico
    const physicalItems = invoice.items.filter(
      (item) => item.productId && item.product,
    );
    if (physicalItems.length > 0) {
      await Promise.all([
        ...(physicalItems.map((item) => {
          const unitCost = item.product!.cost ?? item.unitPrice;
          return (this.prisma as any).inventoryMovement.create({
            data: {
              companyId: invoice.companyId,
              productId: item.productId,
              type: 'SALIDA',
              quantity: item.quantity,
              unitCost,
              totalCost: item.quantity * unitCost,
              reference: invoice.uuid || `FACT-${invoice.serie}${invoice.folio}`,
              notes: `Venta ${invoice.serie}${invoice.folio} - ${invoice.client.name}`,
            },
          });
        })),
        ...(physicalItems.map((item) =>
          this.prisma.product.update({
            where: { id: item.productId! },
            data: { stock: { decrement: item.quantity } },
          }),
        )),
      ]);
    }

    return invoice;
  }

  @Put(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() body: { motivo?: '01' | '02' | '03' | '04'; uuidSustituto?: string },
  ) {
    return (this.prisma as any).invoice.update({
      where: { id },
      data: {
        status: 'CANCELADA',
        cancelMotivo: body?.motivo ?? '02',
        cancelUuidSustituto: body?.uuidSustituto ?? null,
      },
    });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.prisma.invoice.update({ where: { id }, data });
  }

  @Post('bulk-send-email')
  async bulkSend(@Body() body: { invoiceIds: string[] }) {
    const results = [];
    for (const id of body.invoiceIds) {
      try {
        const res = await this.emailService.sendInvoiceEmail(id);
        results.push({ id, status: 'SENT', ...res });
      } catch (e) {
        results.push({ id, status: 'ERROR', message: e.message });
      }
    }
    return results;
  }

  // ── Descarga masiva ────────────────────────────────────────────────────────

  /**
   * POST /api/invoices/bulk-download
   * Body: { invoiceIds: string[], format: 'xml' | 'both' }
   * Devuelve un ZIP con el XML de cada factura timbrada.
   * Si format='both' incluye también un JSON con los datos de cada factura.
   */
  @Post('bulk-download')
  async bulkDownload(
    @Body() body: { invoiceIds: string[]; format?: 'xml' | 'both' },
    @Res() res: Response
  ) {
    const { invoiceIds, format = 'xml' } = body;
    if (!invoiceIds?.length) throw new BadRequestException('invoiceIds requerido');

    const invoices = await this.prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      include: { client: true, items: true }
    });

    const zip = new JSZip();
    let included = 0;
    let missing  = 0;

    for (const inv of invoices) {
      const filename = `${inv.serie}${inv.folio}_${inv.client?.name?.replace(/[^a-zA-Z0-9]/g, '_') ?? inv.clientId}`;

      // XML del SAT
      const xml = (inv as any).xmlContent;
      if (xml) {
        zip.file(`${filename}.xml`, xml);
        included++;
      } else {
        // Sin timbrar: genera un XML básico de referencia
        zip.file(`${filename}_SIN_TIMBRAR.xml`,
          `<!-- Factura ${inv.serie}${inv.folio} sin timbrar -->\n` +
          `<Invoice id="${inv.id}" total="${inv.total}" date="${inv.date}" status="${inv.status}"/>`
        );
        missing++;
      }

      // JSON con datos completos (si format=both)
      if (format === 'both') {
        zip.file(`${filename}.json`, JSON.stringify(inv, null, 2));
      }
    }

    // Índice CSV de las facturas incluidas
    const csvLines = ['Serie,Folio,Cliente,Fecha,Total,Status,UUID'];
    for (const inv of invoices) {
      csvLines.push([
        inv.serie, inv.folio,
        `"${inv.client?.name ?? ''}"`,
        new Date(inv.date).toLocaleDateString('es-MX'),
        inv.total, inv.status,
        (inv as any).uuid ?? ''
      ].join(','));
    }
    zip.file('_indice.csv', csvLines.join('\n'));

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="facturas_${Date.now()}.zip"`);
    res.setHeader('X-Included', included.toString());
    res.setHeader('X-Missing-Stamp', missing.toString());
    res.send(buffer);
  }

  // ── Facturación masiva ─────────────────────────────────────────────────────

  /**
   * POST /api/invoices/bulk-create
   * Body: { invoices: InvoiceData[] }
   * Crea múltiples facturas en una sola llamada.
   * Retorna un resumen con created[], errors[].
   */
  @Post('bulk-create')
  async bulkCreate(@Body() body: { invoices: any[] }) {
    if (!body.invoices?.length) throw new BadRequestException('invoices[] requerido');

    const created = [];
    const errors  = [];

    for (const data of body.invoices) {
      try {
        const { items, ...invoiceData } = data;
        if (!items?.length) throw new Error('items vacío');

        // Calcular siguiente folio para la serie
        const last = await this.prisma.invoice.findFirst({
          where: { companyId: invoiceData.companyId, serie: invoiceData.serie || 'A' },
          orderBy: { folio: 'desc' }
        });
        const folio = (last?.folio ?? 0) + 1;

        const inv = await this.prisma.invoice.create({
          data: {
            ...invoiceData,
            folio,
            date: new Date(invoiceData.date || new Date()),
            items: { create: items }
          },
          include: { client: true, items: true }
        });

        // Movimientos de inventario para productos físicos
        const physicalItems = inv.items.filter((i: any) => i.productId);
        if (physicalItems.length > 0) {
          await Promise.all(physicalItems.map((i: any) =>
            this.prisma.product.update({
              where: { id: i.productId },
              data:  { stock: { decrement: i.quantity } }
            })
          ));
        }

        created.push({ id: inv.id, folio: inv.folio, serie: inv.serie, total: inv.total });
      } catch (e: any) {
        errors.push({ data, error: e.message });
      }
    }

    return {
      total:   body.invoices.length,
      created: created.length,
      errors:  errors.length,
      results: created,
      failed:  errors,
    };
  }

  /**
   * POST /api/invoices/bulk-stamp
   * Body: { invoiceIds: string[], companyId: string }
   * Timbra múltiples facturas en lote con el PAC.
   * Retorna resumen stamped[], errors[].
   */
  @Post('bulk-stamp')
  async bulkStamp(@Body() body: { invoiceIds: string[]; companyId: string }) {
    if (!body.invoiceIds?.length) throw new BadRequestException('invoiceIds requerido');
    const stamped: string[] = [];
    const errors: { id: string; error: string }[] = [];
    for (const id of body.invoiceIds) {
      try {
        await this.stampingService.stampDocument('INVOICE', id, body.companyId);
        stamped.push(id);
      } catch (e: any) {
        errors.push({ id, error: e.message ?? 'Error desconocido' });
      }
    }
    return { stamped, errors, total: body.invoiceIds.length };
  }

  /**
   * POST /api/invoices/bulk-cancel
   * Body: { invoiceIds: string[], motivo: '01'|'02'|'03'|'04' }
   * Cancela múltiples facturas.
   */
  @Post('bulk-cancel')
  async bulkCancel(@Body() body: { invoiceIds: string[]; motivo?: '01'|'02'|'03'|'04' }) {
    if (!body.invoiceIds?.length) throw new BadRequestException('invoiceIds requerido');

    const motivo = body.motivo ?? '02';
    const result = await this.prisma.invoice.updateMany({
      where: { id: { in: body.invoiceIds }, status: { not: 'CANCELADA' } },
      data:  { status: 'CANCELADA', cancelMotivo: motivo }
    });

    return { cancelled: result.count, motivo };
  }

  // ── Notas de Crédito / Débito (CFDI tipo E) ───────────────────────────────

  /** Lista todas las notas de crédito/débito de una empresa */
  @Get('credit-notes')
  getCreditNotes(@Query('companyId') companyId: string, @Query('invoiceId') invoiceId?: string) {
    return (this.prisma.invoice as any).findMany({
      where: {
        companyId,
        cfdiType: 'E',
        ...(invoiceId ? { relatedInvoiceId: invoiceId } : {})
      },
      include: { client: true, items: true, relatedInvoice: true },
      orderBy: { date: 'desc' }
    });
  }

  /**
   * Crea una Nota de Crédito (cfdiType=E) referenciando una factura original.
   * relationshipType: '01'=NC, '02'=ND, '03'=Devolución
   */
  @Post('credit-notes')
  async createCreditNote(@Body() data: any) {
    if (!data.relatedInvoiceId) throw new BadRequestException('relatedInvoiceId es requerido para notas de crédito');

    const original = await (this.prisma.invoice as any).findUnique({
      where: { id: data.relatedInvoiceId },
      include: { items: true }
    });
    if (!original) throw new BadRequestException('Factura original no encontrada');

    const { items, ...noteData } = data;

    // Calcular totales si no vienen explícitos
    const noteItems = items || original.items.map((i: any) => ({
      productId:   i.productId,
      description: i.description,
      quantity:    i.quantity,
      unitPrice:   i.unitPrice,
      discount:    i.discount,
      taxRate:     i.taxRate,
      subtotal:    i.subtotal,
      tax:         i.tax,
      total:       i.total,
      unit:        i.unit,
      satCode:     i.satCode,
    }));

    const subtotal = noteItems.reduce((s: number, i: any) => s + Number(i.subtotal), 0);
    const tax      = noteItems.reduce((s: number, i: any) => s + Number(i.tax),      0);
    const total    = noteItems.reduce((s: number, i: any) => s + Number(i.total),    0);

    // Calcular siguiente folio para serie NC
    const lastNC = await (this.prisma.invoice as any).findFirst({
      where: { companyId: data.companyId, serie: 'NC', cfdiType: 'E' },
      orderBy: { folio: 'desc' }
    });
    const folio = (lastNC?.folio ?? 0) + 1;

    const note = await (this.prisma.invoice as any).create({
      data: {
        ...noteData,
        serie:            'NC',
        folio,
        cfdiType:         'E',
        status:           'VIGENTE',
        relatedInvoiceId: data.relatedInvoiceId,
        relatedUuid:      data.relatedUuid || original.uuid || null,
        relationshipType: data.relationshipType || '01',
        subtotal:         data.subtotal ?? subtotal,
        tax:              data.tax      ?? tax,
        total:            data.total    ?? total,
        discount:         data.discount ?? 0,
        date:             new Date(data.date || new Date()),
        items: { create: noteItems }
      },
      include: { client: true, items: true, relatedInvoice: { select: { serie: true, folio: true, uuid: true } } }
    });

    // Revertir inventario si hay ítems con producto (devolución)
    if (data.relationshipType === '03') {
      const physicalItems = note.items.filter((i: any) => i.productId);
      await Promise.all(physicalItems.map((i: any) =>
        this.prisma.product.update({
          where: { id: i.productId },
          data:  { stock: { increment: i.quantity } }
        })
      ));
    }

    return note;
  }

  /** Cancela una nota de crédito */
  @Put('credit-notes/:id/cancel')
  cancelCreditNote(@Param('id') id: string, @Body() body: { motivo?: string }) {
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELADA', cancelMotivo: body?.motivo ?? '02' }
    });
  }

  // ── Carta Porte ───────────────────────────────────────────────────────────

  /** Lista todos los CFDI con Complemento Carta Porte de la empresa */
  @Get('carta-porte')
  getCartaPortes(@Query('companyId') companyId: string) {
    return this.prisma.invoice.findMany({
      where: { companyId, cfdiType: { in: ['T', 'I'] }, cartaPorteJson: { not: null } },
      include: { client: true },
      orderBy: { date: 'desc' },
    });
  }

  /** Crea una Carta Porte (CFDI Traslado o Ingreso con complemento CP 3.1) */
  @Post('carta-porte')
  async createCartaPorte(@Body() body: any) {
    const {
      companyId, clientId, cfdiType = 'I', serie = 'CP',
      date, currency = 'MXN', exchangeRate = 1,
      paymentMethod = 'PUE', paymentForm = '01',
      cfdiUse = 'S01', items = [],
      // Carta Porte fields
      cartaPorte,
    } = body;

    if (!companyId || !clientId || !cartaPorte) {
      throw new BadRequestException('companyId, clientId y cartaPorte son requeridos');
    }

    // Calculate totals from items
    const subtotal = items.reduce((s: number, i: any) => s + (Number(i.quantity) * Number(i.unitPrice)), 0);
    const tax = cfdiType === 'T' ? 0 : parseFloat((subtotal * 0.16).toFixed(2));
    const total = subtotal + tax;

    // Auto-increment folio for CP series
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { companyId, serie },
      orderBy: { folio: 'desc' },
    });
    const folio = (lastInvoice?.folio ?? 0) + 1;

    // Build Carta Porte XML
    const cp = cartaPorte;
    const xmlContent = this.buildCartaPorteXml(cp, body);

    return this.prisma.invoice.create({
      data: {
        companyId, clientId, cfdiType, serie, folio,
        date: new Date(date || new Date()),
        subtotal, tax, total, currency, exchangeRate,
        paymentMethod, paymentForm, cfdiUse,
        status: 'VIGENTE',
        cartaPorteJson: JSON.stringify(cartaPorte),
        xmlContent,
        items: { create: items.map((i: any) => ({
          description: i.description,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          amount: Number(i.quantity) * Number(i.unitPrice),
          taxRate: cfdiType === 'T' ? 0 : 0.16,
          satCode: i.satCode || '78101800',
          unitKey: i.unitKey || 'KGM',
        })) },
      },
      include: { client: true, items: true },
    });
  }

  @Get('carta-porte/:id/xml')
  async getCartaPorteXml(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { client: true, company: true, items: true },
    });
    if (!invoice || !invoice.cartaPorteJson) throw new BadRequestException('Carta Porte no encontrada');
    res.set('Content-Type', 'text/xml');
    res.attachment(`CP_${invoice.serie}${invoice.folio}.xml`);
    return res.send(invoice.xmlContent || this.buildCartaPorteXml(JSON.parse(invoice.cartaPorteJson), invoice));
  }

  private buildCartaPorteXml(cp: any, inv: any): string {
    const fecha = new Date(inv.date || new Date()).toISOString().replace('Z', '');
    const subtotal = Number(inv.subtotal || 0).toFixed(2);
    const total = Number(inv.total || 0).toFixed(2);
    const rfcEmisor = inv.company?.rfc || 'XAXX010101000';
    const nombreEmisor = inv.company?.name || 'Emisor';
    const rfcReceptor = inv.clientRfc || 'XAXX010101000';
    const nombreReceptor = inv.clientName || 'Receptor';

    const ubicaciones = (cp.ubicaciones || []).map((u: any, i: number) => `
      <cartaporte31:Ubicacion TipoUbicacion="${u.tipo}" IDUbicacion="${u.tipo === 'Origen' ? 'OR' : 'DE'}${String(i).padStart(6, '0')}"
        RFCRemitenteDestinatario="${u.rfc || 'XAXX010101000'}" NombreRemitenteDestinatario="${u.nombre || ''}"
        FechaHoraSalidaLlegada="${u.fechaHora || fecha}" DistanciaRecorrida="${u.distanciaKm || 0}">
        <cartaporte31:Domicilio Calle="${u.calle || ''}" NumeroExterior="${u.numExt || ''}"
          Colonia="${u.colonia || ''}" Municipio="${u.municipio || ''}" Estado="${u.estado || 'JAL'}"
          Pais="MEX" CodigoPostal="${u.cp || '44100'}"/>
      </cartaporte31:Ubicacion>`).join('');

    const mercancias = (cp.mercancias || []).map((m: any) => `
        <cartaporte31:Mercancia BienesTransp="${m.bienesTransp || '10101501'}" Descripcion="${m.descripcion || 'Mercancía'}"
          Cantidad="${m.cantidad || 1}" ClaveUnidad="${m.claveUnidad || 'KGM'}" PesoEnKg="${m.pesoKg || 1}"
          ValorMercancia="${m.valor || 0}" Moneda="${m.moneda || 'MXN'}"${m.materialPeligroso === 'Sí' ? ` MaterialPeligroso="Sí" CVeMaterialPeligroso="${m.cveMaterial || ''}"` : ''}/>
      `).join('');

    const figuras = (cp.figuras || []).map((f: any) => `
      <cartaporte31:Figura TipoFigura="${f.tipo || '01'}" RFCFigura="${f.rfc || 'XAXX010101000'}"
        NombreFigura="${f.nombre || ''}"${f.tipo === '01' ? ` NumLicencia="${f.numLicencia || ''}"` : ''}/>`).join('');

    return `<?xml version="1.0" encoding="utf-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:cartaporte31="http://www.sat.gob.mx/CartaPorte31"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/CartaPorte31 http://www.sat.gob.mx/sitio_internet/cfd/CartaPorte/CartaPorte31.xsd"
  Version="4.0" Serie="${inv.serie || 'CP'}" Folio="${inv.folio || 1}"
  Fecha="${fecha}" Sello="" NoCertificado="" Certificado=""
  SubTotal="${subtotal}" Total="${total}" Moneda="${inv.currency || 'MXN'}"
  TipoDeComprobante="${inv.cfdiType || 'T'}" MetodoPago="${inv.paymentMethod || 'PUE'}"
  FormaPago="${inv.paymentForm || '01'}" LugarExpedicion="${inv.company?.zip || '44100'}">
  <cfdi:Emisor Rfc="${rfcEmisor}" Nombre="${nombreEmisor}" RegimenFiscal="${inv.company?.taxRegime || '601'}"/>
  <cfdi:Receptor Rfc="${rfcReceptor}" Nombre="${nombreReceptor}"
    DomicilioFiscalReceptor="${inv.client?.zip || '44100'}" RegimenFiscalReceptor="${inv.client?.taxRegime || '612'}"
    UsoCFDI="${inv.cfdiUse || 'S01'}"/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="${cp.claveProdServ || '78101800'}" Cantidad="1" ClaveUnidad="E48"
      Descripcion="Servicio de Autotransporte Terrestre de Carga" ValorUnitario="${subtotal}" Importe="${subtotal}">
      ${inv.cfdiType !== 'T' ? `<cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="${subtotal}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(Number(subtotal)*0.16).toFixed(2)}"/></cfdi:Traslados></cfdi:Impuestos>` : ''}
    </cfdi:Concepto>
  </cfdi:Conceptos>
  ${inv.cfdiType !== 'T' ? `<cfdi:Impuestos TotalImpuestosTrasladados="${(Number(subtotal)*0.16).toFixed(2)}"><cfdi:Traslados><cfdi:Traslado Base="${subtotal}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${(Number(subtotal)*0.16).toFixed(2)}"/></cfdi:Traslados></cfdi:Impuestos>` : ''}
  <cfdi:Complemento>
    <cartaporte31:CartaPorte Version="3.1" TranspInternac="${cp.transpInternac || 'No'}" TotalDistRec="${cp.totalDistKm || 0}">
      <cartaporte31:Ubicaciones>${ubicaciones}
      </cartaporte31:Ubicaciones>
      <cartaporte31:Mercancias NumTotalMercancias="${(cp.mercancias || []).length}" PesoBrutoTotal="${(cp.mercancias || []).reduce((s: number, m: any) => s + Number(m.pesoKg || 0), 0)}" UnidadPeso="KGM" LogisticaInversaRecoleccionDevolucion="No">
        ${mercancias}
        <cartaporte31:Autotransporte PermSCT="${cp.autotransporte?.permSCT || 'TPAF10'}" NumPermisoSCT="${cp.autotransporte?.numPermiso || ''}">
          <cartaporte31:IdentificacionVehicular ConfigVehicular="${cp.autotransporte?.configVehicular || 'C2'}" PlacaVM="${cp.autotransporte?.placa || ''}" AnioModeloVM="${cp.autotransporte?.anio || new Date().getFullYear()}"/>
          <cartaporte31:Seguros AseguraMedAmbiente="${cp.autotransporte?.aseguradora || ''}" PolizaMedAmbiente="${cp.autotransporte?.polizaMedAmbiente || ''}" AseguraCarga="${cp.autotransporte?.aseguradoraCarga || ''}" PolizaCarga="${cp.autotransporte?.polizaCarga || ''}" PrimaSeguro="${cp.autotransporte?.primaSeguro || '0'}"/>
        </cartaporte31:Autotransporte>
      </cartaporte31:Mercancias>
      <cartaporte31:FiguraTransporte>${figuras}
      </cartaporte31:FiguraTransporte>
    </cartaporte31:CartaPorte>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
  }

  // ── Complemento Comercio Exterior 1.1 ─────────────────────────────────────

  @Get('comercio-exterior')
  async listComercioExterior(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId es requerido');
    return this.prisma.invoice.findMany({
      where: { companyId, cfdiType: 'I', xmlContent: { contains: 'ComercioExterior' } },
      include: { client: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Post('comercio-exterior')
  async createComercioExterior(@Body() body: any) {
    const { companyId, clientId, items = [], comercioExterior, ...rest } = body;
    if (!companyId) throw new BadRequestException('companyId es requerido');

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Empresa no encontrada');

    const lastInv = await this.prisma.invoice.findFirst({
      where: { companyId, serie: 'EXP' }, orderBy: { folio: 'desc' },
    });
    const folio = (lastInv?.folio ?? 0) + 1;

    const subtotal = items.reduce((s: number, i: any) => s + (i.quantity * i.unitPrice), 0);
    const tax = 0; // Exportaciones van a tasa 0%
    const total = subtotal;

    const xmlContent = this.buildComercioExteriorXml(company, body, items, subtotal, total, folio);

    return this.prisma.invoice.create({
      data: {
        folio, serie: 'EXP', status: 'VIGENTE',
        date: new Date(rest.date ?? Date.now()),
        clientId,
        cfdiUse: rest.cfdiUse ?? 'G01',
        cfdiType: 'I',
        paymentMethod: rest.paymentMethod ?? 'PUE',
        paymentForm: rest.paymentForm ?? '03',
        subtotal, tax, total,
        currency: rest.currency ?? 'USD',
        exchangeRate: rest.exchangeRate ?? 17.5,
        companyId,
        xmlContent,
        items: {
          create: items.map((i: any) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            discount: i.discount ?? 0,
            taxRate: 0,
            subtotal: i.quantity * i.unitPrice,
            tax: 0,
            total: i.quantity * i.unitPrice,
            satCode: i.satCode ?? '01010101',
            unit: i.unit ?? 'KGM',
          })),
        },
      },
    });
  }

  private buildComercioExteriorXml(company: any, body: any, items: any[], subtotal: number, total: number, folio: number): string {
    const ce = body.comercioExterior ?? {};
    const now = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:cce11="http://www.sat.gob.mx/ComercioExterior11"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/ComercioExterior11 http://www.sat.gob.mx/sitio_internet/cfd/ComercioExterior11/ComercioExterior11.xsd"
  Version="4.0" Serie="EXP" Folio="${folio}"
  Fecha="${now}" SubTotal="${subtotal.toFixed(2)}" Moneda="${body.currency ?? 'USD'}"
  TipoCambio="${body.exchangeRate ?? '17.5'}" Total="${total.toFixed(2)}"
  TipoDeComprobante="I" Exportacion="02" MetodoPago="${body.paymentMethod ?? 'PUE'}"
  FormaPago="${body.paymentForm ?? '03'}" LugarExpedicion="${company.postalCode ?? '06600'}">
  <cfdi:Emisor Rfc="${company.rfc}" Nombre="${company.name}" RegimenFiscal="${company.regimenFiscal ?? '601'}" />
  <cfdi:Receptor
    Rfc="${body.clientRfc ?? 'XEXX010101000'}"
    Nombre="${body.clientName ?? ''}"
    ResidenciaFiscal="${ce.paisDestino ?? 'USA'}"
    NumRegIdTrib="${ce.numRegIdTrib ?? ''}"
    DomicilioFiscalReceptor="${ce.cpReceptor ?? '00000'}"
    RegimenFiscalReceptor="${ce.regimenReceptor ?? '616'}"
    UsoCFDI="${body.cfdiUse ?? 'G01'}" />
  <cfdi:Conceptos>
    ${items.map((i: any) => `
    <cfdi:Concepto ClaveProdServ="${i.satCode ?? '01010101'}" NoIdentificacion="${i.noIdentificacion ?? ''}"
      Cantidad="${i.quantity}" ClaveUnidad="${i.unit ?? 'KGM'}" Descripcion="${i.description}"
      ValorUnitario="${i.unitPrice.toFixed(2)}" Importe="${(i.quantity * i.unitPrice).toFixed(2)}" ObjetoImp="01" />`).join('')}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="0.00" />
  <cfdi:Complemento>
    <cce11:ComercioExterior
      xmlns:cce11="http://www.sat.gob.mx/ComercioExterior11"
      Version="1.1"
      MotivoTraslado="${ce.motivoTraslado ?? '01'}"
      TipoOperacion="${ce.tipoOperacion ?? '2'}"
      ClaveDePedimento="${ce.clavePedimento ?? 'A1'}"
      CertificadoOrigen="${ce.certificadoOrigen ?? '0'}"
      NumCertificadoOrigen="${ce.numCertificadoOrigen ?? ''}"
      Incoterm="${ce.incoterm ?? 'DAP'}"
      Subdivision="${ce.subdivision ?? '0'}"
      Observaciones="${ce.observaciones ?? ''}"
      TipoCambioUSD="${body.exchangeRate ?? '17.5'}"
      TotalUSD="${total.toFixed(2)}">
      <cce11:Emisor>
        <cce11:Domicilio
          Calle="${company.address ?? ''}"
          CodigoPostal="${company.postalCode ?? '06600'}"
          Estado="${ce.estadoEmisor ?? 'CMX'}"
          Pais="MEX" />
      </cce11:Emisor>
      <cce11:Receptor NumRegIdTrib="${ce.numRegIdTrib ?? ''}" />
      <cce11:Destinatario>
        <cce11:Domicilio
          Calle="${ce.calleDestino ?? ''}"
          CodigoPostal="${ce.cpDestino ?? '00000'}"
          Estado="${ce.estadoDestino ?? ''}"
          Pais="${ce.paisDestino ?? 'USA'}" />
      </cce11:Destinatario>
      <cce11:Mercancias>
        ${items.map((i: any) => `
        <cce11:Mercancia
          NoIdentificacion="${i.noIdentificacion ?? ''}"
          FraccionArancelaria="${i.fraccionArancelaria ?? '8471300000'}"
          CantidadAduana="${i.quantity}"
          UnidadAduana="${i.unidadAduana ?? '06'}"
          ValorUnitarioAduana="${i.unitPrice.toFixed(2)}"
          ValorDolares="${(i.quantity * i.unitPrice).toFixed(2)}" />`).join('')}
      </cce11:Mercancias>
    </cce11:ComercioExterior>
  </cfdi:Complemento>
</cfdi:Comprobante>`;
  }
}
