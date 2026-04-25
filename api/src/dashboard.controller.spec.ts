import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { PrismaService } from './prisma.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let prisma: any;

  const mockPrisma = {
    company: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'c1', name: 'Empresa Uno', rfc: 'EUN000101AAA' },
        { id: 'c2', name: 'Empresa Dos', rfc: 'EDO000202BBB' },
      ]),
    },
    invoice: { aggregate: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    bill: { aggregate: jest.fn(), count: jest.fn() },
    bankAccount: { aggregate: jest.fn() },
    client: { count: jest.fn().mockResolvedValue(5) },
    supplier: { count: jest.fn().mockResolvedValue(3) },
    employee: { count: jest.fn().mockResolvedValue(10) },
    product: { count: jest.fn().mockResolvedValue(25) },
    fixedAsset: { aggregate: jest.fn() },
    payrollPeriod: { aggregate: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    prisma = module.get<PrismaService>(PrismaService);

    // Defaults
    (prisma as any).invoice.aggregate.mockResolvedValue({ _sum: { total: 150000 }, _count: 12 });
    (prisma as any).bill.aggregate.mockResolvedValue({ _sum: { total: 60000 }, _count: 4 });
    (prisma as any).bankAccount.aggregate.mockResolvedValue({ _sum: { balance: 500000 } });
    (prisma as any).fixedAsset.aggregate.mockResolvedValue({ _sum: { netValue: 200000, acquisitionCost: 250000 } });
    (prisma as any).payrollPeriod.aggregate.mockResolvedValue({ _sum: { netPay: 80000, isr: 10000, imssEmployee: 5000, totalPerceptions: 100000 } });
    (prisma as any).bill.count.mockResolvedValue(2);
  });

  describe('getKpis', () => {
    it('debe retornar error si falta companyId', async () => {
      const result = await controller.getKpis('');
      expect(result).toHaveProperty('error');
    });

    it('debe retornar los KPIs correctamente con datos del mock', async () => {
      const result = await controller.getKpis('company1') as any;
      expect(result.ingresosMes).toBe(150000);
      expect(result.cxpPendiente).toBe(60000);
      expect(result.saldoBancario).toBe(500000);
      expect(result.clientes).toBe(5);
      expect(result.empleados).toBe(10);
      expect(result.productos).toBe(25);
    });

    it('debe manejar sumas nulas retornando 0', async () => {
      (prisma as any).invoice.aggregate.mockResolvedValue({ _sum: { total: null }, _count: 0 });
      (prisma as any).bankAccount.aggregate.mockResolvedValue({ _sum: { balance: null } });
      const result = await controller.getKpis('company1') as any;
      expect(result.ingresosMes).toBe(0);
      expect(result.saldoBancario).toBe(0);
    });
  });

  describe('getFiscalSummary', () => {
    it('debe retornar el resumen fiscal del mes con campos requeridos', async () => {
      const result = await controller.getFiscalSummary('company1') as any;
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('healthScore');
      expect(result).toHaveProperty('depreciacionProgreso');
    });

    it('debe calcular el progreso de depreciación correctamente', async () => {
      // acquisitionCost=250000, netValue=200000 => depreciado = 50000/250000 = 20%
      const result = await controller.getFiscalSummary('company1') as any;
      expect(result.depreciacionProgreso).toBe(20);
    });

    it('debe retornar error si falta companyId', async () => {
      const result = await controller.getFiscalSummary('') as any;
      expect(result).toHaveProperty('error');
    });
  });

  describe('getClientsStatus', () => {
    it('debe retornar un array con una entrada por empresa', async () => {
      (prisma as any).invoice.aggregate.mockResolvedValue({ _sum: { total: 75000 } });
      (prisma as any).bill.aggregate.mockResolvedValue({ _sum: { total: 20000 } });
      (prisma as any).payrollPeriod.aggregate.mockResolvedValue({ _count: 2 });
      (prisma as any).employee.count.mockResolvedValue(8);

      const result = await controller.getClientsStatus() as any[];
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('companyId', 'c1');
      expect(result[0]).toHaveProperty('name', 'Empresa Uno');
      expect(result[0]).toHaveProperty('rfc', 'EUN000101AAA');
    });

    it('debe incluir healthScore entre 0 y 100', async () => {
      (prisma as any).invoice.aggregate.mockResolvedValue({ _sum: { total: 0 } });
      (prisma as any).bill.aggregate.mockResolvedValue({ _sum: { total: 0 } });
      (prisma as any).payrollPeriod.aggregate.mockResolvedValue({ _count: 0 });
      (prisma as any).employee.count.mockResolvedValue(0);

      const result = await controller.getClientsStatus() as any[];
      result.forEach(c => {
        expect(c.healthScore).toBeGreaterThanOrEqual(0);
        expect(c.healthScore).toBeLessThanOrEqual(100);
      });
    });

    it('debe incluir ingresosMes y cxpPendiente por empresa', async () => {
      (prisma as any).invoice.aggregate.mockResolvedValue({ _sum: { total: 120000 } });
      (prisma as any).bill.aggregate.mockResolvedValue({ _sum: { total: 35000 } });
      (prisma as any).payrollPeriod.aggregate.mockResolvedValue({ _count: 1 });
      (prisma as any).employee.count.mockResolvedValue(5);

      const result = await controller.getClientsStatus() as any[];
      expect(result[0].ingresosMes).toBe(120000);
      expect(result[0].cxpPendiente).toBe(35000);
    });
  });
});
