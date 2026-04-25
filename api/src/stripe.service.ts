import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  constructor(private prisma: PrismaService) {
    // La llave se obtendría de process.env.STRIPE_SECRET_KEY
    const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia' as any,
    });
  }

  /**
   * Crea una sesión de Checkout para que el usuario pague su plan.
   */
  async createCheckoutSession(planId: string, tenantId: string, successUrl: string, cancelUrl: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new BadRequestException('Plan no encontrado.');

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            recurring: { interval: 'month' },
            product_data: {
              name: `Plan ${plan.name} — JnConta`,
              description: `${plan.foliosIncluded} folios · ${plan.tokensIncluded.toLocaleString()} tokens IA / mes`,
            },
            unit_amount: Math.round(plan.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { planId: plan.id, tenantId },
    });

    return { url: session.url };
  }

  /**
   * Valida un Webhook de Stripe.
   */
  constructEvent(payload: string, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
