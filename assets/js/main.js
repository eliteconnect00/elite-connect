(function () {
  'use strict';
  var d = document, html = d.documentElement;
  var I = JSON.parse(d.getElementById('i18n').textContent);
  var root = html.getAttribute('data-root') || './';
  var lang = html.lang;

  /* ---------- mobile menu ---------- */
  var burger = d.querySelector('.burger'), mnav = d.getElementById('mnav'), hdr = d.querySelector('.hdr');
  function setMenu(open) {
    if (!mnav) return;
    html.style.setProperty('--hdr-h', hdr.getBoundingClientRect().height + 'px');
    mnav.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? I.menuClose : I.menu);
    html.classList.toggle('menu-open', open);
    updateWa();
    if (open) { var f = mnav.querySelector('a'); if (f) f.focus(); }
  }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(mnav.hidden); });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !mnav.hidden) { setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', function () { if (!mnav.hidden && getComputedStyle(burger).display === 'none') setMenu(false); });
  }

  /* ---------- floating WhatsApp: never cover forms / legal links / menu ---------- */
  var wa = d.querySelector('.wa-float'), avoid = new Set();
  function updateWa() { if (wa) wa.classList.toggle('is-hidden', avoid.size > 0 || html.classList.contains('menu-open')); }
  if (wa && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) avoid.add(e.target); else avoid.delete(e.target); });
      updateWa();
    }, { rootMargin: '0px 0px -10px 0px' });
    d.querySelectorAll('[data-wa-avoid]').forEach(function (el) { io.observe(el); });
  }

  /* ---------- contact: employer / candidate toggle ---------- */
  var tgs = d.querySelectorAll('[data-show]');
  function showPanel(id, focus) {
    tgs.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-show') === id ? 'true' : 'false'); });
    d.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.id !== id; });
    if (focus) { var h = d.getElementById(id).querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus(); } }
  }
  if (tgs.length) {
    tgs.forEach(function (b) { b.addEventListener('click', function () { showPanel(b.getAttribute('data-show')); history.replaceState(null, '', '#' + b.getAttribute('data-show')); }); });
    showPanel(location.hash === '#candidate' ? 'candidate' : 'employer');
    window.addEventListener('hashchange', function () { if (location.hash === '#candidate' || location.hash === '#employer') showPanel(location.hash.slice(1), true); });
  }

  /* ---------- forms ---------- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function errEl(input) { return d.getElementById(input.getAttribute('aria-describedby')); }
  function setErr(input, msg) {
    var e = errEl(input);
    if (e) e.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  function validate(scope) {
    var first = null;
    scope.querySelectorAll('[data-v]').forEach(function (inp) {
      var v = inp.type === 'checkbox' ? inp.checked : inp.value.trim(), msg = '';
      if (inp.required && !v) msg = inp.type === 'checkbox' ? I.err.consent : I.err.req;
      else if (inp.type === 'email' && v && !EMAIL.test(v)) msg = I.err.email;
      setErr(inp, msg);
      if (msg && !first) first = inp;
    });
    if (first) first.focus();
    return !first;
  }
  d.addEventListener('input', function (e) { var t = e.target; if (t.matches && t.matches('[data-v]') && t.getAttribute('aria-invalid')) setErr(t, ''); });
  d.addEventListener('change', function (e) { var t = e.target; if (t.matches && t.matches('[data-v]') && t.getAttribute('aria-invalid')) setErr(t, ''); });

  function payload(form) {
    var type = form.getAttribute('data-form'), data = {
      access_key: '52593bcd-7c0d-43f5-bf42-64c273fa0b5f',
      from_name: 'ELITE CONNECT GROUP website',
      form_type: type === 'emp' ? 'employer' : type === 'cand' ? 'candidate' : 'quick',
      language: lang.toUpperCase(),
      botcheck: false
    };
    var get = function (n) { var el = form.elements[n]; return el ? el.value.trim() : ''; };
    data.subject = type === 'emp' ? 'New staff request — ' + get('company')
      : type === 'cand' ? 'New candidate application — ' + get('name')
      : 'New quick request (homepage)';
    form.querySelectorAll('[data-k]').forEach(function (el) { data[el.getAttribute('data-k')] = el.value.trim() || '-'; });
    var reply = type === 'quick' ? get('contact') : get('email');
    if (reply.indexOf('@') > -1) data.replyto = reply;
    data['GDPR consent'] = form.elements.consent && form.elements.consent.checked ? 'Yes' : 'No';
    return data;
  }
  function done(form) {
    var box = form.closest('[data-formbox]'), ok = box.querySelector('.success');
    form.hidden = true; ok.hidden = false; ok.focus();
  }
  function send(form) {
    var btn = form.querySelector('[type=submit]'), errBox = form.querySelector('.send-err');
    if (form.elements.botcheck && form.elements.botcheck.checked) { done(form); return; }
    var label = btn.textContent;
    btn.disabled = true; btn.classList.add('is-loading'); btn.textContent = I.sending; errBox.hidden = true;
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload(form))
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.success) done(form); else throw new Error('fail');
    }).catch(function () {
      errBox.hidden = false;
    }).then(function () { btn.disabled = false; btn.classList.remove('is-loading'); btn.textContent = label; });
  }
  d.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.getAttribute('data-form') === 'cand' && step(form) < 3) { next(form); return; }
      if (validate(form)) send(form);
    });
  });
  d.querySelectorAll('[data-again]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = b.closest('[data-formbox]'), form = box.querySelector('form');
      form.reset(); form.hidden = false; box.querySelector('.success').hidden = true;
      if (form.getAttribute('data-form') === 'cand') go(form, 1);
      var f = form.querySelector('input:not([type=hidden]):not(.hp),select,textarea'); if (f) f.focus();
    });
  });

  /* candidate multi-step */
  function step(form) { return +form.getAttribute('data-step'); }
  function go(form, n) {
    form.setAttribute('data-step', n);
    form.querySelectorAll('fieldset[data-step]').forEach(function (f) { f.hidden = +f.getAttribute('data-step') !== n; });
    form.querySelectorAll('.stepper li').forEach(function (li, i) { li.classList.toggle('on', i < n); if (i === n - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
    var st = form.querySelector('.step-text'); if (st) st.textContent = I.stepText[n - 1];
    form.querySelector('[data-back]').hidden = n === 1;
    form.querySelector('[data-next]').hidden = n === 3;
    form.querySelector('[type=submit]').hidden = n !== 3;
  }
  function next(form) {
    var cur = form.querySelector('fieldset[data-step="' + step(form) + '"]');
    if (validate(cur)) { go(form, step(form) + 1); var f = form.querySelector('fieldset:not([hidden]) input:not([type=checkbox]),fieldset:not([hidden]) select'); (f || form.querySelector('fieldset:not([hidden]) input')).focus(); }
  }
  d.querySelectorAll('form[data-form=cand]').forEach(function (form) {
    go(form, 1);
    form.querySelector('[data-next]').addEventListener('click', function () { next(form); });
    form.querySelector('[data-back]').addEventListener('click', function () { go(form, step(form) - 1); var f = form.querySelector('fieldset:not([hidden]) input'); if (f) f.focus(); });
  });

  /* ---------- legal dialog ---------- */
  var dlg = d.getElementById('legal'), legal = null, trigger = null;
  function el(tag, txt) { var e = d.createElement(tag); if (txt != null) e.textContent = txt; return e; }
  function render(i) {
    var doc = legal.docs[i], body = dlg.querySelector('.lbody');
    dlg.querySelector('#legal-title').textContent = doc.title;
    body.textContent = '';
    doc.secs.forEach(function (s) {
      body.appendChild(el('h3', s.h));
      (s.ps || []).forEach(function (p) { body.appendChild(el('p', p)); });
      if (s.li && s.li.length) { var ul = el('ul'); s.li.forEach(function (t) { ul.appendChild(el('li', t)); }); body.appendChild(ul); }
      if (s.link) { var p = el('p'), a = el('a', 'www.dataprotection.ro'); a.href = 'https://www.dataprotection.ro'; a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a); body.appendChild(p); }
    });
    body.scrollTop = 0;
    dlg.querySelectorAll('.ltab').forEach(function (b, k) { b.setAttribute('aria-current', k === i ? 'true' : 'false'); });
  }
  function openLegal(i) {
    var show = function () { render(i); if (!dlg.open) dlg.showModal(); dlg.querySelector('.lclose').focus(); };
    if (legal) return show();
    fetch(root + 'assets/legal/' + lang + '.json').then(function (r) { return r.json(); }).then(function (j) { legal = j; show(); });
  }
  if (dlg) {
    d.querySelectorAll('[data-legal]').forEach(function (b) {
      b.addEventListener('click', function () { trigger = b; openLegal(+b.getAttribute('data-legal')); });
    });
    dlg.querySelectorAll('.ltab').forEach(function (b, k) { b.addEventListener('click', function () { render(k); }); });
    dlg.querySelector('.lclose').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { html.classList.remove('menu-open'); if (trigger) trigger.focus(); });
    dlg.addEventListener('cancel', function () { /* Esc closes natively */ });
    var obs = new MutationObserver(function () { html.classList.toggle('menu-open', dlg.open); });
    obs.observe(dlg, { attributes: true, attributeFilter: ['open'] });
  }
})();
