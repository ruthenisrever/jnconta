import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from './payroll.service';
import { PrismaService } from './prisma.service';
import { PayrollTaxesService } from './payroll-taxes.service';
import { BadRequestException } from '@nestjs/common';

describe('PayrollService', () => {
  let service: PayrollService;
  let prisma: any;
  let taxesService: any;

  const mockEmployee = {
    id: 'emp1',
    firstName: 'Juan',
    lastName: 'Pérez',
    dailySalary: 400,   // $400/día
    sdi: 420,           // SDI ligeramente mayor
    isActive: true,
    companyId: 'c1',
  };

  const mockPeriod = {
    id: 'per1',
    companyId: 'c1',
    startDate: new Date('2024-04-01'),
    endDate: new Date('2024-04-15'),
    status: 'BORRADOR',
    company: { id: 'c1', name: 'Test Corp' },
  };

  const mockPrisma = {
    payrollPeriod: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
    payrollReceipt: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockTaxesService = {
    calculateIsr: jest.fn(),
    calculateImssObrero: jest.fn(),
    adjustToPeriod: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PayrollTaxesService, useValue: mockTaxesService },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    prisma = module.get<PrismaService>(PrismaService);
    taxesService = module.get<PayrollTaxesService>(PayrollTaxesService);
  });

  // ──────────────────────────────────────────────
  // calculateEmployeeReceipt
  // ──────────────────────────────────────────────
  describe('calculateEmployeeReceipt', () => {
    beforeEach(() => {
      (prisma as any).employee.findUnique = jest.fn().mockResolvedValue(mockEmployee);
      (prisma as any).payrollPeriod.findUnique = jest.fn().mockResolvedValue(mockPeriod);
      (prisma as any).payrollReceipt.create = jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'receipt1' }));
      mockTaxesService.calculateIsr.mockReturnValue(1200);      // ISR mensual simulado
      mockTaxesService.calculateImssObrero.mockReturnValue(320); // IMSS obrero simulado
    });

    it('debe retornar null si el empleado no existe', async () => {
      (prisma as any).employee.findUnique = jest.fn().mockResolvedValue(null);
      const result = await service.calculateEmployeeReceipt('notfound', 'per1');
      expect(result).toBeNull();
    });

    it('debe retornar null si el periodo no existe', async () => {
      (prisma as any).payrollPeriod.findUnique = jest.fn().mockResolvedValue(null);
      const result = await service.calculateEmployeeReceipt('emp1', 'notfound');
      expect(result).toBeNull();
    });

    it('debe calcular 15 días correctamente (1 al 15)', async () => {
      const result: any = await service.calculateEmployeeReceipt('emp1', 'per1');
      // 15 días * $400/día = $6,000 percepciones brutas
      expect(result.totalPerceptions).toBeCloseTo(6000, 0);
    });

    it('debe calcular deducciones como ISR + IMSS', async () => {
      const result: any = await service.calculateEmployeeReceipt('emp1', 'per1');
      // ISR periodo = (1200 / 30.4) * 15 ≈ 592.1
      const isrPeriod = (1200 / 30.4) * 15;
      const expectedDeductions = isrPeriod + 320;
      expect(result.totalDeductions).toBeCloseTo(expectedDeductions, 0);
    });

    it('debe calcular netAmount = percepciones - deducciones', async () => {
      const result: any = await service.calculateEmployeeReceipt('emp1', 'per1');
      expect(result.netAmount).toBeCloseTo(result.totalPerceptions - result.totalDeductions, 0);
    });

    it('debe llamar al TaxesService con el equivalente mensual correcto', async () => {
      await service.calculateEmployeeReceipt('emp1', 'per1');
      // days = 15, grossSalary = 6000, monthlyEquivalent = (6000/15)*30.4 = 12160
      expect(mockTaxesService.calculateIsr).toHaveBeenCalledWith(expect.closeTo(12160, 0));
    });

    it('debe crear 3 items: 1 percepción (001) y 2 deducciones (001 IMSS, 002 ISR)', async () => {
      await service.calculateEmployeeReceipt('emp1', 'per1');
      const createCall = (prisma as any).payrollReceipt.create.mock.calls[0][0];
      const items = createCall.data.items.create;
      expect(items).toHaveLength(3);
      expect(items.filter((i: any) => i.type === 'P')).toHaveLength(1);
      expect(items.filter((i: any) => i.type === 'D')).toHaveLength(2);
    });
  });

  // ──────────────────────────────────────────────
  // calculatePeriod
  // ──────────────────────────────────────────────
  describe('calculatePeriod', () => {
    it('debe lanzar BadRequestException si el periodo no existe', async () => {
      mockPrisma.payrollPeriod.findUnique.mockResolvedValue(null);
      await expect(service.calculatePeriod('notfound')).rejects.toThrow(BadRequestException);
    });

    it('debe borrar recibos previos y recalcular para todos los empleados activos', async () => {
      mockPrisma.payrollPeriod.findUnique.mockResolvedValue(mockPeriod);
      (prisma as any).payrollReceipt.deleteMany = jest.fn().mockResolvedValue({ count: 3 });
      (prisma as any).employee.findMany = jest.fn().mockResolvedValue([
        { ...mockEmployee, id: 'emp1' },
        { ...mockEmployee, id: 'emp2' },
      ]);
      (prisma as any).employee.findUnique = jest.fn().mockResolvedValue(mockEmployee);
      (prisma as any).payrollPeriod.findUnique = jest.fn().mockResolvedValue(mockPeriod);
      (prisma as any).payrollReceipt.create = jest.fn().mockResolvedValue({ id: 'r1' });
      mockTaxesService.calculateIsr.mockReturnValue(500);
      mockTaxesService.calculateImssObrero.mockReturnValue(200);
      mockPrisma.payrollPeriod.update.mockResolvedValue({ ...mockPeriod, status: 'CALCULADA' });

      const result: any = await service.calculatePeriod('per1');
      expect((prisma as any).payrollReceipt.deleteMany).toHaveBeenCalledWith({ where: { periodId: 'per1' } });
      expect(result.status).toBe('CALCULADA');
    });
  });
});
