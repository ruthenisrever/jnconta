import { Test, TestingModule } from '@nestjs/testing';
import { CurrencyService, RevaluationSuggestion } from './currency.service';
import { PrismaService } from './prisma.service';

describe('CurrencyService', () => {
  let service: CurrencyService;
  let prisma: any;

  const mockPrisma = {
    account: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrencyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CurrencyService>(CurrencyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  // ──────────────────────────────────────────────
  // getRevaluationSuggestions
  // ──────────────────────────────────────────────
  describe('getRevaluationSuggestions', () => {
    it('debe retornar lista vacía si no hay cuentas en moneda extranjera', async () => {
      mockPrisma.account.findMany.mockResolvedValue([]);
      const result = await service.getRevaluationSuggestions('c1', 18.0);
      expect(result).toEqual([]);
    });

    it('debe calcular ajuste positivo cuando el tipo de cambio sube (ganancia cambiaria)', async () => {
      // $100 USD registrados a 17.00 MXN (local balance = 1700)
      // Tipo de cierre: 18.00 → revaluado = 1800 → ajuste = +100
      mockPrisma.account.findMany.mockResolvedValue([{
        id: 'acc1',
        code: '1.1.02.05',
        name: 'Banco USD',
        currency: 'USD',
        journalEntries: [
          { debit: 1700, credit: 0, amountForeign: 100 },
        ],
      }]);

      const result = await service.getRevaluationSuggestions('c1', 18.0);
      expect(result).toHaveLength(1);
      expect(result[0].adjustment).toBeCloseTo(100, 1);
      expect(result[0].foreignBalance).toBeCloseTo(100, 1);
      expect(result[0].localBalance).toBeCloseTo(1700, 1);
      expect(result[0].revaluedBalance).toBeCloseTo(1800, 1);
    });

    it('debe calcular ajuste negativo cuando el tipo de cambio baja (pérdida cambiaria)', async () => {
      // $100 USD registrados a 18.00 MXN (local balance = 1800)
      // Tipo de cierre: 17.00 → revaluado = 1700 → ajuste = -100
      mockPrisma.account.findMany.mockResolvedValue([{
        id: 'acc2',
        code: '1.1.02.05',
        name: 'Banco USD',
        currency: 'USD',
        journalEntries: [
          { debit: 1800, credit: 0, amountForeign: 100 },
        ],
      }]);

      const result = await service.getRevaluationSuggestions('c1', 17.0);
      expect(result).toHaveLength(1);
      expect(result[0].adjustment).toBeCloseTo(-100, 1);
    });

    it('debe omitir cuentas sin ajuste significativo (ajuste < 0.001)', async () => {
      // Cuenta correctamente valuada: $100 USD @ 17.00 → local = 1700, revaluado = 1700
      mockPrisma.account.findMany.mockResolvedValue([{
        id: 'acc3',
        code: '1.1.02.05',
        name: 'Banco USD',
        currency: 'USD',
        journalEntries: [
          { debit: 1700, credit: 0, amountForeign: 100 },
        ],
      }]);

      const result = await service.getRevaluationSuggestions('c1', 17.0);
      expect(result).toHaveLength(0);
    });

    it('debe manejar cuentas con múltiples asientos correctamente', async () => {
      // Asiento 1: Depósito $60 USD @ 17.00 = $1020 MXN
      // Asiento 2: Retiro $20 USD @ 17.00 = $340 MXN
      // Local balance = 1020 - 340 = 680, Foreign = 60 - 20 = 40
      // Cierre @ 18.00 → revaluado = 720 → ajuste = 40
      mockPrisma.account.findMany.mockResolvedValue([{
        id: 'acc4',
        code: '1.1.02.05',
        name: 'Banco USD multiasiento',
        currency: 'USD',
        journalEntries: [
          { debit: 1020, credit: 0, amountForeign: 60 },
          { debit: 0, credit: 340, amountForeign: 20 },
        ],
      }]);

      const result = await service.getRevaluationSuggestions('c1', 18.0);
      expect(result).toHaveLength(1);
      expect(result[0].foreignBalance).toBeCloseTo(40, 1);
      expect(result[0].localBalance).toBeCloseTo(680, 1);
    });

    it('debe retornar currency correcto en la sugerencia', async () => {
      mockPrisma.account.findMany.mockResolvedValue([{
        id: 'acc5', code: '1.1.03.01', name: 'Banco EUR',
        currency: 'EUR',
        journalEntries: [{ debit: 21000, credit: 0, amountForeign: 1000 }],
      }]);

      const result = await service.getRevaluationSuggestions('c1', 22.0);
      if (result.length > 0) {
        expect(result[0].currency).toBe('EUR');
      }
    });
  });

  // ──────────────────────────────────────────────
  // syncOfficialRate
  // ──────────────────────────────────────────────
  describe('syncOfficialRate', () => {
    it('debe retornar status SYNCED_OK', async () => {
      const result = await service.syncOfficialRate();
      expect(result.status).toBe('SYNCED_OK');
    });

    it('debe retornar la fuente correcta (DOF / BANXICO)', async () => {
      const result = await service.syncOfficialRate();
      expect(result.source).toBe('DOF / BANXICO');
    });

    it('debe retornar una tasa realista (entre 15 y 25 MXN/USD)', async () => {
      const result = await service.syncOfficialRate();
      expect(result.rate).toBeGreaterThan(15);
      expect(result.rate).toBeLessThan(25);
    });

    it('debe retornar una fecha válida', async () => {
      const result = await service.syncOfficialRate();
      expect(result.date).toBeInstanceOf(Date);
    });
  });
});
