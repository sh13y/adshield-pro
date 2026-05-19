/* AdShield Pro — YouTube Content Script
   Runs at document_start. Multiple strategies layered for maximum coverage. */
(function () {
  'use strict';

  let ENABLED = true;
  let SKIP_VIDEO = true;
  let BLOCK_OVERLAYS = true;

  // ── Boot: load settings ──────────────────────────────────────────────────
  chrome.storage.local.get(
    ['enabled', 'whitelistedDomains', 'skipVideoAds', 'blockOverlays'],
    (cfg) => {
      ENABLED       = cfg.enabled !== false;
      SKIP_VIDEO    = cfg.skipVideoAds !== false;
      BLOCK_OVERLAYS = cfg.blockOverlays !== false;

      const host = location.hostname;
      if ((cfg.whitelistedDomains || []).includes(host)) ENABLED = false;

      if (ENABLED) boot();
    }
  );

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'toggle') { ENABLED = msg.enabled; if (ENABLED) boot(); }
    if (msg.type === 'setSetting') {
      if (msg.key === 'skipVideoAds')  SKIP_VIDEO     = msg.value;
      if (msg.key === 'blockOverlays') BLOCK_OVERLAYS  = msg.value;
    }
  });

  // ── 1. Inject CSS — instant visual suppression ───────────────────────────
  function injectCSS() {
    if (document.getElementById('adshield-css')) return;
    const s = document.createElement('style');
    s.id = 'adshield-css';
    s.textContent = `
      /* === AdShield Pro: YouTube Ad Suppression === */

      /* Video player ad overlays */
      .ytp-ad-overlay-container,
      .ytp-ad-image-overlay,
      .ytp-ad-text-overlay,
      .ytp-ad-player-overlay-instream-info,
      .ytp-ad-player-overlay-layout,
      .ytp-ad-progress,
      .ytp-ad-progress-list,
      .ytp-ad-simple-ad-badge,
      .ytp-ce-element,

      /* Page-level ad slots */
      #masthead-ad,
      ytd-banner-promo-renderer,
      ytd-statement-banner-renderer,
      ytd-ad-slot-renderer,
      .ytd-ad-slot-renderer,
      ytd-in-feed-ad-layout-renderer,
      ytd-promoted-sparkles-web-renderer,
      ytd-promoted-sparkles-text-search-renderer,
      ytd-promoted-video-renderer,
      ytd-display-ad-renderer,
      ytd-companion-slot-renderer,
      ytd-action-companion-ad-renderer,
      ytd-player-legacy-desktop-watch-ads-renderer,
      ytd-search-pyv-renderer,
      ytd-video-masthead-ad-v3-renderer,
      ytd-video-masthead-ad-advertiser-info-renderer,
      ytd-mealbar-promo-renderer,
      ytd-background-promo-renderer,
      ytd-primetime-promo-renderer,
      ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
      ytd-rich-section-renderer:has(ytd-statement-banner-renderer),

      /* Shopping/merch shelf when ad-driven */
      ytd-merch-shelf-renderer,

      /* Survey popups */
      ytd-survey-renderer,
      #offer-module,

      /* Shorts ad units */
      ytd-reel-player-overlay-renderer [is-active-item] ytd-ad-slot-renderer,

      /* Generic ad wrappers */
      [id^="google_ads"],
      [id^="div-gpt-ad"],
      .GoogleActiveViewElement,
      [data-google-av-cxn] { display:none!important; pointer-events:none!important; }

      /* Prevent layout shifts from hidden ads */
      #primary-inner > ytd-ad-slot-renderer + ytd-watch-flexy { margin-top: 0!important; }
      ytd-watch-next-secondary-results-renderer #items > ytd-compact-promoted-video-renderer { display:none!important; }
    `;
    (document.head || document.documentElement).prepend(s);
  }

  // ── 2. Skip video ads ────────────────────────────────────────────────────
  const SKIP_BTN_SELECTORS = [
    '.ytp-skip-ad-button',
    '.ytp-ad-skip-button',
    '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-container button',
    'button.ytp-ad-skip-button',
    '.videoAdUiSkipButton',
    '[class*="skip-ad"]',
    '[class*="skipAd"]',
    'button[id*="skip"]',
  ];

  function trySkipButton() {
    for (const sel of SKIP_BTN_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        ping(1);
        return true;
      }
    }
    return false;
  }

  function forceEndAd() {
    const video  = document.querySelector('video');
    const player = document.querySelector('.html5-video-player');
    if (!video || !player) return false;

    const adActive = player.classList.contains('ad-showing')
                  || !!document.querySelector('.ytp-ad-player-overlay');
    if (!adActive) return false;

    if (trySkipButton()) return true;

    // Silently jump to end
    const wasMuted = video.muted;
    video.muted = true;
    if (Number.isFinite(video.duration) && video.duration > 0) {
      video.currentTime = video.duration;
    }
    setTimeout(() => { try { video.muted = wasMuted; } catch(_){} }, 500);
    ping(1);
    return true;
  }

  // ── 3. Purge DOM ad nodes ────────────────────────────────────────────────
  const DOM_SELECTORS = [
    '.ytp-ad-overlay-container',
    '.ytp-ad-image-overlay',
    '.ytp-ad-text-overlay',
    '.ytp-ad-player-overlay-instream-info',
    '#masthead-ad',
    'ytd-banner-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-promoted-video-renderer',
    'ytd-display-ad-renderer',
    'ytd-companion-slot-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytd-search-pyv-renderer',
    'ytd-mealbar-promo-renderer',
    'ytd-background-promo-renderer',
    'ytd-survey-renderer',
    '#offer-module',
    'ytd-merch-shelf-renderer',
  ];

  function purgeDomAds() {
    if (!BLOCK_OVERLAYS) return;
    let count = 0;
    for (const sel of DOM_SELECTORS) {
      document.querySelectorAll(sel).forEach(el => { el.remove(); count++; });
    }
    if (count > 0) ping(count);
  }

  // ── 4. Override IMA SDK before it executes ───────────────────────────────
  function overrideIMA() {
    try {
      // Null out the global google.ima namespace before ads SDK can load
      const noop = () => {};
      const fakeIMA = {
        AdDisplayContainer: function() { return { initialize: noop, destroy: noop }; },
        AdsLoader: function() { return { requestAds: noop, contentComplete: noop, addEventListener: noop, getSettings: () => ({}) }; },
        AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: '' } },
        AdsRenderingSettings: function() {},
        AdErrorEvent: { Type: { AD_ERROR: '' } },
        AdEvent: { Type: {} },
        ViewMode: { NORMAL: 'normal', FULLSCREEN: 'fullscreen' },
      };
      Object.defineProperty(window, '__ima__', { get: () => fakeIMA, set: noop, configurable: true });
    } catch(_) {}
  }

  // ── 5. Stats ping ────────────────────────────────────────────────────────
  function ping(n = 1) {
    try { chrome.runtime.sendMessage({ type: 'adBlocked', count: n }); } catch(_) {}
  }

  // ── 6. SPA navigation handler ────────────────────────────────────────────
  function onNavigate() {
    setTimeout(() => { purgeDomAds(); forceEndAd(); }, 600);
    setTimeout(() => { purgeDomAds(); forceEndAd(); }, 1400);
    setTimeout(purgeDomAds, 3000);
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function boot() {
    injectCSS();
    overrideIMA();

    // Immediate run
    purgeDomAds();

    // MutationObserver — catches dynamically injected ads
    const obs = new MutationObserver((muts) => {
      let changed = false;
      for (const m of muts) {
        if (m.addedNodes.length || (m.type === 'attributes' && m.attributeName === 'class')) {
          changed = true; break;
        }
      }
      if (!changed) return;
      if (SKIP_VIDEO) forceEndAd();
      purgeDomAds();
    });

    obs.observe(document.documentElement, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['class']
    });

    // Polling fallback — YouTube's React fiber can outrun observers
    setInterval(() => {
      if (!ENABLED) return;
      if (SKIP_VIDEO) forceEndAd();
      purgeDomAds();
    }, 300);

    // YouTube SPA (pushState) navigation detection
    let lastHref = location.href;
    new MutationObserver(() => {
      if (location.href !== lastHref) { lastHref = location.href; onNavigate(); }
    }).observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

})();
