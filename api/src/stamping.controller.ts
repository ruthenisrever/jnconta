import { Controller, Post, Body, Param, Get, BadRequestException } from '@nestjs/common';
import { StampingService } from './stamping.service';
import { FinkokService } from './pac.service';
import { PrismaService } from './prisma.service';

@Controller('stamping')
export class StampingController {
  constructor(
    private stampingService: StampingService,
    private finkok: FinkokService,
    private prisma: PrismaService,
  ) {}

  /**
   * Prueba la conexión con Finkok usando las credenciales del PAC.
   * Llamado desde el botón "Probar Conexión" en /configuracion → tab PAC.
   */
  @Post('test-connection')
  async testConnection(@Body() body: any) {
    const { username, password, url } = body;
    if (!username || !password) {
      throw new BadRequestException('Usuario y contraseña son obligatorios.');
    }
    return this.finkok.testConnection(username, password, url || '');
  }

  @Post('invoice/:id')
  async stampInvoice(@Param('id') id: string, @Body('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required');
    return this.stampingService.stampDocument('INVOICE', id, companyId);
  }

  @Post('payroll/:id')
  async stampPayroll(@Param('id') id: string, @Body('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required');
    return this.stampingService.stampDocument('PAYROLL', id, companyId);
  }

  @Get('xml/:type/:id')
  async getXml(@Param('type') type: string, @Param('id') id: string) {
    let doc: any;
    if (type === 'invoice') {
      doc = await this.prisma.invoice.findUnique({ where: { id } });
    } else if (type === 'payroll') {
      doc = await (this.prisma as any).payrollReceipt.findUnique({ where: { id } });
    }

    if (!doc || !doc.xmlContent) {
      throw new BadRequestException('XML no disponible para este documento.');
    }

    return { xml: doc.xmlContent };
  }

  @Get('debug-probe')
  async debugProbe() {
    const username = 'rutheni.qm@gmail.com';
    const password = 'Ingeniero66';
    const endpoint = 'https://facturacion.finkok.com/servicios/soap/utilities';

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:util="http://facturacion.finkok.com/utilities">
  <soapenv:Header/>
  <soapenv:Body>
    <util:get_credit>
      <util:username>${username}</util:username>
      <util:password>${password}</util:password>
    </util:get_credit>
  </soapenv:Body>
</soapenv:Envelope>`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: '"http://facturacion.finkok.com/utilities/get_credit"',
      },
      body: soapEnvelope
    });

    const text = await response.text();
    return { status: response.status, raw: text };
  }
}
