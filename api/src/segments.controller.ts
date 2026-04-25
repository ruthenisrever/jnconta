import { Controller, Get, Post, Put, Delete, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('segments')
export class SegmentsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getSegments(@Query('companyId') companyId: string) {
    if (!companyId) return [];
    return (this.prisma as any).businessSegment.findMany({
      where: { companyId },
      orderBy: { code: 'asc' }
    });
  }

  @Post()
  async createSegment(@Body() body: any) {
    const { companyId, code, name, description } = body;
    if (!companyId || !code || !name) throw new BadRequestException('Faltan datos requeridos');

    return (this.prisma as any).businessSegment.create({
      data: { companyId, code, name, description }
    });
  }

  @Put(':id')
  async updateSegment(@Param('id') id: string, @Body() body: any) {
    const { name, description, isActive } = body;
    return (this.prisma as any).businessSegment.update({
      where: { id },
      data: { name, description, isActive }
    });
  }

  @Delete(':id')
  async deleteSegment(@Param('id') id: string) {
    // Check usage
    const usage = await (this.prisma as any).journalEntry.count({ where: { businessSegmentId: id } });
    if (usage > 0) throw new BadRequestException('El segmento está en uso en pólizas y no puede eliminarse.');

    return (this.prisma as any).businessSegment.delete({ where: { id } });
  }
}
