import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const csv = require('csv-parse/sync');

export interface BankStatementRow {
  date: Date;
  concept: string;
  amount: number;
  reference?: string;
  hash: string; // New field for duplicate detection
}

@Injectable()
export class StatementParserService {
  private readonly logger = new Logger(StatementParserService.name);

  /**
   * Procesa un archivo CSV/Texto y devuelve una lista estandarizada de movimientos.
   */
  async parse(rawContent: string, bankType: string = 'GENERIC'): Promise<BankStatementRow[]> {
    try {
      // Intentar detectar delimitador (comas o pipes)
      const delimiter = rawContent.includes('|') ? '|' : ',';
      
      const records = csv.parse(rawContent, {
        columns: false,
        skip_empty_lines: true,
        trim: true,
        delimiter
      });

      const rows: BankStatementRow[] = [];

      for (const record of records) {
        let date: Date;
        let concept: string = '';
        let amount: number = 0;
        let reference: string = '';

        // Lógica por Banco
        switch (bankType.toUpperCase()) {
          case 'BBVA':
            // Ejemplo BBVA: Fecha, Concepto, Retiro, Deposito, Saldo
            date = this.parseDate(record[0]);
            concept = record[1];
            const retiro = parseFloat(record[2] || '0');
            const deposito = parseFloat(record[3] || '0');
            amount = deposito > 0 ? deposito : -retiro;
            break;

          case 'SANTANDER':
            // Ejemplo Santander: Fecha, Referencia, Concepto, Importe, Saldo
            date = this.parseDate(record[0]);
            reference = record[1];
            concept = record[2];
            amount = parseFloat(record[3]);
            break;

          default: // GENERIC: Fecha, Concepto, Importe
            date = this.parseDate(record[0]);
            concept = record[1];
            amount = parseFloat(record[2]);
            break;
        }

        if (isNaN(date.getTime())) {
          this.logger.warn(`Línea omitida - Fecha inválida: ${record[0]}`);
          continue;
        }

        // Generar Hash Único para detección de duplicados
        const hashStr = `${date.toISOString()}|${concept}|${amount}|${reference}`;
        const hash = crypto.createHash('sha256').update(hashStr).digest('hex');

        rows.push({ date, concept, amount, reference, hash });
      }

      return rows;
    } catch (e) {
      this.logger.error(`Error procesando estado de cuenta: ${e.message}`);
      throw new Error(`No se pudo procesar el archivo bancario: ${e.message}`);
    }
  }

  private parseDate(str: string): Date {
    // Soporta formatos DD/MM/YYYY o YYYY-MM-DD
    if (!str) return new Date(NaN);
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) return new Date(str); // YYYY-MM-DD
      return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])); // DD/MM/YYYY
    }
    return new Date(str);
  }
}
