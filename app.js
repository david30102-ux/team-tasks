/* משימות צוות – המסך (גרסה 2: המערכת המלאה). כל טקסט בעברית, מימין לשמאל. */
(function () {
  'use strict';

  var APP_VERSION = '2.3.0';
  var API_LEVEL = 2;
  var CFG = self.APP_CONFIG || {};
  var SERVER = CFG.serverUrl || '';
  var APP_URL = CFG.appUrl || location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');

  // ================================================================ כלים
  function $(id) { return document.getElementById(id); }

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'value') el.value = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    add(el, kids);
    return el;
  }
  function add(el, kids) {
    if (kids === null || kids === undefined || kids === false) return;
    if (Array.isArray(kids)) { kids.forEach(function (k) { add(el, k); }); return; }
    el.appendChild(typeof kids === 'string' || typeof kids === 'number' ? document.createTextNode(String(kids)) : kids);
  }

  function sget(k, d) { try { var v = localStorage.getItem('tt.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function sset(k, v) { try { localStorage.setItem('tt.' + k, JSON.stringify(v)); } catch (e) { /* אין מקום */ } }
  function sdel(k) { try { localStorage.removeItem('tt.' + k); } catch (e) { /* לא חשוב */ } }

  function rid() {
    var a = new Uint8Array(10);
    if (self.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return Date.now().toString(36) + Array.prototype.map.call(a, function (b) { return (b % 36).toString(36); }).join('');
  }

  var UA = navigator.userAgent || '';
  var IS_IOS = /iphone|ipad|ipod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var IS_ANDROID = /android/i.test(UA);
  function standalone() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  }
  function deviceName() { return (IS_IOS ? 'אייפון' : IS_ANDROID ? 'אנדרואיד' : 'מחשב') + (standalone() ? ' (מותקן)' : ' (דפדפן)'); }

  // ================================================================ תאריכים
  var DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  var DAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  var MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  var HEB_MONTHS = [['tishrei', 'תשרי'], ['cheshvan', 'חשוון'], ['kislev', 'כסלו'], ['tevet', 'טבת'], ['shevat', 'שבט'], ['adar1', 'אדר א׳'],
    ['adar', 'אדר (בשנה מעוברת: אדר ב׳)'], ['nisan', 'ניסן'], ['iyar', 'אייר'], ['sivan', 'סיוון'], ['tamuz', 'תמוז'], ['av', 'אב'], ['elul', 'אלול']];
  var HEB_NAME = {};
  HEB_MONTHS.forEach(function (m) { HEB_NAME[m[0]] = m[1].replace(/ \(.*/, ''); });
  var EN_HEB = { Tishri: 'tishrei', Heshvan: 'cheshvan', Kislev: 'kislev', Tevet: 'tevet', Shevat: 'shevat', 'Adar I': 'adar1', 'Adar II': 'adar', Adar: 'adar', Nisan: 'nisan', Iyar: 'iyar', Sivan: 'sivan', Tamuz: 'tamuz', Av: 'av', Elul: 'elul' };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function dateOf(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function addDays(s, n) { var d = dateOf(s); d.setDate(d.getDate() + n); return ymd(d); }
  function dayDiff(a, b) { // כמה ימים מ-a עד b
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((Date.UTC(+pb[0], pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], pa[1] - 1, +pa[2])) / 864e5);
  }
  function isoDay(iso) { return iso ? ymd(new Date(iso)) : ''; }
  function nextThursday() { var d = new Date(); return addDays(today(), (4 - d.getDay() + 7) % 7); }
  function daysWord(n) { return n === 1 ? 'יום אחד' : n === 2 ? 'יומיים' : n + ' ימים'; }
  function shortDate(s) { var p = s.split('-'); return (+p[2]) + '.' + (+p[1]); }
  function fullDate(iso) { var d = new Date(iso); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function timeOf(iso) { var d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function gim(n) { // מספר באותיות: 5 → ה׳, 15 → ט״ו, 5787 → תשפ״ז
    var ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'], tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
    var s = '';
    n = n % 1000;
    while (n >= 400) { s += 'ת'; n -= 400; }
    if (n >= 100) { s += ['', 'ק', 'ר', 'ש'][Math.floor(n / 100)]; n %= 100; }
    if (n === 15) s += 'טו'; else if (n === 16) s += 'טז'; else s += tens[Math.floor(n / 10)] + ones[n % 10];
    return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
  }
  function hebDate(iso) {
    try {
      var f = new Intl.DateTimeFormat('he-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
      if (!f.formatToParts) return f.format(new Date(iso));
      return f.formatToParts(new Date(iso)).map(function (p) {
        return (p.type === 'day' || p.type === 'year') && /^\d+$/.test(p.value) ? gim(+p.value) : p.value;
      }).join('');
    } catch (e) { return ''; }
  }
  /** היום העברי והחודש העברי של תאריך (בשביל ברירת מחדל במשימה חוזרת). */
  function hebParts(d) {
    try {
      var o = {};
      new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d)
        .forEach(function (p) { o[p.type] = p.value; });
      return { d: +o.day, m: EN_HEB[o.month] || 'tishrei' };
    } catch (e) { return { d: 1, m: 'tishrei' }; }
  }
  /** "למתי" = היום שבו מטפלים במשימה. */
  function dueLabel(s) {
    var diff = dayDiff(today(), s);
    if (diff < 0) return { text: 'באיחור ' + daysWord(-diff), cls: 'late' };
    if (diff === 0) return { text: 'להיום', cls: 'today' };
    if (diff === 1) return { text: 'למחר', cls: '' };
    if (diff < 7) return { text: 'ליום ' + DAYS[dateOf(s).getDay()] + ' ' + shortDate(s), cls: '' };
    return { text: 'ל-' + shortDate(s), cls: '' };
  }
  function remindDay(t) { return t.remindAt ? isoDay(t.remindAt) : ''; }
  /** היום שבו מגיע זמן הטיפול במשימה: המוקדם מבין "למתי" ויום התזכורת. '' = בלי תאריך. */
  function taskDay(t) { var a = t.dueDate || '', b = remindDay(t); return !a ? b : !b ? a : (a < b ? a : b); }
  function isFuture(t) { var d = taskDay(t); return !!d && d > today(); }
  /** כמה זמן המשימה פתוחה. short: סימן קצר לכרטיס ("⏳ 3 י׳"), ריק כשנפתחה היום. */
  function ageInfo(t) {
    var n = dayDiff(isoDay(t.createdAt) || today(), today());
    return { n: n, text: n <= 0 ? 'נפתחה היום' : 'פתוחה ' + daysWord(n), short: n <= 0 ? '' : '⏳ ' + n + ' י׳', cls: n >= 7 ? 'age-red' : n >= 3 ? 'age-orange' : '' };
  }
  function whenShort(iso) {
    if (!iso) return '';
    return isoDay(iso) === today() ? 'היום ב-' + timeOf(iso) : 'ב-' + shortDate(isoDay(iso));
  }
  function whenLabel(iso) { // היום 14:30 / מחר 09:00 / 20.11 09:00
    var d = isoDay(iso), diff = dayDiff(today(), d);
    return (diff === 0 ? 'היום ' : diff === 1 ? 'מחר ' : shortDate(d) + ' ') + timeOf(iso);
  }
  function dayNum(s) { var p = s.split('-'); return Math.floor(Date.UTC(+p[0], p[1] - 1, +p[2]) / 864e5); }
  function holyDay(s) { return dateOf(s).getDay() === 6 || (S.data.holy || []).indexOf(s) >= 0; }
  /** "עבר יום עבודה": אותה שעה ביום העבודה הבא (שבת וחג לא נספרים). */
  function acceptLate(t) {
    if (t.status !== 'pending') return false;
    var at = new Date(t.assignedAt || t.createdAt);
    if (isNaN(at)) return false;
    var d = addDays(ymd(at), 1);
    while (holyDay(d)) d = addDays(d, 1);
    var dl = dateOf(d);
    dl.setHours(at.getHours(), at.getMinutes(), 0, 0);
    return Date.now() >= dl.getTime();
  }

  // ================================================================ מצב
  function emptyData() { return { ver: '', users: [], tasks: [], comments: [], files: [], series: [], quotes: [], settings: { quoteDays: 1 }, holy: [] }; }
  var S = {
    token: sget('token', ''),
    me: sget('me', null),
    data: Object.assign(emptyData(), sget('data', null) || {}),
    outbox: sget('outbox', []),
    ups: sget('ups', []),
    seen: sget('seen', null),
    tab: sget('tab', 'mine'),
    meet: sget('meet', null),
    net: 'ok',
    flushing: false, syncing: false, uploading: false, retryTimer: 0, dragging: false, renderLater: false
  };
  var V = { tasks: [], users: [], series: [], comments: {}, files: {}, pending: {} }; // הנתונים מהשרת + פעולות שעוד לא נשלחו

  function derive() {
    V.users = S.data.users || [];
    V.tasks = (S.data.tasks || []).map(function (t) { return Object.assign({}, t); });
    V.series = (S.data.series || []).slice();
    V.allComments = (S.data.comments || []).slice();
    V.allFiles = (S.data.files || []).slice();
    V.pending = {};
    S.outbox.forEach(function (op) {
      applyLocal(V, op);
      if (op.id) V.pending[op.id] = 1;
      if (op.task) V.pending[op.task.id] = 1;
    });
    V.comments = {};
    V.allComments.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; }).forEach(function (c) {
      (V.comments[c.taskId] = V.comments[c.taskId] || []).push(c);
    });
    V.files = {};
    V.allFiles.forEach(function (f) { (V.files[f.taskId] = V.files[f.taskId] || []).push(f); });
  }
  function findTask(v, id) { for (var i = 0; i < v.tasks.length; i++) if (v.tasks[i].id === id) return v.tasks[i]; return null; }
  function task(id) { return findTask(V, id); }
  function user(id) { for (var i = 0; i < V.users.length; i++) if (V.users[i].id === id) return V.users[i]; return null; }
  function uname(id) { if (S.me && id === S.me.id) return S.me.name; var u = user(id); return u ? u.name : '?'; }
  function isMgr() { return !!S.me && S.me.role === 'manager'; }
  function byName(a, b) { return a.name.localeCompare(b.name, 'he'); }
  function seriesById(id) { for (var i = 0; i < V.series.length; i++) if (V.series[i].id === id) return V.series[i]; return null; }
  function isActive(t) { return t.status === 'pending' || t.status === 'open' || t.status === 'rejected' || t.status === 'returned'; }

  /** מבצע פעולה על הנתונים במכשיר, בדיוק כמו שהשרת יבצע אותה. */
  function applyLocal(v, op) {
    var me = S.me ? S.me.id : '';
    if (op.type === 'create') {
      if (findTask(v, op.task.id)) return;
      var as = op.task.assigneeId || me;
      v.tasks.push(Object.assign({ note: '', priority: 'normal', dueDate: '', remindAt: '', rank: null }, op.task, {
        assigneeId: as, createdById: me, createdAt: op.at, assignedAt: op.at, updatedAt: op.at, status: as === me ? 'open' : 'pending'
      }));
      return;
    }
    if (op.type === 'createSeries') {
      if (!v.series.some(function (s) { return s.id === op.series.id; })) v.series.push(Object.assign({}, op.series, { createdById: me, accepted: (op.series.assigneeId || me) === me }));
      return;
    }
    if (op.type === 'stopSeries') { v.series = v.series.filter(function (s) { return s.id !== op.id; }); return; }
    if (op.type === 'delFile') { v.allFiles = v.allFiles.filter(function (f) { return f.id !== op.id; }); return; }
    if (op.type === 'order') {
      var pos = {};
      op.ids.forEach(function (id, i) { pos[id] = i + 1; });
      v.tasks.forEach(function (t) { if (t.assigneeId === me && t.status === 'open' && pos[t.id]) t.rank = pos[t.id]; });
      return;
    }
    if (op.type === 'autoOrder') { v.tasks.forEach(function (t) { if (t.assigneeId === me) t.rank = null; }); return; }
    var t = findTask(v, op.id);
    if (!t) return;
    switch (op.type) {
      case 'update':
        if ('assigneeId' in op.fields && op.fields.assigneeId !== t.assigneeId) {
          t.rank = null; t.assignedAt = op.at; t.reason = ''; t.respondedAt = '';
          if (t.status !== 'done' && t.status !== 'cancelled') t.status = (op.fields.assigneeId === me || op.fields.assigneeId === t.createdById) ? 'open' : 'pending';
        }
        if ('remindAt' in op.fields && op.fields.remindAt !== t.remindAt) t.remindSent = false;
        Object.assign(t, op.fields);
        break;
      case 'accept':
        if (t.status === 'pending') { t.status = 'open'; t.respondedAt = op.at; t.notifyAt = ''; }
        if (t.seriesId) v.tasks.forEach(function (o) { if (o.seriesId === t.seriesId && o.assigneeId === me && o.status === 'pending') o.status = 'open'; });
        break;
      case 'reject': if (t.status === 'pending') { t.status = 'rejected'; t.reason = op.reason; t.rank = null; } break;
      case 'return': if (t.status === 'open') { t.status = 'returned'; t.reason = op.reason; t.rank = null; } break;
      case 'resend':
        if (t.status === 'rejected' || t.status === 'returned') {
          t.status = (t.assigneeId === me || t.assigneeId === t.createdById) ? 'open' : 'pending';
          t.reason = ''; t.respondedAt = ''; t.assignedAt = op.at; t.rank = null;
        }
        if (op.text && !v.allComments.some(function (c) { return c.id === op.cid; })) v.allComments.push({ id: op.cid, taskId: t.id, userId: me, at: op.at, text: op.text, kind: 'comment' });
        break;
      case 'done': if (isActive(t)) { t.status = 'done'; t.doneAt = op.at; t.doneById = me; } break;
      case 'reopen': t.status = 'open'; t.doneAt = ''; t.doneById = ''; break;
      case 'cancel': t.status = 'cancelled'; break;
      case 'delete': v.tasks = v.tasks.filter(function (x) { return x !== t; }); return;
      case 'comment':
      case 'nudge':
        if (!v.allComments.some(function (c) { return c.id === op.cid; })) v.allComments.push({ id: op.cid, taskId: t.id, userId: me, at: op.at, text: op.text, kind: op.type });
        break;
    }
    t.updatedAt = op.at;
  }

  // ================================================================ שרת
  function api(action, payload, timeoutMs) {
    if (!SERVER) return Promise.resolve({ ok: false, error: 'no_server' });
    var body = JSON.stringify(Object.assign({ action: action, token: S.token || '' }, payload || {}));
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs || 40000) : 0;
    return fetch(SERVER, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body, redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) { return res.json(); })
      .then(function (j) {
        clearTimeout(timer);
        if (j && j.apiLevel && j.apiLevel > API_LEVEL) showUpdateBanner();
        return j || { ok: false, error: 'server_error' };
      })
      .catch(function (e) { clearTimeout(timer); return { ok: false, error: 'network', message: String((e && e.message) || e) }; });
  }

  var ERR = {
    network: 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.',
    bad_code: 'קוד ההזמנה לא נכון, או שפג תוקפו. בדקו את הקוד, או בקשו מהמנהל קוד חדש.',
    locked: 'היו יותר מדי ניסיונות שגויים. נסו שוב בעוד חצי שעה.',
    bad_pin: 'הקוד האישי צריך להיות 4 ספרות.',
    bad_phone: 'מספר הטלפון לא תקין.',
    phone_taken: 'מספר הטלפון הזה כבר רשום אצל עובד אחר.',
    bad_login: 'מספר הטלפון או הקוד האישי לא נכונים.',
    pin_locked: 'הכניסה נעולה אחרי 5 ניסיונות שגויים. בקשו מהמנהל קוד הזמנה חדש.',
    forbidden: 'אין לכם הרשאה לפעולה הזו.',
    not_found: 'המשימה לא נמצאה. ייתכן שנמחקה.',
    busy: 'השרת עמוס כרגע. נסו שוב בעוד רגע.',
    no_name: 'צריך למלא שם.',
    no_title: 'צריך למלא מה צריך לעשות.',
    no_reason: 'צריך לכתוב סיבה.',
    no_text: 'צריך לכתוב משהו.',
    not_open: 'המשימה כבר לא פתוחה.',
    bad_assignee: 'העובד שנבחר כבר לא פעיל.',
    bad_rule: 'הגדרת החזרה לא תקינה.',
    self: 'אי אפשר להשבית את עצמכם או לשנות את ההרשאה של עצמכם.',
    too_big: 'הקובץ גדול מדי (עד 10MB).',
    bad_type: 'אפשר לצרף תמונות, הקלטות, PDF, Word, Excel, PowerPoint וקובצי טקסט.',
    bad_email: 'כתובת המייל לא תקינה.',
    bad_calendar: 'מזהה היומן לא תקין. הוא נראה כמו כתובת מייל.',
    calendar_not_allowed: 'אפשר לחבר יומן ראשי רק אם המנהל רשם אצלך את כתובת ה-Gmail הזו. אפשר לחבר יומן נוסף (מזהה שמסתיים ב-group.calendar.google.com).',
    calendar_taken: 'היומן הזה כבר מחובר לעובד אחר.',
    calendar_not_shared: 'השרת לא רואה את היומן. בדקו שהוא שותף עם חשבון העמותה עם "הצגת כל פרטי האירוע".',
    quiet: 'בשבת ובחג לא נשלחות התראות.',
    no_device: 'המכשיר עוד לא רשום להתראות. לחצו קודם "הפעלת התראות".',
    server_error: 'תקלה בשרת. נסו שוב, ואם זה חוזר, ספרו למנהל.',
    no_server: 'השרת עוד לא הוגדר.'
  };
  function errText(r) {
    var t = ERR[r && r.error] || ('שגיאה: ' + ((r && (r.message || r.error)) || 'לא ידועה'));
    if (r && r.error === 'bad_login' && r.left) t += ' נשארו ' + r.left + ' ניסיונות.';
    return t;
  }

  // ---------------------------------------------------------------- תור שליחה
  var flushT = 0;
  function queue(op) {
    op.opId = rid();
    op.at = new Date().toISOString();
    S.outbox.push(op);
    sset('outbox', S.outbox);
    sset('outboxOwner', S.me && S.me.id);
    derive();
    render();
    clearTimeout(flushT);
    flushT = setTimeout(flush, 350);
  }

  function flush() {
    if (S.flushing || !S.outbox.length || !S.token) return Promise.resolve();
    S.flushing = true;
    setNet('saving');
    var batch = S.outbox.slice(0, 25);
    var sent = {};
    batch.forEach(function (op) { sent[op.opId] = 1; });
    return api('ops', { ops: batch }).then(function (r) {
      S.flushing = false;
      if (r.ok) {
        S.outbox = S.outbox.filter(function (op) { return !sent[op.opId]; });
        sset('outbox', S.outbox);
        var bad = (r.results || []).filter(function (x) { return !x.ok; });
        if (bad.length) toast(errText(bad[0]));
        takeSnapshot(r);
        if (S.outbox.length) return flush();
        setNet('ok');
        processUploads();
      } else if (r.error === 'auth') {
        lostLogin();
      } else if (r.error === 'network' || r.error === 'busy' || r.error === 'server_error') {
        setNet('offline');
        clearTimeout(S.retryTimer);
        S.retryTimer = setTimeout(flush, 15000);
      } else { // הבקשה נדחתה כולה: לא נתקעים עליה
        S.outbox = S.outbox.filter(function (op) { return !sent[op.opId]; });
        sset('outbox', S.outbox);
        toast(errText(r));
        setNet('ok');
        derive();
        render();
      }
    });
  }

  function sync(force) {
    if (!S.token || S.syncing) return Promise.resolve();
    if (S.outbox.length) return flush();
    S.syncing = true;
    return api('sync', { since: force ? '' : S.data.ver }).then(function (r) {
      S.syncing = false;
      if (r.ok) { if (!r.same) takeSnapshot(r); setNet('ok'); processUploads(); }
      else if (r.error === 'auth') lostLogin();
      else if (r.error === 'network') setNet('nonet');
    });
  }

  function tick() { if (!S.token) return; if (S.outbox.length) flush(); else sync(); }

  function takeSnapshot(r) {
    if (r.me) { S.me = r.me; sset('me', S.me); }
    if (r.tasks) {
      var d = emptyData();
      Object.keys(d).forEach(function (k) { if (r[k] !== undefined) d[k] = r[k]; });
      if (r.allQuotes) d.allQuotes = r.allQuotes;
      S.data = d;
      sset('data', S.data);
    }
    derive();
    render();
  }

  function setNet(state) { S.net = state; renderSync(); }

  function lostLogin() {
    var msg = 'הכניסה במכשיר הזה בוטלה. אפשר להיכנס שוב עם מספר הטלפון והקוד האישי, או לבקש מהמנהל קוד הזמנה חדש.';
    clearLocal();
    showLogin(msg);
  }

  function clearLocal() {
    S.token = ''; S.me = null; S.data = emptyData(); S.seen = null; S.meet = null; S.ups = [];
    ['token', 'me', 'data', 'seen', 'meet', 'ups', 'pushToken', 'pushAt'].forEach(sdel);
    idbClear();
    while (stack.length) stack.pop();
    showTop();
    derive();
  }

  // ================================================================ קבצים: שמירה במכשיר והעלאה
  var DB = null;
  function idb() {
    return new Promise(function (res, rej) {
      if (DB) { res(DB); return; }
      if (!window.indexedDB) { rej(new Error('no idb')); return; }
      var r = indexedDB.open('tt', 1);
      r.onupgradeneeded = function () { var d = r.result; ['up', 'files', 'share'].forEach(function (n) { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); }); };
      r.onsuccess = function () { DB = r.result; res(DB); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbDo(store, mode, fn) {
    return idb().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(store, mode), req = fn(tx.objectStore(store));
        tx.oncomplete = function () { res(req ? req.result : undefined); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbGet(store, key) { return idbDo(store, 'readonly', function (s) { return s.get(key); }); }
  function idbPut(store, key, val) { return idbDo(store, 'readwrite', function (s) { return s.put(val, key); }); }
  function idbDel(store, key) { return idbDo(store, 'readwrite', function (s) { return s.delete(key); }); }
  function idbClear() { ['up', 'files', 'share'].forEach(function (n) { idbDo(n, 'readwrite', function (s) { return s.clear(); }).catch(function () {}); }); }

  function blobToB64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1] || ''); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsDataURL(blob);
    });
  }
  function b64ToBlob(b64, mime) {
    var bin = atob(b64), len = bin.length, bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  function kb(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; }

  function resizeImage(file, max, quality) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.round(img.naturalWidth * scale), hh = Math.round(img.naturalHeight * scale);
        var c = document.createElement('canvas'); c.width = w; c.height = hh;
        c.getContext('2d').drawImage(img, 0, 0, w, hh);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('toBlob')); }, 'image/jpeg', quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('לא הצלחתי לקרוא את התמונה')); };
      img.src = url;
    });
  }

  // מסמכים שמותר לצרף (חייב להתאים ל-DOC_MIMES בשרת)
  var DOC_EXT = {
    pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain', csv: 'text/csv'
  };
  var DOC_ACCEPT = Object.keys(DOC_EXT).map(function (e) { return '.' + e; }).concat(Object.keys(DOC_EXT).map(function (e) { return DOC_EXT[e]; })).join(',');
  function isDocMime(m) { return Object.keys(DOC_EXT).some(function (e) { return DOC_EXT[e] === m; }); }

  /** קובץ שנבחר/הוקלט → צרופה מוכנה {fid, blob, mime, name, kind, dur}. */
  function makeAttachment(file, dur) {
    var mime = String(file.type || '').split(';')[0].toLowerCase();
    var ext = (String(file.name || '').match(/\.([a-z0-9]+)$/i) || [])[1];
    ext = ext ? ext.toLowerCase() : '';
    // טלפונים לפעמים לא יודעים את סוג הקובץ (ריק או octet-stream): לפי הסיומת
    if ((!mime || mime === 'application/octet-stream' || !isDocMime(mime) && !/^(image|audio)\//.test(mime)) && DOC_EXT[ext]) mime = DOC_EXT[ext];
    if (/^image\//.test(mime) && mime !== 'image/gif') {
      return resizeImage(file, 1600, 0.82).then(function (b) {
        return { fid: rid(), blob: b, mime: 'image/jpeg', name: 'תמונה.jpg', kind: 'image', dur: 0 };
      });
    }
    var kind = /^image\/(jpeg|png|webp|gif)$/.test(mime) ? 'image' : /^audio\//.test(mime) ? 'audio' : mime === 'application/pdf' ? 'pdf' : isDocMime(mime) ? 'doc' : '';
    if (!kind) return Promise.reject(new Error(ERR.bad_type));
    if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error(ERR.too_big));
    return Promise.resolve({ fid: rid(), blob: file, mime: mime, name: file.name || (kind === 'audio' ? 'הקלטה' : 'קובץ'), kind: kind, dur: dur || 0 });
  }

  /** שומר צרופה בתור ההעלאה (במכשיר) ומעלה ברקע. */
  function queueUpload(taskId, a) {
    var meta = { fid: a.fid, taskId: taskId, mime: a.mime, name: a.name, kind: a.kind, dur: a.dur || 0, tries: 0 };
    blobUrl[a.fid] = URL.createObjectURL(a.blob);
    return idbPut('up', a.fid, a.blob).then(function () {
      S.ups.push(meta);
      sset('ups', S.ups);
      render();
      processUploads();
    }, function () { toast('לא הצלחתי לשמור את הקובץ במכשיר.'); });
  }

  var upTimer = 0;
  function processUploads() {
    if (S.uploading || !S.ups.length || !S.token) return;
    var onServer = {};
    (S.data.tasks || []).forEach(function (t) { onServer[t.id] = 1; });
    var meta = S.ups.filter(function (u) { return onServer[u.taskId]; })[0];
    if (!meta) return; // המשימה עוד לא נשמרה בשרת: מחכים
    S.uploading = true;
    idbGet('up', meta.fid).then(function (blob) {
      if (!blob) throw new Error('missing');
      return blobToB64(blob).then(function (data) {
        return api('upload', { fid: meta.fid, taskId: meta.taskId, data: data, mime: meta.mime, name: meta.name, dur: meta.dur }, 120000)
          .then(function (r) { return { r: r, blob: blob }; });
      });
    }).then(function (x) {
      S.uploading = false;
      var r = x.r;
      if (r.ok) {
        idbPut('files', meta.fid, x.blob).catch(function () {});
        dropUpload(meta.fid);
        sync(true);
        return;
      }
      if (r.error === 'auth') { lostLogin(); return; }
      if (r.error === 'network' || r.error === 'busy' || r.error === 'server_error') {
        clearTimeout(upTimer);
        upTimer = setTimeout(processUploads, 20000);
        render();
        return;
      }
      meta.tries = (meta.tries || 0) + 1;
      if (r.error !== 'not_found' || meta.tries >= 3) { dropUpload(meta.fid); toast('הקובץ לא נשמר: ' + errText(r)); }
      else sset('ups', S.ups);
    }, function () {
      S.uploading = false;
      dropUpload(meta.fid);
    });
  }
  function dropUpload(fid) {
    S.ups = S.ups.filter(function (u) { return u.fid !== fid; });
    sset('ups', S.ups);
    idbDel('up', fid).catch(function () {});
    render();
    setTimeout(processUploads, 50);
  }

  var blobUrl = {}; // fid → כתובת מקומית לתצוגה
  function fileUrl(f) {
    if (blobUrl[f.id]) return Promise.resolve(blobUrl[f.id]);
    return idbGet('files', f.id).catch(function () { return null; }).then(function (b) {
      if (b) return b;
      return api('file', { id: f.id }, 90000).then(function (r) {
        if (!r.ok) throw new Error(errText(r));
        var blob = b64ToBlob(r.data, r.mime || f.mime);
        idbPut('files', f.id, blob).catch(function () {});
        return blob;
      });
    }).then(function (b) { blobUrl[f.id] = blobUrl[f.id] || URL.createObjectURL(b); return blobUrl[f.id]; });
  }

  // ================================================================ התראות (Firebase)
  var FB_VER = '10.14.1';
  var messaging = null;
  function pushSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window &&
      !!(CFG.firebase && CFG.firebase.apiKey) && location.protocol === 'https:';
  }
  function pushHere() { return pushSupported() && Notification.permission === 'granted' && !!sget('pushToken', ''); }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = src;
      s.onload = resolve; s.onerror = function () { reject(new Error('לא הצלחתי לטעון את רכיב ההתראות')); };
      document.head.appendChild(s);
    });
  }
  function loadFirebase() {
    if (window.firebase && window.firebase.messaging) return Promise.resolve();
    var base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
    return loadScript(base + 'firebase-app-compat.js').then(function () { return loadScript(base + 'firebase-messaging-compat.js'); });
  }
  function registerPush() {
    return loadFirebase().then(function () {
      if (!firebase.apps.length) firebase.initializeApp(CFG.firebase);
      if (!messaging) {
        messaging = firebase.messaging();
        messaging.onMessage(function (p) {
          // האפליקציה פתוחה: Firebase לא מציג התראה בעצמו, אז מציגים אותה כאן (עם הצליל של הטלפון)
          var n = (p && p.notification) || {}, d = (p && p.data) || {};
          var title = d.title || n.title || 'עדכון', body = d.body || n.body || '';
          tick();
          showLocalNotification(title, body, d);
          toast(title + (body ? ': ' + body : ''), d.taskId ? 'פתיחה' : null, d.taskId ? function () { openTask(d.taskId); } : null);
        });
      }
      return navigator.serviceWorker.ready;
    }).then(function (reg) {
      var opts = { serviceWorkerRegistration: reg };
      if (CFG.vapidKey) opts.vapidKey = CFG.vapidKey;
      return messaging.getToken(opts);
    }).then(function (token) {
      if (!token) throw new Error('לא התקבל אישור מהשירות');
      return api('pushRegister', { pushToken: token, platform: deviceName() }).then(function (r) {
        if (!r.ok) throw new Error(errText(r));
        sset('pushToken', token);
        sset('pushAt', Date.now());
        return token;
      });
    });
  }
  function showLocalNotification(title, body, d) {
    if (!('serviceWorker' in navigator) || !window.Notification || Notification.permission !== 'granted') return;
    navigator.serviceWorker.ready.then(function (reg) {
      return reg.showNotification(title, {
        body: body, icon: 'icon-192.png', badge: 'icon-192.png', lang: 'he', dir: 'rtl',
        tag: d.taskId || d.kind || 'tt', renotify: true, requireInteraction: d.kind === 'remind', vibrate: [300, 120, 300],
        data: { ttTask: d.taskId || '', ttLink: APP_URL + (d.taskId ? '#t=' + d.taskId : '') }
      });
    }).catch(function () { /* לא חשוב */ });
  }
  function testPush(btn) {
    busy(btn, true, 'שולח…');
    api('pushTest', {}).then(function (r) {
      busy(btn, false);
      toast(r.ok ? 'נשלחה התראת ניסיון. היא אמורה להגיע תוך כמה שניות.' : errText(r));
    });
  }

  /** הפעלה בלחיצה (חייב לבקש אישור מיד בלחיצה, אחרת אייפון חוסם). */
  function enablePush(btn) {
    if (!pushSupported()) {
      toast(IS_IOS && !standalone() ? 'באייפון צריך קודם להתקין את האפליקציה למסך הבית ולפתוח אותה מהאייקון.' : 'המכשיר או הדפדפן הזה לא תומכים בהתראות.');
      return;
    }
    busy(btn, true, 'מפעיל…');
    var p = Notification.requestPermission();
    var permP = (p && p.then) ? p : new Promise(function (r) { setTimeout(function () { r(Notification.permission); }, 800); });
    permP.then(function (perm) {
      if (perm !== 'granted') throw new Error(perm === 'denied' ? 'ההתראות חסומות. צריך לאפשר אותן בהגדרות הטלפון או הדפדפן (פרטים בהגדרות).' : 'לא אישרתם התראות.');
      return registerPush();
    }).then(function () {
      busy(btn, false);
      toast('ההתראות הופעלו ✓');
      render();
    }).catch(function (e) {
      busy(btn, false);
      toast('לא הצליח: ' + e.message);
    });
  }
  function refreshPush() { // רענון שקט של רישום המכשיר (פעם ב-3 ימים)
    if (!pushSupported() || Notification.permission !== 'granted' || !S.token) return;
    if (sget('pushToken', '') && Date.now() - sget('pushAt', 0) < 3 * 864e5) { if (!messaging) registerPush().catch(function () {}); return; }
    registerPush().catch(function () {});
  }

  // ================================================================ עדכונים חדשים ("נקרא")
  function seenAt(taskId) {
    if (!S.seen) return '';
    var x = S.seen.t[taskId] || '';
    return x > S.seen.base ? x : S.seen.base;
  }
  function markSeen(taskId) {
    if (!S.seen) return;
    S.seen.t[taskId] = new Date().toISOString();
    var keys = Object.keys(S.seen.t);
    if (keys.length > 400) keys.sort(function (a, b) { return S.seen.t[a] < S.seen.t[b] ? -1 : 1; }).slice(0, 100).forEach(function (k) { delete S.seen.t[k]; });
    sset('seen', S.seen);
  }
  function markAllSeen() { S.seen = { base: new Date().toISOString(), t: {} }; sset('seen', S.seen); render(); }
  /** אירועים חדשים במשימות שלי ושנתתי: תגובות, אישורים, דחיות וביצוע. */
  function activity() {
    var me = S.me.id, out = [];
    V.tasks.forEach(function (t) {
      var mine = t.assigneeId === me, gave = t.createdById === me && t.assigneeId !== me;
      if (!mine && !gave) return;
      var since = seenAt(t.id);
      (V.comments[t.id] || []).forEach(function (c) {
        if (c.userId !== me && c.at > since) out.push({ taskId: t.id, at: c.at, who: c.userId, text: c.text, kind: c.kind, title: t.title });
      });
      if (gave && t.status === 'done' && t.doneById && t.doneById !== me && t.doneAt > since) {
        out.push({ taskId: t.id, at: t.doneAt, who: t.doneById, text: '✓ ביצע/ה את המשימה', kind: 'system', title: t.title });
      }
    });
    return out.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
  }
  /** '' = אין חדש; 'c' = תגובה או הקפצה חדשה; 's' = עדכון אחר (אישור, דחייה, קובץ). */
  function unreadComments(t) {
    var since = seenAt(t.id), me = S.me.id, kind = '';
    (V.comments[t.id] || []).forEach(function (c) { if (c.userId !== me && c.at > since) kind = c.kind === 'system' && kind !== 'c' ? 's' : 'c'; });
    return kind;
  }

  // ================================================================ תצוגה ראשית
  function render() {
    if (S.dragging) { S.renderLater = true; return; }
    if (!S.token || !S.me) { if ($('login').classList.contains('hidden')) showLogin(); return; }
    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('who').textContent = S.me.name;
    renderTabs();
    renderView();
    renderSync();
    refreshSheet();
  }

  function renderSync() {
    var el = $('syncState');
    var n = S.outbox.length + S.ups.length;
    var map = {
      saving: ['שומר…', 'saving'],
      offline: ['⚠ ממתין לשמירה (' + n + ')', 'offline'],
      nonet: ['אין חיבור', 'nonet']
    };
    var st = S.net === 'ok' && n ? 'saving' : S.net;
    var m = map[st];
    if (!m || (st === 'saving' && !n)) { el.classList.add('hidden'); return; }
    el.textContent = m[0];
    el.className = 'sync ' + m[1];
  }

  function renderTabs() {
    var me = S.me.id;
    var mineN = V.tasks.filter(function (t) { return t.assigneeId === me && (t.status === 'pending' || (t.status === 'open' && !isFuture(t))); }).length;
    var givenN = V.tasks.filter(function (t) { return t.createdById === me && t.assigneeId !== me && isActive(t) || (t.createdById === me && (t.status === 'rejected' || t.status === 'returned')); }).length;
    var tabs = [['mine', 'שלי', mineN], ['given', 'נתתי', givenN]];
    if (isMgr()) tabs.push(['team', 'צוות', 0]);
    tabs.push(['history', 'היסטוריה', 0]);
    if (!tabs.some(function (t) { return t[0] === S.tab; })) S.tab = 'mine';
    var nav = $('tabs');
    nav.textContent = '';
    tabs.forEach(function (t) {
      var on = S.tab === t[0];
      nav.appendChild(h('button', {
        class: 'tab' + (on ? ' on' : ''), type: 'button', role: 'tab', 'aria-selected': on ? 'true' : 'false', 'data-tab': t[0],
        onclick: function () { S.tab = t[0]; sset('tab', S.tab); render(); window.scrollTo(0, 0); }
      }, [t[1], t[2] ? h('span', { class: 'count', text: String(t[2]) }) : null]));
    });
  }

  function renderView() {
    var el = $('view');
    var keep = histKeep();
    el.textContent = '';
    if (S.tab === 'given') viewGiven(el);
    else if (S.tab === 'team' && isMgr()) viewTeam(el);
    else if (S.tab === 'history') viewHistory(el, keep);
    else viewMine(el);
  }

  // ---------------------------------------------------------------- מיון
  var PR = ['high', 'normal', 'low'];
  var PR_LABEL = { high: '🔴 דחוף', normal: '🟡 רגיל', low: '⚪ לא דחוף' };
  function cmpArr(a, b) { for (var i = 0; i < a.length; i++) { if (a[i] < b[i]) return -1; if (a[i] > b[i]) return 1; } return 0; }
  function autoKey(t, td) {
    return [t.dueDate && t.dueDate < td ? 0 : 1, t.priority === 'high' ? 0 : 1, t.dueDate || '9999-12-31',
      t.priority === 'low' ? 1 : 0, t.createdAt || ''];
  }
  function autoCmp(a, b) { var td = today(); return cmpArr(autoKey(a, td), autoKey(b, td)); }
  function manualCmp(a, b) {
    if (a.rank === null && b.rank === null) return (b.createdAt || '').localeCompare(a.createdAt || ''); // חדשות למעלה
    if (a.rank === null) return -1;
    if (b.rank === null) return 1;
    return a.rank - b.rank;
  }
  function prOf(t) { return PR.indexOf(t.priority) >= 0 ? t.priority : 'normal'; }
  /** המשימות הפתוחות שלי: "להיום" (היום ומה שעבר), קבוצות דחיפות (בלי תאריך), ועתידיות (מחר והלאה). */
  function myOpen() {
    var me = S.me.id, td = today();
    var open = V.tasks.filter(function (t) { return t.assigneeId === me && t.status === 'open'; });
    var todayL = [], future = [], undated = [];
    open.forEach(function (t) {
      if (t.rank === undefined) t.rank = null;
      var d = taskDay(t);
      (!d ? undated : d > td ? future : todayL).push(t);
    });
    var manual = undated.some(function (t) { return t.rank !== null; });
    undated.sort(manual ? manualCmp : autoCmp);
    var groups = { high: [], normal: [], low: [] };
    undated.forEach(function (t) { groups[prOf(t)].push(t); });
    // להיום: קודם משימות עם שעה (לפי השעה), אחר כך בלי שעה: מה שבאיחור, ואז לפי דחיפות
    var timeOfT = function (t) { return t.remindAt && remindDay(t) <= td ? t.remindAt : ''; };
    todayL.sort(function (a, b) {
      var ta = timeOfT(a), tb = timeOfT(b);
      return cmpArr([ta ? 0 : 1, ta, taskDay(a), PR.indexOf(prOf(a)), a.createdAt || ''], [tb ? 0 : 1, tb, taskDay(b), PR.indexOf(prOf(b)), b.createdAt || '']);
    });
    future.sort(function (a, b) { return cmpArr([taskDay(a), a.remindAt || '9', PR.indexOf(prOf(a))], [taskDay(b), b.remindAt || '9', PR.indexOf(prOf(b))]); });
    return { list: groups.high.concat(groups.normal, groups.low), groups: groups, manual: manual, today: todayL, future: future };
  }
  function doneOn(day, uid) {
    return V.tasks.filter(function (t) { return t.assigneeId === uid && t.status === 'done' && isoDay(t.doneAt) === day; })
      .sort(function (a, b) { return (b.doneAt || '').localeCompare(a.doneAt || ''); });
  }

  // ---------------------------------------------------------------- "שלי"
  var CHEER_DONE = ['יישר כח!', 'כל הכבוד, יום פורה!', 'עבודה ברוכה, תודה רבה!', 'מצוין! עוד צעד קדימה.', 'ישר כוחך, רואים את ההשקעה.'];
  // משפטי השראה מושבתים כרגע לפי החלטת דוד (16.11). המשפטים נשמרים בשרת; כדי להחזיר: true
  var SHOW_QUOTES = false;
  function todayQuote() {
    if (!SHOW_QUOTES) return null;
    var q = S.data.quotes || [];
    if (!q.length) return null;
    var n = Math.max(1, (S.data.settings && S.data.settings.quoteDays) || 1);
    return q[Math.floor(dayNum(today()) / n) % q.length];
  }
  function todayCard() {
    var td = today(), d = new Date();
    var box = h('div', { class: 'today-card' });
    box.appendChild(h('div', { class: 'today-date', text: 'יום ' + DAYS[d.getDay()] + ' · ' + hebDate(d.toISOString()) + ' · ' + shortDate(td) }));
    var q = todayQuote();
    if (q) box.appendChild(h('div', { class: 'quote' }, [h('span', { class: 'qt', text: '״' + q.text + '״' }), q.source ? h('span', { class: 'qs', text: ' (' + q.source + ')' }) : null]));
    var n = doneOn(td, S.me.id).length;
    var msg;
    if (n) msg = '✓ היום ביצעת ' + (n === 1 ? 'משימה אחת' : n + ' משימות') + '. ' + CHEER_DONE[dayNum(td) % CHEER_DONE.length] + ' 👏';
    else msg = d.getHours() < 16 ? 'משימה אחת קטנה, וזה כבר מתגלגל. בהצלחה!' : 'מחר יום חדש, בהצלחה!';
    if (d.getDay() === 5) msg += ' שבת שלום ומבורכת! 🕯️';
    box.appendChild(h('div', { class: 'cheer', text: msg }));
    return box;
  }
  function pushCard() {
    if (!pushSupported() || Notification.permission !== 'default' || pushHere()) return null;
    if (Date.now() - sget('pushAsk', 0) < 3 * 864e5) return null;
    return h('div', { class: 'box push-card' }, [
      h('h3', { text: '🔔 התראות לטלפון' }),
      h('p', { text: 'כדי לדעת מיד על משימה חדשה, תגובה ותזכורת, צריך להפעיל התראות במכשיר הזה.' }),
      h('div', { class: 'actions' }, [
        h('button', { class: 'btn', type: 'button', text: 'הפעלת התראות', onclick: function (e) { enablePush(e.currentTarget); } }),
        h('button', { class: 'btn secondary', type: 'button', text: 'לא עכשיו', onclick: function () { sset('pushAsk', Date.now()); render(); } })
      ])
    ]);
  }
  function updatesBox() {
    var list = activity();
    if (!list.length) return null;
    var box = h('div', { class: 'updates' });
    box.appendChild(h('div', { class: 'sec' }, [h('span', { text: '🔔 עדכונים חדשים (' + list.length + ')' }),
      h('button', { class: 'link-btn', type: 'button', text: 'סימון הכל כנקרא', onclick: markAllSeen })]));
    list.slice(0, 8).forEach(function (a) {
      var icon = a.kind === 'nudge' ? '🔔' : a.kind === 'system' ? '' : '💬';
      box.appendChild(h('button', { class: 'upd' + (a.kind === 'nudge' ? ' nudge' : ''), type: 'button', 'data-task': a.taskId, onclick: function () { openTask(a.taskId); } }, [
        h('span', { class: 'upd-text', text: (icon ? icon + ' ' : '') + uname(a.who) + ': ' + a.text }),
        h('span', { class: 'upd-sub', text: a.title + ' · ' + whenShort(a.at) })
      ]));
    });
    return box;
  }
  function viewMine(el) {
    var me = S.me.id;
    el.appendChild(todayCard());
    add(el, pushCard());
    add(el, updatesBox());

    var pend = V.tasks.filter(function (t) { return t.assigneeId === me && t.status === 'pending'; })
      .sort(function (a, b) { return (a.assignedAt || '').localeCompare(b.assignedAt || ''); });
    if (pend.length) {
      el.appendChild(h('div', { class: 'sec' }, [h('span', { text: '📌 ממתינות לאישור שלך (' + pend.length + ')' })]));
      var pl = h('ul', { class: 'list', 'data-list': 'pending' });
      pend.forEach(function (t) { pl.appendChild(card(t, 'pending', false)); });
      el.appendChild(pl);
    }

    var o = myOpen();
    el.appendChild(h('div', { class: 'sec' }, [
      h('span', { text: 'המשימות שלי' }),
      o.manual
        ? h('button', { class: 'link-btn', type: 'button', text: 'סדר אוטומטי', onclick: function () { queue({ type: 'autoOrder' }); toast('הרשימה חזרה לסדר אוטומטי'); } })
        : (o.list.length > 1 ? h('span', { class: 'hint', text: 'גוררים ≡ כדי לשנות סדר' }) : null)
    ]));
    if (o.today.length) {
      el.appendChild(h('div', { class: 'grp-h grp-today', text: '⏰ להיום (' + o.today.length + ')' }));
      var tul = h('ul', { class: 'list grp', 'data-list': 'mine', 'data-group': 'today' });
      o.today.forEach(function (t) { tul.appendChild(card(t, 'today', false)); });
      el.appendChild(tul);
    }
    if (!o.list.length && !o.today.length) {
      el.appendChild(h('div', { class: 'empty' }, [h('div', { class: 'big', text: '🎉' }),
        o.future.length ? 'אין משימות להיום.' : 'אין משימות פתוחות.', h('br'), 'לחצו על + כדי להוסיף משימה.']));
    } else {
      PR.forEach(function (p) {
        var g = o.groups[p];
        if (!g.length) return;
        el.appendChild(h('div', { class: 'grp-h grp-' + p, text: PR_LABEL[p] + ' (' + g.length + ')' }));
        var ul = h('ul', { class: 'list grp', 'data-list': 'mine', 'data-group': p });
        g.forEach(function (t) { ul.appendChild(card(t, 'mine', g.length > 1)); });
        el.appendChild(ul);
      });
    }
    var done = doneOn(today(), me);
    if (done.length) {
      el.appendChild(h('div', { class: 'sec' }, [h('span', { text: 'בוצעו היום (' + done.length + ') 👏' })]));
      var ul2 = h('ul', { class: 'list', 'data-list': 'done' });
      done.forEach(function (t) { ul2.appendChild(card(t, 'mine', false)); });
      el.appendChild(ul2);
    }
    if (o.future.length) {
      var showF = !!sget('showFuture', false);
      el.appendChild(h('button', { class: 'future-btn', type: 'button', 'aria-expanded': showF ? 'true' : 'false', onclick: function () { sset('showFuture', !showF); render(); } },
        [h('span', { text: '📅 משימות עתידיות (' + o.future.length + ')' }), h('span', { class: 'chev', text: showF ? '▴' : '▾' })]));
      if (showF) {
        var ful = h('ul', { class: 'list', 'data-list': 'future' });
        o.future.forEach(function (t) { ful.appendChild(card(t, 'future', false)); });
        el.appendChild(ful);
      }
    }
    var ser = V.series.filter(function (s) { return s.assigneeId === me || s.createdById === me; });
    if (ser.length) {
      el.appendChild(h('div', { class: 'center', style: 'margin-top:14px' },
        h('button', { class: 'link-btn', type: 'button', text: '🔁 משימות חוזרות (' + ser.length + ')', onclick: function () { openSheet(seriesListSheet()); } })));
    }
  }

  // ---------------------------------------------------------------- "נתתי"
  function viewGiven(el) {
    var me = S.me.id;
    var given = V.tasks.filter(function (t) { return t.createdById === me && t.assigneeId !== me; });
    var back = V.tasks.filter(function (t) { return t.createdById === me && (t.status === 'rejected' || t.status === 'returned'); });
    var late = given.filter(acceptLate);
    var waiting = given.filter(function (t) { return t.status === 'pending' && !acceptLate(t); });
    var working = given.filter(function (t) { return t.status === 'open'; }).sort(autoCmp);
    var week = addDays(today(), -7);
    var done = given.filter(function (t) { return t.status === 'done' && isoDay(t.doneAt) >= week; })
      .sort(function (a, b) { return (b.doneAt || '').localeCompare(a.doneAt || ''); });
    function section(title, list, key) {
      if (!list.length) return;
      el.appendChild(h('div', { class: 'sec' }, [h('span', { text: title + ' (' + list.length + ')' })]));
      var ul = h('ul', { class: 'list', 'data-list': key });
      list.forEach(function (t) { ul.appendChild(card(t, 'given', false)); });
      el.appendChild(ul);
    }
    if (!back.length && !late.length && !waiting.length && !working.length) {
      el.appendChild(h('div', { class: 'empty' }, ['אין משימות פתוחות שנתתם לאחרים.', h('br'),
        h('span', { class: 'small', text: 'כדי לתת משימה, לוחצים + ובוחרים "למי".' })]));
    }
    section('↩ חזרו אליך – צריך להחליט', back, 'back');
    section('⏰ עבר יום ועדיין לא אושרו', late, 'late');
    section('ממתינות לאישור', waiting, 'waiting');
    section('התקבלו – בעבודה', working, 'working');
    section('בוצעו בשבוע האחרון', done, 'done');
  }

  // ---------------------------------------------------------------- "צוות" (מנהל)
  function counts(uid) {
    var td = today();
    var open = V.tasks.filter(function (t) { return t.assigneeId === uid && (t.status === 'open' || t.status === 'pending'); });
    return {
      open: open,
      pending: open.filter(function (t) { return t.status === 'pending'; }).length,
      lateAccept: open.filter(acceptLate).length,
      late: open.filter(function (t) { return t.dueDate && t.dueDate < td; }).length,
      doneToday: doneOn(td, uid).length
    };
  }
  function userStatus(u) {
    if (!u.active) return 'לא פעיל';
    if (u.locked) return '🔒 הכניסה נעולה – צריך קוד הזמנה חדש';
    if (!u.hasPin) return u.invitePending ? 'הוזמן, עוד לא נכנס' : 'עוד לא נכנס – צריך קוד הזמנה חדש';
    return '';
  }
  function viewTeam(el) {
    el.appendChild(h('div', { class: 'sec' }, [
      h('span', { text: 'הצוות' }),
      h('button', { class: 'link-btn', type: 'button', text: '+ הוספת עובד', onclick: function () { openSheet(addUserSheet()); } })
    ]));
    var users = V.users.slice().sort(function (a, b) { return (b.active - a.active) || byName(a, b); });
    var totalDone = 0;
    var box = h('div', { class: 'people' });
    users.forEach(function (u) {
      var c = counts(u.id);
      totalDone += c.doneToday;
      var parts = [c.open.length === 1 ? 'משימה פתוחה אחת' : c.open.length + ' פתוחות'];
      if (c.pending) parts.push(c.pending + ' ממתינות לאישור' + (c.lateAccept ? ' (⏰ ' + c.lateAccept + ')' : ''));
      if (c.late) parts.push(c.late + ' באיחור');
      if (c.doneToday) parts.push('✓ ' + c.doneToday + ' בוצעו היום');
      var st = userStatus(u);
      box.appendChild(h('button', {
        class: 'person' + (u.active ? '' : ' off'), type: 'button', 'data-user': u.id,
        onclick: function () { openSheet(userSheet(u.id)); }
      }, [
        h('span', { class: 'avatar', text: (u.name || '?').charAt(0) }),
        h('span', { class: 'grow' }, [
          h('span', { class: 'pname' }, [u.name, u.role === 'manager' ? h('span', { class: 'role', text: 'מנהל' }) : null,
            u.active && !u.hasPush ? h('span', { class: 'role muted-role', text: 'בלי התראות' }) : null]),
          u.active ? h('span', { class: 'stats', text: parts.join(' · ') }) : null,
          st ? h('span', { class: 'pstatus', text: st }) : null
        ]),
        h('span', { class: 'chev', text: '‹' })
      ]));
    });
    el.appendChild(h('div', { class: 'team-sum', text: totalDone ? '✓ היום בוצעו בצוות ' + (totalDone === 1 ? 'משימה אחת' : totalDone + ' משימות') + '. יישר כח לכולם!' : 'היום עוד לא סומנו משימות כבוצעו.' }));
    el.appendChild(box);
  }

  // ---------------------------------------------------------------- "היסטוריה"
  var H = { q: '', userId: '', res: null, key: '', loading: false, timer: 0, more: false, offset: 0 };
  function histKeep() {
    var a = document.activeElement;
    return a && a.id === 'histQ' ? { pos: a.selectionStart } : null;
  }
  function histLocal() {
    var q = H.q.toLowerCase();
    return V.tasks.filter(function (t) {
      return (t.status === 'done' || t.status === 'cancelled') && (!H.userId || t.assigneeId === H.userId) &&
        (!q || (t.title + ' ' + (t.note || '')).toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return (b.doneAt || b.updatedAt || '').localeCompare(a.doneAt || a.updatedAt || ''); });
  }
  function histFetch(more) {
    var key = H.q + '|' + H.userId;
    if (!more) H.offset = 0;
    H.loading = true;
    api('history', { q: H.q, userId: H.userId, offset: H.offset }).then(function (r) {
      H.loading = false;
      if (key !== H.q + '|' + H.userId) return;
      if (r.ok) {
        H.res = more && H.key === key ? (H.res || []).concat(r.tasks) : r.tasks;
        H.more = r.more;
        H.offset += r.tasks.length;
      } else if (!more) { H.res = null; H.more = false; } // בלי חיבור: מציגים מה שיש במכשיר
      H.key = key;
      if (S.tab === 'history') render();
    });
  }
  function viewHistory(el, keep) {
    var qi = h('input', { type: 'text', id: 'histQ', placeholder: '🔍 חיפוש במשימות שבוצעו או בוטלו', value: H.q, 'aria-label': 'חיפוש' });
    qi.addEventListener('input', function () {
      H.q = qi.value.trim();
      clearTimeout(H.timer);
      H.timer = setTimeout(function () { histFetch(false); render(); }, 450);
    });
    var bar = h('div', { class: 'hist-bar' }, qi);
    if (isMgr()) {
      var sel = h('select', { 'aria-label': 'עובד' });
      sel.appendChild(h('option', { value: '', text: 'כל העובדים' }));
      V.users.slice().sort(byName).forEach(function (u) { sel.appendChild(h('option', { value: u.id, text: u.name })); });
      sel.value = H.userId;
      sel.addEventListener('change', function () { H.userId = sel.value; histFetch(false); render(); });
      bar.appendChild(sel);
    }
    el.appendChild(bar);
    if (keep) { setTimeout(function () { qi.focus(); try { qi.setSelectionRange(keep.pos, keep.pos); } catch (e) { /* לא חשוב */ } }, 0); }
    var key = H.q + '|' + H.userId;
    if (H.key !== key && !H.loading) histFetch(false);
    var list = H.key === key && H.res ? H.res : histLocal();
    if (!list.length) {
      el.appendChild(h('div', { class: 'empty', text: H.loading ? 'מחפש…' : (H.q ? 'לא נמצאו משימות.' : 'עוד אין משימות שבוצעו.') }));
      return;
    }
    var ul = h('ul', { class: 'list', 'data-list': 'history' });
    list.forEach(function (t) { ul.appendChild(card(t, 'history', false)); });
    el.appendChild(ul);
    if (H.more && H.key === key) {
      el.appendChild(h('div', { class: 'center' }, h('button', { class: 'btn secondary', type: 'button', text: 'עוד מהעבר', onclick: function () { histFetch(true); } })));
    }
  }

  // ---------------------------------------------------------------- כרטיס משימה
  function chip(text, cls) { return h('span', { class: 'chip' + (cls ? ' ' + cls : ''), text: text }); }

  function card(t, mode, draggable) {
    var me = S.me.id;
    var li = h('li', { class: 'task p-' + prOf(t) + ' is-' + t.status, 'data-id': t.id });
    var canCheck = (t.status === 'open' || t.status === 'done') && mode !== 'history' && mode !== 'pending';
    var check = h('button', {
      class: 'check', type: 'button', 'aria-label': t.status === 'done' ? 'החזרה לפתוחות' : 'סימון כבוצע'
    }, h('span', { class: 'ring', text: t.status === 'done' ? '✓' : '' }));
    if (canCheck) check.addEventListener('click', function (e) { e.stopPropagation(); toggleDone(t.id); });
    else check.disabled = true;

    var meta = h('div', { class: 'meta' });
    var active = t.status === 'open' || t.status === 'pending';
    var nowIso = new Date().toISOString(), td = today();
    if (mode === 'today' && t.remindAt && remindDay(t) <= td) { // ברשימת "להיום": השעה בולטת, ואדומה כשהגיע הזמן
      var due = t.remindAt <= nowIso;
      meta.appendChild(chip('⏰ ' + (remindDay(t) === td ? timeOf(t.remindAt) : whenLabel(t.remindAt)) + (due ? ' · הגיע הזמן' : ''), due ? 'late' : 'remind'));
    }
    if (t.priority === 'high' && active && mode !== 'mine') meta.appendChild(chip('דחוף', 'urgent'));
    if (t.dueDate && active && !(mode === 'today' && t.dueDate === td)) { var d = dueLabel(t.dueDate); meta.appendChild(chip(d.text, d.cls)); }
    if (mode !== 'today' && t.remindAt && !t.remindSent && active && t.remindAt > nowIso) meta.appendChild(chip('⏰ ' + (remindDay(t) === t.dueDate ? timeOf(t.remindAt) : whenLabel(t.remindAt)), 'remind'));
    if (t.seriesId) meta.appendChild(chip('🔁', ''));
    if ((mode === 'mine' || mode === 'pending' || mode === 'today' || mode === 'future') && t.createdById !== me) meta.appendChild(chip('מאת ' + uname(t.createdById), ''));
    if (mode === 'given' || (mode === 'history' && t.assigneeId !== me)) meta.appendChild(chip('אצל ' + uname(t.assigneeId), ''));
    if (mode === 'team' && t.createdById !== t.assigneeId) meta.appendChild(chip('מאת ' + uname(t.createdById), ''));
    if (mode === 'given' || mode === 'team') {
      if (t.status === 'pending') meta.appendChild(acceptLate(t) ? chip('⏰ עבר יום ועדיין לא אושרה', 'late') : chip('ממתינה לאישור', 'pend'));
      if (t.status === 'pending' && t.notifyAt) meta.appendChild(chip('🔕 התראה אליו ' + whenLabel(t.notifyAt), 'remind'));
      if (t.status === 'rejected') meta.appendChild(chip('✗ לא התקבלה: ' + t.reason, 'late'));
      if (t.status === 'returned') meta.appendChild(chip('↩ הוחזרה: ' + t.reason, 'late'));
    }
    if (t.status === 'open') { var a = ageInfo(t); if (a.short) { var ac = chip(a.short, a.cls); ac.title = a.text; ac.setAttribute('aria-label', a.text); meta.appendChild(ac); } }
    if (t.status === 'done' && mode !== 'mine') {
      var took = dayDiff(isoDay(t.createdAt), isoDay(t.doneAt));
      meta.appendChild(chip('✓ בוצעה ' + whenShort(t.doneAt) + (mode === 'history' ? ' · ' + (took <= 0 ? 'באותו יום' : 'תוך ' + daysWord(took)) : ''), 'okc'));
    }
    if (t.status === 'cancelled') meta.appendChild(chip('בוטלה', ''));
    if (t.note) meta.appendChild(chip('📝', ''));
    var fl = (V.files[t.id] || []).concat(S.ups.filter(function (u) { return u.taskId === t.id; }));
    if (fl.some(function (f) { return f.kind === 'image'; })) meta.appendChild(chip('📷', ''));
    if (fl.some(function (f) { return f.kind === 'audio'; })) meta.appendChild(chip('🎤', ''));
    if (fl.some(function (f) { return f.kind === 'pdf' || f.kind === 'doc'; })) meta.appendChild(chip('📄', ''));
    var nc = (V.comments[t.id] || []).filter(function (c) { return c.kind !== 'system'; }).length;
    var un = unreadComments(t);
    if (un) meta.appendChild(chip(un === 'c' ? '💬 חדש' : '● עדכון חדש', 'newc'));
    else if (nc) meta.appendChild(chip('💬 ' + nc, ''));
    if (V.pending[t.id]) meta.appendChild(chip('⏳ ממתין לשמירה', 'pend'));

    var prName = { high: 'דחוף', normal: 'רגיל', low: 'לא דחוף' }[prOf(t)];
    var body = h('div', { class: 'body' }, [h('div', { class: 'ttl' }, [h('span', { class: 'pdot p-' + prOf(t), title: prName, 'aria-label': prName }), t.title]), meta]);
    add(li, [check, body]);
    if (mode === 'pending') {
      body.appendChild(h('div', { class: 'card-acts' }, [
        h('button', { class: 'btn small-btn ok', type: 'button', text: '✓ מקבל/ת', onclick: function (e) { e.stopPropagation(); acceptTask(t.id); } }),
        h('button', { class: 'btn small-btn secondary', type: 'button', text: '✗ לא יכול/ה', onclick: function (e) { e.stopPropagation(); openSheet(reasonSheet(t.id, 'reject')); } })
      ]));
    }
    if (mode === 'given' && t.status === 'pending' && acceptLate(t)) {
      body.appendChild(h('div', { class: 'card-acts' }, h('button', { class: 'btn small-btn secondary', type: 'button', text: '🔔 הקפצה', onclick: function (e) { e.stopPropagation(); openSheet(nudgeSheet(t.id)); } })));
    }
    if (draggable) {
      var hd = h('button', { class: 'handle', type: 'button', 'aria-label': 'גרירה לשינוי הסדר', text: '≡' });
      hd.addEventListener('pointerdown', startDrag);
      hd.addEventListener('click', function (e) { e.stopPropagation(); });
      li.appendChild(hd);
    }
    li.addEventListener('click', function () { openTask(t.id); });
    return li;
  }

  function openTask(id) {
    markSeen(id);
    if (!task(id) && !(H.res || []).some(function (t) { return t.id === id; })) {
      sync(true).then(function () { openSheet(taskSheet(id)); });
      return;
    }
    openSheet(taskSheet(id));
  }

  var CHEERS = ['כל הכבוד! ✓', 'יישר כח! 👏', 'מצוין, בוצע ✓', 'עוד אחת מאחוריך 💪', 'בוצע. תודה! ✓'];
  function toggleDone(id) {
    var t = task(id);
    if (!t) return;
    if (t.status === 'open' || t.status === 'pending') {
      queue({ type: 'done', id: id });
      toast(CHEERS[Math.floor(Math.random() * CHEERS.length)], 'ביטול', function () { queue({ type: 'reopen', id: id }); });
    } else if (t.status === 'done') {
      queue({ type: 'reopen', id: id });
      toast('המשימה חזרה לפתוחות');
    }
  }
  function acceptTask(id) {
    queue({ type: 'accept', id: id });
    toast('המשימה התקבלה ✓ היא ברשימה שלך.');
  }

  /** "לראש הרשימה": לראש הקבוצה שלה (לפי דחיפות). */
  function moveToTop(id) {
    var o = myOpen(), t = task(id);
    var g = o.groups[prOf(t)].map(function (x) { return x.id; }).filter(function (x) { return x !== id; });
    g.unshift(id);
    var ids = [];
    PR.forEach(function (p) { ids = ids.concat(p === prOf(t) ? g : o.groups[p].map(function (x) { return x.id; })); });
    queue({ type: 'order', ids: ids });
  }

  // ---------------------------------------------------------------- גרירה לשינוי סדר (בתוך קבוצת הדחיפות)
  function startDrag(e) {
    if (e.button) return;
    e.preventDefault();
    e.stopPropagation();
    var hd = e.currentTarget, li = hd.closest('li'), list = li.parentNode;
    var items = Array.prototype.slice.call(list.children);
    var from = items.indexOf(li), to = from;
    var tops = items.map(function (x) { return x.offsetTop; });
    var hs = items.map(function (x) { return x.offsetHeight; });
    var gap = items.length > 1 ? Math.max(0, tops[1] - tops[0] - hs[0]) : 8;
    var step = hs[from] + gap;
    var y0 = e.clientY + window.scrollY, lastY = e.clientY, raf = 0;
    try { hd.setPointerCapture(e.pointerId); } catch (x) { /* לא נתמך */ }
    S.dragging = true;
    li.classList.add('dragging');
    list.classList.add('drag-on');

    function place() {
      var dy = lastY + window.scrollY - y0;
      li.style.transform = 'translateY(' + dy + 'px)';
      var center = tops[from] + hs[from] / 2 + dy;
      to = 0;
      for (var i = 0; i < items.length; i++) if (i !== from && tops[i] + hs[i] / 2 < center) to++;
      items.forEach(function (it, i) {
        if (i === from) return;
        var s = (from < to && i > from && i <= to) ? -step : (from > to && i >= to && i < from) ? step : 0;
        it.style.transform = s ? 'translateY(' + s + 'px)' : '';
      });
    }
    function edgeScroll() {
      var edge = lastY < 70 ? -1 : lastY > window.innerHeight - 70 ? 1 : 0;
      if (edge) { window.scrollBy(0, edge * 10); place(); raf = requestAnimationFrame(edgeScroll); } else raf = 0;
    }
    function move(ev) { lastY = ev.clientY; place(); if (!raf) raf = requestAnimationFrame(edgeScroll); }
    function up() {
      hd.removeEventListener('pointermove', move);
      hd.removeEventListener('pointerup', up);
      hd.removeEventListener('pointercancel', up);
      cancelAnimationFrame(raf);
      items.forEach(function (it) { it.style.transform = ''; });
      li.classList.remove('dragging');
      list.classList.remove('drag-on');
      S.dragging = false;
      if (to !== from) {
        var g = items.map(function (x) { return x.getAttribute('data-id'); });
        g.splice(from, 1);
        g.splice(to, 0, li.getAttribute('data-id'));
        var o = myOpen(), grp = list.getAttribute('data-group'), ids = [];
        PR.forEach(function (p) { ids = ids.concat(p === grp ? g : o.groups[p].map(function (x) { return x.id; })); });
        queue({ type: 'order', ids: ids });
      } else if (S.renderLater) { S.renderLater = false; render(); }
    }
    hd.addEventListener('pointermove', move);
    hd.addEventListener('pointerup', up);
    hd.addEventListener('pointercancel', up);
  }

  // ================================================================ חלונות
  // כל חלון: {b: הפונקציה שבונה אותו, node: התוכן שנבנה, y: מיקום הגלילה}.
  // חלון שמתחת לחלון אחר נשמר כמו שהוא (עם מה שהוקלד בו), ולא נבנה מחדש כשחוזרים אליו.
  var stack = [];
  function topSheet() { return stack[stack.length - 1]; }
  function openSheet(builder) {
    var t = topSheet();
    if (t) t.y = $('sheetBox').scrollTop;
    stack.push({ b: builder, node: null, y: 0 });
    try { history.pushState({ sheet: stack.length }, ''); } catch (e) { /* לא נתמך */ }
    showTop(true);
  }
  function replaceSheet(builder) { stack[stack.length - 1] = { b: builder, node: null, y: 0 }; showTop(true); }
  // כל חלון פתוח = רשומה אחת בהיסטוריה (כדי שכפתור "חזרה" בטלפון יסגור אותו).
  // סוגרים מיד, ואז מסירים את הרשומה; skipPop מונע סגירה כפולה (ויציאה מהאפליקציה בלחיצה כפולה).
  var skipPop = 0;
  function closeAll() {
    var n = history.state && history.state.sheet ? Math.min(stack.length, history.state.sheet) : 0;
    while (stack.length) stack.pop();
    showTop();
    if (n) { skipPop++; try { history.go(-n); } catch (e) { skipPop--; } }
  }
  function closeSheet() {
    if (!stack.length) return;
    var hadEntry = !!(history.state && history.state.sheet);
    stack.pop();
    showTop();
    if (hadEntry) { skipPop++; try { history.back(); } catch (e) { skipPop--; } }
  }
  function mount(t) {
    var host = $('sheet');
    while (host.firstChild) host.removeChild(host.firstChild);
    host.appendChild(t.node);
    Array.prototype.forEach.call(t.node.querySelectorAll('textarea[data-keep]'), function (x) { grow(x, 160); });
  }
  /** בונה מחדש חלון שמציג נתונים (פרטי משימה), ושומר טקסט שהתחילו להקליד בו. מחזיר איזה שדה היה בפוקוס. */
  function rebuild(t) {
    var keep = {}, act = document.activeElement, focusKey = '';
    if (t.node) {
      if (t.node.contains(act) && act.getAttribute) focusKey = act.getAttribute('data-keep') || '';
      Array.prototype.forEach.call(t.node.querySelectorAll('[data-keep]'), function (x) { keep[x.getAttribute('data-keep')] = x.value; });
    }
    t.node = h('div');
    t.focusEl = t.b(t.node);
    Object.keys(keep).forEach(function (k) { var x = t.node.querySelector('[data-keep="' + k + '"]'); if (x) x.value = keep[k]; });
    return focusKey;
  }
  function showTop(focus) {
    var wrap = $('sheetWrap'), box = $('sheetBox');
    stopRecording();
    if (!stack.length) {
      wrap.classList.add('hidden');
      $('sheet').textContent = '';
      document.body.classList.remove('noscroll');
      if (S.token && S.me && !$('app').classList.contains('hidden')) renderView(); // למשל: עדכון שנקרא יורד מהרשימה
      return;
    }
    wrap.classList.remove('hidden');
    document.body.classList.add('noscroll');
    var t = topSheet(), fresh = !t.node;
    if (fresh || t.b.live) rebuild(t); // חלון חדש נבנה; חלון נתונים מתעדכן; טופס נשאר כמו שהיה
    mount(t);
    if (fresh) {
      box.scrollTop = 0;
      if (focus && t.focusEl && t.focusEl.focus) t.focusEl.focus();
    } else box.scrollTop = t.y || 0;
  }
  /** חלון שמציג נתונים מתעדכן; טקסט שהתחילו להקליד בו נשמר. חלון עם טופס לא נוגעים בו. */
  function refreshSheet() {
    var t = topSheet();
    if (!t || !t.b.live || !t.node) return;
    var box = $('sheetBox');
    if (Array.prototype.some.call(t.node.querySelectorAll('audio'), function (a) { return !a.paused; })) return; // לא קוטעים השמעה
    var y = box.scrollTop;
    var focusKey = rebuild(t);
    mount(t);
    box.scrollTop = y;
    if (focusKey) { var f = t.node.querySelector('[data-keep="' + focusKey + '"]'); if (f) f.focus(); }
  }
  window.addEventListener('popstate', function () {
    if (skipPop) { skipPop--; return; }
    if (stack.length) { stack.pop(); showTop(); }
  });

  function sheetHead(el, title) {
    el.appendChild(h('div', { class: 'sheet-head' }, [
      h('h2', { text: title }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'סגירה', text: '✕', onclick: closeSheet })
    ]));
  }
  function live(fn) { fn.live = true; return fn; }

  // ---------------------------------------------------------------- תיבות טקסט שגדלות
  function grow(ta, max) {
    if (!ta.offsetParent) return; // מוסתרת: נחשב כשתוצג
    ta.style.height = 'auto';
    var need = ta.scrollHeight + 2;
    ta.style.height = Math.min(need, max) + 'px';
    ta.style.overflowY = need > max ? 'auto' : 'hidden';
  }
  function noteMax() { return Math.max(120, Math.round((window.visualViewport ? visualViewport.height : window.innerHeight) * 0.4)); }

  // ---------------------------------------------------------------- פרטי משימה
  function ruleText(r) {
    if (!r) return '';
    switch (r.t) {
      case 'daily': return 'כל יום, ראשון עד ' + (r.fri ? 'שישי' : 'חמישי');
      case 'weekly': return r.days.length === 1 ? 'כל יום ' + DAYS[r.days[0]] : 'כל שבוע: ' + r.days.map(function (d) { return DAYS[d]; }).join(', ');
      case 'monthly': return 'כל ' + r.d + ' בחודש';
      case 'hmonthly': return 'כל ' + gim(r.d) + ' בחודש העברי';
      case 'yearly': return 'כל שנה ב-' + r.d + ' ב' + MONTHS[r.m - 1];
      case 'hyearly': return 'כל שנה ב' + gim(r.d) + ' ב' + HEB_NAME[r.m];
    }
    return '';
  }

  function taskSheet(id) {
    var fn = taskSheetBuilder(id);
    fn.taskId = id;
    return fn;
  }
  function taskSheetBuilder(id) {
    return live(function (el) {
      var t = task(id) || (H.res || []).filter(function (x) { return x.id === id; })[0];
      if (!t) { sheetHead(el, 'המשימה לא נמצאה'); el.appendChild(h('p', { text: 'ייתכן שהיא נמחקה.' })); return; }
      markSeen(id);
      var me = S.me.id, mgr = isMgr();
      var isCreator = t.createdById === me, isAssignee = t.assigneeId === me;
      var canEdit = mgr || isCreator;
      sheetHead(el, t.title);

      var status;
      if (t.status === 'done') {
        var took = dayDiff(isoDay(t.createdAt), isoDay(t.doneAt));
        status = '✓ בוצעה ' + whenShort(t.doneAt) + (t.doneById && t.doneById !== t.assigneeId ? ' (סימן ' + uname(t.doneById) + ')' : '') +
          ' · ' + (took <= 0 ? 'באותו יום' : 'תוך ' + daysWord(took));
      } else if (t.status === 'cancelled') status = 'המשימה בוטלה';
      else {
        var bits = [t.priority === 'high' ? '🔴 דחוף' : t.priority === 'low' ? '⚪ לא דחוף' : '🟡 רגיל'];
        if (t.status === 'pending') bits.push(acceptLate(t) ? '⏰ עבר יום ועדיין לא אושרה' : 'ממתינה לאישור');
        if (t.dueDate) bits.push(dueLabel(t.dueDate).text + ' (' + shortDate(t.dueDate) + ')');
        if (t.status === 'open') bits.push(ageInfo(t).text);
        status = bits.join(' · ');
      }
      el.appendChild(h('div', { class: 'status-line', text: status }));
      if (t.status === 'rejected' || t.status === 'returned') {
        el.appendChild(h('div', { class: 'msg bad', text: (t.status === 'rejected' ? '✗ ' + uname(t.assigneeId) + ' לא יכול/ה לקבל: ' : '↩ ' + uname(t.assigneeId) + ' החזיר/ה: ') + t.reason }));
      }
      el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: 'אחראי: ' }), isAssignee ? 'אני' : uname(t.assigneeId)]));
      el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: 'נוצרה: ' }),
        fullDate(t.createdAt) + ' (' + hebDate(t.createdAt) + ')' + (isCreator ? '' : ' · ע״י ' + uname(t.createdById))]));
      if (t.remindAt && isActive(t)) {
        el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: '⏰ תזכורת: ' }), whenLabel(t.remindAt) + (t.remindSent ? ' (נשלחה)' : '')]));
      }
      if (t.notifyAt && t.status === 'pending' && !isAssignee) {
        el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: '🔕 התראה אליו: ' }), whenLabel(t.notifyAt) + ' (המשימה כבר מופיעה אצלו באפליקציה)']));
      }
      var ser = t.seriesId ? seriesById(t.seriesId) : null;
      if (t.seriesId) el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: '🔁 חוזרת: ' }), ser ? ruleText(ser.rule) : 'החזרה הופסקה']));
      if (t.note) el.appendChild(h('div', { class: 'note-box', text: t.note }));
      if (V.pending[t.id]) el.appendChild(h('div', { class: 'msg bad', text: '⏳ השינוי האחרון עוד לא נשמר בשרת. הוא שמור בטלפון ויישלח כשיהיה חיבור.' }));

      // פעולות
      var acts = h('div', { class: 'actions' });
      var btn = function (cls, text, fn) { acts.appendChild(h('button', { class: 'btn ' + cls, type: 'button', text: text, onclick: fn })); };
      if (t.status === 'pending' && isAssignee) {
        btn('ok', '✓ מקבל/ת את המשימה', function () { acceptTask(id); });
        btn('secondary', '✗ לא יכול/ה לקבל', function () { openSheet(reasonSheet(id, 'reject')); });
      } else if (t.status === 'open') {
        btn('ok', '✓ בוצע', function () { closeSheet(); toggleDone(id); });
        if (isAssignee && !taskDay(t) && myOpen().list.length > 1 && myOpen().groups[prOf(t)][0] && myOpen().groups[prOf(t)][0].id !== id) {
          btn('secondary', '⬆ לראש הרשימה', function () { moveToTop(id); closeSheet(); toast('הועברה לראש הקבוצה'); });
        }
        if (isAssignee && !isCreator) btn('secondary', '↩ החזרה למי שנתן', function () { openSheet(reasonSheet(id, 'return')); });
      } else if (t.status === 'done') {
        btn('secondary', 'החזרה לפתוחות', function () { queue({ type: 'reopen', id: id }); toast('המשימה חזרה לפתוחות'); });
      } else if (t.status === 'cancelled' && canEdit) {
        btn('secondary', 'שחזור המשימה', function () { queue({ type: 'reopen', id: id }); toast('המשימה שוחזרה'); });
      }
      if ((t.status === 'rejected' || t.status === 'returned') && canEdit) {
        btn('', '↪ להעביר / לשלוח שוב', function () { openSheet(assignSheet(id)); });
        btn('secondary', 'לקחת לעצמי', function () { queue({ type: 'update', id: id, fields: { assigneeId: me } }); toast('המשימה עברה אליך'); });
      }
      if (canEdit && !isAssignee && (t.status === 'pending' || t.status === 'open')) {
        btn('secondary', '🔔 הקפצה', function () { openSheet(nudgeSheet(id)); });
      }
      if (canEdit && isActive(t)) btn('secondary', '✎ עריכה', function () { openSheet(editSheet(id)); });
      else if (isAssignee && (t.status === 'open' || t.status === 'pending')) btn('secondary', '⏰ תזכורת', function () { openSheet(remindSheet(id)); });
      if (canEdit && isActive(t)) {
        btn('danger', 'ביטול המשימה', function () {
          queue({ type: 'cancel', id: id });
          closeSheet();
          toast('המשימה בוטלה', 'שחזור', function () { queue({ type: 'reopen', id: id }); });
        });
      }
      el.appendChild(acts);

      el.appendChild(filesBox(t));
      el.appendChild(commentsBox(t));

      if (ser && (mgr || ser.createdById === me)) {
        el.appendChild(h('button', {
          class: 'danger-link', type: 'button', text: '🔁 עצירת החזרה (ההופעות שכבר נוצרו נשארות)', onclick: function () {
            if (!window.confirm('לעצור את החזרה של "' + ser.title + '"?\nלא ייווצרו יותר הופעות חדשות.')) return;
            queue({ type: 'stopSeries', id: ser.id });
            toast('החזרה נעצרה');
          }
        }));
      }
      if (mgr) {
        el.appendChild(h('button', {
          class: 'danger-link', type: 'button', text: 'מחיקה לצמיתות (מנהל)', onclick: function () {
            if (!window.confirm('למחוק את המשימה לצמיתות? אי אפשר לשחזר. (ביטול משימה משאיר אותה בהיסטוריה.)')) return;
            queue({ type: 'delete', id: id });
            closeSheet();
            toast('המשימה נמחקה');
          }
        }));
      }
    });
  }

  // ---------------------------------------------------------------- קבצים במשימה
  function fileView(f, pending) {
    var box = h('div', { class: 'file' + (f.kind === 'image' ? ' img' : '') });
    var status = h('div', { class: 'small' });
    if (f.kind === 'image') {
      var img = h('img', { alt: 'תמונה', class: 'thumb' });
      img.addEventListener('click', function () { if (img.src) openSheet(imageSheet(img.src)); });
      box.appendChild(img);
      if (blobUrl[f.id || f.fid]) img.src = blobUrl[f.id || f.fid];
      else if (!pending) { status.textContent = 'טוען…'; fileUrl(f).then(function (u) { img.src = u; status.textContent = ''; }, function (e) { status.textContent = e.message; }); }
    } else if (f.kind === 'audio') {
      var au = h('audio', { controls: true, preload: 'none' });
      box.appendChild(h('div', { class: 'fname', text: '🎤 הקלטה' + (f.dur ? ' (' + f.dur + ' שניות)' : '') }));
      box.appendChild(au);
      if (blobUrl[f.id || f.fid]) au.src = blobUrl[f.id || f.fid];
      else if (!pending) {
        var load = h('button', { class: 'btn small-btn secondary', type: 'button', text: '▶ טעינה והשמעה', onclick: function () {
          busy(load, true, 'טוען…');
          fileUrl(f).then(function (u) { load.remove(); au.src = u; au.play().catch(function () {}); }, function (e) { busy(load, false); status.textContent = e.message; });
        } });
        box.insertBefore(load, au);
      }
    } else {
      var a = h('a', { class: 'fname', href: '#', text: '📄 ' + (f.name || 'קובץ') });
      a.addEventListener('click', function (e) {
        e.preventDefault();
        status.textContent = 'טוען…';
        fileUrl(f).then(function (u) {
          status.textContent = '';
          if (f.kind === 'pdf') { window.open(u, '_blank'); return; }
          // Word/Excel/PowerPoint: הורדה עם השם המקורי, כדי שהטלפון יפתח אותו באפליקציה המתאימה
          var dl = h('a', { href: u, download: f.name || 'קובץ', class: 'hidden' });
          document.body.appendChild(dl);
          dl.click();
          setTimeout(function () { dl.remove(); }, 1000);
        }, function (er) { status.textContent = er.message; });
      });
      box.appendChild(a);
    }
    var sub = pending ? '⏳ ממתין להעלאה' : uname(f.by) + ' · ' + whenShort(f.at);
    box.appendChild(h('div', { class: 'small', text: sub }));
    box.appendChild(status);
    if (!pending && (isMgr() || f.by === S.me.id)) {
      box.appendChild(h('button', { class: 'link-btn del-file', type: 'button', text: 'הסרה', onclick: function () {
        if (!window.confirm('להסיר את הקובץ מהמשימה?')) return;
        queue({ type: 'delFile', id: f.id });
      } }));
    }
    return box;
  }
  function filesBox(t) {
    var wrap = h('div', { class: 'files-box' });
    var list = V.files[t.id] || [], pend = S.ups.filter(function (u) { return u.taskId === t.id; });
    if (list.length || pend.length) {
      wrap.appendChild(h('div', { class: 'sec' }, [h('span', { text: 'קבצים (' + (list.length + pend.length) + ')' })]));
      var g = h('div', { class: 'files' });
      list.forEach(function (f) { g.appendChild(fileView(f, false)); });
      pend.forEach(function (u) { g.appendChild(fileView(u, true)); });
      wrap.appendChild(g);
    }
    if (t.status !== 'cancelled') {
      wrap.appendChild(attachButtons(function (a) { queueUpload(t.id, a); toast(a.kind === 'audio' ? 'ההקלטה נוספה ✓' : 'הקובץ נוסף ✓'); }));
    }
    return wrap;
  }
  function hasCamera() { return IS_IOS || IS_ANDROID || !!window.TT_FORCE_PHONE; }
  /** כפתורי צירוף: בטלפון "צילום" (פותח את המצלמה ישר), "גלריה" ו"קובץ"; במחשב "תמונה או קובץ". ועוד "הקלטה". */
  function pickers(onAttach, btnClass) {
    function inp(accept, capture) {
      var i = h('input', { type: 'file', accept: accept, multiple: capture ? null : true, capture: capture || null, class: 'hidden', 'aria-label': 'בחירת קובץ' });
      i.addEventListener('change', function () {
        var files = Array.prototype.slice.call(i.files || []);
        i.value = '';
        files.forEach(function (f) { makeAttachment(f).then(onAttach, function (e) { toast(e.message); }); });
      });
      return i;
    }
    var out = [];
    if (hasCamera()) {
      var cam = inp('image/*', 'environment'), gal = inp('image/*');
      out.push(cam, h('button', { class: btnClass, type: 'button', text: '📷 צילום', onclick: function () { cam.click(); } }));
      out.push(gal, h('button', { class: btnClass, type: 'button', text: '🖼️ גלריה', onclick: function () { gal.click(); } }));
      var doc = inp(DOC_ACCEPT);
      out.push(doc, h('button', { class: btnClass, type: 'button', text: '📎 קובץ', onclick: function () { doc.click(); } }));
    } else {
      var any = inp('image/*,audio/*,' + DOC_ACCEPT);
      out.push(any, h('button', { class: btnClass, type: 'button', text: '📎 תמונה או קובץ', onclick: function () { any.click(); } }));
    }
    out.push(h('button', { class: btnClass, type: 'button', text: '🎤 הקלטה', onclick: function () { openSheet(recordSheet(onAttach)); } }));
    return out;
  }
  function attachButtons(onAttach) {
    return h('div', { class: 'attach' }, pickers(onAttach, 'btn small-btn secondary'));
  }
  function imageSheet(src) {
    return function (el) {
      sheetHead(el, 'תמונה');
      el.appendChild(h('img', { src: src, class: 'full-img', alt: 'תמונה' }));
    };
  }

  // ---------------------------------------------------------------- תגובות
  function commentsBox(t) {
    var me = S.me.id;
    var wrap = h('div', { class: 'comments' });
    var list = V.comments[t.id] || [];
    wrap.appendChild(h('div', { class: 'sec' }, [h('span', { text: 'תגובות ועדכונים' + (list.length ? ' (' + list.length + ')' : '') })]));
    list.forEach(function (c) {
      var mine = c.userId === me;
      wrap.appendChild(h('div', { class: 'cmt ' + (c.kind || 'comment') + (mine ? ' mine' : '') }, [
        h('div', { class: 'cmt-h', text: (mine ? 'אני' : uname(c.userId)) + ' · ' + whenShort(c.at) + (c.kind === 'nudge' ? ' · 🔔 הקפצה' : '') }),
        h('div', { class: 'cmt-t', text: c.text })
      ]));
    });
    if (t.status === 'cancelled') return wrap;
    var ta = h('textarea', { class: 'cmt-input', rows: '1', maxlength: '1000', placeholder: 'כתיבת תגובה…', 'data-keep': 'c-' + t.id, 'aria-label': 'תגובה' });
    ta.addEventListener('input', function () { grow(ta, 160); });
    var send = h('button', { class: 'btn small-btn', type: 'button', text: 'שליחה', onclick: function () {
      var v = ta.value.trim();
      if (!v) { ta.focus(); return; }
      ta.value = '';
      queue({ type: 'comment', id: t.id, cid: rid(), text: v });
      toast('התגובה נשלחה ✓');
    } });
    wrap.appendChild(h('div', { class: 'cmt-new' }, [ta, send]));
    return wrap;
  }

  // ---------------------------------------------------------------- דחייה / החזרה / הקפצה / העברה / תזכורת
  function reasonSheet(id, type) {
    return function (el) {
      var t = task(id);
      sheetHead(el, type === 'reject' ? 'לא יכול/ה לקבל את המשימה' : 'החזרת המשימה');
      if (t) el.appendChild(h('p', { class: 'small', text: '"' + t.title + '" – ' + uname(t.createdById) + ' יקבל/תקבל את הסיבה ויחליט/תחליט מה לעשות.' }));
      var ta = h('textarea', { maxlength: '300', placeholder: type === 'reject' ? 'למה? (למשל: אני לא בעבודה השבוע)' : 'למה? (למשל: לא אספיק השבוע)', 'aria-label': 'סיבה' });
      el.appendChild(h('div', { class: 'field' }, ta));
      el.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn block', type: 'button', text: 'שליחה', onclick: function () {
        var v = ta.value.trim();
        if (!v) { toast(ERR.no_reason); ta.focus(); return; }
        queue({ type: type, id: id, reason: v });
        closeAll();
        toast(type === 'reject' ? 'נשלח. המשימה חזרה למי שנתן אותה.' : 'המשימה הוחזרה.');
      } })));
      return ta;
    };
  }

  var NUDGES = ['מה קורה עם זה?', 'אפשר עדכון?', 'תזכורת ידידותית 🙂'];
  function waLink(uid, text) {
    var u = user(uid) || {};
    return 'https://wa.me/' + (u.phone || '') + '?text=' + encodeURIComponent(text);
  }
  function nudgeSheet(id) {
    return function (el) {
      var t = task(id);
      if (!t) { sheetHead(el, 'המשימה לא נמצאה'); return; }
      var u = user(t.assigneeId) || {};
      sheetHead(el, '🔔 הקפצה ל' + uname(t.assigneeId));
      el.appendChild(h('p', { class: 'small', text: '"' + t.title + '"' }));
      var text = NUDGES[0];
      var custom = h('input', { type: 'text', maxlength: '200', placeholder: 'או נוסח משלכם…', 'aria-label': 'נוסח משלכם' });
      el.appendChild(h('div', { class: 'field' }, optChips(NUDGES.map(function (n) { return [n, n]; }), text, function (v) { text = v; custom.value = ''; })));
      el.appendChild(h('div', { class: 'field' }, custom));
      el.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn block', type: 'button', text: 'שליחת הקפצה', onclick: function () {
        var v = custom.value.trim() || text;
        queue({ type: 'nudge', id: id, cid: rid(), text: v });
        if (u.hasPush) { closeSheet(); toast('ההקפצה נשלחה ✓'); return; }
        replaceSheet(waSheet(t.assigneeId, v + '\n"' + t.title + '"\n' + APP_URL + '#t=' + t.id, 'ההקפצה נשמרה ✓'));
      } })));
    };
  }
  /** לעובד שעוד לא הפעיל התראות: כפתור לשליחה ידנית בוואטסאפ. */
  function waSheet(uid, msg, title) {
    return function (el) {
      sheetHead(el, title);
      el.appendChild(h('p', { text: uname(uid) + ' עוד לא הפעיל/ה התראות, ולכן לא יקבל/תקבל הודעה לטלפון. אפשר ליידע בוואטסאפ:' }));
      el.appendChild(h('div', { class: 'pre', text: msg }));
      el.appendChild(h('div', { class: 'actions' }, [
        h('a', { class: 'btn', href: waLink(uid, msg), target: '_blank', rel: 'noopener', text: 'שליחה בוואטסאפ', onclick: function () { setTimeout(closeSheet, 300); } }),
        h('button', { class: 'btn secondary', type: 'button', text: 'לא עכשיו', onclick: closeSheet })
      ]));
    };
  }
  function assignSheet(id) {
    return function (el) {
      var t = task(id);
      // משימה שנדחתה/הוחזרה: אפשר גם לשלוח שוב לאותו עובד (חוזרת לאישור שלו)
      var prev = t && (t.status === 'rejected' || t.status === 'returned') && t.assigneeId !== S.me.id && (user(t.assigneeId) || {}).active ? t.assigneeId : '';
      sheetHead(el, prev ? 'למי לשלוח את המשימה?' : 'להעביר למישהו אחר');
      var sel = h('select', { 'aria-label': 'למי' });
      if (prev) sel.appendChild(h('option', { value: prev, text: '↩ שוב ל' + uname(prev) + ' (לאישור)' }));
      V.users.filter(function (u) { return u.active && (!t || u.id !== t.assigneeId); }).sort(byName).forEach(function (u) {
        sel.appendChild(h('option', { value: u.id, text: u.id === S.me.id ? 'אני' : u.name }));
      });
      el.appendChild(h('div', { class: 'field' }, sel));
      var note = h('textarea', { rows: '2', maxlength: '300', placeholder: 'למשל: אין מי שיעשה את זה במקומך. אפשר ביום ראשון.' });
      var noteBox = h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'הסבר ל' + uname(prev) + ' (לא חובה)' }), note]);
      var sendBtn = h('button', { class: 'btn block', type: 'button' });
      function upd() {
        var again = !!prev && sel.value === prev;
        noteBox.classList.toggle('hidden', !again);
        sendBtn.textContent = again ? 'שליחה שוב' : 'העברה';
      }
      sel.addEventListener('change', upd);
      if (prev) el.appendChild(noteBox);
      upd();
      sendBtn.addEventListener('click', function () {
        if (prev && sel.value === prev) {
          queue({ type: 'resend', id: id, cid: rid(), text: note.value.trim() });
          closeSheet();
          toast('המשימה נשלחה שוב ל' + uname(prev) + ' ✓ מחכה לאישור');
          return;
        }
        queue({ type: 'update', id: id, fields: { assigneeId: sel.value } });
        closeSheet();
        toast(sel.value === S.me.id ? 'המשימה עברה אליך' : 'המשימה נשלחה ל' + uname(sel.value) + ' ✓');
      });
      el.appendChild(h('div', { class: 'actions' }, sendBtn));
    };
  }
  function remindSheet(id) {
    return function (el) {
      var t = task(id);
      sheetHead(el, '⏰ תזכורת');
      var r = remindField(t ? t.remindAt : '', t ? t.dueDate : '');
      r.open();
      el.appendChild(r.el);
      el.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn block', type: 'button', text: 'שמירה', onclick: function () {
        var v = r.value();
        if (v === null) return;
        queue({ type: 'update', id: id, fields: { remindAt: v } });
        closeSheet();
        toast(v ? 'התזכורת נקבעה ל' + whenLabel(v) : 'התזכורת בוטלה');
      } })));
    };
  }

  // ---------------------------------------------------------------- הקלטה
  var REC = null;
  var REC_TYPES = ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  function pickMime() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    for (var i = 0; i < REC_TYPES.length; i++) if (MediaRecorder.isTypeSupported(REC_TYPES[i])) return REC_TYPES[i];
    return '';
  }
  function stopRecording() {
    if (!REC) return;
    try { if (REC.rec && REC.rec.state === 'recording') { REC.cancel = true; REC.rec.stop(); } } catch (e) { /* לא חשוב */ }
    try { REC.stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) { /* לא חשוב */ }
    clearInterval(REC.timer);
    REC = null;
  }
  function micHelp() {
    return IS_IOS ? 'באייפון: הגדרות ← Safari ← מיקרופון ← "אפשר", ואז לסגור ולפתוח את האפליקציה.'
      : IS_ANDROID ? 'באנדרואיד: הגדרות הטלפון ← אפליקציות ← Chrome ← הרשאות ← מיקרופון ← "אפשר".'
        : 'במחשב: לוחצים על הסמל שמשמאל לכתובת ← מיקרופון ← "אפשר", ומרעננים.';
  }
  function recordSheet(onAttach) {
    return function (el) {
      sheetHead(el, '🎤 הקלטה');
      var out = h('div', { class: 'rec-out', text: 'לוחצים "התחלה", מדברים, ולוחצים "עצירה". עד 5 דקות.' });
      var player = h('audio', { controls: true, class: 'hidden' });
      var btn = h('button', { class: 'btn block rec-btn', type: 'button', text: '● התחלת הקלטה' });
      var useBtn = h('button', { class: 'btn ok hidden', type: 'button', text: '✓ צירוף ההקלטה' });
      var result = null;
      btn.addEventListener('click', function () {
        if (REC && REC.rec && REC.rec.state === 'recording') { REC.rec.stop(); return; }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { out.textContent = 'המכשיר או הדפדפן לא תומכים בהקלטה.'; return; }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
          var mime = pickMime(), rec;
          try { rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream); } catch (e) { rec = new MediaRecorder(stream); }
          var chunks = [], start = Date.now();
          REC = { rec: rec, stream: stream, timer: 0 };
          rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
          rec.onstop = function () {
            var cancelled = REC && REC.cancel;
            try { stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) { /* לא חשוב */ }
            if (REC) clearInterval(REC.timer);
            REC = null;
            if (cancelled) return;
            var type = (rec.mimeType || mime || 'audio/webm').split(';')[0];
            var secs = Math.max(1, Math.round((Date.now() - start) / 1000));
            result = { fid: rid(), blob: new Blob(chunks, { type: type }), mime: type, name: 'הקלטה', kind: 'audio', dur: secs };
            player.src = URL.createObjectURL(result.blob);
            player.classList.remove('hidden');
            useBtn.classList.remove('hidden');
            btn.textContent = '● הקלטה מחדש';
            btn.classList.remove('recording');
            out.textContent = 'הוקלטו ' + secs + ' שניות. אפשר לשמוע, ואז ללחוץ "צירוף".';
          };
          rec.start();
          btn.textContent = '■ עצירה';
          btn.classList.add('recording');
          useBtn.classList.add('hidden');
          player.classList.add('hidden');
          REC.timer = setInterval(function () {
            var s = Math.round((Date.now() - start) / 1000);
            out.textContent = '● מקליט… ' + Math.floor(s / 60) + ':' + pad(s % 60);
            if (s >= 300 && rec.state === 'recording') rec.stop();
          }, 250);
        }).catch(function (e) {
          out.textContent = 'אין גישה למיקרופון (' + e.name + '). כנראה ההרשאה נחסמה. ' + micHelp();
        });
      });
      useBtn.addEventListener('click', function () { if (!result) return; var r = result; closeSheet(); onAttach(r); });
      el.appendChild(out);
      el.appendChild(btn);
      el.appendChild(player);
      el.appendChild(h('div', { class: 'actions' }, useBtn));
    };
  }

  // ---------------------------------------------------------------- הוספה ועריכה
  function optChips(options, current, onPick, multi) {
    var box = h('div', { class: 'chips' });
    options.forEach(function (o) {
      var on = multi ? current.indexOf(o[0]) >= 0 : o[0] === current;
      box.appendChild(h('button', {
        class: 'opt' + (on ? ' on' : ''), type: 'button', 'data-v': String(o[0]), text: o[1],
        onclick: function (e) {
          if (multi) { e.currentTarget.classList.toggle('on'); onPick(o[0], e.currentTarget.classList.contains('on')); return; }
          Array.prototype.forEach.call(box.children, function (b) { b.classList.remove('on'); });
          e.currentTarget.classList.add('on');
          onPick(o[0]);
        }
      }));
    });
    return box;
  }
  function selectOf(options, value, label) {
    var s = h('select', { 'aria-label': label });
    options.forEach(function (o) { s.appendChild(h('option', { value: String(o[0]), text: o[1] })); });
    s.value = String(value);
    return s;
  }
  function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push(i); return r; }
  function nextHour() { var d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return pad(d.getHours()) + ':00'; }

  /** בחירת שעה בשתי רשימות פשוטות (שעה : דקות), במקום בורר השעה של הטלפון. allowNone: אפשרות "בלי". */
  function timeSelect(value, allowNone, onChange) {
    var p = /^\d\d:\d\d$/.test(value || '') ? value.split(':') : ['', '00'];
    var hours = range(0, 23).map(function (i) { return [pad(i), pad(i)]; });
    if (allowNone) hours.unshift(['', 'בלי']);
    var mins = range(0, 11).map(function (i) { return [pad(i * 5), pad(i * 5)]; });
    if (mins.every(function (m) { return m[0] !== p[1]; })) { mins.push([p[1], p[1]]); mins.sort(); }
    var hs = selectOf(hours, p[0], 'שעה'), ms = selectOf(mins, p[1], 'דקות');
    function sync() { ms.disabled = !hs.value; if (onChange) onChange(); }
    hs.addEventListener('change', sync);
    ms.addEventListener('change', sync);
    ms.disabled = !hs.value;
    return {
      el: h('div', { class: 'time-pick' }, [hs, h('span', { class: 'colon', text: ':' }), ms]),
      value: function () { return hs.value ? hs.value + ':' + ms.value : ''; },
      set: function (v) { var q = v.split(':'); hs.value = q[0]; ms.value = q[1]; sync(); }
    };
  }

  /** שדה תזכורת: בלי / בעוד שעה / מחר 9:00 / לבחור יום ושעה. value(): ISO, '' או null (שגיאה). */
  function remindField(current, dueDate) {
    var td = today(), tm = addDays(td, 1), t2 = addDays(td, 2);
    var wrap = h('div', { class: 'field remind-field' });
    var mode = current ? 'pick' : '';
    var day = current ? isoDay(current) : (dueDate && dueDate >= td ? dueDate : td);
    var dayOpts = [[td, 'היום'], [tm, 'מחר'], [t2, 'מחרתיים']];
    if (dueDate && dueDate > t2) dayOpts.push([dueDate, 'ביום היעד (' + shortDate(dueDate) + ')']);
    dayOpts.push(['other', '📅 תאריך אחר']);
    var known = dayOpts.some(function (o) { return o[0] === day; });
    var dayMode = known ? day : 'other';
    var dIn = h('input', { type: 'date', min: td, class: known ? 'hidden' : '', value: known ? '' : day, 'aria-label': 'תאריך התזכורת' });
    dIn.style.marginTop = '8px';
    var summary = h('p', { class: 'remind-sum' });
    var tsel = timeSelect(current ? timeOf(current) : nextHour(), false, upd);
    var dayChips = optChips(dayOpts, dayMode, function (v) {
      dayMode = v;
      dIn.classList.toggle('hidden', v !== 'other');
      if (v === 'other') { if (!dIn.value) dIn.value = addDays(td, 3); try { dIn.showPicker(); } catch (e) { /* לא נתמך */ } }
      upd();
    });
    dIn.addEventListener('change', upd);
    var pick = h('div', { class: 'remind-pick' + (mode === 'pick' ? '' : ' hidden') }, [
      h('span', { class: 'lbl', text: 'באיזה יום' }), dayChips, dIn,
      h('span', { class: 'lbl', style: 'margin-top:12px', text: 'באיזו שעה' }), tsel.el, summary
    ]);
    function when() { // הרגע שנבחר, או null
      if (mode === 'hour') return new Date(Date.now() + 3600000);
      if (mode === 'tom9') { var x = dateOf(tm); x.setHours(9, 0, 0, 0); return x; }
      if (mode !== 'pick') return null;
      var dd = dayMode === 'other' ? dIn.value : dayMode;
      if (!dd) return null;
      var d = dateOf(dd), p = tsel.value().split(':');
      d.setHours(+p[0], +p[1], 0, 0);
      return d;
    }
    function upd() {
      var d = when();
      var past = d && d.getTime() < Date.now() - 60000 && (!current || d.toISOString() !== current);
      summary.textContent = !d ? '' : past ? '⚠ הזמן הזה כבר עבר. בחרו זמן אחר.' : '⏰ התזכורת תגיע: ' + whenLabel(d.toISOString()) + ' (' + 'יום ' + DAYS[d.getDay()] + ')';
      summary.className = 'remind-sum' + (past ? ' bad' : '');
    }
    var chips = optChips([['', 'בלי'], ['hour', 'בעוד שעה'], ['tom9', 'מחר ב-9:00'], ['pick', '⏰ לבחור יום ושעה']], mode, function (v) {
      mode = v;
      pick.classList.toggle('hidden', v !== 'pick');
      upd();
    });
    wrap.appendChild(h('span', { class: 'lbl', text: '⏰ תזכורת לטלפון' }));
    wrap.appendChild(chips);
    wrap.appendChild(pick);
    if (!pushHere()) wrap.appendChild(h('p', { class: 'small', text: 'התזכורת מגיעה כהתראה לטלפון של האחראי. כדי לקבל התראות במכשיר הזה: ⚙ ← "הפעלת התראות".' }));
    upd();
    return {
      el: wrap,
      open: function () { if (!mode) { chips.querySelector('[data-v="pick"]').click(); } },
      value: function () {
        if (!mode) return '';
        var d = when();
        if (!d) { toast('צריך לבחור יום לתזכורת'); return null; }
        if (d.getTime() < Date.now() - 60000 && (!current || d.toISOString() !== current)) { toast('הזמן שנבחר לתזכורת כבר עבר'); return null; }
        return d.toISOString();
      }
    };
  }

  /** הבוקר הבא שאינו שבת/חג, ב-8:30. */
  function nextWorkMorning() {
    var d = addDays(today(), 1);
    while (holyDay(d)) d = addDays(d, 1);
    var x = dateOf(d);
    x.setHours(8, 30, 0, 0);
    return x;
  }
  /** "מתי לשלוח לו התראה": מחר ב-8:30 (בלחיצה) או יום ושעה לבחירה. value(): ISO או null (שגיאה). */
  function laterField() {
    var td = today(), nm = nextWorkMorning();
    var mode = 'morning';
    var summary = h('p', { class: 'remind-sum' });
    var dIn = h('input', { type: 'date', min: td, value: ymd(nm), 'aria-label': 'יום ההתראה' });
    var tsel = timeSelect('08:30', false, upd);
    dIn.addEventListener('change', upd);
    var pick = h('div', { class: 'remind-pick hidden' }, [
      h('span', { class: 'lbl', text: 'באיזה יום' }), dIn,
      h('span', { class: 'lbl', style: 'margin-top:12px', text: 'באיזו שעה' }), tsel.el
    ]);
    function when() {
      if (mode === 'morning') return nm;
      if (!dIn.value) return null;
      var d = dateOf(dIn.value), p = tsel.value().split(':');
      d.setHours(+p[0], +p[1], 0, 0);
      return d;
    }
    function upd() {
      var d = when();
      var past = d && d.getTime() < Date.now() + 60000;
      summary.textContent = !d ? '' : past ? '⚠ הזמן הזה כבר עבר. בחרו זמן אחר.'
        : '🔔 ההתראה תגיע אליו ' + whenLabel(d.toISOString()) + ' (יום ' + DAYS[d.getDay()] + '). המשימה עצמה מופיעה אצלו באפליקציה כבר עכשיו.';
      summary.className = 'remind-sum' + (past ? ' bad' : '');
    }
    var quick = (dayDiff(td, ymd(nm)) === 1 ? 'מחר' : 'ביום ' + DAYS[nm.getDay()]) + ' ב-8:30';
    var chips = optChips([['morning', quick], ['pick', '📅 יום ושעה אחרים']], mode, function (v) {
      mode = v;
      pick.classList.toggle('hidden', v !== 'pick');
      upd();
    });
    upd();
    return {
      el: h('div', { class: 'field later-field' }, [h('span', { class: 'lbl', text: '🔕 מתי לשלוח לו התראה?' }), chips, pick, summary]),
      value: function () {
        var d = when();
        if (!d) { toast('צריך לבחור יום להתראה'); return null; }
        if (d.getTime() < Date.now() + 60000) { toast('הזמן שנבחר להתראה כבר עבר'); return null; }
        return d.toISOString();
      }
    };
  }

  /** שדה חזרה: כל יום / שבוע / חודש / חודש עברי / שנה / שנה עברית. */
  function repeatField() {
    var now = new Date(), hp = hebParts(now);
    var st = { t: '', fri: false, days: [now.getDay() === 6 ? 0 : now.getDay()], d: now.getDate(), m: now.getMonth() + 1, hd: hp.d, hm: hp.m };
    var wrap = h('div', { class: 'field' });
    var params = h('div', { class: 'repeat-params' });
    var desc = h('p', { class: 'small' });
    function rule() {
      switch (st.t) {
        case 'daily': return { t: 'daily', fri: st.fri };
        case 'weekly': return { t: 'weekly', days: st.days.slice().sort() };
        case 'monthly': return { t: 'monthly', d: +st.d };
        case 'hmonthly': return { t: 'hmonthly', d: +st.hd };
        case 'yearly': return { t: 'yearly', m: +st.m, d: +st.d };
        case 'hyearly': return { t: 'hyearly', m: st.hm, d: +st.hd };
      }
      return null;
    }
    function upd() {
      var r = rule();
      desc.textContent = r ? '🔁 ' + ruleText(r) + '. כל הופעה נוצרת בבוקר של היום שלה' + (r.t === 'daily' ? ' (בשבת ובחג אין).' : '. בשבת – ביום חמישי שלפני; בחג – ביום שלפניו.') : '';
    }
    function buildParams() {
      params.textContent = '';
      if (st.t === 'daily') params.appendChild(optChips([['fri', 'כולל יום שישי']], st.fri ? ['fri'] : [], function (v, on) { st.fri = on; upd(); }, true));
      if (st.t === 'weekly') params.appendChild(optChips(DAY_LETTERS.map(function (l, i) { return [i, l]; }), st.days, function (v, on) {
        st.days = st.days.filter(function (x) { return x !== v; });
        if (on) st.days.push(v);
        if (!st.days.length) { st.days = [v]; params.querySelector('[data-v="' + v + '"]').classList.add('on'); }
        upd();
      }, true));
      if (st.t === 'monthly' || st.t === 'yearly') {
        var ds = selectOf(range(1, 31).map(function (i) { return [i, String(i)]; }), st.d, 'יום בחודש');
        ds.addEventListener('change', function () { st.d = +ds.value; upd(); });
        var row = h('div', { class: 'two' }, ds);
        if (st.t === 'yearly') {
          var ms = selectOf(MONTHS.map(function (n, i) { return [i + 1, n]; }), st.m, 'חודש');
          ms.addEventListener('change', function () { st.m = +ms.value; upd(); });
          row.appendChild(ms);
        }
        params.appendChild(row);
      }
      if (st.t === 'hmonthly' || st.t === 'hyearly') {
        var hd = selectOf(range(1, 30).map(function (i) { return [i, gim(i)]; }), st.hd, 'יום בחודש העברי');
        hd.addEventListener('change', function () { st.hd = +hd.value; upd(); });
        var row2 = h('div', { class: 'two' }, hd);
        if (st.t === 'hyearly') {
          var hm = selectOf(HEB_MONTHS, st.hm, 'חודש עברי');
          hm.addEventListener('change', function () { st.hm = hm.value; upd(); });
          row2.appendChild(hm);
        }
        params.appendChild(row2);
      }
      upd();
    }
    wrap.appendChild(h('span', { class: 'lbl', text: '🔁 חוזרת' }));
    wrap.appendChild(optChips([['daily', 'כל יום'], ['weekly', 'כל שבוע'], ['monthly', 'כל חודש'], ['hmonthly', 'חודש עברי'], ['yearly', 'כל שנה'], ['hyearly', 'שנה עברית']], st.t, function (v) {
      st.t = v; buildParams();
    }));
    wrap.appendChild(params);
    wrap.appendChild(desc);
    return { el: wrap, rule: rule, pick: function (t) { var b = wrap.querySelector('.chips [data-v="' + t + '"]'); if (b) b.click(); } };
  }

  /** טקסט שהודבק (למשל מוואטסאפ): שורה ראשונה = שם המשימה, השאר = הערה. */
  function parsePasted(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) {
      return l.replace(/^‏?\[?\d{1,2}[./]\d{1,2}[./]\d{2,4},? \d{1,2}:\d{2}(:\d{2})?\]? ?(-\s)?[^:]{1,40}: /, '').trim();
    });
    while (lines.length && !lines[0]) lines.shift();
    return { title: (lines.shift() || '').slice(0, 200), note: lines.join('\n').trim().slice(0, 2000) };
  }

  /** חלון משימה חדשה / עריכה. preset: {title, note, files, source} (מהדבקה או משיתוף). */
  function editSheet(id, preset) {
    return function (el) {
      var t = id ? task(id) : null;
      if (id && !t) { sheetHead(el, 'המשימה לא נמצאה'); return; }
      preset = preset || {};
      var st = { priority: t ? t.priority : 'normal', dueDate: t ? (t.dueDate || '') : '', files: (preset.files || []).slice(), source: preset.source || '' };
      sheetHead(el, t ? 'עריכת משימה' : 'משימה חדשה');

      // שם המשימה: תיבה שגדלה עם הטקסט (Enter = שמירה). הדבקה של כמה שורות: הראשונה לשם, השאר להערה.
      var title = h('textarea', { class: 'title-input', rows: '1', maxlength: '200', placeholder: 'מה צריך לעשות?', enterkeyhint: 'done', 'aria-label': 'מה צריך לעשות' });
      title.value = t ? t.title : (preset.title || '');
      title.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); save(); } });
      title.addEventListener('input', function () {
        title.classList.remove('err');
        if (/[\r\n]/.test(title.value)) title.value = title.value.replace(/\s*[\r\n]+\s*/g, ' ');
        grow(title, 168);
      });
      title.addEventListener('paste', function (e) {
        var txt = e.clipboardData && e.clipboardData.getData('text');
        if (!txt || !/\n/.test(txt.trim())) return;
        e.preventDefault();
        fillPasted(txt);
      });
      el.appendChild(h('div', { class: 'field' }, title));
      if (!t) {
        el.appendChild(h('button', { class: 'link-btn paste-btn', type: 'button', text: '📋 הדבקה מוואטסאפ', onclick: function () {
          if (!navigator.clipboard || !navigator.clipboard.readText) { toast('לוחצים לחיצה ארוכה בתיבה ובוחרים "הדבק".'); title.focus(); return; }
          navigator.clipboard.readText().then(function (txt) {
            if (!txt) { toast('הזיכרון ריק. קודם מעתיקים הודעה בוואטסאפ.'); return; }
            fillPasted(txt);
          }, function () { toast('לוחצים לחיצה ארוכה בתיבה ובוחרים "הדבק".'); title.focus(); });
        } }));
      }

      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'דחיפות' }),
        optChips([['high', '🔴 דחוף'], ['normal', '🟡 רגיל'], ['low', '⚪ לא דחוף']], st.priority, function (v) { st.priority = v; })]));

      var sel = h('select', { 'aria-label': 'למי' });
      sel.appendChild(h('option', { value: S.me.id, text: 'לעצמי' }));
      V.users.filter(function (u) { return u.active && u.id !== S.me.id; }).sort(byName).forEach(function (u) {
        sel.appendChild(h('option', { value: u.id, text: u.name }));
      });
      var assignee = t ? t.assigneeId : S.me.id;
      if (!Array.prototype.some.call(sel.options, function (o) { return o.value === assignee; })) sel.appendChild(h('option', { value: assignee, text: uname(assignee) }));
      sel.value = assignee;
      // "התראה אליו מאוחר יותר" (רק כשנותנים למישהו אחר): המשימה מופיעה אצלו מיד, וההתראה לטלפון בזמן שנבחר
      var later = null; // נבנה רק בלחיצה, כדי שלא יהיו בחלון שתי בחירות שעה מוסתרות
      var laterOn = false;
      var laterBox = h('div', { class: 'hidden' });
      var laterBtn = h('button', { class: 'opt later-btn', type: 'button', text: '🔕 התראה אליו מאוחר יותר' });
      laterBtn.addEventListener('click', function () {
        if (!later) { later = laterField(); laterBox.appendChild(later.el); }
        laterOn = !laterOn;
        laterBtn.classList.toggle('on', laterOn);
        syncLater();
      });
      var laterRow = h('div', { class: 'extras hidden' }, laterBtn);
      function laterAllowed() { return sel.value !== S.me.id && (!t || sel.value !== t.assigneeId) && !(repBox && !repBox.classList.contains('hidden')); }
      function syncLater() {
        var ok = laterAllowed();
        laterRow.classList.toggle('hidden', !ok);
        laterBox.classList.toggle('hidden', !ok || !laterOn);
      }
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'למי' }), sel,
        t && t.assigneeId !== S.me.id ? null : h('p', { class: 'small hint-assign hidden', text: 'המשימה תגיע אליו/ה לאישור.' }), laterRow]));
      el.appendChild(laterBox);
      sel.addEventListener('change', function () { var hnt = el.querySelector('.hint-assign'); if (hnt) hnt.classList.toggle('hidden', sel.value === S.me.id); syncLater(); });

      // "למתי" = היום שבו רוצים לראות את המשימה ולטפל בה. משימה לתאריך עתידי מחכה ב"משימות עתידיות".
      var td = today(), tm = addDays(td, 1);
      var dueOpts = [['', 'בלי תאריך'], [td, 'היום'], [tm, 'מחר'], ['pick', '📅 תאריך…']];
      var preset2 = dueOpts.some(function (o) { return o[0] === st.dueDate; });
      var dateIn = h('input', { type: 'date', class: preset2 ? 'hidden' : '', value: preset2 ? '' : st.dueDate, min: td, 'aria-label': 'למתי' });
      dateIn.style.marginTop = '8px';
      var picked = preset2 ? st.dueDate : 'pick';
      var dueHint = h('p', { class: 'small' + (st.dueDate > td ? '' : ' hidden'), text: 'עד היום הזה המשימה מחכה למטה, ב"משימות עתידיות", ולא מעמיסה על הרשימה.' });
      var dueField = h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'למתי' }),
        optChips(dueOpts, picked, function (v) {
          picked = v;
          dateIn.classList.toggle('hidden', v !== 'pick');
          if (v === 'pick') { if (!dateIn.value) dateIn.value = addDays(td, 2); try { dateIn.showPicker(); } catch (e) { dateIn.focus(); } }
          dueHint.classList.toggle('hidden', !(v === 'pick' || v > td));
        }), dateIn, dueHint]);
      el.appendChild(dueField);

      // תוספות (נפתחות בלחיצה)
      var rem = remindField(t ? t.remindAt : '', st.dueDate);
      var remBox = h('div', { class: t && t.remindAt ? '' : 'hidden' }, rem.el);
      var rep = t ? null : repeatField();
      var repTime = timeSelect('', true);
      var repBox = rep ? h('div', { class: 'hidden' }, [rep.el, h('div', { class: 'field' }, [h('span', { class: 'lbl', text: '⏰ שעת תזכורת בכל הופעה (לא חובה)' }), repTime.el])]) : null;
      var note = h('textarea', { placeholder: 'פרטים נוספים (לא חובה)', maxlength: '2000', 'aria-label': 'הערה' });
      note.value = t ? (t.note || '') : (preset.note || '');
      note.addEventListener('input', function () { grow(note, noteMax()); });
      var noteBox = h('div', { class: 'field' + (note.value ? '' : ' hidden') }, [h('span', { class: 'lbl', text: 'הערה' }), note]);
      var filesList = h('div', { class: 'files' });
      var filesBoxEl = h('div', { class: 'field' + (st.files.length ? '' : ' hidden') }, [h('span', { class: 'lbl', text: 'קבצים' }), filesList]);
      function drawFiles() {
        filesList.textContent = '';
        st.files.forEach(function (a, i) {
          blobUrl[a.fid] = blobUrl[a.fid] || URL.createObjectURL(a.blob);
          var box = h('div', { class: 'file' + (a.kind === 'image' ? ' img' : '') });
          if (a.kind === 'image') box.appendChild(h('img', { class: 'thumb', src: blobUrl[a.fid], alt: 'תמונה' }));
          else if (a.kind === 'audio') box.appendChild(h('audio', { controls: true, src: blobUrl[a.fid] }));
          else box.appendChild(h('div', { class: 'fname', text: '📄 ' + a.name }));
          box.appendChild(h('button', { class: 'link-btn del-file', type: 'button', text: 'הסרה', onclick: function () { st.files.splice(i, 1); drawFiles(); } }));
          filesList.appendChild(box);
        });
        filesBoxEl.classList.toggle('hidden', !st.files.length);
      }
      drawFiles();
      function attach(a) { st.files.push(a); drawFiles(); }

      var extras = h('div', { class: 'extras' });
      var xbtn = function (text, box, onOpen) {
        var b = h('button', { class: 'opt', type: 'button', text: text });
        b.addEventListener('click', function () {
          var open = box.classList.toggle('hidden') === false;
          b.classList.toggle('on', open);
          if (open && onOpen) onOpen();
        });
        if (!box.classList.contains('hidden')) b.classList.add('on');
        extras.appendChild(b);
        return b;
      };
      xbtn('⏰ תזכורת', remBox, function () { rem.open(); });
      if (rep) xbtn('🔁 חוזרת', repBox, function () { if (!rep.rule()) rep.pick('weekly'); });
      xbtn('📝 הערה', noteBox, function () { grow(note, noteMax()); note.focus(); });
      var pickBtns = pickers(attach, 'opt').filter(function (x) { extras.appendChild(x); return x.tagName === 'BUTTON'; });
      el.appendChild(extras);
      el.appendChild(remBox);
      if (repBox) el.appendChild(repBox);
      el.appendChild(noteBox);
      el.appendChild(filesBoxEl);
      if (repBox) { // משימה חוזרת: בלי תאריך יעד, תזכורת וקבצים בודדים
        var syncRep = function () {
          var on = !repBox.classList.contains('hidden');
          dueField.classList.toggle('hidden', on);
          remBox.classList.toggle('hidden', on || !extras.firstChild.classList.contains('on'));
          extras.firstChild.classList.toggle('hidden', on);
          pickBtns.forEach(function (b) { b.classList.toggle('hidden', on); });
          syncLater();
        };
        extras.children[1].addEventListener('click', syncRep);
      }
      el.dropTarget = attach; // גרירת קבצים במחשב

      el.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn block', type: 'button', text: t ? 'שמירה' : 'הוספת המשימה', onclick: save })));

      function fillPasted(txt) {
        var p = parsePasted(txt);
        if (p.title) title.value = p.title;
        if (p.note) {
          note.value = note.value ? note.value + '\n' + p.note : p.note;
          noteBox.classList.remove('hidden');
          extras.children[rep ? 2 : 1].classList.add('on');
          grow(note, noteMax());
        }
        st.source = 'paste';
        grow(title, 168);
        title.classList.remove('err');
      }

      function save() {
        var v = title.value.trim();
        if (!v) { title.classList.add('err'); title.focus(); toast('צריך לכתוב מה צריך לעשות'); return; }
        var isRep = rep && !repBox.classList.contains('hidden') && rep.rule();
        if (isRep) {
          queue({ type: 'createSeries', series: { id: rid(), title: v, note: note.value.trim(), priority: st.priority, assigneeId: sel.value, rule: rep.rule(), remindTime: repTime.value() } });
          closeSheet();
          toast('🔁 משימה חוזרת נשמרה: ' + ruleText(rep.rule()));
          return;
        }
        var remind = remBox.classList.contains('hidden') ? (t ? t.remindAt || '' : '') : rem.value();
        if (remind === null) return;
        var nAt = '';
        if (laterOn && laterAllowed()) { nAt = later.value(); if (nAt === null) return; }
        var due = picked === 'pick' ? (dateIn.value || '') : picked;
        var fields = { title: v, note: note.value.trim(), priority: st.priority, assigneeId: sel.value, dueDate: due, remindAt: remind };
        if (!t) {
          var nid = rid();
          var tk = Object.assign({ id: nid }, fields);
          if (st.source) tk.source = st.source;
          if (nAt) tk.notifyAt = nAt;
          queue({ type: 'create', task: tk });
          st.files.forEach(function (a) { queueUpload(nid, a); });
          var other = fields.assigneeId !== S.me.id;
          var u = user(fields.assigneeId) || {};
          if (other && nAt) { // לא להפריע לו עכשיו: בלי הצעת וואטסאפ
            closeSheet();
            toast('המשימה נשלחה ל' + u.name + ' ✓ ההתראה תגיע אליו ' + whenLabel(nAt) + (u.hasPush ? '' : '. שימו לב: אצלו ההתראות לא מופעלות.'));
            return;
          }
          if (other && !u.hasPush) {
            replaceSheet(waSheet(fields.assigneeId, 'שלום ' + u.name + ', נתתי לך משימה באפליקציה:\n"' + v + '"\n' + APP_URL + '#t=' + nid, 'המשימה נשלחה ל' + u.name + ' ✓'));
            return;
          }
          closeSheet();
          var fut = isFuture({ dueDate: due, remindAt: remind });
          toast(other ? 'המשימה נשלחה ל' + uname(fields.assigneeId) + ' לאישור ✓'
            : fut ? 'המשימה נוספה ✓ היא מחכה ב"משימות עתידיות" עד ' + dueLabel(taskDay({ dueDate: due, remindAt: remind })).text.replace(/^ל-?/, '') : 'המשימה נוספה ✓');
        } else {
          var ch = {};
          Object.keys(fields).forEach(function (k) { if ((t[k] || '') !== fields[k]) ch[k] = fields[k]; });
          if (ch.assigneeId && nAt) ch.notifyAt = nAt;
          if (Object.keys(ch).length) queue({ type: 'update', id: t.id, fields: ch });
          st.files.forEach(function (a) { queueUpload(t.id, a); });
          closeSheet();
          toast(ch.notifyAt ? 'נשמר ✓ ההתראה תגיע ל' + uname(ch.assigneeId) + ' ' + whenLabel(nAt) : 'נשמר ✓');
        }
      }
      setTimeout(function () { grow(title, 168); grow(note, noteMax()); }, 0);
      grow(title, 168);
      return t ? null : title;
    };
  }

  // ---------------------------------------------------------------- משימות חוזרות (רשימה)
  function seriesListSheet() {
    return live(function (el) {
      sheetHead(el, '🔁 משימות חוזרות');
      var me = S.me.id;
      var list = V.series.filter(function (s) { return isMgr() || s.assigneeId === me || s.createdById === me; });
      if (!list.length) { el.appendChild(h('p', { text: 'אין משימות חוזרות פעילות. כדי ליצור: + ← "🔁 חוזרת".' })); return; }
      list.forEach(function (s) {
        var row = h('div', { class: 'box' }, [
          h('h3', { text: s.title }),
          h('p', { text: ruleText(s.rule) + (s.remindTime ? ' · ⏰ ' + s.remindTime : '') }),
          h('p', { class: 'small', text: 'אחראי: ' + (s.assigneeId === me ? 'אני' : uname(s.assigneeId)) + (s.createdById !== me ? ' · מאת ' + uname(s.createdById) : '') + (s.accepted ? '' : ' · ממתינה לאישור') })
        ]);
        if (isMgr() || s.createdById === me) {
          row.appendChild(h('button', { class: 'danger-link', type: 'button', text: 'עצירת החזרה', onclick: function () {
            if (!window.confirm('לעצור את החזרה של "' + s.title + '"?')) return;
            queue({ type: 'stopSeries', id: s.id });
            toast('החזרה נעצרה');
          } }));
        }
        el.appendChild(row);
      });
    });
  }

  // ---------------------------------------------------------------- עובד (מנהל)
  function userSheet(uid) {
    return live(function (el) {
      var u = user(uid);
      if (!u) { sheetHead(el, 'העובד לא נמצא'); return; }
      var self = u.id === S.me.id;
      sheetHead(el, u.name + (self ? ' (אני)' : ''));
      el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: 'טלפון: ' }), h('span', { class: 'ltr', text: prettyPhone(u.phone) || 'לא נשמר' })]));
      el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: 'תפקיד: ' }), u.role === 'manager' ? 'מנהל (רואה את כל המשימות)' : 'עובד']));
      el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: 'התראות: ' }), u.hasPush ? 'פעילות' : 'עוד לא הופעלו']));
      var st = userStatus(u);
      if (st) el.appendChild(h('div', { class: 'msg bad', text: st }));

      var acts = h('div', { class: 'actions' });
      if (u.active) {
        acts.appendChild(h('button', { class: 'btn', type: 'button', text: 'קוד הזמנה חדש', onclick: function (e) { newInvite(u.id, e.currentTarget); } }));
        acts.appendChild(h('button', { class: 'btn secondary', type: 'button', text: '✎ עריכת פרטים', onclick: function () { openSheet(editUserSheet(u.id)); } }));
      }
      if (!self) {
        acts.appendChild(h('button', {
          class: 'btn ' + (u.active ? 'danger' : 'secondary'), type: 'button', text: u.active ? 'השבתת העובד' : 'הפעלה מחדש',
          onclick: function (e) { toggleActive(u, e.currentTarget); }
        }));
      }
      el.appendChild(acts);
      el.appendChild(h('p', { class: 'small', text: '"קוד הזמנה חדש" משמש לכניסה ראשונה, לטלפון חדש, או כשהכניסה ננעלה.' }));

      var c = counts(u.id);
      var openAll = V.tasks.filter(function (t) { return t.assigneeId === u.id && isActive(t); });
      if (openAll.length && !self) {
        var to = h('select', { 'aria-label': 'למי להעביר' });
        V.users.filter(function (x) { return x.active && x.id !== u.id; }).sort(byName).forEach(function (x) { to.appendChild(h('option', { value: x.id, text: x.id === S.me.id ? 'אליי' : x.name })); });
        var tb = h('button', { class: 'btn secondary', type: 'button', text: 'העברה', onclick: function () {
          if (!window.confirm('להעביר את כל ' + openAll.length + ' המשימות הפתוחות של ' + u.name + ' ל' + uname(to.value) + '?')) return;
          busy(tb, true, 'מעביר…');
          api('transferTasks', { fromId: u.id, toId: to.value }).then(function (r) {
            busy(tb, false);
            if (!r.ok) { if (r.error === 'auth') lostLogin(); else toast(errText(r)); return; }
            takeSnapshot(r);
            toast('הועברו ' + r.moved + ' משימות ✓');
          });
        } });
        el.appendChild(h('div', { class: 'box' }, [h('h3', { text: 'העברת כל המשימות הפתוחות (' + openAll.length + ')' }),
          h('p', { class: 'small', text: 'למשל כשעובד עוזב. המשימות יגיעו לאישור של מי שמקבל אותן.' }), h('div', { class: 'two' }, [to, tb])]));
      }
      el.appendChild(h('div', { class: 'sec' }, [h('span', { text: 'משימות פתוחות (' + c.open.length + ')' })]));
      if (!c.open.length) el.appendChild(h('p', { class: 'small', text: 'אין משימות פתוחות.' }));
      else {
        var ul = h('ul', { class: 'list sub-list' });
        c.open.sort(autoCmp).forEach(function (t) { ul.appendChild(card(t, 'team', false)); });
        el.appendChild(ul);
      }
      var done = doneOn(today(), u.id);
      if (done.length) {
        el.appendChild(h('div', { class: 'sec' }, [h('span', { text: 'בוצעו היום (' + done.length + ')' })]));
        var ul2 = h('ul', { class: 'list sub-list' });
        done.forEach(function (t) { ul2.appendChild(card(t, 'team', false)); });
        el.appendChild(ul2);
      }
    });
  }

  function prettyPhone(p) {
    if (!p) return '';
    var d = '0' + String(p).replace(/^972/, '');
    return d.length === 10 ? d.slice(0, 3) + '-' + d.slice(3) : d;
  }

  function busy(btn, on, text) {
    if (!btn) return;
    if (on) { btn.dataset.text = btn.textContent; btn.textContent = text || 'רגע…'; btn.disabled = true; }
    else { btn.textContent = btn.dataset.text || btn.textContent; btn.disabled = false; }
  }

  function newInvite(uid, btn) {
    busy(btn, true);
    api('newInvite', { id: uid }).then(function (r) {
      busy(btn, false);
      if (!r.ok) { if (r.error === 'auth') lostLogin(); else toast(errText(r)); return; }
      takeSnapshot(r);
      openSheet(inviteSheet(r.userId, r.inviteCode));
    });
  }

  function toggleActive(u, btn) {
    var q = u.active
      ? 'להשבית את ' + u.name + '?\nהכניסה שלו תבוטל מיד בכל המכשירים. המשימות שלו יישארו (אפשר להעביר אותן לעובד אחר).'
      : 'להפעיל מחדש את ' + u.name + '?\nאחר כך צריך לשלוח לו קוד הזמנה חדש.';
    if (!window.confirm(q)) return;
    busy(btn, true);
    api('updateUser', { id: u.id, active: !u.active }).then(function (r) {
      busy(btn, false);
      if (!r.ok) { if (r.error === 'auth') lostLogin(); else toast(errText(r)); return; }
      takeSnapshot(r);
      toast(u.active ? u.name + ' הושבת' : u.name + ' הופעל מחדש');
    });
  }

  function inviteMessage(u, code) {
    return 'שלום ' + u.name + ',\nהוזמנת לאפליקציית המשימות של הצוות.\n\n' +
      '1. פותחים את הקישור: ' + APP_URL + '\n' +
      '2. מתקינים למסך הבית:\n' +
      '   • אייפון: בספארי, כפתור השיתוף ← "הוסף למסך הבית".\n' +
      '   • אנדרואיד: בכרום, ⋮ ← "התקנת אפליקציה" (או "הוספה למסך הבית").\n' +
      '3. פותחים את האפליקציה מהאייקון ומקלידים את קוד ההזמנה: ' + code + '\n' +
      '4. באפליקציה לוחצים "הפעלת התראות", כדי לדעת על משימות חדשות.\n\n' +
      'הקוד בתוקף 48 שעות.';
  }

  function inviteSheet(uid, code) {
    return function (el) {
      var u = user(uid) || { name: '', phone: '' };
      sheetHead(el, 'קוד הזמנה ל' + u.name);
      el.appendChild(h('div', { class: 'code-big', text: code.slice(0, 3) + ' ' + code.slice(3) }));
      el.appendChild(h('p', { class: 'center small', text: 'הקוד בתוקף 48 שעות ולשימוש אחד.' }));
      var msg = inviteMessage(u, code);
      el.appendChild(h('div', { class: 'pre', text: msg }));
      var wa = 'https://wa.me/' + (u.phone || '') + '?text=' + encodeURIComponent(msg);
      el.appendChild(h('div', { class: 'actions' }, [
        h('a', { class: 'btn', href: wa, target: '_blank', rel: 'noopener', text: 'שליחה בוואטסאפ', id: 'inviteWa' }),
        h('button', { class: 'btn secondary', type: 'button', text: 'העתקת ההודעה', onclick: function () { copyText(msg); } })
      ]));
    };
  }

  function copyText(text) {
    var done = function () { toast('ההודעה הועתקה'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else { fallbackCopy(text); done(); }
  }
  function fallbackCopy(text) {
    var ta = h('textarea', { style: 'position:fixed;top:-100px' });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* לא נתמך */ }
    ta.remove();
  }

  function userForm(el, u, role, onSave, btnText) {
    var self = u && u.id === S.me.id;
    var name = h('input', { type: 'text', maxlength: '40', placeholder: 'למשל: משה כהן', autocomplete: 'off', value: u ? u.name : '' });
    var phone = h('input', { type: 'tel', class: 'ltr', inputmode: 'tel', placeholder: '050-1234567', autocomplete: 'off', value: u ? prettyPhone(u.phone) : '' });
    var msg = h('div', { class: 'msg bad hidden' });
    el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'שם' }), name]));
    el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'טלפון נייד' }), phone]));
    if (!self) {
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'תפקיד' }),
        optChips([['employee', 'עובד'], ['manager', 'מנהל (רואה הכל)']], role, function (v) { role = v; })]));
    }
    el.appendChild(msg);
    var btn = h('button', { class: 'btn block', type: 'button', text: btnText });
    btn.addEventListener('click', function () {
      msg.classList.add('hidden');
      if (!name.value.trim()) { msg.textContent = ERR.no_name; msg.classList.remove('hidden'); return; }
      var req = { name: name.value };
      if (phone.value.trim() || !u) req.phone = phone.value;
      if (!self) req.role = role;
      busy(btn, true, 'שומר…');
      onSave(req).then(function (r) {
        busy(btn, false);
        if (!r.ok) {
          if (r.error === 'auth') { lostLogin(); return; }
          msg.textContent = errText(r);
          msg.classList.remove('hidden');
        }
      });
    });
    el.appendChild(h('div', { class: 'actions' }, btn));
    return name;
  }

  function addUserSheet() {
    return function (el) {
      sheetHead(el, 'הוספת עובד');
      var f = userForm(el, null, 'employee', function (req) {
        return api('addUser', req).then(function (r) {
          if (r.ok) { takeSnapshot(r); replaceSheet(inviteSheet(r.userId, r.inviteCode)); }
          return r;
        });
      }, 'הוספה וקבלת קוד הזמנה');
      el.appendChild(h('p', { class: 'small', text: 'אחרי ההוספה יופיע קוד הזמנה, עם כפתור לשליחה לעובד בוואטסאפ.' }));
      return f;
    };
  }

  function editUserSheet(uid) {
    return function (el) {
      var u = user(uid);
      if (!u) { sheetHead(el, 'העובד לא נמצא'); return; }
      sheetHead(el, 'עריכת פרטים');
      userForm(el, u, u.role, function (req) {
        req.id = u.id;
        return api('updateUser', req).then(function (r) {
          if (r.ok) { takeSnapshot(r); closeSheet(); toast('נשמר ✓'); }
          return r;
        });
      }, 'שמירה');
    };
  }

  // ---------------------------------------------------------------- הגדרות
  var installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvt = e; });

  function installBox() {
    if (standalone()) return null;
    var box = h('div', { class: 'box' }, [h('h3', { text: '📲 התקנה למסך הבית' })]);
    if (IS_IOS) {
      box.appendChild(h('ol', { class: 'steps' }, [
        h('li', { text: 'פותחים את הקישור בספארי.' }),
        h('li', { text: 'לוחצים על כפתור השיתוף (ריבוע עם חץ למעלה).' }),
        h('li', { text: 'בוחרים "הוסף למסך הבית" ← "הוסף".' }),
        h('li', { text: 'פותחים את האפליקציה מהאייקון החדש.' })
      ]));
    } else if (installEvt) {
      box.appendChild(h('button', {
        class: 'btn block', type: 'button', text: 'התקנת האפליקציה', onclick: function () {
          installEvt.prompt();
          installEvt.userChoice.then(function () { installEvt = null; });
        }
      }));
    } else if (IS_ANDROID) {
      box.appendChild(h('p', { text: 'בכרום: לוחצים ⋮ (שלוש נקודות למעלה) ← "התקנת אפליקציה" או "הוספה למסך הבית".' }));
    } else {
      box.appendChild(h('p', { text: 'בכרום או ב-Edge: לוחצים על סמל ההתקנה בשורת הכתובת (מסך עם חץ), או בתפריט ⋮ ← "התקנה".' }));
    }
    return box;
  }

  function pushBox() {
    var box = h('div', { class: 'box' }, [h('h3', { text: '🔔 התראות לטלפון' })]);
    if (pushHere()) {
      box.appendChild(h('p', { class: 'ok-text', text: '✓ ההתראות פעילות במכשיר הזה.' }));
      box.appendChild(h('button', { class: 'btn secondary', type: 'button', text: 'שליחת התראת ניסיון', onclick: function (e) { testPush(e.currentTarget); } }));
      box.appendChild(h('p', { class: 'small', style: 'margin-top:10px', text: '🔊 הצליל: ההתראות משמיעות את צליל ההתראות של הטלפון, ואת הצליל בוחרים בהגדרות הטלפון:' }));
      box.appendChild(h('ul', { class: 'steps small' }, [
        h('li', { text: 'אנדרואיד: הגדרות ← אפליקציות ← "משימות" ← התראות ← לוחצים על סוג ההתראות ← "צליל" (וגם לבדוק שמסומן "צליל וחלון קופץ" או "חשיבות גבוהה").' }),
        h('li', { text: 'אייפון: הגדרות ← התראות ← "משימות" ← להפעיל "צלילים".' }),
        h('li', { text: 'כשהטלפון במצב שקט או רטט, גם ההתראות שקטות.' })
      ]));
      box.appendChild(h('p', { class: 'small', text: '⏰ תזכורת נשארת על המסך עד שלוחצים עליה.' }));
    }
    else if (!pushSupported()) {
      box.appendChild(h('p', { text: IS_IOS && !standalone() ? 'באייפון ההתראות עובדות רק באפליקציה המותקנת. קודם מתקינים למסך הבית ופותחים מהאייקון.' : 'המכשיר או הדפדפן הזה לא תומכים בהתראות.' }));
    } else if (Notification.permission === 'denied') {
      box.appendChild(h('p', { text: 'ההתראות חסומות במכשיר הזה.' }));
      box.appendChild(h('p', { class: 'small', text: IS_ANDROID ? 'באנדרואיד: הגדרות הטלפון ← אפליקציות ← "משימות" (או Chrome) ← התראות ← להפעיל. אחר כך לחזור לכאן וללחוץ "הפעלה".' :
        IS_IOS ? 'באייפון: הגדרות ← התראות ← "משימות" ← "אפשר התראות". אחר כך לחזור לכאן וללחוץ "הפעלה".' : 'לוחצים על הסמל שמשמאל לכתובת ← התראות ← "אפשר", ומרעננים.' }));
      box.appendChild(h('button', { class: 'btn secondary', type: 'button', text: 'הפעלה', onclick: function (e) { enablePush(e.currentTarget); } }));
    } else {
      box.appendChild(h('p', { text: 'כדי לקבל התראה על משימה חדשה, תגובה ותזכורת:' }));
      box.appendChild(h('button', { class: 'btn', type: 'button', text: 'הפעלת התראות', onclick: function (e) { enablePush(e.currentTarget); } }));
    }
    var prefs = S.me.prefs || { remind: 1, task: 1, comment: 1, response: 1 };
    var labels = [['remind', '⏰ תזכורות'], ['task', '📌 משימה חדשה'], ['comment', '💬 תגובות והקפצות'], ['response', '✓ אישור, דחייה וביצוע של משימות שנתתי']];
    box.appendChild(h('p', { class: 'small', text: 'על מה לקבל התראה:' }));
    labels.forEach(function (l) {
      var cb = h('input', { type: 'checkbox', 'data-pref': l[0] });
      cb.checked = prefs[l[0]] !== 0;
      cb.addEventListener('change', function () {
        var p = Object.assign({}, S.me.prefs || {});
        p[l[0]] = cb.checked ? 1 : 0;
        api('prefs', { prefs: p }).then(function (r) {
          if (r.ok) { S.me = r.me; sset('me', S.me); toast('נשמר ✓'); } else { cb.checked = !cb.checked; toast(errText(r)); }
        });
      });
      box.appendChild(h('label', { class: 'check-row' }, [cb, ' ' + l[1]]));
    });
    box.appendChild(h('p', { class: 'small', text: 'בשבת ובחג לא נשלחות התראות (מחצי שעה לפני הדלקת נרות ועד רבע שעה אחרי צאת השבת). מה שהצטבר נשלח ביום החול הבא ב-8:00.' }));
    return box;
  }

  function quotesSheet() {
    return function (el) {
      sheetHead(el, '💬 משפטי השראה');
      var list = (S.data.allQuotes || []).map(function (q) { return Object.assign({}, q); });
      var days = (S.data.settings && S.data.settings.quoteDays) || 1;
      el.appendChild(h('p', { class: 'small', text: 'כל הצוות רואה את אותו משפט באותו יום, בראש הלשונית "שלי".' }));
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'המשפט מתחלף כל' }),
        optChips([[1, 'יום'], [2, 'יומיים'], [3, '3 ימים'], [7, 'שבוע']], days, function (v) { days = v; })]));
      var box = h('div', {});
      function draw() {
        box.textContent = '';
        list.forEach(function (q, i) {
          var cb = h('input', { type: 'checkbox', 'aria-label': 'פעיל' });
          cb.checked = q.active !== false;
          cb.addEventListener('change', function () { q.active = cb.checked; });
          box.appendChild(h('div', { class: 'q-row' + (q.active === false ? ' off' : '') }, [
            h('label', { class: 'q-text' }, [cb, ' ' + q.text, q.source ? h('span', { class: 'small', text: ' (' + q.source + ')' }) : null]),
            h('button', { class: 'icon-btn small-x', type: 'button', 'aria-label': 'מחיקה', text: '✕', onclick: function () { list.splice(i, 1); draw(); } })
          ]));
        });
      }
      draw();
      el.appendChild(box);
      var nt = h('input', { type: 'text', maxlength: '300', placeholder: 'משפט חדש' });
      var ns = h('input', { type: 'text', maxlength: '80', placeholder: 'מקור (לא חובה)' });
      el.appendChild(h('div', { class: 'box' }, [h('h3', { text: 'הוספת משפט' }), nt, h('div', { style: 'height:8px' }), ns,
        h('button', { class: 'btn secondary', type: 'button', style: 'margin-top:8px', text: '+ הוספה לרשימה', onclick: function () {
          if (!nt.value.trim()) { nt.focus(); return; }
          list.push({ text: nt.value.trim(), source: ns.value.trim(), active: true });
          nt.value = ''; ns.value = '';
          draw();
        } })]));
      var saveBtn = h('button', { class: 'btn block', type: 'button', text: 'שמירה', onclick: function () {
        busy(saveBtn, true, 'שומר…');
        api('quotesSave', { quotes: list, quoteDays: days }).then(function (r) {
          busy(saveBtn, false);
          if (!r.ok) { toast(errText(r)); return; }
          takeSnapshot(r);
          closeSheet();
          toast('המשפטים נשמרו ✓');
        });
      } });
      el.appendChild(h('div', { class: 'actions' }, saveBtn));
    };
  }

  function settingsSheet() {
    return function (el) {
      sheetHead(el, 'הגדרות');
      el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: 'מחובר בתור: ' }), S.me.name + (isMgr() ? ' (מנהל)' : '')]));
      var ib = installBox();
      if (ib) el.appendChild(ib);
      el.appendChild(pushBox());
      var links = h('div', { class: 'actions' });
      links.appendChild(h('button', { class: 'btn secondary', type: 'button', text: '🔁 משימות חוזרות', onclick: function () { openSheet(seriesListSheet()); } }));
      if (isMgr() && SHOW_QUOTES) links.appendChild(h('button', { class: 'btn secondary', type: 'button', text: '💬 משפטי השראה', onclick: function () { openSheet(quotesSheet()); } }));
      el.appendChild(links);
      el.appendChild(h('div', { class: 'box' }, [
        h('h3', { text: '💻 כניסה ממכשיר נוסף' }),
        h('p', { text: 'במכשיר השני פותחים את הקישור, לוחצים "כבר נרשמתי" ומקלידים את מספר הטלפון ואת הקוד האישי.' }),
        h('p', { class: 'small ltr', text: APP_URL }),
        S.me.phone ? null : h('p', { class: 'msg bad', text: 'עוד לא נשמר אצלך מספר טלפון, ולכן אי אפשר להיכנס ממכשיר נוסף. המנהל יכול להוסיף אותו במסך "צוות".' })
      ]));
      el.appendChild(h('div', { class: 'actions' }, [
        h('button', { class: 'btn secondary', type: 'button', text: 'רענון הנתונים', onclick: function (e) {
          var b = e.currentTarget; busy(b, true, 'מרענן…');
          (S.outbox.length ? flush() : sync(true)).then(function () { busy(b, false); toast(S.net === 'ok' ? 'הנתונים עודכנו ✓' : 'אין חיבור לשרת כרגע'); });
        } }),
        h('button', { class: 'btn secondary', type: 'button', text: 'בדיקת עדכון לאפליקציה', onclick: checkForUpdate })
      ]));
      el.appendChild(h('button', {
        class: 'danger-link', type: 'button', text: 'יציאה מהמכשיר הזה', onclick: function () {
          var warn = (S.outbox.length || S.ups.length) ? '\nשימו לב: יש שינויים או קבצים שעוד לא נשמרו בשרת, והם יימחקו.' : '';
          if (!window.confirm('לצאת מהאפליקציה במכשיר הזה?' + warn)) return;
          api('logout', { pushToken: sget('pushToken', '') });
          S.outbox = []; sset('outbox', []);
          clearLocal();
          showLogin('יצאתם מהמכשיר. אפשר להיכנס שוב עם מספר הטלפון והקוד האישי.');
        }
      }));
      el.appendChild(h('p', { class: 'small', text: 'גרסה ' + APP_VERSION }));
    };
  }

  // ================================================================ כניסה
  var L = { step: 'code', code: '', name: '', needPhone: false, here: false };

  function showLogin(msg) {
    $('app').classList.add('hidden');
    var box = $('login');
    box.classList.remove('hidden');
    box.textContent = '';
    box.appendChild(h('img', { class: 'logo', src: 'icon-192.png', alt: '' }));
    var msgEl = h('div', { class: 'msg bad' + (msg ? '' : ' hidden'), text: msg || '' });
    function fail(text) { msgEl.textContent = text; msgEl.className = 'msg bad'; }

    if (L.step === 'code') {
      box.appendChild(h('h1', { text: 'משימות הצוות' }));
      box.appendChild(h('p', { class: 'lead', text: 'אורות התורה בת ים' }));
      if (IS_IOS && !standalone() && !L.here) {
        box.appendChild(h('div', { class: 'box' }, [
          h('h3', { text: 'קודם מתקינים את האפליקציה' }),
          h('ol', { class: 'steps' }, [
            h('li', { text: 'לוחצים על כפתור השיתוף בספארי (ריבוע עם חץ למעלה).' }),
            h('li', { text: 'בוחרים "הוסף למסך הבית" ← "הוסף".' }),
            h('li', { text: 'סוגרים את ספארי ופותחים את "משימות" מהאייקון החדש.' }),
            h('li', { text: 'שם מקלידים את קוד ההזמנה.' })
          ]),
          h('p', { class: 'small', text: 'חשוב: אם נכנסים כאן בספארי, הכניסה לא תעבור לאפליקציה המותקנת.' })
        ]));
        box.appendChild(h('button', { class: 'link-btn', type: 'button', text: 'להמשיך בספארי בכל זאת', onclick: function () { L.here = true; showLogin(); } }));
        return;
      }
      var ib = IS_ANDROID ? installBox() : null;
      if (ib) box.appendChild(ib);
      var code = h('input', { type: 'text', class: 'code-input', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '7', placeholder: '••••••', value: L.code, 'aria-label': 'קוד הזמנה' });
      var go = h('button', { class: 'btn block', type: 'button', text: 'המשך' });
      var submit = function () {
        var c = code.value.replace(/\D/g, '');
        if (c.length !== 6) { fail('קוד ההזמנה הוא 6 ספרות.'); return; }
        busy(go, true, 'בודק…');
        api('checkInvite', { code: c }).then(function (r) {
          busy(go, false);
          if (!r.ok) { fail(errText(r)); return; }
          L.step = 'pin'; L.code = c; L.name = r.name; L.needPhone = !!r.needPhone;
          showLogin();
        });
      };
      go.addEventListener('click', submit);
      code.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
      box.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'קוד הזמנה (6 ספרות, קיבלתם מהמנהל)' }), code]));
      box.appendChild(msgEl);
      box.appendChild(go);
      box.appendChild(h('div', { class: 'center', style: 'margin-top:18px' },
        h('button', { class: 'link-btn', type: 'button', text: 'כבר נרשמתי – כניסה ממכשיר נוסף', onclick: function () { L.step = 'other'; showLogin(); } })));
      return;
    }

    if (L.step === 'pin') {
      box.appendChild(h('h1', { text: 'שלום ' + L.name + '! 👋' }));
      box.appendChild(h('p', { class: 'lead', text: 'עוד צעד אחד ונכנסים.' }));
      var phone = h('input', { type: 'tel', class: 'ltr', inputmode: 'tel', placeholder: '050-1234567', autocomplete: 'tel', 'aria-label': 'מספר טלפון' });
      if (L.needPhone) box.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'מספר הטלפון הנייד שלך' }), phone]));
      var p1 = h('input', { type: 'tel', class: 'pin-input', inputmode: 'numeric', maxlength: '4', autocomplete: 'off', 'aria-label': 'קוד אישי' });
      var p2 = h('input', { type: 'tel', class: 'pin-input', inputmode: 'numeric', maxlength: '4', autocomplete: 'off', 'aria-label': 'אימות הקוד האישי' });
      box.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'בחרו קוד אישי של 4 ספרות' }), p1]));
      box.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'הקלידו אותו שוב' }), p2]));
      box.appendChild(h('p', { class: 'small', text: 'הקוד האישי משמש רק לכניסה ממכשיר נוסף (למשל מהמחשב). כדאי לזכור אותו.' }));
      box.appendChild(msgEl);
      var go2 = h('button', { class: 'btn block', type: 'button', text: 'כניסה' });
      go2.addEventListener('click', function () {
        if (L.needPhone && !phone.value.replace(/\D/g, '')) { fail('צריך למלא מספר טלפון.'); return; }
        if (!/^\d{4}$/.test(p1.value)) { fail(ERR.bad_pin); return; }
        if (p1.value !== p2.value) { fail('שני הקודים לא זהים. הקלידו שוב.'); p2.value = ''; return; }
        busy(go2, true, 'נכנס…');
        var req = { code: L.code, pin: p1.value, device: deviceName() };
        if (L.needPhone) req.phone = phone.value;
        api('redeem', req).then(function (r) {
          busy(go2, false);
          if (!r.ok) {
            if (r.error === 'bad_code') { L.step = 'code'; showLogin(errText(r)); return; }
            fail(errText(r));
            return;
          }
          loggedIn(r);
        });
      });
      box.appendChild(go2);
      box.appendChild(h('div', { class: 'center', style: 'margin-top:14px' },
        h('button', { class: 'link-btn', type: 'button', text: 'חזרה', onclick: function () { L.step = 'code'; showLogin(); } })));
      return;
    }

    // L.step === 'other': טלפון וקוד אישי
    box.appendChild(h('h1', { text: 'כניסה ממכשיר נוסף' }));
    box.appendChild(h('p', { class: 'lead', text: 'מקלידים את מספר הטלפון ואת הקוד האישי שבחרתם בכניסה הראשונה.' }));
    var ph = h('input', { type: 'tel', class: 'ltr', inputmode: 'tel', placeholder: '050-1234567', autocomplete: 'tel', 'aria-label': 'מספר טלפון' });
    var pin = h('input', { type: 'tel', class: 'pin-input', inputmode: 'numeric', maxlength: '4', autocomplete: 'off', 'aria-label': 'קוד אישי' });
    box.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'מספר טלפון נייד' }), ph]));
    box.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'קוד אישי (4 ספרות)' }), pin]));
    box.appendChild(msgEl);
    var go3 = h('button', { class: 'btn block', type: 'button', text: 'כניסה' });
    go3.addEventListener('click', function () {
      if (!ph.value.replace(/\D/g, '')) { fail('צריך למלא מספר טלפון.'); return; }
      if (!/^\d{4}$/.test(pin.value)) { fail(ERR.bad_pin); return; }
      busy(go3, true, 'נכנס…');
      api('pinLogin', { phone: ph.value, pin: pin.value, device: deviceName() }).then(function (r) {
        busy(go3, false);
        if (!r.ok) { fail(errText(r)); pin.value = ''; return; }
        loggedIn(r);
      });
    });
    box.appendChild(go3);
    box.appendChild(h('p', { class: 'small', style: 'margin-top:14px', text: 'שכחתם את הקוד? בקשו מהמנהל "קוד הזמנה חדש".' }));
    box.appendChild(h('div', { class: 'center' },
      h('button', { class: 'link-btn', type: 'button', text: 'יש לי קוד הזמנה', onclick: function () { L.step = 'code'; showLogin(); } })));
  }

  function loggedIn(r) {
    if (sget('outboxOwner', null) !== r.me.id) { S.outbox = []; sset('outbox', []); }
    S.token = r.token; sset('token', S.token);
    S.me = r.me; sset('me', S.me);
    S.data = emptyData();
    S.seen = { base: new Date().toISOString(), t: {} }; sset('seen', S.seen);
    L = { step: 'code', code: '', name: '', needPhone: false, here: false };
    derive();
    render();
    sync(true).then(function () { checkHash(); checkShare(); });
    refreshPush();
    toast('ברוכים הבאים, ' + S.me.name + '!');
  }

  // ================================================================ הודעות ועדכונים
  var toastT = 0;
  function toast(text, actionLabel, action) {
    var el = $('toast');
    el.textContent = '';
    el.appendChild(h('span', { text: text }));
    if (actionLabel) el.appendChild(h('button', { type: 'button', text: actionLabel, onclick: function () { hideToast(); action(); } }));
    el.classList.remove('hidden');
    clearTimeout(toastT);
    toastT = setTimeout(hideToast, actionLabel ? 6000 : 3500);
  }
  function hideToast() { $('toast').classList.add('hidden'); }

  function banner(text, onClick) {
    var b = $('banner');
    b.textContent = text;
    b.onclick = onClick;
    b.classList.remove('hidden');
  }

  var swReg = null, wantReload = false, lastSwCheck = 0;
  function showUpdateBanner() { banner('יש גרסה חדשה של האפליקציה. לחצו כאן לרענון.', applyUpdate); }
  function applyUpdate() {
    wantReload = true;
    if (swReg && swReg.waiting) swReg.waiting.postMessage('skipWaiting');
    else location.reload();
    setTimeout(function () { location.reload(); }, 4000);
  }
  function checkForUpdate() {
    if (!swReg) { toast('האפליקציה מעודכנת (גרסה ' + APP_VERSION + ')'); return; }
    swReg.update().then(function () {
      setTimeout(function () {
        if (swReg.waiting || swReg.installing) showUpdateBanner();
        else toast('האפליקציה מעודכנת (גרסה ' + APP_VERSION + ')');
      }, 1500);
    }, function () { toast('אין חיבור לבדיקת עדכון'); });
  }
  function initSW() {
    if (!('serviceWorker' in navigator) || location.protocol !== 'https:') return;
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      swReg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner();
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
        });
      });
    }).catch(function () { /* בלי התקנה במצב לא מאובטח */ });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (wantReload) location.reload(); });
  }

  // ================================================================ קישור ישיר למשימה, שיתוף מוואטסאפ, גרירת קבצים
  function checkHash() {
    var m = /^#t=([a-z0-9]{8,40})$/i.exec(location.hash || '');
    if (!m || !S.token) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* לא חשוב */ }
    openTask(m[1]);
  }
  function checkShare() {
    if (!/[?&]share=1/.test(location.search) || !S.token) return;
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* לא חשוב */ }
    idbGet('share', 'last').then(function (d) {
      if (!d) return;
      idbDel('share', 'last').catch(function () {});
      var text = [d.title, d.text, d.url].filter(function (x) { return x; }).join('\n');
      var p = parsePasted(text);
      Promise.all((d.files || []).map(function (f) { return makeAttachment(f.blob || f).catch(function () { return null; }); })).then(function (atts) {
        openSheet(editSheet(null, { title: p.title, note: p.note, files: atts.filter(function (a) { return a; }), source: 'share' }));
      });
    }).catch(function () {});
  }
  function initDrop() {
    var box = $('sheetBox');
    var dropInfo = function () { var t = topSheet(); return t ? { target: t.node && t.node.dropTarget, taskId: t.b.taskId } : {}; };
    box.addEventListener('dragover', function (e) { var d = dropInfo(); if (d.target || d.taskId) { e.preventDefault(); box.classList.add('drop'); } });
    box.addEventListener('dragleave', function () { box.classList.remove('drop'); });
    box.addEventListener('drop', function (e) {
      box.classList.remove('drop');
      var files = Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []);
      if (!files.length) return;
      e.preventDefault();
      var d = dropInfo();
      files.forEach(function (f) {
        makeAttachment(f).then(function (a) {
          if (d.target) d.target(a);
          else if (d.taskId) { queueUpload(d.taskId, a); toast('הקובץ נוסף ✓'); }
        }, function (er) { toast(er.message); });
      });
    });
  }

  // ================================================================ הפעלה
  function init() {
    if (S.outbox.length && sget('outboxOwner', null) !== (S.me && S.me.id)) { S.outbox = []; sset('outbox', []); }
    if (S.token && !S.seen) { S.seen = { base: new Date().toISOString(), t: {} }; sset('seen', S.seen); }
    derive();
    $('fab').addEventListener('click', function () { openSheet(editSheet(null)); });
    $('btnSettings').addEventListener('click', function () { openSheet(settingsSheet()); });
    $('syncState').addEventListener('click', function () {
      if (S.outbox.length) { flush(); toast('מנסים לשמור שוב. השינויים שמורים בטלפון ולא יאבדו.'); }
      else { sync(true); processUploads(); }
    });
    $('sheetWrap').addEventListener('click', function (e) { if (e.target === $('sheetWrap')) closeSheet(); });
    // כשהמקלדת נפתחת, החלון מתכווץ לחלק הגלוי של המסך, כך שאפשר לגלול בו עד הסוף
    var vv = window.visualViewport;
    if (vv) {
      var fitSheet = function (e) {
        var w = $('sheetWrap');
        w.style.top = vv.offsetTop + 'px';
        w.style.height = vv.height + 'px';
        w.style.bottom = 'auto';
        var a = document.activeElement;
        if (e && e.type === 'resize' && a && w.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) {
          setTimeout(function () { try { a.scrollIntoView({ block: 'nearest' }); } catch (x) { /* לא חשוב */ } }, 50);
        }
      };
      vv.addEventListener('resize', fitSheet);
      vv.addEventListener('scroll', fitSheet);
      fitSheet();
    }
    initDrop();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stack.length) closeSheet(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      tick();
      render(); // "היום" ו"פתוחה כבר" מתעדכנים
      if (swReg && Date.now() - lastSwCheck > 30 * 60000) { lastSwCheck = Date.now(); swReg.update().catch(function () {}); }
    });
    window.addEventListener('online', function () { tick(); processUploads(); });
    window.addEventListener('hashchange', checkHash);
    if ('serviceWorker' in navigator) { // לחיצה על התראה כשהאפליקציה כבר פתוחה: פותחים את המשימה בלי לטעון מחדש
      navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.openTask && S.token) openTask(e.data.openTask); });
    }
    setInterval(function () { if (!document.hidden) tick(); }, 60000);
    render();
    initSW();
    if (S.token) {
      tick();
      processUploads();
      refreshPush();
      checkHash();
      checkShare();
    }
    window.TT = { S: S, V: V, flush: flush, sync: sync, version: APP_VERSION, parsePasted: parsePasted, acceptLate: acceptLate, makeAttachment: makeAttachment, queueUpload: queueUpload, ruleText: ruleText, hebParts: hebParts, openTask: openTask, render: render };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
