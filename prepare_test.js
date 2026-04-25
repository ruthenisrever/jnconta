const { PrismaClient } = require('./api/node_modules/@prisma/client');

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('🔄 Preparando la base de datos para la prueba de timbrado...');

        // 1. Obtener la compañía
        let company = await prisma.company.findFirst();
        if (!company) {
            console.error('❌ No se encontró la empresa.');
            return;
        }

        // 2. Actualizar el RFC y el Régimen Fiscal para que coincida con la FIEL
        company = await prisma.company.update({
            where: { id: company.id },
            data: {
                rfc: 'NALJ890809C15',
                regimenFiscal: '612' // Personas Físicas con Actividades Empresariales
            }
        });
        console.log(`✅ Empresa actualizada: RFC -> ${company.rfc}, Régimen -> 612`);

        // 3. Buscar o crear un Cliente para la prueba (Generico)
        let client = await prisma.client.findFirst({ where: { companyId: company.id } });
        if (!client) {
            client = await prisma.client.create({
                data: {
                    code: 'TEST-CLI-01',
                    name: 'PUBLICO EN GENERAL',
                    rfc: 'XAXX010101000',
                    companyId: company.id
                }
            });
        }

        // 4. Crear una Factura de Prueba VIGENTE (no timbrada)
        const newInvoice = await prisma.invoice.create({
            data: {
                serie: 'TEST',
                folio: Math.floor(Math.random() * 10000),
                date: new Date(),
                clientId: client.id,
                subtotal: 1000.00,
                tax: 160.00, // 16% IVA
                total: 1160.00,
                currency: 'MXN',
                status: 'VIGENTE',
                companyId: company.id,
                items: {
                    create: [
                        {
                            description: 'Servicios de Consultoría Tecnológica',
                            quantity: 1,
                            unitPrice: 1000.00,
                            subtotal: 1000.00,
                            tax: 160.00,
                            total: 1160.00,
                            unit: 'H87', // Pieza
                            satCode: '81111500' // Ingeniería de software
                        }
                    ]
                }
            }
        });
        console.log(`✅ Factura de prueba (Serie ${newInvoice.serie}, Folio ${newInvoice.folio}) creada exitosamente.`);
        console.log('\n🚀 INSTRUCCIONES:');
        console.log('1. Abre JnConta en el navegador y dirígete al módulo de Facturación.');
        console.log('2. Verás la nueva factura de prueba en la lista.');
        console.log('3. ¡Haz clic en el botón [Timbrar] para realizar la prueba real con Finkok y tu certificado!');

    } catch (e) {
        console.error('❌ Error guardando los datos:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
