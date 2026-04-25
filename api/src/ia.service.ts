import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class IAService {
  private readonly logger = new Logger(IAService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Valida si un usuario/compañía tiene tokens disponibles para una consulta de IA.
   */
  async validateTokens(companyId: string, estimatedTokens: number = 1000) {
    const company = await (this.prisma as any).company.findUnique({
      where: { id: companyId },
      include: { tenant: { include: { subscription: true } } }
    });

    if (!company?.tenant?.subscription) {
      // Si no hay suscripción, permitimos un pequeño margen de prueba o bloqueamos
      // Por ahora permitiremos 5000 tokens de "cortesía" si no hay sub
      return true;
    }

    const sub = company.tenant.subscription;
    if (sub.tokenUsed + estimatedTokens > sub.tokenLimit) {
      throw new BadRequestException('Has alcanzado el límite de potencia de IA (tokens) de tu plan. Actualiza para continuar usando a Javier IA.');
    }

    return true;
  }

  /**
   * Registra el consumo real de tokens después de una llamada a la API de IA.
   */
  async recordUsage(companyId: string, actualTokens: number) {
    const company = await (this.prisma as any).company.findUnique({
      where: { id: companyId },
      include: { tenant: { include: { subscription: true } } }
    });

    if (company?.tenant?.subscription) {
      await (this.prisma as any).subscription.update({
        where: { id: company.tenant.subscription.id },
        data: { tokenUsed: { increment: actualTokens } }
      });
      
      this.logger.log(`Consumo de IA registrado: ${actualTokens} tokens para la empresa ${company.name}`);
    }
  }
}
