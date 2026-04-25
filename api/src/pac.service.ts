import { Injectable, Logger } from '@nestjs/common';
import * as xml2js from 'xml2js';

export interface StampingResponse {
  success: boolean;
  uuid?: string;
  stampingDate?: Date;
  satSeal?: string;
  xml?: string;
  error?: string;
}

export interface TestConnectionResponse {
  success: boolean;
  error?: string;
  credits?: string;
}

@Injectable()
export abstract class PacService {
  abstract stamp(
    xmlBase64: string,
    username: string,
    password: string,
    url: string,
  ): Promise<StampingResponse>;

  abstract testConnection(
    username: string,
    password: string,
    url: string,
  ): Promise<TestConnectionResponse>;
}

// ─── Finkok implementation ────────────────────────────────────────────────────

const FINKOK_URLS = {
  test: {
    stamp: 'https://demo-facturacion.finkok.com/servicios/soap/stamp',
    utilities: 'https://demo-facturacion.finkok.com/servicios/soap/utilities',
  },
  prod: {
    stamp: 'https://facturacion.finkok.com/servicios/soap/stamp',
    utilities: 'https://facturacion.finkok.com/servicios/soap/utilities',
  },
};

@Injectable()
export class FinkokService extends PacService {
  private readonly logger = new Logger(FinkokService.name);

  // ── Determinar si una URL apunta al sandbox ──────────────────────────────────

  private isTestUrl(url: string): boolean {
    return !url || url.includes('demo-') || url.includes('demo.');
  }

  // ── Resolver endpoint SOAP a partir de la URL configurada por el usuario ─────
  // El usuario puede configurar la URL con o sin .wsdl — normalizamos aquí.

  private resolveEndpoint(configuredUrl: string, service: 'stamp' | 'utilities'): string {
    const isTest = this.isTestUrl(configuredUrl);
    return isTest ? FINKOK_URLS.test[service] : FINKOK_URLS.prod[service];
  }

  // ── Probar conexión con la cuenta Finkok ────────────────────────────────────
  // Usa el servicio "Utilities" (get_credit) — independiente del servicio de timbrado.

  async testConnection(
    username: string,
    password: string,
    url: string,
  ): Promise<TestConnectionResponse> {
    const endpoint = this.resolveEndpoint(url, 'utilities');
    this.logger.log(`Probando conexión Finkok (utilities): ${endpoint}`);

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:util="http://facturacion.finkok.com/utilities">
  <soapenv:Header/>
  <soapenv:Body>
    <util:get_credit>
      <util:username>${username}</util:username>
      <util:password>${password}</util:password>
    </util:get_credit>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'get_credit',
        },
        body: soapEnvelope,
        signal: AbortSignal.timeout(12000),
      });

      const xmlText = await response.text();
      this.logger.debug(`Respuesta utilities Finkok: ${xmlText.substring(0, 300)}`);

      const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
      const result = await parser.parseStringPromise(xmlText);

      // Finkok puede responder con distintos prefijos de namespace
      const body =
        result?.['soap:Envelope']?.['soap:Body'] ??
        result?.['soapenv:Envelope']?.['soapenv:Body'] ??
        result?.Envelope?.Body ??
        result?.['S:Envelope']?.['S:Body'];

      if (!body) {
        this.logger.error(`Respuesta SOAP no reconocida (${response.status}): ${xmlText.substring(0, 800)}`);
        return { success: false, error: `Respuesta no reconocida (${response.status}): ${xmlText.substring(0, 150)}` };
      }

      // Verificar SOAP Fault (error de transporte/autenticación)
      const fault = body?.Fault ?? body?.['soap:Fault'];
      if (fault) {
        const reason = fault.faultstring ?? fault.Reason?.Text ?? 'Error desconocido del servidor.';
        return { success: false, error: String(reason) };
      }

      // Navegar al resultado de get_credit (el prefijo puede variar)
      const creditResponse =
        body?.get_creditResponse ??
        body?.['ns2:get_creditResponse'] ??
        body?.['util:get_creditResponse'];

      const creditResult =
        creditResponse?.get_creditResult ?? creditResponse?.['ns2:get_creditResult'];

      if (creditResult === undefined || creditResult === null) {
        return { success: false, error: 'No se pudo leer la respuesta de créditos del PAC.' };
      }

      // Finkok devuelve -1 o un mensaje de error cuando las credenciales son incorrectas
      const creditStr =
        typeof creditResult === 'object' ? creditResult._ ?? JSON.stringify(creditResult) : String(creditResult);

      if (creditStr === '-1' || creditStr.toLowerCase().includes('error')) {
        return { success: false, error: `Credenciales incorrectas o cuenta no válida: ${creditStr}` };
      }

      return { success: true, credits: creditStr };
    } catch (error) {
      this.logger.error(`Error en testConnection: ${error.message}`);
      // Capturamos el texto si está disponible
      return { success: false, error: `No se pudo conectar con Finkok: ${error.message}`, credits: 'Error' };
    }
  }

  // ── Timbrar CFDI ─────────────────────────────────────────────────────────────

  async stamp(
    xmlBase64: string,
    username: string,
    password: string,
    url: string,
  ): Promise<StampingResponse> {
    const endpoint = this.resolveEndpoint(url, 'stamp');
    this.logger.log(`Timbrado Finkok → ${endpoint}`);

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:stag="http://facturacion.finkok.com/stamp">
  <soapenv:Header/>
  <soapenv:Body>
    <stag:stamp>
      <stag:xml>${xmlBase64}</stag:xml>
      <stag:username>${username}</stag:username>
      <stag:password>${password}</stag:password>
    </stag:stamp>
  </soapenv:Body>
</soapenv:Envelope>`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: 'stamp',
        },
        body: soapEnvelope,
        signal: AbortSignal.timeout(30000),
      });

      const xmlText = await response.text();

      if (!response.ok) {
        this.logger.error(`HTTP ${response.status} del PAC: ${xmlText.substring(0, 200)}`);
        return { success: false, error: `Error HTTP ${response.status} del servidor PAC.` };
      }

      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlText);

      const body =
        result?.['soap:Envelope']?.['soap:Body'] ??
        result?.['soapenv:Envelope']?.['soapenv:Body'] ??
        result?.Envelope?.Body;

      // SOAP Fault
      const fault = body?.Fault ?? body?.['soap:Fault'];
      if (fault) {
        const msg = fault.faultstring ?? 'Error SOAP del PAC.';
        return { success: false, error: String(msg) };
      }

      const stampResult =
        body?.stampResponse?.stampResult ?? 
        body?.['ns2:stampResponse']?.['ns2:stampResult'] ??
        body?.['tns:stampResponse']?.['tns:stampResult'] ??
        body?.['ns1:stampResponse']?.['ns1:stampResult'];

      if (!stampResult) {
        this.logger.error(`Respuesta de timbrado no reconocida (Body keys: ${Object.keys(body).join(', ')}): ${xmlText.substring(0, 800)}`);
        return { success: false, error: 'Respuesta inválida o rechazo de autenticación del servidor PAC.' };
      }

      // Incidencias = errores de negocio del PAC
      if (stampResult.Incidencias) {
        const items = Array.isArray(stampResult.Incidencias.Incidencia)
          ? stampResult.Incidencias.Incidencia
          : [stampResult.Incidencias.Incidencia];
        const msg = items
          .map((i: any) => `[${i.CodigoError}] ${i.MensajeIncidencia}`)
          .join(' | ');
        this.logger.warn(`Incidencias Finkok: ${msg}`);
        return { success: false, error: msg };
      }

      const uuid = stampResult.UUID;
      if (!uuid) {
        return { success: false, error: 'El PAC no retornó un UUID válido.' };
      }

      return {
        success: true,
        uuid,
        xml: stampResult.xml ?? stampResult.Xml,
        stampingDate: stampResult.Fecha ? new Date(stampResult.Fecha) : new Date(),
        satSeal: stampResult.SatSeal ?? '',
      };
    } catch (error) {
      this.logger.error(`Error en stamp: ${error.message}`);
      return { success: false, error: `Error de conexión con el PAC: ${error.message}` };
    }
  }
}
