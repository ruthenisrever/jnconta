const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const output = fs.createWriteStream(path.join(__dirname, 'jnconta_vps_deploy.zip'));
const archive = archiver('zip', {
  zlib: { level: 9 } // Mejor nivel de compresión
});

output.on('close', function() {
  console.log(`¡Archivo comprimido! Tamaño total: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
  console.log('El archivo jnconta_vps_deploy.zip está listo para subirse al VPS.');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Excluir node_modules, logs, archivos temporales
const ignorePaths = [
  'node_modules/**', 
  'api/node_modules/**', 
  'frontend/node_modules/**', 
  '.git/**',
  '.next/**',
  'dist/**',
  '*.zip',
  'api/dist/**',
  'frontend/.next/**'
];

archive.glob('**/*', {
  cwd: __dirname,
  ignore: ignorePaths
});

archive.finalize();
