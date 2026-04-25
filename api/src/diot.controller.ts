import { Controller, Get, Query, Res, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Response } from 'express';

@Controller('diot')
export class DiotController {
  constructor(private prisma: PrismaService) {}

  private fmt(val: any): string {
    if (val === null || val === undefined || val === '') return '';
    return String(val);
  }

  private fmtAmount(val: number): string {
    if (!val || val === 0) return '';
    return Math.round(val).toString();
  }

  @Get('preview')
  async preview(
    @Query('companyId') companyId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const m = parseInt(month);
    const y = parseInt(year);
    if (!m || !y || !companyId)
      throw new BadRequestException('companyId, month y year son requeridos.');

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    // Obtener registros de Control de Impuestos para proveedores (ACREDITABLE)
    const movements = await this.prisma.taxControl.findMany({
      where: {
        companyId,
        type: 'ACREDITABLE',
        date: { gte: startDate, lte: endDate },
      }
    });

    const supplierMap = new Map<string, any>();

    for (const mov of movements) {
      const key = mov.rfc || 'XEXX010101000'; // Genérico si no hay rfc

      if (!supplierMap.has(key)) {
        const supplier = mov.supplierId ? await this.prisma.supplier.findUnique({ where: { id: mov.supplierId } }) : null;
        supplierMap.set(key, {
          rfc: mov.rfc || '',
          name: supplier?.name || 'Proveedor Sin Registro',
          type: mov.thirdPartyType || supplier?.type || '04',
          operationType: mov.operationType || supplier?.operationType || '03',
          taxId: supplier?.taxId || '',
          country: supplier?.country || '',
          base16: 0, iva16: 0,
          base8: 0, iva8: 0,
          base0: 0, baseExento: 0,
          ivaRetained: 0,
          ivaNoAcreditable16: 0,
          totalPaid: 0,
          count: 0
        });
      }

      const row = supplierMap.get(key);
      row.count++;
      row.base16 += mov.base16;
      row.iva16 += mov.iva16;
      row.base8 += mov.base8;
      row.iva8 += mov.iva8;
      row.base0 += mov.base0;
      row.baseExento += mov.baseExempt;
      row.ivaRetained += mov.retIva;
      row.totalPaid += (mov.base16 + mov.base8 + mov.base0 + mov.baseExempt + mov.iva16 + mov.iva8 - mov.retIva);
    }

    return Array.from(supplierMap.values());
  }

  @Get('export')
  async export(
    @Query('companyId') companyId: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const data = await this.preview(companyId, month, year);

    /**
     * Formato DIOT – Anexo 8 de la RMF
     * 38 columnas separadas por pipe "|", terminadas en CRLF
     */
    let layout = '';

    for (const row of data) {
      const isLocal = row.type !== '05';

      const cols = [
        this.fmt(row.type),                    // 1: Tipo de Tercero
        this.fmt(row.operationType),            // 2: Tipo de Operación
        isLocal ? this.fmt(row.rfc) : '',       // 3: RFC (nacionales)
        !isLocal ? this.fmt(row.taxId) : '',    // 4: ID Fiscal (extranjeros)
        !isLocal ? this.fmt(row.name) : '',     // 5: Nombre (extranjeros)
        !isLocal ? this.fmt(row.country) : '',  // 6: País de Residencia
        !isLocal ? 'Extranjera' : '',           // 7: Nacionalidad
        this.fmtAmount(row.base16),             // 8: Base IVA 16%
        this.fmtAmount(row.ivaNoAcreditable16), // 9: IVA 16% no acreditable
        this.fmtAmount(row.base8),              // 10: Base IVA 8%
        this.fmtAmount(row.ivaNoAcreditable8),  // 11: IVA 8% no acreditable
        this.fmtAmount(row.importBase),         // 12: Base importaciones 16%
        '',                                     // 13: IVA importaciones no acreditable
        this.fmtAmount(row.base0),              // 14: Base actos 0%
        this.fmtAmount(row.baseExento),         // 15: Valor actos exentos
        this.fmtAmount(row.iva16),              // 16: IVA pagado 16%
        this.fmtAmount(row.iva8),               // 17: IVA pagado 8%
        this.fmtAmount(row.importIva),          // 18: IVA importaciones pagado
        this.fmtAmount(row.ivaRetained),        // 19: IVA retenido
        this.fmtAmount(row.importIvaRetained),  // 20: IVA importaciones retenido
        '', '', '', '', '', '', '', '',          // 21-28: devoluciones / otros
        '', '', '', '', '', '', '', '', '',      // 29-37
        '',                                     // 38
      ];

      layout += cols.join('|') + '|\r\n';
    }

    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename=DIOT_${year}_${month.toString().padStart(2, '0')}.txt`,
    });

    return res.send(layout);
  }
}
