// WSSD Cookie Sync — Background Service Worker
// Auto-syncs cookies when user visits supported platforms and is logged in

const WATCHED_DOMAINS = {
  'instagram.com': { platform: 'instagram', authCookie: 'sessionid' },
  'facebook.com':  { platform: 'facebook',  authCookie: 'c_user'    },
  'tiktok.com':    { platform: 'tiktok',    authCookie: 'sessionid' },
  'youtube.com':   { platform: 'youtube',   authCookie: 'LOGIN_INFO'},
};

// Listen for tab updates (user navigates to a supported site)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;

  const { autoSync } = await chrome.storage.local.get('autoSync');
  if (!autoSync) return;

  for (const [domain, cfg] of Object.entries(WATCHED_DOMAINS)) {
    if (tab.url.includes(domain)) {
      // Small delay to let cookies settle after page load
      setTimeout(() => autoSyncPlatform(cfg.platform, cfg.authCookie), 2000);
      break;
    }
  }
});

// Auto-sync a single platform
async function autoSyncPlatform(platform, authCookieName) {
  const { serverUrl, apiKey } = await chrome.storage.local.get(['serverUrl', 'apiKey']);
  if (!serverUrl || !apiKey) return;

  try {
    const cookies = await getAllCookiesForPlatform(platform);
    const hasAuth = cookies.some(c => c.name === authCookieName);
    if (!hasAuth) return; // Not logged in — don't sync empty session

    await sendCookiesToServer(serverUrl, apiKey, cookies);

    const now = Date.now();
    await chrome.storage.local.set({ lastSync: now });
    console.log(`[WSSD] Auto-synced ${platform} cookies at ${new Date(now).toLocaleString()}`);
  } catch (e) {
    console.warn(`[WSSD] Auto-sync failed for ${platform}:`, e.message);
  }
}

// Gather all cookies for a platform
async function getAllCookiesForPlatform(platformId) {
  const domainMap = {
    instagram: ['.instagram.com', 'instagram.com'],
    facebook:  ['.facebook.com',  'facebook.com'],
    tiktok:    ['.tiktok.com',    'tiktok.com'],
    youtube:   ['.youtube.com',   'youtube.com', '.google.com'],
  };

  const domains = domainMap[platformId] || [];
  let all = [];
  for (const domain of domains) {
    const ck = await chrome.cookies.getAll({ domain });
    all = all.concat(ck);
  }

  // Deduplicate by name
  const seen = new Set();
  return all.filter(c => {
    if (seen.has(c.name)) return false;
    seen.add(c.name);
    return true;
  });
}

// Send cookies to WSSD server
async function sendCookiesToServer(serverUrl, apiKey, cookies) {
  const payload = {
    cookies: cookies.map(c => ({
      domain: c.domain.startsWith('.') ? c.domain : '.' + c.domain,
      name:   c.name,
      value:  c.value,
      path:   c.path || '/',
      secure: c.secure,
      expiry: c.expirationDate ? Math.floor(c.expirationDate) : 0,
    })),
  };

  const url = serverUrl.replace(/\/$/, '') + '/sync-cookies';
  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server responded ${res.status}: ${text}`);
  }
  return res.json();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AUTO_SYNC_CHANGED') {
    console.log(`[WSSD] Auto-sync ${msg.value ? 'enabled' : 'disabled'}`);
  }
});
