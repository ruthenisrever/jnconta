const { PrismaClient } = require('./api/node_modules/@prisma/client');
const crypto = require('crypto');
const fs = require('fs');

async function main() {
    const prisma = new PrismaClient();
    
    // Rutas verificadas de los sellos CSD (NO FIEL)
    const cerPath = 'c:/Users/ruthe/Downloads/SAT/00001000000510941449.cer';
    const keyPath = 'c:/Users/ruthe/Downloads/SAT/CSD_RUTHENI_NALJ890809C15_20220118_115550.key';
    const password = 'Ingeniero66';

    console.log('--- ACTIVANDO ENTORNO DE PRODUCCIÓN REAL ---');

    try {
        const cerBuf = fs.readFileSync(cerPath);
        const x509 = new crypto.X509Certificate(cerBuf);
        const serial = BigInt('0x' + x509.serialNumber.replace(/\s/g, '')).toString();
        
        console.log(`Certificado detectado: ${serial}`);
        console.log(`Vencimiento: ${x509.validTo}`);

        const company = await prisma.company.findFirst({
            where: { rfc: 'NALJ890809C15' }
        });

        if (!company) {
            console.error('Error: Empresa con RFC NALJ890809C15 no encontrada.');
            return;
        }

        // 1. Desactivar certificados viejos
        await prisma.digitalCertificate.updateMany({
            where: { companyId: company.id },
            data: { isActive: false }
        });

        // 2. Crear/Activar Certificado Real
        await prisma.digitalCertificate.create({
            data: {
                companyId: company.id,
                serialNumber: serial,
                cerFile: cerBuf.toString('base64'),
                keyFile: fs.readFileSync(keyPath).toString('base64'),
                password: password,
                expiryDate: new Date(x509.validTo),
                isActive: true
            }
        });

        // 3. Configurar PAC en PRODUCCIÓN REAL
        await prisma.company.update({
            where: { id: company.id },
            data: {
                pacUsername: 'rutheni.qm@gmail.com',
                pacPassword: password, // Asumiendo que usó la misma pwd
                pacTestMode: false,
                pacUrl: 'https://facturacion.finkok.com/servicios/soap/stamp.wsdl'
            }
        });

        console.log('✅ Certificados CSD cargados exitosamente.');
        console.log('✅ PAC configurado en MODO PRODUCCIÓN (facturacion.finkok.com).');
        console.log('✅ Usuario PAC: rutheni.qm@gmail.com');

    } catch (e) {
        console.error('Fallo en la activación:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
