#!/bin/bash
# ============================================================
# JnConta ERP — Script de Despliegue con SSL Automático
# Uso: ./deploy.sh tudominio.com correo@tudominio.com
# ============================================================

set -e

DOMAIN=${1:-"TUDOMINIO.COM"}
EMAIL=${2:-"admin@${DOMAIN}"}
ENV_FILE=".env.production"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file ${ENV_FILE}"

# ---- 0. Verificar prerequisitos ----
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: No existe ${ENV_FILE}."
  echo "Copia .env.production.example a .env.production y completa los valores."
  exit 1
fi

echo ""
echo "================================================================"
echo "  JnConta ERP — Despliegue en Producción"
echo "  Dominio : $DOMAIN"
echo "  Email   : $EMAIL"
echo "================================================================"
echo ""

# ---- 1. Reemplazar TUDOMINIO.COM en nginx conf.d con el dominio real ----
sed -i "s/TUDOMINIO\.COM/${DOMAIN}/g" nginx/conf.d/default.conf
echo "[1/6] nginx/conf.d/default.conf actualizado para $DOMAIN"

# ---- 2. Preparar directorios para Certbot ----
mkdir -p certbot/conf certbot/www

# Nginx temporal (HTTP only) para validar el dominio ante Let's Encrypt
cat > /tmp/nginx-init.conf << NGINXEOF
events { worker_connections 1024; }
http {
  server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'OK'; add_header Content-Type text/plain; }
  }
}
NGINXEOF
echo "[2/6] Configuración temporal Nginx (HTTP only) creada."

# ---- 3. Levantar Nginx temporal para la validación ACME ----
docker run -d --name nginx-init \
  -p 80:80 \
  -v "/tmp/nginx-init.conf:/etc/nginx/nginx.conf:ro" \
  -v "$(pwd)/certbot/www:/var/www/certbot:ro" \
  nginx:alpine
echo "[3/6] Nginx temporal en puerto 80..."

sleep 3

# ---- 4. Obtener certificados SSL de Let's Encrypt ----
echo "[4/6] Solicitando certificado SSL para $DOMAIN..."
docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

docker stop nginx-init && docker rm nginx-init
echo "[4/6] Certificado SSL obtenido exitosamente."

# ---- 5. Construir y levantar todos los servicios ----
echo "[5/6] Construyendo imágenes Docker (puede tardar ~5 minutos)..."
$COMPOSE build --no-cache

echo "[5/6] Levantando todos los servicios..."
$COMPOSE up -d

# ---- 6. Verificar estado ----
sleep 10
echo ""
echo "[6/6] Estado de los contenedores:"
$COMPOSE ps

echo ""
echo "================================================================"
echo "  DESPLEGADO EXITOSAMENTE"
echo "  URL: https://${DOMAIN}"
echo "  Credenciales por defecto:"
echo "    Email : admin@jnconta.com"
echo "    Clave : ADMIN123!"
echo "  IMPORTANTE: Cambia la contraseña desde Configuración > Usuarios"
echo "================================================================"
