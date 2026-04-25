const fs = require('fs');
const crypto = require('crypto');
const { PrismaClient } = require('./api/node_modules/@prisma/client');

const cerPath = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\SAT 2\\00001000000719220566.cer';
const keyPath = 'c:\\Users\\ruthe\\.gemini\\antigravity\\scratch\\jnconta\\SAT 2\\Claveprivada_FIEL_NALJ890809C15_20251001_121444.key';
const password = 'Ingeniero66';

function parseCertificate(cerBase64) {
    let x509;
    if (cerBase64.trim().startsWith('-----BEGIN CERTIFICATE-----')) {
        x509 = new crypto.X509Certificate(cerBase64);
    } else {
        const derBuffer = Buffer.from(cerBase64.replace(/\s/g, ''), 'base64');
        x509 = new crypto.X509Certificate(derBuffer);
    }
    const hexSerial = x509.serialNumber.replace(/\s/g, '');
    const decimalSerial = BigInt(`0x${hexSerial}`).toString();
    const expiryDate = new Date(x509.validTo);
    return { serialNumber: decimalSerial, expiryDate };
}

async function main() {
    const cerBuf = fs.readFileSync(cerPath);
    const keyBuf = fs.readFileSync(keyPath);

    const cerBase64 = cerBuf.toString('base64');
    const keyBase64 = keyBuf.toString('base64');

    const prisma = new PrismaClient();
    try {
        const company = await prisma.company.findFirst();
        if (!company) {
            console.error('❌ No se encontró ninguna empresa en la base de datos.');
            return;
        }

        console.log(`📝 Vinculando certificado a la empresa: ${company.name} (RFC: ${company.rfc})`);
        
        let parsed;
        try {
            parsed = parseCertificate(cerBase64);
            console.log(`✅ Certificado parseado. No. Serie: ${parsed.serialNumber}, Vence: ${parsed.expiryDate.toISOString()}`);
        } catch (e) {
            console.error('❌ Error al parsear el certificado:', e.message);
            return;
        }

        // Desactivar certificados anteriores
        await prisma.digitalCertificate.updateMany({
            where: { companyId: company.id, isActive: true },
            data: { isActive: false },
        });

        // Insertar el nuevo certificado
        await prisma.digitalCertificate.create({
            data: {
                companyId: company.id,
                cerFile: cerBase64,
                keyFile: keyBase64,
                password: password,
                serialNumber: parsed.serialNumber,
                expiryDate: parsed.expiryDate,
                isActive: true,
            },
        });

        console.log('🎉 ¡Certificado guardado e introducido directamente en la base de datos con éxito!');
        console.log('Ya puedes ver el certificado en la interfaz de configuración en la pestaña "Certificados".');

    } catch (e) {
        console.error('❌ Error fatal:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
