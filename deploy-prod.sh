#!/bin/bash

# Script de Despliegue JnConta - Producción
echo "🚀 Iniciando despliegue de JnConta en Producción..."

# 1. Verificar .env
if [ ! -f .env ]; then
    echo "⚠️  No se encontró el archivo .env. Creando uno a partir del ejemplo..."
    cp .env.production.example .env
    echo "❌ Acción requerida: Edita el archivo .env con tu dominio y contraseñas reales antes de continuar."
    exit 1
fi

# 2. Construir y levantar contenedores
echo "📦 Construyendo y levantando contenedores con Docker Compose..."
docker-compose -f docker-compose.prod.yml up -d --build

echo "✅ Servicios levantados correctamente."
echo ""
echo "--- PASOS FINALES PARA EL DOMINIO ---"
echo "1. Asegúrate de que el puerto 80 y 443 estén abiertos en tu firewall (sudo ufw allow 80,443)."
echo "2. Para activar HTTPS (SSL), corre este comando una vez que el dominio apunte a esta IP:"
echo "   docker-compose -f docker-compose.prod.yml run --rm certbot certonly --webroot --webroot-path /var/www/certbot -d tu-dominio.com"
echo "---"
