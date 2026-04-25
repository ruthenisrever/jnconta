import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { randomUUID } from 'crypto';

const PAYMENT_FORM_LABELS: Record<string, string> = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia electrónica',
  '04': 'Tarjeta de crédito',
  '05': 'Monedero electrónico',
  '06': 'Dinero electrónico',
  '28': 'Tarjeta de débito',
  '29': 'Tarjeta de servicios',
  '99': 'Por definir',
};

@Controller('payments')
export class PaymentsController {
  constructor(private prisma: PrismaService) {}

  /** GET /api/payments/complement?companyId=&invoiceId= */
  @Get('complement')
  async findAll(
    @Query('companyId') companyId: string,
    @Query('invoiceId') invoiceId?: string,
  ) {
    if (!companyId) throw new BadRequestException('companyId requerido');
    return (this.prisma as any).paymentComplement.findMany({
      where: { companyId, ...(invoiceId ? { invoiceId } : {}) },
      include: {
        invoice: {
          select: {
            id: true,
            serie: true,
            folio: true,
            uuid: true,
            total: true,
            client: { select: { name: true, rfc: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** GET /api/payments/ppd-invoices?companyId= — Facturas PPD pendientes de pago */
  @Get('ppd-invoices')
  async getPpdInvoices(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId requerido');

    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        paymentMethod: 'PPD',
        status: { not: 'CANCELADA' },
      },
      include: {
        client: { select: { name: true, rfc: true } },
      },
      orderBy: { date: 'desc' },
    });

    // Para cada factura calcular el saldo pendiente
    const result = await Promise.all(
      invoices.map(async (inv) => {
        const complements = await (this.prisma as any).paymentComplement.findMany({
          where: { invoiceId: inv.id },
          orderBy: { numberOfPayment: 'asc' },
        });
        const totalPaid = complements.reduce((s: number, c: any) => s + c.amountPaid, 0);
        const pendingBalance = inv.total - totalPaid;
        return {
          ...inv,
          totalPaid,
          pendingBalance,
          numberOfPayments: complements.length,
          fullyPaid: pendingBalance <= 0.01,
        };
      }),
    );

    return result;
  }

  /** POST /api/payments/complement — Registrar pago parcial */
  @Post('complement')
  async create(
    @Body() body: {
      invoiceId: string;
      companyId: string;
      paymentDate: string;
      paymentForm: string;
      currency?: string;
      exchangeRate?: number;
      amountPaid: number;
    },
  ) {
    const { invoiceId, companyId, paymentDate, paymentForm, currency = 'MXN', exchangeRate = 1, amountPaid } = body;

    if (!invoiceId || !companyId || !paymentDate || !paymentForm || !amountPaid) {
      throw new BadRequestException('Faltan campos requeridos');
    }

    // Obtener saldo actual
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new BadRequestException('Factura no encontrada');
    if (invoice.paymentMethod !== 'PPD') throw new BadRequestException('Solo se pueden registrar pagos para facturas PPD');

    const existingComplements = await (this.prisma as any).paymentComplement.findMany({
      where: { invoiceId },
      orderBy: { numberOfPayment: 'asc' },
    });

    const totalPaidSoFar = existingComplements.reduce((s: number, c: any) => s + c.amountPaid, 0);
    const previousBalance = invoice.total - totalPaidSoFar;
    const newBalance = Math.max(0, previousBalance - amountPaid);
    const numberOfPayment = existingComplements.length + 1;

    const complement = await (this.prisma as any).paymentComplement.create({
      data: {
        invoiceId,
        companyId,
        paymentDate: new Date(paymentDate),
        paymentForm,
        currency,
        exchangeRate,
        amountPaid,
        numberOfPayment,
        previousBalance,
        newBalance,
        status: 'PENDIENTE',
      },
    });

    // Si el saldo queda en 0, marcar factura como COBRADA
    if (newBalance <= 0.01) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'COBRADA' },
      });
    }

    return { ...complement, previousBalance, newBalance, numberOfPayment };
  }

  /** POST /api/payments/complement/:id/stamp — Timbrar complemento de pago */
  @Post('complement/:id/stamp')
  async stamp(@Param('id') id: string) {
    const complement = await (this.prisma as any).paymentComplement.findUnique({ where: { id } });
    if (!complement) throw new BadRequestException('Complemento no encontrado');
    if (complement.status === 'TIMBRADO') throw new BadRequestException('El complemento ya fue timbrado');

    const uuid = randomUUID().toUpperCase();
    const stampDate = new Date();

    // Generar XML simulado del Complemento de Pagos (estructura SAT real)
    const xmlContent = generateRepXml({
      uuid,
      stampDate,
      complement,
    });

    return (this.prisma as any).paymentComplement.update({
      where: { id },
      data: { uuid, status: 'TIMBRADO', xmlContent },
    });
  }
}

// ──────────────────────────────────────────────
// Generador XML de Complemento de Pagos (REP)
// Estructura según Anexo 20 SAT — Complemento Pagos 2.0
// ──────────────────────────────────────────────
function generateRepXml({ uuid, stampDate, complement }: { uuid: string; stampDate: Date; complement: any }) {
  const fmt = (n: number) => n.toFixed(2);
  const fmtDate = (d: Date) => d.toISOString().split('T')[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante
  xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:pago20="http://www.sat.gob.mx/Pagos20"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0"
  Serie="P"
  Folio="${complement.numberOfPayment}"
  Fecha="${stampDate.toISOString().replace(/\.\d{3}Z$/, '')}"
  SubTotal="0"
  Moneda="XXX"
  Total="0"
  TipoDeComprobante="P"
  Exportacion="01"
  LugarExpedicion="00000">
  <cfdi:Complemento>
    <pago20:Pagos Version="2.0">
      <pago20:Totales MontoTotalPagos="${fmt(complement.amountPaid)}"/>
      <pago20:Pago
        FechaPago="${fmtDate(new Date(complement.paymentDate))}"
        FormaDePagoP="${complement.paymentForm}"
        MonedaP="${complement.currency}"
        TipoCambioP="${fmt(complement.exchangeRate)}"
        Monto="${fmt(complement.amountPaid)}"
        NumOperacion="${uuid.substring(0, 8)}">
        <pago20:DoctoRelacionado
          IdDocumento="${complement.invoiceId}"
          Serie="A"
          Folio="${complement.numberOfPayment}"
          MonedaDR="${complement.currency}"
          EquivalenciaDR="1"
          NumParcialidad="${complement.numberOfPayment}"
          ImpSaldoAnt="${fmt(complement.previousBalance)}"
          ImpPagado="${fmt(complement.amountPaid)}"
          ImpSaldoInsoluto="${fmt(complement.newBalance)}"
          ObjetoImpDR="01"/>
      </pago20:Pago>
    </pago20:Pagos>
  </cfdi:Complemento>
  <cfdi:Addenda>
    <JnConta:TimbreSimulado xmlns:JnConta="http://jnconta.mx" UUID="${uuid}" FechaTimbrado="${stampDate.toISOString()}"/>
  </cfdi:Addenda>
</cfdi:Comprobante>`.trim();
}
