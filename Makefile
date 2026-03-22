.PHONY: up down logs refresh-cookies

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

# Exporta cookies de Safari (macOS) a cookies/cookies.txt y reinicia el extractor.
# Requiere yt-dlp instalado en el host: brew install yt-dlp
refresh-cookies:
	@echo "📥 Exportando cookies de Safari..."
	@mkdir -p cookies
	yt-dlp --cookies-from-browser safari --cookies cookies/cookies.txt --skip-download "https://www.instagram.com" 2>/dev/null || true
	yt-dlp --cookies-from-browser safari --cookies cookies/cookies.txt --skip-download "https://www.tiktok.com" 2>/dev/null || true
	yt-dlp --cookies-from-browser safari --cookies cookies/cookies.txt --skip-download "https://www.youtube.com" 2>/dev/null || true
	@echo "✅ Cookies actualizadas. Subiendo al servidor..."
	rsync -az --exclude='.git' --exclude='node_modules' --exclude='frontend/.angular' --exclude='backend/target' --exclude='cookies/*.txt' --exclude='cookies/*.json' -e "ssh -o StrictHostKeyChecking=no" ./ root@45.55.251.17:/opt/wssd/
	scp cookies/cookies.txt root@45.55.251.17:/var/lib/docker/volumes/wssd_cookies_data/_data/cookies.txt
	ssh root@45.55.251.17 "cd /opt/wssd && docker compose restart extractor && docker compose restart nginx"
	@echo "🎉 Listo. Instagram, TikTok y YouTube deberían funcionar ahora."
