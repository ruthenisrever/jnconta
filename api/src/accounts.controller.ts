import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from './prisma.service';


@Controller('accounts')
export class AccountsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.prisma.account.findMany({
      where: { companyId },
      include: { children: true },
      orderBy: { code: 'asc' },
    });
  }

  @Post()
  create(@Body() data: { code: string; name: string; type: string; nature: string; level: number; companyId: string; satCode?: string; parentId?: string }) {
    return this.prisma.account.create({ data });
  }

  @Post('import')
  async import(@Body() data: { accounts: any[]; companyId: string }) {
    for (const acc of data.accounts) {
      await this.prisma.account.upsert({
        where: { id: acc.id || 'new' }, // This logic might need refinement based on unique code per company
        update: { ...acc, companyId: data.companyId },
        create: { ...acc, companyId: data.companyId },
      }).catch(() => {
        // Fallback or skip if exists
        console.warn('Upsert failed for', acc.code);
      });
    }
    return { success: true };
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: { name?: string; satCode?: string; isActive?: boolean }) {
    return this.prisma.account.update({ where: { id }, data });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prisma.account.delete({ where: { id } });
  }
}

