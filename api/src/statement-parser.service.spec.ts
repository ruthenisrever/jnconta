import { StatementParserService, BankStatementRow } from './statement-parser.service';

describe('StatementParserService', () => {
  let service: StatementParserService;

  beforeEach(() => {
    service = new StatementParserService();
  });

  // ─────────────────────────────────────────────
  // Formato GENERIC
  // ─────────────────────────────────────────────
  describe('GENERIC format (Fecha, Concepto, Importe)', () => {
    it('debe parsear una línea con YYYY-MM-DD correctamente', async () => {
      const csv = '2024-04-01,Pago proveedor XYZ,1500.00';
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows).toHaveLength(1);
      expect(rows[0].concept).toBe('Pago proveedor XYZ');
      expect(rows[0].amount).toBe(1500);
      expect(rows[0].date).toBeInstanceOf(Date);
      expect(rows[0].date.getFullYear()).toBe(2024);
    });

    it('debe parsear una línea con formato DD/MM/YYYY', async () => {
      const csv = '15/04/2024,Deposito cliente,25000.00';
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows).toHaveLength(1);
      expect(rows[0].date.getDate()).toBe(15);
      expect(rows[0].date.getMonth()).toBe(3); // abril = índice 3
      expect(rows[0].date.getFullYear()).toBe(2024);
    });

    it('debe parsear importes negativos como retiros', async () => {
      const csv = '2024-04-05,Retiro ATM,-3000.00';
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows[0].amount).toBe(-3000);
    });

    it('debe parsear múltiples líneas', async () => {
      const csv = [
        '2024-04-01,Pago A,1000',
        '2024-04-02,Pago B,2000',
        '2024-04-03,Retiro,-500',
      ].join('\n');
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows).toHaveLength(3);
    });

    it('debe ignorar líneas con fecha inválida', async () => {
      const csv = [
        '2024-04-01,Pago válido,1000',
        'no-es-fecha,Linea inválida,999',
        '2024-04-03,Otro pago,500',
      ].join('\n');
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows).toHaveLength(2);
      expect(rows.some(r => r.concept === 'Linea inválida')).toBe(false);
    });

    it('debe ignorar líneas vacías', async () => {
      const csv = '2024-04-01,Pago,1000\n\n\n2024-04-02,Otro,500';
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows).toHaveLength(2);
    });

    it('debe generar hash único por fila', async () => {
      const csv = '2024-04-01,Pago,1000\n2024-04-02,Pago,1000';
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows[0].hash).not.toBe(rows[1].hash);
    });

    it('debe generar el mismo hash para la misma fila (idempotencia)', async () => {
      const csv = '2024-04-01,Pago,1000';
      const r1 = await service.parse(csv, 'GENERIC');
      const r2 = await service.parse(csv, 'GENERIC');
      expect(r1[0].hash).toBe(r2[0].hash);
    });

    it('el hash debe ser una cadena hex de 64 caracteres (SHA-256)', async () => {
      const csv = '2024-04-01,Test,500';
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows[0].hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ─────────────────────────────────────────────
  // Formato BBVA (Fecha, Concepto, Retiro, Deposito, Saldo)
  // ─────────────────────────────────────────────
  describe('BBVA format', () => {
    it('debe interpretar depósito cuando columna deposito > 0', async () => {
      const csv = '2024-04-10,TRANSFERENCIA RECIBIDA,0,50000,150000';
      const rows = await service.parse(csv, 'BBVA');
      expect(rows[0].amount).toBe(50000);
    });

    it('debe interpretar retiro como negativo cuando retiro > 0', async () => {
      const csv = '2024-04-11,PAGO DOMICILIADO,12000,0,138000';
      const rows = await service.parse(csv, 'BBVA');
      expect(rows[0].amount).toBe(-12000);
    });

    it('debe parsear fecha BBVA en formato DD/MM/YYYY', async () => {
      const csv = '20/04/2024,CARGO,5000,0,100000';
      const rows = await service.parse(csv, 'BBVA');
      expect(rows[0].date.getDate()).toBe(20);
      expect(rows[0].date.getMonth()).toBe(3);
    });

    it('debe manejar múltiples movimientos BBVA', async () => {
      const csv = [
        '01/04/2024,DEPOSITO NOMINA,0,18500,50000',
        '05/04/2024,PAGO LUZ CFE,1200,0,48800',
        '10/04/2024,RETIRO CAJERO,3000,0,45800',
      ].join('\n');
      const rows = await service.parse(csv, 'BBVA');
      expect(rows).toHaveLength(3);
      expect(rows[0].amount).toBe(18500);
      expect(rows[1].amount).toBe(-1200);
      expect(rows[2].amount).toBe(-3000);
    });
  });

  // ─────────────────────────────────────────────
  // Formato SANTANDER (Fecha, Referencia, Concepto, Importe, Saldo)
  // ─────────────────────────────────────────────
  describe('SANTANDER format', () => {
    it('debe extraer referencia correctamente', async () => {
      const csv = '2024-04-01,REF-001,Transferencia recibida,10000,60000';
      const rows = await service.parse(csv, 'SANTANDER');
      expect(rows[0].reference).toBe('REF-001');
      expect(rows[0].concept).toBe('Transferencia recibida');
      expect(rows[0].amount).toBe(10000);
    });

    it('debe parsear importe negativo en Santander', async () => {
      const csv = '2024-04-02,REF-002,Cargo servicio,-800,59200';
      const rows = await service.parse(csv, 'SANTANDER');
      expect(rows[0].amount).toBe(-800);
    });
  });

  // ─────────────────────────────────────────────
  // Formato con separador PIPE (|)
  // ─────────────────────────────────────────────
  describe('delimitador automático por pipes (|)', () => {
    it('debe detectar pipes como delimitador', async () => {
      const csv = '2024-04-01|Pago pipe|2500';
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows).toHaveLength(1);
      expect(rows[0].amount).toBe(2500);
      expect(rows[0].concept).toBe('Pago pipe');
    });
  });

  // ─────────────────────────────────────────────
  // Manejo de errores
  // ─────────────────────────────────────────────
  describe('manejo de errores', () => {
    it('debe retornar array vacío para CSV completamente vacío', async () => {
      const rows = await service.parse('', 'GENERIC');
      expect(rows).toEqual([]);
    });

    it('debe retornar array vacío cuando todas las fechas son inválidas', async () => {
      const csv = 'nodate,Concepto,100\notro,Otro,200';
      const rows = await service.parse(csv, 'GENERIC');
      expect(rows).toHaveLength(0);
    });
  });
});
