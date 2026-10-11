/* Privacy-conscious Umami integration for the public Leadership MCP pages.
 * Configure window.LEADERSHIP_ANALYTICS before loading this file:
 * { host: "https://analytics.example.com", websiteId: "public-website-id" }
 * No tracking starts until the visitor opts in. Never send tokens, form fields,
 * message text, or full /instalar/<token> URLs.
 */
(() => {
  const config = window.LEADERSHIP_ANALYTICS || {};
  const consentKey = 'lmcp_analytics_consent';
  const eventAttrs = '[data-lmcp-event]';
  const safePath = location.pathname.replace(/^\/instalar\/lmcp_[0-9a-f]+$/, '/instalar');
  const allowedProps = (props = {}) => Object.fromEntries(
    Object.entries(props).filter(([key, value]) =>
      /^[a-z][a-z0-9_]{0,30}$/i.test(key) && typeof value === 'string' && value.length <= 80
    )
  );

  let enabled = localStorage.getItem(consentKey) === 'accepted';
  let ready = false;
  const queued = [];

  function loadTracker() {
    if (!config.host || !config.websiteId || document.querySelector('script[data-lmcp-umami]')) return;
    const script = document.createElement('script');
    script.defer = true;
    script.src = config.host.replace(/\/$/, '') + '/script.js';
    script.dataset.websiteId = config.websiteId;
    script.dataset.autoTrack = 'false';
    script.dataset.autoPageview = 'false';
    script.dataset.doNotTrack = 'true';
    script.dataset.lmcpUmami = 'true';
    script.onload = () => { ready = true; while (queued.length) window.umami?.track(...queued.shift()); };
    document.head.appendChild(script);
  }

  function track(name, props = {}) {
    if (!enabled || !config.host || !config.websiteId) return;
    const payload = { ...allowedProps(props), path: safePath };
    if (!ready || !window.umami) { queued.push([name, payload]); return; }
    window.umami.track(name, payload);
  }

  function pageview() { track('page_view'); }

  function rememberAttribution() {
    const params = new URLSearchParams(location.search);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
      const value = params.get(key);
      if (value && /^[a-z0-9._-]{1,100}$/i.test(value)) localStorage.setItem('lmcp_' + key, value);
    });
  }

  function consentBanner() {
    if (!config.host || !config.websiteId || localStorage.getItem(consentKey)) return;
    const banner = document.createElement('aside');
    banner.setAttribute('aria-label', 'Privacidade e métricas');
    banner.style.cssText = 'position:fixed;z-index:100;left:16px;right:16px;bottom:16px;max-width:720px;margin:auto;padding:16px 18px;border:1px solid #d6ddd9;border-radius:14px;background:#fff;color:#1c2530;box-shadow:0 8px 30px rgba(28,37,48,.16);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
    banner.innerHTML = '<strong>Ajude a melhorar o Leadership MCP</strong><p style="margin:6px 0 12px;color:#5b6875">Usamos métricas anônimas de navegação e conversão. Não coletamos o conteúdo das suas conversas nem os dados do formulário.</p><button data-consent="yes" style="margin-right:8px;padding:8px 14px;border:0;border-radius:999px;background:#2f6f5b;color:#fff;font-weight:700;cursor:pointer">Aceitar métricas</button><button data-consent="no" style="padding:8px 14px;border:1px solid #2f6f5b;border-radius:999px;background:#fff;color:#2f6f5b;font-weight:700;cursor:pointer">Não aceitar</button>';
    banner.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-consent]')?.dataset.consent;
      if (!choice) return;
      localStorage.setItem(consentKey, choice === 'yes' ? 'accepted' : 'declined');
      banner.remove();
      if (choice === 'yes') { enabled = true; loadTracker(); pageview(); track('analytics_consent'); }
    });
    document.body.appendChild(banner);
  }

  rememberAttribution();
  if (enabled) { loadTracker(); window.addEventListener('load', pageview, { once: true }); }
  document.addEventListener('click', (event) => {
    const target = event.target.closest(eventAttrs);
    if (target) track(target.dataset.lmcpEvent, { placement: target.dataset.lmcpPlacement || 'unknown' });
  });
  window.LMCPAnalytics = { track, enable: () => { enabled = true; loadTracker(); pageview(); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', consentBanner, { once: true });
  else consentBanner();
})();
