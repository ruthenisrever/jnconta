import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { PrismaService } from './prisma.service';
import * as crypto from 'crypto';

// ── Generación de material criptográfico de prueba ────────────────────────────
// Se genera UNA sola vez para todo el suite (es lento con RSA-2048).

let testPublicKeyPem: string;
let testPrivateKeyPem: string;        // PKCS#8 no cifrado — para tests que usan PEM directo
let testPrivateKeyDerBase64: string;  // PKCS#8 cifrado DER en Base64 — simula el .key del SAT
const TEST_PASSWORD = 'contrasena-sat-prueba';

// Clave pública de una pareja DISTINTA — para probar el mismatch
let otherPublicKeyPem: string;

beforeAll(() => {
  const { privateKey: pk1, publicKey: pub1 } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  testPublicKeyPem = pub1.export({ type: 'spki', format: 'pem' }) as string;
  testPrivateKeyPem = pk1.export({ type: 'pkcs8', format: 'pem' }) as string;

  const encryptedDer = pk1.export({
    type: 'pkcs8',
    format: 'der',
    cipher: 'aes-256-cbc',
    passphrase: TEST_PASSWORD,
  } as any) as Buffer;
  testPrivateKeyDerBase64 = encryptedDer.toString('base64');

  const { publicKey: pub2 } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  otherPublicKeyPem = pub2.export({ type: 'spki', format: 'pem' }) as string;
});

// ── Mock de PrismaService ─────────────────────────────────────────────────────

const mockPrisma = {
  digitalCertificate: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('CertificatesController', () => {
  let controller: CertificatesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificatesController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<CertificatesController>(CertificatesController);
  });

  // ── getCertificates ────────────────────────────────────────────────────────

  describe('getCertificates', () => {
    it('debe lanzar error si falta companyId', async () => {
      await expect(controller.getCertificates('')).rejects.toThrow(BadRequestException);
    });

    it('debe retornar los certificados de la empresa', async () => {
      const mockCerts = [
        { id: 'c1', serialNumber: '12345', isActive: true },
        { id: 'c2', serialNumber: '67890', isActive: false },
      ];
      mockPrisma.digitalCertificate.findMany.mockResolvedValue(mockCerts);

      const result = await controller.getCertificates('company-1');

      expect(result).toEqual(mockCerts);
      expect(mockPrisma.digitalCertificate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 'company-1' } }),
      );
    });
  });

  // ── parseCertificate (acceso via método privado) ───────────────────────────

  describe('parseCertificate', () => {
    const parseFn = () => (controller as any).parseCertificate.bind(controller);

    it('debe extraer el número de serie en formato decimal', () => {
      // Mockeamos X509Certificate para no necesitar un .cer real del SAT
      const mockX509 = {
        serialNumber: '0000100000040016CC08',
        validTo: 'Dec 31 23:59:59 2026 GMT',
        publicKey: { export: jest.fn().mockReturnValue(testPublicKeyPem) },
      };
      jest.spyOn(crypto, 'X509Certificate' as any).mockImplementationOnce(
        () => mockX509,
      );

      const result = parseFn()('dGVzdC1jZXI=');
      // 0x0000100000040016CC08 → número decimal
      expect(result.serialNumber).toBe(BigInt('0x0000100000040016CC08').toString());
    });

    it('debe extraer la fecha de vencimiento como objeto Date', () => {
      const mockX509 = {
        serialNumber: 'AABB',
        validTo: 'Sep 19 18:25:23 2026 GMT',
        publicKey: { export: jest.fn().mockReturnValue(testPublicKeyPem) },
      };
      jest.spyOn(crypto, 'X509Certificate' as any).mockImplementationOnce(
        () => mockX509,
      );

      const result = parseFn()('dGVzdA==');
      expect(result.expiryDate).toBeInstanceOf(Date);
      expect(result.expiryDate.getFullYear()).toBe(2026);
    });

    it('debe lanzar error si el Base64 no es un certificado válido', () => {
      expect(() => parseFn()('esto-no-es-un-certificado-valido')).toThrow();
    });

    it('debe aceptar formato PEM directo además de Base64 DER', () => {
      const mockX509 = {
        serialNumber: '01',
        validTo: 'Jan 01 00:00:00 2030 GMT',
        publicKey: { export: jest.fn().mockReturnValue(testPublicKeyPem) },
      };
      const spy = jest.spyOn(crypto, 'X509Certificate' as any).mockImplementationOnce(
        () => mockX509,
      );

      parseFn()('-----BEGIN CERTIFICATE-----\nYQ==\n-----END CERTIFICATE-----');
      // Con PEM, se pasa el string directamente (no se decodifica como Buffer)
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('-----BEGIN CERTIFICATE-----'),
      );
    });
  });

  // ── validateKeyMatchesCert (acceso via método privado) ────────────────────

  describe('validateKeyMatchesCert', () => {
    const validateFn = () =>
      (controller as any).validateKeyMatchesCert.bind(controller);

    it('debe pasar sin error cuando la llave corresponde al certificado (llave cifrada DER)', () => {
      expect(() =>
        validateFn()(testPrivateKeyDerBase64, testPublicKeyPem, TEST_PASSWORD),
      ).not.toThrow();
    });

    it('debe pasar sin error cuando la llave está en formato PEM sin cifrar', () => {
      expect(() =>
        validateFn()(testPrivateKeyPem, testPublicKeyPem, ''),
      ).not.toThrow();
    });

    it('debe lanzar BadRequestException cuando la contraseña es incorrecta', () => {
      expect(() =>
        validateFn()(testPrivateKeyDerBase64, testPublicKeyPem, 'contrasena-equivocada'),
      ).toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException cuando la llave y el certificado son de parejas distintas', () => {
      expect(() =>
        validateFn()(testPrivateKeyPem, otherPublicKeyPem, ''),
      ).toThrow(BadRequestException);
    });

    it('el mensaje de error por mismatch debe mencionar que son parejas distintas', () => {
      try {
        validateFn()(testPrivateKeyPem, otherPublicKeyPem, '');
        fail('Debería haber lanzado una excepción');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toMatch(/pareja/i);
      }
    });

    it('el mensaje de error por contraseña incorrecta debe mencionarlo explícitamente', () => {
      try {
        validateFn()(testPrivateKeyDerBase64, testPublicKeyPem, 'mal-pass');
        fail('Debería haber lanzado una excepción');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as BadRequestException).message).toMatch(/contraseña/i);
      }
    });
  });

  // ── saveCertificate (flujo completo) ──────────────────────────────────────

  describe('saveCertificate', () => {
    it('debe lanzar error si faltan campos obligatorios', async () => {
      await expect(
        controller.saveCertificate({ companyId: 'c1', cerFile: '', keyFile: '', password: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar error si el .cer no se puede parsear', async () => {
      await expect(
        controller.saveCertificate({
          companyId: 'c1',
          cerFile: 'esto-no-es-un-cer-valido',
          keyFile: 'tambien-invalido',
          password: '1234',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe auto-extraer el número de serie y no requerir que el usuario lo ingrese', async () => {
      // Spy en parseCertificate para devolver datos de prueba sin .cer real
      jest.spyOn(controller as any, 'parseCertificate').mockReturnValue({
        serialNumber: '12345678901234567890',
        expiryDate: new Date('2026-12-31'),
        publicKeyPem: testPublicKeyPem,
      });
      // Spy en validateKeyMatchesCert para que no falle (llave de prueba)
      jest.spyOn(controller as any, 'validateKeyMatchesCert').mockReturnValue(undefined);

      mockPrisma.digitalCertificate.updateMany.mockResolvedValue({});
      mockPrisma.digitalCertificate.create.mockResolvedValue({ id: 'new-cert', serialNumber: '12345678901234567890' });

      const result = await controller.saveCertificate({
        companyId: 'company-1',
        cerFile: 'fake-cer-base64',
        keyFile: testPrivateKeyDerBase64,
        password: TEST_PASSWORD,
        // No se pasa serialNumber ni expiryDate — deben extraerse automáticamente
      });

      expect(mockPrisma.digitalCertificate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            serialNumber: '12345678901234567890',
            expiryDate: new Date('2026-12-31'),
          }),
        }),
      );
    });

    it('debe usar el serialNumber manual si el usuario lo proporciona', async () => {
      jest.spyOn(controller as any, 'parseCertificate').mockReturnValue({
        serialNumber: '00000000000000000000',  // auto-extraído
        expiryDate: new Date('2026-12-31'),
        publicKeyPem: testPublicKeyPem,
      });
      jest.spyOn(controller as any, 'validateKeyMatchesCert').mockReturnValue(undefined);

      mockPrisma.digitalCertificate.updateMany.mockResolvedValue({});
      mockPrisma.digitalCertificate.create.mockResolvedValue({ id: 'c2' });

      await controller.saveCertificate({
        companyId: 'company-1',
        cerFile: 'cer-b64',
        keyFile: 'key-b64',
        password: '1234',
        serialNumber: '99999-MANUAL',  // override manual
      });

      expect(mockPrisma.digitalCertificate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ serialNumber: '99999-MANUAL' }),
        }),
      );
    });

    it('debe desactivar los certificados anteriores antes de crear el nuevo', async () => {
      jest.spyOn(controller as any, 'parseCertificate').mockReturnValue({
        serialNumber: '111',
        expiryDate: new Date('2027-01-01'),
        publicKeyPem: testPublicKeyPem,
      });
      jest.spyOn(controller as any, 'validateKeyMatchesCert').mockReturnValue(undefined);

      mockPrisma.digitalCertificate.updateMany.mockResolvedValue({});
      mockPrisma.digitalCertificate.create.mockResolvedValue({ id: 'c3' });

      await controller.saveCertificate({
        companyId: 'company-1',
        cerFile: 'cer',
        keyFile: 'key',
        password: 'pass',
      });

      expect(mockPrisma.digitalCertificate.updateMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1', isActive: true },
        data: { isActive: false },
      });
    });

    it('debe crear el certificado con isActive:true', async () => {
      jest.spyOn(controller as any, 'parseCertificate').mockReturnValue({
        serialNumber: '222',
        expiryDate: new Date('2027-01-01'),
        publicKeyPem: testPublicKeyPem,
      });
      jest.spyOn(controller as any, 'validateKeyMatchesCert').mockReturnValue(undefined);

      mockPrisma.digitalCertificate.updateMany.mockResolvedValue({});
      mockPrisma.digitalCertificate.create.mockResolvedValue({ id: 'c4', isActive: true });

      await controller.saveCertificate({
        companyId: 'company-1',
        cerFile: 'cer',
        keyFile: 'key',
        password: 'pass',
      });

      expect(mockPrisma.digitalCertificate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  // ── activateCertificate ────────────────────────────────────────────────────

  describe('activateCertificate', () => {
    it('debe desactivar los demás y activar solo el seleccionado', async () => {
      mockPrisma.digitalCertificate.updateMany.mockResolvedValue({});
      mockPrisma.digitalCertificate.update.mockResolvedValue({ id: 'c5', isActive: true });

      await controller.activateCertificate('c5', 'company-1');

      expect(mockPrisma.digitalCertificate.updateMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1', isActive: true },
        data: { isActive: false },
      });
      expect(mockPrisma.digitalCertificate.update).toHaveBeenCalledWith({
        where: { id: 'c5' },
        data: { isActive: true },
      });
    });
  });

  // ── deleteCertificate ──────────────────────────────────────────────────────

  describe('deleteCertificate', () => {
    it('debe eliminar el certificado por ID', async () => {
      mockPrisma.digitalCertificate.delete.mockResolvedValue({ id: 'c6' });

      const result = await controller.deleteCertificate('c6');

      expect(mockPrisma.digitalCertificate.delete).toHaveBeenCalledWith({ where: { id: 'c6' } });
      expect(result).toEqual({ id: 'c6' });
    });
  });
});
