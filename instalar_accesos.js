const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n==============================================');
console.log('  INSTALADOR SEGURO DE ACCESOS JNCONTA');
console.log('==============================================\n');

try {
  // 1. Copiar imagen al Frontend
  console.log('[1/2] Copiando el logotipo oficial...');
  const src = "C:\\Users\\ruthe\\.gemini\\antigravity\\brain\\26a30319-9fa8-43fd-9ef3-5aa3cc3420ed\\jnconta_logo_v3_1775272827650.png";
  const destDir = path.join(__dirname, "frontend", "public");
  
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, path.join(destDir, "logo.png"));

  // 2. Ejecutar PowerShell mediante un proceso oculto
  console.log('[2/2] Ensamblando icono de acceso directo en el Escritorio...');
  const batPath = path.join(__dirname, 'ENCENDER_JNCONTA.bat');
  const targetScript = `
    $wshell = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath("Desktop")
    $shortcut = $wshell.CreateShortcut("$desktop\\JnConta ERP.lnk")
    $shortcut.TargetPath = "${batPath}"
    $shortcut.WorkingDirectory = "${__dirname}"
    $shortcut.IconLocation = "shell32.dll, 85"
    $shortcut.Description = "JnConta Ultra Accounting"
    $shortcut.Save()
  `;

  // PowerShell accepts base64 execution to avoid ANY escaping issues
  const encodedCommand = Buffer.from(targetScript, 'utf16le').toString('base64');
  execSync(`powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encodedCommand}`);

  console.log('\n==============================================');
  console.log(' ¡EXITO! Instalacion finalizada perfectamente.');
  console.log(' Ya puedes cerrar esta ventana negra.');
  console.log('==============================================\n');

} catch (error) {
  console.error('\nHubo un error:', error.message);
}
