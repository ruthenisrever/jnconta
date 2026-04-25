import { Controller, Post, Get, Body, Req, Headers, BadRequestException, RawBodyRequest, UnauthorizedException } from '@nestjs/common';
import { Public } from './auth.guard';
import { StripeService } from './stripe.service';
import { PrismaService } from './prisma.service';
import { getPlanFeatures } from './plan-features';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private stripeService: StripeService,
    private prisma: PrismaService
  ) {}

  // ── ESTADO DE SUSCRIPCIÓN (con feature flags) ─────────────────────────────────
  @Get('status')
  async getStatus(@Headers('authorization') auth: string) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido');
    let payload: any;
    try {
      payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET || '');
    } catch {
      throw new UnauthorizedException('Token inválido');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: payload.companyId },
      include: { tenant: { include: { subscription: { include: { plan: true } } } } },
    });

    const sub = company?.tenant?.subscription;
    const plan = sub?.plan;
    const planId = plan?.id ?? 'lite';
    const features = getPlanFeatures(planId);

    // Verificar si la suscripción está vencida
    const now = new Date();
    const isExpired = sub?.endDate && new Date(sub.endDate) < now && sub.status === 'ACTIVE';
    const effectiveStatus = isExpired ? 'EXPIRED' : (sub?.status ?? 'TRIAL');

    return {
      planId,
      planName:      plan?.name ?? 'Lite (Trial)',
      status:        effectiveStatus,
      stampingUsed:  sub?.stampingUsed  ?? 0,
      stampingLimit: sub?.stampingLimit ?? (plan?.foliosIncluded ?? 15),
      tokenUsed:     sub?.tokenUsed  ?? 0,
      tokenLimit:    sub?.tokenLimit ?? (plan?.tokensIncluded ?? 50_000),
      endDate:       sub?.endDate ?? null,
      features,
    };
  }

  // ── VALIDAR CÓDIGO DE PROMOCIÓN (público, sin auth) ──────────────────────────
  @Public()
  @Post('validate-promo')
  async validatePromo(@Body() body: { code: string }) {
    const code = body.code?.trim().toUpperCase();
    if (!code) throw new BadRequestException('Código requerido');

    const promo = await (this.prisma as any).promoCode.findUnique({
      where: { code },
      include: { plan: true },
    });

    if (!promo || !promo.isActive) {
      throw new BadRequestException('Código inválido o inactivo');
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      throw new BadRequestException('Este código ha expirado');
    }
    if (promo.usageLimit !== -1 && promo.usedCount >= promo.usageLimit) {
      throw new BadRequestException('Este código ya alcanzó su límite de usos');
    }

    return {
      valid: true,
      planId:      promo.plan.id,
      planName:    promo.plan.name,
      discountPct: promo.discountPct,
      months:      promo.months,
      description: promo.description,
      finalPrice:  promo.discountPct === 100 ? 0 : Math.ceil(promo.plan.price * (1 - promo.discountPct / 100)),
    };
  }

  // ── APLICAR CÓDIGO DE PROMOCIÓN (requiere auth) ───────────────────────────────
  @Post('apply-promo')
  async applyPromo(
    @Headers('authorization') auth: string,
    @Body() body: { code: string },
  ) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET || '') as any;

    const code = body.code?.trim().toUpperCase();
    const promo = await (this.prisma as any).promoCode.findUnique({
      where: { code },
      include: { plan: true },
    });

    if (!promo || !promo.isActive) throw new BadRequestException('Código inválido');
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) throw new BadRequestException('Código expirado');
    if (promo.usageLimit !== -1 && promo.usedCount >= promo.usageLimit) throw new BadRequestException('Código agotado');

    const company = await this.prisma.company.findUnique({
      where: { id: payload.companyId },
      include: { tenant: true },
    });
    if (!company?.tenantId) throw new BadRequestException('Empresa sin tenant');

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + promo.months);

    await this.prisma.subscription.upsert({
      where: { tenantId: company.tenantId },
      update: {
        planId: promo.plan.id,
        stampingLimit: promo.plan.foliosIncluded,
        tokenLimit: promo.plan.tokensIncluded,
        status: 'ACTIVE',
        endDate,
      },
      create: {
        tenantId: company.tenantId,
        planId: promo.plan.id,
        stampingLimit: promo.plan.foliosIncluded,
        tokenLimit: promo.plan.tokensIncluded,
        status: 'ACTIVE',
        endDate,
      },
    });

    // Incrementar contador de uso
    await (this.prisma as any).promoCode.update({
      where: { code },
      data: { usedCount: { increment: 1 } },
    });

    return {
      ok: true,
      planId:   promo.plan.id,
      planName: promo.plan.name,
      months:   promo.months,
      endDate,
    };
  }

  // ── ASIGNAR PLAN (admin / soporte) ───────────────────────────────────────────
  @Post('assign')
  async assignPlan(
    @Headers('authorization') auth: string,
    @Body() body: { planId: string; months?: number },
  ) {
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    const payload = jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET || '') as any;
    if (payload.role !== 'admin') throw new UnauthorizedException('Solo administradores');

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: body.planId } });
    if (!plan) throw new BadRequestException('Plan no encontrado');

    const company = await this.prisma.company.findUnique({
      where: { id: payload.companyId },
      include: { tenant: true },
    });
    if (!company?.tenantId) throw new BadRequestException('Empresa sin tenant');

    const months = body.months ?? 1;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    await this.prisma.subscription.upsert({
      where: { tenantId: company.tenantId },
      update: { planId: plan.id, stampingLimit: plan.foliosIncluded, tokenLimit: plan.tokensIncluded, status: 'ACTIVE', endDate },
      create: { tenantId: company.tenantId, planId: plan.id, stampingLimit: plan.foliosIncluded, tokenLimit: plan.tokensIncluded, status: 'ACTIVE', endDate },
    });

    return { ok: true, planId: plan.id, planName: plan.name, endDate };
  }

  // ── CHECKOUT ─────────────────────────────────────────────────────────────────
  @Post('checkout')
  async checkout(@Body() body: { planId: string; tenantId: string }) {
    const { planId, tenantId } = body;
    // URL real de producción para jnconta.com
    const successUrl = 'https://jnconta.com/dashboard?payment=success';
    const cancelUrl = 'https://jnconta.com/#precios';
    
    return this.stripeService.createCheckoutSession(planId, tenantId, successUrl, cancelUrl);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') sig: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    let event;

    try {
      event = this.stripeService.constructEvent(req.rawBody.toString(), sig, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { planId, tenantId } = session.metadata;

      // Activar Suscripción
      const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      
      if (plan && tenantId) {
        await this.prisma.subscription.upsert({
          where: { tenantId },
          update: {
            planId: plan.id,
            stampingLimit: plan.foliosIncluded,
            stampingUsed: 0,
            tokenLimit: plan.tokensIncluded,
            tokenUsed: 0,
            status: 'ACTIVE',
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
          },
          create: {
            tenantId,
            planId: plan.id,
            stampingLimit: plan.foliosIncluded,
            tokenLimit: plan.tokensIncluded,
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
          }
        });
        console.log(`Suscripción activada para el Tenant: ${tenantId}`);
      }
    }

    return { received: true };
  }
}
