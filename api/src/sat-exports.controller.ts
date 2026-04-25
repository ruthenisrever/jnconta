import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './prisma.service';
import { create } from 'xmlbuilder2';

// SAT codes are now stored in the database per account.

import { SatXmlService } from './sat-xml.service';

@Controller('sat-exports')
export class SatExportsController {
  constructor(
    private prisma: PrismaService,
    private satXml: SatXmlService
  ) {}

  @Get('catalogo-cuentas')
  async getCatalogoCuentas(
    @Query('companyId') companyId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Res() res: Response,
  ) {
    const yr = year || new Date().getFullYear().toString();
    const mo = month || (new Date().getMonth() + 1).toString();

    const { xml, filename, zipname } = await this.satXml.generateCatalogoXml(companyId, yr, mo);
    const zipBuffer = await this.satXml.createZip(filename, xml);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipname}"`,
    });
    
    return res.send(zipBuffer);
  }

  @Get('balanza')
  async getBalanzaXml(
    @Query('companyId') companyId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('type') type: string,
    @Res() res: Response,
  ) {
    const yr = year || new Date().getFullYear().toString();
    const mo = month || (new Date().getMonth() + 1).toString();
    const t = type || 'N';

    const { xml, filename, zipname } = await this.satXml.generateBalanzaXml(companyId, yr, mo, t);
    const zipBuffer = await this.satXml.createZip(filename, xml);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipname}"`,
    });
    
    return res.send(zipBuffer);
  }

  @Get('polizas')
  async getPolizasXml(
    @Query('companyId') companyId: string,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('typeSolicitud') typeSolicitud: string,
    @Query('numOrden') numOrden: string,
    @Query('numTramite') numTramite: string,
    @Res() res: Response,
  ) {
    const yr = year || new Date().getFullYear().toString();
    const mo = month || (new Date().getMonth() + 1).toString();
    const ts = typeSolicitud || 'AF';

    const { xml, filename, zipname } = await this.satXml.generatePolizasXml(companyId, yr, mo, ts, numOrden, numTramite);
    const zipBuffer = await this.satXml.createZip(filename, xml);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipname}"`,
    });
    
    return res.send(zipBuffer);
  }
}
