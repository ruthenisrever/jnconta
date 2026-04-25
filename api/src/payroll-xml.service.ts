import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { create } from 'xmlbuilder2';

@Injectable()
export class PayrollXmlService {
  private readonly logger = new Logger(PayrollXmlService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Genera el XML del recibo de nómina bajo el estándar CFDI 4.0 + Complemento 1.2
   */
  async generateReceiptXml(receiptId: string) {
    const receipt = await (this.prisma as any).payrollReceipt.findUnique({
      where: { id: receiptId },
      include: { 
        employee: true, // Company is usually reached via employee.companyId
        period: true, 
        items: true 
      }
    });

    if (!receipt) return null;

    const { employee, period, items } = receipt as any;
    const company = await this.prisma.company.findUnique({ where: { id: employee.companyId } });
    if (!company) return null;

    // Calculate days for the XML
    const diffTime = Math.abs(period.endDate.getTime() - period.startDate.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('cfdi:Comprobante', {
        'xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
        'xmlns:nom12': 'http://www.sat.gob.mx/nomina12',
        'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
        'xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd http://www.sat.gob.mx/nomina12 http://www.sat.gob.mx/sitio_internet/cfd/nomina/nomina12.xsd',
        'Version': '4.0',
        'Serie': 'NOM',
        'Folio': receipt.id.substring(0, 8),
        'Fecha': new Date().toISOString(),
        'SubTotal': receipt.totalPerceptions.toFixed(2),
        'Descuento': receipt.totalDeductions.toFixed(2),
        'Moneda': 'MXN',
        'TipoCambio': '1',
        'Total': receipt.netAmount.toFixed(2),
        'TipoDeComprobante': 'N',
        'Exportacion': '01',
        'LugarExpedicion': (company as any).zipCode || '00000',
      });

    root.ele('cfdi:Emisor', {
      'Rfc': company.rfc,
      'Nombre': company.name,
      'RegimenFiscal': company.regimenFiscal || '601',
    });

    root.ele('cfdi:Receptor', {
      'Rfc': employee.rfc,
      'Nombre': `${employee.firstName} ${employee.lastName}`,
      'DomicilioFiscalReceptor': (company as any).zipCode || '00000',
      'RegimenFiscalReceptor': '605',
      'UsoCFDI': 'CN01',
    });

    const conceptos = root.ele('cfdi:Conceptos');
    conceptos.ele('cfdi:Concepto', {
      'ClaveProdServ': '84111505',
      'Cantidad': '1',
      'ClaveUnidad': 'ACT',
      'Descripcion': `Pago de nómina del periodo ${period.name}`,
      'ValorUnitario': receipt.totalPerceptions.toFixed(2),
      'Importe': receipt.totalPerceptions.toFixed(2),
      'Descuento': receipt.totalDeductions.toFixed(2),
      'ObjetoImp': '01',
    });

    // COMPLEMENTO NÓMINA 1.2
    const nomina = root.ele('cfdi:Complemento').ele('nom12:Nomina', {
      'Version': '1.2',
      'TipoNomina': period.type,
      'FechaPago': period.paymentDate.toISOString().split('T')[0],
      'FechaInicialPago': period.startDate.toISOString().split('T')[0],
      'FechaFinalPago': period.endDate.toISOString().split('T')[0],
      'NumDiasPagados': days.toString(),
      'TotalPercepciones': receipt.totalPerceptions.toFixed(2),
      'TotalDeducciones': receipt.totalDeductions.toFixed(2),
    });

    nomina.ele('nom12:Emisor', { 
      'RegistroPatronal': (company as any).registroPatronal || 'A123456789' 
    });

    nomina.ele('nom12:Receptor', {
      'Curp': employee.curp,
      'NumSeguridadSocial': employee.nss,
      'FechaInicioRelLaboral': employee.hiredDate.toISOString().split('T')[0],
      'Antigüedad': 'P1Y',
      'TipoContrato': employee.contractType,
      'TipoRegimen': employee.regimeType,
      'NumEmpleado': employee.code,
      'PeriodicidadPago': employee.periodicidad,
      'ClaveEntFed': 'MEX',
      'SalarioDiarioIntegrado': employee.sdi.toFixed(2),
    });

    // Percepciones
    const perceptions = nomina.ele('nom12:Percepciones', {
      'TotalGravado': receipt.totalPerceptions.toFixed(2),
      'TotalExento': '0.00'
    });
    items.filter(i => i.type === 'P').forEach(i => {
      perceptions.ele('nom12:Percepcion', {
        'TipoPercepcion': i.satCode,
        'Clave': i.satCode,
        'Concepto': i.concept,
        'ImporteGravado': i.amountTotal.toFixed(2),
        'ImporteExento': '0.00'
      });
    });

    // Deducciones
    const deductions = nomina.ele('nom12:Deducciones', {
      'TotalOtrasDeducciones': receipt.totalDeductions.toFixed(2),
    });
    items.filter(i => i.type === 'D').forEach(i => {
      deductions.ele('nom12:Deduccion', {
        'TipoDeduccion': i.satCode,
        'Clave': i.satCode,
        'Concepto': i.concept,
        'Importe': i.amountTotal.toFixed(2)
      });
    });

    return root.end({ prettyPrint: true });
  }
}
