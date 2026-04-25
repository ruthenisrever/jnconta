import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('templates')
export class TemplatesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll(@Query('companyId') companyId: string) {
    return this.prisma.journalTemplate.findMany({
      where: { companyId },
      include: { entries: true },
      orderBy: { name: 'asc' }
    });
  }

  @Post()
  async create(@Body() data: any) {
    const { entries, ...templateData } = data;
    return this.prisma.journalTemplate.create({
      data: {
        ...templateData,
        entries: {
          create: entries
        }
      },
      include: { entries: true }
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    const { entries, ...templateData } = data;
    
    // Primero eliminamos las entradas anteriores para recrearlas (simplicidad para el MVP)
    await this.prisma.journalTemplateEntry.deleteMany({
      where: { templateId: id }
    });

    return this.prisma.journalTemplate.update({
      where: { id },
      data: {
        ...templateData,
        entries: {
          create: entries
        }
      },
      include: { entries: true }
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.journalTemplate.delete({
      where: { id }
    });
  }
}
