import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import * as fs from 'fs';
import { FinkokService } from './pac.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: any, decimals = 2): string => {
  const num = typeof n === 'string' ? parseFloat(n) : Number(n);
  return isNaN(num) ? '0.00' : num.toFixed(decimals);
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Traslado {
  base: string;
  impuesto: string;
  tipoFactor: string;
  tasaOCuota: string;
  importe: string;
}

interface Concepto {
  claveProdServ: string;
  noIdentificacion?: string;
  cantidad: string;
  claveUnidad: string;
  unidad?: string;
  descripcion: string;
  valorUnitario: string;
  importe: string;
  descuento?: string;
  objetoImp: string;
  traslados: Traslado[];
  retenciones: Traslado[];
}

interface ComprobanteData {
  version: string;
  serie?: string;
  folio?: string;
  fecha: string;
  formaPago?: string;
  noCertificado: string;
  condicionesDePago?: string;
  subTotal: string;
  descuento?: string;
  moneda: string;
  tipoCambio?: string;
  total: string;
  tipoDeComprobante: string;
  exportacion: string;
  metodoPago?: string;
  lugarExpedicion: string;
  confirmacion?: string;
  emisor: { rfc: string; nombre: string; regimenFiscal: string };
  receptor: {
    rfc: string;
    nombre: string;
    domicilioFiscalReceptor: string;
    regimenFiscalReceptor: string;
    usoCFDI: string;
  };
  conceptos: Concepto[];
  impuestos: {
    totalRetenidos?: string;
    totalTrasladados?: string;
    retenciones: { impuesto: string; importe: string }[];
    traslados: Traslado[];
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class StampingService implements OnModuleInit {
  private readonly logger = new Logger(StampingService.name);

  constructor(
    private prisma: PrismaService,
    private finkok: FinkokService,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 Iniciando autodiagnóstico de timbrado real...');
    try {
      const cerPath = 'c:/Users/ruthe/Downloads/SAT/00001000000510941449.cer';
      const keyPath = 'c:/Users/ruthe/Downloads/SAT/CSD_RUTHENI_NALJ890809C15_20220118_115550.key';
      
      if (fs.existsSync(cerPath) && fs.existsSync(keyPath)) {
        this.logger.log('✅ Sellos CSD detectados en Downloads. Activando producción...');
        const cerBuf = fs.readFileSync(cerPath);
        const x509 = new crypto.X509Certificate(cerBuf);
        const serial = BigInt('0x' + x509.serialNumber.replace(/\s/g, '')).toString();

        const company = await (this.prisma as any).company.findFirst({
          where: { rfc: 'NALJ890809C15' }
        });

        if (company) {
          // Desactivar certificados FIEL previos
          await (this.prisma as any).digitalCertificate.updateMany({
            where: { companyId: company.id },
            data: { isActive: false }
          });

          // Activar CSD Real
          await (this.prisma as any).digitalCertificate.upsert({
            where: { serialNumber: serial },
            update: { isActive: true, keyFile: fs.readFileSync(keyPath).toString('base64'), cerFile: cerBuf.toString('base64') },
            create: {
              companyId: company.id,
              serialNumber: serial,
              cerFile: cerBuf.toString('base64'),
              keyFile: fs.readFileSync(keyPath).toString('base64'),
              password: 'Ingeniero66',
              expiryDate: new Date(x509.validTo),
              isActive: true
            }
          });

          // Forzar a MODO PRODUCCIÓN
          await (this.prisma as any).company.update({
            where: { id: company.id },
            data: {
              pacUsername: 'rutheni.qm@gmail.com',
              pacPassword: 'Ingeniero66',
              pacTestMode: false,
              pacUrl: 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl'
            }
          });
          this.logger.log(`🎊 SISTEMA REPARADO: RFC ${company.rfc} ahora está en PRODUCCIÓN REAL.`);
        }
      } else {
        this.logger.warn('⚠️ No se encontraron sellos CSD en la ruta esperada de Downloads.');
      }
    } catch (e) {
      this.logger.error(`❌ Fallo en autodiagnóstico: ${e.message}`);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async stampDocument(entity: 'INVOICE' | 'PAYROLL' | 'ADVANCE', id: string, companyId: string) {
    // 0. Validación de suscripción SaaS
    const company = await (this.prisma as any).company.findUnique({
      where: { id: companyId },
      include: { tenant: { include: { subscription: true } } },
    });

    if (company?.tenant?.subscription) {
      const sub = company.tenant.subscription;
      if (sub.stampingUsed >= sub.stampingLimit) {
        throw new BadRequestException(
          'Has agotado tus folios mensuales. Actualiza tu plan o espera al siguiente periodo.',
        );
      }
    }

    // 1. Certificado activo
    const cert = await (this.prisma as any).digitalCertificate.findFirst({
      where: { companyId, isActive: true },
    });
    if (!cert) {
      throw new BadRequestException('No hay un CSD activo para esta empresa.');
    }

    // 2. Datos del documento
    let doc: any;
    if (entity === 'INVOICE') {
      doc = await this.prisma.invoice.findUnique({
        where: { id },
        include: { items: true, client: true, company: true },
      });
    } else if (entity === 'ADVANCE') {
      const adv = await (this.prisma as any).advance.findUnique({
        where: { id },
        include: { client: true },
      });
      if (adv) {
        // Normalizar anticipo al formato que espera buildComprobanteData
        doc = {
          ...adv,
          serie: 'ANT',
          folio: String(adv.folio),
          subtotal: adv.amount,
          total: adv.amount,
          currency: 'MXN',
          paymentForm: '30',
          paymentMethod: 'PUE',
          items: [{
            description: `Anticipo folio ${adv.folio}`,
            quantity: 1,
            unitPrice: adv.amount,
            subtotal: adv.amount,
            satCode: '84111506',
            unit: 'ACT',
          }],
        };
      }
    } else {
      doc = await (this.prisma as any).payrollReceipt.findUnique({
        where: { id },
        include: { items: true, employee: true, period: { include: { company: true } } },
      });
    }

    if (!doc) throw new BadRequestException('Documento no encontrado.');
    if (doc.uuid) throw new BadRequestException('El documento ya está timbrado.');

    const companyData = await (this.prisma as any).company.findUnique({ where: { id: companyId } });

    // 3. Construir datos estructurados del comprobante
    const comprobanteData = this.buildComprobanteData(doc, cert, companyData, entity === 'ADVANCE' ? 'INVOICE' : entity);

    // 4. Cadena Original CFDI 4.0 (sigue el XSLT del SAT exactamente)
    const originalChain = this.buildCadenaOriginal(comprobanteData);
    this.logger.log(`Cadena original (primeros 120 chars): ${originalChain.substring(0, 120)}`);

    // 5. Firmado RSA-SHA256 con la llave DER del SAT
    let sello: string;
    try {
      sello = this.signWithKey(originalChain, cert.keyFile, cert.password);
    } catch (e) {
      this.logger.error(`Error de firmado: ${e.message}`);
      throw new BadRequestException(
        'Error al firmar el documento. Verifica la contraseña del CSD.',
      );
    }

    // 6. Construir XML pre-timbrado
    const xmlPreStamp = this.buildXml(comprobanteData, sello, cert.cerFile);
    const xmlBase64 = Buffer.from(xmlPreStamp, 'utf8').toString('base64');

    // 7. Determinar URL del PAC según modo de operación
    const isTestMode = companyData.pacTestMode ?? true;
    const stampUrl = this.resolveStampUrl(companyData.pacUrl, isTestMode);

    // 8. Llamada al PAC (Finkok)
    const stampingResult = await this.finkok.stamp(
      xmlBase64,
      companyData.pacUsername || 'test',
      companyData.pacPassword || 'test',
      stampUrl,
    );

    if (!stampingResult.success) {
      throw new BadRequestException(`Error del PAC: ${stampingResult.error}`);
    }

    // 9. Persistir en base de datos
    const updateData = {
      uuid: stampingResult.uuid,
      stampingDate: stampingResult.stampingDate,
      satSeal: stampingResult.satSeal,
      originalChain,
      xmlContent: stampingResult.xml,
      status: entity === 'INVOICE' ? 'COBRADA' : 'TIMBRADO',
    };

    if (entity === 'INVOICE') {
      await this.prisma.invoice.update({ where: { id }, data: updateData });
    } else if (entity === 'ADVANCE') {
      await (this.prisma as any).advance.update({ where: { id }, data: { uuid: stampingResult.uuid, xmlContent: stampingResult.xml, status: 'TIMBRADO' } });
    } else {
      await (this.prisma as any).payrollReceipt.update({ where: { id }, data: updateData });
    }

    // 10. Incrementar consumo de folios
    if (company?.tenant?.subscription) {
      await (this.prisma as any).subscription.update({
        where: { id: company.tenant.subscription.id },
        data: { stampingUsed: { increment: 1 } },
      });
    }

    return { success: true, uuid: stampingResult.uuid, xml: stampingResult.xml };
  }

  // ── Cadena Original CFDI 4.0 ────────────────────────────────────────────────
  // Sigue el orden exacto del XSLT del SAT (cadenaoriginal_CFDI_4.xslt).
  // Solo se incluyen campos con valor (Opcional = omitir si vacío).

  buildCadenaOriginal(c: ComprobanteData): string {
    const parts: string[] = [];

    // push: solo agrega si el valor no es vacío/nulo
    const push = (val: any) => {
      if (val !== undefined && val !== null && val !== '') {
        parts.push(String(val).trim());
      }
    };

    // ── Atributos del Comprobante ──
    push(c.version);              // Requerido
    push(c.serie);                // Opcional
    push(c.folio);                // Opcional
    push(c.fecha);                // Requerido
    push(c.formaPago);            // Opcional
    push(c.noCertificado);        // Requerido
    push(c.condicionesDePago);    // Opcional
    push(c.subTotal);             // Requerido
    push(c.descuento);            // Opcional (solo si > 0)
    push(c.moneda);               // Requerido
    push(c.tipoCambio);           // Opcional (solo si Moneda ≠ MXN)
    push(c.total);                // Requerido
    push(c.tipoDeComprobante);    // Requerido
    push(c.exportacion);          // Requerido
    push(c.metodoPago);           // Opcional
    push(c.lugarExpedicion);      // Requerido
    push(c.confirmacion);         // Opcional

    // ── Emisor ──
    push(c.emisor.rfc);
    push(c.emisor.nombre);        // Opcional según XSLT
    push(c.emisor.regimenFiscal);

    // ── Receptor ──
    push(c.receptor.rfc);
    push(c.receptor.nombre);      // Opcional según XSLT
    push(c.receptor.domicilioFiscalReceptor);
    push(c.receptor.regimenFiscalReceptor);
    push(c.receptor.usoCFDI);

    // ── Conceptos ──
    for (const concepto of c.conceptos) {
      push(concepto.claveProdServ);
      push(concepto.noIdentificacion);   // Opcional
      push(concepto.cantidad);
      push(concepto.claveUnidad);
      push(concepto.unidad);             // Opcional
      push(concepto.descripcion);
      push(concepto.valorUnitario);
      push(concepto.importe);
      push(concepto.descuento);          // Opcional
      push(concepto.objetoImp);

      // Impuestos del Concepto — Traslados
      for (const t of concepto.traslados) {
        push(t.base);
        push(t.impuesto);
        push(t.tipoFactor);
        push(t.tasaOCuota);   // Opcional (vacío para "Exento")
        push(t.importe);      // Opcional (vacío para "Exento")
      }
      // Impuestos del Concepto — Retenciones
      for (const r of concepto.retenciones) {
        push(r.base);
        push(r.impuesto);
        push(r.tipoFactor);
        push(r.tasaOCuota);
        push(r.importe);
      }
    }

    // ── Impuestos del Comprobante (globales) ──
    push(c.impuestos.totalRetenidos);   // Opcional
    push(c.impuestos.totalTrasladados); // Opcional
    for (const r of c.impuestos.retenciones) {
      push(r.impuesto);
      push(r.importe);
    }
    for (const t of c.impuestos.traslados) {
      push(t.base);
      push(t.impuesto);
      push(t.tipoFactor);
      push(t.tasaOCuota);
      push(t.importe);
    }

    return `||${parts.join('|')}||`;
  }

  // ── Firmado RSA-SHA256 ───────────────────────────────────────────────────────
  // Los archivos .key del SAT son PKCS#8 cifrado en formato DER.
  // Node.js los espera en PEM con la cabecera "ENCRYPTED PRIVATE KEY".

  private signWithKey(chain: string, keyBase64: string, password: string): string {
    const keyPem = this.derKeyToPem(keyBase64);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(chain, 'utf8');
    return sign.sign({ key: keyPem, passphrase: password }, 'base64');
  }

  private derKeyToPem(keyBase64: string): string {
    if (keyBase64.includes('-----BEGIN')) return keyBase64;
    const cleaned = keyBase64.replace(/\s/g, '');
    const chunked = cleaned.match(/.{1,64}/g)?.join('\n') ?? cleaned;
    // SAT .key files son PKCS#8 cifrado en DER → cabecera ENCRYPTED PRIVATE KEY
    return `-----BEGIN ENCRYPTED PRIVATE KEY-----\n${chunked}\n-----END ENCRYPTED PRIVATE KEY-----`;
  }

  // ── Datos estructurados del comprobante ─────────────────────────────────────

  private buildComprobanteData(
    doc: any,
    cert: any,
    company: any,
    entity: 'INVOICE' | 'PAYROLL',
  ): ComprobanteData {
    const fecha = new Date().toISOString().split('.')[0]; // YYYY-MM-DDTHH:MM:SS
    const moneda = doc.currency || 'MXN';
    const tipoDeComprobante = entity === 'INVOICE' ? 'I' : 'N';

    const receptorRfc =
      doc.receptorRfc || doc.client?.rfc || doc.employee?.rfc || 'XAXX010101000';
    const receptorNombre = (
      doc.receptorName ||
      doc.client?.name ||
      `${doc.employee?.name || ''} ${doc.employee?.lastName || ''}`.trim() ||
      'GENERICO'
    ).toUpperCase();

    // Validar que haya al menos un concepto (requerido por CFDI 4.0)
    if (!doc.items || doc.items.length === 0) {
      throw new BadRequestException(
        'El documento debe contener al menos un concepto para ser timbrado.',
      );
    }

    // Calcular importes por ítem
    const conceptos: Concepto[] = (doc.items as any[]).map((item, idx) => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);

      if (!qty || qty <= 0 || isNaN(qty)) {
        throw new BadRequestException(
          `Concepto ${idx + 1} ("${item.description}"): la cantidad debe ser un número positivo.`,
        );
      }
      if (isNaN(price) || price < 0) {
        throw new BadRequestException(
          `Concepto ${idx + 1} ("${item.description}"): el precio unitario no puede ser negativo.`,
        );
      }

      const cantidad = fmt(qty, 6);
      const valorUnitario = fmt(price, 6);
      const importe = fmt(item.subtotal ?? qty * price);
      const base = importe;
      const tasa = '0.160000';
      const ivaImporte = fmt(parseFloat(base) * 0.16);

      return {
        claveProdServ: item.satCode || '01010101',
        noIdentificacion: item.productId || undefined,
        cantidad,
        claveUnidad: item.unit || 'H87',
        unidad: item.unitName || undefined,
        descripcion: item.description,
        valorUnitario,
        importe,
        descuento: item.discount ? fmt(item.discount) : undefined,
        objetoImp: '02',
        traslados: [{ base, impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: tasa, importe: ivaImporte }],
        retenciones: [],
      };
    });

    // Totales globales de impuestos
    const totalTrasladados = conceptos.reduce(
      (sum, c) => sum + c.traslados.reduce((s, t) => s + parseFloat(t.importe), 0),
      0,
    );

    const subTotal = doc.subtotal
      ? fmt(doc.subtotal)
      : fmt(conceptos.reduce((s, c) => s + parseFloat(c.importe), 0));

    const total = doc.total
      ? fmt(doc.total)
      : fmt(parseFloat(subTotal) + totalTrasladados);

    const codigoPostal =
      company.address?.match(/\b\d{5}\b/)?.[0] || '01000';

    return {
      version: '4.0',
      serie: doc.serie || undefined,
      folio: doc.folio || undefined,
      fecha,
      formaPago: doc.paymentForm || '01',
      noCertificado: cert.serialNumber,
      condicionesDePago: doc.condicionesDePago || undefined,
      subTotal,
      descuento: undefined, // TODO: agregar si aplica
      moneda,
      tipoCambio: moneda !== 'MXN' ? fmt(doc.exchangeRate || 1, 6) : undefined,
      total,
      tipoDeComprobante,
      exportacion: '01',
      metodoPago: doc.paymentMethod || 'PUE',
      lugarExpedicion: codigoPostal,
      confirmacion: undefined,
      emisor: {
        rfc: company.rfc,
        nombre: company.name.toUpperCase(),
        regimenFiscal: company.regimenFiscal || '601',
      },
      receptor: {
        rfc: receptorRfc,
        nombre: receptorNombre,
        domicilioFiscalReceptor:
          doc.receptorZip || doc.client?.address?.match(/\b\d{5}\b/)?.[0] || '01000',
        regimenFiscalReceptor: doc.receptorRegimen || '616',
        usoCFDI: doc.cfdiUse || 'G03',
      },
      conceptos,
      impuestos: {
        totalRetenidos: undefined,
        totalTrasladados: fmt(totalTrasladados),
        retenciones: [],
        traslados: [
          {
            base: subTotal,
            impuesto: '002',
            tipoFactor: 'Tasa',
            tasaOCuota: '0.160000',
            importe: fmt(totalTrasladados),
          },
        ],
      },
    };
  }

  // ── XML pre-timbrado ─────────────────────────────────────────────────────────

  private buildXml(c: ComprobanteData, sello: string, cerBase64: string): string {
    const certContent = cerBase64.replace(/\s/g, '').replace(/-----[^-]+-----/g, '');
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8' },
      renderOpts: { pretty: false },
    });

    const obj: any = {
      'cfdi:Comprobante': {
        $: {
          'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation':
            'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd',
          Version: c.version,
          ...(c.serie && { Serie: c.serie }),
          ...(c.folio && { Folio: c.folio }),
          Fecha: c.fecha,
          Sello: sello,
          ...(c.formaPago && { FormaPago: c.formaPago }),
          NoCertificado: c.noCertificado,
          Certificado: certContent,
          ...(c.condicionesDePago && { CondicionesDePago: c.condicionesDePago }),
          SubTotal: c.subTotal,
          Moneda: c.moneda,
          ...(c.tipoCambio && { TipoCambio: c.tipoCambio }),
          Total: c.total,
          TipoDeComprobante: c.tipoDeComprobante,
          Exportacion: c.exportacion,
          ...(c.metodoPago && { MetodoPago: c.metodoPago }),
          LugarExpedicion: c.lugarExpedicion,
        },
        'cfdi:Emisor': {
          $: {
            Rfc: c.emisor.rfc,
            Nombre: c.emisor.nombre,
            RegimenFiscal: c.emisor.regimenFiscal,
          },
        },
        'cfdi:Receptor': {
          $: {
            Rfc: c.receptor.rfc,
            Nombre: c.receptor.nombre,
            DomicilioFiscalReceptor: c.receptor.domicilioFiscalReceptor,
            RegimenFiscalReceptor: c.receptor.regimenFiscalReceptor,
            UsoCFDI: c.receptor.usoCFDI,
          },
        },
        'cfdi:Conceptos': {
          'cfdi:Concepto': c.conceptos.map((item) => ({
            $: {
              ClaveProdServ: item.claveProdServ,
              ...(item.noIdentificacion && { NoIdentificacion: item.noIdentificacion }),
              Cantidad: item.cantidad,
              ClaveUnidad: item.claveUnidad,
              ...(item.unidad && { Unidad: item.unidad }),
              Descripcion: item.descripcion,
              ValorUnitario: item.valorUnitario,
              Importe: item.importe,
              ...(item.descuento && { Descuento: item.descuento }),
              ObjetoImp: item.objetoImp,
            },
            ...(item.traslados.length > 0 && {
              'cfdi:Impuestos': {
                'cfdi:Traslados': {
                  'cfdi:Traslado': item.traslados.map((t) => ({
                    $: {
                      Base: t.base,
                      Impuesto: t.impuesto,
                      TipoFactor: t.tipoFactor,
                      TasaOCuota: t.tasaOCuota,
                      Importe: t.importe,
                    },
                  })),
                },
              },
            }),
          })),
        },
        'cfdi:Impuestos': {
          $: {
            ...(c.impuestos.totalRetenidos && {
              TotalImpuestosRetenidos: c.impuestos.totalRetenidos,
            }),
            ...(c.impuestos.totalTrasladados && {
              TotalImpuestosTrasladados: c.impuestos.totalTrasladados,
            }),
          },
          ...(c.impuestos.traslados.length > 0 && {
            'cfdi:Traslados': {
              'cfdi:Traslado': c.impuestos.traslados.map((t) => ({
                $: {
                  Base: t.base,
                  Impuesto: t.impuesto,
                  TipoFactor: t.tipoFactor,
                  TasaOCuota: t.tasaOCuota,
                  Importe: t.importe,
                },
              })),
            },
          }),
        },
      },
    };

    return builder.buildObject(obj);
  }

  // ── URL helpers ──────────────────────────────────────────────────────────────

  private resolveStampUrl(configuredUrl: string | null, isTestMode: boolean): string {
    if (isTestMode) {
      return 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl';
    }
    if (configuredUrl && !configuredUrl.includes('demo-')) {
      return configuredUrl;
    }
    return 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl';
  }
}
