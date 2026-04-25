@echo off
chcp 65001 >nul
echo ==============================================
echo   INSTALADOR DE ACCESOS Y LOGOTIPOS JNCONTA
echo ==============================================
echo.

:: 1. Copiar el logotipo de la IA a la carpeta publica de Next.js
echo [1/2] Integrando logotipo de alta resolucion a la Interfaz grafica...
if not exist "C:\Users\ruthe\.gemini\antigravity\scratch\jnconta\frontend\public" mkdir "C:\Users\ruthe\.gemini\antigravity\scratch\jnconta\frontend\public"
copy "C:\Users\ruthe\.gemini\antigravity\brain\26a30319-9fa8-43fd-9ef3-5aa3cc3420ed\jnconta_logo_v3_1775272827650.png" "C:\Users\ruthe\.gemini\antigravity\scratch\jnconta\frontend\public\logo.png" /Y >nul

:: 2. Crear atajo interactivo en el escritorio de Windows con PowerShell
echo [2/2] Creando icono de Acceso Directo magico en tu Escritorio de Windows...
powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $shortcut = $wshell.CreateShortcut('%USERPROFILE%\Desktop\JnConta ERP.lnk'); $shortcut.TargetPath = 'C:\Users\ruthe\.gemini\antigravity\scratch\jnconta\ENCENDER_JNCONTA.bat'; $shortcut.WorkingDirectory = 'C:\Users\ruthe\.gemini\antigravity\scratch\jnconta'; $shortcut.IconLocation = 'shell32.dll, 85'; $shortcut.WindowStyle = 1; $shortcut.Description = 'Software Contable JnConta'; $shortcut.Save()"

echo.
echo ==============================================
echo   ¡INSTALACION FINALIZADA CON EXITO!
echo ==============================================
echo Ahora ve a ver tu escritorio, tendras un icono llamado "JnConta ERP" esperandote.
echo.
pause
