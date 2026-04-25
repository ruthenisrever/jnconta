import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SatDescargaService } from './sat-descarga.service';
import * as xml2js from 'xml2js';

@Controller('sat-sync')
export class SatSyncController {
  constructor(
    private prisma: PrismaService,
    private satDescarga: SatDescargaService,
  ) {}

  @Post('execute')
  async executeSync(@Body() body: {
    companyId: string;
    fechaInicial?: string;
    fechaFinal?: string;
    tipoComprobante?: 'I' | 'E' | 'T' | 'N' | 'P';
    // Credenciales FIEL opcionales (sobreescriben las guardadas en la empresa)
    fielCert?: string;
    fielKey?: string;
    fielPassword?: string;
  }) {
    const { companyId } = body;
    if (!companyId) throw new BadRequestException('companyId requerido');

    const company = await (this.prisma as any).company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Empresa no encontrada');

    // Resolver credenciales FIEL (cuerpo > guardadas en empresa)
    const certB64 = body.fielCert || company.fielCert;
    const keyB64 = body.fielKey || company.fielKey;
    const pass = body.fielPassword || company.fielPassword;

    if (!certB64 || !keyB64 || !pass) {
      throw new BadRequestException(
        'Credenciales FIEL no configuradas. ' +
        'Proporciona fielCert (base64 del .cer), fielKey (base64 del .key) y fielPassword, ' +
        'o guárdalos en Configuración → Empresa → FIEL.',
      );
    }

    const now = new Date();
    const fechaFinal = body.fechaFinal ?? now.toISOString().split('T')[0];
    const fechaInicial = body.fechaInicial ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const fiel = { certBase64: certB64, keyBase64: keyB64, password: pass, rfc: company.rfc };

    const result = await this.satDescarga.ejecutarDescarga(fiel, {
      fechaInicial,
      fechaFinal,
      rfcReceptor: company.rfc,
      tipoSolicitud: 'CFDI',
      tipoComprobante: body.tipoComprobante,
    });

    if (!result.success) {
      throw new BadRequestException(result.error ?? 'Error al conectar con el SAT');
    }

    // Guardar XMLs descargados en la base de datos
    let saved = 0;
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });

    for (const rawXml of result.xmlFiles ?? []) {
      try {
        const parsed = await parser.parseStringPromise(rawXml);
        const comp =
          parsed?.['cfdi:Comprobante'] ??
          parsed?.Comprobante ??
          parsed?.['tfd:Comprobante'] ??
          {};
        const attrs = comp?.['$'] ?? {};
        const tfd = comp?.['cfdi:Complemento']?.['tfd:TimbreFiscalDigital']?.['$'] ?? {};

        const uuid = tfd?.UUID ?? attrs?.Folio;
        if (!uuid) continue;

        const existing = await this.prisma.xmlDocument.findFirst({ where: { uuid, companyId } });
        if (existing) continue;

        const emisorAttrs = comp?.['cfdi:Emisor']?.['$'] ?? {};
        const receptorAttrs = comp?.['cfdi:Receptor']?.['$'] ?? {};
        const tipo = company.rfc === emisorAttrs?.Rfc ? 'EMITIDA' : 'RECIBIDA';

        await this.prisma.xmlDocument.create({
          data: {
            uuid,
            type: tipo as any,
            status: 'PENDIENTE',
            satStatus: 'VIGENTE',
            emisorRfc: emisorAttrs?.Rfc ?? '',
            emisorName: emisorAttrs?.Nombre ?? '',
            receptorRfc: receptorAttrs?.Rfc ?? '',
            receptorName: receptorAttrs?.Nombre ?? '',
            subtotal: parseFloat(attrs?.SubTotal ?? '0'),
            tax: parseFloat(attrs?.Total ?? '0') - parseFloat(attrs?.SubTotal ?? '0'),
            total: parseFloat(attrs?.Total ?? '0'),
            currency: attrs?.Moneda ?? 'MXN',
            date: attrs?.Fecha ? new Date(attrs.Fecha) : new Date(),
            filename: `${uuid}.xml`,
            rawXml,
            company: { connect: { id: companyId } },
          },
        });
        saved++;
      } catch (e) {
        // XML malformado — ignorar
      }
    }

    return {
      success: true,
      message: result.error
        ? result.error  // solicitud en proceso
        : `Descarga completada. ${saved} CFDIs nuevos guardados.`,
      requestId: result.requestId,
      downloadedCount: saved,
      packages: result.packages?.length ?? 0,
    };
  }
}
