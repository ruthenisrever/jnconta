import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as https from 'https';

@Injectable()
export class SatService {
  private readonly logger = new Logger(SatService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Sincroniza la lista de EFOS del SAT.
   * Por seguridad, permite pasar una URL o usar una por defecto.
   */
  async syncBlacklist(customUrl?: string) {
    // URL oficial del listado completo del SAT (69-B)
    const url = customUrl || 'https://raw.githubusercontent.com/oscar-vga/efos-sat-mirror/main/listado_completo_69B.csv';
    
    this.logger.log(`Iniciando sincronización de EFOS desde: ${url}`);

    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', async () => {
          try {
            const lines = data.split('\n');
            this.logger.log(`Procesando ${lines.length} registros del SAT...`);
            
            let count = 0;
            // Omitir cabecera
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const fields = line.split(',');
              if (fields.length < 3) continue;

              const rfc = fields[1]?.trim().replace(/"/g, '');
              const name = fields[2]?.trim().replace(/"/g, '');
              const status = fields[3]?.trim().replace(/"/g, '') || 'DEFINITIVO';

              if (rfc && rfc.length >= 12) {
                await this.prisma.satBlacklist.upsert({
                  where: { rfc },
                  update: { status, updatedAt: new Date() },
                  create: {
                    rfc,
                    name,
                    status,
                    publicationDate: new Date()
                  }
                });
                count++;
              }
            }

            // Actualizar el estatus de riesgo en los catálogos de Proveedores
            await this.updateRiskFlagsInCatalogs();

            this.logger.log(`Sincronización completada: ${count} EFOS actualizados.`);
            resolve({ success: true, count });
          } catch (error) {
            this.logger.error(`Error procesando CSV del SAT: ${error.message}`);
            reject(error);
          }
        });
      }).on('error', (err) => {
        this.logger.error(`Error descargando lista del SAT: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Escanea el catálogo de proveedores y clientes para marcar riesgos legales.
   */
  private async updateRiskFlagsInCatalogs() {
    const blacklisted = await this.prisma.satBlacklist.findMany({ select: { rfc: true, status: true } });
    const blacklistMap = new Map(blacklisted.map(b => [b.rfc, b.status]));

    // 1. Marcar Proveedores
    const suppliers = await this.prisma.supplier.findMany({ where: { rfc: { not: null } } });
    for (const s of suppliers) {
      if (blacklistMap.has(s.rfc!)) {
        await this.prisma.supplier.update({
          where: { id: s.id },
          data: { riskStatus: 'SANCIONADO' }
        });
      }
    }

    // 2. Marcar Clientes (Riesgo preventivo)
    const clients = await this.prisma.client.findMany({ where: { rfc: { not: null } } });
    for (const c of clients) {
      if (blacklistMap.has(c.rfc!)) {
        await this.prisma.client.update({
          where: { id: c.id },
          data: { riskStatus: 'RIESGO' }
        });
      }
    }
  }

  /**
   * Verifica un RFC individual contra la base local de EFOS
   */
  async checkRfc(rfc: string) {
    if (!rfc) return null;
    return this.prisma.satBlacklist.findUnique({ where: { rfc: rfc.toUpperCase().trim() } });
  }

  /**
   * Analiza todas las facturas (recibidas e impartidas) de una empresa en busca de riesgos EFOS.
   */
  async runRiskAnalysis(companyId: string) {
    const [bills, invoices] = await Promise.all([
      this.prisma.bill.findMany({ 
        where: { companyId }, 
        include: { supplier: true } 
      }),
      this.prisma.invoice.findMany({ 
        where: { companyId }, 
        include: { client: true } 
      })
    ]);

    const blacklistItems = await this.prisma.satBlacklist.findMany({ select: { rfc: true, status: true } });
    const blacklistSet = new Set(blacklistItems.map(b => b.rfc));
    
    const results = [];

    // Analizar Facturas Recibidas (Proveedores) - ALTO RIESGO
    for (const bill of bills as any[]) {
      const rfc = bill.supplier?.rfc;
      if (rfc && blacklistSet.has(rfc)) {
        results.push({
          type: 'COMPRA',
          entityId: bill.id,
          number: bill.folio,
          rfc: rfc,
          amount: bill.total,
          risk: 'ALTO (EFOS)',
          status: 'EDOS_POTENCIAL'
        });
      }
    }

    // Analizar Facturas Emitidas (Clientes) - RIESGO PREVENTIVO
    for (const invoice of invoices as any[]) {
      const rfc = invoice.client?.rfc;
      if (rfc && blacklistSet.has(rfc)) {
        results.push({
          type: 'VENTA',
          entityId: invoice.id,
          number: String(invoice.folio),
          rfc: rfc,
          amount: invoice.total,
          risk: 'BAJO (PREVENTIVO)',
          status: 'CLIENTE_SANCIONADO'
        });
      }
    }

    this.logger.warn(`Análisis fiscal 360° completado para empresa ${companyId}: ${results.length} riesgos encontrados.`);
    return results;
  }
}
