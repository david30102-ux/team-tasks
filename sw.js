// Service worker: שומר את קבצי האפליקציה בטלפון (נפתחת מהר גם בלי רשת), מציג התראות שמגיעות מ-Firebase
// כשהאפליקציה סגורה, ומקבל "שיתוף" מוואטסאפ באנדרואיד.
// בכל עדכון של האפליקציה מעלים את VERSION (חייב להיות זהה ל-APP_VERSION ב-app.js).
var VERSION = '2.5.3';
var CACHE = 'tt-' + VERSION;
var SHELL = ['./', 'index.html', 'app.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

importScripts('config.js');
var CFG = self.APP_CONFIG || {};

/**
 * לחיצה על התראה – גם של Firebase וגם כאלה שהאפליקציה הציגה בעצמה.
 * נרשם לפני Firebase, כדי שהטיפול שלנו ירוץ ראשון: Firebase רק מעלה את האפליקציה לקדמת המסך,
 * בלי לפתוח את המשימה. כאן: אם האפליקציה פתוחה – אומרים לה לפתוח את המשימה (עם תוכן ההתראה);
 * אם היא סגורה – פותחים אותה ישר על המשימה.
 */
self.addEventListener('notificationclick', function (e) {
  var n = e.notification || {}, d = n.data || {}, info = null;
  if (d.ttLink !== undefined) {
    info = { taskId: d.ttTask || '', kind: d.ttKind || '', title: n.title || '', body: n.body || '' };
  } else if (d.FCM_MSG) {
    var m = d.FCM_MSG || {}, md = m.data || {}, mn = m.notification || {};
    info = { taskId: md.taskId || '', kind: md.kind || '', title: md.title || mn.title || n.title || '', body: md.body || mn.body || n.body || '' };
  }
  if (!info) return;
  if (e.stopImmediatePropagation) e.stopImmediatePropagation(); // ש-Firebase לא יטפל בה שוב
  if (n.close) n.close();
  var scope = self.registration.scope;
  var link = scope + (info.taskId ? '#t=' + info.taskId + (info.kind ? '&k=' + encodeURIComponent(info.kind) : '') +
    '&m=' + encodeURIComponent((info.title + (info.body ? ' – ' + info.body : '')).slice(0, 300)) : '');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.url.indexOf(scope) === 0 && 'focus' in c) {
        c.postMessage({ openTask: info.taskId, note: info });
        return c.focus();
      }
    }
    return self.clients.openWindow(link);
  }));
});
if (CFG.firebase && CFG.firebase.apiKey) {
  try {
    importScripts(
      'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js'
    );
    firebase.initializeApp(CFG.firebase);
    firebase.messaging(); // ההתראה מוצגת אוטומטית, ולחיצה עליה פותחת את המשימה
  } catch (e) { /* בלי רשת בהתקנה: ההתראות יעבדו בפעם הבאה */ }
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('tt-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (e) { if (e.data === 'skipWaiting') self.skipWaiting(); });

/** שיתוף מאפליקציה אחרת (אנדרואיד): שומרים את הטקסט והקבצים, ופותחים את האפליקציה עם משימה חדשה. */
function saveShare(data) {
  return new Promise(function (resolve) {
    var r = indexedDB.open('tt', 1);
    r.onupgradeneeded = function () { var d = r.result; ['up', 'files', 'share'].forEach(function (n) { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); }); };
    r.onsuccess = function () {
      var tx = r.result.transaction('share', 'readwrite');
      tx.objectStore('share').put(data, 'last');
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    };
    r.onerror = resolve;
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);
  if (req.method === 'POST' && url.origin === self.location.origin && /\/share-target\/?$/.test(url.pathname)) {
    e.respondWith(req.formData().then(function (fd) {
      var files = fd.getAll('files').filter(function (f) { return f && f.size; }).slice(0, 5);
      return saveShare({ title: fd.get('title') || '', text: fd.get('text') || '', url: fd.get('url') || '', files: files.map(function (f) { return { blob: f, name: f.name, type: f.type }; }), at: Date.now() });
    }).catch(function () {}).then(function () { return Response.redirect('./?share=1', 303); }));
    return;
  }
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin || url.pathname.indexOf('/probe/') >= 0) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(function (r) { return r || fetch(req); }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (r) { return r || fetch(req); }));
});
