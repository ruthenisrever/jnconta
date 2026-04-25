import {
  Controller, Get, Post, Delete, Body, Param, Headers,
  UploadedFile, UseInterceptors, BadRequestException, NotFoundException, Query
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

function getJwtSecret() { return process.env.JWT_SECRET || 'jnconta-secret'; }
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from './prisma.service';

@Controller('companies')
export class CompaniesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async findAll() {
    return this.prisma.company.findMany({
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.company.findUnique({
      where: { id },
    });
  }

  @Post()
  async create(@Body() body: any) {
    if (!body.rfc || !body.name) {
      throw new BadRequestException('RFC and Name are required');
    }
    return this.prisma.company.create({
      data: {
        name: body.name,
        rfc: body.rfc,
        regimenFiscal: body.regimenFiscal || '601',
        address: body.address,
        email: body.email,
        phone: body.phone,
        currency: body.currency || 'MXN',
      },
    });
  }

  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('logoUrl') logoUrl?: string, // Fallback if no file (base64 or external)
  ) {
    let url = logoUrl;
    
    if (file) {
      // In a real app, upload to S3/Cloudinary. 
      // Here we'll convert to simple Base64 for the mock to work instantly in the UI.
      const base64 = file.buffer.toString('base64');
      url = `data:${file.mimetype};base64,${base64}`;
    }

    if (!url) throw new BadRequestException('Logo data required');

    return this.prisma.company.update({
      where: { id },
      data: { logo: url },
    });
  }

  @Post(':id/update')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.prisma.company.update({
      where: { id },
      data,
    });
  }

  // ── GESTIÓN DE USUARIOS DE LA EMPRESA ────────────────────────────────────────

  @Get(':id/users')
  async getUsers(@Param('id') id: string, @Headers('authorization') auth: string) {
    const payload = jwt.verify(auth?.replace('Bearer ', ''), getJwtSecret()) as any;
    if (payload.companyId !== id && payload.role !== 'admin') {
      throw new BadRequestException('Sin acceso');
    }

    // Usuario primario (owner)
    const owner = await this.prisma.user.findFirst({
      where: { companyId: id },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    // Usuarios asignados via UserCompany
    const assigned = await (this.prisma as any).userCompany.findMany({
      where: { companyId: id },
      include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
    });

    const result: any[] = [];
    if (owner) result.push({ ...owner, memberRole: 'owner' });
    for (const uc of assigned) {
      if (!result.find((u: any) => u.id === uc.user.id)) {
        result.push({ ...uc.user, memberRole: uc.role });
      }
    }
    return result;
  }

  @Post(':id/users')
  async addUser(
    @Param('id') id: string,
    @Headers('authorization') auth: string,
    @Body() body: { email: string; name?: string; role?: string; password?: string },
  ) {
    jwt.verify(auth?.replace('Bearer ', ''), getJwtSecret());

    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    // Buscar usuario existente o crearlo
    let user = await this.prisma.user.findUnique({ where: { email: body.email.toLowerCase().trim() } });

    if (!user) {
      const tempPassword = body.password || Math.random().toString(36).slice(-10) + 'A1!';
      user = await this.prisma.user.create({
        data: {
          email: body.email.toLowerCase().trim(),
          name: body.name || body.email.split('@')[0],
          role: body.role || 'user',
          companyId: id,
          passwordHash: await bcrypt.hash(tempPassword, 12),
        },
      });
    } else {
      // Crear relación UserCompany para usuario existente
      await (this.prisma as any).userCompany.upsert({
        where: { userId_companyId: { userId: user.id, companyId: id } },
        update: { role: body.role || 'accountant' },
        create: { userId: user.id, companyId: id, role: body.role || 'accountant' },
      });
    }

    return { id: user.id, name: user.name, email: user.email, role: user.role, memberRole: body.role || 'accountant' };
  }

  @Delete(':id/users/:userId')
  async removeUser(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Headers('authorization') auth: string,
  ) {
    jwt.verify(auth?.replace('Bearer ', ''), getJwtSecret());

    // Solo eliminar la asignación, no el usuario
    await (this.prisma as any).userCompany.deleteMany({
      where: { userId, companyId: id },
    });

    return { ok: true };
  }
}
