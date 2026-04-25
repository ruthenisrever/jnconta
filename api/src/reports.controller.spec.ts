import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { PrismaService } from './prisma.service';
import { Response } from 'express';

describe('ReportsController', () => {
  let controller: ReportsController;
  let prisma: any;

  const mockPrisma = {
    account: { findMany: jest.fn() },
    invoice: { aggregate: jest.fn(), findMany: jest.fn() },
    bill: { aggregate: jest.fn() },
    bankAccount: { aggregate: jest.fn() },
    payrollPeriod: { aggregate: jest.fn() },
    journal: { findMany: jest.fn() },
    client: { findMany: jest.fn() },
  };

  const mockResponse = {
    setHeader: jest.fn(),
    end: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ──────────────────────────────────────────────
  // getBalanza
  // ──────────────────────────────────────────────
  describe('getBalanza', () => {
    it('debe retornar array vacío si no hay cuentas con movimientos', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      const result = await controller.getBalanza('c1', '4', '2024');
      expect(result).toEqual([]);
    });

    it('debe calcular saldos acumulados para cuentas DEUDORAS correctamente', async () => {
      const journalDate = new Date('2024-04-10');
      mockPrisma.account.findMany.mockResolvedValue([{
        id: 'acc1', code: '1.1.01', name: 'Caja', type: 'ACTIVO', nature: 'DEUDORA',
        journalEntries: [
          { debit: 50000, credit: 0, createdAt: journalDate },
          { debit: 0, credit: 10000, createdAt: journalDate },
        ],
      }]);

      const result: any[] = await controller.getBalanza('c1', '4', '2024');
      expect(result).toHaveLength(1);
      expect(result[0].totalDebit).toBe(50000);
      expect(result[0].totalCredit).toBe(10000);
      expect(result[0].balance).toBe(40000); // DEUDORA: debit - credit
    });

    it('debe calcular saldos para cuentas ACREEDORAS correctamente', async () => {
      const journalDate = new Date('2024-04-15');
      mockPrisma.account.findMany.mockResolvedValue([{
        id: 'acc2', code: '2.1.01', name: 'Proveedores', type: 'PASIVO', nature: 'ACREEDORA',
        journalEntries: [
          { debit: 0, credit: 30000, createdAt: journalDate },
          { debit: 5000, credit: 0, createdAt: journalDate },
        ],
      }]);

      const result: any[] = await controller.getBalanza('c1', '4', '2024');
      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(25000); // ACREEDORA: credit - debit
    });

    it('debe filter cuentas sin movimientos del período', async () => {
      // Una cuenta con movimiento en marzo, consulta de abril → debe quedar filtrada como saldo previo
      mockPrisma.account.findMany.mockResolvedValue([{
        id: 'acc3', code: '1.1.02', name: 'Bancomer', type: 'ACTIVO', nature: 'DEUDORA',
        journalEntries: [
          { debit: 1000, credit: 0, createdAt: new Date('2024-03-15') }, // marzo, no abril
        ],
      }]);
      // La cuenta tiene saldo inicial en abril (del marzo), pero totalDebit y Credit del periodo = 0
      // Debe aparecer con saldo inicial != 0
      const result: any[] = await controller.getBalanza('c1', '4', '2024');
      // filtro: totalDebit > 0 || totalCredit > 0 || initialBalance !== 0
      expect(result).toHaveLength(1);
      expect(result[0].totalDebit).toBe(0);
      expect(result[0].totalCredit).toBe(0);
      expect(result[0].initialBalance).toBe(1000);
    });
  });

  // ──────────────────────────────────────────────
  // getTaxSimulator
  // ──────────────────────────────────────────────
  describe('getTaxSimulator', () => {
    it('debe retornar IVA neto como trasladado minus acreditable', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { subtotal: 100000, tax: 16000, total: 116000 } });
      mockPrisma.bill.aggregate.mockResolvedValue({ _sum: { subtotal: 60000, tax: 9600, total: 69600 } });
      mockPrisma.payrollPeriod.aggregate.mockResolvedValue({ _sum: { totalPerceptions: 20000, isr: 2000, imssEmployer: 1500 } });

      const result: any = await controller.getTaxSimulator('c1', '4', '2024');
      expect(result.iva.trasladado).toBe(16000);
      expect(result.iva.acreditable).toBe(9600);
      expect(result.iva.neto).toBe(6400);
    });

    it('debe calcular ISR estimado como base * 30%', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { subtotal: 200000, tax: 32000, total: 232000 } });
      mockPrisma.bill.aggregate.mockResolvedValue({ _sum: { subtotal: 100000, tax: 16000, total: 116000 } });
      mockPrisma.payrollPeriod.aggregate.mockResolvedValue({ _sum: { totalPerceptions: 30000, isr: 3000, imssEmployer: 2000 } });

      const result: any = await controller.getTaxSimulator('c1', '4', '2024');
      // base = ingresos(200000) - deducciones(100000 + 30000 + 2000) = 68000
      // ISR = 68000 * 0.30 = 20400
      expect(result.isr.base).toBe(68000);
      expect(result.isr.estimado).toBeCloseTo(20400, 0);
    });

    it('debe retornar base ISR = 0 cuando gastos > ingresos (no puede ser negativa)', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { subtotal: 10000, tax: 1600, total: 11600 } });
      mockPrisma.bill.aggregate.mockResolvedValue({ _sum: { subtotal: 80000, tax: 12800, total: 92800 } });
      mockPrisma.payrollPeriod.aggregate.mockResolvedValue({ _sum: { totalPerceptions: 20000, isr: 0, imssEmployer: 0 } });

      const result: any = await controller.getTaxSimulator('c1', '4', '2024');
      expect(result.isr.base).toBe(0);
      expect(result.isr.estimado).toBe(0);
    });

    it('debe retornar el periodo correcto en el resultado', async () => {
      mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { subtotal: 0, tax: 0, total: 0 } });
      mockPrisma.bill.aggregate.mockResolvedValue({ _sum: { subtotal: 0, tax: 0, total: 0 } });
      mockPrisma.payrollPeriod.aggregate.mockResolvedValue({ _sum: { totalPerceptions: 0, isr: 0, imssEmployer: 0 } });

      const result: any = await controller.getTaxSimulator('c1', '4', '2024');
      expect(result.period).toBe('4/2024');
    });
  });
});
