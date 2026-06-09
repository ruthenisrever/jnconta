#!/bin/bash
# Script de Autoinstalación para VPS Hostinger (Ubuntu 22.04/24.04)
# JnConta ERP
# NOTA: Ejecutar este script como usuario 'root'

echo "=========================================="
echo "Iniciando instalación de Servidor JnConta"
echo "=========================================="

# 1. Actualizar sistema e instalar dependencias básicas
echo "[1/6] Actualizando paquetes del sistema..."
apt-get update -y && apt-get upgrade -y
apt-get install -y curl git unzip nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# 2. Instalar Node.js v20 y PM2
echo "[2/6] Instalando Node.js (v20) y PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2 npm@latest

# 3. Configurar Base de Datos PostgreSQL
echo "[3/6] Configurando PostgreSQL..."
# Crear usuario y base de datos localmente en el VPS
sudo -u postgres psql -c "CREATE USER jnconta_admin WITH PASSWORD 'JnConta_Secr3t_2026!';"
sudo -u postgres psql -c "CREATE DATABASE jnconta_db OWNER jnconta_admin;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE jnconta_db TO jnconta_admin;"

# 4. Desplegar aplicación
# Asumimos que el código se ha subido a /var/www/jnconta
echo "[4/6] Configurando aplicación en /var/www/jnconta..."
mkdir -p /var/www/jnconta
# (El usuario deberá extraer el zip aquí antes de correr el script final o durante)
# Moviéndonos al backend
cd /var/www/jnconta/api || { echo "La carpeta /var/www/jnconta/api no existe. Sube los archivos primero."; exit 1; }

echo "Instalando dependencias de Backend..."
npm install
# Configurar DB
echo "DATABASE_URL=\"postgresql://jnconta_admin:JnConta_Secr3t_2026!@localhost:5432/jnconta_db?schema=public\"" > .env
npx prisma migrate deploy
npm run build
pm2 start dist/main.js --name "jnconta-api"

# Moviéndonos al frontend
cd /var/www/jnconta/frontend || exit 1
echo "Instalando dependencias de Frontend..."
npm install
# Compilando frontend
npm run build
pm2 start npm --name "jnconta-frontend" -- start

# Guardar estado de PM2
pm2 save
pm2 startup

# 5. Configurar Nginx Reverse Proxy
echo "[5/6] Configurando Nginx..."
cat > /etc/nginx/sites-available/jnconta << 'EOF'
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com; # CAMBIA ESTO AL CORRER EL SCRIPT MÁS ADELANTE

    location /api/ {
        proxy_pass http://127.0.0.1:3005/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/jnconta /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "=========================================="
echo "¡Instalación base completada!"
echo "Siguientes pasos:"
echo "1. Reemplaza 'tu-dominio.com' en /etc/nginx/sites-available/jnconta"
echo "2. Reinicia nginx: systemctl restart nginx"
echo "3. Ejecuta Certbot: certbot --nginx -d tu-dominio.com"
echo "=========================================="
