const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ─── TABLAS DE ISR 2024 (Artículo 96 LISR) ───────────────────────────────────
// Límite inferior, Cuota fija, Tasa marginal
const ISR_TABLE_MONTHLY = [
  { lower: 0.01, upper: 746.04, cuota: 0, rate: 0.0192 },
  { lower: 746.05, upper: 6332.05, cuota: 14.32, rate: 0.0640 },
  { lower: 6332.06, upper: 11128.01, cuota: 371.83, rate: 0.1088 },
  { lower: 11128.02, upper: 12935.82, cuota: 893.63, rate: 0.16 },
  { lower: 12935.83, upper: 15487.71, cuota: 1182.88, rate: 0.1792 },
  { lower: 15487.72, upper: 31236.49, cuota: 1640.18, rate: 0.2136 },
  { lower: 31236.50, upper: 49233.00, cuota: 5004.12, rate: 0.2352 },
  { lower: 49233.01, upper: 93993.90, cuota: 9236.89, rate: 0.30 },
  { lower: 93993.91, upper: 125325.20, cuota: 22665.17, rate: 0.32 },
  { lower: 125325.21, upper: 375975.61, cuota: 32691.18, rate: 0.34 },
  { lower: 375975.62, upper: Infinity, cuota: 117912.32, rate: 0.35 },
];

// Subsidio al empleo mensual 2024
const SUBSIDIO_TABLE = [
  { lower: 0.01, upper: 1768.96, subsidio: 407.02 },
  { lower: 1768.97, upper: 1978.70, subsidio: 406.83 },
  { lower: 1978.71, upper: 2653.38, subsidio: 406.62 },
  { lower: 2653.39, upper: 3472.84, subsidio: 392.77 },
  { lower: 3472.85, upper: 3537.87, subsidio: 382.46 },
  { lower: 3537.88, upper: 4446.15, subsidio: 354.23 },
  { lower: 4446.16, upper: 4717.18, subsidio: 324.87 },
  { lower: 4717.19, upper: 5335.42, subsidio: 294.63 },
  { lower: 5335.43, upper: 6224.67, subsidio: 253.54 },
  { lower: 6224.68, upper: 7113.90, subsidio: 217.61 },
  { lower: 7113.91, upper: Infinity, subsidio: 0 },
];

function calcularISR(ingresoMensual) {
  const row = ISR_TABLE_MONTHLY.find(r => ingresoMensual >= r.lower && ingresoMensual <= r.upper);
  if (!row) return 0;
  const isr = row.cuota + (ingresoMensual - row.lower) * row.rate;
  const sub = SUBSIDIO_TABLE.find(s => ingresoMensual >= s.lower && ingresoMensual <= s.upper);
  const subsidio = sub ? sub.subsidio : 0;
  return Math.max(0, isr - subsidio);
}

// ─── CUOTAS IMSS 2024 ────────────────────────────────────────────────────────
// Trabajador paga cuota obrera, Patrón paga cuota patronal
const UMA_DIARIA = 108.57; // UMA 2024
const SALARIO_MINIMO_DIARIO = 248.93; // 2024

function calcularIMSS(salarioDiarioIntegrado) {
  // Cap para IMSS: 25 UMAs
  const sdiCapped = Math.min(salarioDiarioIntegrado, UMA_DIARIA * 25);
  const sdiMensual = sdiCapped * 30;

  // Cuotas obrero (trabajador) mensuales
  const enfermedadMaternidad_obrero = sdiMensual * 0.00375;
  const invalidezVida_obrero = sdiMensual * 0.00625;
  const cesantiaVejez_obrero = sdiMensual * 0.01125;
  const totalObrero = enfermedadMaternidad_obrero + invalidezVida_obrero + cesantiaVejez_obrero;

  // Cuotas patronales mensuales
  const enfermedadMaternidad_patron = sdiMensual * 0.205;
  const invalidezVida_patron = sdiMensual * 0.01750;
  const cesantiaVejez_patron = sdiMensual * 0.03150;
  const guarderias_patron = sdiMensual * 0.01;
  const totalPatron = enfermedadMaternidad_patron + invalidezVida_patron + cesantiaVejez_patron + guarderias_patron;

  // RCV (Retiro, Cesantía y Vejez) aportación patrón
  const rcv = sdiMensual * 0.065;

  // INFONAVIT patrón (5%)
  const infonavitPatron = sdiMensual * 0.05;

  return {
    imssEmployee: parseFloat(totalObrero.toFixed(2)),
    imssEmployer: parseFloat(totalPatron.toFixed(2)),
    rcv: parseFloat(rcv.toFixed(2)),
    infonavitEmployer: parseFloat(infonavitPatron.toFixed(2)),
  };
}

async function main() {
  // ── PLANES DE SUSCRIPCIÓN ──────────────────────────────────────────────────
  const plans = [
    { name: 'Lite', price: 139, foliosIncluded: 15, tokensIncluded: 50000, extraFolioPrice: 1.00, maxCompanies: 1 },
    { name: 'Pro', price: 295, foliosIncluded: 60, tokensIncluded: 250000, extraFolioPrice: 1.00, maxCompanies: 3 },
    { name: 'Business', price: 449, foliosIncluded: 200, tokensIncluded: 1000000, extraFolioPrice: 1.00, maxCompanies: 10 },
    { name: 'Despacho', price: 1599, foliosIncluded: 800, tokensIncluded: 5000000, extraFolioPrice: 0.80, maxCompanies: 50 },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: p.name.toLowerCase() },
      update: { ...p },
      create: { id: p.name.toLowerCase(), ...p },
    });
  }

  // ── CÓDIGOS DE PROMOCIÓN ─────────────────────────────────────────────────────
  const promoCodes = [
    {
      code: 'DESPACHO2024',
      planId: 'despacho',
      discountPct: 100,
      months: 12,
      usageLimit: -1,
      description: 'Plan Despacho gratis por 12 meses',
      isActive: true,
    },
    {
      code: 'PROGRATIS',
      planId: 'pro',
      discountPct: 100,
      months: 3,
      usageLimit: 50,
      description: 'Plan Pro gratis por 3 meses',
      isActive: true,
    },
    {
      code: 'BIENVENIDO50',
      planId: 'pro',
      discountPct: 50,
      months: 1,
      usageLimit: 100,
      description: '50% de descuento en el primer mes del Plan Pro',
      isActive: true,
    },
  ];

  for (const p of promoCodes) {
    await prisma.promoCode.upsert({
      where: { code: p.code },
      update: { isActive: p.isActive, months: p.months, usageLimit: p.usageLimit, description: p.description },
      create: p,
    });
    console.log(`  🎟️  Código ${p.code} → Plan ${p.planId} (${p.discountPct}% off, ${p.months} meses)`);
  }

  // ── TENANT (necesario para la suscripción) ───────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { ownerEmail: 'admin@jnconta.com' },
    update: {},
    create: {
      name: 'JNConta Enterprise S.A. de C.V.',
      ownerEmail: 'admin@jnconta.com',
    },
  });

  // ── EMPRESA ──────────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { rfc: 'JNC240101ABC' },
    update: { tenantId: tenant.id },
    create: {
      name: 'JNConta Enterprise S.A. de C.V.',
      rfc: 'JNC240101ABC',
      regimenFiscal: '601 - General de Ley Personas Morales',
      address: 'Av. Insurgentes Sur 1234, Col. Del Valle, CDMX',
      phone: '55-1234-5678',
      email: 'admin@jnconta.com',
      currency: 'MXN',
      exerciseYear: 2024,
      tenantId: tenant.id,
    },
  });

  // ── SUSCRIPCIÓN TRIAL (admin demo) ────────────────────────────────────────
  const litePlan = await prisma.subscriptionPlan.findUnique({ where: { id: 'lite' } });
  if (litePlan) {
    const trialEnd = new Date();
    trialEnd.setFullYear(trialEnd.getFullYear() + 10); // Trial largo para el entorno de demo
    await prisma.subscription.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        planId: litePlan.id,
        stampingLimit: litePlan.foliosIncluded,
        tokenLimit: litePlan.tokensIncluded,
        status: 'TRIAL',
        endDate: trialEnd,
      },
    });
  }

  // ── USUARIO ADMIN ────────────────────────────────────────────────────────────
  const defaultPasswordHash = await bcrypt.hash('ADMIN123!', 12);

  await prisma.user.upsert({
    where: { email: 'admin@jnconta.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'admin@jnconta.com',
      name: 'Administrador',
      role: 'admin',
      passwordHash: defaultPasswordHash,
      companyId: company.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'contador@jnconta.com' },
    update: { passwordHash: defaultPasswordHash },
    create: {
      email: 'contador@jnconta.com',
      name: 'Carlos Méndez',
      role: 'accountant',
      passwordHash: defaultPasswordHash,
      companyId: company.id,
    },
  });

  // ── PLAN DE CUENTAS ───────────────────────────────────────────────────────────
  const accountsData = [
    // ACTIVO
    { code: '1', name: 'ACTIVO', type: 'ACTIVO', nature: 'DEUDORA', level: 1 },
    { code: '1.1', name: 'ACTIVO CIRCULANTE', type: 'ACTIVO', nature: 'DEUDORA', level: 2, parentCode: '1' },
    { code: '1.1.01', name: 'Caja General', type: 'ACTIVO', nature: 'DEUDORA', level: 3, parentCode: '1.1' },
    { code: '1.1.02', name: 'Bancos', type: 'ACTIVO', nature: 'DEUDORA', level: 3, parentCode: '1.1' },
    { code: '1.1.03', name: 'Clientes', type: 'ACTIVO', nature: 'DEUDORA', level: 3, parentCode: '1.1' },
    { code: '1.1.04', name: 'IVA Acreditable', type: 'ACTIVO', nature: 'DEUDORA', level: 3, parentCode: '1.1' },
    { code: '1.1.05', name: 'Inventarios', type: 'ACTIVO', nature: 'DEUDORA', level: 3, parentCode: '1.1' },
    { code: '1.2', name: 'ACTIVO FIJO', type: 'ACTIVO', nature: 'DEUDORA', level: 2, parentCode: '1' },
    { code: '1.2.01', name: 'Equipo de Cómputo', type: 'ACTIVO', nature: 'DEUDORA', level: 3, parentCode: '1.2' },
    { code: '1.2.02', name: 'Mobiliario y Equipo', type: 'ACTIVO', nature: 'DEUDORA', level: 3, parentCode: '1.2' },
    { code: '1.2.03', name: 'Equipo de Transporte', type: 'ACTIVO', nature: 'DEUDORA', level: 3, parentCode: '1.2' },
    { code: '1.2.09', name: 'Dep. Acumulada Equipo Cómputo', type: 'ACTIVO', nature: 'ACREEDORA', level: 3, parentCode: '1.2' },
    // PASIVO
    { code: '2', name: 'PASIVO', type: 'PASIVO', nature: 'ACREEDORA', level: 1 },
    { code: '2.1', name: 'PASIVO CIRCULANTE', type: 'PASIVO', nature: 'ACREEDORA', level: 2, parentCode: '2' },
    { code: '2.1.01', name: 'Proveedores', type: 'PASIVO', nature: 'ACREEDORA', level: 3, parentCode: '2.1' },
    { code: '2.1.02', name: 'IVA Trasladado', type: 'PASIVO', nature: 'ACREEDORA', level: 3, parentCode: '2.1' },
    { code: '2.1.03', name: 'ISR por Pagar', type: 'PASIVO', nature: 'ACREEDORA', level: 3, parentCode: '2.1' },
    { code: '2.1.04', name: 'IMSS por Pagar', type: 'PASIVO', nature: 'ACREEDORA', level: 3, parentCode: '2.1' },
    { code: '2.1.05', name: 'INFONAVIT por Pagar', type: 'PASIVO', nature: 'ACREEDORA', level: 3, parentCode: '2.1' },
    // CAPITAL
    { code: '3', name: 'CAPITAL CONTABLE', type: 'CAPITAL', nature: 'ACREEDORA', level: 1 },
    { code: '3.1', name: 'Capital Social', type: 'CAPITAL', nature: 'ACREEDORA', level: 2, parentCode: '3' },
    { code: '3.2', name: 'Utilidad del Ejercicio', type: 'CAPITAL', nature: 'ACREEDORA', level: 2, parentCode: '3' },
    { code: '3.3', name: 'Utilidades Retenidas', type: 'CAPITAL', nature: 'ACREEDORA', level: 2, parentCode: '3' },
    // INGRESOS
    { code: '4', name: 'INGRESOS', type: 'INGRESO', nature: 'ACREEDORA', level: 1 },
    { code: '4.1', name: 'Ventas de Mercancías', type: 'INGRESO', nature: 'ACREEDORA', level: 2, parentCode: '4' },
    { code: '4.2', name: 'Ingresos por Servicios', type: 'INGRESO', nature: 'ACREEDORA', level: 2, parentCode: '4' },
    // GASTOS
    { code: '5', name: 'GASTOS', type: 'GASTO', nature: 'DEUDORA', level: 1 },
    { code: '5.1', name: 'GASTOS DE OPERACIÓN', type: 'GASTO', nature: 'DEUDORA', level: 2, parentCode: '5' },
    { code: '5.1.01', name: 'Sueldos y Salarios', type: 'GASTO', nature: 'DEUDORA', level: 3, parentCode: '5.1' },
    { code: '5.1.02', name: 'Cuotas IMSS Patronales', type: 'GASTO', nature: 'DEUDORA', level: 3, parentCode: '5.1' },
    { code: '5.1.03', name: 'Arrendamiento', type: 'GASTO', nature: 'DEUDORA', level: 3, parentCode: '5.1' },
    { code: '5.1.04', name: 'Servicios Generales', type: 'GASTO', nature: 'DEUDORA', level: 3, parentCode: '5.1' },
    { code: '5.1.05', name: 'Depreciaciones', type: 'GASTO', nature: 'DEUDORA', level: 3, parentCode: '5.1' },
    { code: '5.1.06', name: 'Costo de Ventas', type: 'GASTO', nature: 'DEUDORA', level: 3, parentCode: '5.1' },
  ];

  // Insert accounts in order (parents first)
  const accountMap = {};
  for (const acc of accountsData) {
    const parentId = acc.parentCode ? accountMap[acc.parentCode]?.id : null;
    const account = await prisma.account.upsert({
      where: { code_companyId: { code: acc.code, companyId: company.id } },
      update: {},
      create: {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        nature: acc.nature,
        level: acc.level,
        parentId: parentId || null,
        companyId: company.id,
      },
    });
    accountMap[acc.code] = account;
  }

  // ── CLIENTES ───────────────────────────────────────────────────────────────────
  const cliente1 = await prisma.client.upsert({
    where: { code_companyId: { code: 'CLI-001', companyId: company.id } },
    update: {},
    create: {
      code: 'CLI-001', name: 'Comercializadora Azteca S.A.', rfc: 'CAZ990101XYZ',
      email: 'compras@azteca.mx', phone: '55-2222-3333',
      creditLimit: 150000, creditDays: 30, currency: 'MXN', companyId: company.id,
    },
  });

  const cliente2 = await prisma.client.upsert({
    where: { code_companyId: { code: 'CLI-002', companyId: company.id } },
    update: {},
    create: {
      code: 'CLI-002', name: 'Tech Solutions USA LLC', rfc: null,
      email: 'billing@techsolutions.com', phone: '+1-555-0100',
      creditLimit: 50000, creditDays: 45, currency: 'USD', companyId: company.id,
    },
  });

  const cliente3 = await prisma.client.upsert({
    where: { code_companyId: { code: 'CLI-003', companyId: company.id } },
    update: {},
    create: {
      code: 'CLI-003', name: 'Grupo Industrial del Norte S.A.', rfc: 'GIN850615MNO',
      email: 'cuentas@industrial.mx', phone: '81-3333-4444',
      creditLimit: 200000, creditDays: 60, currency: 'MXN', companyId: company.id,
    },
  });

  // ── PROVEEDORES ──────────────────────────────────────────────────────────────
  const prov1 = await prisma.supplier.upsert({
    where: { code_companyId: { code: 'PRV-001', companyId: company.id } },
    update: {},
    create: {
      code: 'PRV-001', name: 'Distribuidora Nacional S.A.', rfc: 'DNA010203QRS',
      email: 'ventas@distribuidora.mx', phone: '55-4444-5555',
      creditDays: 30, currency: 'MXN', companyId: company.id,
    },
  });

  const prov2 = await prisma.supplier.upsert({
    where: { code_companyId: { code: 'PRV-002', companyId: company.id } },
    update: {},
    create: {
      code: 'PRV-002', name: 'Global Imports Inc.', rfc: null,
      email: 'orders@globalimports.com', phone: '+1-555-0200',
      creditDays: 45, currency: 'USD', companyId: company.id,
    },
  });

  // ── CUENTAS BANCARIAS ─────────────────────────────────────────────────────────
  const bancoBanamex = await prisma.bankAccount.create({
    data: {
      name: 'Banamex Operaciones', bank: 'Citibanamex',
      accountNumber: '0123456789', clabe: '002180012345678901',
      currency: 'MXN', balance: 485320.50, companyId: company.id,
    },
  }).catch(() => prisma.bankAccount.findFirst({ where: { accountNumber: '0123456789', companyId: company.id } }));

  const bancoHSBC = await prisma.bankAccount.create({
    data: {
      name: 'HSBC USD', bank: 'HSBC México',
      accountNumber: '9876543210', clabe: '021180098765432101',
      currency: 'USD', balance: 12500.00, companyId: company.id,
    },
  }).catch(() => prisma.bankAccount.findFirst({ where: { accountNumber: '9876543210', companyId: company.id } }));

  // Transacciones bancarias
  if (bancoBanamex) {
    const txCount = await prisma.bankTransaction.count({ where: { bankAccountId: bancoBanamex.id } });
    if (txCount === 0) {
      await prisma.bankTransaction.createMany({
        data: [
          { bankAccountId: bancoBanamex.id, date: new Date('2024-03-01'), concept: 'Cobro factura CLI-001', reference: 'TRF-001', type: 'DEPOSITO', amount: 116000, balance: 116000, currency: 'MXN' },
          { bankAccountId: bancoBanamex.id, date: new Date('2024-03-05'), concept: 'Pago nómina febrero', reference: 'NOM-FEB-24', type: 'RETIRO', amount: 85000, balance: 31000, currency: 'MXN' },
          { bankAccountId: bancoBanamex.id, date: new Date('2024-03-10'), concept: 'Pago proveedor PRV-001', reference: 'CXP-001', type: 'RETIRO', amount: 58000, balance: -27000, currency: 'MXN' },
          { bankAccountId: bancoBanamex.id, date: new Date('2024-03-15'), concept: 'Cobro factura CLI-003', reference: 'TRF-002', type: 'DEPOSITO', amount: 290000, balance: 263000, currency: 'MXN' },
          { bankAccountId: bancoBanamex.id, date: new Date('2024-03-20'), concept: 'Arrendamiento oficinas', reference: 'RENTA-MAR', type: 'CARGO', amount: 35000, balance: 228000, currency: 'MXN' },
        ],
      });
    }
  }

  // ── PRODUCTOS / INVENTARIO ────────────────────────────────────────────────────
  const cat1 = await prisma.category.upsert({
    where: { id: 'cat-software' },
    update: {},
    create: { id: 'cat-software', name: 'Software', description: 'Licencias y software' },
  }).catch(() => prisma.category.create({ data: { name: 'Software', description: 'Licencias y software' } }));

  const cat2 = await prisma.category.create({ data: { name: 'Hardware', description: 'Equipos de cómputo' } }).catch(() => prisma.category.findFirst({ where: { name: 'Hardware' } }));
  const cat3 = await prisma.category.create({ data: { name: 'Servicios', description: 'Servicios profesionales' } }).catch(() => prisma.category.findFirst({ where: { name: 'Servicios' } }));

  const prod1 = await prisma.product.upsert({
    where: { sku_companyId: { sku: 'SW-001', companyId: company.id } },
    update: {},
    create: { sku: 'SW-001', name: 'Licencia JnConta Pro Anual', cost: 2500, price: 4800, stock: 100, unit: 'LIC', taxRate: 0.16, categoryId: cat1?.id, companyId: company.id },
  });

  const prod2 = await prisma.product.upsert({
    where: { sku_companyId: { sku: 'HW-001', companyId: company.id } },
    update: {},
    create: { sku: 'HW-001', name: 'Laptop Dell Latitude 5540', cost: 18500, price: 24900, stock: 15, minStock: 3, unit: 'PZA', taxRate: 0.16, categoryId: cat2?.id, companyId: company.id },
  });

  const prod3 = await prisma.product.upsert({
    where: { sku_companyId: { sku: 'SV-001', companyId: company.id } },
    update: {},
    create: { sku: 'SV-001', name: 'Consultoría Contable (hora)', cost: 500, price: 1200, stock: 999, unit: 'HR', taxRate: 0.16, categoryId: cat3?.id, companyId: company.id },
  });

  // ── FACTURAS EMITIDAS ─────────────────────────────────────────────────────────
  const inv1 = await prisma.invoice.upsert({
    where: { serie_folio_companyId: { serie: 'A', folio: 1, companyId: company.id } },
    update: {},
    create: {
      serie: 'A', folio: 1, uuid: 'UUID-CFDI-001-2024',
      date: new Date('2024-03-05'), clientId: cliente1.id,
      subtotal: 100000, tax: 16000, total: 116000,
      currency: 'MXN', status: 'COBRADA', companyId: company.id,
      items: {
        create: [
          { description: 'Licencias JnConta Pro x20', quantity: 20, unitPrice: 4800, subtotal: 96000, tax: 15360, total: 111360, unit: 'LIC', productId: prod1.id, taxRate: 0.16 },
          { description: 'Consultoría implementación', quantity: 4, unitPrice: 1000, subtotal: 4000, tax: 640, total: 4640, unit: 'HR', taxRate: 0.16 },
        ],
      },
    },
  });

  const inv2 = await prisma.invoice.upsert({
    where: { serie_folio_companyId: { serie: 'A', folio: 2, companyId: company.id } },
    update: {},
    create: {
      serie: 'A', folio: 2,
      date: new Date('2024-03-12'), clientId: cliente2.id,
      subtotal: 4000, tax: 640, total: 4640,
      currency: 'USD', exchangeRate: 17.15, status: 'VIGENTE', companyId: company.id,
      items: {
        create: [
          { description: 'JnConta Pro License x5 (USD)', quantity: 5, unitPrice: 800, subtotal: 4000, tax: 0, total: 4000, unit: 'LIC', productId: prod1.id, taxRate: 0 },
        ],
      },
    },
  });

  const inv3 = await prisma.invoice.upsert({
    where: { serie_folio_companyId: { serie: 'A', folio: 3, companyId: company.id } },
    update: {},
    create: {
      serie: 'A', folio: 3,
      date: new Date('2024-03-18'), clientId: cliente3.id,
      subtotal: 250000, tax: 40000, total: 290000,
      currency: 'MXN', status: 'VIGENTE', companyId: company.id,
      items: {
        create: [
          { description: 'Laptops Dell Latitude 5540 x10', quantity: 10, unitPrice: 24900, subtotal: 249000, tax: 39840, total: 288840, unit: 'PZA', productId: prod2.id, taxRate: 0.16 },
        ],
      },
    },
  });

  // ── FACTURAS RECIBIDAS ────────────────────────────────────────────────────────
  await prisma.bill.upsert({
    where: { id: 'bill-001' },
    update: {},
    create: {
      id: 'bill-001', folio: 'F-20240310', uuid: 'PRV-UUID-001',
      date: new Date('2024-03-10'), supplierId: prov1.id,
      subtotal: 50000, tax: 8000, total: 58000,
      currency: 'MXN', dueDate: new Date('2024-04-09'), status: 'PAGADA', companyId: company.id,
    },
  });

  await prisma.bill.upsert({
    where: { id: 'bill-002' },
    update: {},
    create: {
      id: 'bill-002', folio: 'INV-5521',
      date: new Date('2024-03-15'), supplierId: prov2.id,
      subtotal: 3000, tax: 0, total: 3000,
      currency: 'USD', exchangeRate: 17.15, dueDate: new Date('2024-04-29'), status: 'PENDIENTE', companyId: company.id,
    },
  });

  // ── EMPLEADOS ─────────────────────────────────────────────────────────────────
  const empData = [
    { code: 'EMP-001', firstName: 'Ana', lastName: 'García López', rfc: 'GALA850102MDF', curp: 'GALA850102MDFRCN01', nss: '12345678901', jobPost: 'Contadora General', dailySalary: 850, hiredDate: new Date('2020-01-15'), contractType: '01', regimeType: '02', periodicidad: '04' },
    { code: 'EMP-002', firstName: 'Roberto', lastName: 'Martínez Soto', rfc: 'MASR780303HDF', curp: 'MASR780303HDFRTB07', nss: '98765432101', jobPost: 'Auxiliar Contable', dailySalary: 490, hiredDate: new Date('2022-06-01'), contractType: '01', regimeType: '02', periodicidad: '04' },
    { code: 'EMP-003', firstName: 'Fernanda', lastName: 'Torres Ríos', rfc: 'TORF920815MDF', curp: 'TORF920815MDFRRN02', nss: '45678901234', jobPost: 'Gerente de Ventas', dailySalary: 1200, hiredDate: new Date('2019-03-10'), contractType: '01', regimeType: '02', periodicidad: '04' },
    { code: 'EMP-004', firstName: 'Luis', lastName: 'Hernández Mora', rfc: 'HEML881120HDF', curp: 'HEML881120HDFMRS04', nss: '78901234567', jobPost: 'Desarrollador Senior', dailySalary: 1500, hiredDate: new Date('2021-09-01'), contractType: '01', regimeType: '02', periodicidad: '04' },
    { code: 'EMP-005', firstName: 'Rosa', lastName: 'Mendoza Fuentes', rfc: 'MEFR951205MNL', curp: 'MEFR951205MNLNRS05', nss: '23456789012', jobPost: 'Recepcionista', dailySalary: 350, hiredDate: new Date('2023-01-16'), contractType: '01', regimeType: '02', periodicidad: '04' },
  ];

  for (const emp of empData) {
    const sdi = parseFloat((emp.dailySalary * 1.0493).toFixed(2));
    await prisma.employee.upsert({
      where: { code_companyId: { code: emp.code, companyId: company.id } },
      update: {},
      create: { ...emp, sdi, companyId: company.id },
    });
  }

  // ── PERÍODO DE NÓMINA (MARZO 2024) ────────────────────────────────────────────
  const existingPeriod = await prisma.payrollPeriod.findFirst({
    where: { startDate: new Date('2024-03-01'), companyId: company.id },
  });
  if (!existingPeriod) {
    await prisma.payrollPeriod.create({
      data: {
        name: 'Nómina Marzo 2024',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-03-31'),
        paymentDate: new Date('2024-03-29'),
        type: 'O',
        status: 'PAGADA',
        companyId: company.id,
      },
    });
  }

  // ── ACTIVOS FIJOS ─────────────────────────────────────────────────────────────
  const assets = [
    { assetNumber: 'AF-001', name: 'Servidores Dell PowerEdge', category: 'EQUIPO_COMPUTO', acquisitionDate: new Date('2022-01-15'), acquisitionCost: 185000, usefulLife: 4, depreciationRate: 0.30, residualValue: 5000 },
    { assetNumber: 'AF-002', name: 'Camioneta Nissan NP300', category: 'VEHICULO', acquisitionDate: new Date('2021-06-01'), acquisitionCost: 320000, usefulLife: 4, depreciationRate: 0.25, residualValue: 50000 },
    { assetNumber: 'AF-003', name: 'Mobiliario Oficina', category: 'MOBILIARIO', acquisitionDate: new Date('2020-03-10'), acquisitionCost: 55000, usefulLife: 10, depreciationRate: 0.10, residualValue: 5000 },
    { assetNumber: 'AF-004', name: 'Laptops Dell Latitude (5 pzas)', category: 'EQUIPO_COMPUTO', acquisitionDate: new Date('2023-08-20'), acquisitionCost: 92500, usefulLife: 4, depreciationRate: 0.30, residualValue: 0 },
  ];

  for (const asset of assets) {
    const yearsElapsed = (new Date().getFullYear() - asset.acquisitionDate.getFullYear());
    const annualDep = (asset.acquisitionCost - asset.residualValue) / asset.usefulLife;
    const accumulatedDep = Math.min(annualDep * yearsElapsed, asset.acquisitionCost - asset.residualValue);
    const netValue = asset.acquisitionCost - accumulatedDep;

    await prisma.fixedAsset.upsert({
      where: { assetNumber_companyId: { assetNumber: asset.assetNumber, companyId: company.id } },
      update: {},
      create: {
        ...asset,
        accumulatedDep: parseFloat(accumulatedDep.toFixed(2)),
        netValue: parseFloat(netValue.toFixed(2)),
        currency: 'MXN',
        companyId: company.id,
      },
    });
  }

  // ── PÓLIZAS CONTABLES (EJEMPLO) ──────────────────────────────────────────────
  const accountBancos = accountMap['1.1.02'];
  const accountClientes = accountMap['1.1.03'];
  const accountVentas = accountMap['4.1'];
  const accountIVATrasladado = accountMap['2.1.02'];

  if (accountBancos && accountVentas) {
    const existingJournal = await prisma.journal.findFirst({ where: { number: '1', type: 'INGRESO', companyId: company.id } });
    if (!existingJournal) {
      await prisma.journal.create({
        data: {
          number: '1', type: 'INGRESO', date: new Date('2024-03-05'),
          concept: 'Cobro factura A-001 Comercializadora Azteca', reference: 'A-001',
          status: 'APLICADA', currency: 'MXN', companyId: company.id,
          entries: {
            create: [
              { accountId: accountBancos.id, description: 'Depósito BBVA', debit: 116000, credit: 0 },
              { accountId: accountClientes.id, description: 'Clientes', debit: 0, credit: 100000 },
              { accountId: accountIVATrasladado.id, description: 'IVA Trasladado', debit: 0, credit: 16000 },
            ],
          },
        },
      });
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
