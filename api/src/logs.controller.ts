import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('logs')
export class LogsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getLogs(@Query('companyId') companyId: string, @Query('limit') limit: string) {
    if (!companyId) return [];
    
    const take = limit ? parseInt(limit) : 50;

    return (this.prisma as any).auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { name: true, email: true } } }
    });
  }

  @Post()
  async createLog(@Body() body: any) {
    const { companyId, userId, action, entity, entityId, details } = body;
    if (!companyId || !action || !entity) throw new BadRequestException('Faltan datos de bitácora');

    return (this.prisma as any).auditLog.create({
      data: { companyId, userId, action, entity, entityId, details: details ? JSON.stringify(details) : null }
    });
  }
}
