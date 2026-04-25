import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';

const MODULES = ['dashboard','invoices','payments','quotes','pos','clients','suppliers','bills','banks','reconciliation','inventory','warehouses','assets','payroll','nomina','reports','sat','diot','xml-sat','sat-exports','accounts','journals','budgets','segments','audit','templates','fiscal','currencies','companies','certificates'];

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async get(@Query('companyId') companyId: string, @Query('userId') userId: string) {
    const perms = await this.prisma.userModulePermission.findMany({ where: { companyId, userId } });
    const map: Record<string, any> = {};
    for (const m of MODULES) {
      const p = perms.find(p => p.module === m);
      map[m] = p ?? { module: m, canView: true, canCreate: false, canEdit: false, canDelete: false };
    }
    return map;
  }

  @Get('users')
  async getUsers(@Query('companyId') companyId: string) {
    return this.prisma.user.findMany({ where: { companyId }, select: { id: true, name: true, email: true, role: true } });
  }

  @Post('bulk')
  async bulk(@Body() body: { companyId: string; userId: string; permissions: Array<{ module: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }> }) {
    const results = [];
    for (const perm of body.permissions) {
      const r = await this.prisma.userModulePermission.upsert({
        where: { userId_module_companyId: { userId: body.userId, module: perm.module, companyId: body.companyId } },
        update: { canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete },
        create: { userId: body.userId, module: perm.module, companyId: body.companyId, canView: perm.canView, canCreate: perm.canCreate, canEdit: perm.canEdit, canDelete: perm.canDelete },
      });
      results.push(r);
    }
    return { saved: results.length };
  }

  @Get('modules')
  async modules() {
    return MODULES;
  }
}
