import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CurrencyService } from './currency.service';
import { AuditService } from './audit.service';

@Controller('journals')
export class JournalsController {
  constructor(
    private prisma: PrismaService,
    private currencyService: CurrencyService,
    private audit: AuditService
  ) {}

  @Get()
  findAll(@Query('companyId') companyId: string, @Query('type') type?: string) {
    return this.prisma.journal.findMany({
      where: { companyId, ...(type ? { type } : {}) },
      include: { entries: { include: { account: true } } },
      orderBy: { date: 'desc' },
    });
  }

  @Post()
  async create(@Body() data: { 
    number: string; type: string; date: string; concept: string; companyId: string; 
    currency?: string; exchangeRate?: number;
    entries: { accountId: string; debit: number; credit: number; description?: string; amountForeign?: number }[];
    xmlIds?: string[];
  }) {
    const { entries, xmlIds, ...journalData } = data;
    
    const journal = await this.prisma.journal.create({
      data: {
        ...journalData,
        currency: journalData.currency || 'MXN',
        exchangeRate: journalData.exchangeRate || 1.0,
        date: new Date(journalData.date),
        entries: { 
          create: entries.map(e => ({
            accountId: e.accountId,
            debit: e.debit,
            credit: e.credit,
            description: e.description,
            amountForeign: e.amountForeign || 0,
            updatedAt: new Date()
          }))
        },
        ...(xmlIds ? { xmlDocuments: { connect: xmlIds.map(id => ({ id })) } } : {}),
      },
      include: { entries: { include: { account: true } }, xmlDocuments: true },
    });

    // Auditoría Elite
    await this.audit.logJournalAction('SYSTEM', journal.companyId, 'CREATE', journal.id, journal.concept);
    
    return journal;
  }

  @Post(':id/associate-xml')
  async associateXml(@Param('id') id: string, @Body() data: { xmlIds: string[] }) {
    return this.prisma.journal.update({
      where: { id },
      data: {
        xmlDocuments: { connect: data.xmlIds.map(xmlId => ({ id: xmlId })) },
      },
      include: { xmlDocuments: true },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    const journal = await this.prisma.journal.update({ where: { id }, data });
    await this.audit.logJournalAction('SYSTEM', journal.companyId, 'UPDATE', journal.id, `Modified concept: ${journal.concept}`);
    return journal;
  }

  @Post(':id/delete')
  async remove(@Param('id') id: string) {
    const journal = await this.prisma.journal.findUnique({ where: { id } });
    if (!journal) return;
    
    await this.prisma.journal.delete({ where: { id } });
    await this.audit.logJournalAction('SYSTEM', journal.companyId, 'DELETE', journal.id, `Deleted journal: ${journal.number}`);
    
    return { success: true };
  }
}
