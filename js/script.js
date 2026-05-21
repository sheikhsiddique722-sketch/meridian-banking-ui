/* ================================================
   UTILS  (global — needed by inline onclick too)
   ================================================ */
function showToast(msg, type) { toast(msg, type); }
function toast(msg, type = 'success') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast';
  const iconSVG = type === 'success'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></svg>';
  t.innerHTML = `<div class="t-icon ${type}">${iconSVG}</div><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 320);
  }, 3200);
}

/* ================================================
   MERIDIAN CLIENT DATABASE  (localStorage engine)
   ================================================ */
const MeridianDB = (function(){
  const KEY = 'meridian_db_v1';
  const DEFAULTS = {
    account:{ name:'Aiden Marlowe', email:'a.marlowe@meridian.com', phone:'+1 (212) 555-0193', address:'740 Park Ave, New York, NY 10021', dob:{d:'',m:'',y:''} },
    card:{ frozen:false, monthlyLimit:50000, dailyLimit:10000 },
    preferences:{ currency:'USD — US Dollar', language:'English (US)', dateFormat:'MM/DD/YYYY', landingPage:'Overview' },
    notifications:{ 'Transaction alerts':true,'Large transaction':true,'Statement ready':true,'Portfolio alerts':false,'Marketing & offers':false },
    goals:[ {name:"Kyoto · Autumn '26",saved:10800,target:15000},{name:'Steinway Grand',saved:36000,target:90000},{name:'Emergency reserve',saved:45500,target:50000} ],
    transfers:[],
    savedAt:null
  };
  function _load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } }
  function _save(d){ try{ localStorage.setItem(KEY,JSON.stringify(d)); }catch(e){} }
  function _init(){
    const ex=_load();
    const m=JSON.parse(JSON.stringify(DEFAULTS));
    if(ex.account)       Object.assign(m.account,ex.account);
    if(ex.card)          Object.assign(m.card,ex.card);
    if(ex.preferences)   Object.assign(m.preferences,ex.preferences);
    if(ex.notifications) Object.assign(m.notifications,ex.notifications);
    if(ex.goals&&ex.goals.length) m.goals=ex.goals;
    if(ex.transfers)     m.transfers=ex.transfers;
    _save(m); return m;
  }
  let _d=_init();
  return {
    get(path){ if(!path) return JSON.parse(JSON.stringify(_d)); return path.split('.').reduce((o,k)=>o&&o[k]!==undefined?o[k]:undefined,_d); },
    set(path,val){ const keys=path.split('.'); let o=_d; for(let i=0;i<keys.length-1;i++){if(o[keys[i]]===undefined)o[keys[i]]={};o=o[keys[i]];} o[keys[keys.length-1]]=val; _d.savedAt=new Date().toISOString(); _save(_d); return val; },
    push(path,item){ const a=this.get(path)||[]; a.push(item); this.set(path,a); return a; },
    count(){ const d=this.get(); return 3+(d.goals||[]).length+(d.transfers||[]).length; },
    reset(){ _d=JSON.parse(JSON.stringify(DEFAULTS)); _save(_d); }
  };
})();

window.addEventListener('load', function () {

/* ================================================
   DYNAMIC GREETING
   ================================================ */
(function () {
  const now  = new Date();
  const h    = now.getHours();
  const greet = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('greetHeading').innerHTML = greet + ', <em>Aiden</em>.';
  document.getElementById('mobileGreetHeading').innerHTML = greet + ', <em>Aiden</em>.';

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dayName = days[now.getDay()];
  const dateStr = dayName + ', ' + now.getDate() + ' ' + months[now.getMonth()];
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const marketNote = h < 9 || h >= 16 || isWeekend ? 'Markets closed.' : 'Markets open.';
  const subEl = document.getElementById('greetSub');
  if (subEl) subEl.textContent = dateStr + ' — ' + marketNote + ' 3 actions pending review.';
})();

/* ================================================
   DATABASE — HELPERS + STARTUP RESTORE
   ================================================ */
let _currentProfileSection = '';

function dbPing() {
  const dot  = document.getElementById('dbDot');
  const last = document.getElementById('dbLastSaved');
  const rec  = document.getElementById('dbRecords');
  if (dot) {
    dot.style.background  = 'var(--gold)';
    dot.style.boxShadow   = '0 0 8px rgba(201,168,106,.8)';
    setTimeout(() => { dot.style.background='var(--green)'; dot.style.boxShadow='0 0 5px var(--green)'; }, 700);
  }
  if (last) {
    const n = new Date();
    last.textContent = String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+':'+String(n.getSeconds()).padStart(2,'0');
  }
  if (rec) rec.textContent = MeridianDB.count() + ' records';
}

function loadDrawerFromDB(section) {
  if (section === 'Personal details') {
    const a = MeridianDB.get('account');
    const inputs = cardCtrlBody.querySelectorAll('.cg-input');
    if (inputs[0]) inputs[0].value = a.name    || '';
    if (inputs[1]) inputs[1].value = a.email   || '';
    if (inputs[2]) inputs[2].value = a.phone   || '';
    if (inputs[3]) inputs[3].value = a.address || '';
  } else if (section === 'Preferences') {
    const p   = MeridianDB.get('preferences');
    const dob = MeridianDB.get('account.dob') || {};
    const sels = cardCtrlBody.querySelectorAll('select');
    // order: currency, language, (date format is id=prefDateFmt), landing page
    if (sels[0]) sels[0].value = p.currency    || 'USD — US Dollar';
    if (sels[1]) sels[1].value = p.language    || 'English (US)';
    const fmtSel = document.getElementById('prefDateFmt');
    if (fmtSel) { fmtSel.value = p.dateFormat || 'MM/DD/YYYY'; fmtSel.dispatchEvent(new Event('change')); }
    if (sels[3]) sels[3].value = p.landingPage || 'Overview';
    const dd = document.getElementById('prefDobD');
    const dm = document.getElementById('prefDobM');
    const dy = document.getElementById('prefDobY');
    if (dd) dd.value = dob.d || '';
    if (dm) dm.value = dob.m || '';
    if (dy) dy.value = dob.y || '';
  } else if (section === 'Notifications') {
    const notifs  = MeridianDB.get('notifications') || {};
    const keys    = ['Transaction alerts','Large transaction','Statement ready','Portfolio alerts','Marketing & offers'];
    const toggles = cardCtrlBody.querySelectorAll('.notif-toggle');
    toggles.forEach((tog, i) => {
      if (i >= keys.length) return;
      const on = notifs[keys[i]] !== false;
      tog.checked = on;
      const lbl = tog.closest('label');
      if (lbl) {
        const spans = lbl.querySelectorAll('span');
        if (spans[0]) spans[0].style.background = on ? 'var(--gold)' : 'rgba(255,255,255,.1)';
        if (spans[1]) spans[1].style.left        = on ? '19px' : '3px';
      }
    });
  }
}

function saveDrawerToDB(section) {
  if (section === 'Personal details') {
    const inputs = cardCtrlBody.querySelectorAll('.cg-input');
    if (inputs[0]) MeridianDB.set('account.name',    inputs[0].value.trim());
    if (inputs[1]) MeridianDB.set('account.email',   inputs[1].value.trim());
    if (inputs[2]) MeridianDB.set('account.phone',   inputs[2].value.trim());
    if (inputs[3]) MeridianDB.set('account.address', inputs[3].value.trim());
    // update sidebar chip name
    const nameEl = document.querySelector('#userChip .name');
    if (nameEl && inputs[0]) nameEl.textContent = inputs[0].value.trim() || 'Aiden Marlowe';
  } else if (section === 'Preferences') {
    const sels = cardCtrlBody.querySelectorAll('select');
    if (sels[0]) MeridianDB.set('preferences.currency',    sels[0].value);
    if (sels[1]) MeridianDB.set('preferences.language',    sels[1].value);
    const fmtSel = document.getElementById('prefDateFmt');
    if (fmtSel) MeridianDB.set('preferences.dateFormat',  fmtSel.value);
    if (sels[3]) MeridianDB.set('preferences.landingPage', sels[3].value);
    const dd = document.getElementById('prefDobD');
    const dm = document.getElementById('prefDobM');
    const dy = document.getElementById('prefDobY');
    MeridianDB.set('account.dob', { d: dd?dd.value:'', m: dm?dm.value:'', y: dy?dy.value:'' });
  } else if (section === 'Notifications') {
    const keys    = ['Transaction alerts','Large transaction','Statement ready','Portfolio alerts','Marketing & offers'];
    const toggles = cardCtrlBody.querySelectorAll('.notif-toggle');
    const notifs  = {};
    toggles.forEach((tog, i) => { if (i < keys.length) notifs[keys[i]] = tog.checked; });
    MeridianDB.set('notifications', notifs);
  }
  dbPing();
}

// Restore card frozen state + goals from DB on startup (called after goalsData + cardFrozen are defined)
function restoreFromDB() {
  // card state
  const cardDB = MeridianDB.get('card');
  if (cardDB && cardDB.frozen) {
    cardFrozen = true;
    const lbl = document.getElementById('cardFreezeLbl');
    const cc2 = document.getElementById('cardCredit2');
    const fb  = document.getElementById('cardFreezeBtn');
    if (lbl) lbl.textContent = 'Unfreeze';
    if (cc2) cc2.style.filter = 'grayscale(0.8) brightness(0.7)';
    if (fb)  fb.style.color   = 'var(--red)';
  }
  if (cardDB && cardDB.monthlyLimit) {
    const ldisp = document.getElementById('cardLimitDisplay');
    const ubar  = document.getElementById('cardUsageBar');
    const atxt  = document.getElementById('cardAvailText');
    if (ldisp) {
      ldisp.textContent = cardDB.monthlyLimit.toLocaleString();
      const used = 12847;
      const pct  = Math.min((used / cardDB.monthlyLimit) * 100, 100).toFixed(1);
      if (ubar) ubar.style.width = pct + '%';
      if (atxt) atxt.textContent = '$' + (cardDB.monthlyLimit - used).toLocaleString() + ' available';
    }
  }
  // goals
  const dbGoals = MeridianDB.get('goals');
  if (dbGoals && dbGoals.length >= 3) {
    goalsData[0] = dbGoals[0];
    goalsData[1] = dbGoals[1];
    goalsData[2] = dbGoals[2];
    [0,1,2].forEach(i => updateGoalView(i));
  }
  // account name in sidebar chip
  const accName = MeridianDB.get('account.name');
  if (accName) {
    const nameEl = document.querySelector('#userChip .name');
    if (nameEl) nameEl.textContent = accName;
  }
  // init DB widget display
  dbPing();
}

/* ================================================
   BALANCE COUNT-UP ANIMATION
   ================================================ */
(function () {
  const el = document.getElementById('balanceAmt');
  const target = 284710.42;
  const duration = 1600;
  let startTime = null;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function tick(now) {
    if (!startTime) startTime = now;
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const value = target * easeOutCubic(progress);
    const whole = Math.floor(value).toLocaleString('en-US');
    const dec = '.' + String(Math.floor((value % 1) * 100)).padStart(2, '0');
    el.innerHTML = `<span class="cur">$</span>${whole}<span class="dec">${dec}</span>`;
    if (progress < 1) requestAnimationFrame(tick);
  }

  setTimeout(() => requestAnimationFrame(tick), 400);
})();

/* ================================================
   BALANCE EYE TOGGLE
   ================================================ */
const eye = document.getElementById('eyeBtn');
const balEl = document.getElementById('balanceAmt');
let balHidden = false;
const originalBal = '<span class="cur">$</span>284,710<span class="dec">.42</span>';

eye.addEventListener('click', () => {
  balHidden = !balHidden;
  balEl.innerHTML = balHidden
    ? '<span class="cur">$</span>••••••<span class="dec">.••</span>'
    : originalBal;
  eye.title = balHidden ? 'Show balance' : 'Hide balance';
});

/* ================================================
   CHART
   ================================================ */
const chartDatasets = {
  '7D': {
    days: ['May 13', 'May 14', 'May 15', 'May 16', 'May 17', 'May 18', 'May 19'],
    vals: [1100, 980, 1620, 2100, 1850, 2440, 2847],
    label: '$2,847', delta: '12.4% under budget', isDown: true
  },
  '30D': {
    days: ['Apr 20', 'Apr 25', 'Apr 30', 'May 5', 'May 10', 'May 15', 'May 19'],
    vals: [3400, 5200, 4100, 7800, 6200, 9400, 12847],
    label: '$12,847', delta: '8.2% under budget', isDown: true
  },
  '90D': {
    days: ['Feb', 'Mar 1', 'Mar 15', 'Apr', 'Apr 15', 'May 1', 'May 19'],
    vals: [18000, 24000, 21000, 31500, 28000, 35000, 38600],
    label: '$38,600', delta: '4.1% over budget', isDown: false
  },
  '1Y': {
    days: ['Jun', 'Aug', 'Sep', 'Nov', 'Jan', 'Mar', 'May'],
    vals: [48000, 62000, 55000, 71000, 58000, 84000, 124000],
    label: '$124,000', delta: '6.7% under budget', isDown: true
  }
};

const chartSVG = document.getElementById('chart');
const tt = document.getElementById('tt');
const W = 600, H = 200, PL = 8, PR = 8, PT = 20, PB = 30;
const svgNS = 'http://www.w3.org/2000/svg';

let currentPts = [];
let hoverDot;

function smoothPath(pts) {
  if (pts.length < 2) return '';
  const tension = 0.2;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * tension;
    const c1y = p1[1] + (p2[1] - p0[1]) * tension;
    const c2x = p2[0] - (p3[0] - p1[0]) * tension;
    const c2y = p2[1] - (p3[1] - p1[1]) * tension;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function renderChart(dataset, animate = true) {
  const { days, vals } = dataset;

  // remove old dynamic elements
  chartSVG.querySelectorAll('.chart-dyn').forEach(el => el.remove());

  const maxV = Math.max(...vals) * 1.15;
  const px = i => PL + (i / (vals.length - 1)) * (W - PL - PR);
  const py = v => PT + (1 - v / maxV) * (H - PT - PB);

  currentPts = vals.map((v, i) => [px(i), py(v)]);
  const linePath = smoothPath(currentPts);
  const areaPath = linePath + ` L ${px(vals.length - 1)} ${H - PB} L ${px(0)} ${H - PB} Z`;

  // area
  const area = document.createElementNS(svgNS, 'path');
  area.setAttribute('d', areaPath);
  area.setAttribute('class', 'chart-area chart-dyn');
  chartSVG.appendChild(area);

  // line
  const lineEl = document.createElementNS(svgNS, 'path');
  lineEl.setAttribute('d', linePath);
  lineEl.setAttribute('class', 'chart-line chart-dyn');
  const lineLen = 1400;
  if (animate) {
    lineEl.setAttribute('stroke-dasharray', lineLen);
    lineEl.setAttribute('stroke-dashoffset', lineLen);
  }
  chartSVG.appendChild(lineEl);
  if (animate) {
    requestAnimationFrame(() => {
      lineEl.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)';
      lineEl.setAttribute('stroke-dashoffset', 0);
    });
  }

  // axis labels
  const axisG = document.createElementNS(svgNS, 'g');
  axisG.setAttribute('class', 'chart-axis chart-dyn');
  days.forEach((d, i) => {
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', px(i));
    t.setAttribute('y', H - 8);
    t.setAttribute('text-anchor', i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle');
    t.textContent = d;
    axisG.appendChild(t);
  });
  chartSVG.appendChild(axisG);

  // hover dot
  if (hoverDot) hoverDot.remove();
  hoverDot = document.createElementNS(svgNS, 'circle');
  hoverDot.setAttribute('r', '5');
  hoverDot.setAttribute('class', 'chart-dot chart-dyn');
  hoverDot.setAttribute('opacity', '0');
  chartSVG.appendChild(hoverDot);
}

// chart mouse events
const chartWrap = document.getElementById('chartWrap');
chartWrap.addEventListener('mousemove', e => {
  const dataset = chartDatasets[currentPeriod];
  const rect = chartSVG.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * W;
  let idx = 0, dmin = Infinity;
  currentPts.forEach((p, i) => { const d = Math.abs(p[0] - x); if (d < dmin) { dmin = d; idx = i; } });
  const [cx, cy] = currentPts[idx];
  hoverDot.setAttribute('cx', cx);
  hoverDot.setAttribute('cy', cy);
  hoverDot.setAttribute('opacity', '1');
  const sx = (cx / W) * rect.width;
  const sy = (cy / H) * rect.height;
  tt.style.left = sx + 'px';
  tt.style.top = sy + 'px';
  tt.innerHTML = `<div class="t">${dataset.days[idx]}</div><div class="a">$${dataset.vals[idx].toLocaleString('en-US')}</div>`;
  tt.style.opacity = '1';
});
chartWrap.addEventListener('mouseleave', () => {
  if (hoverDot) hoverDot.setAttribute('opacity', '0');
  tt.style.opacity = '0';
});

// tab switching
let currentPeriod = '30D';
document.getElementById('anaTabs').addEventListener('click', e => {
  const btn = e.target.closest('button[data-period]');
  if (!btn) return;
  currentPeriod = btn.dataset.period;
  document.querySelectorAll('#anaTabs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const ds = chartDatasets[currentPeriod];
  renderChart(ds, true);

  const statVal = document.getElementById('chartStatVal');
  const statDelta = document.getElementById('chartStatDelta');
  statVal.innerHTML = ds.label + `<span style="font-size:.5em;color:var(--ink-dim)"></span>`;
  statDelta.className = 'd ' + (ds.isDown ? 'down' : '');
  statDelta.innerHTML = `
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${ds.isDown ? '<path d="M7 14l5 5 5-5M12 19V5"/>' : '<path d="M17 10l-5-5-5 5M12 5v14"/>'}
    </svg>
    ${ds.delta}`;
});

// initial render
renderChart(chartDatasets['30D'], true);

/* ================================================
   CATEGORY BARS — ENTRANCE ANIMATION
   ================================================ */
(function () {
  const bars = document.querySelectorAll('.cat-bar span[data-w]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const span = entry.target;
        setTimeout(() => {
          span.style.width = span.dataset.w + '%';
        }, 100);
        observer.unobserve(span);
      }
    });
  }, { threshold: 0.2 });
  bars.forEach(b => observer.observe(b));
})();

/* ================================================
   GOAL RINGS — ANIMATE ON LOAD
   ================================================ */
setTimeout(() => {
  document.querySelectorAll('.goal-ring .fg[data-target]').forEach(ring => {
    ring.style.strokeDashoffset = ring.dataset.target;
  });
}, 500);

/* ================================================
   CARD FLIP
   ================================================ */
const cardWrap = document.getElementById('cardFlipWrap');
cardWrap.addEventListener('click', () => {
  cardWrap.classList.toggle('flipped');
});

/* ================================================
   NOTIFICATION DROPDOWN
   ================================================ */
const notifBtn = document.getElementById('notifBtn');
const notifDrop = document.getElementById('notifDropdown');
const notifDot = document.getElementById('notifDot');

function positionNotifDropdown() {
  if (window.innerWidth >= 980) {
    const rect = notifBtn.getBoundingClientRect();
    notifDrop.style.top  = (rect.bottom + 10) + 'px';
    notifDrop.style.right = (window.innerWidth - rect.right) + 'px';
    notifDrop.style.left = 'auto';
    notifDrop.style.width = '300px';
  } else {
    notifDrop.style.top = '';
    notifDrop.style.right = '';
    notifDrop.style.left = '';
    notifDrop.style.width = '';
  }
}

notifBtn.addEventListener('click', e => {
  e.stopPropagation();
  const isOpen = notifDrop.classList.toggle('open');
  if (isOpen) positionNotifDropdown();
});

document.getElementById('markAllRead').addEventListener('click', () => {
  document.querySelectorAll('.notif-item').forEach(item => {
    item.classList.add('read');
    item.dataset.read = 'true';
  });
  notifDot.style.opacity = '0';
  toast('All notifications marked as read');
});

document.querySelectorAll('.notif-item').forEach(item => {
  item.addEventListener('click', () => {
    item.classList.add('read');
    item.dataset.read = 'true';
    const unread = document.querySelectorAll('.notif-item[data-read="false"]').length;
    if (unread === 0) notifDot.style.opacity = '0';
    notifDrop.classList.remove('open');
    const page = item.dataset.nav;
    if (page) navigateTo(page);
    const title = item.querySelector('.ni-title');
    if (title) toast(title.textContent, 'info');
  });
});

document.addEventListener('click', e => {
  if (!notifDrop.contains(e.target) && e.target !== notifBtn) {
    notifDrop.classList.remove('open');
  }
});

/* ================================================
   SEARCH MODAL
   ================================================ */
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');

function openSearch() {
  searchModal.classList.add('open');
  setTimeout(() => searchInput.focus(), 50);
}
function closeSearch() {
  searchModal.classList.remove('open');
  searchInput.value = '';
  searchModal.querySelectorAll('.search-item,.search-group-lbl').forEach(el => el.style.display = '');
}

document.getElementById('searchBtn').addEventListener('click', openSearch);
document.getElementById('searchEsc').addEventListener('click', closeSearch);
searchModal.addEventListener('click', e => { if (e.target === searchModal) closeSearch(); });

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
  if (e.key === 'Escape') closeSearch();
});

// live search filtering
searchInput.addEventListener('input', function() {
  const q = this.value.trim().toLowerCase();
  const results = searchModal.querySelector('.search-results');
  const children = Array.from(results.children);
  if (!q) {
    children.forEach(el => el.style.display = '');
    return;
  }
  children.forEach(el => {
    if (el.classList.contains('search-item')) {
      const name = (el.querySelector('.si-name') || {}).textContent || '';
      const sub  = (el.querySelector('.si-sub')  || {}).textContent || '';
      el.style.display = (name.toLowerCase().includes(q) || sub.toLowerCase().includes(q)) ? '' : 'none';
    }
  });
  // hide group labels whose items are all hidden
  let i = 0;
  while (i < children.length) {
    if (children[i].classList.contains('search-group-lbl')) {
      let hasVisible = false, j = i + 1;
      while (j < children.length && !children[j].classList.contains('search-group-lbl')) {
        if (children[j].style.display !== 'none') hasVisible = true;
        j++;
      }
      children[i].style.display = hasVisible ? '' : 'none';
      i = j;
    } else { i++; }
  }
});

// search items that navigate
searchModal.querySelector('.search-results').addEventListener('click', function(e) {
  const item = e.target.closest('.search-item[data-nav]');
  if (!item) return;
  navigateTo(item.dataset.nav);
  closeSearch();
});

/* ================================================
   NAVIGATION (sidebar + mobile nav links)
   ================================================ */
const pageNames = {
  overview:    'Overview',
  cards:       'Cards',
  transfers:   'Transfers',
  analytics:   'Analytics',
  activity:    'Activity',
  investments: 'Investments',
  savings:     'Savings',
  concierge:   'Concierge'
};

window.navigateTo = function navigateTo(page) {
  // update all nav active states
  document.querySelectorAll('.nav a[data-page], .mobile-nav a[data-page]').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });

  // hide all pages
  document.querySelectorAll('.page').forEach(p => { p.style.display = 'none'; });

  // show target page
  const target = document.getElementById('page-' + page);
  if (target) {
    target.style.display = 'block';
    // restart animation
    target.style.animation = 'none';
    void target.offsetHeight;
    target.style.animation = '';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.nav a[data-page], .mobile-nav a[data-page]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(link.dataset.page);
  });
});

/* ================================================
   QUICK ACTION BUTTONS
   ================================================ */
document.getElementById('qa-send').addEventListener('click', () => {
  navigateTo('transfers');
  setTimeout(() => openNewTransfer(''), 80);
});

document.getElementById('qa-receive').addEventListener('click', () => {
  // show receive details in the card ctrl overlay (reuse the same drawer pattern)
  openCardCtrl('Receive Funds', 'Share your account details', `
    <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-md);padding:18px;margin-bottom:16px">
      <div style="font-family:var(--mono);font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:14px">Meridian Private Banking</div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:var(--ink-dim);margin-bottom:3px">Account holder</div>
        <div style="font-size:14px;color:var(--ink)">Aiden Marlowe</div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:var(--ink-dim);margin-bottom:3px">Account number</div>
        <div style="font-family:var(--mono);font-size:14px;color:var(--ink);letter-spacing:.08em">4821 0093 7712</div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;color:var(--ink-dim);margin-bottom:3px">Routing number (ABA)</div>
        <div style="font-family:var(--mono);font-size:14px;color:var(--ink);letter-spacing:.08em">026 009 593</div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--ink-dim);margin-bottom:3px">SWIFT / BIC</div>
        <div style="font-family:var(--mono);font-size:14px;color:var(--ink);letter-spacing:.08em">MRDNUSNYXXX</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <button class="btn-primary" id="copyAccBtn" type="button" style="font-size:12px;padding:11px">Copy account no.</button>
      <button id="shareDetailsBtn" type="button" style="padding:11px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:12px;cursor:pointer;font-family:var(--body)">Share details</button>
    </div>`);
});

document.getElementById('qa-pay').addEventListener('click', () => {
  navigateTo('transfers');
  setTimeout(() => openNewTransfer(''), 80);
});

document.getElementById('qa-invest').addEventListener('click', () => {
  navigateTo('investments');
});

/* ================================================
   QUICK TRANSFER — FULL FLOW
   ================================================ */
function showTransferState(id) {
  document.querySelectorAll('.transfer-state').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// Recipients
document.querySelectorAll('#recipientsList .recip').forEach(r => {
  r.addEventListener('click', () => {
    document.querySelectorAll('#recipientsList .recip').forEach(x => x.classList.remove('active'));
    r.classList.add('active');
    document.getElementById('selectedRecipName').textContent = r.dataset.name;
  });
});

// Quick amount buttons
const amtInput = document.getElementById('amtInput');
document.querySelectorAll('.quick-amts button').forEach(btn => {
  btn.addEventListener('click', () => {
    amtInput.value = btn.dataset.v;
    document.querySelectorAll('.quick-amts button').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    amtInput.focus();
  });
});

// Amount input — only allow numbers
amtInput.addEventListener('input', () => {
  amtInput.value = amtInput.value.replace(/[^0-9.]/g, '');
});

// Send button → go to confirm state
document.getElementById('sendBtn').addEventListener('click', () => {
  const raw = parseFloat(amtInput.value);
  if (!raw || raw <= 0) {
    amtInput.style.borderColor = 'var(--red)';
    setTimeout(() => amtInput.style.borderColor = '', 1200);
    toast('Please enter a valid amount', 'info');
    return;
  }
  const recip = document.querySelector('#recipientsList .recip.active');
  const name  = recip ? recip.dataset.name : 'recipient';
  const formatted = '$' + raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('confirmAmt').textContent = formatted;
  document.getElementById('confirmName').textContent = name;
  showTransferState('ts-confirm');
});

// Cancel from confirm
document.getElementById('cancelSendBtn').addEventListener('click', () => {
  showTransferState('ts-form');
});

// Confirm & send → loading → success
document.getElementById('confirmSendBtn').addEventListener('click', function() {
  const btn = this;
  btn.disabled = true;
  btn.textContent = 'Sending…';
  setTimeout(() => {
    const amt = document.getElementById('confirmAmt').textContent;
    const name = document.getElementById('confirmName').textContent;
    const ref = 'TXN-2026-' + Math.floor(80000 + Math.random() * 19999);
    document.getElementById('successMsg').textContent = amt + ' sent to ' + name;
    document.getElementById('successRef').textContent = 'REF: ' + ref;
    btn.disabled = false;
    btn.textContent = 'Confirm & send';
    MeridianDB.push('transfers', { to:name, amount:amt, ref, date:new Date().toISOString() });
    dbPing();
    showTransferState('ts-success');
  }, 1400);
});

// Done → back to form, reset
document.getElementById('doneSendBtn').addEventListener('click', () => {
  amtInput.value = '250';
  document.querySelectorAll('.quick-amts button').forEach(b => {
    b.classList.toggle('sel', b.dataset.v === '250');
  });
  showTransferState('ts-form');
  toast('Transfer complete — check activity for details', 'success');
});

// Add recipient button (+)
document.getElementById('addRecipBtn').addEventListener('click', () => {
  document.getElementById('newRecipName').value = '';
  document.getElementById('newRecipAccount').value = '';
  showTransferState('ts-addrecip');
});

document.getElementById('cancelAddRecipBtn').addEventListener('click', () => {
  showTransferState('ts-form');
});

document.getElementById('saveRecipBtn').addEventListener('click', () => {
  const name    = document.getElementById('newRecipName').value.trim();
  const account = document.getElementById('newRecipAccount').value.trim();
  if (!name || !account) {
    toast('Please fill in both fields', 'info');
    return;
  }
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const list = document.getElementById('recipientsList');
  const div = document.createElement('div');
  div.className = 'recip';
  div.dataset.name = name;
  div.dataset.initials = initials;
  div.innerHTML = `<div class="av">${initials}</div><div class="n">${name.split(' ')[0]}</div>`;
  div.addEventListener('click', () => {
    document.querySelectorAll('#recipientsList .recip').forEach(x => x.classList.remove('active'));
    div.classList.add('active');
    document.getElementById('selectedRecipName').textContent = name;
  });
  list.appendChild(div);
  showTransferState('ts-form');
  toast(name + ' added as recipient', 'success');
});

/* ================================================
   MOBILE SEND BUTTON
   ================================================ */
document.getElementById('mobileSendBtn').addEventListener('click', e => {
  e.preventDefault();
  toast('Use Quick Transfer in the panel on desktop', 'info');
});

/* ================================================
   TRANSACTION DRAWER
   ================================================ */
const txData = {
  'Le Bernardin': {
    name: 'Le Bernardin',
    sub: 'Dining · New York',
    amount: '−$487.30',
    positive: false,
    status: 'Settled',
    date: 'Monday, 19 May 2026',
    time: '8:42 PM',
    cat: 'Dining & Restaurants',
    ref: 'TXN-2026-88412',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2l1 4h10l1-4M5 6h14l-1 14H6L5 6z"/><path d="M9 10v6M15 10v6"/></svg>'
  },
  'Apple iCloud+': {
    name: 'Apple — iCloud+',
    sub: 'Subscription · Monthly',
    amount: '−$9.99',
    positive: false,
    status: 'Settled',
    date: 'Monday, 19 May 2026',
    time: '2:15 PM',
    cat: 'Subscriptions & Services',
    ref: 'TXN-2026-88298',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 17l4-12 4 12M16 12h6M19 9v6"/></svg>'
  },
  'Wire Veridian': {
    name: 'Wire — Veridian Capital',
    sub: 'Deposit · Ref. VC-882019',
    amount: '+$24,000.00',
    positive: true,
    status: 'Settled',
    date: 'Monday, 19 May 2026',
    time: '9:01 AM',
    cat: 'Wire Transfer · Inbound',
    ref: 'VC-882019',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12h18M12 3v18"/></svg>'
  },
  'Aman New York': {
    name: 'Aman New York',
    sub: 'Hospitality · Lodging',
    amount: '−$2,840.00',
    positive: false,
    status: 'Settled',
    date: 'Sunday, 18 May 2026',
    time: '11:20 PM',
    cat: 'Travel & Hotels',
    ref: 'TXN-2026-87941',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9l9-6 9 6v11H3z"/><path d="M9 20v-6h6v6"/></svg>'
  },
  'Eliana Voss': {
    name: 'Eliana Voss',
    sub: 'Transfer · Split Bill',
    amount: '+$143.50',
    positive: true,
    status: 'Settled',
    date: 'Sunday, 18 May 2026',
    time: '7:58 PM',
    cat: 'P2P Transfer · Received',
    ref: 'TXN-2026-87832',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>'
  },
  'Hermes': {
    name: 'Hermès Madison Ave',
    sub: 'Retail · Apparel',
    amount: '−$1,920.00',
    positive: false,
    status: 'Settled',
    date: 'Sunday, 18 May 2026',
    time: '3:14 PM',
    cat: 'Shopping & Retail',
    ref: 'TXN-2026-87761',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-7"/></svg>'
  },
  'Julien Renard': {
    name: 'Julien Renard',
    sub: 'Transfer · Sent',
    amount: '−$320.00',
    positive: false,
    status: 'Settled',
    date: 'Saturday, 17 May 2026',
    time: '9:10 PM',
    cat: 'Transfers',
    ref: 'TXN-2026-JR-4412',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12h16M14 6l6 6-6 6"/></svg>'
  },
  'Nobu New York': {
    name: 'Nobu New York',
    sub: 'Dining · New York',
    amount: '−$380.00',
    positive: false,
    status: 'Settled',
    date: 'Saturday, 17 May 2026',
    time: '9:45 PM',
    cat: 'Dining & Restaurants',
    ref: 'TXN-2026-NN-7701',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2l1 4h10l1-4M5 6h14l-1 14H6L5 6z"/></svg>'
  },
  'Equinox': {
    name: 'Equinox — Monthly',
    sub: 'Subscription · Fitness',
    amount: '−$280.00',
    positive: false,
    status: 'Settled',
    date: 'Saturday, 17 May 2026',
    time: '6:00 AM',
    cat: 'Subscriptions',
    ref: 'TXN-2026-EQ-3312',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9l9-6 9 6v11H3z"/></svg>'
  },
  'Marcus Holt': {
    name: 'Marcus Holt',
    sub: 'Transfer · Sent',
    amount: '−$5,000.00',
    positive: false,
    status: 'Settled',
    date: 'Thursday, 15 May 2026',
    time: '2:00 PM',
    cat: 'Transfers',
    ref: 'TXN-2026-MH-6655',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>'
  },
  'Dividend Vanguard': {
    name: 'Dividend — Vanguard',
    sub: 'Investment · Quarterly',
    amount: '+$1,840.00',
    positive: true,
    status: 'Settled',
    date: 'Thursday, 15 May 2026',
    time: '10:00 AM',
    cat: 'Investments',
    ref: 'TXN-2026-VG-DIV-Q2',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12h18M12 3v18"/></svg>'
  },
  'Sloane Kim': {
    name: 'Sloane Kim',
    sub: 'Transfer · Scheduled',
    amount: '−$1,200.00',
    positive: false,
    status: 'Pending',
    date: 'Tuesday, 20 May 2026',
    time: 'Scheduled',
    cat: 'Transfers',
    ref: 'TXN-2026-SK-9901',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>'
  }
};

const txOverlay = document.getElementById('txOverlay');
let currentTxKey = '';

function hidePanels() {
  document.getElementById('txNotePanel').style.display = 'none';
  document.getElementById('txDisputePanel').style.display = 'none';
}

function openTxDrawer(key) {
  const d = txData[key];
  if (!d) return;
  currentTxKey = key;
  hidePanels();
  document.getElementById('txDrawerIcon').innerHTML = d.icon;
  document.getElementById('txDrawerName').textContent = d.name;
  document.getElementById('txDrawerSub').textContent = d.sub;
  const amtEl = document.getElementById('txDrawerAmount');
  amtEl.textContent = d.amount;
  amtEl.className = 'tx-drawer-amount ' + (d.positive ? 'positive' : 'negative');
  const statusEl = document.getElementById('txDrawerStatus');
  statusEl.className = 'tx-drawer-status ' + (d.status === 'Pending' ? 'pending' : 'settled');
  document.getElementById('txDrawerStatusText').textContent = d.status;
  document.getElementById('txDrawerDate').textContent = d.date;
  document.getElementById('txDrawerTime').textContent = d.time;
  document.getElementById('txDrawerCat').textContent = d.cat;
  document.getElementById('txDrawerRef').textContent = d.ref;
  txOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeTxDrawer() {
  txOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('txClose').addEventListener('click', closeTxDrawer);
document.getElementById('txHandle').addEventListener('click', closeTxDrawer);
txOverlay.addEventListener('click', e => { if (e.target === txOverlay) closeTxDrawer(); });

/* --- Download Receipt --- */
document.getElementById('btnDownload').addEventListener('click', () => {
  const d = txData[currentTxKey];
  if (!d) return;
  const lines = [
    '╔══════════════════════════════════════╗',
    '║       MERIDIAN PRIVATE BANKING       ║',
    '║          Transaction Receipt         ║',
    '╚══════════════════════════════════════╝',
    '',
    'Merchant   : ' + d.name,
    'Amount     : ' + d.amount,
    'Date       : ' + d.date,
    'Time       : ' + d.time,
    'Category   : ' + d.cat,
    'Reference  : ' + d.ref,
    'Card       : Sovereign Metal ···· 8821',
    'Status     : ' + d.status,
    '',
    '──────────────────────────────────────',
    'Meridian Bank · meridianbank.com',
    'Customer Service: +1 888 MERIDIAN',
    '──────────────────────────────────────',
  ].join('\n');
  const blob = new Blob([lines], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'receipt-' + (d.ref || 'meridian') + '.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('Receipt downloaded successfully', 'success');
});

/* --- Add Note --- */
document.getElementById('btnNote').addEventListener('click', () => {
  hidePanels();
  const panel = document.getElementById('txNotePanel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('txNoteInput').focus();
});
document.getElementById('btnNoteSave').addEventListener('click', () => {
  const note = document.getElementById('txNoteInput').value.trim();
  if (!note) { toast('Please write a note first', 'info'); return; }
  hidePanels();
  document.getElementById('txNoteInput').value = '';
  toast('Note saved to transaction', 'success');
});
document.getElementById('btnNoteCancel').addEventListener('click', () => {
  hidePanels();
  document.getElementById('txNoteInput').value = '';
});

/* --- Share --- */
document.getElementById('btnShare').addEventListener('click', () => {
  const d = txData[currentTxKey];
  if (!d) return;
  const text = d.name + ' · ' + d.amount + ' · ' + d.date + ' · Ref: ' + d.ref;
  if (navigator.share) {
    navigator.share({ title: 'Transaction — Meridian', text });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      toast('Transaction details copied to clipboard', 'success');
    });
  } else {
    toast('Transaction details: ' + text, 'info');
  }
});

/* --- Dispute --- */
document.getElementById('btnDispute').addEventListener('click', () => {
  hidePanels();
  const panel = document.getElementById('txDisputePanel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
document.getElementById('btnDisputeSubmit').addEventListener('click', () => {
  const selected = document.querySelector('input[name="disputeReason"]:checked');
  if (!selected) { toast('Please select a reason first', 'info'); return; }
  hidePanels();
  document.querySelectorAll('input[name="disputeReason"]').forEach(r => r.checked = false);
  closeTxDrawer();
  toast('Dispute filed — our team will contact you within 24 hrs', 'success');
});
document.getElementById('btnDisputeCancel').addEventListener('click', hidePanels);

document.querySelectorAll('.tx[data-tx]').forEach(tx => {
  tx.addEventListener('click', () => openTxDrawer(tx.dataset.tx));
});

/* ================================================
   ACTIVITY PAGE — FILTER PILLS
   ================================================ */
document.querySelectorAll('.act-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.act-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    const list   = document.getElementById('activityList');
    if (!list) return;

    // show/hide transaction rows
    list.querySelectorAll('.tx[data-cat]').forEach(tx => {
      const match = filter === 'all' || tx.dataset.cat === filter;
      tx.classList.toggle('hidden', !match);
    });

    // hide date group labels if all their rows are hidden
    list.querySelectorAll('.tx-group-label').forEach(label => {
      let next = label.nextElementSibling;
      let hasVisible = false;
      while (next && !next.classList.contains('tx-group-label')) {
        if (next.classList.contains('tx') && !next.classList.contains('hidden')) hasVisible = true;
        next = next.nextElementSibling;
      }
      label.classList.toggle('hidden', !hasVisible);
    });

    // show empty state if nothing visible
    let emptyEl = list.querySelector('.act-empty');
    const anyVisible = list.querySelectorAll('.tx:not(.hidden)').length > 0;
    if (!anyVisible) {
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.className = 'act-empty';
        emptyEl.textContent = 'No transactions in this category.';
        list.appendChild(emptyEl);
      }
      emptyEl.style.display = 'block';
    } else if (emptyEl) {
      emptyEl.style.display = 'none';
    }
  });
});

/* ================================================
   SECTION LINKS
   ================================================ */
document.getElementById('viewReportLink').addEventListener('click', e => {
  e.preventDefault();
  navigateTo('analytics');
});
document.getElementById('seeAllLink').addEventListener('click', e => {
  e.preventDefault();
  navigateTo('activity');
});
/* ================================================
   SIGN IN / SIGN OUT
   ================================================ */
const signInModal = document.getElementById('signInModal');

function showSignIn() {
  // reset all form state before showing
  const siSubmit   = document.getElementById('siSubmit');
  const siBio      = document.getElementById('siBiometric');
  const siErr      = document.getElementById('siError');
  const siPass     = document.getElementById('siPassword');
  siSubmit.textContent = 'Sign in';
  siSubmit.disabled    = false;
  siBio.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2C9.243 2 7 4.243 7 7v3H5v12h14V10h-2V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v3H9V7c0-1.654 1.346-3 3-3z"/></svg> Face ID / Touch ID';
  siBio.disabled       = false;
  siErr.style.display  = 'none';
  siPass.value         = '';
  siPass.type          = 'password';
  document.getElementById('siEyeIcon').innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>';
  signInModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('siEmail').focus(), 100);
}
function hideSignIn() {
  signInModal.style.display = 'none';
  document.body.style.overflow = '';
  showWelcome();
}

function showWelcome() {
  const ws = document.getElementById('welcomeScreen');
  // set live greeting + date
  const now  = new Date();
  const h    = now.getHours();
  const greet = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('wsGreeting').innerHTML = greet + ', <em>Aiden</em>.';
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('wsDate').textContent = days[now.getDay()] + ', ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
  // re-trigger animations by cloning rows
  ws.querySelectorAll('.ws-row').forEach(el => {
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  });
  ws.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function triggerSignOut() {
  closeCardCtrl();
  setTimeout(showSignIn, 280);
}

// password toggle
document.getElementById('siTogglePw').addEventListener('click', () => {
  const inp = document.getElementById('siPassword');
  const icon = document.getElementById('siEyeIcon');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.innerHTML = '<path d="M17.94 17.94A10 10 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9 9 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>';
  } else {
    inp.type = 'password';
    icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>';
  }
});

document.getElementById('forgotPwLink').addEventListener('click', e => {
  e.preventDefault();
  toast('Password reset link sent to a.marlowe@meridian.com', 'info');
});

document.getElementById('siBiometric').addEventListener('click', () => {
  const btn = document.getElementById('siBiometric');
  btn.textContent = 'Authenticating…';
  btn.disabled = true;
  setTimeout(() => {
    hideSignIn();
    toast('Signed in with Face ID — welcome back, Aiden.', 'success');
  }, 1200);
});

document.getElementById('siSubmit').addEventListener('click', () => {
  const email = document.getElementById('siEmail').value.trim();
  const pw    = document.getElementById('siPassword').value;
  const errEl = document.getElementById('siError');
  errEl.style.display = 'none';
  if (!email || !pw) { errEl.style.display = 'block'; errEl.textContent = 'Please enter your email and password.'; return; }
  const btn = document.getElementById('siSubmit');
  btn.textContent = 'Signing in…';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Sign in';
    btn.disabled = false;
    if (pw.length >= 4) {
      hideSignIn();
      toast('Signed in successfully — welcome back, Aiden.', 'success');
    } else {
      errEl.style.display = 'block';
    }
  }, 900);
});

// welcome screen — enter dashboard
document.getElementById('wsEnterBtn').addEventListener('click', function() {
  const ws = document.getElementById('welcomeScreen');
  ws.style.transition = 'opacity .5s ease';
  ws.style.opacity = '0';
  setTimeout(function() {
    ws.style.display = 'none';
    ws.style.opacity = '';
    ws.style.transition = '';
    document.body.style.overflow = '';
  }, 500);
});

// navbar sign-in button
document.getElementById('navSignInBtn').addEventListener('click', showSignIn);

// sidebar sign-out icon
document.getElementById('sidebarSignOutBtn').addEventListener('click', e => {
  e.stopPropagation(); // don't open profile
  triggerSignOut();
});

// mobile profile button
document.getElementById('mobileProfileBtn').addEventListener('click', e => {
  e.preventDefault();
  openProfileDrawer();
});

/* ================================================
   USER PROFILE CHIP
   ================================================ */
function openProfileDrawer() {
  openCardCtrl('My Profile', 'Sovereign Tier · Member since Jan 2019', `
    <!-- avatar hero -->
    <div style="text-align:center;padding:8px 0 24px;border-bottom:1px solid var(--line);margin-bottom:20px">
      <div style="position:relative;display:inline-block;margin-bottom:14px">
        <div style="width:76px;height:76px;border-radius:50%;background:linear-gradient(145deg,#3a3324,#1a1812);display:grid;place-items:center;font-family:var(--display);font-size:32px;font-weight:300;color:var(--gold-soft);border:2px solid rgba(201,168,106,.45);box-shadow:0 0 0 5px rgba(201,168,106,.1),0 12px 28px -8px rgba(0,0,0,.6)">A</div>
        <div style="position:absolute;bottom:2px;right:2px;width:18px;height:18px;border-radius:50%;background:#4ade80;border:2.5px solid #0d1118"></div>
      </div>
      <div style="font-family:var(--display);font-size:21px;font-weight:300;letter-spacing:-.02em;color:var(--ink)">Aiden Marlowe</div>
      <div style="margin:6px auto 0;display:inline-flex;align-items:center;gap:6px">
        <span style="font-family:var(--mono);font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);background:rgba(201,168,106,.12);border:1px solid rgba(201,168,106,.25);padding:3px 10px;border-radius:99px">⭐ Sovereign Tier</span>
      </div>
      <div style="font-size:12px;color:var(--ink-dim);margin-top:8px">a.marlowe@meridian.com</div>
      <div style="font-size:11px;color:var(--ink-faint);margin-top:2px">Member since January 2019 · ID #AM-00194</div>
    </div>

    <!-- stats -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border-radius:var(--r-md);overflow:hidden;margin-bottom:20px">
      ${[['$284K','Balance'],['＋12.4%','YTD return'],['6 yrs','Member']].map(([v,l],i)=>`
        <div style="background:rgba(255,255,255,.02);padding:15px 8px;text-align:center">
          <div style="font-family:var(--mono);font-size:16px;color:${i===1?'var(--green)':'var(--ink)'}">${v}</div>
          <div style="font-size:10px;color:var(--ink-faint);margin-top:4px;letter-spacing:.04em">${l}</div>
        </div>`).join('')}
    </div>

    <!-- settings -->
    <div style="font-family:var(--mono);font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint);margin:0 2px 10px">Settings</div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:20px">
      ${[
        {svg:'<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',   l:'Personal details',   s:'Name, address, contact info'},
        {svg:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',  l:'Security & password',s:'2FA, biometrics, login history'},
        {svg:'<path d="M6 8a6 6 0 1112 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 004 0"/>',l:'Notifications',       s:'Alerts, statements, marketing'},
        {svg:'<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/>',l:'Preferences',s:'Currency, language, theme'},
        {svg:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',l:'Statements & docs',s:'Download account statements'},
      ].map(o=>`
        <div class="cg-advisor-opt" data-profile-opt="${o.l}" style="padding:13px 14px;gap:12px;border-radius:var(--r-sm)">
          <div style="width:34px;height:34px;border-radius:10px;background:rgba(201,168,106,.1);border:1px solid rgba(201,168,106,.15);display:grid;place-items:center;flex-shrink:0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.6">${o.svg}</svg>
          </div>
          <div class="cg-advisor-opt-body" style="flex:1"><div class="n" style="font-size:13px">${o.l}</div><div class="a">${o.s}</div></div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="color:var(--ink-faint);flex-shrink:0"><path d="M9 18l6-6-6-6"/></svg>
        </div>`).join('')}
    </div>

    <!-- sign out -->
    <button id="profileSignOut" type="button" style="width:100%;padding:13px;border-radius:var(--r-sm);background:rgba(220,60,60,.06);border:1px solid rgba(220,60,60,.25);color:rgba(230,100,100,.95);font-size:13px;cursor:pointer;font-family:var(--body);display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s"
      onmouseover="this.style.background='rgba(220,60,60,.12)'" onmouseout="this.style.background='rgba(220,60,60,.06)'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      Sign out
    </button>
  `);
}

document.getElementById('userChip').addEventListener('click', e => {
  if (e.target.closest('#sidebarSignOutBtn')) return;
  openProfileDrawer();
});

/* ================================================
   SAVINGS GOALS EDIT
   ================================================ */
const goalsData = [
  { name: "Kyoto · Autumn '26", saved: 10800, target: 15000 },
  { name: 'Steinway Grand',      saved: 36000, target: 90000 },
  { name: 'Emergency reserve',   saved: 45500, target: 50000 },
];

const CIRC = 106.8; // 2 * π * 17

function pctToOffset(pct) {
  return +(CIRC - (pct / 100) * CIRC).toFixed(1);
}

function updateGoalView(i) {
  const g = goalsData[i];
  const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
  const offset = pctToOffset(pct);
  document.getElementById('gname-' + i).textContent = g.name;
  document.getElementById('gamt-' + i).textContent =
    '$' + g.saved.toLocaleString('en-US') + ' of $' + g.target.toLocaleString('en-US');
  document.getElementById('gpct-' + i).textContent = pct + '%';
  document.getElementById('gring-' + i).style.strokeDashoffset = offset;
  document.getElementById('gpct-' + i).style.color =
    pct >= 100 ? 'var(--green)' : 'var(--gold-soft)';
}

function buildEditList() {
  const container = document.getElementById('goal-edit-list');
  container.innerHTML = '';
  goalsData.forEach((g, i) => {
    container.insertAdjacentHTML('beforeend', `
      <div class="goal-edit-item">
        <div class="goal-edit-lbl">Goal ${i + 1} — Name</div>
        <input class="goal-edit-input" id="gedit-name-${i}" value="${g.name}" placeholder="Goal name"/>
        <div class="goal-edit-row">
          <div>
            <div class="goal-edit-lbl" style="margin-top:8px">Saved ($)</div>
            <input class="goal-edit-input" id="gedit-saved-${i}" type="number" value="${g.saved}" min="0"/>
          </div>
          <div>
            <div class="goal-edit-lbl" style="margin-top:8px">Target ($)</div>
            <input class="goal-edit-input" id="gedit-target-${i}" type="number" value="${g.target}" min="1"/>
          </div>
        </div>
      </div>`);
  });
}

function enterGoalsEdit() {
  buildEditList();
  document.getElementById('goals-view').style.display = 'none';
  document.getElementById('goals-edit').style.display = 'block';
  document.getElementById('editGoalsBtn').textContent = 'Editing…';
  document.getElementById('editGoalsBtn').style.color = 'var(--gold)';
}

function exitGoalsEdit() {
  document.getElementById('goals-view').style.display = 'block';
  document.getElementById('goals-edit').style.display = 'none';
  document.getElementById('editGoalsBtn').textContent = 'Edit';
  document.getElementById('editGoalsBtn').style.color = '';
}

document.getElementById('editGoalsBtn').addEventListener('click', e => {
  e.preventDefault();
  enterGoalsEdit();
});

document.getElementById('goalsSaveBtn').addEventListener('click', () => {
  let valid = true;
  goalsData.forEach((g, i) => {
    const name   = document.getElementById('gedit-name-' + i).value.trim();
    const saved  = parseInt(document.getElementById('gedit-saved-' + i).value, 10);
    const target = parseInt(document.getElementById('gedit-target-' + i).value, 10);
    if (!name || isNaN(saved) || isNaN(target) || target < 1) { valid = false; return; }
    if (saved > target) { valid = false; return; }
    goalsData[i] = { name, saved, target };
  });
  if (!valid) {
    toast('Check your values — saved cannot exceed target', 'info');
    return;
  }
  goalsData.forEach((_, i) => updateGoalView(i));
  MeridianDB.set('goals', goalsData.map(g => ({name:g.name, saved:g.saved, target:g.target})));
  dbPing();
  exitGoalsEdit();
  toast('Goals updated successfully', 'success');
});

document.getElementById('goalsCancelBtn').addEventListener('click', exitGoalsEdit);

/* ================================================
   CARD TILT (desktop)
   ================================================ */
if (window.matchMedia('(min-width: 720px)').matches) {
  const cc = document.getElementById('creditCard');
  cardWrap.addEventListener('mousemove', e => {
    if (cardWrap.classList.contains('flipped')) return;
    const r = cardWrap.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    document.getElementById('cardFlipInner').style.transform =
      `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-2px)`;
  });
  cardWrap.addEventListener('mouseleave', () => {
    if (!cardWrap.classList.contains('flipped')) {
      document.getElementById('cardFlipInner').style.transform = '';
    }
  });
  // disable tilt when flipped — click handles flip
  cardWrap.addEventListener('click', () => {
    document.getElementById('cardFlipInner').style.transform = '';
  });
}

/* ================================================
   INVESTMENT DRAWER
   ================================================ */
const invOverlay = document.getElementById('invOverlay');
const invBody    = document.getElementById('invBody');

const invAssets = [
  { id:0, name:'Apple Inc.',       ticker:'AAPL', sharesLabel:'120 shares',  shares:120,  price:207.00, value:24840,  change:+2.4,  color:'#c9a86a', low52:'$164', high52:'$237', cap:'$3.2T',    vol:'52M',    up:true,
    spark:[162,168,172,169,175,180,178,183,190,185,192,195,198,202,207] },
  { id:1, name:'Vanguard S&P 500', ticker:'VOO',  sharesLabel:'340 shares',  shares:340,  price:494.12, value:168000, change:+0.9,  color:'#7dd3a0', low52:'$398', high52:'$510', cap:'ETF',      vol:'4.1M',   up:true,
    spark:[398,415,420,410,430,440,445,438,455,462,470,468,478,490,494] },
  { id:2, name:'Tesla Inc.',        ticker:'TSLA', sharesLabel:'85 shares',   shares:85,   price:226.00, value:19210,  change:-1.8,  color:'#e88f8f', low52:'$138', high52:'$358', cap:'$720B',    vol:'80M',    up:false,
    spark:[310,290,275,260,280,265,250,240,255,245,235,230,240,228,226] },
  { id:3, name:'Bitcoin',           ticker:'BTC',  sharesLabel:'2.4 BTC',     shares:2.4,  price:66000,  value:158400, change:+3.2,  color:'#9aa0ab', low52:'$26K', high52:'$73K', cap:'$1.3T',    vol:'$28B',   up:true,
    spark:[28000,35000,42000,38000,50000,58000,55000,60000,65000,62000,68000,64000,66000,65000,66000] },
  { id:4, name:'Real Estate Fund',  ticker:'REIT', sharesLabel:'Private',     shares:null, price:null,   value:320000, change:+0.3,  color:'#6b8aab', low52:'N/A',  high52:'N/A',  cap:'Private',  vol:'N/A',    up:true,
    spark:[280000,285000,290000,288000,295000,300000,298000,305000,310000,308000,315000,312000,318000,319000,320000] },
];

function makeSparkline(data, color, up) {
  const W=280, H=64, pad=4;
  const min=Math.min(...data), max=Math.max(...data);
  const xStep = (W-pad*2)/(data.length-1);
  const pts = data.map((v,i)=>[pad+i*xStep, H-pad-(v-min)/(max-min||1)*(H-pad*2)]);
  const d = pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const fill = pts.map((p,i)=>(i===0?'M':'L')+p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')
    + ` L${pts[pts.length-1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
  const lineColor = up ? '#7dd3a0' : '#e88f8f';
  const gradId = 'sg'+Math.random().toString(36).slice(2);
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:64px;display:block;margin:12px 0">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${lineColor}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${fill}" fill="url(#${gradId})"/>
    <path d="${d}" fill="none" stroke="${lineColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function openInvDrawer(assetId) {
  const a = invAssets[assetId];
  document.getElementById('invDot').style.background  = a.color;
  document.getElementById('invTitle').textContent     = a.name;
  document.getElementById('invSub').textContent       = a.ticker + (a.price ? ' · $'+a.price.toLocaleString() : ' · Private');

  const changeSign = a.up ? '+' : '';
  const changeColor = a.up ? 'var(--green)' : 'var(--red)';
  const arrowPath  = a.up ? 'M17 10l-5-5-5 5' : 'M7 14l5 5 5-5';

  invBody.innerHTML = `
    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
      <div style="font-family:var(--mono);font-size:28px;color:var(--ink)">$${a.value.toLocaleString()}</div>
      <div style="font-size:13px;color:${changeColor};display:flex;align-items:center;gap:3px">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${arrowPath}"/></svg>
        ${changeSign}${a.change}% today
      </div>
    </div>
    <div style="font-size:12px;color:var(--ink-dim);margin-bottom:4px">${a.sharesLabel}${a.price ? ' · $'+a.price+' per share' : ''}</div>
    ${makeSparkline(a.spark, a.color, a.up)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px">52W Low</div>
        <div style="font-family:var(--mono);font-size:14px;color:var(--ink)">${a.low52}</div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px">52W High</div>
        <div style="font-family:var(--mono);font-size:14px;color:var(--ink)">${a.high52}</div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px">Market Cap</div>
        <div style="font-family:var(--mono);font-size:14px;color:var(--ink)">${a.cap}</div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px">Volume</div>
        <div style="font-family:var(--mono);font-size:14px;color:var(--ink)">${a.vol}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <button id="invBuyBtn" style="padding:13px;border-radius:var(--r-sm);background:linear-gradient(180deg,#e6cf9c,#c9a86a);border:none;color:#1a1408;font-weight:600;font-size:13px;cursor:pointer">Buy</button>
      <button id="invSellBtn" style="padding:13px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:13px;cursor:pointer">Sell</button>
    </div>
    <div id="invTradeForm" style="display:none;margin-top:16px"></div>`;

  function showTradeForm(type) {
    const form = document.getElementById('invTradeForm');
    const isPrivate = !a.price;
    form.style.display = 'block';
    form.innerHTML = `
      <div style="border-top:1px solid var(--line);padding-top:16px">
        <div style="font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-dim);margin-bottom:12px">${type === 'buy' ? 'Buy' : 'Sell'} ${a.ticker}</div>
        ${isPrivate ? `
          <div class="cg-field"><div class="cg-label">Amount (USD)</div>
            <input class="cg-input" type="number" id="invAmt" placeholder="10000" min="1"/></div>
          <div class="cg-field"><div class="cg-label">Note (optional)</div>
            <input class="cg-input" id="invNote" placeholder="Reason for ${type}…"/></div>
        ` : `
          <div class="cg-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            <div class="cg-field"><div class="cg-label">Shares</div>
              <input class="cg-input" type="number" id="invShares" placeholder="1" min="0.01" step="0.01"/></div>
            <div class="cg-field"><div class="cg-label">Est. total</div>
              <input class="cg-input" id="invEstTotal" placeholder="—" readonly style="color:var(--gold)"/></div>
          </div>
        `}
        <button id="invTradeConfirm" style="width:100%;padding:13px;border-radius:var(--r-sm);background:linear-gradient(180deg,#e6cf9c,#c9a86a);border:none;color:#1a1408;font-weight:600;font-size:13px;cursor:pointer">Confirm ${type}</button>
      </div>`;
    if (!isPrivate) {
      document.getElementById('invShares').addEventListener('input', e => {
        const s = parseFloat(e.target.value);
        document.getElementById('invEstTotal').value = s && a.price ? '$'+(s*a.price).toLocaleString(undefined,{maximumFractionDigits:2}) : '—';
      });
    }
    document.getElementById('invTradeConfirm').addEventListener('click', () => {
      const sharesInput = document.getElementById('invShares');
      const amtInput    = document.getElementById('invAmt');
      if (sharesInput && (!sharesInput.value || parseFloat(sharesInput.value)<=0)) { toast('Enter number of shares','error'); return; }
      if (amtInput    && (!amtInput.value    || parseFloat(amtInput.value)<=0))    { toast('Enter an amount','error'); return; }
      invBody.innerHTML = `
        <div class="cg-success" style="text-align:center;padding:40px 20px">
          <div class="cg-success-icon" style="width:64px;height:64px;border-radius:50%;margin:0 auto 16px;background:linear-gradient(135deg,rgba(201,168,106,.2),rgba(201,168,106,.06));border:1px solid rgba(201,168,106,.3);display:grid;place-items:center;animation:successPop .4s cubic-bezier(.2,.8,.2,1)">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h3 style="font-family:var(--display);font-size:20px;font-weight:300;margin-bottom:8px">Order placed</h3>
          <p style="font-size:13px;color:var(--ink-dim);line-height:1.5">Your ${type} order for <strong>${a.name}</strong> has been submitted. Settlement within 1–2 business days.</p>
          <button id="invDoneBtn" class="btn-primary" style="margin-top:24px">Done</button>
        </div>`;
      document.getElementById('invDoneBtn').addEventListener('click', closeInvDrawer);
    });
  }

  document.getElementById('invBuyBtn').addEventListener('click', () => showTradeForm('buy'));
  document.getElementById('invSellBtn').addEventListener('click', () => showTradeForm('sell'));

  invOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeInvDrawer() {
  invOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('invClose').addEventListener('click', closeInvDrawer);
document.getElementById('invHandle').addEventListener('click', closeInvDrawer);
invOverlay.addEventListener('click', e => { if (e.target === invOverlay) closeInvDrawer(); });

document.querySelectorAll('#invHoldingsList [data-asset]').forEach(row => {
  row.addEventListener('click', () => openInvDrawer(+row.dataset.asset));
});

document.getElementById('newPositionBtn').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('invDot').style.background  = 'var(--gold)';
  document.getElementById('invTitle').textContent     = 'Add New Position';
  document.getElementById('invSub').textContent       = 'Stocks, ETFs, crypto or alternatives';
  invBody.innerHTML = `
    <div class="cg-field"><div class="cg-label">Asset name</div>
      <input class="cg-input" id="npName" placeholder="e.g. Microsoft, Gold ETF, Ethereum"/></div>
    <div class="cg-field"><div class="cg-label">Ticker / Symbol</div>
      <input class="cg-input" id="npTicker" placeholder="e.g. MSFT, GLD, ETH"/></div>
    <div class="cg-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="cg-field"><div class="cg-label">Amount invested</div>
        <input class="cg-input" type="number" id="npValue" placeholder="10000" min="1"/></div>
      <div class="cg-field"><div class="cg-label">Price per unit</div>
        <input class="cg-input" type="number" id="npPrice" placeholder="Optional" min="0"/></div>
    </div>
    <div class="cg-field"><div class="cg-label">Asset type</div>
      <select class="cg-select" id="npType">
        <option>Stock</option><option>ETF</option><option>Crypto</option><option>Real Estate</option><option>Bond</option><option>Commodity</option>
      </select></div>
    <button class="btn-primary" id="npCreate">Add to portfolio</button>`;
  document.getElementById('npCreate').addEventListener('click', () => {
    const name  = document.getElementById('npName').value.trim();
    const tick  = document.getElementById('npTicker').value.trim().toUpperCase();
    const value = parseFloat(document.getElementById('npValue').value) || 0;
    if (!name)    { toast('Enter asset name','error'); return; }
    if (!tick)    { toast('Enter ticker symbol','error'); return; }
    if (value<=0) { toast('Enter investment amount','error'); return; }
    const colors = ['#b8860b','#7dd3a0','#9aa0ab','#6b8aab','#c9a86a'];
    const color  = colors[invAssets.length % colors.length];
    const newId  = invAssets.length;
    const spark  = Array.from({length:15},(_,i)=>value*(0.85+0.15*Math.sin(i*0.7+1)));
    invAssets.push({ id:newId, name, ticker:tick, sharesLabel:'Custom', shares:null, price:null, value, change:0, color, low52:'N/A', high52:'N/A', cap:'N/A', vol:'N/A', up:true, spark });
    const list = document.getElementById('invHoldingsList');
    const div  = document.createElement('div');
    div.className='asset-row'; div.style.cursor='pointer'; div.dataset.asset=newId;
    div.innerHTML=`<div class="asset-dot" style="background:${color}"></div><div style="flex:1"><div style="font-size:13.5px;color:var(--ink)">${name}</div><div style="font-family:var(--mono);font-size:10px;color:var(--ink-dim);margin-top:2px">${tick} · Custom</div></div><div class="asset-bar"><div class="asset-bar-fill" style="width:30%;background:${color}"></div></div><div style="text-align:right"><div style="font-family:var(--mono);font-size:12px">$${value.toLocaleString()}</div><div class="asset-change up">New</div></div><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="color:var(--ink-faint);flex-shrink:0;margin-left:4px"><path d="M9 18l6-6-6-6"/></svg>`;
    div.addEventListener('click',()=>openInvDrawer(newId));
    list.appendChild(div);
    closeInvDrawer();
    toast('"'+name+'" added to portfolio','success');
  });
  invOverlay.classList.add('open');
  document.body.style.overflow='hidden';
});

/* ================================================
   CARDS PAGE
   ================================================ */

// card flip on cards page
const cardWrap2 = document.getElementById('cardFlipWrap2');
cardWrap2.addEventListener('click', () => {
  cardWrap2.classList.toggle('flipped');
});

// card activity rows → tx drawer
document.querySelectorAll('#cardActivityList [data-tx]').forEach(row => {
  row.addEventListener('click', () => openTxDrawer(row.dataset.tx));
});

// card control drawer helpers
const cardCtrlOverlay = document.getElementById('cardCtrlOverlay');
const cardCtrlBody    = document.getElementById('cardCtrlBody');

function openCardCtrl(title, sub, html) {
  document.getElementById('cardCtrlTitle').textContent = title;
  document.getElementById('cardCtrlSub').textContent   = sub;
  cardCtrlBody.innerHTML = html;
  cardCtrlOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCardCtrl() {
  cardCtrlOverlay.classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('cardCtrlClose').addEventListener('click', closeCardCtrl);
document.getElementById('cardCtrlHandle').addEventListener('click', closeCardCtrl);
cardCtrlOverlay.addEventListener('click', e => { if (e.target === cardCtrlOverlay) closeCardCtrl(); });

// ---- CARD STATE ----
let cardFrozen = false;
let _vCardNum  = '';
restoreFromDB(); // apply DB-persisted state now that goalsData + cardFrozen are live

// Single delegated listener on the persistent cardCtrlBody container
cardCtrlBody.addEventListener('click', function(e) {
  const btn = e.target.closest('[id],[data-report],[data-profile-opt],[data-sec-opt],.stmt-dl,.sec-revoke-btn');
  if (!btn) return;
  const id = btn.id;

  if (id === 'freezeConfirm') {
    cardFrozen = true;
    document.getElementById('cardFreezeLbl').textContent = 'Unfreeze';
    document.getElementById('cardCredit2').style.filter = 'grayscale(0.8) brightness(0.7)';
    document.getElementById('cardFreezeBtn').style.color = 'var(--red)';
    MeridianDB.set('card.frozen', true); dbPing();
    closeCardCtrl();
    toast('Card frozen — new transactions blocked', 'info');

  } else if (id === 'unfreezeConfirm') {
    cardFrozen = false;
    document.getElementById('cardFreezeLbl').textContent = 'Freeze';
    document.getElementById('cardCredit2').style.filter = '';
    document.getElementById('cardFreezeBtn').style.color = '';
    MeridianDB.set('card.frozen', false); dbPing();
    closeCardCtrl();
    toast('Card unfrozen — transactions resumed', 'success');

  } else if (id === 'freezeCancelBtn' || id === 'unfreezeCancelBtn') {
    closeCardCtrl();

  } else if (id === 'limitSaveBtn') {
    const ml = (document.getElementById('limitMonthly') || {}).value;
    const dl = (document.getElementById('limitDaily')   || {}).value;
    const used = 12847;
    if (ml && parseFloat(ml) >= 1000) {
      const newLimit = parseFloat(ml);
      document.getElementById('cardLimitDisplay').textContent = newLimit.toLocaleString();
      const pct = Math.min((used / newLimit) * 100, 100).toFixed(1);
      document.getElementById('cardUsageBar').style.width = pct + '%';
      document.getElementById('cardAvailText').textContent = '$' + (newLimit - used).toLocaleString() + ' available';
    }
    if (ml && parseFloat(ml) >= 1000) MeridianDB.set('card.monthlyLimit', parseFloat(ml));
    if (dl && parseFloat(dl) >= 100)  MeridianDB.set('card.dailyLimit',   parseFloat(dl));
    dbPing();
    closeCardCtrl();
    toast('Spend limits updated successfully', 'success');

  } else if (id === 'vCardCopy') {
    const num = _vCardNum.replace(/\s/g, '');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num).then(() => toast('Card number copied', 'success')).catch(() => toast('Card: ' + _vCardNum, 'info'));
    } else {
      toast('Card: ' + _vCardNum, 'info');
    }

  } else if (id === 'vCardClose') {
    closeCardCtrl();

  } else if (id === 'reportDoneBtn') {
    closeCardCtrl();

  } else if (id === 'copyAccBtn') {
    const accNum = '482100937712';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(accNum).then(() => toast('Account number copied', 'success')).catch(() => toast('Account: ' + accNum, 'info'));
    } else {
      toast('Account: ' + accNum, 'info');
    }

  } else if (id === 'shareDetailsBtn') {
    const text = 'Meridian Private Banking\nAccount holder: Aiden Marlowe\nAccount: 4821 0093 7712\nRouting: 026 009 593\nSWIFT: MRDNUSNYXXX';
    if (navigator.share) {
      navigator.share({ title: 'Account Details', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => toast('Account details copied', 'success')).catch(() => {});
    } else {
      toast('Details copied to clipboard', 'success');
    }

  } else if (id === 'profileSaveDetails') {
    saveDrawerToDB(_currentProfileSection);
    closeCardCtrl();
    toast('Changes saved successfully', 'success');

  // ---- security sub-view buttons ----
  } else if (id === 'secSavePw') {
    const cur  = (document.getElementById('secCurPw')  || {}).value || '';
    const nw   = (document.getElementById('secNewPw')  || {}).value || '';
    const conf = (document.getElementById('secConfPw') || {}).value || '';
    const errEl = document.getElementById('secPwErr');
    if (!cur)              { errEl.style.display='block'; errEl.textContent='Please enter your current password.'; return; }
    if (nw.length < 8)     { errEl.style.display='block'; errEl.textContent='New password must be at least 8 characters.'; return; }
    if (nw !== conf)       { errEl.style.display='block'; errEl.textContent='Passwords do not match.'; return; }
    closeCardCtrl();
    toast('Password updated successfully', 'success');

  } else if (id === 'secToggle1') {
    const inp = document.getElementById('secCurPw');
    if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';

  } else if (id === 'toggleFaceId') {
    const statusEl = document.getElementById('toggleFaceIdStatus');
    const isOn = statusEl.textContent === 'Enabled';
    statusEl.textContent = isOn ? 'Disabled' : 'Enabled';
    statusEl.style.color  = isOn ? 'var(--ink-faint)' : 'var(--green)';
    const fb = document.getElementById('toggleFaceId');
    fb.textContent = isOn ? 'Enable' : 'Disable';
    fb.style.background  = isOn ? 'rgba(201,168,106,.1)' : 'rgba(220,60,60,.1)';
    fb.style.borderColor = isOn ? 'rgba(201,168,106,.3)' : 'rgba(220,60,60,.3)';
    fb.style.color       = isOn ? 'var(--gold-soft)'      : 'var(--red)';
    toast('Face ID ' + (isOn ? 'disabled' : 'enabled'), isOn ? 'info' : 'success');

  } else if (id === 'toggleTouchId') {
    const statusEl = document.getElementById('toggleTouchIdStatus');
    const isOn = statusEl.textContent === 'Enabled';
    statusEl.textContent = isOn ? 'Not set up' : 'Enabled';
    statusEl.style.color  = isOn ? 'var(--ink-faint)' : 'var(--green)';
    const btn2 = document.getElementById('toggleTouchId');
    btn2.textContent = isOn ? 'Enable' : 'Disable';
    btn2.style.background  = isOn ? 'rgba(201,168,106,.1)' : 'rgba(220,60,60,.1)';
    btn2.style.borderColor = isOn ? 'rgba(201,168,106,.3)' : 'rgba(220,60,60,.3)';
    btn2.style.color       = isOn ? 'var(--gold-soft)'      : 'var(--red)';
    toast('Touch ID ' + (isOn ? 'disabled' : 'set up successfully'), isOn ? 'info' : 'success');

  } else if (id === 'sec2faApp') {
    document.getElementById('cardCtrlTitle').textContent = 'Authenticator app';
    document.getElementById('cardCtrlSub').textContent = 'Two-factor auth · Manage';
    cardCtrlBody.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="display:inline-block;background:#fff;padding:10px;border-radius:10px;margin-bottom:10px">
          <svg width="110" height="110" viewBox="0 0 11 11" shape-rendering="crispEdges">
            ${(()=>{const p='1110111 0100010 1110111 0001000 1011101 0110100 1110010 0000000 1110111 0010100 1011001 0110000 1001110'.split(' ');return p.map((r,y)=>[...r].map((c,x)=>c==='1'?`<rect x="${x}" y="${y}" width="1" height="1" fill="#000"/>`:'').join('')).join('');})()}
          </svg>
        </div>
        <div style="font-size:12px;color:var(--ink-dim)">Scan with Google Authenticator or Authy</div>
      </div>
      <div class="cg-field">
        <div class="cg-label">Manual entry key</div>
        <div style="font-family:var(--mono);font-size:13px;background:rgba(255,255,255,.04);border:1px solid var(--line-strong);border-radius:var(--r-sm);padding:10px 14px;color:var(--gold-soft);letter-spacing:.12em;display:flex;justify-content:space-between;align-items:center">
          MRDNPK7X 4A2B9Q3E
          <button id="sec2faCopyKey" type="button" style="background:none;border:none;color:var(--ink-faint);cursor:pointer;padding:2px 4px;font-family:var(--mono);font-size:10px">Copy</button>
        </div>
      </div>
      <div style="font-size:11px;color:var(--ink-faint);margin-bottom:20px;line-height:1.6;padding:0 2px">After scanning, enter the 6-digit code from your app to confirm the link.</div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:12px">
        ${[0,1,2,3,4,5].map(i=>`<input id="otp${i}" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" style="width:100%;aspect-ratio:1;text-align:center;font-family:var(--mono);font-size:22px;background:rgba(255,255,255,.05);border:1px solid var(--line-strong);border-radius:var(--r-sm);color:var(--ink);outline:none;transition:border-color .2s"/>`).join('')}
      </div>
      <button class="btn-primary" id="sec2faVerify" type="button" style="margin-bottom:10px">Verify &amp; link</button>
      <button id="sec2faUnlink" type="button" style="width:100%;padding:11px;border-radius:var(--r-sm);background:rgba(220,60,60,.06);border:1px solid rgba(220,60,60,.2);color:var(--red);font-size:13px;cursor:pointer;font-family:var(--body)">Unlink authenticator</button>`;
    // OTP auto-advance
    setTimeout(()=>{
      document.querySelectorAll('[id^="otp"]').forEach((inp,i,arr)=>{
        inp.addEventListener('input',()=>{ if(inp.value&&arr[i+1]) arr[i+1].focus(); });
        inp.addEventListener('keydown',e=>{ if(e.key==='Backspace'&&!inp.value&&arr[i-1]) arr[i-1].focus(); });
      });
    },50);

  } else if (id === 'sec2faCopyKey') {
    if (navigator.clipboard) navigator.clipboard.writeText('MRDNPK7X4A2B9Q3E').then(()=>toast('Setup key copied','success'));
    else toast('Key: MRDNPK7X 4A2B9Q3E','info');

  } else if (id === 'sec2faVerify') {
    const code = [0,1,2,3,4,5].map(i=>(document.getElementById('otp'+i)||{}).value||'').join('');
    if (code.length < 6) { toast('Enter the 6-digit code from your app','info'); return; }
    document.getElementById('sec2faVerify').textContent = 'Verifying…';
    document.getElementById('sec2faVerify').disabled = true;
    setTimeout(()=>{ closeCardCtrl(); toast('Authenticator app linked successfully','success'); },1000);

  } else if (id === 'sec2faUnlink') {
    cardCtrlBody.innerHTML = `
      <div style="text-align:center;padding:32px 20px">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(220,60,60,.1);border:1px solid rgba(220,60,60,.2);display:grid;place-items:center;margin:0 auto 16px">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h3 style="font-family:var(--display);font-size:18px;font-weight:300;margin-bottom:8px">Unlink authenticator?</h3>
        <p style="font-size:13px;color:var(--ink-dim);line-height:1.6;margin-bottom:24px">This will remove Google Authenticator as your 2FA method. You'll need to use backup codes to sign in until you link a new app.</p>
        <button class="btn-primary" id="sec2faUnlinkConfirm" type="button" style="background:linear-gradient(180deg,#e8a0a0,#c06060);box-shadow:none;margin-bottom:8px">Yes, unlink</button>
        <button id="sec2faUnlinkCancel" type="button" style="width:100%;padding:12px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:13px;cursor:pointer;font-family:var(--body)">Cancel</button>
      </div>`;

  } else if (id === 'sec2faUnlinkConfirm') {
    closeCardCtrl(); toast('Authenticator app unlinked. Use backup codes to sign in.','info');

  } else if (id === 'sec2faUnlinkCancel') {
    // re-trigger the authenticator app sub-view
    const fakeBtn = {dataset:{secOpt:'Two-factor auth'}};
    document.getElementById('cardCtrlTitle').textContent = 'Two-factor auth';
    document.getElementById('cardCtrlSub').textContent = 'Security & password · Two-factor auth';
    // just close back to security menu
    closeCardCtrl();

  } else if (id === 'sec2faDisable') {
    cardCtrlBody.innerHTML = `
      <div style="text-align:center;padding:32px 20px">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(220,60,60,.1);border:1px solid rgba(220,60,60,.2);display:grid;place-items:center;margin:0 auto 16px">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <h3 style="font-family:var(--display);font-size:18px;font-weight:300;margin-bottom:8px">Disable 2FA?</h3>
        <p style="font-size:13px;color:var(--ink-dim);line-height:1.6;margin-bottom:24px">Your account will be significantly less secure. We strongly recommend keeping 2FA enabled.</p>
        <button class="btn-primary" id="sec2faDisableConfirm" type="button" style="background:linear-gradient(180deg,#e8a0a0,#c06060);box-shadow:none;margin-bottom:8px">Disable anyway</button>
        <button id="sec2faDisableCancel" type="button" style="width:100%;padding:12px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:13px;cursor:pointer;font-family:var(--body)">Keep 2FA enabled</button>
      </div>`;

  } else if (id === 'sec2faDisableConfirm') {
    closeCardCtrl(); toast('Two-factor authentication disabled','info');
  } else if (id === 'sec2faDisableCancel') {
    closeCardCtrl();

  } else if (id === 'sec2faCodes') {
    document.getElementById('cardCtrlTitle').textContent = 'Backup codes';
    document.getElementById('cardCtrlSub').textContent = 'Two-factor auth · Backup codes';
    const codes = [
      {c:'AM8X-K2PQ',used:false},{c:'LZ9R-TW4V',used:false},{c:'NB3F-HY7C',used:false},{c:'QP2M-XK8R',used:false},
      {c:'VT6J-WN4B',used:false},{c:'HF9D-CR7L',used:false},{c:'YS3E-ZM5G',used:false},{c:'UK4P-BJ6N',used:false},
      {c:'EG7A-QL2X',used:true}, {c:'RM5C-FH9T',used:true},
    ];
    cardCtrlBody.innerHTML = `
      <p style="font-size:12px;color:var(--ink-dim);margin-bottom:14px;line-height:1.6">Each backup code can only be used once. Keep these somewhere safe.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:20px">
        ${codes.map(c=>`
          <div style="font-family:var(--mono);font-size:12px;padding:8px 12px;border-radius:var(--r-sm);border:1px solid ${c.used?'rgba(255,255,255,.06)':'var(--line-strong)'};background:rgba(255,255,255,.03);color:${c.used?'var(--ink-faint)':'var(--gold-soft)'};text-decoration:${c.used?'line-through':'none'};display:flex;align-items:center;justify-content:space-between">
            ${c.c}
            ${c.used?'<span style="font-size:9px;color:var(--ink-faint)">used</span>':''}
          </div>`).join('')}
      </div>
      <button id="sec2faRegenerate" type="button" style="width:100%;padding:12px;border-radius:var(--r-sm);background:rgba(201,168,106,.08);border:1px solid rgba(201,168,106,.2);color:var(--gold-soft);font-size:13px;cursor:pointer;font-family:var(--body);margin-bottom:10px">Regenerate all codes</button>
      <button class="btn-primary" id="profileSaveDetails" type="button">Done</button>`;

  } else if (id === 'sec2faRegenerate') {
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const mk=()=>[...Array(4)].map(()=>chars[Math.floor(Math.random()*chars.length)]).join('');
    const newCodes=[...Array(10)].map(()=>mk()+'-'+mk());
    document.getElementById('cardCtrlSub').textContent = 'New codes generated — save them now';
    cardCtrlBody.innerHTML = `
      <div style="background:rgba(201,168,106,.06);border:1px solid rgba(201,168,106,.2);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:14px;font-size:12px;color:var(--gold-soft);line-height:1.6">New backup codes generated. Your old codes are now invalid.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:20px">
        ${newCodes.map(c=>`<div style="font-family:var(--mono);font-size:12px;padding:8px 12px;border-radius:var(--r-sm);border:1px solid var(--line-strong);background:rgba(255,255,255,.03);color:var(--gold-soft)">${c}</div>`).join('')}
      </div>
      <button class="btn-primary" id="profileSaveDetails" type="button">Done — I've saved these codes</button>`;
    toast('10 new backup codes generated','success');

  } else if (id === 'sec2faDev') {
    document.getElementById('cardCtrlTitle').textContent = 'Trusted devices';
    document.getElementById('cardCtrlSub').textContent = 'Two-factor auth · Trusted devices';
    cardCtrlBody.innerHTML = `
      <p style="font-size:12px;color:var(--ink-dim);margin-bottom:14px;line-height:1.6">These devices can skip 2FA for 30 days after a successful sign-in.</p>
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">
        ${[
          {dev:'MacBook Pro 14"',os:'macOS 14 Sonoma',added:'Added May 1',cur:true, id:'tdRow0'},
          {dev:'iPhone 15 Pro',  os:'iOS 17.4',       added:'Added Apr 12',cur:false,id:'tdRow1'},
        ].map(d=>`
          <div id="${d.id}" style="display:flex;align-items:center;gap:12px;padding:13px 14px;background:rgba(255,255,255,.03);border:1px solid ${d.cur?'rgba(201,168,106,.25)':'var(--line)'};border-radius:var(--r-sm);transition:all .3s">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${d.cur?'var(--gold)':'var(--ink-faint)'}" stroke-width="1.6" style="flex-shrink:0"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;color:var(--ink);display:flex;align-items:center;gap:6px">${d.dev}${d.cur?'<span style="font-family:var(--mono);font-size:9px;color:var(--gold);background:rgba(201,168,106,.12);border:1px solid rgba(201,168,106,.25);padding:1px 7px;border-radius:99px">This device</span>':''}</div>
              <div style="font-size:11px;color:var(--ink-faint);margin-top:2px">${d.os} · ${d.added}</div>
            </div>
            ${!d.cur?`<button type="button" class="sec-revoke-btn" data-row="${d.id}" data-dev="${d.dev}" style="padding:5px 12px;border-radius:99px;font-size:11px;font-family:var(--mono);cursor:pointer;background:rgba(220,60,60,.08);border:1px solid rgba(220,60,60,.25);color:var(--red);flex-shrink:0;transition:all .2s">Remove</button>`:''}
          </div>`).join('')}
      </div>
      <button class="btn-primary" id="profileSaveDetails" type="button">Done</button>`;

  } else if (btn.classList && btn.classList.contains('sec-revoke-btn')) {
    const rowId  = btn.dataset.row;
    const devName = btn.dataset.dev || 'Device';
    const row = rowId ? document.getElementById(rowId) : btn.closest('div[style]');
    if (row) {
      row.style.opacity = '0.45';
      row.style.borderColor = 'rgba(220,60,60,.2)';
    }
    btn.textContent = 'Signed out';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    toast(devName + ' signed out successfully', 'success');

  } else if (id === 'secSignOutAll') {
    document.querySelectorAll('.sec-revoke-btn:not(:disabled)').forEach(b => {
      const row = b.dataset.row ? document.getElementById(b.dataset.row) : b.closest('div[style]');
      if (row) { row.style.opacity='0.45'; row.style.borderColor='rgba(220,60,60,.2)'; }
      b.textContent='Signed out'; b.disabled=true; b.style.opacity='0.5';
    });
    toast('All other devices signed out successfully', 'success');

  } else if (btn.classList && btn.classList.contains('stmt-dl')) {
    const month = btn.dataset.month;
    toast(month + ' statement downloaded', 'success');

  } else if (id === 'profileSignOut') {
    cardCtrlBody.innerHTML = `
      <div style="text-align:center;padding:40px 20px">
        <div style="font-size:52px;margin-bottom:16px">👋</div>
        <h3 style="font-family:var(--display);font-size:18px;font-weight:300;margin-bottom:8px">Sign out?</h3>
        <p style="font-size:13px;color:var(--ink-dim);line-height:1.6;margin-bottom:24px">You'll be securely logged out of Meridian Private Banking.</p>
        <button class="btn-primary" id="signOutConfirm" type="button" style="background:linear-gradient(180deg,#e8a0a0,#c06060);box-shadow:none">Yes, sign out</button>
        <button id="signOutCancel" type="button" style="width:100%;margin-top:8px;padding:12px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:13px;cursor:pointer;font-family:var(--body)">Cancel</button>
      </div>`;

  } else if (id === 'signOutConfirm') {
    closeCardCtrl();
    toast('Signed out successfully — goodbye, Aiden.', 'success');

  } else if (id === 'signOutCancel') {
    closeCardCtrl();

  } else {
    // profile settings options
    const profileOpt = e.target.closest('[data-profile-opt]');
    if (profileOpt) {
      const label = profileOpt.dataset.profileOpt;
      const subContents = {
        'Personal details': `
          <div class="cg-field"><div class="cg-label">Full name</div><input class="cg-input" value="Aiden Marlowe"/></div>
          <div class="cg-field"><div class="cg-label">Email</div><input class="cg-input" type="email" value="a.marlowe@meridian.com"/></div>
          <div class="cg-field"><div class="cg-label">Phone</div><input class="cg-input" type="tel" value="+1 (212) 555-0193"/></div>
          <div class="cg-field"><div class="cg-label">Address</div><input class="cg-input" value="740 Park Ave, New York, NY 10021"/></div>
          <button class="btn-primary" id="profileSaveDetails" type="button">Save changes</button>`,
        'Security & password': `
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
            ${[
              {icon:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',t:'Change password',s:'Last changed 3 months ago'},
              {icon:'<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',t:'Biometric login',s:'Face ID · Enabled'},
              {icon:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',t:'Two-factor auth',s:'Authenticator app · Active'},
              {icon:'<path d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',t:'Login history',s:'Last login: Today, 9:01 AM · New York'},
            ].map(r=>`<div class="cg-advisor-opt" data-sec-opt="${r.t}" style="padding:13px 14px;gap:12px;border-radius:var(--r-sm);cursor:pointer">
              <div style="width:34px;height:34px;border-radius:10px;background:rgba(201,168,106,.1);border:1px solid rgba(201,168,106,.15);display:grid;place-items:center;flex-shrink:0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.6">${r.icon}</svg>
              </div>
              <div class="cg-advisor-opt-body" style="flex:1"><div class="n" style="font-size:13px">${r.t}</div><div class="a">${r.s}</div></div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="color:var(--ink-faint);flex-shrink:0"><path d="M9 18l6-6-6-6"/></svg>
            </div>`).join('')}
          </div>`,
        'Notifications': `
          <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
            ${[
              ['Transaction alerts','Every transaction on your account','true'],
              ['Large transaction','Transactions over $1,000','true'],
              ['Statement ready','Monthly statement available','true'],
              ['Portfolio alerts','Significant market moves','false'],
              ['Marketing & offers','Exclusive Meridian events','false'],
            ].map(([t,s,on])=>`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm)">
                <div><div style="font-size:13px;color:var(--ink)">${t}</div><div style="font-size:11px;color:var(--ink-dim);margin-top:2px">${s}</div></div>
                <label style="position:relative;width:38px;height:22px;flex-shrink:0;cursor:pointer">
                  <input type="checkbox" ${on==='true'?'checked':''} style="display:none" class="notif-toggle"/>
                  <span style="position:absolute;inset:0;border-radius:99px;background:${on==='true'?'var(--gold)':'rgba(255,255,255,.1)'};transition:background .25s"></span>
                  <span style="position:absolute;top:3px;left:${on==='true'?'19':'3'}px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .25s"></span>
                </label>
              </div>`).join('')}
          </div>
          <button class="btn-primary" id="profileSaveDetails" type="button">Save preferences</button>`,
        'Preferences': `
          <div class="cg-field"><div class="cg-label">Display currency</div>
            <select class="cg-select"><option selected>USD — US Dollar</option><option>EUR — Euro</option><option>GBP — British Pound</option><option>CHF — Swiss Franc</option></select></div>
          <div class="cg-field"><div class="cg-label">Language</div>
            <select class="cg-select"><option selected>English (US)</option><option>Français</option><option>Deutsch</option><option>日本語</option></select></div>
          <div class="cg-field">
            <div class="cg-label">Date of birth</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:8px">
              <div>
                <div style="font-size:10px;color:var(--ink-faint);font-family:var(--mono);letter-spacing:.08em;margin-bottom:4px">DD</div>
                <input id="prefDobD" class="cg-input" type="number" min="1" max="31" placeholder="DD" style="-moz-appearance:textfield;text-align:center"/>
              </div>
              <div>
                <div style="font-size:10px;color:var(--ink-faint);font-family:var(--mono);letter-spacing:.08em;margin-bottom:4px">MM</div>
                <input id="prefDobM" class="cg-input" type="number" min="1" max="12" placeholder="MM" style="-moz-appearance:textfield;text-align:center"/>
              </div>
              <div>
                <div style="font-size:10px;color:var(--ink-faint);font-family:var(--mono);letter-spacing:.08em;margin-bottom:4px">YYYY</div>
                <input id="prefDobY" class="cg-input" type="number" min="1900" max="2099" placeholder="YYYY" style="-moz-appearance:textfield;text-align:center"/>
              </div>
            </div>
          </div>
          <div class="cg-field">
            <div class="cg-label">Date format</div>
            <select class="cg-select" id="prefDateFmt">
              <option value="MM/DD/YYYY" selected>MM / DD / YYYY</option>
              <option value="DD/MM/YYYY">DD / MM / YYYY</option>
              <option value="YYYY-MM-DD">YYYY — MM — DD</option>
            </select>
            <div id="prefDatePreview" style="margin-top:8px;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--r-sm);background:rgba(255,255,255,.03);border:1px solid var(--line)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold-soft)" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              <span id="prefDatePreviewVal" style="font-family:var(--mono);font-size:13px;color:var(--gold-soft);letter-spacing:.1em">05 / 20 / 2026</span>
              <span style="font-size:10px;color:var(--ink-faint);margin-left:auto">Today's date</span>
            </div>
          </div>
          <div class="cg-field"><div class="cg-label">Default landing page</div>
            <select class="cg-select"><option selected>Overview</option><option>Activity</option><option>Investments</option></select></div>
          <button class="btn-primary" id="profileSaveDetails" type="button">Save preferences</button>`,
        'Statements & docs': `
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px">
            ${['May 2026','April 2026','March 2026','February 2026','January 2026','December 2025'].map(m=>`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm)">
                <div>
                  <div style="font-size:13px;color:var(--ink)">${m} Statement</div>
                  <div style="font-size:11px;color:var(--ink-dim);margin-top:2px">PDF · Account ending 7712</div>
                </div>
                <button class="stmt-dl" data-month="${m}" type="button" style="padding:6px 12px;border-radius:var(--r-sm);background:rgba(201,168,106,.1);border:1px solid rgba(201,168,106,.25);color:var(--gold);font-size:11px;font-family:var(--mono);cursor:pointer">Download</button>
              </div>`).join('')}
          </div>`,
      };
      const html = subContents[label] || `<p style="color:var(--ink-dim);font-size:13px">${label} settings coming soon.</p>`;
      document.getElementById('cardCtrlTitle').textContent = label;
      document.getElementById('cardCtrlSub').textContent   = 'Manage your ' + label.toLowerCase();
      cardCtrlBody.innerHTML = html;
      _currentProfileSection = label;
      setTimeout(() => loadDrawerFromDB(label), 0);
      return;
    }

    // security sub-options
    const secOpt = e.target.closest('[data-sec-opt]');
    if (secOpt) {
      const sec = secOpt.dataset.secOpt;
      const secViews = {
        'Change password': `
          <div class="cg-field">
            <div class="cg-label">Current password</div>
            <div style="position:relative">
              <input id="secCurPw" type="password" class="cg-input" placeholder="••••••••••" style="padding-right:44px"/>
              <button type="button" id="secToggle1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--ink-dim);cursor:pointer;padding:4px">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <div class="cg-field">
            <div class="cg-label">New password</div>
            <input id="secNewPw" type="password" class="cg-input" placeholder="Min. 8 characters"/>
          </div>
          <div class="cg-field" style="margin-bottom:20px">
            <div class="cg-label">Confirm new password</div>
            <input id="secConfPw" type="password" class="cg-input" placeholder="Re-enter new password"/>
          </div>
          <p id="secPwErr" style="font-size:12px;color:var(--red);margin-bottom:10px;display:none"></p>
          <button class="btn-primary" id="secSavePw" type="button">Update password</button>`,

        'Biometric login': `
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
            ${[
              {label:'Face ID',status:'Enabled',on:true,  id:'toggleFaceId'},
              {label:'Touch ID',status:'Not set up',on:false,id:'toggleTouchId'},
            ].map(b=>`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm)">
                <div>
                  <div style="font-size:13px;color:var(--ink)">${b.label}</div>
                  <div style="font-size:11px;color:${b.on?'var(--green)':'var(--ink-faint)'};margin-top:2px" id="${b.id}Status">${b.status}</div>
                </div>
                <button id="${b.id}" type="button" style="padding:6px 14px;border-radius:99px;font-size:11px;font-family:var(--mono);cursor:pointer;letter-spacing:.04em;background:${b.on?'rgba(220,60,60,.1)':'rgba(201,168,106,.1)'};border:1px solid ${b.on?'rgba(220,60,60,.3)':'rgba(201,168,106,.3)'};color:${b.on?'var(--red)':'var(--gold-soft)'}">${b.on?'Disable':'Enable'}</button>
              </div>`).join('')}
          </div>
          <button class="btn-primary" id="profileSaveDetails" type="button">Done</button>`,

        'Two-factor auth': `
          <div style="background:rgba(125,211,160,.06);border:1px solid rgba(125,211,160,.2);border-radius:var(--r-sm);padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <div><div style="font-size:13px;color:var(--green)">Two-factor authentication is active</div><div style="font-size:11px;color:var(--ink-dim);margin-top:2px">Your account is protected · Last verified today</div></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px">
            ${[
              {t:'Authenticator app',s:'Google Authenticator · Linked',act:'Manage',id:'sec2faApp'},
              {t:'Backup codes',    s:'8 of 10 codes remaining',     act:'View codes',id:'sec2faCodes'},
              {t:'Trusted devices', s:'2 devices authorised',        act:'Manage',   id:'sec2faDev'},
            ].map(r=>`
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm)">
                <div><div style="font-size:13px;color:var(--ink)">${r.t}</div><div style="font-size:11px;color:var(--ink-dim);margin-top:2px">${r.s}</div></div>
                <button id="${r.id}" type="button" style="padding:5px 14px;border-radius:99px;font-size:11px;font-family:var(--mono);cursor:pointer;background:rgba(201,168,106,.1);border:1px solid rgba(201,168,106,.25);color:var(--gold-soft);transition:background .2s">${r.act}</button>
              </div>`).join('')}
          </div>
          <button id="sec2faDisable" type="button" style="width:100%;padding:12px;border-radius:var(--r-sm);background:rgba(220,60,60,.06);border:1px solid rgba(220,60,60,.22);color:var(--red);font-size:13px;cursor:pointer;font-family:var(--body);transition:background .2s">Disable two-factor authentication</button>`,

        'Login history': (function(){
          const icoMap = {
            laptop:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
            phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
            tablet:'<rect x="3" y="2" width="18" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>'
          };
          const sessions = [
            {dev:'Chrome · macOS',  icon:'laptop', loc:'New York, NY',  time:'Today · 9:01 AM',    cur:true},
            {dev:'Safari · iPhone', icon:'phone',  loc:'New York, NY',  time:'Today · 6:48 AM',    cur:false},
            {dev:'Chrome · macOS',  icon:'laptop', loc:'New York, NY',  time:'Yesterday · 7:12 PM',cur:false},
            {dev:'Safari · iPad',   icon:'tablet', loc:'Greenwich, CT', time:'May 16 · 2:30 PM',   cur:false},
            {dev:'Chrome · Windows',icon:'laptop', loc:'New York, NY',  time:'May 14 · 10:05 AM',  cur:false},
          ];
          const rows = sessions.map(function(l,i){
            const border  = l.cur ? 'rgba(201,168,106,.25)' : 'var(--line)';
            const stroke  = l.cur ? 'var(--gold)' : 'var(--ink-faint)';
            const badge   = l.cur ? '<span style="font-family:var(--mono);font-size:9px;color:var(--gold);background:rgba(201,168,106,.12);border:1px solid rgba(201,168,106,.25);padding:1px 7px;border-radius:99px">Current session</span>' : '';
            const signOut = !l.cur ? '<button type="button" class="sec-revoke-btn" data-row="loginRow'+i+'" data-dev="'+l.dev+'" style="padding:5px 12px;border-radius:99px;font-size:11px;font-family:var(--mono);cursor:pointer;background:rgba(220,60,60,.08);border:1px solid rgba(220,60,60,.25);color:var(--red);white-space:nowrap;flex-shrink:0;transition:all .2s">Sign out</button>' : '';
            return '<div id="loginRow'+i+'" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:rgba(255,255,255,.03);border:1px solid '+border+';border-radius:var(--r-sm);transition:all .3s">'
              + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="'+stroke+'" stroke-width="1.6" style="flex-shrink:0">'+icoMap[l.icon]+'</svg>'
              + '<div style="flex:1;min-width:0">'
              +   '<div style="font-size:12px;color:var(--ink);display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+l.dev+badge+'</div>'
              +   '<div style="font-size:11px;color:var(--ink-faint);margin-top:2px">'+l.loc+' · '+l.time+'</div>'
              + '</div>'
              + signOut
              + '</div>';
          }).join('');
          return '<div style="font-family:var(--mono);font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint);margin:0 2px 10px">Active sessions</div>'
            + '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px">'+rows+'</div>'
            + '<button id="secSignOutAll" type="button" style="width:100%;padding:12px;border-radius:var(--r-sm);background:rgba(220,60,60,.08);border:1px solid rgba(220,60,60,.25);color:var(--red);font-size:13px;cursor:pointer;font-family:var(--body);margin-bottom:10px">Sign out all other devices</button>'
            + '<button class="btn-primary" id="profileSaveDetails" type="button">Done</button>';
        })(),
      };
      document.getElementById('cardCtrlTitle').textContent = sec;
      document.getElementById('cardCtrlSub').textContent = 'Security & password · ' + sec;
      cardCtrlBody.innerHTML = secViews[sec] || `<p style="color:var(--ink-dim);font-size:13px">${sec} coming soon.</p>`;
      return;
    }

    const reportOpt = btn.closest('[data-report]');
    if (reportOpt) {
      const reason = reportOpt.dataset.report;
      cardCtrlBody.innerHTML = `
        <div style="text-align:center;padding:32px 20px">
          <div class="cg-success-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h3 style="font-family:var(--display);font-size:18px;font-weight:300;margin-bottom:8px">Report received</h3>
          <p style="font-size:13px;color:var(--ink-dim);line-height:1.6;margin-bottom:0">Your card ending in <strong>8821</strong> has been blocked.<br>A replacement card will be issued within 2–3 business days.<br><br>Reason: <em>${reason}</em></p>
          <button class="btn-primary" id="reportDoneBtn" style="margin-top:24px">Done</button>
        </div>`;
      document.getElementById('cardFreezeLbl').textContent = 'Blocked';
      document.getElementById('cardFreezeBtn').style.color = 'var(--red)';
      document.getElementById('cardCredit2').style.filter = 'grayscale(1) brightness(0.5)';
      toast('Card blocked — replacement card ordered', 'info');
    }
  }
});

// DOB number inputs: clamp values + auto-advance DD→MM→YYYY
cardCtrlBody.addEventListener('input', function(e) {
  const t = e.target;
  if (t.id === 'prefDobD') {
    if (t.value.length >= 2) { t.value = Math.min(31, Math.max(1, +t.value)); const m = document.getElementById('prefDobM'); if (m) m.focus(); }
  } else if (t.id === 'prefDobM') {
    if (t.value.length >= 2) { t.value = Math.min(12, Math.max(1, +t.value)); const y = document.getElementById('prefDobY'); if (y) y.focus(); }
  } else if (t.id === 'prefDobY') {
    if (t.value.length >= 4) t.value = Math.min(2099, Math.max(1900, +t.value));
  }
});

// date format live preview
cardCtrlBody.addEventListener('change', function(e) {
  if (e.target.id === 'prefDateFmt') {
    const fmt = e.target.value;
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    let preview;
    if (fmt === 'DD/MM/YYYY')      preview = d + ' / ' + m + ' / ' + y;
    else if (fmt === 'YYYY-MM-DD') preview = y + ' — ' + m + ' — ' + d;
    else                           preview = m + ' / ' + d + ' / ' + y;
    const el = document.getElementById('prefDatePreviewVal');
    if (el) el.textContent = preview;
  }
});

// notification toggle visual update + DB save
cardCtrlBody.addEventListener('change', function(e) {
  const toggle = e.target.closest('.notif-toggle');
  if (!toggle) return;
  const checked = toggle.checked;
  const lbl = toggle.closest('label');
  if (lbl) {
    const spans = lbl.querySelectorAll('span');
    if (spans.length >= 2) {
      spans[0].style.background = checked ? 'var(--gold)' : 'rgba(255,255,255,.1)';
      spans[1].style.left = checked ? '19px' : '3px';
    }
  }
  // auto-save notification state to DB
  const keys    = ['Transaction alerts','Large transaction','Statement ready','Portfolio alerts','Marketing & offers'];
  const toggles = cardCtrlBody.querySelectorAll('.notif-toggle');
  const notifs  = {};
  toggles.forEach((t, i) => { if (i < keys.length) notifs[keys[i]] = t.checked; });
  MeridianDB.set('notifications', notifs);
  dbPing();
});

// ---- FREEZE ----
document.getElementById('cardFreezeBtn').addEventListener('click', () => {
  if (cardFrozen) {
    openCardCtrl('Unfreeze Card', 'Resume all card transactions', `
      <div style="text-align:center;padding:16px 0 24px">
        <div style="font-size:48px;margin-bottom:12px">🔓</div>
        <p style="font-size:13px;color:var(--ink-dim);line-height:1.6;margin-bottom:20px">Your Sovereign card ending in <strong>8821</strong> is currently frozen. Unfreeze it to resume all purchases and payments.</p>
        <button class="btn-primary" id="unfreezeConfirm">Unfreeze card now</button>
        <button id="unfreezeCancelBtn" style="width:100%;margin-top:8px;padding:12px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:13px;cursor:pointer;font-family:var(--body)">Cancel</button>
      </div>`);
  } else {
    openCardCtrl('Freeze Card', 'Temporarily block all transactions', `
      <div style="text-align:center;padding:16px 0 24px">
        <div style="font-size:48px;margin-bottom:12px">🔒</div>
        <p style="font-size:13px;color:var(--ink-dim);line-height:1.6;margin-bottom:20px">Freezing will instantly block all new purchases, withdrawals, and payments on your Sovereign card ending in <strong>8821</strong>. Recurring payments will still process.</p>
        <button class="btn-primary" id="freezeConfirm" style="background:linear-gradient(180deg,#e8a0a0,#c06060);box-shadow:none">Freeze card</button>
        <button id="freezeCancelBtn" style="width:100%;margin-top:8px;padding:12px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:13px;cursor:pointer;font-family:var(--body)">Cancel</button>
      </div>`);
  }
});

// ---- LIMITS ----
document.getElementById('cardLimitsBtn').addEventListener('click', () => {
  openCardCtrl('Spend Limits', 'Adjust your card spending controls', `
    <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-md);padding:16px;margin-bottom:16px">
      <div style="font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:12px">Current limits</div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span style="color:var(--ink-dim)">Monthly limit</span><span style="font-family:var(--mono)" id="curMonthlyLbl">$${(+(document.getElementById('cardLimitDisplay').textContent.replace(/,/g,''))).toLocaleString()}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px"><span style="color:var(--ink-dim)">Daily limit</span><span style="font-family:var(--mono)">$10,000</span></div>
      <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--ink-dim)">Single transaction</span><span style="font-family:var(--mono)">$5,000</span></div>
    </div>
    <div class="cg-field"><div class="cg-label">New monthly limit (USD)</div>
      <input class="cg-input" type="number" id="limitMonthly" placeholder="e.g. 50000" min="1000" style="-moz-appearance:textfield"/></div>
    <div class="cg-field"><div class="cg-label">New daily limit (USD)</div>
      <input class="cg-input" type="number" id="limitDaily" placeholder="e.g. 10000" min="100" style="-moz-appearance:textfield"/></div>
    <div class="cg-field"><div class="cg-label">Block merchant categories</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
        ${['Gambling','Adult content','Crypto exchanges','Cash advances'].map(c=>`
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--ink-dim);cursor:pointer">
            <input type="checkbox" style="accent-color:var(--gold)"/> ${c}
          </label>`).join('')}
      </div>
    </div>
    <button class="btn-primary" id="limitSaveBtn" type="button">Save limits</button>`);
});

// ---- VIRTUAL CARD ----
document.getElementById('cardVirtualBtn').addEventListener('click', () => {
  _vCardNum = '4929 ' + Math.floor(1000+Math.random()*9000) + ' ' + Math.floor(1000+Math.random()*9000) + ' ' + Math.floor(1000+Math.random()*9000);
  const vCvv = Math.floor(100+Math.random()*900);
  openCardCtrl('Virtual Card', 'One-time use for online purchases', `
    <div style="background:linear-gradient(135deg,#141009,#0d0c08,#1a1812);border:1px solid rgba(201,168,106,.2);border-radius:16px;padding:22px;margin-bottom:20px;box-shadow:0 20px 40px -15px rgba(0,0,0,.6)">
      <div style="font-family:var(--display);font-size:13px;color:var(--gold-soft);margin-bottom:16px">Meridian · Virtual</div>
      <div style="font-family:var(--mono);font-size:16px;letter-spacing:.12em;color:var(--ink);margin-bottom:20px">${_vCardNum}</div>
      <div style="display:flex;gap:24px">
        <div><div style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-faint);margin-bottom:2px">Valid until</div><div style="font-family:var(--mono);font-size:12px;color:var(--ink)">Today only</div></div>
        <div><div style="font-size:9px;text-transform:uppercase;letter-spacing:.1em;color:var(--ink-faint);margin-bottom:2px">CVV</div><div style="font-family:var(--mono);font-size:12px;color:var(--ink)">${vCvv}</div></div>
        <div style="margin-left:auto;font-size:14px;font-weight:bold;color:var(--ink-dim);align-self:flex-end">VISA</div>
      </div>
    </div>
    <p style="font-size:12px;color:var(--ink-dim);line-height:1.6;margin-bottom:16px">Valid for a single online transaction today only. Your physical card details stay private.</p>
    <button class="btn-primary" id="vCardCopy" type="button">Copy card number</button>
    <button id="vCardClose" type="button" style="width:100%;margin-top:8px;padding:12px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:13px;cursor:pointer;font-family:var(--body)">Close</button>`);
});

// ---- REPORT LOST / STOLEN ----
document.getElementById('cardReportBtn').addEventListener('click', () => {
  openCardCtrl('Report Card Issue', 'Lost, stolen, or fraudulent activity', `
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
      ${[
        {icon:'🔍', label:'Card lost',              sub:'I cannot locate my card'},
        {icon:'🚨', label:'Card stolen',            sub:'My card was taken without consent'},
        {icon:'⚠️', label:'Fraudulent transaction', sub:'I see charges I did not make'},
        {icon:'💳', label:'Card damaged',            sub:'My card is physically damaged'},
      ].map(o=>`
        <div class="cg-advisor-opt" data-report="${o.label}" style="gap:12px;cursor:pointer">
          <span style="font-size:20px">${o.icon}</span>
          <div class="cg-advisor-opt-body"><div class="n">${o.label}</div><div class="a">${o.sub}</div></div>
        </div>`).join('')}
    </div>`);
});

/* ================================================
   TRANSFERS PAGE
   ================================================ */
const ntOverlay = document.getElementById('ntOverlay');
const ntBody    = document.getElementById('ntBody');

const savedRecipients = [
  { name:'Eliana Voss',      bank:'Chase ···· 4821', avatar:'EV' },
  { name:'Julien Renard',    bank:'BNP ···· 3310',   avatar:'JR' },
  { name:'Marcus Holt',      bank:'Wells ···· 6612',  avatar:'MH' },
  { name:'Sloane Kim',       bank:'Citi ···· 9901',   avatar:'SK' },
];

function openNewTransfer(prefill) {
  document.getElementById('ntTitle').textContent = 'New Transfer';
  document.getElementById('ntSub').textContent   = 'Send money instantly';

  ntBody.innerHTML = `
    <div class="cg-field">
      <div class="cg-label">Recipient</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px" id="ntRecipPills">
        ${savedRecipients.map(r=>`
          <div class="nt-recip-pill" data-name="${r.name}" data-bank="${r.bank}" style="display:flex;align-items:center;gap:7px;padding:6px 12px 6px 8px;background:rgba(255,255,255,.04);border:1px solid var(--line-strong);border-radius:99px;cursor:pointer;transition:border-color .2s,background .2s">
            <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,rgba(201,168,106,.3),rgba(201,168,106,.08));display:grid;place-items:center;font-size:9px;font-family:var(--mono);color:var(--gold);flex-shrink:0">${r.avatar}</div>
            <span style="font-size:12px;color:var(--ink)">${r.name}</span>
          </div>`).join('')}
      </div>
      <input class="cg-input" id="ntRecipName" placeholder="Or enter name / account number" value="${prefill||''}"/>
    </div>
    <div class="cg-field">
      <div class="cg-label">Bank / Account</div>
      <input class="cg-input" id="ntRecipBank" placeholder="Bank name or account number"/>
    </div>
    <div class="cg-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="cg-field">
        <div class="cg-label">Amount (USD)</div>
        <input class="cg-input" type="number" id="ntAmount" placeholder="0.00" min="0.01" step="0.01"/>
      </div>
      <div class="cg-field">
        <div class="cg-label">Transfer type</div>
        <select class="cg-select" id="ntType">
          <option value="instant">Instant</option>
          <option value="standard">Standard (1–2 days)</option>
          <option value="wire">Wire transfer</option>
          <option value="scheduled">Schedule for later</option>
        </select>
      </div>
    </div>
    <div class="cg-field" id="ntScheduleField" style="display:none">
      <div class="cg-label">Schedule date</div>
      <input class="cg-input" type="date" id="ntScheduleDate"/>
    </div>
    <div class="cg-field">
      <div class="cg-label">Note (optional)</div>
      <input class="cg-input" id="ntNote" placeholder="What's this for?"/>
    </div>
    <button class="btn-primary" id="ntReviewBtn">Review transfer</button>`;

  // recipient pill click
  ntBody.querySelectorAll('.nt-recip-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      ntBody.querySelectorAll('.nt-recip-pill').forEach(p => {
        p.style.borderColor = ''; p.style.background = '';
      });
      pill.style.borderColor = 'var(--gold-deep)';
      pill.style.background  = 'rgba(201,168,106,.1)';
      document.getElementById('ntRecipName').value = pill.dataset.name;
      document.getElementById('ntRecipBank').value = pill.dataset.bank;
    });
  });

  // show schedule date when "Schedule" selected
  document.getElementById('ntType').addEventListener('change', e => {
    document.getElementById('ntScheduleField').style.display =
      e.target.value === 'scheduled' ? 'block' : 'none';
  });

  // review button
  document.getElementById('ntReviewBtn').addEventListener('click', () => {
    const name   = document.getElementById('ntRecipName').value.trim();
    const bank   = document.getElementById('ntRecipBank').value.trim();
    const amount = parseFloat(document.getElementById('ntAmount').value);
    const type   = document.getElementById('ntType');
    const note   = document.getElementById('ntNote').value.trim();
    const schedDate = document.getElementById('ntScheduleDate').value;

    if (!name)        { toast('Enter recipient name', 'error'); return; }
    if (!amount || amount <= 0) { toast('Enter a valid amount', 'error'); return; }

    const typeLabel = type.options[type.selectedIndex].text;
    const feeLabel  = type.value === 'wire' ? '$25.00' : type.value === 'instant' ? '$0.00' : '$0.00';
    const etaLabel  = type.value === 'instant' ? 'Instantly' : type.value === 'standard' ? '1–2 business days' : type.value === 'wire' ? 'Same day' : schedDate ? new Date(schedDate).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : 'Scheduled date';
    const avatarStr = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

    ntBody.innerHTML = `
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-md);padding:18px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--line)">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,rgba(201,168,106,.3),rgba(201,168,106,.08));display:grid;place-items:center;font-family:var(--mono);font-size:12px;color:var(--gold);flex-shrink:0">${avatarStr}</div>
          <div>
            <div style="font-size:14px;color:var(--ink)">${name}</div>
            <div style="font-size:11px;color:var(--ink-dim);margin-top:2px">${bank || 'Account on file'}</div>
          </div>
          <div style="margin-left:auto;font-family:var(--mono);font-size:22px;color:var(--ink)">$${amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span style="color:var(--ink-dim)">Type</span><span style="color:var(--ink)">${typeLabel}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--ink-dim)">Fee</span><span style="color:var(--ink)">${feeLabel}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:var(--ink-dim)">ETA</span><span style="color:var(--ink)">${etaLabel}</span></div>
          ${note ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--ink-dim)">Note</span><span style="color:var(--ink)">${note}</span></div>` : ''}
        </div>
      </div>
      <button class="btn-primary" id="ntConfirmBtn">Confirm &amp; send</button>
      <button id="ntBackBtn" style="width:100%;margin-top:8px;padding:12px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:13px;cursor:pointer">Edit</button>`;

    document.getElementById('ntBackBtn').addEventListener('click', () => openNewTransfer(name));

    document.getElementById('ntConfirmBtn').addEventListener('click', () => {
      ntBody.innerHTML = `
        <div style="text-align:center;padding:40px 20px">
          <div class="cg-success-icon" style="width:64px;height:64px;border-radius:50%;margin:0 auto 16px;background:linear-gradient(135deg,rgba(201,168,106,.2),rgba(201,168,106,.06));border:1px solid rgba(201,168,106,.3);display:grid;place-items:center;animation:successPop .4s cubic-bezier(.2,.8,.2,1)">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
          </div>
          <h3 style="font-family:var(--display);font-size:20px;font-weight:300;margin-bottom:8px">Transfer sent!</h3>
          <p style="font-size:13px;color:var(--ink-dim);line-height:1.6">
            <strong>$${amount.toLocaleString(undefined,{minimumFractionDigits:2})}</strong> to <strong>${name}</strong><br>
            ${etaLabel === 'Instantly' ? 'Money has been sent.' : 'Expected: ' + etaLabel}
          </p>
          <button class="btn-primary" id="ntDoneBtn" style="margin-top:24px">Done</button>
        </div>`;
      document.getElementById('ntDoneBtn').addEventListener('click', closeNtDrawer);
      // save transfer to DB
      MeridianDB.push('transfers', { to:name, bank:bank, amount:amount, type:type.value, note:note, ref:'TXN-2026-'+Math.floor(80000+Math.random()*19999), date:new Date().toISOString() });
      dbPing();
      toast('Transfer of $'+amount.toLocaleString()+' sent to '+name, 'success');
    });
  });

  ntOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeNtDrawer() {
  ntOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('ntClose').addEventListener('click', closeNtDrawer);
document.getElementById('ntHandle').addEventListener('click', closeNtDrawer);
ntOverlay.addEventListener('click', e => { if (e.target === ntOverlay) closeNtDrawer(); });

document.getElementById('newTransferBtn').addEventListener('click', () => openNewTransfer(''));

// transfer list row clicks
document.querySelectorAll('#transferList [data-tx]').forEach(row => {
  row.addEventListener('click', () => openTxDrawer(row.dataset.tx));
});

// transfer filter pills
document.querySelectorAll('#transferFilters .act-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#transferFilters .act-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.tf;
    document.querySelectorAll('#transferList [data-tf]').forEach(row => {
      row.style.display = (f === 'all' || row.dataset.tf === f) ? '' : 'none';
    });
  });
});

/* ================================================
   ANALYTICS PAGE
   ================================================ */
const analyticsData = {
  may: {
    spent:'$12,847', spentD:'↓ 8.2% under budget',
    avg:'$428',      avgD:'vs $465 last month',
    largest:'$2,840',largestD:'Aman New York',
    tx:'47',         txD:'this month',
    trend:[9200,10400,11800,10900,12100,12847],
    months:['Dec','Jan','Feb','Mar','Apr','May'],
    cats:[
      { name:'Dining',        amt:'$3,210', pct:78, color:'#c9a86a', txs:[{n:'Le Bernardin',a:'−$487'},{n:'Nobu New York',a:'−$380'},{n:'Other dining',a:'−$2,343'}] },
      { name:'Travel',        amt:'$2,580', pct:62, color:'#7dd3a0', txs:[{n:'Aman New York',a:'−$2,840'},{n:'Taxi & rideshare',a:'−$240'}] },
      { name:'Shopping',      amt:'$1,890', pct:45, color:'#9aa0ab', txs:[{n:'Hermès Madison',a:'−$1,920'}] },
      { name:'Hotel',         amt:'$1,560', pct:38, color:'#6b8aab', txs:[{n:'Hotel deposits',a:'−$1,560'}] },
      { name:'Subscriptions', amt:'$1,140', pct:28, color:'#b8a0d8', txs:[{n:'Apple iCloud+',a:'−$9.99'},{n:'Equinox',a:'−$280'},{n:'Other',a:'−$850'}] },
      { name:'Transport',     amt:'$840',   pct:20, color:'#d4a8a8', txs:[{n:'Uber',a:'−$420'},{n:'Private car',a:'−$420'}] },
      { name:'Other',         amt:'$627',   pct:15, color:'#8aabb8', txs:[{n:'Miscellaneous',a:'−$627'}] },
    ]
  },
  apr: {
    spent:'$13,940', spentD:'↑ 3.1% over budget',
    avg:'$465',      avgD:'vs $428 this month',
    largest:'$3,100',largestD:'Emirates Business',
    tx:'52',         txD:'last month',
    trend:[8800,9600,10200,11100,11900,13940],
    months:['Nov','Dec','Jan','Feb','Mar','Apr'],
    cats:[
      { name:'Travel',        amt:'$3,100', pct:82, color:'#7dd3a0', txs:[{n:'Emirates Business',a:'−$3,100'}] },
      { name:'Dining',        amt:'$2,880', pct:72, color:'#c9a86a', txs:[{n:'Zuma London',a:'−$640'},{n:'Other dining',a:'−$2,240'}] },
      { name:'Shopping',      amt:'$2,100', pct:52, color:'#9aa0ab', txs:[{n:'Gucci Milan',a:'−$2,100'}] },
      { name:'Subscriptions', amt:'$1,200', pct:30, color:'#b8a0d8', txs:[{n:'Netflix, Spotify',a:'−$40'},{n:'Equinox',a:'−$280'},{n:'Other',a:'−$880'}] },
      { name:'Hotel',         amt:'$1,380', pct:34, color:'#6b8aab', txs:[{n:'Four Seasons Paris',a:'−$1,380'}] },
      { name:'Other',         amt:'$3,280', pct:40, color:'#8aabb8', txs:[{n:'Other expenses',a:'−$3,280'}] },
    ]
  },
  q1: {
    spent:'$38,210', spentD:'3-month total',
    avg:'$424',      avgD:'per day average',
    largest:'$6,400',largestD:'Tokyo charter flight',
    tx:'142',        txD:'last 3 months',
    trend:[9200,10400,11800,10900,12100,12847],
    months:['Feb','Mar','Apr','May (p)'],
    cats:[
      { name:'Travel',        amt:'$11,200',pct:88, color:'#7dd3a0', txs:[{n:'Tokyo charter',a:'−$6,400'},{n:'Other travel',a:'−$4,800'}] },
      { name:'Dining',        amt:'$9,100', pct:72, color:'#c9a86a', txs:[{n:'Multiple restaurants',a:'−$9,100'}] },
      { name:'Shopping',      amt:'$6,800', pct:54, color:'#9aa0ab', txs:[{n:'Hermès, Gucci, etc.',a:'−$6,800'}] },
      { name:'Hotel',         amt:'$5,200', pct:41, color:'#6b8aab', txs:[{n:'Hotel stays',a:'−$5,200'}] },
      { name:'Subscriptions', amt:'$3,420', pct:27, color:'#b8a0d8', txs:[{n:'All subs',a:'−$3,420'}] },
      { name:'Other',         amt:'$2,490', pct:20, color:'#8aabb8', txs:[{n:'Miscellaneous',a:'−$2,490'}] },
    ]
  },
  year: {
    spent:'$142,300',spentD:'Jan – May 2026',
    avg:'$391',      avgD:'per day average',
    largest:'$18,000',largestD:'Private jet charter',
    tx:'394',        txD:'this year',
    trend:[21000,24500,28000,26500,29800,30200,32000,0,0,0,0,0],
    months:['Jan','Feb','Mar','Apr','May','Jun'],
    cats:[
      { name:'Travel',        amt:'$48,200',pct:85, color:'#7dd3a0', txs:[{n:'Flights & hotels',a:'−$48,200'}] },
      { name:'Dining',        amt:'$32,100',pct:68, color:'#c9a86a', txs:[{n:'Restaurants',a:'−$32,100'}] },
      { name:'Shopping',      amt:'$26,400',pct:55, color:'#9aa0ab', txs:[{n:'Retail & luxury',a:'−$26,400'}] },
      { name:'Investments',   amt:'$18,000',pct:45, color:'#c9a86a', txs:[{n:'Additional positions',a:'−$18,000'}] },
      { name:'Hotel',         amt:'$10,200',pct:32, color:'#6b8aab', txs:[{n:'Hotels & resorts',a:'−$10,200'}] },
      { name:'Subscriptions', amt:'$5,600', pct:18, color:'#b8a0d8', txs:[{n:'All subscriptions',a:'−$5,600'}] },
      { name:'Other',         amt:'$1,800', pct:10, color:'#8aabb8', txs:[{n:'Miscellaneous',a:'−$1,800'}] },
    ]
  }
};

let activePeriod = 'may';

function renderAnalytics(period) {
  activePeriod = period;
  const d = analyticsData[period];

  // stats
  document.getElementById('aStatSpent').textContent    = d.spent;
  document.getElementById('aStatSpentD').textContent   = d.spentD;
  document.getElementById('aStatAvg').textContent      = d.avg;
  document.getElementById('aStatAvgD').textContent     = d.avgD;
  document.getElementById('aStatLargest').textContent  = d.largest;
  document.getElementById('aStatLargestD').textContent = d.largestD;
  document.getElementById('aStatTx').textContent       = d.tx;
  document.getElementById('aStatTxD').textContent      = d.txD;

  // trend chart
  const trendBars = d.trend.filter(v => v > 0);
  const months    = d.months;
  const maxV      = Math.max(...trendBars);
  const W = 360, H = 100, pad = 4, barW = Math.floor((W - pad * 2) / trendBars.length) - 4;
  const svg = document.getElementById('trendChart');
  svg.innerHTML = trendBars.map((v, i) => {
    const barH = Math.max(4, ((v / maxV) * (H - 24)));
    const x    = pad + i * ((W - pad * 2) / trendBars.length) + 2;
    const y    = H - barH - 4;
    return `<rect class="trend-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${barH.toFixed(1)}" rx="3"
      data-val="${v}" data-month="${months[i] || ''}"/>`;
  }).join('');

  // bar click → tooltip
  svg.querySelectorAll('.trend-bar').forEach(bar => {
    bar.addEventListener('click', () => {
      svg.querySelectorAll('.trend-bar').forEach(b => b.classList.remove('active'));
      bar.classList.add('active');
      const val   = parseInt(bar.dataset.val).toLocaleString();
      const month = bar.dataset.month;
      toast(month + ' — $' + val + ' spent', 'info');
    });
  });

  // labels
  const labelEl = document.getElementById('trendLabels');
  labelEl.innerHTML = months.slice(0, trendBars.length).map(m => `<span>${m}</span>`).join('');

  // category breakdown
  const catsEl = document.getElementById('analyticsCats');
  catsEl.innerHTML = d.cats.map((cat, i) => `
    <div class="an-cat" data-catidx="${i}">
      <div class="an-cat-hd">
        <div class="an-cat-dot" style="background:${cat.color}"></div>
        <div class="an-cat-name">${cat.name}</div>
        <div class="an-cat-pct">${cat.pct}%</div>
        <div class="an-cat-amt">${cat.amt}</div>
        <svg class="an-cat-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left:8px;flex-shrink:0"><path d="M9 18l6-6-6-6"/></svg>
      </div>
      <div class="an-cat-bar-wrap">
        <div class="an-cat-bar-fill" style="background:${cat.color}" data-w="${cat.pct}"></div>
      </div>
      <div class="an-cat-txlist">
        ${cat.txs.map(tx => `<div class="an-cat-tx"><span class="an-cat-tx-name">${tx.n}</span><span class="an-cat-tx-amt">${tx.a}</span></div>`).join('')}
      </div>
    </div>`).join('');

  // animate bars after paint
  requestAnimationFrame(() => {
    catsEl.querySelectorAll('.an-cat-bar-fill').forEach(bar => {
      setTimeout(() => { bar.style.width = bar.dataset.w + '%'; }, 80);
    });
  });

  // category click → expand
  catsEl.querySelectorAll('.an-cat').forEach(row => {
    row.addEventListener('click', () => {
      const isOpen = row.classList.contains('open');
      catsEl.querySelectorAll('.an-cat').forEach(r => r.classList.remove('open'));
      if (!isOpen) row.classList.add('open');
    });
  });
}

// period buttons
document.querySelectorAll('#analyticsperiods .act-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#analyticsperiods .act-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAnalytics(btn.dataset.period);
  });
});

// render on load
renderAnalytics('may');

// re-render when navigating to analytics page so bars animate
const origNavigateTo = window.navigateTo;
window.navigateTo = function(page) {
  origNavigateTo(page);
  if (page === 'analytics') setTimeout(() => renderAnalytics(activePeriod), 50);
};

/* ================================================
   SAVINGS GOAL DRAWER
   ================================================ */
const sgOverlay = document.getElementById('sgOverlay');
const sgBody    = document.getElementById('sgBody');

const sgGoals = [
  { id:0, name:"Kyoto · Autumn '26",   current:10800, target:15000, monthly:500,  pct:72, offset:29.9 },
  { id:1, name:"Steinway Grand Piano",  current:36000, target:90000, monthly:2000, pct:40, offset:64.1 },
  { id:2, name:"Emergency Reserve",     current:45500, target:50000, monthly:0,    pct:91, offset:9.6  },
  { id:3, name:"Paris Trip '25",        current:12000, target:12000, monthly:0,    pct:100,offset:0, completed:true },
];

function fmtMoney(n){ return '$' + n.toLocaleString(); }

function getETA(goal){
  if (goal.completed) return 'Completed';
  const remaining = goal.target - goal.current;
  if (remaining <= 0) return 'Completed';
  if (!goal.monthly) return 'No auto-save set';
  const months = Math.ceil(remaining / goal.monthly);
  const date = new Date(); date.setMonth(date.getMonth() + months);
  return date.toLocaleDateString('en-US',{month:'long',year:'numeric'});
}

const SG_CIRC = 106.8;

function openGoalDrawer(goalId) {
  const g = sgGoals[goalId];
  document.getElementById('sgTitle').textContent = g.name;
  document.getElementById('sgSub').textContent   = fmtMoney(g.current) + ' of ' + fmtMoney(g.target);

  const circumference = SG_CIRC;
  const ringOffset    = g.offset;
  const etaStr        = getETA(g);
  const remaining     = g.target - g.current;

  sgBody.innerHTML = `
    <div style="text-align:center;padding:24px 0 16px">
      <svg width="120" height="120" viewBox="0 0 40 40" style="transform:rotate(-90deg)">
        <circle class="bg" cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="3"/>
        <circle cx="20" cy="20" r="17" fill="none"
          stroke="${g.completed ? 'var(--green)' : 'var(--gold)'}" stroke-width="3"
          stroke-linecap="round" stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference}" id="sgRing"
          style="transition:stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)"/>
      </svg>
      <div style="font-family:var(--mono);font-size:28px;color:${g.completed ? 'var(--green)' : 'var(--gold)'};margin-top:-4px">${g.pct}%</div>
      <div style="font-size:12px;color:var(--ink-dim);margin-top:2px">${g.completed ? 'Goal reached!' : 'funded'}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px">Saved</div>
        <div style="font-family:var(--mono);font-size:16px;color:var(--ink)">${fmtMoney(g.current)}</div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px">Target</div>
        <div style="font-family:var(--mono);font-size:16px;color:var(--ink)">${fmtMoney(g.target)}</div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px">Monthly</div>
        <div style="font-family:var(--mono);font-size:16px;color:var(--ink)">${g.monthly ? fmtMoney(g.monthly) : '—'}</div>
      </div>
      <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-sm);padding:12px">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:4px">ETA</div>
        <div style="font-size:12px;color:var(--ink);line-height:1.3;padding-top:2px">${etaStr}</div>
      </div>
    </div>
    ${g.completed ? `
      <div style="text-align:center;padding:8px 0 16px;color:var(--ink-dim);font-size:13px">This goal has been completed.</div>
      <button class="btn-primary" id="sgCloseBtn">Close</button>
    ` : `
      <button class="btn-primary" id="sgAddMoneyBtn">Add money</button>
      <div id="sgAddMoneyForm" style="display:none;margin-top:12px">
        <div class="cg-label" style="margin-bottom:6px">Amount to add</div>
        <div style="display:flex;gap:8px">
          <input class="cg-input" type="number" id="sgAddAmt" placeholder="e.g. 500" min="1" style="flex:1"/>
          <button id="sgAddConfirm" style="padding:10px 16px;border-radius:var(--r-sm);background:linear-gradient(180deg,#e6cf9c,#c9a86a);border:none;color:#1a1408;font-weight:600;font-size:13px;cursor:pointer">Add</button>
        </div>
      </div>
      <button id="sgAdjustBtn" style="width:100%;margin-top:10px;padding:12px;border-radius:var(--r-sm);background:transparent;border:1px solid var(--line-strong);color:var(--ink-dim);font-size:13px;cursor:pointer;transition:border-color .2s">Adjust auto-save</button>
      <div id="sgAdjustForm" style="display:none;margin-top:12px">
        <div class="cg-label" style="margin-bottom:6px">New monthly amount</div>
        <div style="display:flex;gap:8px">
          <input class="cg-input" type="number" id="sgAdjustAmt" placeholder="${g.monthly || 0}" min="0" style="flex:1"/>
          <button id="sgAdjustConfirm" style="padding:10px 16px;border-radius:var(--r-sm);background:linear-gradient(180deg,#e6cf9c,#c9a86a);border:none;color:#1a1408;font-weight:600;font-size:13px;cursor:pointer">Save</button>
        </div>
      </div>
    `}`;

  // animate ring
  setTimeout(() => {
    const ring = document.getElementById('sgRing');
    if (ring) ring.style.strokeDashoffset = ringOffset;
  }, 100);

  // close btn (completed goals)
  const closeBtn = document.getElementById('sgCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeSgDrawer);

  // add money toggle
  const addBtn  = document.getElementById('sgAddMoneyBtn');
  const addForm = document.getElementById('sgAddMoneyForm');
  if (addBtn) addBtn.addEventListener('click', () => {
    addForm.style.display = addForm.style.display === 'none' ? 'block' : 'none';
  });

  // add money confirm
  const addConfirm = document.getElementById('sgAddConfirm');
  if (addConfirm) addConfirm.addEventListener('click', () => {
    const amt = parseFloat(document.getElementById('sgAddAmt').value);
    if (!amt || amt <= 0) { toast('Enter a valid amount', 'error'); return; }
    g.current = Math.min(g.current + amt, g.target);
    g.pct = Math.round((g.current / g.target) * 100);
    g.offset = circumference * (1 - g.pct / 100);
    if (g.current >= g.target) { g.completed = true; g.offset = 0; g.pct = 100; }
    closeSgDrawer();
    setTimeout(() => openGoalDrawer(goalId), 250);
    toast(fmtMoney(amt) + ' added to ' + g.name, 'success');
  });

  // adjust auto-save toggle
  const adjBtn  = document.getElementById('sgAdjustBtn');
  const adjForm = document.getElementById('sgAdjustForm');
  if (adjBtn) adjBtn.addEventListener('click', () => {
    adjForm.style.display = adjForm.style.display === 'none' ? 'block' : 'none';
  });

  // adjust confirm
  const adjConfirm = document.getElementById('sgAdjustConfirm');
  if (adjConfirm) adjConfirm.addEventListener('click', () => {
    const amt = parseFloat(document.getElementById('sgAdjustAmt').value);
    if (isNaN(amt) || amt < 0) { toast('Enter a valid amount', 'error'); return; }
    g.monthly = amt;
    closeSgDrawer();
    toast('Auto-save updated to ' + fmtMoney(amt) + '/mo', 'success');
  });

  sgOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSgDrawer() {
  sgOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('sgClose').addEventListener('click', closeSgDrawer);
document.getElementById('sgHandle').addEventListener('click', closeSgDrawer);
sgOverlay.addEventListener('click', e => { if (e.target === sgOverlay) closeSgDrawer(); });

// goal row clicks on savings page
document.querySelectorAll('#savingsGoalsList [data-goal]').forEach(row => {
  row.addEventListener('click', () => openGoalDrawer(+row.dataset.goal));
});

// new goal button
document.getElementById('newGoalBtn').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('sgTitle').textContent = 'New Savings Goal';
  document.getElementById('sgSub').textContent   = 'Set a target and start saving';
  sgBody.innerHTML = `
    <div class="cg-field"><div class="cg-label">Goal name</div>
      <input class="cg-input" id="ngName" placeholder="e.g. Ferrari, Villa, World Tour"/></div>
    <div class="cg-row">
      <div class="cg-field"><div class="cg-label">Target amount</div>
        <input class="cg-input" type="number" id="ngTarget" placeholder="50000" min="1"/></div>
      <div class="cg-field"><div class="cg-label">Already saved</div>
        <input class="cg-input" type="number" id="ngCurrent" placeholder="0" min="0"/></div>
    </div>
    <div class="cg-field"><div class="cg-label">Monthly auto-save</div>
      <input class="cg-input" type="number" id="ngMonthly" placeholder="500" min="0"/></div>
    <div class="cg-field"><div class="cg-label">Target date (optional)</div>
      <input class="cg-input" type="date" id="ngDate"/></div>
    <button class="btn-primary" id="ngCreate">Create goal</button>`;
  document.getElementById('ngCreate').addEventListener('click', () => {
    const name    = document.getElementById('ngName').value.trim();
    const target  = parseFloat(document.getElementById('ngTarget').value) || 0;
    const current = parseFloat(document.getElementById('ngCurrent').value) || 0;
    const monthly = parseFloat(document.getElementById('ngMonthly').value) || 0;
    if (!name)        { toast('Enter a goal name', 'error'); return; }
    if (target <= 0)  { toast('Enter a target amount', 'error'); return; }
    if (current > target) { toast('Saved amount cannot exceed target', 'error'); return; }
    const pct    = Math.round((current / target) * 100);
    const offset = SG_CIRC * (1 - pct / 100);
    const newId  = sgGoals.length;
    sgGoals.push({ id:newId, name, current, target, monthly, pct, offset });
    // add row to page list
    const list = document.getElementById('savingsGoalsList');
    const div  = document.createElement('div');
    div.className = 'goal'; div.style.cursor = 'pointer'; div.dataset.goal = newId;
    div.innerHTML = `<div class="goal-ring"><svg viewBox="0 0 40 40"><circle class="bg" cx="20" cy="20" r="17"/><circle class="fg" cx="20" cy="20" r="17" stroke-dasharray="106.8" stroke-dashoffset="${offset}"/></svg><div class="pct">${pct}%</div></div><div class="goal-info"><div class="n">${name}</div><div class="a">${fmtMoney(current)} of ${fmtMoney(target)}${monthly ? ' · Auto-save ' + fmtMoney(monthly) + '/mo' : ''}</div></div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="color:var(--ink-faint);flex-shrink:0"><path d="M9 18l6-6-6-6"/></svg>`;
    div.addEventListener('click', () => openGoalDrawer(newId));
    list.appendChild(div);
    closeSgDrawer();
    toast('"' + name + '" goal created!', 'success');
  });
  sgOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
});

/* ================================================
   CONCIERGE DRAWER
   ================================================ */
const cgOverlay = document.getElementById('cgOverlay');
const cgDrawer  = document.getElementById('cgDrawer');
const cgBody    = document.getElementById('cgBody');

const cgServices = {
  travel: {
    title: 'Private Travel Booking',
    sub:   'Flights, hotels, yachts & private jets',
    icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9l9-6 9 6v11H3z"/></svg>',
    form: `
      <div class="cg-field"><div class="cg-label">Destination</div>
        <input class="cg-input" placeholder="e.g. Tokyo, Maldives, Amalfi Coast"/></div>
      <div class="cg-row">
        <div class="cg-field"><div class="cg-label">Departure date</div>
          <input class="cg-input" type="date"/></div>
        <div class="cg-field"><div class="cg-label">Return date</div>
          <input class="cg-input" type="date"/></div>
      </div>
      <div class="cg-row">
        <div class="cg-field"><div class="cg-label">Guests</div>
          <input class="cg-input" type="number" min="1" value="1" placeholder="1"/></div>
        <div class="cg-field"><div class="cg-label">Class</div>
          <select class="cg-select">
            <option>Private Jet</option><option>First Class</option>
            <option>Business</option><option>Yacht Charter</option>
          </select></div>
      </div>
      <div class="cg-field"><div class="cg-label">Special requirements</div>
        <textarea class="cg-textarea" placeholder="Dietary, accessibility, hotel preferences…"></textarea></div>`,
    success: 'Your travel request has been sent to Nathaniel. Expect a call within 15 minutes.'
  },
  dining: {
    title: 'Restaurant Reservation',
    sub:   'Priority access to top-tier restaurants worldwide',
    icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 2l1 4h10l1-4M5 6h14l-1 14H6L5 6z"/></svg>',
    form: `
      <div class="cg-field"><div class="cg-label">Restaurant preference</div>
        <input class="cg-input" placeholder="e.g. Nobu, Eleven Madison, or let us choose"/></div>
      <div class="cg-row">
        <div class="cg-field"><div class="cg-label">Date</div>
          <input class="cg-input" type="date"/></div>
        <div class="cg-field"><div class="cg-label">Time</div>
          <input class="cg-input" type="time" value="19:30"/></div>
      </div>
      <div class="cg-row">
        <div class="cg-field"><div class="cg-label">Party size</div>
          <input class="cg-input" type="number" min="1" value="2"/></div>
        <div class="cg-field"><div class="cg-label">Occasion</div>
          <select class="cg-select">
            <option>Business dinner</option><option>Anniversary</option>
            <option>Birthday</option><option>Casual</option>
          </select></div>
      </div>
      <div class="cg-field"><div class="cg-label">Dietary requirements</div>
        <textarea class="cg-textarea" placeholder="Allergies, dietary restrictions, wine pairing…"></textarea></div>`,
    success: 'Your reservation request has been received. We will confirm your table within 10 minutes.'
  },
  events: {
    title: 'Events & Tickets',
    sub:   'Opera, sports, exclusive galas & private viewings',
    icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    form: `
      <div class="cg-field"><div class="cg-label">Event type</div>
        <select class="cg-select">
          <option>Opera / Theatre</option><option>Sports (VIP box)</option>
          <option>Art / Auction</option><option>Private Gala</option><option>Formula 1</option>
        </select></div>
      <div class="cg-row">
        <div class="cg-field"><div class="cg-label">Preferred date</div>
          <input class="cg-input" type="date"/></div>
        <div class="cg-field"><div class="cg-label">No. of tickets</div>
          <input class="cg-input" type="number" min="1" value="2"/></div>
      </div>
      <div class="cg-field"><div class="cg-label">Budget range</div>
        <select class="cg-select">
          <option>Up to $5,000</option><option>$5,000 – $20,000</option>
          <option>$20,000 – $50,000</option><option>No limit</option>
        </select></div>
      <div class="cg-field"><div class="cg-label">Additional notes</div>
        <textarea class="cg-textarea" placeholder="Specific events, cities, artists…"></textarea></div>`,
    success: 'Your event request has been logged. Our team will present curated options within the hour.'
  },
  advisor: {
    title: 'Speak to Nathaniel Cross',
    sub:   'Your dedicated private banking advisor',
    icon:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.08 4.18 2 2 0 015.09 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>',
    form: `
      <div class="cg-advisor-opts">
        <div class="cg-advisor-opt" data-advisor-action="call">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.08 4.18 2 2 0 015.09 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
          <div class="cg-advisor-opt-body"><div class="n">Call now</div><div class="a">Connect immediately · Available now</div></div>
        </div>
        <div class="cg-advisor-opt" data-advisor-action="schedule">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <div class="cg-advisor-opt-body"><div class="n">Schedule a call</div><div class="a">Pick a time that suits you</div></div>
        </div>
        <div class="cg-advisor-opt" data-advisor-action="message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          <div class="cg-advisor-opt-body"><div class="n">Send a message</div><div class="a">Reply within 2 minutes</div></div>
        </div>
      </div>`,
    success: 'Connecting you to Nathaniel Cross. Please keep your phone nearby.'
  }
};

function getNathanielReply(msg) {
  const t = msg.toLowerCase();
  if (/hello|hi\b|hey|good (morning|afternoon|evening)|assalam|salam/.test(t))
    return "Good to hear from you, Aiden. How can I assist you today?";
  if (/balance|account|how much|funds|available/.test(t))
    return "Your primary account balance is $284,500. You also have $38,200 in your savings portfolio. Would you like a full breakdown?";
  if (/transfer|send money|wire|payment|pay/.test(t))
    return "I can arrange a transfer on your behalf. Please share the recipient details, amount, and your preferred value date and I'll have it processed within the hour.";
  if (/invest|portfolio|stock|share|equity|bond|market|fund/.test(t))
    return "Your portfolio is currently up 12.4% YTD. Three positions are flagged for review — Meridian Growth ETF, Apex Capital Bond, and Veridian Tech. Shall I schedule a portfolio call?";
  if (/card|credit card|debit|block|freeze|lost|stolen|limit/.test(t))
    return "I can assist with your card immediately. If your card is lost or stolen I can freeze it right now — just confirm. For limit changes or new card requests, I'll process that within 24 hours.";
  if (/travel|flight|jet|yacht|hotel|book|trip|holiday|vacation/.test(t))
    return "Excellent choice, Aiden. I can arrange private jet charters, first-class bookings, and five-star accommodations worldwide. Please share your destination and travel dates.";
  if (/restaurant|dining|dinner|lunch|reservation|table|eat/.test(t))
    return "I have priority access to over 200 top-tier restaurants globally. Tell me your preferred city, date, party size and occasion — I'll secure the best available table.";
  if (/event|ticket|opera|concert|sports|gala|show|match/.test(t))
    return "I can source VIP tickets and private boxes for most major events worldwide. What type of event are you interested in, and when would you like to attend?";
  if (/statement|report|document|download|pdf/.test(t))
    return "Your April statement is ready. I can email it to your registered address or make it available for download in the Activity section. Which would you prefer?";
  if (/savings|goal|kyoto|target|saving/.test(t))
    return "Your Kyoto goal is 72% funded — you're right on track for autumn 2026. Your current savings rate suggests you'll reach the $15,000 target by August. Should I increase your monthly auto-transfer?";
  if (/loan|mortgage|credit|borrow|finance/.test(t))
    return "As a Meridian Private client you have access to preferential lending rates. For mortgages we can offer from 3.2% fixed. Shall I prepare a personalised illustration?";
  if (/fee|charge|cost|price/.test(t))
    return "Your annual private banking fee is $4,800, billed quarterly. This covers unlimited concierge requests, priority advisory, and zero foreign transaction charges. Any specific charge you'd like me to review?";
  if (/tax|wealth|estate|planning|inheritance/.test(t))
    return "Our wealth planning team specialises in tax-efficient strategies and estate planning. I can arrange a dedicated session with our senior wealth planner — would next week suit you?";
  if (/help|what can|service|support|assist/.test(t))
    return "I'm here for you 24/7, Aiden. I can help with transfers, investments, travel, dining, event bookings, statements, card services, loans, and wealth planning. What do you need today?";
  if (/thank|thanks|appreciate|great|perfect|excellent/.test(t))
    return "My pleasure, Aiden. Is there anything else I can assist you with today?";
  if (/bye|goodbye|that's all|nothing else|no thanks/.test(t))
    return "Of course, Aiden. I'm always available whenever you need me. Have a wonderful day.";
  // fallback — varied generic responses
  const fallbacks = [
    "Understood, Aiden. Leave it with me — I'll have an update for you shortly.",
    "Noted. I'll look into that personally and get back to you within the next few minutes.",
    "Absolutely. I'm on it right now and will follow up as soon as it's arranged.",
    "Of course. I'll coordinate with the relevant team and ensure this is handled with priority.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

window.openConcierge = function(key) {
  const svc = cgServices[key];
  if (!svc) return;
  document.getElementById('cgIcon').innerHTML  = svc.icon;
  document.getElementById('cgTitle').textContent = svc.title;
  document.getElementById('cgSub').textContent   = svc.sub;
  cgBody.innerHTML = svc.form + `
    <button class="btn-primary" id="cgSubmitBtn" style="margin-top:8px">Submit request</button>`;

  document.getElementById('cgSubmitBtn').addEventListener('click', () => {
    cgBody.innerHTML = `
      <div class="cg-success">
        <div class="cg-success-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
        <h3>Request sent</h3>
        <p>${svc.success}</p>
        <button class="btn-primary" id="cgDoneBtn" style="margin-top:24px">Done</button>
      </div>`;
    document.getElementById('cgDoneBtn').addEventListener('click', closeConcierge);
  });

  // advisor action buttons
  cgBody.querySelectorAll('.cg-advisor-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      const action = opt.dataset.advisorAction;

      if (action === 'call') {
        // calling screen with live timer
        cgBody.innerHTML = `
          <div style="text-align:center;padding:32px 20px">
            <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,rgba(201,168,106,.2),rgba(201,168,106,.06));border:1px solid rgba(201,168,106,.3);display:grid;place-items:center;margin:0 auto 16px;animation:successPop .4s cubic-bezier(.2,.8,.2,1)">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.6"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.08 4.18 2 2 0 015.09 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            </div>
            <div style="font-family:var(--display);font-size:20px;font-weight:300;margin-bottom:4px">Nathaniel Cross</div>
            <div style="font-size:12px;color:var(--ink-dim);margin-bottom:6px">Private Banking Advisor</div>
            <div style="font-family:var(--mono);font-size:13px;color:var(--gold);margin-bottom:28px" id="callTimer">Connecting…</div>
            <div style="display:flex;justify-content:center;gap:20px">
              <div style="text-align:center">
                <button style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid var(--line-strong);cursor:pointer;display:grid;place-items:center" onclick="this.style.background='rgba(201,168,106,.15)';showToast('Microphone muted','info')">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
                </button>
                <div style="font-size:10px;color:var(--ink-dim);margin-top:6px">Mute</div>
              </div>
              <div style="text-align:center">
                <button style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.06);border:1px solid var(--line-strong);cursor:pointer;display:grid;place-items:center" onclick="this.style.background='rgba(201,168,106,.15)';showToast('Speaker on','info')">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
                </button>
                <div style="font-size:10px;color:var(--ink-dim);margin-top:6px">Speaker</div>
              </div>
              <div style="text-align:center">
                <button id="endCallBtn" style="width:52px;height:52px;border-radius:50%;background:#c0392b;border:none;cursor:pointer;display:grid;place-items:center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6"><path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.08 4.18 2 2 0 015.09 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                </button>
                <div style="font-size:10px;color:var(--ink-dim);margin-top:6px">End</div>
              </div>
            </div>
          </div>`;
        // live call timer
        let secs = 0;
        const timerEl = document.getElementById('callTimer');
        const timerInterval = setInterval(() => {
          secs++;
          if (secs === 3) timerEl.textContent = 'Connected · 00:00';
          else if (secs > 3) {
            const s = secs - 3;
            timerEl.textContent = 'Connected · ' + String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
          }
        }, 1000);
        document.getElementById('endCallBtn').addEventListener('click', () => {
          clearInterval(timerInterval);
          closeConcierge();
          toast('Call ended', 'info');
        });

      } else if (action === 'schedule') {
        cgBody.innerHTML = `
          <div class="cg-field"><div class="cg-label">Preferred date</div>
            <input class="cg-input" type="date" id="schedDate"/></div>
          <div class="cg-field"><div class="cg-label">Preferred time</div>
            <select class="cg-select" id="schedTime">
              <option>9:00 AM</option><option>10:00 AM</option><option>11:00 AM</option>
              <option>12:00 PM</option><option>2:00 PM</option><option>3:00 PM</option>
              <option>4:00 PM</option><option>5:00 PM</option>
            </select></div>
          <div class="cg-field"><div class="cg-label">Topic</div>
            <select class="cg-select" id="schedTopic">
              <option>Portfolio review</option><option>Investment opportunities</option>
              <option>Estate planning</option><option>Tax strategy</option><option>Other</option>
            </select></div>
          <div class="cg-field"><div class="cg-label">Notes (optional)</div>
            <textarea class="cg-textarea" placeholder="Anything you'd like Nathaniel to prepare…"></textarea></div>
          <button class="btn-primary" id="schedSubmit">Confirm schedule</button>`;
        document.getElementById('schedSubmit').addEventListener('click', () => {
          const d = document.getElementById('schedDate').value;
          const t = document.getElementById('schedTime').value;
          const topic = document.getElementById('schedTopic').value;
          const dateStr = d ? new Date(d).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'}) : 'your chosen date';
          cgBody.innerHTML = `
            <div class="cg-success">
              <div class="cg-success-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></div>
              <h3>Call scheduled</h3>
              <p>Nathaniel will call you on <strong>${dateStr}</strong> at <strong>${t}</strong>.<br>Topic: ${topic}</p>
              <button class="btn-primary" id="cgDoneBtn" style="margin-top:24px">Done</button>
            </div>`;
          document.getElementById('cgDoneBtn').addEventListener('click', closeConcierge);
        });

      } else if (action === 'message') {
        cgBody.innerHTML = `
          <div style="background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:var(--r-md);padding:14px;margin-bottom:16px;max-height:180px;overflow-y:auto" id="msgThread">
            <div style="display:flex;gap:10px;margin-bottom:12px">
              <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,rgba(201,168,106,.3),rgba(201,168,106,.1));display:grid;place-items:center;flex-shrink:0;font-size:10px;color:var(--gold);font-family:var(--mono)">NC</div>
              <div style="background:rgba(255,255,255,.05);border-radius:0 10px 10px 10px;padding:8px 12px;font-size:12px;color:var(--ink);line-height:1.4">Good afternoon, Aiden. How can I assist you today?
                <div style="font-size:10px;color:var(--ink-faint);margin-top:4px">Now</div>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:flex-end">
            <textarea class="cg-textarea" id="msgInput" placeholder="Type your message…" style="min-height:48px;flex:1;margin:0"></textarea>
            <button id="msgSend" style="height:48px;width:48px;border-radius:var(--r-sm);background:linear-gradient(180deg,#e6cf9c,#c9a86a);border:none;cursor:pointer;display:grid;place-items:center;flex-shrink:0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1408" stroke-width="2.2"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
            </button>
          </div>`;
        document.getElementById('msgSend').addEventListener('click', () => {
          const input = document.getElementById('msgInput');
          const text = input.value.trim();
          if (!text) return;
          const thread = document.getElementById('msgThread');
          thread.innerHTML += `
            <div style="display:flex;gap:10px;justify-content:flex-end;margin-bottom:12px">
              <div style="background:linear-gradient(135deg,rgba(201,168,106,.18),rgba(201,168,106,.08));border:1px solid rgba(201,168,106,.2);border-radius:10px 0 10px 10px;padding:8px 12px;font-size:12px;color:var(--ink);line-height:1.4;max-width:75%">${text}
                <div style="font-size:10px;color:var(--ink-faint);margin-top:4px">Now</div>
              </div>
            </div>`;
          input.value = '';
          thread.scrollTop = thread.scrollHeight;
          setTimeout(() => {
            const reply = getNathanielReply(text);
            thread.innerHTML += `
              <div style="display:flex;gap:10px;margin-bottom:12px">
                <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,rgba(201,168,106,.3),rgba(201,168,106,.1));display:grid;place-items:center;flex-shrink:0;font-size:10px;color:var(--gold);font-family:var(--mono)">NC</div>
                <div style="background:rgba(255,255,255,.05);border-radius:0 10px 10px 10px;padding:8px 12px;font-size:12px;color:var(--ink);line-height:1.4">${reply}
                  <div style="font-size:10px;color:var(--ink-faint);margin-top:4px">Just now</div>
                </div>
              </div>`;
            thread.scrollTop = thread.scrollHeight;
          }, 1200);
        });
        document.getElementById('msgInput').addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); document.getElementById('msgSend').click(); }
        });
      }
    });
  });

  cgOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
};

function closeConcierge() {
  cgOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('cgClose').addEventListener('click', closeConcierge);
document.getElementById('cgHandle').addEventListener('click', closeConcierge);
cgOverlay.addEventListener('click', e => { if (e.target === cgOverlay) closeConcierge(); });

}); // end window.onload