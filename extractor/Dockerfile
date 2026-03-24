FROM python:3.12-slim

RUN apt-get update && apt-get install -y ffmpeg curl nodejs npm git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir --upgrade yt-dlp

# Install bgutil yt-dlp POT provider plugin
RUN pip install --no-cache-dir yt-dlp-get-pot && \
    PLUGIN_DIR=$(python -c "import yt_dlp; import os; print(os.path.join(os.path.dirname(yt_dlp.__file__), 'extractor'))") && \
    TMP=$(mktemp -d) && \
    git clone --depth 1 https://github.com/brainicism/bgutil-ytdlp-pot-provider "$TMP/bgutil" && \
    cp "$TMP/bgutil/plugin/"*.py "$PLUGIN_DIR/" && \
    # Remove old conflicting v0.3.0 plugins if present
    rm -f "$PLUGIN_DIR/getpot.py" "$PLUGIN_DIR/getpot_client.py" && \
    rm -rf "$TMP"

COPY main.py .
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=10s CMD curl -f http://localhost:8001/health || exit 1
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
