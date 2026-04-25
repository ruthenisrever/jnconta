/**
 * seed-prod.js — Seed de PRODUCCIÓN para JnConta
 *
 * Solo inserta los planes de suscripción.
 * NO crea empresas, usuarios ni datos demo.
 *
 * Uso:
 *   docker compose -f docker-compose.prod.yml --env-file .env.production \
 *     run --rm jnconta-api node prisma/seed-prod.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando base de datos de producción JnConta...\n');

  // ── PLANES DE SUSCRIPCIÓN ──────────────────────────────────────────────────
  const plans = [
    {
      id: 'lite',
      name: 'Lite',
      price: 139,
      foliosIncluded: 15,
      tokensIncluded: 50_000,
      extraFolioPrice: 1.00,
      maxCompanies: 1,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 295,
      foliosIncluded: 60,
      tokensIncluded: 250_000,
      extraFolioPrice: 1.00,
      maxCompanies: 3,
    },
    {
      id: 'business',
      name: 'Business',
      price: 449,
      foliosIncluded: 200,
      tokensIncluded: 1_000_000,
      extraFolioPrice: 1.00,
      maxCompanies: 10,
    },
    {
      id: 'despacho',
      name: 'Despacho',
      price: 1599,
      foliosIncluded: 800,
      tokensIncluded: 5_000_000,
      extraFolioPrice: 0.80,
      maxCompanies: 50,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        price: plan.price,
        foliosIncluded: plan.foliosIncluded,
        tokensIncluded: plan.tokensIncluded,
        extraFolioPrice: plan.extraFolioPrice,
        maxCompanies: plan.maxCompanies,
      },
      create: plan,
    });
    console.log(`  ✅ Plan ${plan.name} — $${plan.price} MXN/mes | ${plan.foliosIncluded} folios`);
  }

  console.log('\n✅ Seed de producción completado.');
  console.log('   Los clientes ya pueden registrarse en https://jnconta.com/register\n');
}

main()
  .catch(err => {
    console.error('❌ Error en seed-prod:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
