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
	@echo "✅ Cookies actualizadas. Reiniciando extractor..."
	docker compose restart extractor
	@echo "🎉 Listo. Instagram y TikTok deberían funcionar ahora."
