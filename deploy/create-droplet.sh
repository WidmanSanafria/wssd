#!/bin/bash
# ============================================================
# WSSD — Crea el Droplet en DigitalOcean y despliega
# Uso: DO_TOKEN=<token> ./deploy/create-droplet.sh
# ============================================================
set -euo pipefail

DO_TOKEN="${DO_TOKEN:-}"
if [[ -z "$DO_TOKEN" ]]; then
  echo "❌  Define: export DO_TOKEN=tu_token_aqui"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Autenticar doctl ──
echo "🔑 Autenticando con DigitalOcean…"
doctl auth init --access-token "$DO_TOKEN"

# ── Subir SSH key si no existe ──
SSH_PUB_KEY="$HOME/.ssh/id_ed25519.pub"
KEY_NAME="wssd-deploy-key"
echo "🔑 Registrando SSH key…"
EXISTING=$(doctl compute ssh-key list --format Name --no-header 2>/dev/null | grep "^${KEY_NAME}$" || true)
if [[ -z "$EXISTING" ]]; then
  doctl compute ssh-key import "$KEY_NAME" --public-key-file "$SSH_PUB_KEY"
  echo "   ✅ SSH key creada: $KEY_NAME"
else
  echo "   ℹ️  SSH key ya existe: $KEY_NAME"
fi
KEY_ID=$(doctl compute ssh-key list --format Name,ID --no-header | grep "^$KEY_NAME" | awk '{print $2}')

# ── Crear Droplet ──
DROPLET_NAME="wssd-app"
echo "🖥️  Creando Droplet $DROPLET_NAME (s-2vcpu-4gb, NYC3)…"
echo "   Esto puede tardar ~60 segundos…"

# Elimina droplet anterior si existe
OLD_ID=$(doctl compute droplet list --format Name,ID --no-header | grep "^$DROPLET_NAME" | awk '{print $2}' || true)
if [[ -n "$OLD_ID" ]]; then
  echo "   🗑  Eliminando droplet anterior ($OLD_ID)…"
  doctl compute droplet delete "$OLD_ID" --force
  sleep 10
fi

doctl compute droplet create "$DROPLET_NAME" \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region nyc3 \
  --ssh-keys "$KEY_ID" \
  --tag-names wssd \
  --wait \
  --no-header

# ── Obtener IP ──
DROPLET_IP=$(doctl compute droplet get "$DROPLET_NAME" --format PublicIPv4 --no-header)
echo ""
echo "🌐 Droplet creado → IP: $DROPLET_IP"
echo "⏳ Esperando que el servidor arranque (30s)…"
sleep 30

# ── Deploy ──
bash "$REPO_ROOT/deploy/deploy.sh" "$DROPLET_IP"
