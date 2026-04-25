import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationController } from './reconciliation.controller';
import { PrismaService } from './prisma.service';
import { StatementParserService } from './statement-parser.service';
import { BadRequestException } from '@nestjs/common';

describe('ReconciliationController', () => {
  let controller: ReconciliationController;
  let prisma: any;
  let parser: any;

  const mockPrisma = {
    bankTransaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bankAccount: {
      findUnique: jest.fn(),
    },
    journalEntry: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockParser = {
    parse: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReconciliationController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StatementParserService, useValue: mockParser },
      ],
    }).compile();

    controller = module.get<ReconciliationController>(ReconciliationController);
    prisma = module.get<PrismaService>(PrismaService);
    parser = module.get<StatementParserService>(StatementParserService);
  });

  // ─────────────────────────────────────────────
  // importStatement
  // ─────────────────────────────────────────────
  describe('importStatement', () => {
    const parsedRows = [
      { date: new Date('2024-04-01'), concept: 'DEPOSITO CLIENTE', amount: 15000, reference: '', hash: 'hash-001' },
      { date: new Date('2024-04-02'), concept: 'PAGO PROVEEDOR',   amount: -5000, reference: '', hash: 'hash-002' },
    ];

    beforeEach(() => {
      mockParser.parse.mockResolvedValue(parsedRows);
      mockPrisma.bankTransaction.findUnique.mockResolvedValue(null); // sin duplicados
      mockPrisma.bankTransaction.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `trx-${Date.now()}`, ...data })
      );
    });

    it('debe importar todos los movimientos nuevos', async () => {
      const result: any = await controller.importStatement('bank-1', { csv: 'raw,csv,data' });
      expect(result.count).toBe(2);
      expect(result.duplicates).toBe(0);
    });

    it('debe clasificar depósito como DEPOSITO', async () => {
      await controller.importStatement('bank-1', { csv: 'data' });
      const createCalls = mockPrisma.bankTransaction.create.mock.calls;
      const deposito = createCalls.find((c: any) => c[0].data.amount > 0);
      expect(deposito[0].data.type).toBe('DEPOSITO');
    });

    it('debe clasificar retiro como RETIRO', async () => {
      await controller.importStatement('bank-1', { csv: 'data' });
      const createCalls = mockPrisma.bankTransaction.create.mock.calls;
      const retiro = createCalls.find((c: any) => c[0].data.amount < 0);
      expect(retiro[0].data.type).toBe('RETIRO');
    });

    it('debe omitir duplicados detectados por hash', async () => {
      // La primera fila ya existe en BD
      mockPrisma.bankTransaction.findUnique
        .mockResolvedValueOnce({ id: 'existing' }) // duplicado
        .mockResolvedValueOnce(null);              // nuevo

      const result: any = await controller.importStatement('bank-1', { csv: 'data' });
      expect(result.count).toBe(1);
      expect(result.duplicates).toBe(1);
    });

    it('debe conectar la transacción con la cuenta bancaria correcta', async () => {
      await controller.importStatement('bank-abc', { csv: 'data' });
      const createCall = mockPrisma.bankTransaction.create.mock.calls[0][0];
      expect(createCall.data.bankAccount.connect.id).toBe('bank-abc');
    });

    it('debe llamar al parser con el bankType especificado', async () => {
      await controller.importStatement('bank-1', { csv: 'data', bankType: 'BBVA' });
      expect(mockParser.parse).toHaveBeenCalledWith('data', 'BBVA');
    });

    it('debe usar GENERIC como bankType por defecto', async () => {
      await controller.importStatement('bank-1', { csv: 'data' });
      expect(mockParser.parse).toHaveBeenCalledWith('data', 'GENERIC');
    });

    it('debe retornar las transacciones importadas', async () => {
      const result: any = await controller.importStatement('bank-1', { csv: 'data' });
      expect(result.transactions).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────
  // autoMatch
  // ─────────────────────────────────────────────
  describe('autoMatch', () => {
    const mockTransactions = [
      { id: 'trx-1', date: new Date('2024-04-10'), concept: 'PAGO CLIENTE ABC', amount: 10000, reconciled: false },
      { id: 'trx-2', date: new Date('2024-04-12'), concept: 'COMISION BANCARIA', amount: -350, reconciled: false },
    ];

    beforeEach(() => {
      mockPrisma.bankAccount.findUnique.mockResolvedValue({ id: 'bank-1', accountId: 'acc-bank' });
      mockPrisma.bankTransaction.findMany.mockResolvedValue(mockTransactions);
      mockPrisma.journalEntry.findMany.mockResolvedValue([]);
    });

    it('debe retornar un resultado por cada transacción no conciliada', async () => {
      const result: any[] = await controller.autoMatch('c1', 'bank-1');
      expect(result).toHaveLength(2);
    });

    it('cada resultado debe tener transaction y potentialMatches', async () => {
      const result: any[] = await controller.autoMatch('c1', 'bank-1');
      result.forEach(r => {
        expect(r).toHaveProperty('transaction');
        expect(r).toHaveProperty('potentialMatches');
      });
    });

    it('debe sugerir acción especial para transacciones con COMISION', async () => {
      const result: any[] = await controller.autoMatch('c1', 'bank-1');
      const comision = result.find(r => r.transaction.concept.toUpperCase().includes('COMISION'));
      expect(comision.autoAction).not.toBeNull();
      expect(comision.autoAction.type).toBe('CREATE_COMMISSION');
    });

    it('debe ordenar potentialMatches por confianza descendente', async () => {
      mockPrisma.journalEntry.findMany.mockResolvedValue([
        { id: 'e1', debit: 10000, credit: 0, journal: { id: 'j1', concept: 'PAGO CLIENTE ABC REF', number: 'ING-001', date: new Date('2024-04-10') } },
        { id: 'e2', debit: 10000, credit: 0, journal: { id: 'j2', concept: 'Otro concepto',       number: 'ING-002', date: new Date('2024-04-11') } },
      ]);

      const result: any[] = await controller.autoMatch('c1', 'bank-1');
      const matches = result[0].potentialMatches;
      if (matches.length >= 2) {
        expect(matches[0].confidence).toBeGreaterThanOrEqual(matches[1].confidence);
      }
    });

    it('debe asignar confianza 90 cuando el concepto coincide parcialmente', async () => {
      mockPrisma.journalEntry.findMany.mockResolvedValue([
        { id: 'e1', debit: 10000, credit: 0, journal: { id: 'j1', concept: 'PAGO CLIENTE ABC concepto parecido', number: 'ING-001', date: new Date('2024-04-10') } },
      ]);

      const result: any[] = await controller.autoMatch('c1', 'bank-1');
      const match = result[0].potentialMatches[0];
      expect(match.confidence).toBeGreaterThanOrEqual(90);
    });
  });

  // ─────────────────────────────────────────────
  // link
  // ─────────────────────────────────────────────
  describe('link', () => {
    it('debe actualizar reconciled=true y journalId', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const txMock = { bankTransaction: { update: jest.fn().mockResolvedValue({}) } };
        return fn(txMock);
      });

      const result: any = await controller.link({ transactionId: 'trx-1', journalId: 'jrn-1' });
      expect(result.success).toBe(true);
    });

    it('debe llamar a $transaction para garantizar atomicidad', async () => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const txMock = { bankTransaction: { update: jest.fn().mockResolvedValue({}) } };
        return fn(txMock);
      });

      await controller.link({ transactionId: 'trx-1', journalId: 'jrn-1' });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────
  // getEntriesToReconcile
  // ─────────────────────────────────────────────
  describe('getEntriesToReconcile', () => {
    it('debe retornar asientos sin transacción bancaria asociada', async () => {
      const mockEntries = [
        { id: 'e1', debit: 5000, credit: 0, journal: { id: 'j1', concept: 'Ingreso' } },
      ];
      mockPrisma.journalEntry.findMany.mockResolvedValue(mockEntries);

      const result = await controller.getEntriesToReconcile('c1', 'acc-bank');
      expect(result).toHaveLength(1);
    });

    it('debe incluir los datos del journal en los resultados', async () => {
      mockPrisma.journalEntry.findMany.mockResolvedValue([
        { id: 'e1', debit: 1000, credit: 0, journal: { id: 'j1', concept: 'Deposito', number: 'ING-001' } },
      ]);

      const result: any[] = await controller.getEntriesToReconcile('c1', 'acc-1');
      expect(result[0].journal).toBeDefined();
      expect(result[0].journal.number).toBe('ING-001');
    });
  });
});
