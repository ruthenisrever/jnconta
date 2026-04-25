import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SatService } from './sat.service';

@Controller('audit')
export class AuditController {
  constructor(
    private prisma: PrismaService,
    private satService: SatService
  ) {}

  @Get('summary')
  async getAuditSummary(
    @Query('companyId') companyId: string,
    @Query('year') year: string,
    @Query('month') month: string
  ) {
    if (!companyId) throw new BadRequestException('companyId is required');
    const now = new Date();
    const mo = parseInt(month || String(now.getMonth() + 1));
    const yr = parseInt(year || String(now.getFullYear()));
    const startDate = new Date(yr, mo - 1, 1);
    const endDate = new Date(yr, mo, 0, 23, 59, 59);

    // 1. XMLs SIN PÓLIZA (missingJournal)
    const missingJournal = await this.prisma.xmlDocument.findMany({
      where: { 
        companyId, 
        journalId: null,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'desc' }
    });

    // 2. PÓLIZAS SIN XML (missingXml)
    const missingXml = await this.prisma.journal.findMany({
      where: { 
        companyId,
        date: { gte: startDate, lte: endDate },
        xmlDocuments: { none: {} }
      },
      orderBy: { date: 'desc' }
    });

    // 3. CONCILIADOS (compliant)
    const compliant = await this.prisma.xmlDocument.findMany({
      where: { 
        companyId, 
        journalId: { not: null },
        date: { gte: startDate, lte: endDate }
      },
      include: { journal: true },
      orderBy: { date: 'desc' }
    });

    // 4. ESTADÍSTICAS BÁSICAS
    const totalXmls = await this.prisma.xmlDocument.count({
      where: { companyId, date: { gte: startDate, lte: endDate } }
    });
    const totalJournals = await this.prisma.journal.count({
      where: { companyId, date: { gte: startDate, lte: endDate } }
    });

    return {
      stats: {
        totalXmls,
        totalJournals,
        okCount: compliant.length,
        unlinkedXmls: missingJournal.length,
        missingXmlCount: missingXml.length
      },
      missingJournal,
      missingXml,
      compliant
    };
  }

  @Post('verify-efos')
  async verifyEfos(@Body() body: { companyId: string }) {
    return this.satService.syncBlacklist();
  }

  @Post('verify-sat')
  async verifySat(@Body() body: { companyId: string, year: string, month: string }) {
    // Aquí iría la lógica masiva de consulta al WebService del SAT
    // Por ahora simulamos una respuesta exitosa de validación masiva
    return { vigentes: 12, cancelados: 0 };
  }

  @Post('sync-blacklist')
  async syncBlacklist() {
    return this.satService.syncBlacklist();
  }

  @Get('check-efos')
  async checkEfosInCatalogs(@Query('companyId') companyId: string) {
    const bitacora = [];
    
    const currentSuppliers = await (this.prisma as any).supplier.findMany({ where: { companyId } });
    for (const s of currentSuppliers) {
      if (!s.rfc) continue;
      const risk = await this.satService.checkRfc(s.rfc);
      if (risk) {
        bitacora.push({ 
          rfc: s.rfc, 
          name: s.name, 
          status: risk.status,
          riskLevel: risk.status === 'DEFINITIVO' ? 'CRITICAL' : 'WARNING'
        });
      }
    }
    
    return bitacora;
  }

  @Get('health-audit')
  async getHealthAudit(@Query('companyId') companyId: string) {
    const efosCount = await this.checkEfosInCatalogs(companyId);
    
    const totalBills = await this.prisma.bill.count({ where: { companyId } });
    const billsWithXml = await this.prisma.bill.count({ 
      where: { companyId, uuid: { not: null } } 
    });

    const totalInvoices = await this.prisma.invoice.count({ where: { companyId } });
    const invoicesWithXml = await this.prisma.invoice.count({ 
      where: { companyId, uuid: { not: null } } 
    });

    const riskScore = Math.max(0, 100 - (efosCount.length * 20) - ((1 - (billsWithXml / (totalBills || 1))) * 30));

    return {
      efos: {
        detected: efosCount.length,
        items: efosCount
      },
      integrity: {
        bills: { total: totalBills, withXml: billsWithXml },
        invoices: { total: totalInvoices, withXml: invoicesWithXml }
      },
      riskScore: Math.round(riskScore),
      status: riskScore < 60 ? 'CRITICAL' : riskScore < 85 ? 'WARNING' : 'HEALTHY'
    };
  }

  @Get('logs')
  async getLogs(@Query('companyId') companyId: string) {
    if (!companyId) throw new BadRequestException('companyId is required');
    return (this.prisma as any).auditLog.findMany({
      where: { companyId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }
}
