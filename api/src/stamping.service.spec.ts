import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StampingService } from './stamping.service';
import { PrismaService } from './prisma.service';
import { FinkokService } from './pac.service';
import * as crypto from 'crypto';

// ── Datos de prueba reutilizables ──────────────────────────────────────────────

const BASE_COMPROBANTE = () => ({
  version: '4.0',
  serie: 'A',
  folio: '123',
  fecha: '2024-01-15T10:00:00',
  formaPago: '01',
  noCertificado: '00001000000500001234',
  condicionesDePago: undefined,
  subTotal: '1000.00',
  descuento: undefined,
  moneda: 'MXN',
  tipoCambio: undefined,
  total: '1160.00',
  tipoDeComprobante: 'I',
  exportacion: '01',
  metodoPago: 'PUE',
  lugarExpedicion: '06600',
  confirmacion: undefined,
  emisor: {
    rfc: 'EKU9003173C9',
    nombre: 'EMPRESA DEMO S.A. DE C.V.',
    regimenFiscal: '601',
  },
  receptor: {
    rfc: 'XAXX010101000',
    nombre: 'PUBLICO EN GENERAL',
    domicilioFiscalReceptor: '06600',
    regimenFiscalReceptor: '616',
    usoCFDI: 'G03',
  },
  conceptos: [
    {
      claveProdServ: '01010101',
      noIdentificacion: undefined,
      cantidad: '1.000000',
      claveUnidad: 'H87',
      unidad: undefined,
      descripcion: 'Producto de prueba',
      valorUnitario: '1000.000000',
      importe: '1000.00',
      descuento: undefined,
      objetoImp: '02',
      traslados: [
        { base: '1000.00', impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: '0.160000', importe: '160.00' },
      ],
      retenciones: [],
    },
  ],
  impuestos: {
    totalRetenidos: undefined,
    totalTrasladados: '160.00',
    retenciones: [],
    traslados: [
      { base: '1000.00', impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: '0.160000', importe: '160.00' },
    ],
  },
});

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockPrisma = {
  invoice: { findUnique: jest.fn(), update: jest.fn() },
  payrollReceipt: { findUnique: jest.fn(), update: jest.fn() },
  digitalCertificate: { findFirst: jest.fn() },
  company: { findUnique: jest.fn() },
  subscription: { update: jest.fn() },
};

const mockFinkok = {
  stamp: jest.fn(),
  testConnection: jest.fn(),
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('StampingService', () => {
  let service: StampingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StampingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FinkokService, useValue: mockFinkok },
      ],
    }).compile();

    service = module.get<StampingService>(StampingService);
  });

  // ── buildCadenaOriginal ────────────────────────────────────────────────────

  describe('buildCadenaOriginal', () => {
    it('debe iniciar y terminar con "||"', () => {
      const result = service.buildCadenaOriginal(BASE_COMPROBANTE());
      expect(result.startsWith('||')).toBe(true);
      expect(result.endsWith('||')).toBe(true);
    });

    it('debe incluir campos obligatorios del Comprobante en orden correcto', () => {
      const c = BASE_COMPROBANTE();
      const result = service.buildCadenaOriginal(c);

      // El primer campo es la versión, luego serie, folio, fecha, etc.
      const inner = result.slice(2, -2); // quitar los || del inicio y fin
      const fields = inner.split('|');

      expect(fields[0]).toBe('4.0');         // Version (requerido)
      expect(fields[1]).toBe('A');            // Serie
      expect(fields[2]).toBe('123');          // Folio
      expect(fields[3]).toBe('2024-01-15T10:00:00'); // Fecha
    });

    it('debe omitir campos opcionales cuando son undefined', () => {
      const c = BASE_COMPROBANTE();
      c.serie = undefined;
      c.folio = undefined;
      c.condicionesDePago = undefined;
      c.descuento = undefined;

      const result = service.buildCadenaOriginal(c);
      const inner = result.slice(2, -2);
      const fields = inner.split('|');

      // Sin serie ni folio, el segundo campo debe ser la Fecha
      expect(fields[0]).toBe('4.0');
      expect(fields[1]).toBe('2024-01-15T10:00:00');
    });

    it('NO debe incluir TipoCambio cuando Moneda es MXN', () => {
      const c = BASE_COMPROBANTE();
      c.moneda = 'MXN';
      c.tipoCambio = undefined;

      const result = service.buildCadenaOriginal(c);
      // En MXN, después de la Moneda viene directamente el Total: |MXN|total|
      // Si hubiera TipoCambio sería: |MXN|tipoCambio|total|
      expect(result).toContain(`|MXN|${c.total}|`);
    });

    it('debe incluir TipoCambio cuando Moneda es USD', () => {
      const c = BASE_COMPROBANTE();
      c.moneda = 'USD';
      c.tipoCambio = '17.500000';

      const result = service.buildCadenaOriginal(c);
      expect(result).toContain('17.500000');
    });

    it('debe incluir datos del Emisor después del Comprobante', () => {
      const c = BASE_COMPROBANTE();
      const result = service.buildCadenaOriginal(c);

      expect(result).toContain('EKU9003173C9');
      expect(result).toContain('EMPRESA DEMO S.A. DE C.V.');
      expect(result).toContain('601');
    });

    it('debe incluir datos del Receptor', () => {
      const c = BASE_COMPROBANTE();
      const result = service.buildCadenaOriginal(c);

      expect(result).toContain('XAXX010101000');
      expect(result).toContain('G03');
      expect(result).toContain('616');
    });

    it('debe incluir datos de los Conceptos', () => {
      const c = BASE_COMPROBANTE();
      const result = service.buildCadenaOriginal(c);

      expect(result).toContain('01010101');        // ClaveProdServ
      expect(result).toContain('Producto de prueba');
      expect(result).toContain('1000.00');         // Importe
      expect(result).toContain('02');              // ObjetoImp
    });

    it('debe incluir los Traslados del Concepto', () => {
      const c = BASE_COMPROBANTE();
      const result = service.buildCadenaOriginal(c);

      expect(result).toContain('002');           // Impuesto IVA
      expect(result).toContain('Tasa');          // TipoFactor
      expect(result).toContain('0.160000');      // TasaOCuota
      expect(result).toContain('160.00');        // Importe del traslado
    });

    it('debe incluir los Impuestos globales del Comprobante', () => {
      const c = BASE_COMPROBANTE();
      const result = service.buildCadenaOriginal(c);

      // TotalImpuestosTrasladados aparece en los impuestos globales
      // '160.00' debe aparecer tanto en el traslado del concepto como en los globales
      const occurrences = (result.match(/160\.00/g) || []).length;
      expect(occurrences).toBeGreaterThanOrEqual(2);
    });

    it('debe omitir TotalImpuestosRetenidos si no hay retenciones', () => {
      const c = BASE_COMPROBANTE();
      c.impuestos.totalRetenidos = undefined;
      c.impuestos.retenciones = [];

      const result = service.buildCadenaOriginal(c);
      // No deben aparecer campos vacíos contiguos en el interior de la cadena
      // (dos pipes seguidos solo son válidos al inicio y al final como delimitadores)
      const inner = result.slice(2, -2); // quitar los || de inicio y fin
      expect(inner).not.toContain('||');
      // Y no debe incluir el campo de impuesto '001' (ISR) que no existe en este comprobante
      expect(result).not.toContain('|001|');
    });

    it('debe incluir retenciones del Concepto cuando existen', () => {
      const c = BASE_COMPROBANTE();
      c.conceptos[0].retenciones = [
        { base: '1000.00', impuesto: '001', tipoFactor: 'Tasa', tasaOCuota: '0.100000', importe: '100.00' },
      ];
      c.impuestos.totalRetenidos = '100.00';

      const result = service.buildCadenaOriginal(c);
      expect(result).toContain('001'); // ISR retenido
      expect(result).toContain('100.00');
    });

    it('debe producir cadena idéntica para el mismo input (determinismo)', () => {
      const c = BASE_COMPROBANTE();
      const r1 = service.buildCadenaOriginal(c);
      const r2 = service.buildCadenaOriginal(c);
      expect(r1).toBe(r2);
    });
  });

  // ── stampDocument ──────────────────────────────────────────────────────────

  describe('stampDocument', () => {
    const mockCert = {
      id: 'cert-1',
      serialNumber: '00001000000500001234',
      cerFile: Buffer.from('fake-cer').toString('base64'),
      keyFile: Buffer.from('fake-key').toString('base64'),
      password: 'test-pass',
      isActive: true,
    };

    const mockCompany = {
      id: 'company-1',
      rfc: 'EKU9003173C9',
      name: 'EMPRESA DEMO S.A. DE C.V.',
      regimenFiscal: '601',
      address: 'Av. Insurgentes Sur 1234 CDMX CP 06600',
      pacUsername: 'test@demo.com',
      pacPassword: 'demo-pass',
      pacUrl: 'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl',
      pacTestMode: true,
    };

    const mockInvoice = {
      id: 'inv-1',
      uuid: null,
      serie: 'A',
      folio: '1',
      total: 1160,
      subtotal: 1000,
      currency: 'MXN',
      paymentForm: '01',
      paymentMethod: 'PUE',
      cfdiUse: 'G03',
      items: [
        {
          satCode: '01010101',
          quantity: 1,
          unitPrice: 1000,
          subtotal: 1000,
          description: 'Producto de prueba',
          unit: 'H87',
        },
      ],
      client: { rfc: 'XAXX010101000', name: 'Público en General', address: '06600' },
      company: mockCompany,
    };

    beforeEach(() => {
      (mockPrisma as any).company.findUnique.mockResolvedValue(mockCompany);
      (mockPrisma as any).digitalCertificate.findFirst.mockResolvedValue(mockCert);
      (mockPrisma as any).invoice.findUnique.mockResolvedValue(mockInvoice);
      (mockPrisma as any).invoice.update.mockResolvedValue({});
      mockFinkok.stamp.mockResolvedValue({
        success: true,
        uuid: 'test-uuid-1234',
        xml: '<cfdi:Comprobante/>',
        stampingDate: new Date(),
        satSeal: 'seal-abc',
      });
    });

    it('debe lanzar error si no hay CSD activo', async () => {
      (mockPrisma as any).digitalCertificate.findFirst.mockResolvedValue(null);

      await expect(
        service.stampDocument('INVOICE', 'inv-1', 'company-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar error si el documento no existe', async () => {
      (mockPrisma as any).invoice.findUnique.mockResolvedValue(null);

      await expect(
        service.stampDocument('INVOICE', 'inv-1', 'company-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar error si el documento ya tiene UUID (ya timbrado)', async () => {
      (mockPrisma as any).invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        uuid: 'uuid-ya-timbrado',
      });

      await expect(
        service.stampDocument('INVOICE', 'inv-1', 'company-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar error si el PAC retorna error', async () => {
      mockFinkok.stamp.mockResolvedValue({ success: false, error: 'Credenciales inválidas.' });

      // El firmado va a fallar con la llave falsa, así que mockeamos el método privado
      jest.spyOn(service as any, 'signWithKey').mockReturnValue('fake-seal-base64==');

      await expect(
        service.stampDocument('INVOICE', 'inv-1', 'company-1'),
      ).rejects.toThrow(/Error del PAC/);
    });

    it('debe usar la URL de sandbox cuando pacTestMode es true', async () => {
      jest.spyOn(service as any, 'signWithKey').mockReturnValue('fake-seal==');
      mockFinkok.stamp.mockResolvedValue({
        success: true, uuid: 'uuid-ok', xml: '<cfdi/>', stampingDate: new Date(), satSeal: ''
      });

      await service.stampDocument('INVOICE', 'inv-1', 'company-1');

      expect(mockFinkok.stamp).toHaveBeenCalledWith(
        expect.any(String),
        'test@demo.com',
        'demo-pass',
        'https://demo-facturacion.finkok.com/servicios/soap/stamp.wsdl',
      );
    });

    it('debe usar la URL de producción cuando pacTestMode es false', async () => {
      (mockPrisma as any).company.findUnique.mockResolvedValue({
        ...mockCompany,
        pacTestMode: false,
        pacUrl: 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl',
      });
      jest.spyOn(service as any, 'signWithKey').mockReturnValue('fake-seal==');
      mockFinkok.stamp.mockResolvedValue({
        success: true, uuid: 'uuid-prod', xml: '<cfdi/>', stampingDate: new Date(), satSeal: ''
      });

      await service.stampDocument('INVOICE', 'inv-1', 'company-1');

      expect(mockFinkok.stamp).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'https://facturacion.finkok.com/servicios/soap/stamp.wsdl',
      );
    });

    it('debe bloquear el timbrado si se han agotado los folios del plan', async () => {
      (mockPrisma as any).company.findUnique.mockResolvedValue({
        ...mockCompany,
        tenant: { subscription: { stampingUsed: 100, stampingLimit: 100 } },
      });

      await expect(
        service.stampDocument('INVOICE', 'inv-1', 'company-1'),
      ).rejects.toThrow(/folios/);
    });
  });

  // ── signWithKey (acceso vía método privado) ────────────────────────────────

  describe('signWithKey', () => {
    it('debe firmar con una llave RSA real cifrada en PKCS#8 DER (formato SAT)', () => {
      // Generar pareja de claves de prueba
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

      // Exportar como PKCS#8 DER cifrado con contraseña (simula el .key del SAT)
      const encryptedDer = privateKey.export({
        type: 'pkcs8',
        format: 'der',
        cipher: 'aes-256-cbc',
        passphrase: 'mi-contrasena-sat',
      } as any);

      const keyBase64 = (encryptedDer as Buffer).toString('base64');

      const signFn = (service as any).signWithKey.bind(service);
      const firma = signFn('||cadena|original||', keyBase64, 'mi-contrasena-sat');

      expect(typeof firma).toBe('string');
      expect(firma.length).toBeGreaterThan(100); // Una firma RSA-2048 en base64 tiene ~344 chars
    });

    it('debe lanzar error con contraseña incorrecta', () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const encryptedDer = privateKey.export({
        type: 'pkcs8',
        format: 'der',
        cipher: 'aes-256-cbc',
        passphrase: 'contrasena-correcta',
      } as any);
      const keyBase64 = (encryptedDer as Buffer).toString('base64');

      const signFn = (service as any).signWithKey.bind(service);
      expect(() => signFn('||cadena||', keyBase64, 'contrasena-incorrecta')).toThrow();
    });

    it('debe aceptar la llave ya en formato PEM directamente', () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const keyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;

      const signFn = (service as any).signWithKey.bind(service);
      // Con llave sin cifrar, la contraseña se ignora
      const firma = signFn('||cadena||', keyPem, '');
      expect(typeof firma).toBe('string');
      expect(firma.length).toBeGreaterThan(100);
    });
  });
});
