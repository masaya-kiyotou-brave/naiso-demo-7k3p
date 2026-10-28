/* 内装見積請求アプリ：オフライン動作用（Service Worker）
   ・画面（HTML）は「ネット優先」：つながっていれば最新版、つながらなければ保存しておいた版を表示
   ・アプリを更新したときは、下の VERSION を変えると古い保存データが入れ替わる
   ・入力したデータ（見積・請求など）は端末の中（IndexedDB）にあり、ここでは扱わない */
const VERSION = 'naiso-v1-20261028';
const PAGE = new URL(self.location.href).searchParams.get('page') || '';
const CORE = ['./', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
if (PAGE && PAGE !== 'index.html') CORE.push(PAGE);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./')))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
