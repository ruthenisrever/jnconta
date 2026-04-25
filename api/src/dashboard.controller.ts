import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('kpis')
  async getKpis(@Query('companyId') companyId: string) {
    if (!companyId) return { error: 'Company ID required' };
    
    const [
      invoiceStats,
      billStats,
      bankStats,
      clientCount,
      supplierCount,
      employeeCount,
      productCount,
      assetStats,
      payrollStats,
    ] = await Promise.all([
      (this.prisma as any).invoice.aggregate({
        where: { companyId, status: { not: 'CANCELADA' } },
        _sum: { total: true },
        _count: true,
      }),
      (this.prisma as any).bill.aggregate({
        where: { companyId, status: 'PENDIENTE' },
        _sum: { total: true },
        _count: true,
      }),
      (this.prisma as any).bankAccount.aggregate({
        where: { companyId, currency: 'MXN' },
        _sum: { balance: true },
      }),
      (this.prisma as any).client.count({ where: { companyId, isActive: true } }),
      (this.prisma as any).supplier.count({ where: { companyId, isActive: true } }),
      (this.prisma as any).employee.count({ where: { companyId, isActive: true } }),
      (this.prisma as any).product.count({ where: { companyId, isActive: true } }),
      (this.prisma as any).fixedAsset.aggregate({
        where: { companyId, isActive: true },
        _sum: { netValue: true, acquisitionCost: true },
      }),
      (this.prisma as any).payrollReceipt.aggregate({
        where: { period: { companyId, paymentDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1) } } },
        _sum: { netAmount: true },
      }),
    ]);

    const recentInvoices = await (this.prisma as any).invoice.findMany({
      where: { companyId },
      include: { client: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      ingresosMes: invoiceStats._sum.total || 0,
      facturasPendientesCobro: invoiceStats._count || 0,
      cxpPendiente: billStats._sum.total || 0,
      billsPendientes: billStats._count || 0,
      saldoBancario: bankStats._sum.balance || 0,
      clientes: clientCount,
      proveedores: supplierCount,
      empleados: employeeCount,
      productos: productCount,
      activosFijosNeto: assetStats._sum.netValue || 0,
      nominaMes: payrollStats._sum.netAmount || 0,
      recentInvoices,
    };
  }

  @Get('fiscal-summary')
  async getFiscalSummary(@Query('companyId') companyId: string) {
    if (!companyId) return { error: 'Company ID required' };

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [payrollTotals, assetTotals, billTotals] = await Promise.all([
      (this.prisma as any).payrollReceipt.aggregate({
        where: { period: { companyId, paymentDate: { gte: firstDay, lte: lastDay } } },
        _sum: { totalDeductions: true, totalPerceptions: true }
      }),
      (this.prisma as any).fixedAsset.aggregate({
        where: { companyId, isActive: true },
        _sum: { netValue: true, acquisitionCost: true }
      }),
      (this.prisma as any).bill.count({
        where: { companyId, status: 'PAGADA', date: { gte: firstDay, lte: lastDay } }
      })
    ]);

    const retenciones = payrollTotals._sum.totalDeductions || 0;
    const acquisitionSum = assetTotals._sum.acquisitionCost || 1; // avoid div by zero
    const netSum = assetTotals._sum.netValue || 0;
    const depProgress = Math.round(((acquisitionSum - netSum) / acquisitionSum) * 100);

    return {
      month: now.toLocaleString('es-MX', { month: 'long' }),
      year: now.getFullYear(),
      isrRetenido: 0,
      imssRetenido: 0,
      totalRetenciones: retenciones,
      nominaGravable: payrollTotals._sum.totalPerceptions || 0,
      activosFijosNeto: netSum,
      activosFijosCosto: acquisitionSum,
      depreciacionProgreso: depProgress,
      diotPendiente: billTotals > 0 ? false : true, // Simplified DIOT logic
      healthScore: 85, // Meta-data for the UI widget
    };
  }

  @Get('clients-status')
  async getClientsStatus() {
    const companies = await this.prisma.company.findMany();
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const statusPromises = companies.map(async (company) => {
      const [invoices, bills, payrolls, employees] = await Promise.all([
        (this.prisma as any).invoice.aggregate({
          where: { companyId: company.id, date: { gte: firstDay }, status: 'VIGENTE' },
          _sum: { total: true }
        }),
        (this.prisma as any).bill.aggregate({
          where: { companyId: company.id, date: { gte: firstDay }, status: 'PENDIENTE' },
          _sum: { total: true }
        }),
        (this.prisma as any).payrollPeriod.aggregate({
          where: { companyId: company.id, status: 'CALCULADA' },
          _count: true
        }),
        (this.prisma as any).employee.count({ where: { companyId: company.id, isActive: true } })
      ]);

      return {
        companyId: company.id,
        name: company.name,
        rfc: company.rfc,
        ingresosMes: invoices._sum.total || 0,
        cxpPendiente: bills._sum.total || 0,
        payrollsCalculated: payrolls._count || 0,
        employeesTotal: employees,
        healthScore: Math.max(0, 100 - (payrolls._count > 0 ? 0 : 20) - (bills._sum.total > 100000 ? 10 : 0))
      };
    });

    return Promise.all(statusPromises);
  }

  @Get('cash-flow')
  async getCashFlowProjection(@Query('companyId') companyId: string) {
    if (!companyId) return { error: 'Company ID required' };

    const bankBalance = await (this.prisma as any).bankAccount.aggregate({
      where: { companyId },
      _sum: { balance: true }
    });

    const initialCash = bankBalance._sum.balance || 0;
    const weeks = [];
    const now = new Date();

    for (let i = 0; i < 4; i++) {
      const start = new Date(now);
      start.setDate(now.getDate() + (i * 7));
      const end = new Date(now);
      end.setDate(now.getDate() + ((i + 1) * 7));

      const [inflow, outflow] = await Promise.all([
        (this.prisma as any).invoice.aggregate({
          where: { companyId, status: 'VIGENTE', dueDate: { gte: start, lte: end } },
          _sum: { total: true }
        }),
        (this.prisma as any).bill.aggregate({
          where: { companyId, status: 'PENDIENTE', dueDate: { gte: start, lte: end } },
          _sum: { total: true }
        })
      ]);

      weeks.push({
        label: `Semana ${i + 1}`,
        inflow: inflow._sum.total || 0,
        outflow: outflow._sum.total || 0,
        net: (inflow._sum.total || 0) - (outflow._sum.total || 0)
      });
    }

    return {
      initialCash,
      projection: weeks
    };
  }
}
