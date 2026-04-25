import { Test, TestingModule } from '@nestjs/testing';
import { IaService } from './ia.service';
import { SatService } from '../sat.service';
import { PrismaService } from '../prisma.service';

describe('IaService — Javier AI v5.5', () => {
  let service: IaService;
  let prisma: any;
  let satService: any;

  const mockCompany = {
    id: 'c1', name: 'Empresa Test SA de CV',
    rfc: 'ETE010101AAA', regimenFiscal: '601 - General de Ley'
  };

  const mockPrisma = {
    company: { findUnique: jest.fn() },
    employee: { count: jest.fn() },
    bankAccount: { aggregate: jest.fn() },
    invoice: { aggregate: jest.fn() },
    bill: { aggregate: jest.fn() },
    fixedAsset: { count: jest.fn() },
    auditLog: { findMany: jest.fn() },
  };

  const mockSatService = {
    runRiskAnalysis: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SatService, useValue: mockSatService },
      ],
    }).compile();

    service = module.get<IaService>(IaService);
    prisma = module.get<PrismaService>(PrismaService);
    satService = module.get<SatService>(SatService);

    // Default happy-path setup
    mockPrisma.company.findUnique.mockResolvedValue(mockCompany);
    mockPrisma.employee.count.mockResolvedValue(12);
    mockPrisma.bankAccount.aggregate.mockResolvedValue({ _sum: { balance: 250000 } });
    mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { total: 120000 } });
    mockPrisma.bill.aggregate.mockResolvedValue({ _sum: { total: 45000 } });
    mockPrisma.fixedAsset.count.mockResolvedValue(5);
    mockSatService.runRiskAnalysis.mockResolvedValue([]);
  });

  describe('respondToChat — Modo Offline (sin API Key)', () => {
    // Override env to simulate no key
    const originalEnv = process.env.GEMINI_API_KEY;
    beforeAll(() => { delete process.env.GEMINI_API_KEY; });
    afterAll(() => { if (originalEnv) process.env.GEMINI_API_KEY = originalEnv; });

    it('debe responder sobre ISR en modo offline', async () => {
      const result: any = await service.respondToChat('c1', [], '¿Cuánto es la tasa de ISR?');
      expect(result.respuesta).toBeTruthy();
      expect(result.respuesta.toLowerCase()).toContain('isr');
    });

    it('debe responder sobre IVA en modo offline', async () => {
      const result: any = await service.respondToChat('c1', [], '¿Cómo calculo el IVA trasladado?');
      expect(result.respuesta).toBeTruthy();
      expect(result.respuesta.toLowerCase()).toContain('iva');
    });

    it('debe responder sobre IMSS en modo offline', async () => {
      const result: any = await service.respondToChat('c1', [], 'dudas sobre cuotas IMSS');
      expect(result.respuesta).toBeTruthy();
      expect(result.respuesta.toLowerCase()).toContain('imss');
    });

    it('debe responder sobre CFDI en modo offline', async () => {
      const result: any = await service.respondToChat('c1', [], '¿Qué versión de CFDI es obligatoria?');
      expect(result.respuesta).toBeTruthy();
      expect(result.respuesta.toLowerCase()).toContain('cfdi');
    });

    it('debe retornar mensaje genérico de modo offline para preguntas no cubiertas', async () => {
      const result: any = await service.respondToChat('c1', [], '¿Cuánto vale el dólar?');
      expect(result.respuesta).toBeTruthy();
      // Should contain offline mode message
      expect(typeof result.respuesta).toBe('string');
      expect(result.respuesta.length).toBeGreaterThan(10);
    });

    it('debe lanzar error si la empresa no existe', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      await expect(service.respondToChat('notexist', [], 'hola')).rejects.toThrow('Empresa no encontrada');
    });

    it('debe consultar runRiskAnalysis para enriquecer el contexto', async () => {
      await service.respondToChat('c1', [], 'pregunta de prueba sobre nómina');
      expect(mockSatService.runRiskAnalysis).toHaveBeenCalledWith('c1');
    });

    it('debe manejar error en runRiskAnalysis sin fallar (graceful degradation)', async () => {
      mockSatService.runRiskAnalysis.mockRejectedValue(new Error('SAT timeout'));
      // Should still respond (offlineResponse)
      const result = await service.respondToChat('c1', [], 'ISR');
      expect(result).toBeTruthy();
    });
  });

  describe('auditAnomalies — sin API Key', () => {
    const originalEnv = process.env.GEMINI_API_KEY;
    beforeAll(() => { delete process.env.GEMINI_API_KEY; });
    afterAll(() => { if (originalEnv) process.env.GEMINI_API_KEY = originalEnv; });

    it('debe retornar anomalías generadas con mensaje de IA desactivada', async () => {
      const result: any = await service.auditAnomalies('c1');
      expect(result.anomalies).toBeInstanceOf(Array);
      expect(result.anomalies[0]).toHaveProperty('severity');
      expect(result.anomalies[0]).toHaveProperty('message');
    });
  });

  describe('predictNextMonthTaxes — sin API Key', () => {
    const originalEnv = process.env.GEMINI_API_KEY;
    beforeAll(() => { delete process.env.GEMINI_API_KEY; });
    afterAll(() => { if (originalEnv) process.env.GEMINI_API_KEY = originalEnv; });

    it('debe retornar mensaje de API Key no configurada', async () => {
      const result: any = await service.predictNextMonthTaxes('c1');
      expect(result).toHaveProperty('text');
    });
  });
});
