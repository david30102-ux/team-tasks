// Service worker: מאפשר התקנה כאפליקציה, ומציג התראות שמגיעות מ-Firebase כשהאפליקציה סגורה.
// בשלב הבדיקה לא שומרים שום דבר במטמון.
importScripts('config.js');
var FB_VER = '10.14.1';
var cfg = self.PROBE_CONFIG || {};
if (cfg.firebase && cfg.firebase.apiKey) {
  importScripts(
    'https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/' + FB_VER + '/firebase-messaging-compat.js'
  );
  firebase.initializeApp(cfg.firebase);
  firebase.messaging(); // ההתראה מוצגת אוטומטית, ולחיצה עליה פותחת את הקישור שנשלח
}
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* הבקשות עוברות כרגיל לרשת */ });
