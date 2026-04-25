import { Controller, Get, Post, Put, Query, Body, Param, BadRequestException } from '@nestjs/common';
import { SatService } from './sat.service';
import { PrismaService } from './prisma.service';

@Controller('sat')
export class SatController {
  constructor(private satService: SatService, private prisma: PrismaService) {}

  @Post('sync-efos')
  async syncEfos(@Query('url') url?: string) {
    return this.satService.syncBlacklist(url);
  }

  @Get('check-rfc')
  async checkRfc(@Query('rfc') rfc: string) {
    if (!rfc) throw new BadRequestException('RFC es requerido');
    const result = await this.satService.checkRfc(rfc);
    return result || { message: 'RFC no encontrado en lista negra de EFOS.' };
  }

  @Get('risk-analysis')
  async getRiskAnalysis(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId es requerido');
    return this.satService.runRiskAnalysis(companyId);
  }

  // ── Buzón Tributario ──────────────────────────────────────────────────────

  /**
   * Agrega los CFDIs recibidos (facturas de proveedores), facturas emitidas
   * y solicitudes de cancelación pendientes en un solo endpoint tipo buzón SAT.
   */
  @Get('buzon')
  async getBuzon(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId es requerido');

    const [bills, invoicesCancelRequested, xmlDocs, riskResult] = await Promise.all([
      // CFDIs recibidos (facturas de proveedores)
      this.prisma.bill.findMany({
        where: { companyId },
        include: { supplier: true },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      // Facturas emitidas con cancelación en proceso (las que el cliente podría aceptar/rechazar)
      this.prisma.invoice.findMany({
        where: { companyId, status: 'CANCELADA', cancelMotivo: { in: ['01', '02'] } },
        include: { client: true },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      // XMLs cargados manualmente desde el Gestor XML SAT
      ((this.prisma as any).satXmlDocument
        ? (this.prisma as any).satXmlDocument.findMany({
            where: { companyId },
            orderBy: { issuedAt: 'desc' },
            take: 50,
          }).catch(() => [])
        : Promise.resolve([])),
      // Análisis de riesgo rápido para alertas SAT
      this.satService.runRiskAnalysis(companyId).catch(() => null),
    ]);

    const pendingCancellations = invoicesCancelRequested.filter(
      (inv: any) => inv.cancelMotivo === '01'
    );

    return {
      summary: {
        cfdiRecibidos: bills.length,
        cancelacionesPendientes: pendingCancellations.length,
        xmlsGestor: (xmlDocs as any[] ?? []).length,
        alertasSAT: riskResult?.alerts?.length ?? 0,
      },
      cfdiRecibidos: bills.map((b: any) => ({
        id: b.id,
        tipo: 'RECIBIDO',
        uuid: b.uuid,
        emisor: b.supplier?.name ?? b.supplierName,
        rfcEmisor: b.supplier?.rfc ?? '',
        fecha: b.date,
        total: b.total,
        status: b.status,
        concepto: b.description ?? 'Factura de proveedor',
      })),
      cancelacionesPendientes: pendingCancellations.map((inv: any) => ({
        id: inv.id,
        uuid: inv.uuid,
        receptor: inv.client?.name,
        fecha: inv.updatedAt,
        total: inv.total,
        motivo: inv.cancelMotivo,
        status: 'ACEPTACION_PENDIENTE',
      })),
      alertasSAT: riskResult?.alerts ?? [],
      xmlsGestor: xmlDocs,
    };
  }

  /** Marcar CFDI recibido como verificado/procesado */
  @Put('buzon/bill/:id/verify')
  async verifyBill(@Param('id') id: string, @Body() body: { status: string }) {
    return this.prisma.bill.update({
      where: { id },
      data: { status: body.status ?? 'PROCESADA' },
    });
  }
}
