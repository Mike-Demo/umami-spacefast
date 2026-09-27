// Minimal tracker script served at /tracker.js.
// Usage: <script defer src="https://<space>.view.fast/tracker.js" data-website-id="<uuid>"></script>
// Supports: data-website-id (required), data-host-url (default: script origin),
//           data-auto-track (default true), data-exclude-search, data-domains.
// API: window.lite.track('event-name', { key: 'value' })

export const TRACKER_JS = `(() => {
  const s = document.currentScript;
  const websiteId = s.getAttribute('data-website-id');
  if (!websiteId) return;
  const hostUrl = (s.getAttribute('data-host-url') || s.src.split('/').slice(0, -1).join('/')).replace(/\\/$/, '');
  const autoTrack = s.getAttribute('data-auto-track') !== 'false';
  const excludeSearch = s.hasAttribute('data-exclude-search');
  const domains = (s.getAttribute('data-domains') || '').split(',').map(d => d.trim()).filter(Boolean);
  const endpoint = hostUrl + '/api/send';
  const trackUrl = s.getAttribute('data-track-url');

  if (domains.length && !domains.includes(location.hostname)) return;
  if (navigator.doNotTrack === '1') return;

  const getPayload = () => ({
    website: websiteId,
    hostname: location.hostname,
    language: (navigator.language || '').toLowerCase(),
    referrer: document.referrer || undefined,
    screen: window.screen.width + 'x' + window.screen.height,
    title: document.title,
    url: trackUrl || (excludeSearch ? location.pathname + location.hash : location.href),
  });

  let lastUrl = null;
  const send = (payload, type) => {
    if (lastUrl === payload.url && !payload.name) return;
    lastUrl = payload.url;
    try {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type || 'event', payload }),
        keepalive: true,
      }).catch(() => {});
    } catch (e) { /* noop */ }
  };

  const trackPageview = () => send(getPayload());
  const trackEvent = (name, data) => {
    if (typeof name !== 'string') return;
    send({ ...getPayload(), name, data });
  };

  window.lite = window.lite || {};
  window.lite.track = trackEvent;

  if (autoTrack) {
    if (document.readyState === 'complete') trackPageview();
    else window.addEventListener('load', trackPageview);
    const origPush = history.pushState, origReplace = history.replaceState;
    const onNav = () => setTimeout(trackPageview, 50);
    history.pushState = function () { origPush.apply(this, arguments); onNav(); };
    history.replaceState = function () { origReplace.apply(this, arguments); onNav(); };
    window.addEventListener('popstate', onNav);
  }
})();
`;
