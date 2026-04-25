import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { PrismaService } from './prisma.service';
import { SatService } from './sat.service';
import { BadRequestException } from '@nestjs/common';

describe('AuditController', () => {
  let controller: AuditController;
  let prisma: any;
  let satService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            xmlDocument: {
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(10),
            },
            journal: {
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(8),
            },
            supplier: {
              findMany: jest.fn().mockResolvedValue([
                { id: 's1', rfc: 'XAXX010101000', name: 'Proveedor Limpio' },
                { id: 's2', rfc: 'EFOS010101AAA', name: 'Proveedor Sospechoso' },
              ]),
            },
            bill: {
              count: jest.fn().mockResolvedValue(20),
            },
            invoice: {
              count: jest.fn().mockResolvedValue(15),
            },
          },
        },
        {
          provide: SatService,
          useValue: {
            syncBlacklist: jest.fn().mockResolvedValue({ success: true, count: 500 }),
            checkRfc: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    prisma = module.get<PrismaService>(PrismaService);
    satService = module.get<SatService>(SatService);
  });

  describe('getAuditSummary', () => {
    it('debe retornar estadísticas con estructura correcta', async () => {
      const result = await controller.getAuditSummary('company1', '2024', '4') as any;
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('totalXmls');
      expect(result.stats).toHaveProperty('totalJournals');
      expect(result.stats).toHaveProperty('okCount');
    });

    it('debe lanzar BadRequestException sin companyId', async () => {
      await expect(controller.getAuditSummary('', '2024', '4')).rejects.toThrow(BadRequestException);
    });

    it('debe calcular unlinkedXmls como XMLs sin journalId', async () => {
      prisma.xmlDocument.findMany
        .mockResolvedValueOnce([{ id: 'x1', journalId: null }, { id: 'x2', journalId: null }]) // missingJournal
        .mockResolvedValueOnce([{ id: 'x3', journalId: 'j1' }]); // compliant

      const result = await controller.getAuditSummary('company1', '2024', '4') as any;
      expect(result.stats.unlinkedXmls).toBe(2);
      expect(result.stats.okCount).toBe(1);
    });
  });

  describe('checkEfosInCatalogs', () => {
    it('debe retornar proveedores sancionados', async () => {
      satService.checkRfc
        .mockResolvedValueOnce(null) // XAXX limpio
        .mockResolvedValueOnce({ rfc: 'EFOS010101AAA', status: 'DEFINITIVO' }); // sancionado

      const result = await controller.checkEfosInCatalogs('company1') as any[];
      expect(result).toHaveLength(1);
      expect(result[0].rfc).toBe('EFOS010101AAA');
      expect(result[0].riskLevel).toBe('CRITICAL');
    });

    it('debe retornar lista vacía si no hay proveedores sancionados', async () => {
      satService.checkRfc.mockResolvedValue(null);
      const result = await controller.checkEfosInCatalogs('company1') as any[];
      expect(result).toHaveLength(0);
    });

    it('debe omitir proveedores sin RFC', async () => {
      prisma.supplier.findMany.mockResolvedValue([
        { id: 's1', rfc: null, name: 'Sin RFC' },
      ]);
      const result = await controller.checkEfosInCatalogs('company1') as any[];
      expect(satService.checkRfc).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });
  });

  describe('getHealthAudit', () => {
    it('debe retornar riskScore entre 0 y 100', async () => {
      satService.checkRfc.mockResolvedValue(null);
      prisma.bill.count
        .mockResolvedValueOnce(20)  // total bills
        .mockResolvedValueOnce(18); // bills with xml
      prisma.invoice.count
        .mockResolvedValueOnce(15)  // total invoices
        .mockResolvedValueOnce(14); // invoices with xml

      const result = await controller.getHealthAudit('company1') as any;
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('debe reportar status CRITICAL cuando hay EFOS y documentos sin XML', async () => {
      satService.checkRfc.mockResolvedValue({ rfc: 'EFOS000000AAA', status: 'DEFINITIVO' });
      // bills: 0/5 con XML → integridad 0% → baja el score drásticamente
      prisma.bill.count
        .mockResolvedValueOnce(5)  // totalBills
        .mockResolvedValueOnce(0); // billsWithXml
      prisma.invoice.count
        .mockResolvedValueOnce(5)  // totalInvoices
        .mockResolvedValueOnce(0); // invoicesWithXml

      const result = await controller.getHealthAudit('company1') as any;
      expect(result.status).toBe('CRITICAL');
      expect(result.efos.detected).toBeGreaterThan(0);
    });

    it('debe reportar status HEALTHY sin EFOS y con documentos intactos', async () => {
      satService.checkRfc.mockResolvedValue(null);
      // bills: 10/10 con XML, invoices: 10/10 con XML
      prisma.bill.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(10);
      prisma.invoice.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(10);

      const result = await controller.getHealthAudit('company1') as any;
      expect(result.status).toBe('HEALTHY');
    });
  });

  describe('syncBlacklist', () => {
    it('debe delegar al SatService.syncBlacklist', async () => {
      await controller.syncBlacklist();
      expect(satService.syncBlacklist).toHaveBeenCalledTimes(1);
    });

    it('debe retornar el resultado de la sincronización', async () => {
      const result = await controller.syncBlacklist() as any;
      expect(result.success).toBe(true);
      expect(result.count).toBe(500);
    });
  });
});
