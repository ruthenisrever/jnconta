import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('treasury')
export class TreasuryController {
  constructor(private prisma: PrismaService) {}

  @Get('calendar')
  async getCashFlowCalendar(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('Falta companyId');

    // Fetch Receivables (Cuentas por Cobrar - Invoices)
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, status: 'VIGENTE', paymentMethod: 'PPD' },
      include: { client: { select: { name: true } } }
    });

    // Fetch Payables (Cuentas por Pagar - Bills)
    const bills = await this.prisma.bill.findMany({
      where: { companyId, status: 'PENDIENTE' },
      include: { supplier: { select: { name: true } } }
    });

    const events = [];

    invoices.forEach(inv => {
       events.push({
         id: `inv-${inv.id}`,
         type: 'IN',
         title: `Cobro: ${inv.client.name} (Folio ${inv.folio})`,
         amount: inv.total,
         currency: inv.currency,
         date: inv.dueDate || null,
         originalDate: inv.date
       });
    });

    bills.forEach(bill => {
       events.push({
         id: `bill-${bill.id}`,
         type: 'OUT', // Gasto esperado
         title: `Pago: ${bill.supplier.name} (Folio ${bill.folio})`,
         amount: -bill.total,
         currency: bill.currency,
         date: bill.dueDate || null,
         originalDate: bill.date
       });
    });

    return events;
  }
}
