import {
  Controller, Get, Post, Body, Param, Query,
  BadRequestException, Delete,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as crypto from 'crypto';

interface ParsedCertificate {
  serialNumber: string;
  expiryDate: Date;
  publicKeyPem: string;
}

@Controller('certificates')
export class CertificatesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getCertificates(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required');
    return this.prisma.digitalCertificate.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post()
  async saveCertificate(@Body() body: any) {
    const { companyId, cerFile, keyFile, password, serialNumber, expiryDate } = body;

    if (!companyId || !cerFile || !keyFile || !password) {
      throw new BadRequestException('Faltan campos obligatorios: companyId, cerFile, keyFile, password.');
    }

    // ── 1. Parsear el .cer y extraer No. Serie y Vencimiento automáticamente ──
    let parsed: ParsedCertificate;
    try {
      parsed = this.parseCertificate(cerFile);
    } catch (e) {
      throw new BadRequestException(
        `El archivo .cer no es válido o está mal codificado: ${e.message}`,
      );
    }

    // ── 2. Validar que el .key corresponde al .cer (pareja correcta) ──────────
    try {
      this.validateKeyMatchesCert(keyFile, parsed.publicKeyPem, password);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(
        `Error al validar la llave privada: ${e.message}`,
      );
    }

    // ── 3. Desactivar el CSD anterior y guardar el nuevo ──────────────────────
    await this.prisma.digitalCertificate.updateMany({
      where: { companyId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.digitalCertificate.create({
      data: {
        companyId,
        cerFile,
        keyFile,
        password,   // En producción cifrar con KMS/Vault antes de persistir
        serialNumber: serialNumber || parsed.serialNumber,
        expiryDate: expiryDate ? new Date(expiryDate) : parsed.expiryDate,
        isActive: true,
      },
    });
  }

  @Delete(':id')
  async deleteCertificate(@Param('id') id: string) {
    return this.prisma.digitalCertificate.delete({ where: { id } });
  }

  @Post(':id/activate')
  async activateCertificate(@Param('id') id: string, @Body('companyId') companyId: string) {
    await this.prisma.digitalCertificate.updateMany({
      where: { companyId, isActive: true },
      data: { isActive: false },
    });
    return this.prisma.digitalCertificate.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Parsea un certificado .cer del SAT (DER en Base64 o PEM) usando crypto.X509Certificate.
   * Extrae automáticamente el No. de Serie y la fecha de vencimiento.
   * El No. de Serie del SAT está en hexadecimal; lo convertimos a decimal (como lo muestra el SAT).
   */
  private parseCertificate(cerBase64: string): ParsedCertificate {
    let x509: crypto.X509Certificate;

    if (cerBase64.trim().startsWith('-----BEGIN CERTIFICATE-----')) {
      // Formato PEM
      x509 = new crypto.X509Certificate(cerBase64);
    } else {
      // Formato DER (Base64 puro, sin cabeceras) — formato típico del SAT
      const derBuffer = Buffer.from(cerBase64.replace(/\s/g, ''), 'base64');
      x509 = new crypto.X509Certificate(derBuffer);
    }

    // El serial del SAT en los CSD viene en hex (ej: "0000100000040016CC08")
    // Lo convertimos a decimal para mostrarlo en la UI como lo hace el SAT Portal
    const hexSerial = x509.serialNumber.replace(/\s/g, '');
    if (!hexSerial || !/^[0-9a-fA-F]+$/.test(hexSerial)) {
      throw new Error(
        `El número de serie del certificado es inválido o está vacío: "${hexSerial}"`,
      );
    }
    let decimalSerial: string;
    try {
      decimalSerial = BigInt(`0x${hexSerial}`).toString();
    } catch {
      throw new Error(
        `No se pudo convertir el número de serie hexadecimal "${hexSerial}" a decimal.`,
      );
    }

    const expiryDate = new Date(x509.validTo);
    if (isNaN(expiryDate.getTime())) {
      throw new Error('La fecha de vencimiento del certificado no es válida.');
    }

    const publicKeyPem = x509.publicKey.export({ type: 'spki', format: 'pem' }) as string;

    return { serialNumber: decimalSerial, expiryDate, publicKeyPem };
  }

  /**
   * Valida que el archivo .key corresponde al .cer comparando la clave pública derivada.
   * Los .key del SAT son PKCS#8 cifrados en DER → se convierten a PEM antes de usarlos.
   * Lanza BadRequestException si no coinciden.
   */
  private validateKeyMatchesCert(
    keyBase64: string,
    certPublicKeyPem: string,
    password: string,
  ): void {
    const keyPem = this.derKeyToPem(keyBase64);

    let privateKey: crypto.KeyObject;
    try {
      privateKey = crypto.createPrivateKey({
        key: keyPem,
        format: 'pem',
        passphrase: password,
      });
    } catch (e) {
      throw new BadRequestException(
        'No se puede descifrar la llave privada. Verifica que la contraseña sea correcta.',
      );
    }

    const pubFromKey = crypto.createPublicKey(privateKey).export({
      type: 'spki',
      format: 'pem',
    }) as string;

    // Normalizar: quitar cabeceras PEM y espacios para comparar solo los bytes
    const normalize = (pem: string) =>
      pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');

    if (normalize(pubFromKey) !== normalize(certPublicKeyPem)) {
      throw new BadRequestException(
        'El archivo .key no corresponde al certificado .cer. Son de parejas distintas del SAT.',
      );
    }
  }

  /**
   * Convierte una llave privada DER (Base64) del SAT al formato PEM que espera Node.js.
   * Los archivos .key del SAT son PKCS#8 cifrados en DER → cabecera "ENCRYPTED PRIVATE KEY".
   */
  private derKeyToPem(keyBase64: string): string {
    if (keyBase64.trim().startsWith('-----BEGIN')) return keyBase64;
    const cleaned = keyBase64.replace(/\s/g, '');
    const chunked = cleaned.match(/.{1,64}/g)?.join('\n') ?? cleaned;
    return `-----BEGIN ENCRYPTED PRIVATE KEY-----\n${chunked}\n-----END ENCRYPTED PRIVATE KEY-----`;
  }
}
