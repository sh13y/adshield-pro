/* AdShield Pro — Popup Script */
(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────────────
  const shell      = document.getElementById('shell');
  const brandIcon  = document.getElementById('brandIcon');
  const pwrChk     = document.getElementById('pwrChk');
  const stripDot   = document.getElementById('stripDot');
  const stripMsg   = document.getElementById('stripMsg');
  const arcNum     = document.getElementById('arcNum');
  const arcProg    = document.getElementById('arcProgress');
  const statToday  = document.getElementById('statToday');
  const statSess   = document.getElementById('statSession');
  const btnReset   = document.getElementById('btnReset');
  const btnSettings= document.getElementById('btnSettings');
  const drawer     = document.getElementById('drawer');
  const drawerClose= document.getElementById('drawerClose');
  const pillGroup  = document.getElementById('pillGroup');
  const domInput   = document.getElementById('domInput');
  const addDom     = document.getElementById('addDom');
  const wlList     = document.getElementById('wlList');
  const dangerReset= document.getElementById('dangerReset');
  const tiles      = document.querySelectorAll('.shield-tile');

  // Arc circumference for r=80: 2πr ≈ 502
  const ARC_LEN = 502;
  const MAX_ARC = 10_000; // total at which arc fills

  let displayedTotal = 0;
  let sessionCount   = 0;
  let enabled        = true;
  let rafId          = null;

  // ── Animated number counter ─────────────────────────────────────────
  function animateTo(el, target, duration = 900) {
    const from = parseInt(el.textContent.replace(/,/g, '')) || 0;
    if (from === target) return;
    const start = performance.now();
    const delta = target - from;
    cancelAnimationFrame(rafId);
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + delta * ease).toLocaleString();
      if (t < 1) rafId = requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString();
    }
    rafId = requestAnimationFrame(tick);
  }

  // ── Arc progress (0–1) ──────────────────────────────────────────────
  function setArc(total) {
    const pct = Math.min(total / MAX_ARC, 1);
    const offset = ARC_LEN - ARC_LEN * pct;
    arcProg.style.strokeDashoffset = offset;
  }

  // ── Pop animation on counter ────────────────────────────────────────
  function popNum() {
    arcNum.classList.add('pop');
    setTimeout(() => arcNum.classList.remove('pop'), 180);
  }

  // ── Render enabled / disabled ───────────────────────────────────────
  function renderEnabled(on) {
    enabled = on;
    pwrChk.checked = on;
    shell.classList.toggle('off', !on);
    brandIcon.classList.toggle('active', on);
    stripDot.classList.toggle('off', !on);
    stripMsg.textContent = on ? 'ACTIVE — ALL SHIELDS UP' : 'PAUSED — CLICK TO RESUME';
    stripMsg.classList.toggle('off', !on);
  }

  // ── Render stats ────────────────────────────────────────────────────
  function renderStats(data) {
    const total   = data.totalBlocked || 0;
    const today   = data.todayBlocked || 0;

    if (total !== displayedTotal) {
      animateTo(arcNum, total);
      setArc(total);
      if (total > displayedTotal) popNum();
      displayedTotal = total;
    } else {
      arcNum.textContent = total.toLocaleString();
    }

    animateTo(statToday, today);
    statSess.textContent = sessionCount.toLocaleString();
  }

  // ── Render feature tiles ────────────────────────────────────────────
  function renderTiles(data) {
    tiles.forEach(tile => {
      const key = tile.dataset.key;
      const on  = data[key] !== false;
      tile.classList.toggle('active', on);
    });
  }

  // ── Render whitelist ────────────────────────────────────────────────
  function renderWL(domains = []) {
    wlList.innerHTML = '';
    domains.forEach(d => {
      const row = document.createElement('div');
      row.className = 'wl-item';
      row.innerHTML = `<span class="wl-domain">${d}</span>
        <button class="wl-rm" data-d="${d}">✕</button>`;
      row.querySelector('.wl-rm').onclick = () => removeDomain(d);
      wlList.appendChild(row);
    });
  }

  // ── Render filter pill ──────────────────────────────────────────────
  function renderPills(strength) {
    pillGroup.querySelectorAll('.dpill').forEach(p => {
      p.classList.toggle('on', p.dataset.val === strength);
    });
  }

  // ── Load all state ──────────────────────────────────────────────────
  function load() {
    chrome.runtime.sendMessage({ type: 'getStats' }, data => {
      if (!data) return;
      renderEnabled(data.enabled !== false);
      renderStats(data);
      renderTiles(data);
      renderWL(data.whitelistedDomains || []);
      renderPills(data.filterStrength || 'standard');
    });
  }

  // ── Draw tick marks on arc ──────────────────────────────────────────
  function drawTicks() {
    const g = document.getElementById('ticks');
    if (!g) return;
    const N = 36, r1 = 88, r2 = 92, cx = 100, cy = 100;
    let html = '';
    for (let i = 0; i < N; i++) {
      const a = (i / N) * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r1 * Math.cos(a), y1 = cy + r1 * Math.sin(a);
      const x2 = cx + r2 * Math.cos(a), y2 = cy + r2 * Math.sin(a);
      html += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#C6FF00" stroke-width="1"/>`;
    }
    g.innerHTML = html;
  }

  // ── Events ──────────────────────────────────────────────────────────

  // Power toggle
  pwrChk.addEventListener('change', () => {
    const on = pwrChk.checked;
    renderEnabled(on);
    chrome.runtime.sendMessage({ type: 'toggle', enabled: on });
    chrome.storage.local.set({ enabled: on });
  });

  // Feature tiles
  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      const key = tile.dataset.key;
      const nowOn = !tile.classList.contains('active');
      tile.classList.toggle('active', nowOn);
      chrome.storage.local.set({ [key]: nowOn });
      chrome.runtime.sendMessage({ type: 'setSetting', key, value: nowOn });
    });
  });

  // Footer buttons
  btnReset.addEventListener('click', () => {
    animateTo(arcNum, 0, 600);
    setArc(0);
    displayedTotal = 0;
    sessionCount = 0;
    statSess.textContent = '0';
    animateTo(statToday, 0, 400);
    chrome.runtime.sendMessage({ type: 'resetStats' });
  });

  btnSettings.addEventListener('click', () => drawer.classList.add('open'));
  drawerClose.addEventListener('click', () => drawer.classList.remove('open'));

  // Filter pills
  pillGroup.querySelectorAll('.dpill').forEach(p => {
    p.addEventListener('click', () => {
      pillGroup.querySelectorAll('.dpill').forEach(x => x.classList.remove('on'));
      p.classList.add('on');
      chrome.storage.local.set({ filterStrength: p.dataset.val });
    });
  });

  // Whitelist add
  addDom.addEventListener('click', doAddDomain);
  domInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAddDomain(); });

  function doAddDomain() {
    const raw = domInput.value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!raw || !raw.includes('.')) return;
    chrome.storage.local.get('whitelistedDomains', d => {
      const list = d.whitelistedDomains || [];
      if (list.includes(raw)) return;
      const next = [...list, raw];
      chrome.storage.local.set({ whitelistedDomains: next });
      chrome.runtime.sendMessage({ type: 'setWhitelist', domains: next });
      renderWL(next);
      domInput.value = '';
    });
  }

  function removeDomain(domain) {
    chrome.storage.local.get('whitelistedDomains', d => {
      const next = (d.whitelistedDomains || []).filter(x => x !== domain);
      chrome.storage.local.set({ whitelistedDomains: next });
      chrome.runtime.sendMessage({ type: 'setWhitelist', domains: next });
      renderWL(next);
    });
  }

  dangerReset.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'resetStats' }, () => {
      animateTo(arcNum, 0, 600);
      setArc(0);
      displayedTotal = 0; sessionCount = 0;
      statSess.textContent = '0';
      animateTo(statToday, 0, 400);
    });
  });

  // Live session counter via background messages
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'adBlocked') {
      sessionCount += (msg.count || 1);
      statSess.textContent = sessionCount.toLocaleString();
    }
  });

  // Check if on YouTube to show/hide yt chip
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const chip = document.querySelector('.yt-chip');
    if (chip && tabs[0]) chip.style.display = /youtube\.com/.test(tabs[0].url || '') ? 'flex' : 'none';
  });

  // ── Init ────────────────────────────────────────────────────────────
  drawTicks();
  load();
  setInterval(load, 2500);

})();
