import { Test, TestingModule } from '@nestjs/testing';
import { SatService } from './sat.service';
import { PrismaService } from './prisma.service';

describe('SatService', () => {
  let service: SatService;
  let prisma: any;

  const mockPrisma = {
    satBlacklist: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    supplier: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    client: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    bill: {
      findMany: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SatService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SatService>(SatService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ──────────────────────────────────────────────
  // checkRfc
  // ──────────────────────────────────────────────
  describe('checkRfc', () => {
    it('debe retornar null para RFC vacío', async () => {
      const result = await service.checkRfc('');
      expect(result).toBeNull();
      expect(prisma.satBlacklist.findUnique).not.toHaveBeenCalled();
    });

    it('debe buscar el RFC en mayúsculas y trimmed', async () => {
      prisma.satBlacklist.findUnique.mockResolvedValue(null);
      await service.checkRfc('  abc123xyz789  ');
      expect(prisma.satBlacklist.findUnique).toHaveBeenCalledWith({
        where: { rfc: 'ABC123XYZ789' },
      });
    });

    it('debe retornar el registro EFOS si existe', async () => {
      const mockEntry = { rfc: 'EFOS010101AAA', status: 'DEFINITIVO' };
      prisma.satBlacklist.findUnique.mockResolvedValue(mockEntry);
      const result = await service.checkRfc('EFOS010101AAA');
      expect(result).toEqual(mockEntry);
    });

    it('debe retornar null si el RFC no está en la lista negra', async () => {
      prisma.satBlacklist.findUnique.mockResolvedValue(null);
      const result = await service.checkRfc('LIMPIO010101AAA');
      expect(result).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // runRiskAnalysis
  // ──────────────────────────────────────────────
  describe('runRiskAnalysis', () => {
    const blacklistSetup = [{ rfc: 'EFOS010101AAA' }, { rfc: 'OTRO990101BBB' }];

    beforeEach(() => {
      prisma.satBlacklist.findMany.mockResolvedValue(blacklistSetup);
    });

    it('debe retornar array vacío si no hay facturas ni compras con EFOS', async () => {
      prisma.bill.findMany.mockResolvedValue([
        { id: 'b1', folio: 'F001', total: 5000, supplier: { rfc: 'LIMPIO010101AAA' } },
      ]);
      prisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.runRiskAnalysis('company1');
      expect(result).toHaveLength(0);
    });

    it('debe detectar facturas de compra (EDOS) cuando el proveedor está en EFOS', async () => {
      prisma.bill.findMany.mockResolvedValue([
        { id: 'b1', folio: 'F001', total: 15000, supplier: { rfc: 'EFOS010101AAA' } },
      ]);
      prisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.runRiskAnalysis('company1');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('COMPRA');
      expect(result[0].risk).toContain('ALTO');
      expect(result[0].rfc).toBe('EFOS010101AAA');
      expect(result[0].amount).toBe(15000);
    });

    it('debe detectar facturas de venta con cliente sancionado (riesgo preventivo)', async () => {
      prisma.bill.findMany.mockResolvedValue([]);
      prisma.invoice.findMany.mockResolvedValue([
        { id: 'i1', folio: 99, total: 8000, client: { rfc: 'OTRO990101BBB' } },
      ]);

      const result = await service.runRiskAnalysis('company1');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('VENTA');
      expect(result[0].risk).toContain('BAJO');
      expect(result[0].status).toBe('CLIENTE_SANCIONADO');
    });

    it('debe detectar múltiples riesgos en compras y ventas simultáneamente', async () => {
      prisma.bill.findMany.mockResolvedValue([
        { id: 'b1', folio: 'F001', total: 5000, supplier: { rfc: 'EFOS010101AAA' } },
        { id: 'b2', folio: 'F002', total: 2000, supplier: { rfc: 'OTRO990101BBB' } },
      ]);
      prisma.invoice.findMany.mockResolvedValue([
        { id: 'i1', folio: 1, total: 1000, client: { rfc: 'EFOS010101AAA' } },
      ]);

      const result = await service.runRiskAnalysis('company1');
      expect(result).toHaveLength(3);
    });

    it('debe ignorar facturas cuyo proveedor/cliente no tiene RFC', async () => {
      prisma.bill.findMany.mockResolvedValue([
        { id: 'b1', folio: 'F001', total: 5000, supplier: { rfc: null } },
        { id: 'b2', folio: 'F002', total: 5000, supplier: null },
      ]);
      prisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.runRiskAnalysis('company1');
      expect(result).toHaveLength(0);
    });

    it('debe retornar lista vacía si la blacklist está vacía', async () => {
      prisma.satBlacklist.findMany.mockResolvedValue([]);
      prisma.bill.findMany.mockResolvedValue([
        { id: 'b1', folio: 'F001', total: 99000, supplier: { rfc: 'CUALQUIER010101AAA' } },
      ]);
      prisma.invoice.findMany.mockResolvedValue([]);

      const result = await service.runRiskAnalysis('company1');
      expect(result).toHaveLength(0);
    });
  });
});
