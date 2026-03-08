/**
 * CloudPipe Spider Web Tracker — 方案 C
 * Add this script to any brand site to track AI bot visits.
 *
 * Usage: <script src="https://cloudpipe-macao-app.vercel.app/spider-track.js"
 *               data-site="yamanakada"></script>
 */
(function() {
  var ENDPOINT = 'https://cloudpipe-macao-app.vercel.app/api/v1/spider-track';
  var el = document.currentScript;
  var site = el && el.getAttribute('data-site');
  if (!site) return;

  var BOTS = [
    'GPTBot','ChatGPT-User','OAI-SearchBot','Google-Extended','Googlebot','Bingbot',
    'anthropic-ai','ClaudeBot','Claude-Web','PerplexityBot','Bytespider','cohere-ai',
    'Applebot','Applebot-Extended','YouBot','Amazonbot','meta-externalagent','FacebookBot',
    'AI2Bot','Diffbot','CCBot','iaskspider','PetalBot','YandexBot','ia_archiver'
  ];

  var ua = navigator.userAgent || '';
  var detected = null;
  for (var i = 0; i < BOTS.length; i++) {
    if (ua.indexOf(BOTS[i]) !== -1) {
      detected = BOTS[i];
      break;
    }
  }

  // Also check if this page was fetched by a bot (server-rendered pages won't execute JS,
  // but some bots do render JS — this catches those)
  if (!detected) return;

  try {
    var payload = {
      site: site,
      bot_name: detected,
      path: location.pathname || '/',
      referer: document.referrer || null,
      ua: ua.substring(0, 500)
    };

    // Use sendBeacon for reliability (works even on page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, JSON.stringify(payload));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', ENDPOINT, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(payload));
    }
  } catch(e) { /* silently ignore */ }
})();
