import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class SatComplianceService {
  private readonly logger = new Logger(SatComplianceService.name);

  // Sample list of "Blacklisted" RFCs for demonstration (EFOS)
  private readonly BLACKLIST_SAMPLES = [
    'EFOS123456789', 'BADD010101XYZ', 'FAKE991231ABC'
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * Identifica proveedores en la lista 69-B del SAT (EFOS).
   */
  async auditSuppliers(companyId: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { companyId }
    });

    const results = suppliers.map(s => {
      const isBlacklisted = this.BLACKLIST_SAMPLES.includes(s.rfc || '');
      return {
        supplierId: s.id,
        name: s.name,
        rfc: s.rfc,
        status: isBlacklisted ? 'EFOS_DETECTED' : 'CLEAN',
        riskLevel: isBlacklisted ? 'CRITICAL' : 'LOW',
        observation: isBlacklisted 
          ? 'Proveedor detectado en el listado 69-B del SAT como Empresa que Factura Operaciones Simuladas.' 
          : 'Sin incidencias reportadas en listas negras.'
      };
    });

    return results;
  }

  /**
   * Audita facturas recibidas contra la lista negra.
   */
  async auditInvoices(companyId: string) {
    const bills = await this.prisma.bill.findMany({
      where: { companyId },
      include: { supplier: true }
    });

    const riskyInvoices = bills.filter(b => 
      this.BLACKLISTED_RFCS().includes(b.supplier?.rfc || '')
    );

    return {
      totalAudited: bills.length,
      riskyInvoicesCount: riskyInvoices.length,
      totalRiskAmount: riskyInvoices.reduce((s, i) => s + i.total, 0),
      items: riskyInvoices.map(i => ({
        folio: i.folio,
        date: i.date,
        supplier: i.supplier?.name,
        rfc: i.supplier?.rfc,
        total: i.total,
        status: 'RISK_DETECTED'
      }))
    };
  }

  private BLACKLISTED_RFCS() {
    return this.BLACKLIST_SAMPLES;
  }
}
