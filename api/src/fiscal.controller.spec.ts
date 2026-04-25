import { Test, TestingModule } from '@nestjs/testing';
import { FiscalController } from './fiscal.controller';
import { FiscalService } from './fiscal.service';
import { PrismaService } from './prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('FiscalController', () => {
  let controller: FiscalController;
  let prisma: any;
  let fiscal: any;

  const mockFiscalService = {
    getMonthlyTaxWorksheet: jest.fn(),
  };

  const mockPrisma = {
    invoice: { aggregate: jest.fn() },
    bill: { aggregate: jest.fn() },
    bankAccount: { aggregate: jest.fn() },
    account: { findMany: jest.fn() },
    journal: { count: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FiscalController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FiscalService, useValue: mockFiscalService },
      ],
    }).compile();

    controller = module.get<FiscalController>(FiscalController);
    prisma = module.get<PrismaService>(PrismaService);
    fiscal = module.get<FiscalService>(FiscalService);

    // Defaults
    mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { total: 120000 }, _count: 8 });
    mockPrisma.bill.aggregate.mockResolvedValue({ _sum: { total: 45000 } });
    mockPrisma.bankAccount.aggregate.mockResolvedValue({ _sum: { balance: 250000 } });
  });

  // ──────────────────────────────────────────────
  // getFiscalStats
  // ──────────────────────────────────────────────
  describe('getFiscalStats', () => {
    it('debe lanzar BadRequestException sin companyId', async () => {
      await expect(controller.getFiscalStats('')).rejects.toThrow(BadRequestException);
    });

    it('debe retornar stats fiscales correctamente', async () => {
      const result: any = await controller.getFiscalStats('company1');
      expect(result.ingresosMes).toBe(120000);
      expect(result.facturasMes).toBe(8);
      expect(result.cxpPendiente).toBe(45000);
      expect(result.saldoBancario).toBe(250000);
    });

    it('debe retornar 0 cuando los agregados retornan null', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { total: null }, _count: 0 });
      mockPrisma.bill.aggregate.mockResolvedValue({ _sum: { total: null } });
      mockPrisma.bankAccount.aggregate.mockResolvedValue({ _sum: { balance: null } });

      const result: any = await controller.getFiscalStats('company1');
      expect(result.ingresosMes).toBe(0);
      expect(result.cxpPendiente).toBe(0);
      expect(result.saldoBancario).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // getWorksheet
  // ──────────────────────────────────────────────
  describe('getWorksheet', () => {
    it('debe lanzar BadRequestException si faltan parámetros', async () => {
      await expect(controller.getWorksheet('', '4', '2024')).rejects.toThrow(BadRequestException);
      await expect(controller.getWorksheet('c1', '', '2024')).rejects.toThrow(BadRequestException);
      await expect(controller.getWorksheet('c1', '4', '')).rejects.toThrow(BadRequestException);
    });

    it('debe delegar al FiscalService con los valores convertidos', async () => {
      const mockResult = { period: '4/2024', ivaNeto: 500 };
      mockFiscalService.getMonthlyTaxWorksheet.mockResolvedValue(mockResult);

      const result = await controller.getWorksheet('c1', '4', '2024');
      expect(mockFiscalService.getMonthlyTaxWorksheet).toHaveBeenCalledWith('c1', 4, 2024);
      expect(result).toEqual(mockResult);
    });
  });

  // ──────────────────────────────────────────────
  // closeYear
  // ──────────────────────────────────────────────
  describe('closeYear', () => {
    it('debe lanzar BadRequestException sin companyId', async () => {
      await expect(controller.closeYear('', { year: 2024, destinationAccountId: 'acc1' }))
        .rejects.toThrow(BadRequestException);
    });

    it('debe lanzar error si no hay cuentas de ingreso/gasto con saldo', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      await expect(controller.closeYear('c1', { year: 2024, destinationAccountId: 'acc1' }))
        .rejects.toThrow(BadRequestException);
    });

    it('debe crear póliza de cierre con utilidad cuando ingresos > gastos', async () => {
      const mockAccounts = [
        {
          id: 'acc-ingreso', name: 'Ventas', type: 'INGRESO',
          journalEntries: [{ debit: 0, credit: 100000, journal: { status: 'APLICADA', date: new Date('2024-06-01') } }],
        },
        {
          id: 'acc-gasto', name: 'Gasto Operativo', type: 'GASTO',
          journalEntries: [{ debit: 60000, credit: 0, journal: { status: 'APLICADA', date: new Date('2024-06-01') } }],
        },
      ];
      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);
      mockPrisma.journal.count.mockResolvedValue(5);
      mockPrisma.journal.create.mockResolvedValue({ id: 'journal-close', number: 'CRE-2024-0006' });

      const result: any = await controller.closeYear('c1', { year: 2024, destinationAccountId: 'acc-capital' });
      expect(result.success).toBe(true);
      expect(result.netResult).toBe(40000); // 100k ingresos - 60k gastos
      expect(result.entriesCount).toBe(3); // ingreso + gasto + capitalización
    });

    it('debe crear póliza de cierre con pérdida cuando gastos > ingresos', async () => {
      const mockAccounts = [
        {
          id: 'acc-ingreso', name: 'Ventas', type: 'INGRESO',
          journalEntries: [{ debit: 0, credit: 30000, journal: { status: 'APLICADA', date: new Date('2024-06-01') } }],
        },
        {
          id: 'acc-gasto', name: 'Gastos', type: 'GASTO',
          journalEntries: [{ debit: 80000, credit: 0, journal: { status: 'APLICADA', date: new Date('2024-06-01') } }],
        },
      ];
      mockPrisma.account.findMany.mockResolvedValue(mockAccounts);
      mockPrisma.journal.count.mockResolvedValue(2);
      mockPrisma.journal.create.mockResolvedValue({ id: 'journal-loss', number: 'CRE-2024-0003' });

      const result: any = await controller.closeYear('c1', { year: 2024, destinationAccountId: 'acc-capital' });
      expect(result.netResult).toBe(-50000);
    });
  });
});
