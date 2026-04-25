import { FiscalService } from './fiscal.service';
import { PrismaService } from './prisma.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('FiscalService', () => {
  let service: FiscalService;
  let prisma: PrismaService;

  const mockTaxRecords = [
    {
      type: 'TRASLADADO',
      base16: 10000, iva16: 1600,
      base8: 0, iva8: 0,
      base0: 0, baseExempt: 0,
      retIva: 0, retIsr: 0,
    },
    {
      type: 'ACREDITABLE',
      base16: 5000, iva16: 800,
      base8: 500, iva8: 40,
      base0: 0, baseExempt: 200,
      retIva: 100, retIsr: 50,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FiscalService,
        {
          provide: PrismaService,
          useValue: {
            taxControl: {
              findMany: jest.fn().mockResolvedValue(mockTaxRecords),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FiscalService>(FiscalService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getMonthlyTaxWorksheet', () => {
    it('debe retornar la estructura correcta del papel de trabajo', async () => {
      const result = await service.getMonthlyTaxWorksheet('company1', 4, 2024);
      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('ivaNeto');
      expect(result).toHaveProperty('ivaAFavor');
    });

    it('debe agregar correctamente los totales trasladados', async () => {
      const result = await service.getMonthlyTaxWorksheet('company1', 4, 2024);
      expect(result.summary.trasladado.base16).toBe(10000);
      expect(result.summary.trasladado.iva16).toBe(1600);
      expect(result.summary.trasladado.totalBase).toBe(10000);
      expect(result.summary.trasladado.totalIva).toBe(1600);
    });

    it('debe agregar correctamente los totales acreditables', async () => {
      const result = await service.getMonthlyTaxWorksheet('company1', 4, 2024);
      expect(result.summary.acreditable.base16).toBe(5000);
      expect(result.summary.acreditable.iva16).toBe(800);
      expect(result.summary.acreditable.base8).toBe(500);
      expect(result.summary.acreditable.iva8).toBe(40);
      expect(result.summary.acreditable.baseExempt).toBe(200);
      expect(result.summary.acreditable.totalIva).toBe(840); // 800 + 40
    });

    it('debe calcular correctamente el IVA neto (trasladado - acreditable - retención)', async () => {
      // 1600 (trasladado) - 840 (acreditable) - 100 (retIva) = 660
      const result = await service.getMonthlyTaxWorksheet('company1', 4, 2024);
      expect(result.ivaNeto).toBeCloseTo(660, 1);
      expect(result.ivaAFavor).toBe(0);
    });

    it('debe retornar ivaAFavor cuando el acreditable supera el trasladado', async () => {
      (prisma as any).taxControl.findMany.mockResolvedValue([
        {
          type: 'ACREDITABLE',
          base16: 20000, iva16: 3200,
          base8: 0, iva8: 0,
          base0: 0, baseExempt: 0,
          retIva: 0, retIsr: 0,
        },
      ]);
      const result = await service.getMonthlyTaxWorksheet('company1', 4, 2024);
      expect(result.ivaAFavor).toBeGreaterThan(0);
      expect(result.ivaNeto).toBe(0);
    });

    it('debe retornar 0s cuando no hay registros fiscales', async () => {
      (prisma as any).taxControl.findMany.mockResolvedValue([]);
      const result = await service.getMonthlyTaxWorksheet('company1', 4, 2024);
      expect(result.ivaNeto).toBe(0);
      expect(result.ivaAFavor).toBe(0);
    });

    it('debe acumular retenciones de múltiples registros', async () => {
      (prisma as any).taxControl.findMany.mockResolvedValue([
        { type: 'TRASLADADO', base16: 0, iva16: 0, base8: 0, iva8: 0, base0: 0, baseExempt: 0, retIva: 200, retIsr: 100 },
        { type: 'ACREDITABLE', base16: 0, iva16: 0, base8: 0, iva8: 0, base0: 0, baseExempt: 0, retIva: 300, retIsr: 50 },
      ]);
      const result = await service.getMonthlyTaxWorksheet('company1', 4, 2024);
      expect(result.summary.retentions.iva).toBe(500); // 200 + 300
      expect(result.summary.retentions.isr).toBe(150); // 100 + 50
    });
  });
});
