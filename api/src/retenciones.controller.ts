import { Controller, Get, Post, Put, Delete, Query, Body, Param, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

const TIPOS_RETENCION: Record<string, { clave: string; desc: string }> = {
  ARRENDAMIENTO: { clave: '14', desc: 'Arrendamiento' },
  HONORARIOS:    { clave: '06', desc: 'Honorarios' },
  DIVIDENDOS:    { clave: '11', desc: 'Dividendos o utilidades' },
  INTERESES:     { clave: '02', desc: 'Intereses' },
  OTROS:         { clave: '25', desc: 'Otros' },
};

@Controller('retenciones')
export class RetencionesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(
    @Query('companyId') companyId: string,
    @Query('ejercicio') ejercicio?: string,
    @Query('periodo') periodo?: string,
  ) {
    if (!companyId) throw new BadRequestException('companyId es requerido');
    return this.prisma.retencion.findMany({
      where: {
        companyId,
        ...(ejercicio ? { ejercicio: parseInt(ejercicio) } : {}),
        ...(periodo ? { periodo: parseInt(periodo) } : {}),
      },
      orderBy: [{ ejercicio: 'desc' }, { periodo: 'desc' }],
      take: 200,
    });
  }

  @Post()
  async create(@Body() body: any) {
    const { companyId, tipo, receptorRfc, receptorNombre, periodo, ejercicio,
      montoTotal, isrRetenido, ivaRetenido = 0, iepsRetenido = 0 } = body;
    if (!companyId) throw new BadRequestException('companyId es requerido');

    const last = await this.prisma.retencion.findFirst({
      where: { companyId }, orderBy: { folio: 'desc' },
    });
    const folio = (last?.folio ?? 0) + 1;

    return this.prisma.retencion.create({
      data: { folio, tipo, receptorRfc, receptorNombre, periodo, ejercicio,
        montoTotal, isrRetenido, ivaRetenido, iepsRetenido, companyId },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.retencion.update({ where: { id }, data: body });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.retencion.delete({ where: { id } });
  }

  /** Genera el XML del complemento de retenciones (SAT) */
  @Get(':id/xml')
  async getXml(@Param('id') id: string) {
    const r = await this.prisma.retencion.findUnique({ where: { id }, include: { company: true } });
    if (!r) throw new BadRequestException('Retención no encontrada');

    const tipoInfo = TIPOS_RETENCION[r.tipo] ?? TIPOS_RETENCION['OTROS'];
    const now = new Date().toISOString();

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<retenciones:Retenciones
  xmlns:retenciones="http://www.sat.gob.mx/esquemas/retencionpago/2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/esquemas/retencionpago/2 http://www.sat.gob.mx/esquemas/retencionpago/2/retencionpagov2.xsd"
  Version="2.0"
  FolioInt="${r.folio}"
  Sello=""
  NoCertificado=""
  Certificado=""
  FechaExp="${now}">
  <retenciones:Emisor
    RFCEmisor="${(r.company as any).rfc}"
    NomDenRazSocE="${(r.company as any).name}"
    RegimenFiscalE="${(r.company as any).regimenFiscal ?? '612'}" />
  <retenciones:Receptor
    NacionalExtranjero="Nacional"
    RFCRecep="${r.receptorRfc}"
    NomDenRazSocR="${r.receptorNombre}" />
  <retenciones:Periodo
    MesIni="${String(r.periodo).padStart(2, '0')}"
    MesFin="${String(r.periodo).padStart(2, '0')}"
    Ejerc="${r.ejercicio}" />
  <retenciones:Totales
    MontoTotOperacion="${r.montoTotal.toFixed(2)}"
    MontoTotGrav="${r.montoTotal.toFixed(2)}"
    MontoTotExent="0.00"
    MontoTotRet="${(r.isrRetenido + r.ivaRetenido + r.iepsRetenido).toFixed(2)}">
    <retenciones:ImpRetenidos
      Importe="${r.isrRetenido.toFixed(2)}"
      ImpRetenidoMXN="${r.isrRetenido.toFixed(2)}"
      TipoPagoRet="Pago definitivo"
      Impuesto="ISR"
      TipoContribuyente="Persona física" />
    ${r.ivaRetenido > 0 ? `<retenciones:ImpRetenidos
      Importe="${r.ivaRetenido.toFixed(2)}"
      ImpRetenidoMXN="${r.ivaRetenido.toFixed(2)}"
      TipoPagoRet="Pago definitivo"
      Impuesto="IVA"
      TipoContribuyente="Persona física" />` : ''}
  </retenciones:Totales>
  <retenciones:Complemento>
    <${tipoInfo.clave === '14' ? 'arrendamiento' : 'fideicomisoNodFin'}:Arrendamiento
      xmlns:arrendamiento="http://www.sat.gob.mx/arrendamiento"
      Version="1.0"
      NumServicio="${r.folio}"
      MontoTotalRend="${r.montoTotal.toFixed(2)}"
      MontoTotalDed="0.00"
      MontoTotalUnaVegRend="${r.montoTotal.toFixed(2)}" />
  </retenciones:Complemento>
</retenciones:Retenciones>`;

    await this.prisma.retencion.update({ where: { id }, data: { xmlContent: xml, status: 'TIMBRADO' } });
    return { xml, folio: r.folio };
  }

  /** Resumen anual por receptor (para constancias) */
  @Get('resumen-anual')
  async resumenAnual(@Query('companyId') companyId: string, @Query('ejercicio') ejercicio: string) {
    if (!companyId || !ejercicio) throw new BadRequestException('companyId y ejercicio son requeridos');
    const items = await this.prisma.retencion.findMany({
      where: { companyId, ejercicio: parseInt(ejercicio) },
    });
    const byReceptor: Record<string, any> = {};
    for (const r of items) {
      if (!byReceptor[r.receptorRfc]) {
        byReceptor[r.receptorRfc] = { rfc: r.receptorRfc, nombre: r.receptorNombre,
          montoTotal: 0, isrRetenido: 0, ivaRetenido: 0 };
      }
      byReceptor[r.receptorRfc].montoTotal += r.montoTotal;
      byReceptor[r.receptorRfc].isrRetenido += r.isrRetenido;
      byReceptor[r.receptorRfc].ivaRetenido += r.ivaRetenido;
    }
    return Object.values(byReceptor);
  }
}
