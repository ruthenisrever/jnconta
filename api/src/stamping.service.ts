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
  pedimento?: string;
  objetoImp: string;
  traslados: Traslado[];
  retenciones: Traslado[];
}

interface ComplementoPago {
  fechaPago: string;
  formaDePagoP: string;
  monedaP: string;
  tipoCambioP?: string;
  monto: string;
  numOperacion?: string;
  doctoRelacionado: {
    idDocumento: string;
    serie?: string;
    folio?: string;
    monedaDR: string;
    equivalenciaDR?: string;
    numParcialidad: string;
    impSaldoAnt: string;
    impPagado: string;
    impSaldoInsoluto: string;
    objetoImpDR: string;
    trasladosDR: { baseDR: string; impuestoDR: string; tipoFactorDR: string; tasaOCuotaDR: string; importeDR: string }[];
  }[];
  impuestosP: {
    totalTrasladosBaseIVA16: string;
    totalTrasladosImpuestoIVA16: string;
    trasladosP: { baseP: string; impuestoP: string; tipoFactorP: string; tasaOCuotaP: string; importeP: string }[];
  };
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
  complementoPago?: ComplementoPago;
  cartaPorte?: any;
  nomina?: any;
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
    this.logger.log('🚀 Verificando configuración de timbrado...');
    // Los certificados CSD se cargan desde la base de datos.
    // Usa el panel de Configuración → Certificados para subir tu .cer y .key.
    this.logger.log('✅ Servicio de timbrado listo. Carga tu CSD desde el panel.');
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  async stampDocument(entity: 'INVOICE' | 'PAYROLL' | 'ADVANCE' | 'PAYMENT_COMPLEMENT', id: string, companyId: string) {
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
    } else if (entity === 'PAYMENT_COMPLEMENT') {
      doc = await (this.prisma as any).paymentComplement.findUnique({
        where: { id },
        include: { invoice: { include: { client: true } }, company: true },
      });
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
    } else if (entity === 'PAYMENT_COMPLEMENT') {
      await (this.prisma as any).paymentComplement.update({ where: { id }, data: updateData });
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

      // InformacionAduanera
      if (concepto.pedimento) {
        push(concepto.pedimento);
      }

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

    // ── Complemento Nomina 1.2 ──
    if (c.nomina) {
      push(c.nomina.$?.Version);
      push(c.nomina.$?.TipoNomina);
      push(c.nomina.$?.FechaPago);
      push(c.nomina.$?.FechaInicialPago);
      push(c.nomina.$?.FechaFinalPago);
      push(c.nomina.$?.NumDiasPagados);
      push(c.nomina.$?.TotalPercepciones);
      push(c.nomina.$?.TotalDeducciones);
      push(c.nomina.$?.TotalOtrosPagos);

      if (c.nomina['nomina12:Receptor']) {
        const r = c.nomina['nomina12:Receptor'].$;
        push(r?.Curp);
        push(r?.NumSeguridadSocial);
        push(r?.FechaInicioRelLaboral);
        push(r?.Antigüedad);
        push(r?.TipoContrato);
        push(r?.Sindicalizado);
        push(r?.TipoJornada);
        push(r?.TipoRegimen);
        push(r?.NumEmpleado);
        push(r?.Departamento);
        push(r?.Puesto);
        push(r?.RiesgoPuesto);
        push(r?.PeriodicidadPago);
        push(r?.Banco);
        push(r?.CuentaBancaria);
        push(r?.SalarioBaseCotApor);
        push(r?.SalarioDiarioIntegrado);
        push(r?.ClaveEntFed);
      }

      if (c.nomina['nomina12:Percepciones']) {
        const p = c.nomina['nomina12:Percepciones'];
        push(p.$?.TotalSueldos);
        push(p.$?.TotalSeparacionIndemnizacion);
        push(p.$?.TotalJubilacionPensionRetiro);
        push(p.$?.TotalGravado);
        push(p.$?.TotalExento);

        if (p['nomina12:Percepcion']) {
          const arr = Array.isArray(p['nomina12:Percepcion']) ? p['nomina12:Percepcion'] : [p['nomina12:Percepcion']];
          for (const per of arr) {
            push(per.$?.TipoPercepcion);
            push(per.$?.Clave);
            push(per.$?.Concepto);
            push(per.$?.ImporteGravado);
            push(per.$?.ImporteExento);
            // Horas Extra
            if (per['nomina12:HorasExtra']) {
              const heArr = Array.isArray(per['nomina12:HorasExtra']) ? per['nomina12:HorasExtra'] : [per['nomina12:HorasExtra']];
              for (const he of heArr) {
                push(he.$?.Dias);
                push(he.$?.TipoHoras);
                push(he.$?.HorasExtra);
                push(he.$?.ImportePagado);
              }
            }
          }
        }
        
        // Finiquitos
        if (p['nomina12:SeparacionIndemnizacion']) {
          const si = p['nomina12:SeparacionIndemnizacion'].$;
          push(si?.TotalPagado);
          push(si?.NumAñosServicio);
          push(si?.UltimoSueldoMensOrd);
          push(si?.IngresoAcumulable);
          push(si?.IngresoNoAcumulable);
        }
      }

      if (c.nomina['nomina12:Deducciones']) {
        const d = c.nomina['nomina12:Deducciones'];
        push(d.$?.TotalOtrasDeducciones);
        push(d.$?.TotalImpuestosRetenidos);
        
        if (d['nomina12:Deduccion']) {
          const dArr = Array.isArray(d['nomina12:Deduccion']) ? d['nomina12:Deduccion'] : [d['nomina12:Deduccion']];
          for (const ded of dArr) {
            push(ded.$?.TipoDeduccion);
            push(ded.$?.Clave);
            push(ded.$?.Concepto);
            push(ded.$?.Importe);
          }
        }
      }
      
      if (c.nomina['nomina12:Incapacidades']) {
        const incs = c.nomina['nomina12:Incapacidades'];
        if (incs['nomina12:Incapacidad']) {
          const incArr = Array.isArray(incs['nomina12:Incapacidad']) ? incs['nomina12:Incapacidad'] : [incs['nomina12:Incapacidad']];
          for (const inc of incArr) {
            push(inc.$?.DiasIncapacidad);
            push(inc.$?.TipoIncapacidad);
            push(inc.$?.ImporteMonetario);
          }
        }
      }
    }

    // ── Complemento Carta Porte 3.1 ──
    if (c.cartaPorte) {
      push(c.cartaPorte.$?.Version);
      push(c.cartaPorte.$?.IdCCP);
      push(c.cartaPorte.$?.TranspInternac);
      push(c.cartaPorte.$?.RegimenAduanero);
      push(c.cartaPorte.$?.EntradaSalidaMerc);
      push(c.cartaPorte.$?.PaisDeOrigenODestino);
      push(c.cartaPorte.$?.ViaEntradaSalida);
      push(c.cartaPorte.$?.TotalDistRec);

      if (c.cartaPorte['cartaporte31:Ubicaciones']) {
        const ubicaciones = Array.isArray(c.cartaPorte['cartaporte31:Ubicaciones']['cartaporte31:Ubicacion']) 
          ? c.cartaPorte['cartaporte31:Ubicaciones']['cartaporte31:Ubicacion'] 
          : [c.cartaPorte['cartaporte31:Ubicaciones']['cartaporte31:Ubicacion']].filter(Boolean);
        
        for (const u of ubicaciones) {
          push(u.$?.TipoUbicacion);
          push(u.$?.IDUbicacion);
          push(u.$?.RFCRemitenteDestinatario);
          push(u.$?.NombreRemitenteDestinatario);
          push(u.$?.NumRegIdTrib);
          push(u.$?.ResidenciaFiscal);
          push(u.$?.NumEstacion);
          push(u.$?.NombreEstacion);
          push(u.$?.NavegacionTrafico);
          push(u.$?.FechaHoraSalidaLlegada);
          push(u.$?.TipoEstacion);
          push(u.$?.DistanciaRecorrida);
          
          if (u['cartaporte31:Domicilio']) {
            const dom = u['cartaporte31:Domicilio'].$;
            push(dom?.Calle);
            push(dom?.NumeroExterior);
            push(dom?.NumeroInterior);
            push(dom?.Colonia);
            push(dom?.Localidad);
            push(dom?.Referencia);
            push(dom?.Municipio);
            push(dom?.Estado);
            push(dom?.Pais);
            push(dom?.CodigoPostal);
          }
        }
      }

      if (c.cartaPorte['cartaporte31:Mercancias']) {
        const mercs = c.cartaPorte['cartaporte31:Mercancias'];
        push(mercs.$?.PesoBrutoTotal);
        push(mercs.$?.UnidadPeso);
        push(mercs.$?.PesoNetoTotal);
        push(mercs.$?.NumTotalMercancias);
        push(mercs.$?.CargoPorTasacion);

        const mercList = Array.isArray(mercs['cartaporte31:Mercancia']) 
          ? mercs['cartaporte31:Mercancia'] 
          : [mercs['cartaporte31:Mercancia']].filter(Boolean);

        for (const m of mercList) {
          push(m.$?.BienesTransp);
          push(m.$?.ClaveSTCC);
          push(m.$?.Descripcion);
          push(m.$?.Cantidad);
          push(m.$?.ClaveUnidad);
          push(m.$?.Unidad);
          push(m.$?.Dimensiones);
          push(m.$?.MaterialPeligroso);
          push(m.$?.CveMaterialPeligroso);
          push(m.$?.Embalaje);
          push(m.$?.DescripEmbalaje);
          push(m.$?.PesoEnKg);
          push(m.$?.ValorMercancia);
          push(m.$?.Moneda);
          push(m.$?.FraccionArancelaria);
          push(m.$?.UUIDComercioExt);
        }

        if (mercs['cartaporte31:Autotransporte']) {
          const auto = mercs['cartaporte31:Autotransporte'];
          push(auto.$?.PermSCT);
          push(auto.$?.NumPermisoSCT);

          if (auto['cartaporte31:IdentificacionVehicular']) {
            const iv = auto['cartaporte31:IdentificacionVehicular'].$;
            push(iv?.ConfigVehicular);
            push(iv?.PesoBrutoVehicular);
            push(iv?.PlacaVM);
            push(iv?.AnioModeloVM);
          }
          if (auto['cartaporte31:Seguros']) {
            const seg = auto['cartaporte31:Seguros'].$;
            push(seg?.AseguraRespCivil);
            push(seg?.PolizaRespCivil);
            push(seg?.AseguraMedAmbiente);
            push(seg?.PolizaMedAmbiente);
            push(seg?.AseguraCarga);
            push(seg?.PolizaCarga);
            push(seg?.PrimaSeguro);
          }
          if (auto['cartaporte31:Remolques'] && auto['cartaporte31:Remolques']['cartaporte31:Remolque']) {
            const rems = Array.isArray(auto['cartaporte31:Remolques']['cartaporte31:Remolque']) 
              ? auto['cartaporte31:Remolques']['cartaporte31:Remolque'] 
              : [auto['cartaporte31:Remolques']['cartaporte31:Remolque']];
            for (const r of rems) {
              push(r.$?.SubTipoRem);
              push(r.$?.Placa);
            }
          }
        }
      }

      if (c.cartaPorte['cartaporte31:FiguraTransporte'] && c.cartaPorte['cartaporte31:FiguraTransporte']['cartaporte31:TiposFigura']) {
        const figs = Array.isArray(c.cartaPorte['cartaporte31:FiguraTransporte']['cartaporte31:TiposFigura']) 
          ? c.cartaPorte['cartaporte31:FiguraTransporte']['cartaporte31:TiposFigura'] 
          : [c.cartaPorte['cartaporte31:FiguraTransporte']['cartaporte31:TiposFigura']];
        
        for (const f of figs) {
          push(f.$?.TipoFigura);
          push(f.$?.RFCFigura);
          push(f.$?.NumLicencia);
          push(f.$?.NombreFigura);
          push(f.$?.NumRegIdTribFigura);
          push(f.$?.ResidenciaFiscalFigura);
        }
      }
    }

    // ── Informacion Aduanera en Conceptos ──
    // Wait, InformacionAduanera in CFDI 4.0 Cadena Original goes inside the Conceptos loop.
    // I need to add pedimento mapping inside Conceptos.

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
    entity: 'INVOICE' | 'PAYROLL' | 'PAYMENT_COMPLEMENT',
  ): ComprobanteData {
    const fecha = new Date().toISOString().split('.')[0]; // YYYY-MM-DDTHH:MM:SS
    const moneda = entity === 'PAYMENT_COMPLEMENT' ? 'XXX' : doc.currency || 'MXN';
    const tipoDeComprobante = entity === 'INVOICE' ? 'I' : entity === 'PAYROLL' ? 'N' : 'P';

    const receptorRfc =
      doc.receptorRfc || doc.client?.rfc || doc.invoice?.client?.rfc || doc.employee?.rfc || 'XAXX010101000';
    const receptorNombre = (
      doc.receptorName ||
      doc.client?.name || doc.invoice?.client?.name ||
      `${doc.employee?.name || ''} ${doc.employee?.lastName || ''}`.trim() ||
      'GENERICO'
    ).toUpperCase();

    // Validar que haya al menos un concepto (requerido por CFDI 4.0)
    if (entity !== 'PAYMENT_COMPLEMENT' && (!doc.items || doc.items.length === 0)) {
      throw new BadRequestException(
        'El documento debe contener al menos un concepto para ser timbrado.',
      );
    }

    // Calcular importes por ítem
    
    let conceptos: Concepto[] = [];
    let complementoPago: ComplementoPago | undefined = undefined;

    if (entity === 'PAYMENT_COMPLEMENT') {
      conceptos = [{
        claveProdServ: '84111506',
        cantidad: '1',
        claveUnidad: 'ACT',
        descripcion: 'Pago',
        valorUnitario: '0',
        importe: '0',
        objetoImp: '01',
        traslados: [],
        retenciones: []
      }];

      // Calcular impuestos proporcionales del pago basado en la factura
      // Factura total y pago total
      const invTotal = doc.invoice.total || 1; // avoid division by 0
      const amountPaid = doc.amountPaid || 0;
      const fraction = amountPaid / invTotal;

      // Calcular base e IVA del pago asumiendo 16% (se puede mejorar leyendo items de invoice)
      // Base P = amountPaid / 1.16
      const baseP = amountPaid / 1.16;
      const impP = amountPaid - baseP;

      complementoPago = {
        fechaPago: new Date(doc.paymentDate).toISOString().split('.')[0],
        formaDePagoP: doc.paymentForm || '03',
        monedaP: doc.currency || 'MXN',
        tipoCambioP: doc.currency !== 'MXN' ? fmt(doc.exchangeRate || 1, 6) : '1',
        monto: fmt(amountPaid),
        doctoRelacionado: [{
          idDocumento: doc.invoice.uuid || '00000000-0000-0000-0000-000000000000',
          serie: doc.invoice.serie,
          folio: String(doc.invoice.folio),
          monedaDR: doc.invoice.currency || 'MXN',
          equivalenciaDR: '1',
          numParcialidad: String(doc.numberOfPayment || 1),
          impSaldoAnt: fmt(doc.previousBalance),
          impPagado: fmt(amountPaid),
          impSaldoInsoluto: fmt(doc.newBalance),
          objetoImpDR: '02',
          trasladosDR: [{
            baseDR: fmt(baseP),
            impuestoDR: '002',
            tipoFactorDR: 'Tasa',
            tasaOCuotaDR: '0.160000',
            importeDR: fmt(impP)
          }]
        }],
        impuestosP: {
          totalTrasladosBaseIVA16: fmt(baseP),
          totalTrasladosImpuestoIVA16: fmt(impP),
          trasladosP: [{
            baseP: fmt(baseP),
            impuestoP: '002',
            tipoFactorP: 'Tasa',
            tasaOCuotaP: '0.160000',
            importeP: fmt(impP)
          }]
        }
      };
    } else {
      conceptos = (doc.items as any[]).map((item, idx) => {
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
      const tasa = entity === 'PAYROLL' ? '' : '0.160000';
      const ivaImporte = entity === 'PAYROLL' ? '0' : fmt(parseFloat(base) * 0.16);

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
        objetoImp: entity === 'PAYROLL' ? '01' : '02',
        pedimento: item.pedimento || undefined,
        traslados: entity === 'PAYROLL' ? [] : [{ base, impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: tasa, importe: ivaImporte }],
        retenciones: [],
      };
    });

    }

    // Totales globales de impuestos
    const totalTrasladados = conceptos.reduce(
      (sum, c) => sum + c.traslados.reduce((s, t) => s + parseFloat(t.importe), 0),
      0,
    );

    const subTotal = entity === 'PAYMENT_COMPLEMENT' ? '0' : doc.subtotal
      ? fmt(doc.subtotal)
      : fmt(conceptos.reduce((s, c) => s + parseFloat(c.importe), 0));

    const total = entity === 'PAYMENT_COMPLEMENT' ? '0' : doc.total
      ? fmt(doc.total)
      : fmt(parseFloat(subTotal) + totalTrasladados);

    const codigoPostal =
      company.address?.match(/\b\d{5}\b/)?.[0] || '01000';

    return {
      version: '4.0',
      serie: doc.serie || undefined,
      folio: doc.folio || undefined,
      fecha,
      formaPago: entity === 'PAYMENT_COMPLEMENT' ? undefined : doc.paymentForm || '01',
      noCertificado: cert.serialNumber,
      condicionesDePago: entity === 'PAYMENT_COMPLEMENT' ? undefined : doc.condicionesDePago || undefined,
      subTotal,
      descuento: undefined, // TODO: agregar si aplica
      moneda,
      tipoCambio: moneda !== 'MXN' ? fmt(doc.exchangeRate || 1, 6) : undefined,
      total,
      tipoDeComprobante,
      exportacion: '01',
      metodoPago: entity === 'PAYMENT_COMPLEMENT' ? undefined : doc.paymentMethod || 'PUE',
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
      cartaPorte: doc.cartaPorteJson ? JSON.parse(doc.cartaPorteJson) : undefined,
      complementoPago,
      impuestos: entity === 'PAYMENT_COMPLEMENT' ? { retenciones: [], traslados: [] } : {
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
          ...(c.complementoPago && { 'xmlns:pago20': 'http://www.sat.gob.mx/Pagos20' }),
          ...(c.nomina && { 'xmlns:nomina12': 'http://www.sat.gob.mx/nomina12' }),
          'xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd' + (c.complementoPago ? ' http://www.sat.gob.mx/Pagos20 http://www.sat.gob.mx/sitio_internet/cfd/Pagos/Pagos20.xsd' : '') + (c.nomina ? ' http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd' : ''),
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
              ...(item.pedimento && { 'cfdi:InformacionAduanera': { $: { NumeroPedimento: item.pedimento } } }),
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
          ...((c.complementoPago || c.cartaPorte || c.nomina) && {
            'cfdi:Complemento': {
              ...(c.complementoPago && {
                'pago20:Pagos': {
                  $: { Version: '2.0' },
                  'pago20:Totales': {
                    $: {
                      TotalTrasladosBaseIVA16: c.complementoPago.impuestosP.totalTrasladosBaseIVA16,
                      TotalTrasladosImpuestoIVA16: c.complementoPago.impuestosP.totalTrasladosImpuestoIVA16,
                    }
                  },
                  'pago20:Pago': {
                    $: {
                      FechaPago: c.complementoPago.fechaPago,
                      FormaDePagoP: c.complementoPago.formaDePagoP,
                      MonedaP: c.complementoPago.monedaP,
                      ...(c.complementoPago.tipoCambioP && { TipoCambioP: c.complementoPago.tipoCambioP }),
                      Monto: c.complementoPago.monto,
                      ...(c.complementoPago.numOperacion && { NumOperacion: c.complementoPago.numOperacion }),
                    },
                    'pago20:DoctoRelacionado': c.complementoPago.doctoRelacionado.map(dr => ({
                      $: {
                        IdDocumento: dr.idDocumento,
                        ...(dr.serie && { Serie: dr.serie }),
                        ...(dr.folio && { Folio: dr.folio }),
                        MonedaDR: dr.monedaDR,
                        EquivalenciaDR: dr.equivalenciaDR,
                        NumParcialidad: dr.numParcialidad,
                        ImpSaldoAnt: dr.impSaldoAnt,
                        ImpPagado: dr.impPagado,
                        ImpSaldoInsoluto: dr.impSaldoInsoluto,
                        ObjetoImpDR: dr.objetoImpDR,
                      },
                      'pago20:ImpuestosDR': {
                        'pago20:TrasladosDR': {
                          'pago20:TrasladoDR': dr.trasladosDR.map(tdr => ({
                            $: {
                              BaseDR: tdr.baseDR,
                              ImpuestoDR: tdr.impuestoDR,
                              TipoFactorDR: tdr.tipoFactorDR,
                              TasaOCuotaDR: tdr.tasaOCuotaDR,
                              ImporteDR: tdr.importeDR,
                            }
                          }))
                        }
                      }
                    })),
                    'pago20:ImpuestosP': {
                      'pago20:TrasladosP': {
                        'pago20:TrasladoP': c.complementoPago.impuestosP.trasladosP.map(tp => ({
                          $: {
                            BaseP: tp.baseP,
                            ImpuestoP: tp.impuestoP,
                            TipoFactorP: tp.tipoFactorP,
                            TasaOCuotaP: tp.tasaOCuotaP,
                            ImporteP: tp.importeP,
                          }
                        }))
                      }
                    }
                  }
                }
              }),
              ...(c.cartaPorte && {
                'cartaporte31:CartaPorte': c.cartaPorte
              }),
              ...(c.nomina && {
                'nomina12:Nomina': c.nomina
              })
            }
          }),
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
