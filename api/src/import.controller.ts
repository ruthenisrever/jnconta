import { Controller, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';

@Controller('import')
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private prisma: PrismaService) {}

  @Post('clients')
  async importClients(@Query('companyId') companyId: string, @Body() body: { rows: any[] }) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (const row of body.rows) {
      try {
        if (!row.name) { results.errors.push(`Fila sin nombre`); continue; }
        const code = row.code || `CLI-${Date.now()}-${Math.random().toString(36).substr(2,4)}`;
        await this.prisma.client.upsert({
          where: { code_companyId: { code, companyId } },
          update: { name: row.name, rfc: row.rfc, email: row.email, phone: row.phone },
          create: { code, name: row.name, rfc: row.rfc, email: row.email, phone: row.phone, companyId },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`${row.name}: ${e.message}`);
        results.skipped++;
      }
    }
    return results;
  }

  @Post('suppliers')
  async importSuppliers(@Query('companyId') companyId: string, @Body() body: { rows: any[] }) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (const row of body.rows) {
      try {
        if (!row.name) { results.errors.push(`Fila sin nombre`); continue; }
        const code = row.code || `PROV-${Date.now()}-${Math.random().toString(36).substr(2,4)}`;
        await this.prisma.supplier.upsert({
          where: { code_companyId: { code, companyId } },
          update: { name: row.name, rfc: row.rfc, email: row.email, phone: row.phone },
          create: { code, name: row.name, rfc: row.rfc, email: row.email, phone: row.phone, companyId },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`${row.name}: ${e.message}`);
        results.skipped++;
      }
    }
    return results;
  }

  @Post('products')
  async importProducts(@Query('companyId') companyId: string, @Body() body: { rows: any[] }) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (const row of body.rows) {
      try {
        if (!row.sku || !row.name) { results.errors.push(`Fila sin SKU o nombre`); continue; }
        await this.prisma.product.upsert({
          where: { sku_companyId: { sku: row.sku, companyId } },
          update: { name: row.name, description: row.description, cost: Number(row.cost ?? 0), price: Number(row.price ?? 0), stock: Number(row.stock ?? 0), unit: row.unit ?? 'PZA' },
          create: { sku: row.sku, name: row.name, description: row.description, cost: Number(row.cost ?? 0), price: Number(row.price ?? 0), stock: Number(row.stock ?? 0), unit: row.unit ?? 'PZA', companyId },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`${row.sku}: ${e.message}`);
        results.skipped++;
      }
    }
    return results;
  }

  @Post('accounts')
  async importAccounts(@Query('companyId') companyId: string, @Body() body: { rows: any[] }) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };
    for (const row of body.rows) {
      try {
        if (!row.code || !row.name) { results.errors.push(`Fila sin código o nombre`); continue; }
        await this.prisma.account.upsert({
          where: { code_companyId: { code: row.code, companyId } },
          update: { name: row.name, type: row.type, nature: row.nature ?? 'DEUDORA', satCode: row.satCode },
          create: { code: row.code, name: row.name, type: row.type ?? 'ACTIVO', nature: row.nature ?? 'DEUDORA', level: Number(row.level ?? 1), satCode: row.satCode, companyId },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push(`${row.code}: ${e.message}`);
        results.skipped++;
      }
    }
    return results;
  }

  @Post('parse-csv')
  async parseCsv(@Body() body: { csv: string; delimiter?: string }) {
    const delim = body.delimiter ?? ',';
    const lines = body.csv.trim().split('\n');
    if (lines.length < 2) throw new BadRequestException('CSV debe tener al menos encabezado y una fila');
    const headers = lines[0].split(delim).map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(delim).map(v => v.trim().replace(/"/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      return obj;
    });
    return { headers, rows, count: rows.length };
  }
}
