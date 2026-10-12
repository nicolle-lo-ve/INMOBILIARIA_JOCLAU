/* ============================================================================
   UI — primitivas de interfaz (toasts, menús, diálogos, popovers, selects,
   count-up, skeletons, estados vacíos, tooltips). Sin dependencias.
   ============================================================================ */
(function () {
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const num = (n, dec) => (dec ? FMT.one(n) : FMT.number(n));

  /* --------------------------------- Toast -------------------------------- */
  function toast(msg, opts) {
    opts = opts || {};
    const type = opts.type || 'info';
    const map = { ok: 'check-circle', err: 'x-circle', warn: 'alert-triangle', info: 'info' };
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.setAttribute('role', 'status');
    el.innerHTML =
      '<span class="toast-ico">' + Icon(map[type] || 'info', { size: 18, animate: type === 'ok' ? 'draw' : 'pop' }) + '</span>' +
      '<span class="toast-msg">' + esc(msg) + '</span>';
    if (opts.actionLabel && typeof opts.onAction === 'function') {
      const b = document.createElement('button');
      b.className = 'toast-action';
      b.textContent = opts.actionLabel;
      b.onclick = () => { opts.onAction(); dismiss(el); };
      el.appendChild(b);
    }
    const x = document.createElement('button');
    x.className = 'toast-x';
    x.setAttribute('aria-label', 'Cerrar aviso');
    x.innerHTML = Icon('x', { size: 14 });
    x.onclick = () => dismiss(el);
    el.appendChild(x);

    document.getElementById('toasts').appendChild(el);
    const life = opts.duration || (opts.actionLabel ? 7000 : 4200);
    const timer = setTimeout(() => dismiss(el), life);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    function dismiss(node) {
      node.classList.add('toast-out');
      setTimeout(() => node.remove(), 260);
    }
    return el;
  }

  /* --------------------------- Popover / menús ---------------------------- */
  function closePopover() {
    const p = document.getElementById('popover');
    if (p) p.remove();
  }

  function popover(anchor, html, opts) {
    opts = opts || {};
    closePopover();
    const r = anchor.getBoundingClientRect();
    const el = document.createElement('div');
    el.id = 'popover';
    el.className = 'popover' + (opts.cls ? ' ' + opts.cls : '');
    el.setAttribute('role', 'menu');
    el.innerHTML = html;
    document.body.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = Math.min(r.left, window.innerWidth - w - 10);
    left = Math.max(10, left);
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 10) top = Math.max(10, r.top - h - 6);
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    return el;
  }

  /* Menú de acciones: items = [{icon,label,value,danger,active,sep}] */
  function menu(anchor, items, onPick, opts) {
    const html = items.map((it) => {
      if (it.sep) return '<div class="pop-sep"></div>';
      return '<button class="pop-item' + (it.active ? ' is-active' : '') + (it.danger ? ' is-danger' : '') +
        '" role="menuitem" data-value="' + esc(it.value == null ? it.label : it.value) + '">' +
        (it.icon ? '<span class="pop-ic">' + Icon(it.icon, { size: 17 }) + '</span>' : '<span class="pop-ic"></span>') +
        '<span class="pop-label">' + esc(it.label) + '</span>' +
        (it.hint ? '<span class="pop-hint">' + esc(it.hint) + '</span>' : '') +
        (it.active ? '<span class="pop-check">' + Icon('check', { size: 15 }) + '</span>' : '') +
        '</button>';
    }).join('');
    const el = popover(anchor, html, opts);
    el.querySelectorAll('.pop-item').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const v = b.dataset.value;
        closePopover();
        onPick && onPick(v, b);
      });
    });
    focusFirst(el);
    return el;
  }

  /* Select personalizado con el mismo look del menú */
  function select(anchor, options, currentValue, onPick, opts) {
    return menu(anchor, options.map((o) => ({
      icon: o.icon, label: o.label, value: o.value, active: o.value === currentValue
    })), onPick, opts);
  }

  function focusFirst(el) {
    const first = el.querySelector('.pop-item, button, [tabindex]');
    if (first) first.focus({ preventScroll: true });
  }

  /* --------------------------------- Modal -------------------------------- */
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

  function modal(html, opts) {
    opts = opts || {};
    const root = document.getElementById('modal-root');
    root.innerHTML =
      '<div class="modal-backdrop" data-modal-close>' +
      '<div class="modal' + (opts.cls ? ' ' + opts.cls : '') + '" role="dialog" aria-modal="true" data-modal-stop>' +
      html + '</div></div>';
    const box = root.querySelector('.modal');
    root.querySelector('[data-modal-close]').addEventListener('mousedown', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    const focusable = box.querySelector('[data-autofocus]') || box.querySelector('input,button,select,textarea');
    if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 30);
    return box;
  }

  function confirmDialog(o) {
    const box = modal(
      '<div class="modal-head"><h3>' + esc(o.title) + '</h3></div>' +
      '<div class="modal-body"><p class="modal-text">' + (o.html || esc(o.text || '')) + '</p></div>' +
      '<div class="modal-foot"><button class="btn ghost" data-cancel>Cancelar</button>' +
      '<button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-ok data-autofocus>' + esc(o.confirmLabel || 'Confirmar') + '</button></div>',
      { cls: 'modal-sm' }
    );
    box.querySelector('[data-cancel]').onclick = closeModal;
    box.querySelector('[data-ok]').onclick = () => { closeModal(); o.onConfirm && o.onConfirm(); };
  }

  /* ------------------------------- Count-up ------------------------------- */
  function countUp(el, to, opts) {
    opts = opts || {};
    const dec = opts.decimals || 0;
    const prefix = opts.prefix || '', suffix = opts.suffix || '';
    if (reduced() || opts.animate === false) { el.textContent = prefix + num(to, dec) + suffix; return; }
    const dur = opts.duration || 700;
    const t0 = performance.now();
    function step(t) {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + num(to * e, dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = prefix + num(to, dec) + suffix;
    }
    requestAnimationFrame(step);
  }

  /* Anima todos los [data-countup] dentro de root */
  function runCountUps(root) {
    (root || document).querySelectorAll('[data-countup]').forEach((el) => {
      const to = parseFloat(el.dataset.countup);
      if (isNaN(to)) return;
      countUp(el, to, {
        decimals: +el.dataset.decimals || 0,
        prefix: el.dataset.prefix || '',
        suffix: el.dataset.suffix || ''
      });
    });
  }

  /* ------------------------------- Estados -------------------------------- */
  function skeleton(rows) {
    rows = rows || 6;
    let r = '';
    for (let i = 0; i < rows; i++) r += '<div class="skel-row"><span class="skel skel-lg"></span><span class="skel skel-sm"></span></div>';
    return '<div class="skeleton">' + r + '</div>';
  }

  function emptyState(o) {
    o = o || {};
    return '<div class="empty">' +
      '<div class="empty-art">' + (o.art || Icon(o.icon || 'empty', { size: 44, cls: 'empty-ico', animate: 'float' })) + '</div>' +
      '<div class="empty-title">' + esc(o.title || 'Nada por aquí') + '</div>' +
      (o.text ? '<div class="empty-text">' + esc(o.text) + '</div>' : '') +
      (o.action ? '<div class="empty-action">' + o.action + '</div>' : '') +
      '</div>';
  }

  window.UI = {
    toast, popover, closePopover, menu, select, modal, closeModal, confirmDialog,
    countUp, runCountUps, skeleton, emptyState, focusFirst, reduced
  };
})();
