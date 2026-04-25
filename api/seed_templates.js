"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function seedTemplates() {
    const companies = await prisma.company.findMany();
    if (companies.length === 0)
        return;
    const companyId = companies[0].id;
    const t1 = await prisma.journalTemplate.create({
        data: {
            name: 'Gasto General (Simplificado)',
            description: 'Ideal para facturas de gasto corriente con IVA 16%',
            type: 'EGRESO',
            companyId,
            entries: {
                create: [
                    { position: 1, accountType: 'FIXED', accountId: '6.0.01.01', action: 'DEBIT', amountSource: 'SUBTOTAL', description: 'Gasto corriente' },
                    { position: 2, accountType: 'FIXED', accountId: '1.1.04.01', action: 'DEBIT', amountSource: 'TAX', description: 'IVA Acreditable' },
                    { position: 3, accountType: 'DYNAMIC', accountCodeSource: 'PROVEEDOR', action: 'CREDIT', amountSource: 'TOTAL', description: 'Pago a proveedor' }
                ]
            }
        }
    });
    const t2 = await prisma.journalTemplate.create({
        data: {
            name: 'Venta de Servicios',
            description: 'Asiento para ingresos de prestación de servicios',
            type: 'INGRESO',
            companyId,
            entries: {
                create: [
                    { position: 1, accountType: 'DYNAMIC', accountCodeSource: 'CLIENTE', action: 'DEBIT', amountSource: 'TOTAL', description: 'Cobro a cliente' },
                    { position: 2, accountType: 'FIXED', accountId: '4.0.01.01', action: 'CREDIT', amountSource: 'SUBTOTAL', description: 'Venta neta' },
                    { position: 3, accountType: 'FIXED', accountId: '2.1.02.01', action: 'CREDIT', amountSource: 'TAX', description: 'IVA Trasladado' }
                ]
            }
        }
    });
    console.log(`✅ Seeded ${t1.name} and ${t2.name}`);
}
seedTemplates().finally(() => prisma.$disconnect());
//# sourceMappingURL=seed_templates.js.map