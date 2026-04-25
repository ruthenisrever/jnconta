import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('assets')
export class AssetsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.prisma.fixedAsset.findMany({
      where: { companyId },
      orderBy: { acquisitionDate: 'desc' },
    });
  }

  @Post()
  async create(@Body() data: any) {
    const acquisitionCost = parseFloat(data.acquisitionCost || '0');
    const residualValue = parseFloat(data.residualValue || '0');
    const usefulLife = parseInt(data.usefulLife || '1');
    const depreciationRate = parseFloat(data.depreciationRate || '10');
    const acquisitionDate = new Date(data.acquisitionDate || new Date());

    // Initial calculation of accumulated depreciation if the asset was acquired in the past
    const monthsSinceAcquisition = Math.max(0, (new Date().getTime() - acquisitionDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const monthlyDep = (acquisitionCost - residualValue) * (depreciationRate / 100) / 12;
    const accumulatedDep = Math.min(monthlyDep * monthsSinceAcquisition, acquisitionCost - residualValue);
    const netValue = acquisitionCost - accumulatedDep;

    return this.prisma.fixedAsset.create({
      data: { 
        ...data, 
        acquisitionCost,
        residualValue,
        usefulLife,
        depreciationRate,
        acquisitionDate,
        accumulatedDep: parseFloat(accumulatedDep.toFixed(2)), 
        netValue: parseFloat(netValue.toFixed(2)) 
      },
    });
  }

  @Post('depreciate/post')
  async postDepreciation(@Body() { companyId, year, month }: { companyId: string, year: number, month: number }) {
    if (!companyId || !year || !month) throw new BadRequestException('Missing required fields');

    const assets = await this.prisma.fixedAsset.findMany({ 
      where: { companyId, isActive: true, netValue: { gt: 0 } } 
    });

    if (assets.length === 0) return { message: 'No assets to depreciate' };

    // Create the Journal Entry
    const journalDate = new Date(year, month, 0); // End of month
    
    const journal = await this.prisma.journal.create({
      data: {
        companyId,
        date: journalDate,
        type: 'DIARIO',
        number: `DEP-${year}-${month.toString().padStart(2, '0')}`,
        concept: `Depreciación Mensual - ${month}/${year}`,
        status: 'APLICADA',
        entries: {
          create: [] // We'll add entries below
        }
      }
    });

    let totalDepreciation = 0;

    for (const asset of assets) {
      // Calculate monthly depreciation using SAT rate
      const monthlyDep = (asset.acquisitionCost - asset.residualValue) * (asset.depreciationRate / 100) / 12;
      const actualDep = Math.min(monthlyDep, asset.netValue);
      
      if (actualDep <= 0) continue;

      totalDepreciation += actualDep;

      // 1. Entry: Depreciation Expense (Debit)
      if (asset.expenseAccountId) {
        await this.prisma.journalEntry.create({
          data: {
            journalId: journal.id,
            accountId: asset.expenseAccountId,
            description: `Depreciación: ${asset.name}`,
            debit: actualDep,
            credit: 0
          }
        });
      }

      // 2. Entry: Accumulated Depreciation (Credit)
      if (asset.accumulatedAccountId) {
        await this.prisma.journalEntry.create({
          data: {
            journalId: journal.id,
            accountId: asset.accumulatedAccountId,
            description: `Dep. Acumulada: ${asset.name}`,
            debit: 0,
            credit: actualDep
          }
        });
      }

      // 3. Update Asset Values
      await this.prisma.fixedAsset.update({
        where: { id: asset.id },
        data: {
          accumulatedDep: asset.accumulatedDep + actualDep,
          netValue: asset.netValue - actualDep
        }
      });
    }

    return { 
      journalId: journal.id, 
      totalAssets: assets.length,
      totalAmount: totalDepreciation 
    };
  }

  @Get('depreciation-preview')
  async getPreview(@Query('companyId') companyId: string) {
    const assets = await this.prisma.fixedAsset.findMany({ 
      where: { companyId, isActive: true, netValue: { gt: 0 } } 
    });

    return assets.map(asset => {
      const monthlyDep = (asset.acquisitionCost - asset.residualValue) * (asset.depreciationRate / 100) / 12;
      return { 
        ...asset, 
        monthlyDepreciation: parseFloat(Math.min(monthlyDep, asset.netValue).toFixed(2)) 
      };
    });
  }
}
