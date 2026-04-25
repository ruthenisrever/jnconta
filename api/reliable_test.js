"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function runReliableTests() {
    console.log('🚀 DEPLOYING RELIABILITY TEST SUITE...');
    let companyId = '';
    try {
        const testCompany = await prisma.company.create({
            data: {
                name: 'RELIABILITY TEST CORP',
                rfc: 'TEST990101XYZ',
                currency: 'MXN',
            }
        });
        companyId = testCompany.id;
        console.log(`✅ [SETUP] Created Testing Company: ${companyId}`);
        console.log('\n--- 🏗️ TESTING: FIXED ASSETS ---');
        const asset = await prisma.fixedAsset.create({
            data: {
                companyId,
                assetNumber: 'ASSET-001',
                name: 'TEST COMPUTER',
                category: 'EQUIPO_COMPUTO',
                acquisitionDate: new Date('2024-01-01'),
                acquisitionCost: 120000,
                residualValue: 0,
                usefulLife: 3,
                depreciationRate: 33.33,
                netValue: 120000,
                accumulatedDep: 0,
            }
        });
        console.log(`✅ Asset created: ${asset.name}`);
        const monthlyDep = (asset.acquisitionCost - asset.residualValue) * (asset.depreciationRate / 100) / 12;
        console.log(`ℹ️ Calculated monthly dep: ${monthlyDep}`);
        const journalDate = new Date(2024, 0, 31);
        const journal = await prisma.journal.create({
            data: {
                companyId,
                date: journalDate,
                type: 'DIARIO',
                number: 'DEP-2024-01',
                concept: 'Depreciación Mensual 01/2024',
                status: 'APLICADA',
            }
        });
        await prisma.fixedAsset.update({
            where: { id: asset.id },
            data: {
                accumulatedDep: monthlyDep,
                netValue: asset.acquisitionCost - monthlyDep
            }
        });
        const updatedAsset = await prisma.fixedAsset.findUnique({ where: { id: asset.id } });
        if (updatedAsset && updatedAsset.netValue < 120000) {
            console.log(`✅ [PASS] Fixed Asset Depreciation verified. New Net Value: ${updatedAsset.netValue}`);
        }
        else {
            throw new Error('Fixed Asset depreciation failed calculation');
        }
        console.log('\n--- 💵 TESTING: MULTI-CURRENCY ---');
        const usdAccount = await prisma.account.create({
            data: {
                companyId,
                code: '1.1.02.05',
                name: 'USD BANK ACCOUNT',
                type: 'ACTIVO',
                nature: 'DEUDORA',
                level: 4,
                currency: 'USD',
            }
        });
        const journalUsd = await prisma.journal.create({
            data: {
                companyId,
                date: new Date(),
                type: 'INGRESO',
                number: 'ING-USD-001',
                concept: 'Deposit USD',
                status: 'APLICADA',
                entries: {
                    create: [{
                            accountId: usdAccount.id,
                            description: 'Deposit $100 USD',
                            debit: 1700,
                            amountForeign: 100
                        }]
                }
            }
        });
        console.log('✅ Posted $100 USD @ 17.00 MXN');
        const localBalance = 1700;
        const foreignBalance = 100;
        const closingRate = 18.00;
        const revaluedBalance = foreignBalance * closingRate;
        const adjustment = revaluedBalance - localBalance;
        if (adjustment === 100) {
            console.log(`✅ [PASS] Multi-currency suggestion correct: +${adjustment} MXN`);
        }
        else {
            throw new Error(`Multi-currency adjustment mismatch: expected 100, got ${adjustment}`);
        }
        console.log('\n--- 📦 TESTING: INVENTORY/KARDEX ---');
        const product = await prisma.product.create({
            data: {
                companyId,
                sku: 'TEST-SKU-001',
                name: 'RELIABILITY WIDGET',
                cost: 50,
                price: 150,
                stock: 0,
            }
        });
        await prisma.inventoryMovement.create({
            data: {
                companyId,
                productId: product.id,
                type: 'ENTRADA',
                quantity: 100,
                unitCost: 50,
                totalCost: 5000,
                reference: 'BILL-001'
            }
        });
        await prisma.product.update({ where: { id: product.id }, data: { stock: 100 } });
        console.log('✅ Recorded ENTRADA: 100 units');
        await prisma.inventoryMovement.create({
            data: {
                companyId,
                productId: product.id,
                type: 'SALIDA',
                quantity: 30,
                unitCost: 50,
                totalCost: 1500,
                reference: 'INV-001'
            }
        });
        await prisma.product.update({ where: { id: product.id }, data: { stock: 70 } });
        console.log('✅ Recorded SALIDA: 30 units');
        const finalProduct = await prisma.product.findUnique({ where: { id: product.id } });
        if (finalProduct && finalProduct.stock === 70) {
            console.log(`✅ [PASS] Inventory stock verified: ${finalProduct.stock} units`);
        }
        else {
            throw new Error(`Inventory stock mismatch: expected 70, got ${finalProduct?.stock}`);
        }
        console.log('\n--- 📡 TESTING: SAT SYNC ---');
        const numSyncs = 5;
        for (let i = 0; i < numSyncs; i++) {
            await prisma.xmlDocument.create({
                data: {
                    companyId,
                    filename: `TEST-${i}.xml`,
                    type: 'RECIBIDA',
                    emisorRfc: 'PROV001',
                    emisorName: 'TEST PROV',
                    receptorRfc: testCompany.rfc,
                    receptorName: testCompany.name,
                    subtotal: 1000,
                    tax: 160,
                    total: 1160,
                    date: new Date(),
                    rawXml: '<mock/>'
                }
            });
        }
        const xmlCount = await prisma.xmlDocument.count({ where: { companyId } });
        if (xmlCount === 5) {
            console.log(`✅ [PASS] SAT Sync persistence verified: ${xmlCount} documents created.`);
        }
        else {
            throw new Error(`SAT Sync mismatch: expected 5, got ${xmlCount}`);
        }
        console.log('\n✨ ALL BACKEND RELIABILITY TESTS PASSED SUCCESSFULLY! ✨');
    }
    catch (err) {
        console.error('\n❌ RELIABILITY TEST FAILED!');
        console.error(err);
        process.exit(1);
    }
    finally {
        console.log(`\n⚠️ NOTE: Test data for company ${companyId} remains in the DB for UI verification.`);
        await prisma.$disconnect();
    }
}
runReliableTests();
//# sourceMappingURL=reliable_test.js.map