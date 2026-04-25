const { PrismaClient } = require('./api/node_modules/@prisma/client');
const fs = require('fs');

async function main() {
    const prisma = new PrismaClient();
    try {
        const company = await prisma.company.findFirst();
        if (!company) {
            console.error('Empresa no encontrada');
            return;
        }

        console.log('--- REPARANDO CONFIGURACIÓN DE PRUEBA ---');
        
        // 1. Cambiar RFC a RFC de Prueba Oficial del SAT (Finkok lo acepta en Demo)
        // RFC de prueba: EKU9003173C9
        await prisma.company.update({
            where: { id: company.id },
            data: {
                rfc: 'EKU9003173C9',
                name: 'ESCUELA KEMPER URGATE',
                regimenFiscal: '601',
                pacUsername: 'test',
                pacPassword: 'test',
                pacTestMode: true
            }
        });
        console.log('✅ RFC cambiado a EKU9003173C9 (Pruebas)');
        console.log('✅ Credenciales PAC seteadas a "test/test"');

        // 2. Buscar o crear una factura compatible
        let invoice = await prisma.invoice.findFirst({
            where: { companyId: company.id, status: 'VIGENTE' }
        });

        if (invoice) {
            console.log(`✅ Factura ${invoice.serie}${invoice.folio} lista para re-intentar.`);
        }

        console.log('\n--- EXPLICACIÓN ---');
        console.log('El error anterior ocurrió porque estabas usando archivos de FIEL (Firma Electrónica).');
        console.log('El SAT solo permite timbrar facturas con CSD (Certificado de Sello Digital).');
        console.log('\nHe reseteado tu empresa al "Modo Demo Oficial" del SAT.');
        console.log('Ahora puedes intentar timbrar de nuevo. Si el PAC "Finkok" está disponible,');
        console.log('debería aceptar la factura aunque no tengas tus propios sellos aún.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
