#!/bin/bash
# ============================================================
# WSSD — Deploy a DigitalOcean (sin dominio, con IP pública)
# Uso: ./deploy/deploy.sh <IP_DEL_DROPLET>
# ============================================================
set -euo pipefail

DROPLET_IP="${1:-}"
REMOTE_DIR="/opt/wssd"
SSH_KEY="$HOME/.ssh/id_ed25519"
SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no root@$DROPLET_IP"
SCP="scp -i $SSH_KEY -o StrictHostKeyChecking=no"

if [[ -z "$DROPLET_IP" ]]; then
  echo "❌  Uso: $0 <IP>"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ────────────────────────────────────────────
echo "📤 Copiando archivos al servidor $DROPLET_IP …"

# Setup del servidor (solo la 1ª vez)
$SCP "$REPO_ROOT/deploy/setup-server.sh" root@$DROPLET_IP:/tmp/setup-server.sh
$SSH "bash /tmp/setup-server.sh 2>&1 | tail -5"

# Archivos del proyecto
rsync -az --exclude='.git' \
  --exclude='node_modules' \
  --exclude='frontend/.angular' \
  --exclude='backend/target' \
  --exclude='cookies/*.txt' \
  --exclude='cookies/*.json' \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$REPO_ROOT/" root@$DROPLET_IP:$REMOTE_DIR/

# ────────────────────────────────────────────
echo "⚙️  Creando .env en el servidor (las credenciales vienen de tu .env local)…"

# Copia el .env local al servidor (si existe), generando claves seguras para DB/JWT
if [[ -f "$REPO_ROOT/.env" ]]; then
  # Lee las vars del .env local y sube al servidor, sobreescribiendo DB_PASSWORD y JWT_SECRET con valores seguros
  DB_PASS=$(openssl rand -hex 12)
  JWT_SEC=$(openssl rand -hex 32)
  grep -v '^#' "$REPO_ROOT/.env" | grep -v '^$' | \
    grep -v 'DB_PASSWORD\|JWT_SECRET\|APP_URL' \
    > /tmp/wssd_remote.env
  {
    echo "DB_PASSWORD=$DB_PASS"
    echo "JWT_SECRET=$JWT_SEC"
    echo "APP_URL=http://$DROPLET_IP"
  } >> /tmp/wssd_remote.env
  $SCP /tmp/wssd_remote.env root@$DROPLET_IP:$REMOTE_DIR/.env
  rm /tmp/wssd_remote.env
  echo "   ✅ .env copiado desde tu máquina local"
else
  echo "   ⚠️  No encontré .env local. Creando .env mínimo en el servidor."
  $SSH "cat > $REMOTE_DIR/.env" << ENVEOF
DB_PASSWORD=$(openssl rand -hex 12)
JWT_SECRET=$(openssl rand -hex 32)
APP_URL=http://$DROPLET_IP
STRIPE_SECRET_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
IG_EMAIL=
IG_PASSWORD=
TT_SESSIONID=
ENVEOF
fi

# ────────────────────────────────────────────
echo "🐳 Levantando servicios (build + up)…"
$SSH "cd $REMOTE_DIR && docker compose pull --ignore-buildable 2>/dev/null || true"
$SSH "cd $REMOTE_DIR && docker compose up -d --build 2>&1 | tail -20"

echo ""
echo "┌─────────────────────────────────────────────────┐"
echo "│  ✅ WSSD desplegado exitosamente                 │"
echo "│                                                   │"
echo "│  🌐 URL: http://$DROPLET_IP                      │"
echo "│                                                   │"
echo "│  Próximos pasos:                                  │"
echo "│  1. Abre http://$DROPLET_IP en tu celular        │"
echo "│  2. Configura dominio → actualiza APP_URL en .env│"
echo "│  3. Agrega credenciales IG/TT para descargas     │"
echo "└─────────────────────────────────────────────────┘"
