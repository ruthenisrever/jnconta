const { PrismaClient } = require('./api/node_modules/@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function main() {
    const prisma = new PrismaClient();
    const searchDir = 'c:/Users/ruthe/.gemini/antigravity/scratch/jnconta';
    
    console.log('--- BUSCANDO NUEVOS CERTIFICADOS (CSD) ---');
    
    function findFiles(dir, extensions) {
        let results = [];
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
                    results = results.concat(findFiles(fullPath, extensions));
                }
            } else {
                if (extensions.some(ext => file.toLowerCase().endsWith(ext))) {
                    results.push(fullPath);
                }
            }
        }
        return results;
    }

    const certFiles = findFiles(searchDir, ['.cer']);
    const keyFiles = findFiles(searchDir, ['.key']);

    console.log(`Encontrados ${certFiles.length} certificados y ${keyFiles.length} llaves.`);

    // Buscar el certificado más reciente o que no sea FIEL
    for (const cerPath of certFiles) {
        try {
            const cerBuf = fs.readFileSync(cerPath);
            const x509 = new crypto.X509Certificate(cerBuf);
            const serial = BigInt('0x' + x509.serialNumber.replace(/\s/g, '')).toString();
            const subject = x509.subject;
            
            console.log(`\nRevisando: ${path.basename(cerPath)}`);
            console.log(`Serial: ${serial}`);
            console.log(`Subject: ${subject}`);

            // Si el nombre del archivo contiene FIEL y hay otro, preferimos el otro
            if (cerPath.toLowerCase().includes('fiel')) {
                console.log('⚠️  Este parece ser una FIEL, saltando...');
                continue;
            }

            // Intentar encontrar la llave par
            const keyPath = keyFiles.find(k => path.basename(k, '.key').includes(serial.slice(-8)) || path.basename(k, '.key').includes('NALJ890809C15'));
            
            if (keyPath) {
                console.log(`✅ ¡Pareja encontrada! Llave: ${path.basename(keyPath)}`);
                
                // Subir a la base de datos
                const company = await prisma.company.findFirst();
                if (company) {
                    // Desactivar anteriores
                    await prisma.digitalCertificate.updateMany({
                        where: { companyId: company.id, isActive: true },
                        data: { isActive: false }
                    });

                    // Crear nuevo
                    await prisma.digitalCertificate.create({
                        data: {
                            companyId: company.id,
                            serialNumber: serial,
                            cerFile: cerBuf.toString('base64'),
                            keyFile: fs.readFileSync(keyPath).toString('base64'),
                            password: 'Ingeniero66',
                            expiryDate: new Date(x509.validTo),
                            isActive: true
                        }
                    });
                    console.log(`🚀 Certificado ${serial} ACTIVADO para la empresa.`);
                }
            }
        } catch (e) {
            console.error(`Error procesando ${cerPath}: ${e.message}`);
        }
    }

    await prisma.$disconnect();
}

main();
