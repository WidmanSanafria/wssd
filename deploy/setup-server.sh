#!/bin/bash
# ============================================================
# WSSD — Setup de servidor limpio en Ubuntu 22.04
# Se ejecuta UNA sola vez en el Droplet nuevo
# ============================================================
set -euo pipefail

echo "🔧 Actualizando sistema..."
apt-get update -qq && apt-get upgrade -y -qq

echo "🐳 Instalando Docker..."
apt-get install -y -qq ca-certificates curl gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

echo "🔒 Configurando firewall (UFW)..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "📁 Creando directorio de la app..."
mkdir -p /opt/wssd
cd /opt/wssd

echo "✅ Servidor listo."
docker --version
docker compose version
