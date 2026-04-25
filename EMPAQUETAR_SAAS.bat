@echo off
echo ==============================================
echo   EMPAQUETANDO JNCONTA PARA SERVIDOR SAAS
echo ==============================================
echo.

if exist JnConta_SaaS.zip del JnConta_SaaS.zip

echo [1/3] Creando carpeta temporal...
if exist temp_deploy rmdir /s /q temp_deploy
mkdir temp_deploy

echo [2/3] Copiando archivos esenciales (ignorando datos locales y node_modules)...
robocopy . temp_deploy /E /XD node_modules .git .next dist .gemini "SAT 2" certbot\www certbot\conf coverage /XF *.zip *.log .DS_Store > nul

echo [3/3] Comprimiendo el paquete list para VPS...
powershell -Command "Compress-Archive -Path 'temp_deploy\*' -DestinationPath 'JnConta_SaaS.zip' -Force"

echo Limpiando basura...
rmdir /s /q temp_deploy

echo.
echo ==============================================
echo   COMPLETADO! 
echo   Archivo list: JnConta_SaaS.zip
echo.
echo   Simplemente sube este archivo a tu servidor
echo   VPS (Hostinger), descomprimelo y ejecuta:
echo   ./deploy.sh tudominio.com tu@correo.com
echo ==============================================
pause
