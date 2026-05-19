// AdShield Pro — Background Service Worker

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get('initialized');
  if (!data.initialized) {
    await chrome.storage.local.set({
      initialized: true,
      enabled: true,
      totalBlocked: 0,
      todayBlocked: 0,
      sessionBlocked: 0,
      lastResetDate: new Date().toDateString(),
      whitelistedDomains: [],
      filterStrength: 'standard',
      skipVideoAds: true,
      blockOverlays: true,
      networkShield: true,
      blockTrackers: true
    });
  }
});

// Reset daily counter at midnight
async function checkDailyReset() {
  const { lastResetDate } = await chrome.storage.local.get('lastResetDate');
  const today = new Date().toDateString();
  if (lastResetDate !== today) {
    await chrome.storage.local.set({ todayBlocked: 0, lastResetDate: today });
  }
}
setInterval(checkDailyReset, 60_000);
checkDailyReset();

// Message hub
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  (async () => {
    switch (msg.type) {

      case 'adBlocked': {
        const n = msg.count || 1;
        const d = await chrome.storage.local.get(['totalBlocked', 'todayBlocked']);
        await chrome.storage.local.set({
          totalBlocked: (d.totalBlocked || 0) + n,
          todayBlocked: (d.todayBlocked || 0) + n
        });
        reply({ ok: true });
        break;
      }

      case 'getStats': {
        const d = await chrome.storage.local.get(null);
        reply(d);
        break;
      }

      case 'toggle': {
        await chrome.storage.local.set({ enabled: msg.enabled });
        try {
          if (msg.enabled) {
            await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: ['ruleset_main'] });
          } else {
            await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: ['ruleset_main'] });
          }
        } catch(e) { /* ignore */ }
        reply({ ok: true });
        break;
      }

      case 'resetStats': {
        await chrome.storage.local.set({ totalBlocked: 0, todayBlocked: 0 });
        reply({ ok: true });
        break;
      }

      case 'setSetting': {
        await chrome.storage.local.set({ [msg.key]: msg.value });
        reply({ ok: true });
        break;
      }

      case 'setWhitelist': {
        await chrome.storage.local.set({ whitelistedDomains: msg.domains });
        reply({ ok: true });
        break;
      }
    }
  })();
  return true; // keep async channel open
});
