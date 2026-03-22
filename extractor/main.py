"""
WSSD Extractor Microservice — Puerto 8001
Llamado por Spring Boot para extracción y descarga de videos.
"""
import re
import json
import asyncio
import os
import tempfile
import httpx
from typing import Optional
from urllib.parse import urlencode
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import yt_dlp


class VideoRequest(BaseModel):
    url: str


app = FastAPI(title="WSSD Extractor MS", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://spring:8080", "http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UA_DESKTOP = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

COOKIES_FILE = "/cookies/cookies.txt"

_TAHOE = (
    "https://www.facebook.com/video/tahoe/async/%s/"
    "?chain=true&isvideo=true&payloadtype=primary"
)


# ──────────────────────────────────────────────────────────
# URL helpers
# ──────────────────────────────────────────────────────────
def _platform(url: str) -> str:
    if re.search(r"(facebook\.com|fb\.com|fb\.watch)", url):
        return "facebook"
    if re.search(r"instagram\.com", url):
        return "instagram"
    if re.search(r"(tiktok\.com|vm\.tiktok\.com)", url):
        return "tiktok"
    if re.search(r"(youtube\.com/watch|youtu\.be/|youtube\.com/shorts/|youtube\.com/live/)", url):
        return "youtube"
    return "unknown"


def _extract_fb_id(url: str) -> Optional[str]:
    for pat in [
        r"facebook\.com/(?:video/video\.php|watch/?\?(?:.*&)?v=)(\d+)",
        r"facebook\.com/reel/(\d+)",
        r"facebook\.com/[^/]+/videos/(?:[^/]+/)?(\d+)",
        r"facebook\.com/(?:story|permalink)\.php\?.*story_fbid=(\d+)",
        r"/(\d{10,})",
    ]:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


def _extract_ig_shortcode(url: str) -> Optional[str]:
    m = re.search(r"instagram\.com/(?:p|tv|reel)/([A-Za-z0-9_-]+)", url)
    return m.group(1) if m else None


def _unescape(s: str) -> str:
    return (
        s.replace("\\u0025", "%").replace("\\/", "/")
         .replace("\\\\", "\\").replace("\\u0026", "&")
    )


# ──────────────────────────────────────────────────────────
# Cookie helpers
# ──────────────────────────────────────────────────────────
def _cookies_file_exists() -> bool:
    return os.path.isfile(COOKIES_FILE) and os.path.getsize(COOKIES_FILE) > 0


def _chrome_cookies(domain_fragment: str) -> dict:
    if _cookies_file_exists():
        try:
            import http.cookiejar
            jar = http.cookiejar.MozillaCookieJar(COOKIES_FILE)
            jar.load(ignore_discard=True, ignore_expires=True)
            return {c.name: c.value for c in jar if domain_fragment in (c.domain or "")}
        except Exception:
            pass
    return {}


def _fb_logged_in(c: dict) -> bool:
    return bool(c.get("xs") and c.get("c_user"))


def _ig_logged_in(c: dict) -> bool:
    return bool(c.get("sessionid"))


# ──────────────────────────────────────────────────────────
# yt-dlp extractor
# ──────────────────────────────────────────────────────────
def _ytdlp_extract(url: str, cookies: bool = True, youtube: bool = False) -> dict:
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "http_headers": {"User-Agent": UA_DESKTOP},
    }
    if cookies and _cookies_file_exists():
        opts["cookiefile"] = COOKIES_FILE
    if youtube:
        # Use node.js JS runtime + EJS challenge solver from GitHub
        opts["extractor_args"] = {"youtube": {"player_client": ["web"]}}
        opts["js_runtimes"] = {"node": {"path": "/usr/bin/node"}}
        opts["remote_components"] = ["ejs:github"]
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)


# ──────────────────────────────────────────────────────────
# Facebook: Tahoe fallback
# ──────────────────────────────────────────────────────────
async def _fb_tahoe(url: str, cookies: dict) -> dict:
    vid = _extract_fb_id(url)
    if not vid:
        raise ValueError("No Facebook video ID")

    cx = httpx.Cookies(cookies)
    hdrs = {"User-Agent": UA_DESKTOP, "Accept-Language": "es-ES,es;q=0.9"}

    async with httpx.AsyncClient(follow_redirects=True, timeout=20,
                                  headers=hdrs, cookies=cx) as c:
        page = (await c.get(f"https://www.facebook.com/video/video.php?v={vid}")).text

    dtsg = re.search(r'"DTSGInitialData"\s*,\s*\[\]\s*,\s*{\s*"token"\s*:\s*"([^"]+)"', page)
    pkg  = re.search(r'pkg_cohort["\s]*:\s*["\'](.+?)["\']', page)
    rev  = re.search(r'client_revision["\s]*:\s*(\d+)', page)

    if not dtsg:
        raise ValueError("No fb_dtsg — login required")

    post = urlencode({
        "__a": 1,
        "__pc": pkg.group(1) if pkg else "PHASED:DEFAULT",
        "__rev": rev.group(1) if rev else "3944515",
        "fb_dtsg": dtsg.group(1),
    })
    async with httpx.AsyncClient(
        follow_redirects=True, timeout=20, cookies=cx,
        headers={**hdrs, "Content-Type": "application/x-www-form-urlencoded"},
    ) as c:
        raw = re.sub(
            r"^for\s*\(\s*;\s*;\s*\)\s*;", "",
            (await c.post(_TAHOE % vid, content=post)).text.strip(),
        )

    data = json.loads(raw)
    instances = data.get("jsmods", {}).get("instances", []) or []

    formats, title, thumbnail, duration, uploader = [], "Facebook Video", None, None, None
    for inst in instances:
        try:
            node = inst[1][0]
        except (IndexError, TypeError):
            continue
        if not isinstance(node, dict):
            continue
        title    = node.get("video_title") or node.get("name") or title
        uploader = uploader or node.get("author") or node.get("owner_name")
        if not duration and node.get("video_duration"):
            duration = int(node["video_duration"])
        thumbnail = thumbnail or node.get("thumbnail_src")
        for key, qid, h in [
            ("browser_native_hd_url", "hd", 720),
            ("browser_native_sd_url", "sd", 480),
            ("video_url",             "sd", 480),
        ]:
            v = node.get(key)
            if v and v not in [f["url"] for f in formats]:
                formats.append({
                    "format_id": qid, "url": _unescape(v),
                    "ext": "mp4", "vcodec": "h264", "acodec": "aac",
                    "height": h, "filesize": None,
                })

    if not formats:
        raise ValueError("No video data in tahoe response")
    return {"title": title, "thumbnail": thumbnail, "duration": duration,
            "uploader": uploader, "formats": formats}


# ──────────────────────────────────────────────────────────
# Instagram: GraphQL
# ──────────────────────────────────────────────────────────
async def _ig_graphql(url: str, cookies: dict) -> dict:
    shortcode = _extract_ig_shortcode(url)
    if not shortcode:
        raise ValueError("No Instagram shortcode")

    csrf = cookies.get("csrftoken", "")
    hdrs = {
        "User-Agent": UA_DESKTOP,
        "X-IG-App-ID": "936619743392459",
        "X-ASBD-ID": "198387",
        "X-IG-WWW-Claim": "0",
        "X-CSRFToken": csrf,
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://www.instagram.com",
        "Referer": url,
        "Accept": "*/*",
    }
    variables = {
        "shortcode": shortcode,
        "child_comment_count": 3,
        "fetch_comment_count": 40,
        "parent_comment_count": 24,
        "has_threaded_comments": True,
    }
    params = {
        "doc_id": "8845758582119845",
        "variables": json.dumps(variables, separators=(",", ":")),
    }

    async with httpx.AsyncClient(
        follow_redirects=True, timeout=20,
        headers=hdrs, cookies=httpx.Cookies(cookies),
    ) as c:
        r = await c.get("https://www.instagram.com/graphql/query/", params=params)

    data  = r.json() if r.text else {}
    media = (data.get("data") or {}).get("xdt_shortcode_media") or {}
    if not media:
        raise ValueError("No media data from Instagram GraphQL")

    owner         = (media.get("owner") or {})
    caption_edges = ((media.get("edge_media_to_caption") or {}).get("edges") or [])
    caption       = caption_edges[0]["node"]["text"] if caption_edges else ""

    def _best_thumb(node: dict) -> Optional[str]:
        for path in [("thumbnail_resources", -1, "src"), ("display_resources", -1, "src")]:
            try:
                t = node
                for k in path:
                    t = t[k]
                return t
            except (KeyError, IndexError, TypeError):
                pass
        return node.get("display_url")

    sidecar_edges = ((media.get("edge_sidecar_to_children") or {}).get("edges") or [])
    if sidecar_edges:
        carousel_items = []
        for idx, edge in enumerate(sidecar_edges, 1):
            node = edge.get("node") or {}
            thumb = _best_thumb(node)
            if node.get("video_url"):
                dims = node.get("dimensions") or {}
                carousel_items.append({"index": idx, "kind": "video", "url": node["video_url"],
                                        "thumb": thumb, "height": dims.get("height"), "width": dims.get("width"),
                                        "duration": node.get("video_duration")})
            else:
                display = node.get("display_url") or thumb
                carousel_items.append({"index": idx, "kind": "image", "url": display, "thumb": thumb,
                                        "height": (node.get("dimensions") or {}).get("height"),
                                        "width": (node.get("dimensions") or {}).get("width")})
        title = caption[:80] or f"Instagram Carousel by @{owner.get('username','')}"
        return {"title": title, "thumbnail": _best_thumb(media), "duration": None,
                "uploader": owner.get("full_name") or f"@{owner.get('username','')}",
                "formats": [], "carousel": carousel_items}

    if media.get("video_url"):
        dims = media.get("dimensions") or {}
        title = caption[:80] or f"Instagram {'Reel' if 'reel' in url else 'Video'} by @{owner.get('username','')}"
        return {"title": title, "thumbnail": _best_thumb(media), "duration": media.get("video_duration"),
                "uploader": owner.get("full_name") or f"@{owner.get('username','')}",
                "formats": [{"format_id": "hd", "url": media["video_url"], "ext": "mp4",
                              "vcodec": "h264", "acodec": "aac", "height": dims.get("height"), "filesize": None}]}

    display = media.get("display_url") or _best_thumb(media)
    if not display:
        raise ValueError("No video_url or display_url in media")
    title = caption[:80] or f"Instagram Photo by @{owner.get('username','')}"
    dims = media.get("dimensions") or {}
    return {"title": title, "thumbnail": display, "duration": None,
            "uploader": owner.get("full_name") or f"@{owner.get('username','')}",
            "formats": [], "carousel": [{"index": 1, "kind": "image", "url": display, "thumb": display,
                                          "height": dims.get("height"), "width": dims.get("width")}]}


# ──────────────────────────────────────────────────────────
# Carousel helper
# ──────────────────────────────────────────────────────────
def _build_carousel_from_entries(info: dict) -> list:
    raw_entries = info.get("entries") or []
    if not isinstance(raw_entries, list):
        try:
            raw_entries = list(raw_entries)
        except Exception:
            return []

    items = []
    for idx, entry in enumerate(raw_entries, 1):
        if not entry or not isinstance(entry, dict):
            continue
        thumb = entry.get("thumbnail")
        ext   = (entry.get("ext") or "").lower()
        vc    = entry.get("vcodec")
        is_video = (ext in ("mp4", "webm", "mov", "m4v") or (vc is not None and vc not in ("none", "")))
        url = entry.get("url") or ""
        sub_fmts = entry.get("formats") or []
        if sub_fmts:
            combined = [f for f in sub_fmts if f.get("url")
                        and f.get("vcodec") not in (None, "none", "")
                        and f.get("acodec") not in (None, "none", "")]
            if combined:
                best = max(combined, key=lambda x: x.get("height") or 0)
                url = best.get("url") or url
                is_video = True
            elif not url:
                v_only = [f for f in sub_fmts if f.get("url") and f.get("vcodec") not in (None, "none", "")]
                if v_only:
                    best = max(v_only, key=lambda x: x.get("height") or 0)
                    url = best.get("url") or url
                    is_video = True
        if not url:
            continue
        items.append({"index": idx, "kind": "video" if is_video else "image",
                       "url": url, "thumb": thumb, "height": entry.get("height"), "width": entry.get("width")})
    return items


# ──────────────────────────────────────────────────────────
# Format builder — FIXED: proper video-only detection
# ──────────────────────────────────────────────────────────
def _quality_label(fmt: dict) -> str:
    h   = fmt.get("height") or 0
    fid = (fmt.get("format_id") or "").lower()
    if h >= 1080: return f"{h}p Full HD"
    if h >= 720:  return f"{h}p HD"
    if h > 0:     return f"{h}p"
    if "hd" in fid: return "HD"
    return "SD"


def _is_combined(f: dict) -> bool:
    vc = f.get("vcodec"); ac = f.get("acodec")
    return (bool(vc) and vc not in ("none",)) and (bool(ac) and ac not in ("none",))


def _is_video_only(f: dict) -> bool:
    vc = f.get("vcodec"); ac = f.get("acodec")
    return vc not in (None, "none", "") and ac in ("none",)


def _is_audio_only(f: dict) -> bool:
    vc = f.get("vcodec"); ac = f.get("acodec")
    return vc in (None, "none") and ac not in (None, "none", "")


def _normalize_raw_formats(info: dict) -> list:
    raw = info.get("formats") or []
    if raw:
        return raw
    entries = info.get("entries")
    if entries:
        first = entries[0] if isinstance(entries, list) else next(iter(entries), {})
        return _normalize_raw_formats(first)
    url = info.get("url") or info.get("webpage_url")
    if url and not url.startswith("https://www.facebook.com") \
             and not url.startswith("https://www.instagram.com"):
        return [{"format_id": info.get("format_id", "best"), "url": url,
                 "ext": info.get("ext", "mp4"), "vcodec": info.get("vcodec"),
                 "acodec": info.get("acodec"), "height": info.get("height"),
                 "filesize": info.get("filesize") or info.get("filesize_approx"),
                 "filesize_approx": info.get("filesize_approx")}]
    return []


def build_formats(info: dict) -> list:
    raw = _normalize_raw_formats(info)
    result: list = []
    seen: set = set()

    # ── 1. Combined formats (have both video + audio) ──────────────
    combined = [f for f in raw if _is_combined(f) and f.get("ext") in ("mp4", "webm", "m4v")]
    combined.sort(key=lambda f: (-(f.get("height") or 0),
                                  0 if "hd" in (f.get("format_id") or "").lower() else 1))
    for fmt in combined:
        label = _quality_label(fmt)
        if label in seen:
            continue
        seen.add(label)
        result.append({
            "format_id": fmt.get("format_id", ""),
            "label": f"MP4 {label}",
            "quality": label,
            "ext": "mp4",
            "type": "video",
            "url": fmt.get("url"),
            "filesize": fmt.get("filesize") or fmt.get("filesize_approx"),
            "needs_merge": False,
        })

    # ── 2. Video-only + audio-only → merge (ALL heights, not just >= 720) ──
    audio_only = sorted([f for f in raw if _is_audio_only(f)],
                         key=lambda x: x.get("abr") or x.get("tbr") or 0, reverse=True)
    video_only = sorted(
        [f for f in raw if _is_video_only(f) and f.get("ext") in ("mp4", "m4v", "webm")],
        key=lambda x: x.get("height") or 0, reverse=True
    )
    for fmt in video_only[:2]:
        h = fmt.get("height") or 0
        label = f"{h}p HD" if h >= 720 else (f"{h}p" if h else "HD DASH")
        full_label = f"MP4 {label} (alta calidad)"
        if any(r["label"] == full_label for r in result):
            continue
        result.append({
            "format_id": fmt.get("format_id", ""),
            "label": full_label,
            "quality": label,
            "ext": "mp4",
            "type": "video",
            "url": fmt.get("url"),
            "audio_url": audio_only[0].get("url") if audio_only else None,
            "filesize": fmt.get("filesize") or fmt.get("filesize_approx"),
            "needs_merge": True,
        })

    # ── 3. Audio-only format ──────────────────────────────────────
    if audio_only:
        a = audio_only[0]
        result.append({
            "format_id": a.get("format_id", ""),
            "label": "MP3 Audio",
            "quality": "audio",
            "ext": "mp3",
            "type": "audio",
            "url": a.get("url"),
            "filesize": a.get("filesize") or a.get("filesize_approx"),
            "needs_merge": False,
        })

    # ── 4. Last resort — but detect video-only and mark needs_merge properly ──
    if not result:
        candidates = sorted(
            [f for f in raw if f.get("url")],
            key=lambda x: (x.get("height") or 0, x.get("tbr") or 0), reverse=True
        )
        for fmt in candidates[:2]:
            h = fmt.get("height") or 0
            fid = (fmt.get("format_id") or "").lower()
            lbl = f"{h}p" if h else ("HD" if "hd" in fid else "SD")
            is_vid_only = _is_video_only(fmt)
            has_audio_fmt = len(audio_only) > 0
            # If video-only, only add if we have audio to pair with it
            if is_vid_only and has_audio_fmt:
                result.append({
                    "format_id": fmt.get("format_id", ""),
                    "label": f"MP4 {lbl}",
                    "quality": lbl,
                    "ext": fmt.get("ext", "mp4"),
                    "type": "video",
                    "url": fmt.get("url"),
                    "audio_url": audio_only[0].get("url"),
                    "filesize": fmt.get("filesize") or fmt.get("filesize_approx"),
                    "needs_merge": True,
                })
            elif not is_vid_only:
                result.append({
                    "format_id": fmt.get("format_id", ""),
                    "label": f"MP4 {lbl}",
                    "quality": lbl,
                    "ext": fmt.get("ext", "mp4"),
                    "type": "video",
                    "url": fmt.get("url"),
                    "filesize": fmt.get("filesize") or fmt.get("filesize_approx"),
                    "needs_merge": False,
                })
    return result


def _fmt_size(size: Optional[int]) -> str:
    if not size:
        return "Desconocido"
    if size < 1_048_576:
        return f"{size / 1024:.1f} KB"
    return f"{size / 1_048_576:.1f} MB"


# ──────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/info")
async def get_info(request: VideoRequest):
    url = request.url.strip()
    if not url:
        raise HTTPException(400, "URL requerida")

    platform = _platform(url)
    if platform == "unknown":
        raise HTTPException(400, "URL no soportada. Usa enlaces de Facebook, Instagram, TikTok o YouTube.")

    loop = asyncio.get_event_loop()
    info = None
    errors: list = []

    if platform == "facebook":
        fb_cookies = _chrome_cookies("facebook")
        logged_in  = _fb_logged_in(fb_cookies)
        try:
            info = await loop.run_in_executor(None, _ytdlp_extract, url, True)
        except Exception as e:
            errors.append(f"yt-dlp+cookies: {e}")
        if info is None:
            try:
                info = await loop.run_in_executor(None, _ytdlp_extract, url, False)
            except Exception as e:
                errors.append(f"yt-dlp: {e}")
        if info is None:
            try:
                info = await _fb_tahoe(url, fb_cookies)
            except Exception as e:
                errors.append(f"tahoe: {e}")
        if info is None:
            is_post = "/share/p/" in url or "/posts/" in url
            if is_post:
                raise HTTPException(400, "Este post de Facebook es privado o requiere iniciar sesión para verlo.")
            raise HTTPException(400, "No se pudo extraer el video de Facebook. Verifica que el video sea público.")

    elif platform == "instagram":
        ig_cookies = _chrome_cookies("instagram")
        logged_in  = _ig_logged_in(ig_cookies)
        try:
            info = await loop.run_in_executor(None, _ytdlp_extract, url, True)
        except Exception as e:
            errors.append(f"yt-dlp+cookies: {e}")
        if info is None:
            try:
                info = await loop.run_in_executor(None, _ytdlp_extract, url, False)
            except Exception as e:
                errors.append(f"yt-dlp: {e}")
        if info is not None and info.get("entries") is not None:
            car = _build_carousel_from_entries(info)
            if car:
                info["carousel"] = car
                info["formats"]  = []
                info.pop("entries", None)
        need_graphql = (info is None or (not info.get("formats") and not info.get("carousel")))
        if need_graphql and logged_in:
            try:
                info = await _ig_graphql(url, ig_cookies)
            except Exception as e:
                errors.append(f"ig-graphql: {e}")
        if info is None:
            raise HTTPException(400, "No se pudo extraer el contenido de Instagram.")

    elif platform == "tiktok":
        try:
            info = await loop.run_in_executor(None, _ytdlp_extract, url, True)
        except Exception as e:
            errors.append(f"yt-dlp+cookies: {e}")
        if info is None:
            try:
                info = await loop.run_in_executor(None, _ytdlp_extract, url, False)
            except Exception as e:
                errors.append(f"yt-dlp: {e}")
        if info is None:
            raise HTTPException(400, "No se pudo extraer el video de TikTok.")

    elif platform == "youtube":
        try:
            info = await loop.run_in_executor(None, lambda: _ytdlp_extract(url, True, youtube=True))
        except Exception as e:
            errors.append(f"yt-dlp: {e}")
        if info is None:
            raise HTTPException(400, "No se pudo extraer el video de YouTube.")

    formats  = build_formats(info)
    carousel = info.get("carousel") or []

    if not formats and not carousel:
        raise HTTPException(404, "No se encontraron formatos descargables.")

    for fmt in formats:
        fmt["filesizeStr"] = _fmt_size(fmt.get("filesize"))

    # TikTok: always use yt-dlp download (most reliable, handles DRM/watermark)
    if platform == "tiktok":
        best_video_marked = False
        for fmt in formats:
            fmt["needs_ytdlp"] = True
            fmt["page_url"]    = url
            if fmt.get("type") == "video" and not best_video_marked:
                if "(alta calidad)" not in fmt.get("label", ""):
                    fmt["label"] = fmt["label"] + " (alta calidad)"
                best_video_marked = True

    # Instagram: CDN URLs expire → always re-download via yt-dlp
    elif platform == "instagram":
        for fmt in formats:
            if fmt.get("type") == "video" and not fmt.get("needs_merge"):
                fmt["needs_ytdlp"] = True
                fmt["page_url"]    = url

    # Facebook: CDN URLs can expire and DASH streams need merging → use yt-dlp for all videos
    elif platform == "facebook":
        for fmt in formats:
            if fmt.get("type") == "video":
                fmt["needs_ytdlp"] = True
                fmt["page_url"]    = url
                fmt["needs_merge"] = False  # yt-dlp handles the merge itself

    # YouTube: always use yt-dlp (handles age-restricted, best quality selection)
    elif platform == "youtube":
        for fmt in formats:
            if fmt.get("type") == "video":
                fmt["needs_ytdlp"] = True
                fmt["page_url"]    = url
                fmt["needs_merge"] = False

    return {
        "title":     info.get("title", "Video"),
        "thumbnail": info.get("thumbnail"),
        "duration":  info.get("duration"),
        "uploader":  info.get("uploader"),
        "formats":   formats,
        "carousel":  carousel,
        "platform":  platform,
    }


@app.get("/proxy")
async def proxy_download(url: str, filename: str = "video.mp4"):
    """Proxy for direct CDN downloads (images, carousel items). Streams without loading into memory."""
    fb_c  = _chrome_cookies("facebook")
    ig_c  = _chrome_cookies("instagram")
    all_c = {**fb_c, **ig_c}
    is_ig   = "cdninstagram" in url or "instagram" in url
    referer = "https://www.instagram.com/" if is_ig else "https://www.facebook.com/"

    client = httpx.AsyncClient(
        follow_redirects=True,
        timeout=120,
        headers={"User-Agent": UA_DESKTOP, "Referer": referer},
        cookies=httpx.Cookies(all_c),
    )
    try:
        # Use streaming to avoid loading large files into memory
        req = client.build_request("GET", url)
        response = await client.send(req, stream=True)
        response.raise_for_status()

        ct = response.headers.get("content-type", "video/mp4")

        # Reject HTML error pages (expired CDN URLs)
        if "text/html" in ct or "application/xhtml" in ct:
            await response.aclose()
            await client.aclose()
            raise HTTPException(410, "URL de descarga expirada. Por favor vuelve a buscar el video.")

        if "image" in ct:
            ext = "jpg"
        elif "audio" in ct:
            ext = "mp3"
        elif "webm" in ct:
            ext = "webm"
        else:
            low_url = url.lower().split("?")[0]
            if low_url.endswith((".jpg", ".jpeg")):
                ext = "jpg"
            elif low_url.endswith(".png"):
                ext = "png"
            elif low_url.endswith(".webm"):
                ext = "webm"
            elif low_url.endswith(".mp3"):
                ext = "mp3"
            else:
                ext = "mp4"

        safe = re.sub(r"[^\w\-.]", "_", filename)[:80] + f".{ext}"
        content_length = response.headers.get("content-length")

        async def stream_content():
            try:
                async for chunk in response.aiter_bytes(65536):
                    yield chunk
            finally:
                await response.aclose()
                await client.aclose()

        headers = {"Content-Disposition": f'attachment; filename="{safe}"'}
        if content_length:
            headers["Content-Length"] = content_length

        return StreamingResponse(stream_content(), media_type=ct, headers=headers)

    except HTTPException:
        await client.aclose()
        raise
    except httpx.HTTPError as e:
        await client.aclose()
        raise HTTPException(502, f"Error al descargar: {e}")
    except Exception as e:
        await client.aclose()
        raise HTTPException(500, f"Error inesperado: {e}")


@app.get("/merge")
async def merge_download(video_url: str, audio_url: str, filename: str = "video_hd.mp4"):
    """Download video+audio streams separately then merge with ffmpeg."""
    fb_c  = _chrome_cookies("facebook")
    ig_c  = _chrome_cookies("instagram")
    all_c = {**fb_c, **ig_c}
    is_ig   = "cdninstagram" in video_url or "instagram" in video_url
    referer = "https://www.instagram.com/" if is_ig else "https://www.facebook.com/"
    headers = {"User-Agent": UA_DESKTOP, "Referer": referer, "Accept": "*/*", "Accept-Encoding": "identity"}
    tmp_dir  = tempfile.mkdtemp(prefix="wssd_")
    vid_path = os.path.join(tmp_dir, "video_stream.mp4")
    aud_path = os.path.join(tmp_dir, "audio_stream.m4a")
    out_path = os.path.join(tmp_dir, "merged.mp4")
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=180,
                                      headers=headers, cookies=httpx.Cookies(all_c)) as client:
            for dl_url, path in [(video_url, vid_path), (audio_url, aud_path)]:
                r = await client.get(dl_url)
                r.raise_for_status()
                with open(path, "wb") as f:
                    f.write(r.content)

        probe = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "quiet", "-select_streams", "v:0",
            "-show_entries", "stream=codec_name", "-of", "csv=p=0", vid_path,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        probe_out, _ = await probe.communicate()
        vcodec = probe_out.decode().strip().lower()

        TRANSCODE_CODECS = {"av1", "av01", "vp9", "hevc", "h265", "vp8"}
        needs_transcode = any(c in vcodec for c in TRANSCODE_CODECS)
        video_flags = (["-c:v", "libx264", "-preset", "fast", "-crf", "23"]
                        if needs_transcode else ["-c:v", "copy"])

        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", vid_path, "-i", aud_path,
            "-map", "0:v:0", "-map", "1:a:0", *video_flags,
            "-c:a", "aac", "-movflags", "+faststart", out_path,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        _, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=300)

        if proc.returncode != 0 and video_flags[1] == "copy":
            proc = await asyncio.create_subprocess_exec(
                "ffmpeg", "-y", "-i", vid_path, "-i", aud_path,
                "-map", "0:v:0", "-map", "1:a:0",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "aac", "-movflags", "+faststart", out_path,
                stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            _, stderr_bytes = await asyncio.wait_for(proc.communicate(), timeout=300)

        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg error: {stderr_bytes.decode()[-800:]}")

        safe = re.sub(r"[^\w\-.]", "_", filename)[:80] + ".mp4"
        file_size = os.path.getsize(out_path)

        def iter_file():
            with open(out_path, "rb") as f:
                while chunk := f.read(65536):
                    yield chunk

        def cleanup():
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)

        async def astream():
            ev = asyncio.get_event_loop()
            for chunk in iter_file():
                yield chunk
            await ev.run_in_executor(None, cleanup)

        return StreamingResponse(astream(), media_type="video/mp4",
            headers={"Content-Disposition": f'attachment; filename="{safe}"',
                     "Content-Length": str(file_size)})
    except Exception as e:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(500, f"Error al procesar el video HD: {e}")


@app.get("/ytdlp-download")
async def ytdlp_download(page_url: str, format_id: str = "best", filename: str = "video"):
    """Use yt-dlp to download+merge, then stream the result. Handles all platforms reliably."""
    tmp_dir  = tempfile.mkdtemp(prefix="wssd_dl_")
    out_path = os.path.join(tmp_dir, "output.mp4")

    # Best format selection: prefer mp4+m4a, fallback to best available
    BEST_SEL = "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio/bestvideo+bestaudio/best[ext=mp4]/best"

    platform = _platform(page_url or "")
    # For platforms that need best quality auto-selection, ignore format_id
    auto_select = platform in ("tiktok", "instagram", "youtube") or not format_id or format_id == "best"
    fmt_sel = BEST_SEL if auto_select else format_id

    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "outtmpl": out_path,
        "format": fmt_sel,
        "merge_output_format": "mp4",
        "http_headers": {"User-Agent": UA_DESKTOP},
        "postprocessors": [{
            "key": "FFmpegVideoConvertor",
            "preferedformat": "mp4",
        }],
    }
    if _cookies_file_exists():
        opts["cookiefile"] = COOKIES_FILE
    if platform == "youtube":
        opts["extractor_args"] = {"youtube": {"player_client": ["web"]}}
        opts["js_runtimes"] = {"node": {"path": "/usr/bin/node"}}
        opts["remote_components"] = ["ejs:github"]

    loop = asyncio.get_event_loop()
    try:
        def do_download():
            with yt_dlp.YoutubeDL(opts) as ydl:
                ydl.download([page_url])

        await asyncio.wait_for(loop.run_in_executor(None, do_download), timeout=600)

        # Find the downloaded file (yt-dlp may add extension)
        actual = out_path
        if not os.path.exists(actual):
            candidates = sorted(
                [os.path.join(tmp_dir, f) for f in os.listdir(tmp_dir)],
                key=os.path.getsize, reverse=True
            )
            if not candidates:
                raise RuntimeError("yt-dlp no descargó ningún archivo.")
            actual = candidates[0]

        file_size = os.path.getsize(actual)
        if file_size == 0:
            raise RuntimeError("El archivo descargado está vacío.")

        safe = re.sub(r"[^\w\-.]", "_", filename)[:80] + ".mp4"

        def iter_file():
            with open(actual, "rb") as f:
                while chunk := f.read(65536):
                    yield chunk

        def cleanup():
            import shutil
            shutil.rmtree(tmp_dir, ignore_errors=True)

        async def astream():
            ev = asyncio.get_event_loop()
            for chunk in iter_file():
                yield chunk
            await ev.run_in_executor(None, cleanup)

        return StreamingResponse(astream(), media_type="video/mp4",
            headers={"Content-Disposition": f'attachment; filename="{safe}"',
                     "Content-Length": str(file_size)})
    except Exception as e:
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise HTTPException(500, f"Error al descargar: {e}")
