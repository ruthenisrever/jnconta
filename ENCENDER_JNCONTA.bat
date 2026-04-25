@echo off
set "ROOT=%~dp0"
echo ==========================================
echo    INICIANDO JNCONTA ULTRA ELITE v5.1
echo ==========================================
echo.

:: 0. Matar procesos node anteriores para liberar puertos
echo [0/4] Liberando puertos...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
echo Puertos liberados.
echo.

:: 1. Verificar y arrancar Docker Desktop
echo [1/4] Verificando Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo Docker no esta corriendo. Iniciando Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo Esperando que Docker inicie (30 segundos^^^)...
    timeout /t 30 /nobreak >nul
    echo.
)

:: 2. Levantar la base de datos PostgreSQL
echo [2/4] Levantando base de datos PostgreSQL...
cd /d "%ROOT%"
docker compose up -d jnconta-db
echo Esperando que PostgreSQL este listo...
timeout /t 6 /nobreak >nul
echo.

:: 3. Generar cliente Prisma y sincronizar esquema
echo [3/4] Sincronizando esquema de base de datos...
cd /d "%ROOT%api"
call npx prisma generate >nul 2>&1
call npx prisma db push >nul 2>&1
echo Esquema sincronizado.
echo.

:: 4. Levantar Backend en 3005 y Frontend en 3010
echo [4/4] Levantando servidores...
start cmd /k "title JnConta Backend && cd /d "%ROOT%api" && npm run start:dev"
timeout /t 5 /nobreak >nul
start cmd /k "title JnConta Frontend && cd /d "%ROOT%frontend" && npm run dev"

echo.
echo ==========================================
echo    JNCONTA INICIANDO...
echo.
echo    Base de datos: localhost:5433
echo    Backend API:   http://localhost:3005/api
echo    Interfaz:      http://localhost:3010
echo ==========================================
echo.
echo Abriendo JNConta en tu navegador (espera 15 seg^^^)...
timeout /t 15 /nobreak >nul
start http://localhost:3010
exit
