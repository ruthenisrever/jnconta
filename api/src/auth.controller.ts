import {
  Controller, Post, Get, Body, UnauthorizedException,
  Headers, BadRequestException, Logger, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EmailService } from './email.service';
import { Public } from './auth.guard';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

const JWT_EXPIRES = '8h';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no configurado.');
  return secret;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private prisma: PrismaService, private email: EmailService) {}

  private verifyToken(auth: string): any {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido');
    try {
      return jwt.verify(auth.replace('Bearer ', ''), getJwtSecret());
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();
    if (!email || !password) throw new UnauthorizedException('Email y contraseña requeridos');

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user || !user.passwordHash) throw new UnauthorizedException('Credenciales inválidas');
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Credenciales inválidas');

    const access_token = jwt.sign(
      { sub: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId, companyName: user.company?.name },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES },
    );

    return {
      access_token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId, companyName: user.company?.name },
    };
  }

  // ── REGISTRO (SIGNUP) ────────────────────────────────────────────────────────

  @Public()
  @Post('signup')
  async signup(@Body() body: {
    name: string;
    email: string;
    password: string;
    companyName: string;
    rfc?: string;
  }) {
    const { name, email, password, companyName, rfc } = body;

    if (!name?.trim()) throw new BadRequestException('El nombre es requerido.');
    if (!email?.trim() || !email.includes('@')) throw new BadRequestException('El correo electrónico no es válido.');
    if (!password || password.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    if (!companyName?.trim()) throw new BadRequestException('El nombre de la empresa es requerido.');

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new BadRequestException('Ya existe una cuenta con ese correo electrónico.');

    const passwordHash = await bcrypt.hash(password, 12);

    // Plan Lite por defecto (30 días de prueba)
    const litePlan = await this.prisma.subscriptionPlan.findFirst({ where: { name: 'Lite' } });

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: companyName.trim(), ownerEmail: normalizedEmail },
      });

      const company = await tx.company.create({
        data: {
          name: companyName.trim(),
          rfc: rfc?.trim().toUpperCase() || '',
          currency: 'MXN',
          exerciseYear: new Date().getFullYear(),
          tenantId: tenant.id,
        },
      });

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          name: name.trim(),
          role: 'admin',
          passwordHash,
          companyId: company.id,
        },
      });

      if (litePlan) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 30);
        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: litePlan.id,
            stampingLimit: litePlan.foliosIncluded,
            tokenLimit: litePlan.tokensIncluded,
            status: 'TRIAL',
            endDate: trialEnd,
          },
        });
      }

      return { user, company };
    });

    this.logger.log(`Nuevo usuario registrado: ${normalizedEmail} — empresa: ${companyName}`);
    this.email.sendWelcome(normalizedEmail, name.trim(), companyName.trim()).catch(() => null);

    const access_token = jwt.sign(
      { sub: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role, companyId: result.company.id, companyName: result.company.name },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES },
    );

    return {
      access_token,
      user: { id: result.user.id, email: result.user.email, name: result.user.name, role: result.user.role, companyId: result.company.id, companyName: result.company.name },
    };
  }

  // ── ME ────────────────────────────────────────────────────────────────────────

  @Public()
  @Get('me')
  async me(@Headers('authorization') auth: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido');
    try {
      const token = auth.replace('Bearer ', '');
      const payload = jwt.verify(token, getJwtSecret()) as any;
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { company: true } });
      if (!user) throw new UnauthorizedException();
      return { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId, companyName: user.company?.name };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  // ── MIS EMPRESAS ─────────────────────────────────────────────────────────────

  @Get('my-companies')
  async myCompanies(@Headers('authorization') auth: string) {
    const payload = this.verifyToken(auth);

    // Obtener el usuario de la base de datos para saber su empresa principal original
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const primary = await this.prisma.company.findUnique({ where: { id: user.companyId } });

    // Empresas adicionales asignadas (join table)
    const extra = await (this.prisma as any).userCompany.findMany({
      where: { userId: payload.sub },
      include: { company: true },
    });

    const all = [primary, ...extra.map((uc: any) => uc.company)]
      .filter(Boolean)
      .filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === c.id) === i);

    return all.map((c: any) => ({ id: c.id, name: c.name, rfc: c.rfc, logo: c.logo }));
  }

  // ── CAMBIAR EMPRESA ACTIVA ────────────────────────────────────────────────────

  @Post('switch-company')
  async switchCompany(
    @Headers('authorization') auth: string,
    @Body() body: { companyId: string },
  ) {
    const payload = this.verifyToken(auth);
    const { companyId } = body;
    if (!companyId) throw new BadRequestException('companyId requerido');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    // Verificar acceso: empresa principal en base de datos o asignada por UserCompany
    const isPrimary = user.companyId === companyId;
    const isAssigned = !isPrimary && await (this.prisma as any).userCompany.findUnique({
      where: { userId_companyId: { userId: payload.sub, companyId } },
    });

    if (!isPrimary && !isAssigned) throw new ForbiddenException('Sin acceso a esta empresa');

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Empresa no encontrada');

    const newToken = jwt.sign(
      { sub: payload.sub, email: payload.email, name: payload.name, role: payload.role, companyId: company.id, companyName: company.name },
      getJwtSecret(),
      { expiresIn: JWT_EXPIRES },
    );

    return { access_token: newToken, company: { id: company.id, name: company.name, rfc: company.rfc, logo: company.logo } };
  }

  // ── CAMBIO DE CONTRASEÑA ──────────────────────────────────────────────────────

  @Post('change-password')
  async changePassword(
    @Headers('authorization') auth: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const payload = jwt.verify(auth.replace('Bearer ', ''), getJwtSecret()) as any;
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    if (user.passwordHash) {
      const valid = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');
    }
    if (body.newPassword.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');

    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, 12) } });
    return { message: 'Contraseña actualizada correctamente' };
  }

  // ── FORGOT PASSWORD ───────────────────────────────────────────────────────────

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    const email = body.email?.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email requerido');

    // Siempre devolvemos 200 para no revelar si el email existe
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600_000); // 1 hora

    const db = this.prisma.user as any;
    await db.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const resetUrl = `${process.env.APP_URL || 'https://jnconta.com'}/reset-password?token=${token}`;
    this.logger.log(`[RESET PASSWORD] URL para ${email}: ${resetUrl}`);
    await this.email.sendPasswordReset(email, resetUrl);

    return { message: 'Si el email existe, recibirás un enlace para restablecer tu contraseña.' };
  }

  // ── RESET PASSWORD ────────────────────────────────────────────────────────────

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    const { token, newPassword } = body;
    if (!token || !newPassword) throw new BadRequestException('Token y contraseña requeridos');
    if (newPassword.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');

    const db = this.prisma.user as any;
    const user = await db.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });
    if (!user) throw new BadRequestException('El enlace es inválido o ha expirado.');

    await db.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' };
  }
}
