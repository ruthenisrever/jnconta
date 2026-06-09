const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isrMensual2024 = [
  { lowerLimit: 0.01, upperLimit: 746.04, fixedFee: 0.00, percentage: 0.0192 },
  { lowerLimit: 746.05, upperLimit: 6332.05, fixedFee: 14.32, percentage: 0.064 },
  { lowerLimit: 6332.06, upperLimit: 11128.01, fixedFee: 371.83, percentage: 0.1088 },
  { lowerLimit: 11128.02, upperLimit: 12935.82, fixedFee: 893.63, percentage: 0.16 },
  { lowerLimit: 12935.83, upperLimit: 15487.71, fixedFee: 1182.88, percentage: 0.1792 },
  { lowerLimit: 15487.72, upperLimit: 31236.49, fixedFee: 1640.18, percentage: 0.2136 },
  { lowerLimit: 31236.50, upperLimit: 49233.00, fixedFee: 5004.12, percentage: 0.2352 },
  { lowerLimit: 49233.01, upperLimit: 93993.90, fixedFee: 9236.89, percentage: 0.30 },
  { lowerLimit: 93993.91, upperLimit: 125325.20, fixedFee: 22665.17, percentage: 0.32 },
  { lowerLimit: 125325.21, upperLimit: 375975.61, fixedFee: 32691.18, percentage: 0.34 },
  { lowerLimit: 375975.62, upperLimit: 9999999.99, fixedFee: 117912.32, percentage: 0.35 }
];

const subsidioMensual2024 = [
  // Under the new 2024 decree, Subsidio is mostly 0, or calculated dynamically as 11.82% of UMA.
  // We'll insert a simplified table. If salary <= 9081.00, subsidy is flat 390.12.
  { lowerLimit: 0.01, upperLimit: 9081.00, amount: 390.12 },
  { lowerLimit: 9081.01, upperLimit: 9999999.99, amount: 0.0 }
];

async function seed() {
  console.log('Seeding ISR and Subsidio Tables...');
  await prisma.isrTable.deleteMany({});
  await prisma.subsidioTable.deleteMany({});

  for (const row of isrMensual2024) {
    await prisma.isrTable.create({
      data: {
        periodicity: 'MENSUAL',
        year: 2024,
        lowerLimit: row.lowerLimit,
        upperLimit: row.upperLimit,
        fixedFee: row.fixedFee,
        percentage: row.percentage
      }
    });
  }

  for (const row of subsidioMensual2024) {
    await prisma.subsidioTable.create({
      data: {
        periodicity: 'MENSUAL',
        year: 2024,
        lowerLimit: row.lowerLimit,
        upperLimit: row.upperLimit,
        amount: row.amount
      }
    });
  }

  console.log('Seed completed successfully.');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
