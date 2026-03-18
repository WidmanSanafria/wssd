#!/bin/bash
# Exporta cookies de Safari (macOS) al contenedor del extractor.
# Prerrequisito: brew install yt-dlp
set -e
cd "$(dirname "$0")/.."
mkdir -p cookies
echo "📥 Exportando cookies de Safari para Instagram..."
yt-dlp --cookies-from-browser safari \
       --cookies cookies/cookies.txt \
       --skip-download "https://www.instagram.com" 2>/dev/null || true
echo "📥 Exportando cookies de Safari para TikTok..."
yt-dlp --cookies-from-browser safari \
       --cookies cookies/cookies.txt \
       --skip-download "https://www.tiktok.com" 2>/dev/null || true
echo "📥 Exportando cookies de Safari para Facebook..."
yt-dlp --cookies-from-browser safari \
       --cookies cookies/cookies.txt \
       --skip-download "https://www.facebook.com" 2>/dev/null || true
echo "✅ cookies/cookies.txt actualizado."
echo "🔄 Reiniciando extractor..."
docker compose restart extractor
echo "🎉 Listo. Los 3 sitios deberían funcionar ahora."
