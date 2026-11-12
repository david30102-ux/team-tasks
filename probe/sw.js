// Service worker מינימלי: מאפשר התקנה כאפליקציה. בשלב הבדיקה לא שומרים שום דבר במטמון.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function () { /* הבקשות עוברות כרגיל לרשת */ });
