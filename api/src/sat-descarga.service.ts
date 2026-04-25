import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';

// ── SAT CFDI Descarga Masiva Webservice ──────────────────────────────────────
// Implementa el flujo completo de descarga: autenticar → solicitar → verificar → descargar
// Requiere FIEL (.cer + .key + contraseña) del contribuyente.

const SAT_AUTH_URL = 'https://cfdidescargamasivawb.sat.gob.mx/cfdidescargamasivaservice/descargamasiva.svc?wsdl';
const SAT_DOWNLOAD_URL = 'https://cfdidescargamasivawb.sat.gob.mx/cfdidescargamasivaservice/descargamasiva.svc';

export interface FielCredentials {
  certBase64: string;   // .cer en base64
  keyBase64: string;    // .key en base64 (cifrado con contraseña)
  password: string;     // contraseña del .key
  rfc: string;
}

export interface SatDescargaResult {
  success: boolean;
  requestId?: string;
  packages?: string[];
  xmlFiles?: string[];   // XMLs extraídos de los ZIPs
  error?: string;
}

@Injectable()
export class SatDescargaService {
  private readonly logger = new Logger(SatDescargaService.name);

  // ── Autenticación con FIEL ─────────────────────────────────────────────────
  async authenticate(fiel: FielCredentials): Promise<string> {
    const now = new Date();
    const created = now.toISOString().replace(/\.\d+Z$/, 'Z');
    const expires = new Date(now.getTime() + 5 * 60 * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
    const timestampId = `_0`;
    const tokenId = `uuid-${crypto.randomUUID()}`;

    // Timestamp canonicalizado (exc-c14n) para firmar
    const timestampC14n = `<u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" u:Id="${timestampId}"><u:Created>${created}</u:Created><u:Expires>${expires}</u:Expires></u:Timestamp>`;

    // Digest del timestamp
    const digestValue = crypto.createHash('sha256').update(timestampC14n, 'utf8').digest('base64');

    // SignedInfo canonicalizado
    const signedInfoC14n = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="#${timestampId}"><Transforms><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;

    // Firmar con la FIEL (RSA-SHA1)
    const signatureValue = this.signWithFiel(signedInfoC14n, fiel.keyBase64, fiel.password);

    const certB64Clean = fiel.certBase64.replace(/[\r\n\s]/g, '');

    const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <u:Timestamp u:Id="${timestampId}">
        <u:Created>${created}</u:Created>
        <u:Expires>${expires}</u:Expires>
      </u:Timestamp>
      <o:BinarySecurityToken u:Id="${tokenId}" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${certB64Clean}</o:BinarySecurityToken>
      <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignedInfo>
          <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
          <Reference URI="#${timestampId}">
            <Transforms><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/></Transforms>
            <DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
            <DigestValue>${digestValue}</DigestValue>
          </Reference>
        </SignedInfo>
        <SignatureValue>${signatureValue}</SignatureValue>
        <KeyInfo>
          <o:SecurityTokenReference>
            <o:Reference ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" URI="#${tokenId}"/>
          </o:SecurityTokenReference>
        </KeyInfo>
      </Signature>
    </o:Security>
  </s:Header>
  <s:Body>
    <Autenticar xmlns="http://DescargaMasivaTerceros.gob.mx"/>
  </s:Body>
</s:Envelope>`;

    const resp = await fetch(SAT_DOWNLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
      body: soapBody,
      signal: AbortSignal.timeout(30000),
    });

    const xml = await resp.text();
    this.logger.debug(`SAT auth response (first 400): ${xml.substring(0, 400)}`);

    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const result = await parser.parseStringPromise(xml);

    const body =
      result?.['s:Envelope']?.['s:Body'] ??
      result?.['S:Envelope']?.['S:Body'] ??
      result?.Envelope?.Body;

    const autenticarResp =
      body?.AutenticarResponse ??
      body?.['des:AutenticarResponse'];

    const token =
      autenticarResp?.AutenticarResult ??
      autenticarResp?.['des:AutenticarResult'];

    if (!token) {
      throw new BadRequestException(`SAT no devolvió token de autenticación. Respuesta: ${xml.substring(0, 300)}`);
    }
    return typeof token === 'object' ? token._ ?? String(token) : String(token);
  }

  // ── Solicitar descarga ─────────────────────────────────────────────────────
  async solicitar(token: string, fiel: FielCredentials, opts: {
    fechaInicial: string; fechaFinal: string;
    rfcEmisor?: string; rfcReceptor?: string;
    tipoSolicitud: 'CFDI' | 'Metadata';
    tipoComprobante?: 'I' | 'E' | 'T' | 'N' | 'P';
  }): Promise<string> {
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <o:Security xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <TokenSAT xmlns="http://DescargaMasivaTerceros.sat.gob.mx" TokenId="${token}"/>
    </o:Security>
  </s:Header>
  <s:Body>
    <SolicitaDescarga xmlns="http://DescargaMasivaTerceros.gob.mx">
      <solicitud RfcSolicitante="${fiel.rfc}"
        ${opts.rfcEmisor ? `RfcEmisor="${opts.rfcEmisor}"` : ''}
        ${opts.rfcReceptor ? `RfcReceptor="${opts.rfcReceptor}"` : ''}
        FechaInicial="${opts.fechaInicial}T00:00:00"
        FechaFinal="${opts.fechaFinal}T23:59:59"
        TipoSolicitud="${opts.tipoSolicitud}"
        ${opts.tipoComprobante ? `TipoComprobante="${opts.tipoComprobante}"` : ''}
        />
    </SolicitaDescarga>
  </s:Body>
</s:Envelope>`;

    const resp = await fetch(SAT_DOWNLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
      body: soap,
      signal: AbortSignal.timeout(30000),
    });

    const xml = await resp.text();
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const result = await parser.parseStringPromise(xml);
    const body = result?.['s:Envelope']?.['s:Body'] ?? result?.Envelope?.Body;
    const solResp = body?.SolicitaDescargaResponse ?? body?.['des:SolicitaDescargaResponse'];
    const solResult = solResp?.SolicitaDescargaResult ?? solResp?.['des:SolicitaDescargaResult'];

    const requestId = solResult?.['$']?.IdSolicitud ?? solResult?.IdSolicitud;
    if (!requestId) {
      const msg = solResult?.['$']?.Mensaje ?? solResult?.Mensaje ?? JSON.stringify(solResult);
      throw new BadRequestException(`SAT no aceptó la solicitud: ${msg}`);
    }
    return String(requestId);
  }

  // ── Verificar estado ────────────────────────────────────────────────────────
  async verificar(token: string, fiel: FielCredentials, requestId: string): Promise<{ state: string; packages: string[] }> {
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <o:Security xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <TokenSAT xmlns="http://DescargaMasivaTerceros.sat.gob.mx" TokenId="${token}"/>
    </o:Security>
  </s:Header>
  <s:Body>
    <VerificaSolicitudDescarga xmlns="http://DescargaMasivaTerceros.gob.mx">
      <solicitud IdSolicitud="${requestId}" RfcSolicitante="${fiel.rfc}"/>
    </VerificaSolicitudDescarga>
  </s:Body>
</s:Envelope>`;

    const resp = await fetch(SAT_DOWNLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
      body: soap,
      signal: AbortSignal.timeout(30000),
    });

    const xml = await resp.text();
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const result = await parser.parseStringPromise(xml);
    const body = result?.['s:Envelope']?.['s:Body'] ?? result?.Envelope?.Body;
    const verResp = body?.VerificaSolicitudDescargaResponse ?? body?.['des:VerificaSolicitudDescargaResponse'];
    const verResult = verResp?.VerificaSolicitudDescargaResult ?? verResp?.['des:VerificaSolicitudDescargaResult'];

    const state = verResult?.['$']?.EstadoSolicitud ?? verResult?.EstadoSolicitud ?? '1';
    const packagesRaw = verResult?.IdsPaquetes ?? verResult?.['des:IdsPaquetes'];
    const packages: string[] = [];
    if (packagesRaw) {
      const items = Array.isArray(packagesRaw) ? packagesRaw : [packagesRaw];
      items.forEach((item: any) => {
        const val = typeof item === 'object' ? item._ ?? Object.values(item)[0] : item;
        if (val) packages.push(String(val));
      });
    }

    return { state: String(state), packages };
  }

  // ── Descargar paquete ──────────────────────────────────────────────────────
  async descargar(token: string, fiel: FielCredentials, packageId: string): Promise<Buffer> {
    const soap = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <o:Security xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <TokenSAT xmlns="http://DescargaMasivaTerceros.sat.gob.mx" TokenId="${token}"/>
    </o:Security>
  </s:Header>
  <s:Body>
    <PeticionDescargaMasivaTercerosEntrada xmlns="http://DescargaMasivaTerceros.gob.mx">
      <peticionDescarga IdPaquete="${packageId}" RfcSolicitante="${fiel.rfc}"/>
    </PeticionDescargaMasivaTercerosEntrada>
  </s:Body>
</s:Envelope>`;

    const resp = await fetch(SAT_DOWNLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', 'SOAPAction': '' },
      body: soap,
      signal: AbortSignal.timeout(60000),
    });

    const xml = await resp.text();
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const result = await parser.parseStringPromise(xml);
    const body = result?.['s:Envelope']?.['s:Body'] ?? result?.Envelope?.Body;
    const descResp = body?.RespuestaDescargaMasivaTercerosSalida ?? body?.['des:RespuestaDescargaMasivaTercerosSalida'];
    const descResult = descResp?.Paquete ?? descResp?.['des:Paquete'];

    if (!descResult) {
      throw new BadRequestException(`SAT no devolvió paquete para ${packageId}`);
    }
    const zipBase64 = typeof descResult === 'object' ? descResult._ ?? descResult : descResult;
    return Buffer.from(String(zipBase64), 'base64');
  }

  // ── Extraer XMLs de un ZIP ──────────────────────────────────────────────────
  async extractXmlsFromZip(zipBuffer: Buffer): Promise<string[]> {
    const JSZip = await import('jszip');
    const zip = await JSZip.default.loadAsync(zipBuffer);
    const xmls: string[] = [];
    for (const [filename, file] of Object.entries(zip.files)) {
      if (filename.endsWith('.xml')) {
        xmls.push(await (file as any).async('string'));
      }
    }
    return xmls;
  }

  // ── Flujo completo sincrónico (útil para solicitudes pequeñas) ──────────────
  // Para solicitudes grandes (>1000 CFDIs), el SAT puede tardar varios minutos.
  // En ese caso devuelve requestId y packages vacíos; el cliente debe polling.
  async ejecutarDescarga(fiel: FielCredentials, opts: {
    fechaInicial: string;
    fechaFinal: string;
    rfcEmisor?: string;
    rfcReceptor?: string;
    tipoSolicitud?: 'CFDI' | 'Metadata';
    tipoComprobante?: 'I' | 'E' | 'T' | 'N' | 'P';
  }): Promise<SatDescargaResult> {
    try {
      const token = await this.authenticate(fiel);
      this.logger.log(`Token SAT obtenido para ${fiel.rfc}`);

      const requestId = await this.solicitar(token, fiel, {
        fechaInicial: opts.fechaInicial,
        fechaFinal: opts.fechaFinal,
        rfcEmisor: opts.rfcEmisor,
        rfcReceptor: opts.rfcReceptor,
        tipoSolicitud: opts.tipoSolicitud ?? 'CFDI',
        tipoComprobante: opts.tipoComprobante,
      });
      this.logger.log(`Solicitud SAT creada: ${requestId}`);

      // Esperar hasta 90 s para que el SAT procese (para solicitudes pequeñas)
      let packages: string[] = [];
      let state = '1';
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 15000));
        const ver = await this.verificar(token, fiel, requestId);
        state = ver.state;
        packages = ver.packages;
        this.logger.log(`Verificación #${i + 1}: estado=${state}, paquetes=${packages.length}`);
        // Estado 3 = terminada; Estado 4 = error; Estado 5 = rechazada
        if (state === '3' || state === '4' || state === '5') break;
      }

      if (state !== '3') {
        return {
          success: true,
          requestId,
          packages: [],
          xmlFiles: [],
          error: state === '4' ? 'Error SAT al procesar solicitud' : `Solicitud en proceso (estado ${state}). El requestId es ${requestId} — verifica más tarde.`,
        };
      }

      const xmlFiles: string[] = [];
      for (const pkgId of packages) {
        try {
          const zip = await this.descargar(token, fiel, pkgId);
          const xmls = await this.extractXmlsFromZip(zip);
          xmlFiles.push(...xmls);
        } catch (e) {
          this.logger.warn(`Error descargando paquete ${pkgId}: ${e.message}`);
        }
      }

      return { success: true, requestId, packages, xmlFiles };
    } catch (e) {
      this.logger.error(`Error en descarga SAT: ${e.message}`);
      return { success: false, error: e.message };
    }
  }

  // ── Firma RSA-SHA1 con llave FIEL ──────────────────────────────────────────
  private signWithFiel(data: string, keyBase64: string, password: string): string {
    const keyDer = Buffer.from(keyBase64.replace(/[\r\n\s]/g, ''), 'base64');
    // La llave FIEL está en formato DER cifrado con 3DES
    // Node.js crypto acepta buffers DER directamente si se indica el formato
    const privateKey = crypto.createPrivateKey({
      key: keyDer,
      format: 'der',
      type: 'pkcs8',
      passphrase: password,
    });
    const sign = crypto.createSign('RSA-SHA1');
    sign.update(data, 'utf8');
    return sign.sign(privateKey, 'base64');
  }
}
