/* משימות צוות – המסך (שלב 1: בסיס). כל טקסט בעברית, מימין לשמאל. */
(function () {
  'use strict';

  var APP_VERSION = '1.0.1';
  var API_LEVEL = 1;
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
  function dueLabel(s) {
    var diff = dayDiff(today(), s);
    if (diff < 0) return { text: 'באיחור ' + daysWord(-diff), cls: 'late' };
    if (diff === 0) return { text: 'להיום', cls: 'today' };
    if (diff === 1) return { text: 'למחר', cls: '' };
    if (diff < 7) return { text: 'עד יום ' + DAYS[dateOf(s).getDay()], cls: '' };
    return { text: 'עד ' + shortDate(s), cls: '' };
  }
  function ageInfo(t) {
    var n = dayDiff(isoDay(t.createdAt) || today(), today());
    return { text: n <= 0 ? 'נפתחה היום' : 'פתוחה ' + daysWord(n), cls: n >= 7 ? 'age-red' : n >= 3 ? 'age-orange' : '' };
  }
  function whenShort(iso) {
    if (!iso) return '';
    return isoDay(iso) === today() ? 'היום ב-' + timeOf(iso) : 'ב-' + shortDate(isoDay(iso));
  }

  // ================================================================ מצב
  var S = {
    token: sget('token', ''),
    me: sget('me', null),
    data: sget('data', null) || { ver: '', users: [], tasks: [] },
    outbox: sget('outbox', []),
    tab: sget('tab', 'mine'),
    net: 'ok',
    flushing: false, syncing: false, retryTimer: 0, dragging: false, renderLater: false
  };
  var V = { tasks: [], users: [], pending: {} }; // הנתונים מהשרת + פעולות שעוד לא נשלחו

  function derive() {
    V.users = S.data.users || [];
    V.tasks = (S.data.tasks || []).map(function (t) { return Object.assign({}, t); });
    V.pending = {};
    S.outbox.forEach(function (op) {
      applyLocal(V, op);
      if (op.id) V.pending[op.id] = 1;
      if (op.task) V.pending[op.task.id] = 1;
    });
  }
  function findTask(v, id) { for (var i = 0; i < v.tasks.length; i++) if (v.tasks[i].id === id) return v.tasks[i]; return null; }
  function task(id) { return findTask(V, id); }
  function user(id) { for (var i = 0; i < V.users.length; i++) if (V.users[i].id === id) return V.users[i]; return null; }
  function uname(id) { if (S.me && id === S.me.id) return S.me.name; var u = user(id); return u ? u.name : '?'; }
  function isMgr() { return !!S.me && S.me.role === 'manager'; }
  function byName(a, b) { return a.name.localeCompare(b.name, 'he'); }

  /** מבצע פעולה על הנתונים במכשיר, בדיוק כמו שהשרת יבצע אותה. */
  function applyLocal(v, op) {
    var me = S.me ? S.me.id : '';
    if (op.type === 'create') {
      if (findTask(v, op.task.id)) return;
      v.tasks.push(Object.assign({ note: '', priority: 'normal', dueDate: '', rank: null, status: 'open' }, op.task, {
        assigneeId: op.task.assigneeId || me, createdById: me, createdAt: op.at, updatedAt: op.at
      }));
      return;
    }
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
        if ('assigneeId' in op.fields && op.fields.assigneeId !== t.assigneeId) t.rank = null;
        Object.assign(t, op.fields);
        break;
      case 'done': if (t.status === 'open') { t.status = 'done'; t.doneAt = op.at; t.doneById = me; } break;
      case 'reopen': t.status = 'open'; t.doneAt = ''; t.doneById = ''; break;
      case 'cancel': t.status = 'cancelled'; break;
      case 'delete': v.tasks = v.tasks.filter(function (x) { return x !== t; }); return;
    }
    t.updatedAt = op.at;
  }

  // ================================================================ שרת
  function api(action, payload) {
    if (!SERVER) return Promise.resolve({ ok: false, error: 'no_server' });
    var body = JSON.stringify(Object.assign({ action: action, token: S.token || '' }, payload || {}));
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 40000) : 0;
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
    bad_assignee: 'העובד שנבחר כבר לא פעיל.',
    self: 'אי אפשר להשבית את עצמכם או לשנות את ההרשאה של עצמכם.',
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
      if (r.ok) { if (!r.same) takeSnapshot(r); setNet('ok'); }
      else if (r.error === 'auth') lostLogin();
      else if (r.error === 'network') setNet('nonet');
    });
  }

  function tick() { if (!S.token) return; if (S.outbox.length) flush(); else sync(); }

  function takeSnapshot(r) {
    if (r.me) { S.me = r.me; sset('me', S.me); }
    if (r.tasks) {
      S.data = { ver: r.ver || '', users: r.users || [], tasks: r.tasks };
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
    S.token = ''; S.me = null; S.data = { ver: '', users: [], tasks: [] };
    ['token', 'me', 'data'].forEach(sdel);
    while (stack.length) stack.pop();
    showTop();
    derive();
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
    var n = S.outbox.length;
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
    var mineN = V.tasks.filter(function (t) { return t.assigneeId === me && t.status === 'open'; }).length;
    var givenN = V.tasks.filter(function (t) { return t.createdById === me && t.assigneeId !== me && t.status === 'open'; }).length;
    var tabs = [['mine', 'שלי', mineN], ['given', 'נתתי', givenN]];
    if (isMgr()) tabs.push(['team', 'צוות', 0]);
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
    el.textContent = '';
    if (S.tab === 'given') viewGiven(el);
    else if (S.tab === 'team' && isMgr()) viewTeam(el);
    else viewMine(el);
  }

  // ---------------------------------------------------------------- מיון
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
  function myOpen() {
    var me = S.me.id;
    var open = V.tasks.filter(function (t) { return t.assigneeId === me && t.status === 'open'; });
    var manual = open.some(function (t) { return t.rank !== null && t.rank !== undefined; });
    open.forEach(function (t) { if (t.rank === undefined) t.rank = null; });
    open.sort(manual ? manualCmp : autoCmp);
    return { list: open, manual: manual };
  }
  function doneOn(day, uid) {
    return V.tasks.filter(function (t) { return t.assigneeId === uid && t.status === 'done' && isoDay(t.doneAt) === day; })
      .sort(function (a, b) { return (b.doneAt || '').localeCompare(a.doneAt || ''); });
  }

  // ---------------------------------------------------------------- "שלי"
  function viewMine(el) {
    var o = myOpen();
    el.appendChild(h('div', { class: 'sec' }, [
      h('span', { text: 'המשימות שלי' }),
      o.manual
        ? h('button', { class: 'link-btn', type: 'button', text: 'סדר אוטומטי', onclick: function () { queue({ type: 'autoOrder' }); toast('הרשימה חזרה לסדר אוטומטי'); } })
        : (o.list.length > 1 ? h('span', { class: 'hint', text: 'גוררים ≡ כדי לשנות סדר' }) : null)
    ]));
    if (!o.list.length) {
      el.appendChild(h('div', { class: 'empty' }, [h('div', { class: 'big', text: '🎉' }), 'אין משימות פתוחות.', h('br'), 'לחצו על + כדי להוסיף משימה.']));
    } else {
      var ul = h('ul', { class: 'list', 'data-list': 'mine' });
      o.list.forEach(function (t) { ul.appendChild(card(t, 'mine', o.list.length > 1)); });
      el.appendChild(ul);
    }
    var done = doneOn(today(), S.me.id);
    if (done.length) {
      el.appendChild(h('div', { class: 'sec' }, [h('span', { text: 'בוצעו היום (' + done.length + ') 👏' })]));
      var ul2 = h('ul', { class: 'list' });
      done.forEach(function (t) { ul2.appendChild(card(t, 'mine', false)); });
      el.appendChild(ul2);
    }
  }

  // ---------------------------------------------------------------- "נתתי"
  function viewGiven(el) {
    var me = S.me.id;
    var given = V.tasks.filter(function (t) { return t.createdById === me && t.assigneeId !== me; });
    var open = given.filter(function (t) { return t.status === 'open'; }).sort(autoCmp);
    var week = addDays(today(), -7);
    var done = given.filter(function (t) { return t.status === 'done' && isoDay(t.doneAt) >= week; })
      .sort(function (a, b) { return (b.doneAt || '').localeCompare(a.doneAt || ''); });
    el.appendChild(h('div', { class: 'sec' }, [h('span', { text: 'משימות שנתתי לאחרים' })]));
    if (!open.length) {
      el.appendChild(h('div', { class: 'empty' }, ['אין משימות פתוחות שנתתם לאחרים.', h('br'),
        h('span', { class: 'small', text: 'כדי לתת משימה, לוחצים + ובוחרים "למי".' })]));
    } else {
      var ul = h('ul', { class: 'list' });
      open.forEach(function (t) { ul.appendChild(card(t, 'given', false)); });
      el.appendChild(ul);
    }
    if (done.length) {
      el.appendChild(h('div', { class: 'sec' }, [h('span', { text: 'בוצעו בשבוע האחרון' })]));
      var ul2 = h('ul', { class: 'list' });
      done.forEach(function (t) { ul2.appendChild(card(t, 'given', false)); });
      el.appendChild(ul2);
    }
  }

  // ---------------------------------------------------------------- "צוות" (מנהל)
  function counts(uid) {
    var td = today();
    var open = V.tasks.filter(function (t) { return t.assigneeId === uid && t.status === 'open'; });
    return {
      open: open,
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
    var box = h('div', { class: 'people' });
    users.forEach(function (u) {
      var c = counts(u.id);
      var parts = [c.open.length === 1 ? 'משימה פתוחה אחת' : c.open.length + ' פתוחות'];
      if (c.late) parts.push(c.late + ' באיחור');
      if (c.doneToday) parts.push(c.doneToday + ' בוצעו היום');
      var st = userStatus(u);
      box.appendChild(h('button', {
        class: 'person' + (u.active ? '' : ' off'), type: 'button', 'data-user': u.id,
        onclick: function () { openSheet(userSheet(u.id)); }
      }, [
        h('span', { class: 'avatar', text: (u.name || '?').charAt(0) }),
        h('span', { class: 'grow' }, [
          h('span', { class: 'pname' }, [u.name, u.role === 'manager' ? h('span', { class: 'role', text: 'מנהל' }) : null]),
          u.active ? h('span', { class: 'stats', text: parts.join(' · ') }) : null,
          st ? h('span', { class: 'pstatus', text: st }) : null
        ]),
        h('span', { class: 'chev', text: '‹' })
      ]));
    });
    el.appendChild(box);
  }

  // ---------------------------------------------------------------- כרטיס משימה
  function chip(text, cls) { return h('span', { class: 'chip' + (cls ? ' ' + cls : ''), text: text }); }

  function card(t, mode, draggable) {
    var me = S.me.id;
    var li = h('li', { class: 'task p-' + (t.priority || 'normal') + ' is-' + t.status, 'data-id': t.id });
    var check = h('button', {
      class: 'check', type: 'button', 'aria-label': t.status === 'done' ? 'החזרה לפתוחות' : 'סימון כבוצע'
    }, h('span', { class: 'ring', text: t.status === 'done' ? '✓' : '' }));
    if (t.status === 'open' || t.status === 'done') {
      check.addEventListener('click', function (e) { e.stopPropagation(); toggleDone(t.id); });
    } else check.disabled = true;

    var meta = h('div', { class: 'meta' });
    if (t.priority === 'high' && t.status === 'open') meta.appendChild(chip('דחוף', 'urgent'));
    if (t.priority === 'low' && t.status === 'open') meta.appendChild(chip('לא דחוף', ''));
    if (t.dueDate && t.status === 'open') { var d = dueLabel(t.dueDate); meta.appendChild(chip(d.text, d.cls)); }
    if (mode === 'mine' && t.createdById !== me) meta.appendChild(chip('מאת ' + uname(t.createdById), ''));
    if (mode === 'given') meta.appendChild(chip('אצל ' + uname(t.assigneeId), ''));
    if (mode === 'team' && t.createdById !== t.assigneeId) meta.appendChild(chip('מאת ' + uname(t.createdById), ''));
    if (t.status === 'open') { var a = ageInfo(t); meta.appendChild(chip(a.text, a.cls)); }
    if (t.status === 'done' && mode !== 'mine') meta.appendChild(chip('✓ בוצעה ' + whenShort(t.doneAt), 'okc'));
    if (t.status === 'cancelled') meta.appendChild(chip('בוטלה', ''));
    if (t.note) meta.appendChild(chip('📝 הערה', ''));
    if (V.pending[t.id]) meta.appendChild(chip('⏳ ממתין לשמירה', 'pend'));

    add(li, [check, h('div', { class: 'body' }, [h('div', { class: 'ttl', text: t.title }), meta])]);
    if (draggable) {
      var hd = h('button', { class: 'handle', type: 'button', 'aria-label': 'גרירה לשינוי הסדר', text: '≡' });
      hd.addEventListener('pointerdown', startDrag);
      hd.addEventListener('click', function (e) { e.stopPropagation(); });
      li.appendChild(hd);
    }
    li.addEventListener('click', function () { openSheet(taskSheet(t.id)); });
    return li;
  }

  var CHEERS = ['כל הכבוד! ✓', 'יישר כח! 👏', 'מצוין, בוצע ✓', 'עוד אחת מאחוריך 💪', 'בוצע. תודה! ✓'];
  function toggleDone(id) {
    var t = task(id);
    if (!t) return;
    if (t.status === 'open') {
      queue({ type: 'done', id: id });
      toast(CHEERS[Math.floor(Math.random() * CHEERS.length)], 'ביטול', function () { queue({ type: 'reopen', id: id }); });
    } else if (t.status === 'done') {
      queue({ type: 'reopen', id: id });
      toast('המשימה חזרה לפתוחות');
    }
  }

  function moveToTop(id) {
    var ids = myOpen().list.map(function (t) { return t.id; }).filter(function (x) { return x !== id; });
    ids.unshift(id);
    queue({ type: 'order', ids: ids });
  }

  // ---------------------------------------------------------------- גרירה לשינוי סדר
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
        var ids = items.map(function (x) { return x.getAttribute('data-id'); });
        ids.splice(from, 1);
        ids.splice(to, 0, li.getAttribute('data-id'));
        queue({ type: 'order', ids: ids });
      } else if (S.renderLater) { S.renderLater = false; render(); }
    }
    hd.addEventListener('pointermove', move);
    hd.addEventListener('pointerup', up);
    hd.addEventListener('pointercancel', up);
  }

  // ================================================================ חלונות
  var stack = [];
  function openSheet(builder) {
    stack.push(builder);
    try { history.pushState({ sheet: stack.length }, ''); } catch (e) { /* לא נתמך */ }
    showTop(true);
  }
  function replaceSheet(builder) { stack[stack.length - 1] = builder; showTop(true); }
  function closeSheet() {
    if (!stack.length) return;
    if (history.state && history.state.sheet) history.back();
    else { stack.pop(); showTop(); }
  }
  function showTop(focus) {
    var wrap = $('sheetWrap'), el = $('sheet');
    if (!stack.length) {
      wrap.classList.add('hidden');
      el.textContent = '';
      document.body.classList.remove('noscroll');
      return;
    }
    wrap.classList.remove('hidden');
    document.body.classList.add('noscroll');
    el.textContent = '';
    var f = stack[stack.length - 1](el);
    if (focus) {
      $('sheetBox').scrollTop = 0;
      if (f && f.focus) f.focus();
    }
  }
  function refreshSheet() { // חלון שמציג נתונים מתעדכן; חלון עם טופס לא נוגעים בו
    if (!stack.length || !stack[stack.length - 1].live) return;
    var box = $('sheetBox'), y = box.scrollTop;
    showTop(false);
    box.scrollTop = y;
  }
  window.addEventListener('popstate', function () { if (stack.length) { stack.pop(); showTop(); } });

  function sheetHead(el, title) {
    el.appendChild(h('div', { class: 'sheet-head' }, [
      h('h2', { text: title }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'סגירה', text: '✕', onclick: closeSheet })
    ]));
  }
  function live(fn) { fn.live = true; return fn; }

  // ---------------------------------------------------------------- פרטי משימה
  function taskSheet(id) {
    return live(function (el) {
      var t = task(id);
      if (!t) { sheetHead(el, 'המשימה לא נמצאה'); el.appendChild(h('p', { text: 'ייתכן שהיא נמחקה.' })); return; }
      var me = S.me.id, mgr = isMgr();
      var canEdit = mgr || t.createdById === me;
      sheetHead(el, t.title);

      var status;
      if (t.status === 'done') {
        var took = dayDiff(isoDay(t.createdAt), isoDay(t.doneAt));
        status = '✓ בוצעה ' + whenShort(t.doneAt) + (t.doneById && t.doneById !== t.assigneeId ? ' (סימן ' + uname(t.doneById) + ')' : '') +
          ' · ' + (took <= 0 ? 'באותו יום' : 'תוך ' + daysWord(took));
      } else if (t.status === 'cancelled') status = 'המשימה בוטלה';
      else {
        var bits = [t.priority === 'high' ? '🔴 דחוף' : t.priority === 'low' ? '⚪ לא דחוף' : '🟡 רגיל'];
        if (t.dueDate) bits.push(dueLabel(t.dueDate).text + ' (' + shortDate(t.dueDate) + ')');
        bits.push(ageInfo(t).text);
        status = bits.join(' · ');
      }
      el.appendChild(h('div', { class: 'status-line', text: status }));
      el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: 'אחראי: ' }), t.assigneeId === me ? 'אני' : uname(t.assigneeId)]));
      el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: 'נוצרה: ' }),
        fullDate(t.createdAt) + ' (' + hebDate(t.createdAt) + ')' + (t.createdById === me ? '' : ' · ע״י ' + uname(t.createdById))]));
      if (t.note) el.appendChild(h('div', { class: 'note-box', text: t.note }));
      if (V.pending[t.id]) el.appendChild(h('div', { class: 'msg bad', text: '⏳ השינוי האחרון עוד לא נשמר בשרת. הוא שמור בטלפון ויישלח כשיהיה חיבור.' }));

      var acts = h('div', { class: 'actions' });
      if (t.status === 'open') {
        acts.appendChild(h('button', { class: 'btn ok', type: 'button', text: '✓ בוצע', onclick: function () { closeSheet(); toggleDone(id); } }));
        if (t.assigneeId === me && myOpen().list.length > 1 && myOpen().list[0].id !== id) {
          acts.appendChild(h('button', { class: 'btn secondary', type: 'button', text: '⬆ לראש הרשימה', onclick: function () { moveToTop(id); closeSheet(); toast('הועברה לראש הרשימה'); } }));
        }
      } else if (t.status === 'done') {
        acts.appendChild(h('button', { class: 'btn secondary', type: 'button', text: 'החזרה לפתוחות', onclick: function () { queue({ type: 'reopen', id: id }); toast('המשימה חזרה לפתוחות'); } }));
      } else if (t.status === 'cancelled' && canEdit) {
        acts.appendChild(h('button', { class: 'btn secondary', type: 'button', text: 'שחזור המשימה', onclick: function () { queue({ type: 'reopen', id: id }); toast('המשימה שוחזרה'); } }));
      }
      if (canEdit && t.status === 'open') {
        acts.appendChild(h('button', { class: 'btn secondary', type: 'button', text: '✎ עריכה', onclick: function () { openSheet(editSheet(id)); } }));
        acts.appendChild(h('button', {
          class: 'btn danger', type: 'button', text: 'ביטול המשימה', onclick: function () {
            queue({ type: 'cancel', id: id });
            closeSheet();
            toast('המשימה בוטלה', 'שחזור', function () { queue({ type: 'reopen', id: id }); });
          }
        }));
      }
      el.appendChild(acts);
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

  // ---------------------------------------------------------------- הוספה ועריכה
  // תיבת טקסט שגדלה עם התוכן עד גובה מרבי, ומשם נגללת בתוכה
  function grow(ta, max) {
    if (!ta.offsetParent) return; // מוסתרת: נחשב כשתוצג
    ta.style.height = 'auto';
    var need = ta.scrollHeight + 2;
    ta.style.height = Math.min(need, max) + 'px';
    ta.style.overflowY = need > max ? 'auto' : 'hidden';
  }
  function noteMax() { return Math.max(120, Math.round((window.visualViewport ? visualViewport.height : window.innerHeight) * 0.4)); }

  function optChips(options, current, onPick) {
    var box = h('div', { class: 'chips' });
    options.forEach(function (o) {
      box.appendChild(h('button', {
        class: 'opt' + (o[0] === current ? ' on' : ''), type: 'button', 'data-v': o[0], text: o[1],
        onclick: function (e) {
          Array.prototype.forEach.call(box.children, function (b) { b.classList.remove('on'); });
          e.currentTarget.classList.add('on');
          onPick(o[0]);
        }
      }));
    });
    return box;
  }

  function editSheet(id) {
    return function (el) {
      var t = id ? task(id) : null;
      if (id && !t) { sheetHead(el, 'המשימה לא נמצאה'); return; }
      var st = { priority: t ? t.priority : 'normal', dueDate: t ? (t.dueDate || '') : '' };
      sheetHead(el, t ? 'עריכת משימה' : 'משימה חדשה');

      // שם המשימה: תיבה שגדלה עם הטקסט, כדי שכל מה שכתוב ייראה (Enter = שמירה)
      var title = h('textarea', { class: 'title-input', rows: '1', maxlength: '200', placeholder: 'מה צריך לעשות?', enterkeyhint: 'done', 'aria-label': 'מה צריך לעשות' });
      title.value = t ? t.title : '';
      title.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); save(); } });
      title.addEventListener('input', function () {
        title.classList.remove('err');
        if (/[\r\n]/.test(title.value)) title.value = title.value.replace(/\s*[\r\n]+\s*/g, ' ');
        grow(title, 168);
      });
      el.appendChild(h('div', { class: 'field' }, title));
      grow(title, 168);

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
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'למי' }), sel]));

      var td = today(), tm = addDays(td, 1), th = nextThursday();
      var dueOpts = [['', 'בלי תאריך'], [td, 'היום'], [tm, 'מחר']];
      if (th !== td && th !== tm) dueOpts.push([th, 'עד חמישי']);
      dueOpts.push(['pick', '📅 תאריך…']);
      var preset = dueOpts.some(function (o) { return o[0] === st.dueDate; });
      var dateIn = h('input', { type: 'date', class: preset ? 'hidden' : '', value: preset ? '' : st.dueDate, min: td, 'aria-label': 'תאריך יעד' });
      dateIn.style.marginTop = '8px';
      var picked = preset ? st.dueDate : 'pick';
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'עד מתי' }),
        optChips(dueOpts, picked, function (v) {
          picked = v;
          dateIn.classList.toggle('hidden', v !== 'pick');
          if (v === 'pick') { if (!dateIn.value) dateIn.value = addDays(td, 2); try { dateIn.showPicker(); } catch (e) { dateIn.focus(); } }
        }), dateIn]));

      var note = h('textarea', { placeholder: 'פרטים נוספים (לא חובה)', maxlength: '2000', 'aria-label': 'הערה' });
      note.value = t ? (t.note || '') : '';
      note.addEventListener('input', function () { grow(note, noteMax()); });
      var noteField = h('div', { class: 'field' + (note.value ? '' : ' hidden') }, [h('span', { class: 'lbl', text: 'הערה' }), note]);
      var noteBtn = h('button', { class: 'link-btn' + (note.value ? ' hidden' : ''), type: 'button', text: '+ הוספת הערה', onclick: function () { noteBtn.classList.add('hidden'); noteField.classList.remove('hidden'); grow(note, noteMax()); note.focus(); } });
      el.appendChild(noteBtn);
      el.appendChild(noteField);
      grow(note, noteMax());

      el.appendChild(h('div', { class: 'actions' }, h('button', { class: 'btn block', type: 'button', text: t ? 'שמירה' : 'הוספת המשימה', onclick: save })));

      function save() {
        var v = title.value.trim();
        if (!v) { title.classList.add('err'); title.focus(); toast('צריך לכתוב מה צריך לעשות'); return; }
        var due = picked === 'pick' ? (dateIn.value || '') : picked;
        var fields = { title: v, note: note.value.trim(), priority: st.priority, assigneeId: sel.value, dueDate: due };
        if (!t) {
          queue({ type: 'create', task: Object.assign({ id: rid() }, fields) });
          closeSheet();
          toast(fields.assigneeId === S.me.id ? 'המשימה נוספה ✓' : 'המשימה נשלחה ל' + uname(fields.assigneeId) + ' ✓');
        } else {
          var ch = {};
          Object.keys(fields).forEach(function (k) { if ((t[k] || '') !== fields[k]) ch[k] = fields[k]; });
          if (Object.keys(ch).length) queue({ type: 'update', id: t.id, fields: ch });
          closeSheet();
          toast('נשמר ✓');
        }
      }
      return t ? null : title;
    };
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
      ? 'להשבית את ' + u.name + '?\nהכניסה שלו תבוטל מיד בכל המכשירים. המשימות שלו יישארו.'
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
      '3. פותחים את האפליקציה מהאייקון ומקלידים את קוד ההזמנה: ' + code + '\n\n' +
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

  function addUserSheet() {
    return function (el) {
      var role = 'employee';
      sheetHead(el, 'הוספת עובד');
      var name = h('input', { type: 'text', maxlength: '40', placeholder: 'למשל: משה כהן', autocomplete: 'off' });
      var phone = h('input', { type: 'tel', class: 'ltr', inputmode: 'tel', placeholder: '050-1234567', autocomplete: 'off' });
      var msg = h('div', { class: 'msg bad hidden' });
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'שם' }), name]));
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'טלפון נייד' }), phone]));
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'תפקיד' }),
        optChips([['employee', 'עובד'], ['manager', 'מנהל (רואה הכל)']], role, function (v) { role = v; })]));
      el.appendChild(msg);
      var btn = h('button', { class: 'btn block', type: 'button', text: 'הוספה וקבלת קוד הזמנה' });
      btn.addEventListener('click', function () {
        msg.classList.add('hidden');
        if (!name.value.trim()) { msg.textContent = ERR.no_name; msg.classList.remove('hidden'); return; }
        busy(btn, true, 'שומר…');
        api('addUser', { name: name.value, phone: phone.value, role: role }).then(function (r) {
          busy(btn, false);
          if (!r.ok) {
            if (r.error === 'auth') { lostLogin(); return; }
            msg.textContent = errText(r);
            msg.classList.remove('hidden');
            return;
          }
          takeSnapshot(r);
          replaceSheet(inviteSheet(r.userId, r.inviteCode));
        });
      });
      el.appendChild(h('div', { class: 'actions' }, btn));
      el.appendChild(h('p', { class: 'small', text: 'אחרי ההוספה יופיע קוד הזמנה, עם כפתור לשליחה לעובד בוואטסאפ.' }));
      return name;
    };
  }

  function editUserSheet(uid) {
    return function (el) {
      var u = user(uid);
      if (!u) { sheetHead(el, 'העובד לא נמצא'); return; }
      var self = u.id === S.me.id, role = u.role;
      sheetHead(el, 'עריכת פרטים');
      var name = h('input', { type: 'text', maxlength: '40', value: u.name });
      var phone = h('input', { type: 'tel', class: 'ltr', inputmode: 'tel', value: prettyPhone(u.phone), placeholder: '050-1234567' });
      var msg = h('div', { class: 'msg bad hidden' });
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'שם' }), name]));
      el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'טלפון נייד' }), phone]));
      if (!self) {
        el.appendChild(h('div', { class: 'field' }, [h('span', { class: 'lbl', text: 'תפקיד' }),
          optChips([['employee', 'עובד'], ['manager', 'מנהל (רואה הכל)']], role, function (v) { role = v; })]));
      }
      el.appendChild(msg);
      var btn = h('button', { class: 'btn block', type: 'button', text: 'שמירה' });
      btn.addEventListener('click', function () {
        var req = { id: u.id, name: name.value };
        if (phone.value.trim()) req.phone = phone.value;
        if (!self) req.role = role;
        busy(btn, true, 'שומר…');
        api('updateUser', req).then(function (r) {
          busy(btn, false);
          if (!r.ok) {
            if (r.error === 'auth') { lostLogin(); return; }
            msg.textContent = errText(r);
            msg.classList.remove('hidden');
            return;
          }
          takeSnapshot(r);
          closeSheet();
          toast('נשמר ✓');
        });
      });
      el.appendChild(h('div', { class: 'actions' }, btn));
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

  function settingsSheet() {
    return function (el) {
      sheetHead(el, 'הגדרות');
      el.appendChild(h('div', { class: 'info' }, [h('span', { class: 'k', text: 'מחובר בתור: ' }), S.me.name + (isMgr() ? ' (מנהל)' : '')]));
      var ib = installBox();
      if (ib) el.appendChild(ib);
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
          var warn = S.outbox.length ? '\nשימו לב: יש שינויים שעוד לא נשמרו בשרת, והם יימחקו.' : '';
          if (!window.confirm('לצאת מהאפליקציה במכשיר הזה?' + warn)) return;
          api('logout', {});
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
      function submit() {
        var c = code.value.replace(/\D/g, '');
        if (c.length !== 6) { fail('קוד ההזמנה הוא 6 ספרות.'); return; }
        busy(go, true, 'בודק…');
        api('checkInvite', { code: c }).then(function (r) {
          busy(go, false);
          if (!r.ok) { fail(errText(r)); return; }
          L.step = 'pin'; L.code = c; L.name = r.name; L.needPhone = !!r.needPhone;
          showLogin();
        });
      }
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
    S.data = { ver: '', users: [], tasks: [] };
    L = { step: 'code', code: '', name: '', needPhone: false, here: false };
    derive();
    render();
    sync(true);
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
    toastT = setTimeout(hideToast, actionLabel ? 6000 : 3000);
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

  // ================================================================ הפעלה
  function init() {
    if (S.outbox.length && sget('outboxOwner', null) !== (S.me && S.me.id)) { S.outbox = []; sset('outbox', []); }
    derive();
    $('fab').addEventListener('click', function () { openSheet(editSheet(null)); });
    $('btnSettings').addEventListener('click', function () { openSheet(settingsSheet()); });
    $('syncState').addEventListener('click', function () {
      if (S.outbox.length) { flush(); toast('מנסים לשמור שוב. השינויים שמורים בטלפון ולא יאבדו.'); }
      else sync(true);
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
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && stack.length) closeSheet(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      tick();
      render(); // "היום" ו"פתוחה כבר" מתעדכנים
      if (swReg && Date.now() - lastSwCheck > 30 * 60000) { lastSwCheck = Date.now(); swReg.update().catch(function () {}); }
    });
    window.addEventListener('online', tick);
    setInterval(function () { if (!document.hidden) tick(); }, 60000);
    render();
    initSW();
    if (S.token) tick();
    window.TT = { S: S, V: V, flush: flush, sync: sync, version: APP_VERSION };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
