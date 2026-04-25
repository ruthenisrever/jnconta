@echo off
title JnConta — Instalacion para Contador
color 0A
echo.
echo  ===================================================
echo     JnConta Ultra Elite — Instalacion de Prueba
echo     Sistema Contable con paridad CONTPAQi / SAT
echo  ===================================================
echo.
echo  Verificando requisitos previos...
echo.

:: Verificar Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js no esta instalado.
    echo  Descargalo en: https://nodejs.org  (version 18 o superior^)
    pause
    exit
)
echo  [OK] Node.js detectado.

:: Verificar Docker
docker -v >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Docker Desktop no esta instalado.
    echo  Descargalo en: https://www.docker.com/products/docker-desktop
    echo  Instala, reinicia tu PC y vuelve a ejecutar este archivo.
    pause
    exit
)
echo  [OK] Docker detectado.

echo.
echo  Instalando dependencias del Backend (primera vez puede tardar 2-3 min^)...
cd /d "%~dp0api"
call npm install --silent >nul 2>&1
echo  [OK] Backend listo.

echo.
echo  Instalando dependencias del Frontend (primera vez puede tardar 2-3 min^)...
cd /d "%~dp0frontend"
call npm install --silent >nul 2>&1
echo  [OK] Frontend listo.

echo.
echo  Instalacion completada. Iniciando JnConta...
echo.
cd /d "%~dp0"
call ENCENDER_JNCONTA.bat
