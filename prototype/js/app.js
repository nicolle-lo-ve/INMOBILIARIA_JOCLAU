/* ============================================================================
   CRM Inmobiliario — Prototipo v2 · lógica de interfaz
   ----------------------------------------------------------------------------
   Demuestra al cliente CÓMO se sentirá el sistema final: flujo, pantallas y
   reglas de negocio visibles. Sin build step, sin frameworks, sin dependencias.
   Fuente de verdad: docs/plan_accion_crm_inmobiliario.md (§4 UI/UX, §7 prototipo).
   ============================================================================ */
(function () {
  'use strict';

  const { users: USERS, settings, projects, advisors, discardReasons } = DB;

  /* ================================ CONSTANTES ============================= */
  const ORDER = ['NUEVO', 'CONTACTADO', 'VISITA_AGENDADA', 'NEGOCIACION', 'CALIFICADO', 'DESECHADO'];
  const OPEN_PHASES = ['NUEVO', 'CONTACTADO', 'VISITA_AGENDADA', 'NEGOCIACION'];

  const PHASES = {
    NUEVO:           { label: 'NUEVO',           icon: 'sparkles',     bg: '#EEE9FB', accent: '#5B3FC4' },
    CONTACTADO:      { label: 'CONTACTADO',      icon: 'phone-call',   bg: '#DFF3F3', accent: '#0F7E80' },
    VISITA_AGENDADA: { label: 'VISITA AGENDADA', icon: 'calendar',     bg: '#FDEBDD', accent: '#C46418' },
    NEGOCIACION:     { label: 'NEGOCIACIÓN',     icon: 'handshake',    bg: '#FBE4EE', accent: '#A83268' },
    CALIFICADO:      { label: 'CALIFICADO',      icon: 'check-circle', bg: '#E4F1E6', accent: '#2F7D4A' },
    DESECHADO:       { label: 'DESECHADO',       icon: 'x-circle',     bg: '#ECEEF0', accent: '#6B7278' }
  };

  const TEMPS = {
    CALIENTE: { label: 'Caliente', icon: 'flame',     fg: '#17692F', bg: '#DFF3E4',
                tip: 'Caliente: listo para avanzar, contáctalo hoy.' },
    TIBIO:    { label: 'Tibio',    icon: 'sun',       fg: '#7A5A00', bg: '#FFF4CC',
                tip: 'Tibio: interesado, necesita seguimiento esta semana.' },
    FRIO:     { label: 'Frío',     icon: 'snowflake', fg: '#2F5F8A', bg: '#E4EDF5',
                tip: 'Frío: aún no responde o no está listo. Nutre y retoma.' }
  };

  const ROLE_LABEL = {
    ASESOR: 'Asesor comercial', GERENTE: 'Gerencia',
    RECEPCION: 'Recepción / Marketing', SUPERADMIN: 'Superadministrador'
  };
  const ROLE_SUB = {
    ASESOR: 'Aline Reyes · pipeline y seguimiento',
    GERENTE: 'Tablero de control, equipo y SLA',
    RECEPCION: 'Alta de leads y carga masiva',
    SUPERADMIN: 'Usuarios, auditoría y parámetros'
  };

  const NAV = {
    ASESOR: [
      { section: 'Trabajo', items: [
        { route: 'panel',    label: 'Mi panel',    icon: 'dashboard' },
        { route: 'pipeline', label: 'Mi pipeline', icon: 'kanban', badge: 'overdue' }
      ] }
    ],
    GERENTE: [
      { section: 'Trabajo', items: [
        { route: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { route: 'leads',     label: 'Leads',     icon: 'list' },
        { route: 'team',      label: 'Equipo',    icon: 'users' }
      ] },
      { section: 'Operación', items: [
        { route: 'ingestion', label: 'Ingesta',   icon: 'inbox', badge: 'sla' },
        { route: 'reports',   label: 'Reportes',  icon: 'report' }
      ] },
      { section: 'Administración', items: [
        { route: 'audit', label: 'Auditoría', icon: 'shield' }
      ] }
    ],
    RECEPCION: [
      { section: 'Operación', items: [
        { route: 'ingestion', label: 'Ingesta de leads', icon: 'inbox' }
      ] }
    ],
    SUPERADMIN: [
      { section: 'Trabajo', items: [
        { route: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { route: 'leads',     label: 'Leads',     icon: 'list' },
        { route: 'team',      label: 'Equipo',    icon: 'users' }
      ] },
      { section: 'Operación', items: [
        { route: 'ingestion', label: 'Ingesta',  icon: 'inbox' },
        { route: 'audit',     label: 'Auditoría', icon: 'shield' }
      ] },
      { section: 'Administración', items: [
        { route: 'users',    label: 'Usuarios',      icon: 'user-cog' },
        { route: 'settings', label: 'Configuración', icon: 'settings' }
      ] }
    ]
  };

  const DEFAULT_ROUTE = { ASESOR: 'panel', GERENTE: 'dashboard', RECEPCION: 'ingestion', SUPERADMIN: 'dashboard' };
  const ROUTE_TITLE = {
    panel: 'Mi panel', pipeline: 'Mi pipeline', dashboard: 'Dashboard', leads: 'Leads',
    team: 'Equipo', ingestion: 'Ingesta de leads', reports: 'Reportes y exportaciones',
    audit: 'Auditoría', users: 'Usuarios', settings: 'Configuración'
  };

  /* ================================= ESTADO =============================== */
  const state = {
    user: null,
    route: 'login',
    leads: DB.leads.slice(),
    viewMode: 'kanban',
    colLimit: 30,
    desechadoOpen: false,
    drawerLeadId: null,
    drawerTab: 'resumen',
    flashId: null,
    rangeDays: 30,
    dashFilters: { asesor: '', project: '', source: '' },
    filters: { q: '', project: '', temperature: '', chip: 'todos' },
    globalFilters: { q: '', asesor: '', status: '', chip: '' },
    selected: new Set(),
    selectMode: false,
    notifs: [],
    audit: [],
    accounts: {
      'asesor@crm.test':    { locked: false },
      'gerente@crm.test':   { locked: false },
      'recepcion@crm.test': { locked: false },
      'admin@crm.test':     { locked: false },
      'jorge@crm.test':     { locked: true }
    },
    availability: {},
    rrCursor: 0,
    tourSeen: {},
    tourStep: 0,
    helpOpen: false,
    demoOpen: false,
    demoFlags: {},
    batches: [
      { file: 'leads_octubre.csv', by: 'Recepción', rows: 150, ok: 132, reentry: 16, bad: 2, status: 'ok' },
      { file: 'meta_ads_semana40.xlsx', by: 'Recepción', rows: 84, ok: 84, reentry: 0, bad: 0, status: 'ok' },
      { file: 'tiktok_lomas.csv', by: 'Recepción', rows: 37, ok: 35, reentry: 0, bad: 2, status: 'warn' }
    ],
    _lastRoute: null,
    _quick: null
  };
  advisors.forEach((a) => { state.availability[a.id] = a.isAvailable !== false; });

  const appEl = document.getElementById('app');
  const drawerRoot = document.getElementById('drawer-root');
  const modalRoot = document.getElementById('modal-root');
  let shellRole = null;

  /* ================================ HELPERS =============================== */
  const getLead = (id) => state.leads.find((l) => l.id === id);
  const advisor = (id) => advisors.find((a) => a.id === id);
  const digits = (p) => String(p || '').replace(/\D/g, '');
  const isOpen = (l) => OPEN_PHASES.includes(l.status);
  const SLA = () => settings.first_contact_sla_minutes;
  const isOverdue = (l) => l.status === 'NUEVO' && l.assignedMinAgo > SLA();
  const today = () => Date.now();

  function normalizePhone(raw) {
    let d = digits(raw);
    if (!d) return null;
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length > 9 && d.startsWith(settings.country_code.replace('+', ''))) d = d.slice(2);
    if (d.length !== 9 || !/^9\d{8}$/.test(d)) return null;
    return settings.country_code + ' ' + d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
  }
  const phoneKey = (p) => digits(p).slice(-9);

  function leadByPhone(p) {
    const k = phoneKey(p);
    return state.leads.find((l) => phoneKey(l.phone) === k);
  }

  function initialsOf(name) { return FMT.initials(name); }
  const AV_COLORS = ['#5B3FC4', '#0F7E80', '#C46418', '#A83268', '#2F7D4A', '#2F5F8A', '#8A5A00', '#6B7278'];
  function avatar(name, cls) {
    let h = 0; const s = name || '?';
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const c = AV_COLORS[h % AV_COLORS.length];
    return '<span class="avatar ' + (cls || '') + '" style="background:' + c + '">' + esc(initialsOf(name)) + '</span>';
  }

  function tempBadge(l, clickable) {
    const t = TEMPS[l.temperature];
    return '<span class="badge badge-temp ' + t.cls + '"' + (clickable ? ' data-action="temp-menu" data-id="' + l.id + '" role="button" tabindex="0"' : '') +
      ' data-tip="' + esc(t.tip) + '">' + Icon(t.icon, { size: 14 }) + ' ' + t.label + '</span>';
  }

  function phaseChip(status) {
    const p = PHASES[status];
    return '<span class="badge" style="background:' + p.bg + ';color:' + p.accent + '">' +
      Icon(p.icon, { size: 14 }) + ' ' + p.label + '</span>';
  }

  function sourceIcon(code) {
    const s = DB.sources.find((x) => x.code === code);
    return s ? s.iconKey : 'globe';
  }
  function sourceLabel(code) {
    const s = DB.sources.find((x) => x.code === code);
    return s ? s.label : '—';
  }

  /* ======================== NOTIFICACIONES Y AUDITORÍA ==================== */
  const NOTIF_ICON = { assigned: 'users-plus', reentry: 'refresh', sla: 'alert-triangle', manager: 'shield', ingestion: 'inbox', status: 'swap' };
  function notify(kind, text) {
    state.notifs.unshift({ id: 'n' + Date.now() + Math.random().toString(36).slice(2, 6), kind, text, at: Date.now(), read: false });
    if (state.notifs.length > 40) state.notifs.length = 40;
    pingBell();
  }
  function unreadCount() { return state.notifs.filter((n) => !n.read).length; }
  function pingBell() {
    const b = document.getElementById('bell-icon');
    if (b) { b.classList.remove('anim-bell'); void b.offsetWidth; b.classList.add('anim-bell'); }
  }

  function logAudit(action, entity, detail) {
    state.audit.unshift({
      at: Date.now(), actor: state.user ? state.user.name : 'Sistema',
      role: state.user ? state.user.role : '—', action, entity, detail
    });
    if (state.audit.length > 200) state.audit.length = 200;
  }

  /* Seed de auditoría (histórico simulado) */
  (function seedAudit() {
    const now = Date.now(), M = 60000;
    [
      [2, 'Aline Reyes', 'ASESOR', 'UPDATE', 'lead', 'Estado NUEVO → CONTACTADO'],
      [6, 'Sistema', '—', 'INSERT', 'lead', 'Alta de lead (Meta Ads) — asignado por Round-Robin'],
      [14, 'Gerente General', 'GERENTE', 'REASSIGN', 'lead', 'Reasignación manual a Marina Cordero'],
      [22, 'Aline Reyes', 'ASESOR', 'LOGIN_OK', 'session', 'Inicio de sesión'],
      [31, 'Sistema', '—', 'UPDATE', 'lead', 'Reingreso detectado · adscripción 30 d → mismo asesor'],
      [48, 'Recepción / Marketing', 'RECEPCION', 'EXPORT', 'report', 'Exportación CSV de leads sin atender'],
      [61, 'Sistema', '—', 'ACCOUNT_LOCKED', 'user', 'Bloqueo automático tras 5 intentos fallidos']
    ].forEach((r) => state.audit.push({ at: now - r[0] * M, actor: r[1], role: r[2], action: r[3], entity: r[4], detail: r[5] }));
    state.audit.reverse();
  })();

  /* =========================== ASIGNACIÓN / EQUIPO ======================== */
  function availableAdvisors() {
    return advisors.filter((a) => state.availability[a.id]);
  }
  function assignRoundRobin() {
    const pool = availableAdvisors();
    if (!pool.length) return advisors[0];
    const a = pool[state.rrCursor % pool.length];
    state.rrCursor++;
    return a;
  }
  function isAvailable(id) { return !!state.availability[id]; }

  /* ============================== ANALÍTICA ============================== */
  function filteredLeads(f) {
    const lim = state.rangeDays * 1440;
    return state.leads.filter((l) => {
      if (l.ingestedMinAgo > lim) return false;
      if (f.asesor && l.asesorName !== f.asesor) return false;
      if (f.project && l.project !== f.project) return false;
      if (f.source && l.source.code !== f.source) return false;
      return true;
    });
  }

  function analytics() {
    const s = filteredLeads(state.dashFilters);
    const total = s.length;
    const contacted = s.filter((l) => l.firstContactMin != null);
    const calificados = s.filter((l) => l.status === 'CALIFICADO');
    const sla = s.filter(isOverdue).length;
    const fc = contacted.map((l) => l.firstContactMin);
    const avgFc = fc.length ? Math.round(fc.reduce((a, b) => a + b, 0) / fc.length) : 0;

    const rank = { NUEVO: 0, CONTACTADO: 1, VISITA_AGENDADA: 2, NEGOCIACION: 3, CALIFICADO: 4, DESECHADO: -1 };
    const reached = (status) => s.filter((l) => rank[l.status] >= rank[status]).length;
    let prev = total;
    const funnel = ORDER.slice(0, 5).map((k, i) => {
      const cnt = reached(k);
      const step = i === 0 ? 100 : (prev ? (cnt / prev) * 100 : 0);
      prev = cnt;
      return { key: k, count: cnt, step };
    });

    const bySource = DB.sources.map((src) => {
      const items = s.filter((l) => l.source.code === src.code);
      const cal = items.filter((l) => l.status === 'CALIFICADO').length;
      return { code: src.code, label: src.label, icon: src.iconKey, count: items.length, conv: items.length ? (cal / items.length) * 100 : 0 };
    }).sort((a, b) => b.count - a.count);

    const byAdvisor = advisors.map((a) => {
      const items = s.filter((l) => l.asesorId === a.id);
      const contact = items.filter((l) => l.firstContactMin != null);
      const cal = items.filter((l) => l.status === 'CALIFICADO').length;
      const fcA = contact.length ? Math.round(contact.reduce((t, l) => t + l.firstContactMin, 0) / contact.length) : 0;
      return {
        id: a.id, name: a.name, assigned: items.length, contacted: contact.length, calificados: cal,
        conv: items.length ? (cal / items.length) * 100 : 0, firstContact: fcA,
        open: items.filter(isOpen).length, available: isAvailable(a.id)
      };
    }).sort((a, b) => b.conv - a.conv);

    const trend = [];
    for (let d = 13; d >= 0; d--) {
      trend.push(s.filter((l) => l.ingestedMinAgo >= d * 1440 && l.ingestedMinAgo < (d + 1) * 1440).length);
    }

    const openTemps = ['CALIENTE', 'TIBIO', 'FRIO'].map((t) => {
      const count = s.filter((l) => l.temperature === t && isOpen(l)).length;
      const prob = settings.temperature_probability[t];
      return { t, count, prob, expected: count * prob };
    });

    return {
      total, contacted: contacted.length, calificados: calificados.length, sla, avgFc, funnel,
      bySource, byAdvisor, trend, openTemps,
      conv: total ? (calificados.length / total) * 100 : 0,
      expectedTotal: Math.round(openTemps.reduce((a, b) => a + b.expected, 0))
    };
  }

  function teamStatsFor(advisorId) {
    const mine = state.leads.filter((l) => l.asesorId === advisorId);
    const contact = mine.filter((l) => l.firstContactMin != null);
    const cal = mine.filter((l) => l.status === 'CALIFICADO').length;
    const overdue = mine.filter(isOverdue);
    const visits = mine.filter((l) => l.status === 'VISITA_AGENDADA');
    const avgFc = contact.length ? Math.round(contact.reduce((t, l) => t + l.firstContactMin, 0) / contact.length) : 0;
    return {
      mine, open: mine.filter(isOpen).length, overdue, visits, cal,
      conv: mine.length ? (cal / mine.length) * 100 : 0, avgFc,
      hot: mine.filter((l) => l.temperature === 'CALIENTE').length,
      reentry: mine.filter((l) => l.reentry).length
    };
  }

  /* ================================= LOGIN =============================== */
  function artBuildings() {
    const blds = [[40, 120, 70, 180], [120, 60, 86, 240], [216, 150, 64, 150], [290, 100, 80, 200]];
    let svg = '<svg class="art-svg" viewBox="0 0 400 320" fill="none" aria-hidden="true">';
    svg += '<g class="art-bld" stroke="rgba(255,255,255,.28)" stroke-width="1.5">';
    blds.forEach(([x, y, w, h]) => { svg += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6"/>'; });
    svg += '</g>';
    blds.forEach(([x, y, w, h]) => {
      for (let wy = y + 18; wy < y + h - 16; wy += 26) {
        for (let wx = x + 12; wx < x + w - 14; wx += 24) {
          svg += '<rect class="art-window" x="' + wx + '" y="' + wy + '" width="12" height="9" rx="2" fill="#FFD9A0"/>';
        }
      }
    });
    svg += '</svg>';
    return svg;
  }

  function loginView() {
    const roleCards = Object.keys(ROLE_LABEL).map((r) => {
      const ic = { ASESOR: 'user', GERENTE: 'dashboard', RECEPCION: 'inbox', SUPERADMIN: 'user-cog' }[r];
      const icon = r === 'ASESOR' ? 'users' : ic;
      return '<button class="role-card" data-action="login-role" data-role="' + r + '">' +
        '<span class="rc-ic">' + Icon(icon, { size: 20 }) + '</span>' +
        '<span class="rc-body"><span class="rc-title">Entrar como ' + esc(ROLE_LABEL[r]) + '</span>' +
        '<span class="rc-sub">' + esc(ROLE_SUB[r]) + '</span></span>' +
        '<span class="rc-go">' + Icon('arrow-right', { size: 18 }) + '</span></button>';
    }).join('');

    return '<div class="login">' +
      '<div class="login-art">' +
        '<div class="login-brand"><span class="logo-chip">' + Icon('logo', { size: 18 }) + '</span> CRM Inmobiliario</div>' +
        artBuildings() +
        '<div class="login-copy"><h1>Todo el recorrido del lead, en un solo lugar.</h1>' +
        '<p>Capta, asigna y da seguimiento hasta la venta. Con reglas que se aplican solas: Round-Robin, adscripción de 30 días y SLA de primer contacto.</p></div>' +
      '</div>' +
      '<div class="login-form"><div class="login-inner">' +
        '<h2>Entrar al CRM</h2>' +
        '<p class="sub">Elige un perfil para recorrer el flujo de trabajo.</p>' +
        '<div class="role-cards">' + roleCards + '</div>' +
        '<div class="alt-sep">o accede con tu cuenta</div>' +
        '<div id="login-alert"></div>' +
        '<div class="field"><label for="login-email">Correo corporativo</label>' +
          '<div class="input-wrap">' + Icon('mail', { size: 17, cls: 'in-ic' }) +
          '<input id="login-email" class="input" type="email" value="asesor@crm.test" autocomplete="username"></div></div>' +
        '<div class="field"><label for="login-pass">Contraseña</label>' +
          '<div class="input-wrap">' + Icon('lock', { size: 17, cls: 'in-ic' }) +
          '<input id="login-pass" class="input" type="password" value="demo1234" autocomplete="current-password"></div></div>' +
        '<button class="btn block" data-action="login-submit">' + Icon('logout', { size: 17, cls: 'btn-ic' }) + ' Entrar con credenciales</button>' +
        '<p class="proto-note">Prototipo de demostración · datos simulados. Basado en <b>docs/plan_accion_crm_inmobiliario.md</b> §7. ' +
        'La cuenta <b>jorge@crm.test</b> está bloqueada a propósito para demostrar el desbloqueo.</p>' +
      '</div></div>' +
    '</div>';
  }

  /* ================================= SHELL =============================== */
  function shellTemplate() {
    return '<div class="app" id="app-shell">' +
      '<header class="topbar">' +
        '<button class="icon-btn side-toggle" data-action="toggle-side" aria-label="Menú">' + Icon('list', { size: 20 }) + '</button>' +
        '<div class="brand"><span class="logo-chip">' + Icon('logo', { size: 16 }) + '</span>' +
          '<span class="brand-text">CRM Inmobiliario</span><span class="proto-pill">Prototipo</span></div>' +
        '<button class="topbar-search" data-action="open-cmdk">' + Icon('search', { size: 17 }) +
          '<span>Buscar leads, proyectos o pantallas…</span><kbd>Ctrl K</kbd></button>' +
        '<div class="topbar-right">' +
          '<span class="live"><span class="dot"></span> En vivo</span>' +
          '<button class="icon-btn" data-action="help-menu" title="Ayuda" aria-label="Ayuda">' + Icon('help', { size: 20 }) + '</button>' +
          '<button class="icon-btn" data-action="notif-panel" title="Notificaciones" aria-label="Notificaciones">' +
            '<span id="bell-icon" style="display:grid;place-items:center">' + Icon('bell', { size: 20 }) + '</span>' +
            '<span class="bell-badge" id="bell-badge" hidden>0</span></button>' +
          '<button class="whoami" data-action="role-menu" aria-label="Menú de usuario">' +
            '<span id="topbar-avatar"></span><span class="who-name" id="topbar-name"></span>' + Icon('chevron-down', { size: 15 }) + '</button>' +
        '</div>' +
      '</header>' +
      '<div class="shell-body">' +
        '<aside class="sidebar" id="sidebar"></aside>' +
        '<main class="main"><div id="view" class="view"></div></main>' +
      '</div>' +
    '</div>';
  }

  function updateTopbar() {
    const av = document.getElementById('topbar-avatar');
    const nm = document.getElementById('topbar-name');
    if (av) av.outerHTML = avatar(state.user.name, 'av-sm');
    if (nm) nm.textContent = state.user.name.split(' ')[0];
    updateBell();
  }

  function updateBell() {
    const b = document.getElementById('bell-badge');
    if (!b) return;
    const n = unreadCount();
    b.textContent = n;
    b.hidden = n === 0;
  }

  function navBadge(kind) {
    if (kind === 'overdue') {
      const n = state.leads.filter((l) => l.asesorId === (state.user && state.user.id) && isOverdue(l)).length;
      return n ? { n, alert: true } : null;
    }
    if (kind === 'sla') {
      const n = state.leads.filter(isOverdue).length;
      return n ? { n, alert: true } : null;
    }
    return null;
  }

  function updateSidebar() {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    const groups = NAV[state.user.role] || [];
    let html = '';
    groups.forEach((g) => {
      html += '<div class="side-section"><div class="side-label">' + esc(g.section) + '</div>';
      g.items.forEach((it) => {
        const badge = it.badge ? navBadge(it.badge) : null;
        html += '<a class="nav-link ' + (state.route === it.route ? 'active' : '') + '" href="#/' + it.route + '" data-nav="' + it.route + '" title="' + esc(it.label) + '">' +
          '<span class="nav-ic">' + Icon(it.icon, { size: 19 }) + '</span>' +
          '<span class="nav-label">' + esc(it.label) + '</span>' +
          (badge ? '<span class="nav-badge" style="' + (badge.alert ? 'background:var(--brand);color:#fff' : '') + '">' + badge.n + '</span>' : '') +
          '</a>';
      });
      html += '</div>';
    });
    html += '<div class="side-foot"><div class="role-tag">' + Icon('users', { size: 14 }) + ' <span class="role-text">' + esc(ROLE_LABEL[state.user.role]) + '</span></div>' +
      '<button class="nav-link" data-action="toggle-collapse" title="Colapsar menú"><span class="nav-ic">' + Icon('chevron-left', { size: 19 }) + '</span><span class="nav-label">Colapsar menú</span></button>' +
      '<a class="nav-link" href="#/login" data-action="logout" data-tip="Cambiar rol / salir" title="Cambiar rol / salir"><span class="nav-ic">' + Icon('logout', { size: 19 }) + '</span><span class="nav-label">Cambiar rol / salir</span></a></div>';
    sb.innerHTML = html;
  }

  /* =============================== MI PANEL ============================== */
  function weekDelta(mine, pred) {
    const cur = mine.filter((l) => pred(l) && l.ingestedMinAgo <= 7 * 1440).length;
    const prev = mine.filter((l) => pred(l) && l.ingestedMinAgo > 7 * 1440 && l.ingestedMinAgo <= 14 * 1440).length;
    if (!prev) return { pct: cur ? 100 : 0, dir: 'up' };
    const pct = ((cur - prev) / prev) * 100;
    return { pct: Math.abs(Math.round(pct)), dir: pct >= 0 ? 'up' : 'down' };
  }

  function priorities(mine) {
    const out = [];
    mine.forEach((l) => {
      if (isOverdue(l)) out.push({ l, reason: 'Fuera de SLA', kind: 'sla', urgency: 0, act: 'Contactar ahora' });
      else if (l.status === 'VISITA_AGENDADA' && l.visitInMin != null && l.visitInMin <= 1440) out.push({ l, reason: 'Visita hoy', kind: 'visit', urgency: 1, act: 'Ver visita' });
      if (l.temperature === 'CALIENTE' && isOpen(l) && l.lastActivityMin > 1440) out.push({ l, reason: 'Caliente sin actividad', kind: 'hot', urgency: 2, act: 'Retomar' });
      if (l.reentry && isOpen(l)) out.push({ l, reason: 'Reingreso', kind: 'reentry', urgency: 3, act: 'Abrir' });
    });
    const map = new Map();
    out.forEach((o) => { if (!map.has(o.l.id) || o.urgency < map.get(o.l.id).urgency) map.set(o.l.id, o); });
    return Array.from(map.values()).sort((a, b) => a.urgency - b.urgency || b.l.lastActivityMin - a.l.lastActivityMin);
  }

  function panelActivity(mine) {
    const ev = [];
    mine.forEach((l) => {
      if (l.status !== 'NUEVO') ev.push({ min: l.lastActivityMin, icon: 'message-plus', tone: 'ok', text: 'Interacción con ' + (l.fullName || l.phone) });
      if (l.status === 'DESECHADO') ev.push({ min: Math.max(1, Math.round(l.lastActivityMin * 0.8)), icon: 'x-circle', tone: 'bad', text: 'Descartó a ' + (l.fullName || l.phone) + ' · ' + (l.discardReason || '') });
      if (l.status === 'VISITA_AGENDADA') ev.push({ min: Math.max(1, Math.round(l.lastActivityMin * 0.6)), icon: 'calendar', tone: 'ok', text: 'Agendó visita con ' + (l.fullName || l.phone) });
      if (l.reentry) ev.push({ min: Math.max(1, l.assignedMinAgo), icon: 'refresh', tone: 'warn', text: 'Reingreso de ' + (l.fullName || l.phone) });
    });
    return ev.sort((a, b) => a.min - b.min).slice(0, 8);
  }

  function agenda(mine) {
    return mine.filter((l) => l.status === 'VISITA_AGENDADA' && l.visitInMin != null)
      .sort((a, b) => a.visitInMin - b.visitInMin).slice(0, 8);
  }

  function panelView() {
    const st = teamStatsFor(state.user.id);
    const { mine } = st;
    const firstName = state.user.name.split(' ')[0];
    const pendientes = mine.filter(isOverdue).length;
    const visitsToday = st.visits.filter((l) => l.visitInMin <= 1440).length;
    const frase = statusSentence(pendientes, visitsToday);

    /* KPIs */
    const openDelta = weekDelta(mine, isOpen);
    const overdueDelta = weekDelta(mine, isOverdue);
    const visitDelta = weekDelta(mine, (l) => l.status === 'VISITA_AGENDADA');
    const mineTrend = []; for (let d = 13; d >= 0; d--) mineTrend.push(mine.filter((l) => l.ingestedMinAgo >= d * 1440 && l.ingestedMinAgo < (d + 1) * 1440).length);
    const teamAvg = avgTeamConv();

    const kpis = [
      kpiCard('Leads activos', st.open, 'users', '#5B3FC4', mineTrend, { delta: openDelta, sub: st.open + ' abiertos en el pipeline' }),
      kpiCard('Por contactar (SLA)', pendientes, 'alert-triangle', '#C00000', mineTrend, { alert: true, action: 'panel-sla', sub: pendientes ? 'Supera el SLA de ' + SLA() + ' min' : 'Todo dentro del SLA' }),
      kpiCard('Visitas agendadas', st.visits.length, 'calendar', '#C46418', mineTrend, { delta: visitDelta, sub: 'Próximos 7 días' }),
      kpiCard('Mi conversión', st.conv, 'target', '#2F7D4A', mineTrend, { decimals: 1, suffix: '%', sub: 'Equipo: ' + FMT.one(teamAvg) + '%', delta: { pct: Math.abs(Math.round(st.conv - teamAvg)), dir: st.conv >= teamAvg ? 'up' : 'down' } }),
      kpiCard('1.er contacto', st.avgFc, 'clock', '#0F7E80', mineTrend, { suffix: ' min', sub: 'Meta: ' + SLA() + ' min', delta: { pct: Math.abs(st.avgFc - SLA()), dir: st.avgFc <= SLA() ? 'up' : 'down' } })
    ].join('');

    /* Prioridades */
    const prio = priorities(mine).slice(0, 6);
    const prioHTML = prio.length ? prio.map((p) => {
      const l = p.l;
      const tone = { sla: 'badge-sla', visit: 'badge-neutral', hot: 'badge-temp hot', reentry: 'badge-reentry' }[p.kind];
      const t = TEMPS[l.temperature];
      return '<div class="prio-row">' +
        avatar(l.fullName || 'Sin nombre', 'av-sm') +
        '<div class="prio-main"><div class="prio-name">' + esc(l.fullName || 'Sin nombre') + '</div>' +
        '<div class="prio-sub">' + esc(l.phone) + ' · ' + esc(l.project) + '</div></div>' +
        '<span class="badge ' + tone + '">' + esc(p.reason) + '</span>' +
        '<span class="prio-time ' + (p.kind === 'sla' ? 'over' : '') + '">' + (p.kind === 'sla' ? Icon('alert-triangle', { size: 13 }) + ' ' : '') + FMT.relative(l.lastActivityMin) + '</span>' +
        '<div class="prio-actions">' +
          '<button class="qbtn" data-action="wa" data-id="' + l.id + '" data-tip="WhatsApp">' + Icon('chat', { size: 16 }) + '</button>' +
          '<button class="qbtn" data-action="quick-interaction" data-id="' + l.id + '" data-tip="Registrar interacción">' + Icon('message-plus', { size: 16 }) + '</button>' +
          '<button class="btn sm" data-action="open-drawer" data-id="' + l.id + '">' + esc(p.act) + '</button>' +
        '</div></div>';
    }).join('') : UI.emptyState({ icon: 'check-circle', title: 'Todo al día', text: 'No tienes pendientes urgentes. Aprovecha para retomar leads calientes.', action: '<button class="btn" data-action="go-pipeline">Abrir mi pipeline</button>' });

    /* Embudo */
    const maxF = Math.max.apply(null, OPEN_PHASES.concat(['CALIFICADO']).map((k) => mine.filter((l) => l.status === k).length).concat([1]));
    const embudoRows = OPEN_PHASES.concat(['CALIFICADO']).map((k) => {
      const p = PHASES[k];
      const count = mine.filter((l) => l.status === k).length;
      return { label: p.label, icon: p.icon, value: count, color: p.bg, fg: p.accent, step: (count / maxF) * 100, key: k };
    });
    const embudoHTML = '<div class="funnel-clickable">' + embudoRows.map((r) =>
      '<div class="funnel-row" data-action="open-phase" data-phase="' + r.key + '" role="button" tabindex="0">' +
      '<span class="funnel-label" style="color:' + r.fg + '">' + Icon(r.icon, { size: 16, cls: 'hbar-ic' }) + esc(r.label) + '</span>' +
      '<span class="funnel-track"><i class="funnel-fill chart-bar" style="--w:' + Math.max(8, (r.value / maxF) * 100).toFixed(1) + '%;background:' + r.color + ';color:' + r.fg + '">' + r.value + '</i></span>' +
      '<span class="hbar-meta">' + Math.round((r.value / (mine.length || 1)) * 100) + '%</span></div>').join('') + '</div>';

    /* Por temperatura (donut) */
    const temps = ['CALIENTE', 'TIBIO', 'FRIO'].map((t) => ({ value: mine.filter((l) => l.temperature === t).length, color: TEMPS[t].fg, label: TEMPS[t].label }));
    const donut = Charts.donut(temps, { center: String(mine.length), aria: 'Leads por temperatura' });
    const tempLegend = ['CALIENTE', 'TIBIO', 'FRIO'].map((t) =>
      '<span class="leg-item">' + Icon(TEMPS[t].icon, { size: 15, cls: 'leg-ic', animate: t === 'CALIENTE' ? 'flame' : '' }) +
      '<b>' + mine.filter((l) => l.temperature === t).length + '</b> ' + TEMPS[t].label + '</span>').join('');

    /* Rendimiento vs equipo */
    const teamFc = avgTeamFirstContact();
    const perf = Charts.bullet({ label: 'Mi conversión', value: st.conv, max: Math.max(teamAvg * 1.8, 10), target: teamAvg, display: FMT.one(st.conv) + '%', targetLabel: FMT.one(teamAvg) + '%', color: 'var(--p-calificado)' }) +
      Charts.bullet({ label: 'Mi 1.er contacto', value: Math.min(st.avgFc, 120), max: 120, target: SLA(), display: st.avgFc + ' min', targetLabel: SLA() + ' min', color: st.avgFc <= SLA() ? 'var(--ok)' : 'var(--brand)' }) +
      '<p class="muted" style="font-size:12px;margin-top:6px">La marca vertical es la meta. Equipo: ' + FMT.one(teamAvg) + '% conv · ' + teamFc + ' min</p>';

    /* Origen de leads */
    const bySrc = DB.sources.map((s) => ({ label: s.label, icon: s.iconKey, value: mine.filter((l) => l.source.code === s.code).length, color: 'var(--ink-1)' }))
      .filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const srcHTML = bySrc.length ? Charts.bars(bySrc) : UI.emptyState({ icon: 'globe', title: 'Sin leads aún' });

    /* Agenda */
    const ag = agenda(mine);
    const agendaHTML = ag.length ? ag.map((l) => {
      const dayIdx = Math.floor(l.visitInMin / 1440);
      const dayLabel = dayIdx === 0 ? 'Hoy' : dayIdx === 1 ? 'Mañana' : FMT.relativeFuture(l.visitInMin).replace('en ', 'En ');
      const hh = 9 + (parseInt(l.id.slice(-2), 10) % 9);
      return '<div class="visit-chip"><span class="vc-time">' + String(hh).padStart(2, '0') + ':00</span>' +
        '<span class="vc-body"><span class="vc-name">' + esc(l.fullName || 'Sin nombre') + '</span>' +
        '<span class="muted" style="font-size:12px">' + dayLabel + ' · ' + esc(l.project) + '</span></span>' +
        '<button class="btn sm" data-action="open-drawer" data-id="' + l.id + '">Ver lead</button></div>';
    }).join('') : UI.emptyState({ icon: 'calendar', title: 'Sin visitas próximas', text: 'Cuando agendes una visita aparecerá aquí.' });

    /* Actividad */
    const act = panelActivity(mine);
    const actHTML = act.map((e) => '<div class="act-item"><span class="act-ic tone-' + e.tone + '">' + Icon(e.icon, { size: 15 }) + '</span>' +
      '<span class="act-text">' + esc(e.text) + '</span><span class="act-time">' + FMT.relative(e.min) + '</span></div>').join('');

    return pageHead('Mi panel', null, null, FMT.greeting() + ', ' + firstName + ' · ' + FMT.longDate(today()) + '. ' + frase,
        '<label class="switch">' + availabilitySwitch() + '</label>' +
        '<button class="btn primary" data-action="go-pipeline">' + Icon('kanban', { size: 18, cls: 'btn-ic' }) + ' Abrir mi pipeline</button>') +
      '<div class="grid-kpi">' + kpis + '</div>' +
      '<div class="grid grid-12" style="margin-top:16px">' +
        '<div class="card col-8"><div class="card-head"><h3>Prioridades de hoy</h3><span class="hint">Cola de acción ordenada por urgencia</span></div>' +
          '<div class="card-body">' + prioHTML + '</div></div>' +
        '<div class="card col-4"><div class="card-head"><h3>Mi embudo</h3></div>' +
          '<div class="card-body">' + embudoHTML + '</div></div>' +
      '</div>' +
      '<div class="grid grid-3" style="margin-top:16px">' +
        '<div class="card"><div class="card-head"><h3>Mis leads por temperatura</h3></div>' +
          '<div class="card-body" style="display:flex;gap:16px;align-items:center">' + donut + '<div class="stack-sm">' + tempLegend + '</div></div></div>' +
        '<div class="card"><div class="card-head"><h3>Rendimiento vs equipo</h3></div><div class="card-body">' + perf + '</div></div>' +
        '<div class="card"><div class="card-head"><h3>Origen de mis leads</h3></div><div class="card-body">' + srcHTML + '</div></div>' +
      '</div>' +
      '<div class="grid grid-2" style="margin-top:16px">' +
        '<div class="card"><div class="card-head"><h3>Agenda de visitas</h3><span class="hint">Próximos 7 días</span></div><div class="card-body">' + agendaHTML + '</div></div>' +
        '<div class="card"><div class="card-head"><h3>Actividad reciente</h3></div><div class="card-body">' + (actHTML || UI.emptyState({ icon: 'history', title: 'Sin actividad todavía' })) + '</div></div>' +
      '</div>';
  }

  function availabilitySwitch() {
    const on = isAvailable(state.user.id);
    return '<input type="checkbox" data-action="toggle-availability" data-id="' + state.user.id + '" ' + (on ? 'checked' : '') + '>' +
      '<span class="track"></span><span class="sw-label">' + (on ? 'Recibiendo leads' : 'En pausa') + '</span>';
  }

  function avgTeamConv() {
    const withLeads = advisors.map((a) => {
      const m = state.leads.filter((l) => l.asesorId === a.id);
      return m.length ? (m.filter((l) => l.status === 'CALIFICADO').length / m.length) * 100 : null;
    }).filter((v) => v != null);
    return withLeads.length ? withLeads.reduce((a, b) => a + b, 0) / withLeads.length : 0;
  }
  function avgTeamFirstContact() {
    const c = state.leads.filter((l) => l.firstContactMin != null).map((l) => l.firstContactMin);
    return c.length ? Math.round(c.reduce((a, b) => a + b, 0) / c.length) : 0;
  }
  function statusSentence(pend, visits) {
    const parts = [];
    if (pend) parts.push('tienes ' + pend + ' lead' + (pend > 1 ? 's' : '') + ' por contactar');
    if (visits) parts.push(visits + ' visita' + (visits > 1 ? 's' : '') + ' hoy');
    if (!parts.length) return 'Vas al día. Revisa tus leads calientes.';
    return 'Tienes ' + parts.join(' y ') + '.';
  }

  function kpiCard(label, value, icon, color, sparkVals, o) {
    o = o || {};
    const dec = o.decimals || 0;
    const delta = o.delta ? '<span class="k-delta ' + o.delta.dir + '">' + Icon(o.delta.dir === 'up' ? 'trending-up' : 'trending-down', { size: 13 }) +
      ' ' + o.delta.pct + (o.suffix === '%' ? ' pts' : '%') + '</span>' : '';
    return '<div class="kpi' + (o.alert ? ' alert' : '') + (o.action ? ' clickable' : '') + '"' + (o.action ? ' data-action="' + o.action + '" role="button" tabindex="0"' : '') + '>' +
      '<div class="kpi-top"><span class="kpi-ic" style="background:' + color + '1a;color:' + color + '">' + Icon(icon, { size: 19 }) + '</span>' +
      '<span class="k-label">' + esc(label) + '</span></div>' +
      '<div class="k-val num" data-countup="' + value + '" data-decimals="' + dec + '" data-suffix="' + (o.suffix || '') + '">0</div>' +
      '<div class="k-sub">' + delta + '<span>' + esc(o.sub || '') + '</span></div>' +
      (sparkVals ? '<div class="k-spark">' + Charts.spark(sparkVals, { color: color }) + '</div>' : '') +
      '</div>';
  }

  function pageHead(title, actions, _unused, subtitle, subtitleInline) {
    return '<div class="page-head"><div class="ph-text"><h1>' + esc(title) + '</h1>' +
      (subtitle ? '<div class="ph-sub">' + esc(subtitle) + '</div>' : '') + '</div>' +
      (subtitleInline || actions ? '<div class="ph-actions">' + (subtitleInline || '') + (actions || '') + '</div>' : '') + '</div>';
  }

  /* ============================== MI PIPELINE ============================ */
  function applyBoardFilters(list) {
    const f = state.filters, q = f.q.trim().toLowerCase();
    return list.filter((l) => {
      if (f.project && l.project !== f.project) return false;
      if (f.temperature && l.temperature !== f.temperature) return false;
      if (f.chip === 'nuevo' && l.status !== 'NUEVO') return false;
      if (f.chip === 'caliente' && l.temperature !== 'CALIENTE') return false;
      if (f.chip === 'reentry' && !l.reentry) return false;
      if (f.chip === 'visita' && l.status !== 'VISITA_AGENDADA') return false;
      if (f.phase && l.status !== f.phase) return false;
      if (q && !((l.fullName || '').toLowerCase().includes(q) || digits(l.phone).includes(digits(q)))) return false;
      return true;
    });
  }

  function pipelineView() {
    const mine = state.leads.filter((l) => l.asesorId === state.user.id);
    const list = applyBoardFilters(mine);
    const overdue = mine.filter(isOverdue).length;
    const hot = mine.filter((l) => l.temperature === 'CALIENTE').length;
    const chips = [
      { k: 'todos', label: 'Todos', count: mine.length },
      { k: 'nuevo', label: 'Sin contactar', count: mine.filter((l) => l.status === 'NUEVO').length },
      { k: 'caliente', label: 'Calientes', count: hot },
      { k: 'reentry', label: 'Reingresos', count: mine.filter((l) => l.reentry).length },
      { k: 'visita', label: 'Visitas', count: mine.filter((l) => l.status === 'VISITA_AGENDADA').length }
    ];
    const chipHTML = chips.map((c) => '<button class="chip ' + (state.filters.chip === c.k ? 'active' : '') + '" data-action="board-chip" data-chip="' + c.k + '">' +
      esc(c.label) + '<span class="count">' + c.count + '</span></button>').join('');

    const projOpt = state.filters.project || '';
    const tempOpt = state.filters.temperature || '';

    const bar =
      '<div class="pipeline-bar">' +
        '<div class="pipeline-summary"><b>' + FMT.number(mine.length) + '</b> leads · <b>' + overdue + '</b> por contactar · <b>' + hot + '</b> calientes</div>' +
        '<div class="spacer"></div>' +
        '<div class="input-wrap" style="max-width:220px">' + Icon('search', { size: 16, cls: 'in-ic' }) +
          '<input class="input" style="height:34px" placeholder="Buscar nombre o teléfono…" data-action="search" data-key="board" data-focus="board-search" value="' + esc(state.filters.q) + '"></div>' +
        '<button class="select' + (projOpt ? ' is-active' : '') + '" data-action="filter-select" data-key="project">' + Icon('building', { size: 16, cls: 'sel-ic' }) +
          esc(projOpt || 'Proyecto') + Icon('chevron-down', { size: 15, cls: 'sel-caret' }) + '</button>' +
        '<button class="select' + (tempOpt ? ' is-active' : '') + '" data-action="filter-select" data-key="temperature">' + Icon('flame', { size: 16, cls: 'sel-ic' }) +
          esc(tempOpt ? TEMPS[tempOpt].label : 'Temperatura') + Icon('chevron-down', { size: 15, cls: 'sel-caret' }) + '</button>' +
        (projOpt || tempOpt || state.filters.phase ? '<button class="chip" data-action="clear-board-filters">' + Icon('x', { size: 13 }) + ' Limpiar</button>' : '') +
        '<div class="segmented"><button class="' + (state.viewMode === 'kanban' ? 'active' : '') + '" data-action="view" data-mode="kanban">' + Icon('kanban', { size: 15 }) + ' Tablero</button>' +
          '<button class="' + (state.viewMode === 'table' ? 'active' : '') + '" data-action="view" data-mode="table">' + Icon('list', { size: 15 }) + ' Lista</button></div>' +
      '</div>' +
      '<div class="toolbar" style="margin-top:12px">' + chipHTML +
      (state.filters.phase ? '<button class="chip on" data-action="clear-phase">' + Icon(PHASES[state.filters.phase].icon, { size: 14 }) + ' Fase: ' + PHASES[state.filters.phase].label + ' <span class="chip-x">' + Icon('x', { size: 13 }) + '</span></button>' : '') +
      '</div>';

    const body = state.viewMode === 'kanban' ? boardHTML(list) : leadsTableHTML(list, true);
    return bar + body;
  }

  function boardHTML(list) {
    const cols = ORDER.map((k) => {
      const ph = PHASES[k];
      const items = list.filter((l) => l.status === k).sort((a, b) => b.lastActivityMin - a.lastActivityMin);
      const total = items.length;
      const hot = items.filter((l) => l.temperature === 'CALIENTE').length;

      if (k === 'DESECHADO' && !state.desechadoOpen) {
        return '<section class="board-col rail" data-status="' + k + '" role="button" tabindex="0" data-action="toggle-desechado" data-tip="Expandir DESECHADO">' +
          '<div class="board-col-head" style="background:' + ph.bg + ';color:' + ph.accent + ';justify-content:center">' + Icon('x-circle', { size: 16 }) + '</div>' +
          '<div class="rail-body"><span class="rail-count">DESECHADO · ' + total + '</span></div></section>';
      }

      const shown = items.slice(0, state.colLimit);
      const cards = shown.map(cardHTML).join('');
      const more = total > state.colLimit ? '<button class="col-more" data-action="more">Cargar más (' + (total - state.colLimit) + ')</button>' : '';
      const collapse = k === 'DESECHADO' ? '<button class="x-btn" data-action="toggle-desechado" data-tip="Colapsar" style="width:26px;height:26px">' + Icon('chevron-right', { size: 15 }) + '</button>' : '';

      return '<section class="board-col" data-status="' + k + '">' +
        '<div class="board-col-head" style="background:' + ph.bg + ';color:' + ph.accent + '">' +
          '<span class="col-ic" style="background:rgba(255,255,255,.55)">' + Icon(ph.icon, { size: 15 }) + '</span>' +
          '<span class="col-name">' + ph.label + '</span>' +
          '<span class="col-count">' + total + '</span>' +
          (hot ? '<span class="col-hot">' + Icon('flame', { size: 13, animate: 'flame' }) + ' ' + hot + '</span>' : '') +
          collapse + '</div>' +
        '<div class="board-col-body">' + (cards || '<div class="col-empty">Sin leads en esta fase</div>') + more + '</div></section>';
    }).join('');
    return '<div class="board">' + cols + '</div>';
  }

  function suggestFor(l) {
    if (isOverdue(l)) return { label: 'Contactar ahora', icon: 'phone-call', action: 'quick-interaction' };
    if (l.status === 'VISITA_AGENDADA') return { label: 'Ver visita', icon: 'eye', action: 'open-drawer' };
    if (l.temperature === 'CALIENTE' && isOpen(l) && l.lastActivityMin > 1440) return { label: 'Retomar', icon: 'refresh', action: 'quick-interaction' };
    return null;
  }

  function cardHTML(l) {
    const ph = PHASES[l.status];
    const over = isOverdue(l);
    const flash = state.flashId === l.id ? ' flash' : '';
    const sg = suggestFor(l);
    return '<article class="lead-card' + (over ? ' sla' : '') + flash + '" draggable="true" data-id="' + l.id + '" data-action="open-drawer" tabindex="0">' +
      '<div class="lc-row1">' +
        '<span class="lc-name ' + (!l.fullName ? 'muted' : '') + '">' + esc(l.fullName || 'Sin nombre') + '</span>' +
        (l.reentry ? '<span class="badge badge-reentry">' + Icon('refresh', { size: 12 }) + ' Reingreso</span>' : '') +
        '<span class="grip" data-tip="Arrastra para mover" aria-hidden="true">' + Icon('grip', { size: 15 }) + '</span>' +
      '</div>' +
      '<div class="lc-row2"><span class="lc-project">' + Icon('building', { size: 14 }) + ' ' + esc(l.project) + '</span>' +
        '<span data-tip="' + esc(sourceLabel(l.source.code)) + '">' + Icon(l.source.iconKey, { size: 14 }) + '</span></div>' +
      '<div class="lc-row3">' + tempBadge(l, true) +
        '<span class="lc-age ' + (over ? 'over' : '') + '">' + (over ? Icon('alert-triangle', { size: 13 }) + ' ' : Icon('clock', { size: 13 }) + ' ') + (over ? 'Sin contactar' : FMT.relative(l.lastActivityMin)) + '</span></div>' +
      '<div class="lc-quick">' +
        '<button class="qbtn" data-action="wa" data-id="' + l.id + '" data-tip="WhatsApp">' + Icon('chat', { size: 16 }) + '</button>' +
        '<button class="qbtn" data-action="quick-interaction" data-id="' + l.id + '" data-tip="Registrar interacción">' + Icon('message-plus', { size: 16 }) + '</button>' +
        '<button class="qbtn" data-action="move-menu" data-id="' + l.id + '" data-tip="Mover a…">' + Icon('swap', { size: 16 }) + '</button>' +
        '<button class="qbtn" data-action="card-more" data-id="' + l.id + '" data-tip="Más opciones">' + Icon('more', { size: 16 }) + '</button>' +
        '<span class="spacer"></span>' +
        (sg ? '<button class="suggest-btn" data-action="' + sg.action + '" data-id="' + l.id + '">' + Icon(sg.icon, { size: 14 }) + ' ' + sg.label + '</button>' : '') +
      '</div></article>';
  }

  function leadsTableHTML(list, compact) {
    const rows = list.slice(0, 300).map((l) => {
      const over = isOverdue(l);
      return '<tr data-action="open-drawer" data-id="' + l.id + '">' +
        '<td class="cell-name"><div class="cell-flex">' + avatar(l.fullName || 'Sin nombre', 'av-sm') +
          '<span>' + (l.reentry ? Icon('refresh', { size: 13 }) + ' ' : '') + esc(l.fullName || 'Sin nombre') + '</span></div></td>' +
        '<td class="num">' + esc(l.phone) + '</td>' +
        '<td>' + phaseChip(l.status) + '</td>' +
        '<td>' + tempBadge(l) + '</td>' +
        '<td>' + esc(l.project) + '</td>' +
        '<td><span class="inline">' + Icon(l.source.iconKey, { size: 15 }) + ' ' + esc(l.source.label) + '</span></td>' +
        '<td class="' + (over ? 'over' : '') + '">' + (over ? Icon('alert-triangle', { size: 13 }) + ' ' : '') + FMT.relative(l.lastActivityMin) + '</td>' +
        (compact ? '' : '<td>' + esc(l.asesorName || '—') + '</td>') + '</tr>';
    }).join('');
    return '<div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr>' +
      '<th>Nombre</th><th>Teléfono</th><th>Estado</th><th>Temperatura</th><th>Proyecto</th><th>Fuente</th><th>Último contacto</th>' +
      (compact ? '' : '<th>Asesor</th>') + '</tr></thead><tbody>' +
      (rows || '<tr><td colspan="8">' + UI.emptyState({ icon: 'search', title: 'Sin resultados', text: 'Prueba con otro filtro o limpia la búsqueda.' }) + '</td></tr>') +
      '</tbody></table></div>';
  }

  /* ================================ DRAWER =============================== */
  function drawerHTML(l) {
    const ph = PHASES[l.status];
    const rank = { NUEVO: 0, CONTACTADO: 1, VISITA_AGENDADA: 2, NEGOCIACION: 3, CALIFICADO: 4, DESECHADO: -1 };
    const curRank = rank[l.status];
    const stepper = ORDER.map((k) => {
      const p = PHASES[k];
      const done = curRank >= 0 && rank[k] >= 0 && rank[k] < curRank;
      const current = k === l.status;
      const locked = k === 'DESECHADO';
      return '<div class="step ' + (done ? 'done' : '') + (current ? ' current' : '') + (locked ? ' locked' : '') + '" data-action="step-move" data-id="' + l.id + '" data-status="' + k + '" role="button" tabindex="0">' +
        '<span class="step-dot">' + (done ? Icon('check', { size: 12 }) : (current ? Icon('arrow-right', { size: 12 }) : '')) + '</span>' +
        '<span class="step-name">' + p.label + '</span></div>';
    }).join('');

    const temps = ['CALIENTE', 'TIBIO', 'FRIO'].map((t) => '<button class="chip ' + (l.temperature === t ? 'on' : '') + '" data-action="set-temp" data-temp="' + t + '" data-id="' + l.id + '">' +
      Icon(TEMPS[t].icon, { size: 14 }) + ' ' + TEMPS[t].label + '</button>').join('');

    const tl = drawerTimeline(l).map((e) => '<div class="tl-item ' + (e.tone || '') + '"><div class="tl-when">' + FMT.relative(e.min) + '</div>' +
      '<div class="tl-what">' + Icon(e.icon, { size: 13 }) + ' <span class="tl-title">' + esc(e.title) + '</span>' + (e.text ? ' · ' + esc(e.text) : '') + '</div></div>').join('');

    return '<div class="drawer-backdrop" data-action="close-drawer"></div>' +
      '<aside class="drawer" role="dialog" aria-label="Detalle del lead">' +
      '<div class="drawer-head"><div class="dh-top">' + avatar(l.fullName || 'Sin nombre', 'av-lg') +
        '<div style="flex:1;min-width:0"><h2>' + esc(l.fullName || 'Sin nombre') + '</h2>' +
        '<div class="dh-sub">' + Icon('phone', { size: 13 }) + ' ' + esc(l.phone) + ' · ' + Icon(l.source.iconKey, { size: 13 }) + ' ' + esc(l.source.label) + '</div>' +
        '<div class="dh-sub">' + Icon('building', { size: 13 }) + ' ' + esc(l.project) + ' · ' + esc(l.campaign) + (l.externalUsername ? ' · @' + esc(l.externalUsername) : '') + '</div>' +
        '</div><button class="x-btn" data-action="close-drawer" aria-label="Cerrar">' + Icon('x', { size: 18 }) + '</button></div></div>' +
      '<div class="drawer-body">' +
        '<div class="section-title" style="margin-top:0">Fase del pipeline</div>' + '<div class="stepper">' + stepper + '</div>' +
        (l.status === 'DESECHADO' && l.discardReason ? '<div class="chip" style="border-color:var(--line);margin-bottom:14px">' + Icon('x-circle', { size: 14 }) + ' Motivo: ' + esc(l.discardReason) + '</div>' : '') +
        '<div class="section-title">Temperatura</div><div class="toolbar">' + temps + '</div>' +
        '<div class="section-title">Datos de contacto</div>' +
        '<div class="field"><label>Nombre del cliente</label><div class="row-line">' +
          '<input class="input" data-key="name" data-id="' + l.id + '" data-action="rename" value="' + esc(l.fullName || '') + '" placeholder="Nombre y apellido (obligatorio para avanzar)">' +
        '</div></div>' +
        '<div class="field"><label>Teléfono</label><div class="row-line">' +
          '<input class="input num" value="' + esc(l.phone) + '" readonly>' +
          '<button class="btn sm" data-action="copy" data-id="' + l.id + '" data-tip="Copiar">' + Icon('copy', { size: 16 }) + '</button>' +
          '<button class="btn sm" data-action="wa" data-id="' + l.id + '">' + Icon('chat', { size: 16 }) + ' WhatsApp</button>' +
        '</div></div>' +
        '<div class="field"><label>Observaciones</label><textarea class="input" rows="2" data-key="obs" data-id="' + l.id + '" data-action="obs">' + esc(l.observations || '') + '</textarea></div>' +
        '<div class="section-title">Registrar interacción</div>' + composerHTML(l) +
        '<div class="section-title">Línea de tiempo</div><div class="tl">' + (tl || '<div class="muted">Sin eventos.</div>') + '</div>' +
      '</div>' +
      '<div class="drawer-foot">' +
        '<button class="btn" data-action="move-menu" data-id="' + l.id + '">' + Icon('swap', { size: 16 }) + ' Mover a…</button>' +
        '<button class="btn ghost" data-action="close-drawer">Cerrar</button>' +
        '<span class="spacer"></span>' +
        (l.status === 'CALIFICADO' ? '<button class="btn primary" data-action="mark-won" data-id="' + l.id + '">' + Icon('check-circle', { size: 16 }) + ' Registrar venta</button>' : '') +
        '<button class="btn" data-action="open-reassign" data-id="' + l.id + '">' + Icon('users', { size: 16 }) + ' Reasignar</button>' +
      '</div></aside>';
  }

  function composerHTML(l) {
    const kinds = [['CALL', 'Llamada', 'phone'], ['WA', 'WhatsApp', 'chat'], ['VISIT', 'Visita', 'handshake'], ['NOTE', 'Nota', 'edit']];
    const active = state._quick && state._quick.kind || 'CALL';
    return '<div class="composer"><div class="seg">' +
      kinds.map(([k, label, ic]) => '<button class="' + (active === k ? 'active' : '') + '" data-action="composer-kind" data-kind="' + k + '">' + Icon(ic, { size: 14 }) + ' ' + label + '</button>').join('') +
      '</div><textarea class="input" rows="2" placeholder="Escribe una nota del contacto…" data-key="composer"></textarea>' +
      '<div class="row-line" style="margin-top:8px"><span class="spacer"></span>' +
      '<button class="btn primary sm" data-action="save-interaction" data-id="' + l.id + '">' + Icon('message-plus', { size: 15 }) + ' Registrar</button></div></div>';
  }

  function drawerTimeline(l) {
    const ev = (l._extra || []).slice();
    ev.push({ min: l.assignedMinAgo, title: 'Asignado a ' + l.asesorName, text: 'Round-Robin', icon: 'users-plus', tone: '' });
    if (l.reentry) ev.push({ min: Math.max(1, l.assignedMinAgo + 90), title: 'Reingreso', text: l.source.label, icon: 'refresh', tone: 'warn' });
    if (l.status !== 'NUEVO') {
      ev.push({ min: Math.max(1, Math.round(l.assignedMinAgo * 0.6)), title: 'NUEVO → ' + PHASES[l.status].label, text: '', icon: 'swap', tone: 'ok' });
      ev.push({ min: Math.max(1, Math.round(l.assignedMinAgo * 0.55)), title: 'Llamada registrada', text: 'cliente pidió precios', icon: 'phone-call', tone: 'ok' });
    }
    if (l.status === 'DESECHADO' && l.discardReason) ev.push({ min: Math.max(1, Math.round(l.assignedMinAgo * 0.4)), title: 'Descartado', text: l.discardReason, icon: 'x-circle', tone: 'bad' });
    return ev.sort((a, b) => b.min - a.min);
  }

  function renderDrawer() {
    const l = state.drawerLeadId ? getLead(state.drawerLeadId) : null;
    drawerRoot.innerHTML = l ? drawerHTML(l) : '';
  }
  function openDrawer(id) { state.drawerLeadId = id; if (state.route !== 'pipeline') { /* keep */ } renderDrawer(); }
  function closeDrawer() { state.drawerLeadId = null; drawerRoot.innerHTML = ''; }

  /* ========================== REGLAS DE NEGOCIO =========================== */
  function moveValidity(id) {
    const l = getLead(id), map = {};
    if (!l) return map;
    const isAdvisor = state.user.role === 'ASESOR';
    ORDER.forEach((to) => {
      if (to === l.status) { map[to] = { ok: false, reason: 'Ya está en esta fase' }; return; }
      if (['CALIFICADO', 'DESECHADO'].includes(l.status) && isAdvisor) { map[to] = { ok: false, reason: 'Estado final: solo Gerencia reabre' }; return; }
      if (['VISITA_AGENDADA', 'NEGOCIACION', 'CALIFICADO'].includes(to) && !(l.fullName && l.fullName.trim())) { map[to] = { ok: false, reason: 'Requiere nombre' }; return; }
      map[to] = { ok: true };
    });
    return map;
  }

  function attemptMove(id, to, opts) {
    opts = opts || {};
    const l = getLead(id);
    if (!l) return;
    if (l.status === to) { UI.closePopover(); return; }
    const v = moveValidity(id)[to];
    if (v && !v.ok) {
      UI.closePopover(); UI.closeModal();
      if (v.reason === 'Requiere nombre') { openDrawer(id); setTimeout(() => { const i = drawerRoot.querySelector('[data-key="name"]'); if (i) i.focus(); }, 60); }
      UI.toast(v.reason, { type: 'warn' });
      return;
    }
    if (to === 'DESECHADO' && !opts.discardReason) { openDiscardModal(id); return; }

    const prev = l.status, prevTemp = l.temperature;
    l.status = to; l.lastActivityMin = 0;
    if (to === 'DESECHADO') l.discardReason = opts.discardReason;
    if (to === 'VISITA_AGENDADA') state.demoFlags.agenda = true;
    if (['VISITA_AGENDADA', 'NEGOCIACION', 'CALIFICADO'].includes(to) && l.temperature === 'FRIO') l.temperature = 'TIBIO';
    if (to === 'VISITA_AGENDADA' && l.visitInMin == null) l.visitInMin = 1440;

    UI.closePopover(); UI.closeModal(); closeDrawer();
    state.flashId = id;
    logAudit('UPDATE', 'lead', (l.fullName || l.phone) + ': ' + PHASES[prev].label + ' → ' + PHASES[to].label);
    notify('status', (l.fullName || l.phone) + ' avanzó a ' + PHASES[to].label);
    render();
    setTimeout(() => { state.flashId = null; }, 1600);
    UI.toast('Estado actualizado: ' + PHASES[prev].label + ' → ' + PHASES[to].label, {
      type: 'ok', actionLabel: 'Deshacer', onAction: () => {
        l.status = prev; l.temperature = prevTemp; l.lastActivityMin = 0; l.discardReason = null; render(); renderDrawer();
        UI.toast('Cambio deshecho.', { type: 'info' });
      }
    });
  }

  function setTemperature(id, temp) {
    const l = getLead(id);
    if (!l || l.temperature === temp) { UI.closePopover(); return; }
    const prev = l.temperature;
    l.temperature = temp;
    UI.closePopover();
    logAudit('UPDATE', 'lead', (l.fullName || l.phone) + ': temperatura ' + TEMPS[prev].label + ' → ' + TEMPS[temp].label);
    render(); renderDrawer();
    UI.toast('Temperatura: ' + TEMPS[prev].label + ' → ' + TEMPS[temp].label, {
      type: 'ok', actionLabel: 'Deshacer', onAction: () => { l.temperature = prev; render(); renderDrawer(); }
    });
  }

  function openTempMenu(anchor, id) {
    const l = getLead(id);
    UI.menu(anchor, ['CALIENTE', 'TIBIO', 'FRIO'].map((t) => ({ icon: TEMPS[t].icon, label: TEMPS[t].label, value: t, active: l.temperature === t })),
      (v) => setTemperature(id, v));
  }

  function openMoveMenu(anchor, id) {
    const l = getLead(id), valid = moveValidity(id);
    const items = ORDER.map((k) => {
      const p = PHASES[k], v = valid[k];
      return { icon: p.icon, label: p.label, value: k, active: l.status === k, hint: v && !v.ok && v.reason !== 'Ya está en esta fase' ? v.reason : null };
    });
    UI.menu(anchor, items, (v) => attemptMove(id, v));
  }

  function openDiscardModal(id) {
    const l = getLead(id);
    const box = UI.modal('<div class="modal-head"><h3>Motivo de descarte</h3></div>' +
      '<div class="modal-body"><p class="modal-text">' + esc(l.fullName || l.phone) + ' pasará a <b>DESECHADO</b>. Elige el motivo (obligatorio).</p>' +
      '<div style="margin-top:12px">' + discardReasons.map((r, i) => '<button class="modal-opt" data-reason="' + esc(r) + '" data-autofocus="' + (i === 0 ? '1' : '0') + '">' +
        Icon('x-circle', { size: 16 }) + esc(r) + '</button>').join('') + '</div></div>' +
      '<div class="modal-foot"><button class="btn ghost" data-cancel>Cancelar</button></div>', { cls: 'modal-sm' });
    box.querySelector('[data-cancel]').onclick = UI.closeModal;
    box.querySelectorAll('.modal-opt').forEach((b) => {
      b.onclick = () => { const r = b.dataset.reason; UI.closeModal(); attemptMove(id, 'DESECHADO', { discardReason: r }); };
    });
  }

  function openReassignModal(id) {
    const l = getLead(id);
    const box = UI.modal('<div class="modal-head"><h3>Reasignar lead</h3></div>' +
      '<div class="modal-body"><p class="modal-text">' + esc(l.fullName || l.phone) + ' — actualmente con <b>' + esc(l.asesorName) + '</b>. Elige el asesor destino.</p>' +
      '<div style="margin-top:12px;max-height:320px;overflow:auto">' + advisors.map((a) => {
        const load = state.leads.filter((x) => x.asesorId === a.id && isOpen(x)).length;
        const dis = !isAvailable(a.id);
        return '<button class="modal-opt" data-asesor="' + a.id + '" ' + (a.id === l.asesorId || dis ? 'disabled style="opacity:.5"' : '') + '>' +
          avatar(a.name, 'av-sm') + '<span style="flex:1"><b>' + esc(a.name) + '</b><span class="muted" style="font-size:12px"> · ' + load + ' abiertos' + (dis ? ' · en pausa' : '') + '</span></span>' +
          (a.id === l.asesorId ? '<span class="badge badge-neutral">Actual</span>' : '') + '</button>';
      }).join('') + '</div></div>' +
      '<div class="modal-foot"><button class="btn ghost" data-cancel>Cancelar</button></div>');
    box.querySelector('[data-cancel]').onclick = UI.closeModal;
    box.querySelectorAll('.modal-opt:not([disabled])').forEach((b) => {
      b.onclick = () => {
        const a = advisor(b.dataset.asesor);
        const prev = l.asesorName, prevId = l.asesorId;
        l.asesorId = a.id; l.asesorName = a.name;
        UI.closeModal(); closeDrawer();
        if (state.user.role === 'GERENTE') state.demoFlags.reassign = true;
        logAudit('REASSIGN', 'lead', (l.fullName || l.phone) + ': ' + prev + ' → ' + a.name);
        notify('manager', 'Reasignaste ' + (l.fullName || l.phone) + ' a ' + a.name);
        render();
        UI.toast('Lead reasignado a ' + a.name + '.', { type: 'ok', actionLabel: 'Deshacer', onAction: () => {
          l.asesorId = prevId; l.asesorName = prev; render(); UI.toast('Reasignación deshecha.', { type: 'info' });
        } });
      };
    });
  }

  /* ============================== DASHBOARD ============================== */
  function dashboardView() {
    const a = analytics();
    const f = state.dashFilters;

    const ranges = [[1, 'Hoy'], [7, '7 d'], [30, '30 d'], [45, 'Este mes'], [90, 'Personalizado']];
    const rangeChips = ranges.map(([d, l]) => '<button class="chip ' + (state.rangeDays === d ? 'on' : '') + '" data-action="range" data-days="' + d + '">' + l + '</button>').join('');

    const activeSel = (v, placeholder, icon) => '<button class="select' + (v ? ' is-active' : '') + '" data-action="dash-select" data-key="' + placeholder.k + '">' +
      Icon(icon, { size: 16, cls: 'sel-ic' }) + esc(v || placeholder.label) + Icon('chevron-down', { size: 15, cls: 'sel-caret' }) + '</button>';

    const filters = '<div class="toolbar" style="margin-bottom:18px">' + rangeChips + '<span class="spacer"></span>' +
      activeSel(f.asesor, { k: 'asesor', label: 'Asesor' }, 'users') +
      activeSel(f.project, { k: 'project', label: 'Proyecto' }, 'building') +
      activeSel(f.source, { k: 'source', label: 'Fuente' }, 'megaphone') +
      ((f.asesor || f.project || f.source) ? '<button class="chip on" data-action="dash-clear">' + Icon('x', { size: 13 }) + ' Limpiar</button>' : '') +
      '<button class="btn sm primary" data-action="export" data-kind="Dashboard">' + Icon('download', { size: 16 }) + ' Exportar</button></div>';

    const trend = a.trend;
    const kpis = [
      kpiCard('Total de leads', a.total, 'inbox', '#5B3FC4', trend, { sub: 'Últimos ' + state.rangeDays + ' días', delta: { pct: 12, dir: 'up' } }),
      kpiCard('% Contactados', a.total ? Math.round((a.contacted / a.total) * 100) : 0, 'phone-call', '#0F7E80', trend, { suffix: '%', sub: a.contacted + ' contactados' }),
      kpiCard('Tasa de conversión', a.conv, 'target', '#2F7D4A', trend, { decimals: 1, suffix: '%', sub: a.calificados + ' calificados', delta: { pct: 1, dir: 'up' } }),
      kpiCard('1.er contacto prom.', a.avgFc, 'clock', '#C46418', trend, { suffix: ' min', sub: a.avgFc <= SLA() ? 'Dentro del SLA (' + SLA() + ' min)' : 'Supera el SLA (' + SLA() + ' min)', delta: { pct: Math.abs(a.avgFc - SLA()), dir: a.avgFc <= SLA() ? 'up' : 'down' } }),
      kpiCard('Sin atender (SLA)', a.sla, 'alert-triangle', '#C00000', trend, { alert: true, action: 'go-sla', sub: a.sla ? 'Clic para ver la lista filtrada' : 'Todo atendido' })
    ].join('');

    const srcRows = a.bySource.map((s) => ({ label: s.label, icon: s.icon, value: s.count, meta: s.count + ' · conv ' + FMT.one(s.conv) + '%', color: 'var(--ink-1)', action: 'dash-source', valueKey: s.code }));
    const srcCard = '<div class="card"><div class="card-head"><h3>Leads por fuente</h3><span class="hint">Clic en una barra para filtrar</span></div>' +
      '<div class="card-body">' + (srcRows.length ? Charts.bars(srcRows) : UI.emptyState({ icon: 'globe', title: 'Sin datos' })) + '</div></div>';

    const funnelRows = a.funnel.map((s) => ({ label: PHASES[s.key].label, icon: PHASES[s.key].icon, value: s.count, color: PHASES[s.key].bg, fg: PHASES[s.key].accent, step: s.step, action: 'leads-phase', phase: s.key }));
    const funnelCard = '<div class="card"><div class="card-head"><h3>Embudo comercial</h3><span class="hint">% de paso entre etapas</span></div>' +
      '<div class="card-body">' + Charts.funnel(funnelRows) + '</div></div>';

    const advRows = a.byAdvisor.map((r) => '<tr data-action="dash-asesor" data-name="' + esc(r.name) + '">' +
      '<td class="cell-name"><div class="cell-flex">' + avatar(r.name, 'av-sm') + esc(r.name) + (r.available ? '' : ' <span class="badge badge-neutral">En pausa</span>') + '</div></td>' +
      '<td class="num">' + r.assigned + '</td><td class="num">' + r.contacted + '</td><td class="num">' + r.calificados + '</td>' +
      '<td><span class="conv-bar"><i style="width:' + Math.min(100, r.conv * 6) + '%"></i></span> ' + FMT.one(r.conv) + '%</td>' +
      '<td class="num">' + r.firstContact + ' min</td><td class="num">' + r.open + '</td></tr>').join('');
    const advCard = '<div class="card" style="margin-top:16px"><div class="card-head"><h3>Rendimiento por asesor</h3><span class="hint">Clic en una fila para filtrar por ese asesor</span></div>' +
      '<div class="table-wrap" style="border:0;box-shadow:none"><table class="data-table"><thead><tr><th>Asesor</th><th>Asignados</th><th>Contactados</th><th>Calificados</th><th>Conversión</th><th>1.er contacto</th><th>Carga abierta</th></tr></thead><tbody>' + advRows + '</tbody></table></div></div>';

    const trendCard = '<div class="card"><div class="card-head"><h3>Tendencia de ingreso</h3><span class="hint">Leads por día · últimos 14</span></div>' +
      '<div class="card-body">' + Charts.line(trend, { aria: 'Leads por día' }) + '</div></div>';

    const projRows = a.openTemps.map((p) => ({ label: TEMPS[p.t].label, icon: TEMPS[p.t].icon, value: p.count, meta: p.count + ' × ' + Math.round(p.prob * 100) + '% = ' + p.expected.toFixed(0), color: TEMPS[p.t].fg }));
    const projCard = '<div class="card"><div class="card-head"><h3>Proyección por temperatura</h3><span class="hint">Conversiones esperadas</span></div>' +
      '<div class="card-body">' + Charts.bars(projRows) + '<p class="muted" style="font-size:12px;margin-top:8px">Esperadas ≈ <b>' + a.expectedTotal + '</b> · probabilidades configurables en Configuración.</p></div></div>';

    return pageHead('Dashboard gerencial', null, null, 'Vista consolidada de captación, avance y cumplimiento del SLA.',
        '<span class="live" style="color:var(--ok)"><span class="dot"></span> Actualización en vivo (≤ 1 s)</span>') +
      filters +
      '<div class="grid-kpi">' + kpis + '</div>' +
      '<div class="grid grid-2" style="margin-top:16px">' + srcCard + funnelCard + '</div>' +
      advCard +
      '<div class="grid grid-2" style="margin-top:16px">' + trendCard + projCard + '</div>';
  }

  /* ============================== LEADS (GLOBAL) ========================= */
  function globalList() {
    const f = state.globalFilters, q = f.q.trim().toLowerCase();
    return state.leads.filter((l) => {
      if (f.asesor && l.asesorName !== f.asesor) return false;
      if (f.status && l.status !== f.status) return false;
      if (f.chip === 'sla' && !isOverdue(l)) return false;
      if (f.chip === 'reentry' && !l.reentry) return false;
      if (f.chip === 'caliente' && l.temperature !== 'CALIENTE') return false;
      if (q && !((l.fullName || '').toLowerCase().includes(q) || digits(l.phone).includes(digits(q)))) return false;
      return true;
    });
  }

  function leadsView() {
    const f = state.globalFilters;
    const list = globalList();
    const chips = [
      { k: '', label: 'Todos', count: state.leads.length },
      { k: 'sla', label: 'Sin atender', count: state.leads.filter(isOverdue).length },
      { k: 'caliente', label: 'Calientes', count: state.leads.filter((l) => l.temperature === 'CALIENTE').length },
      { k: 'reentry', label: 'Reingresos', count: state.leads.filter((l) => l.reentry).length }
    ].map((c) => '<button class="chip ' + (f.chip === c.k ? 'active' : '') + '" data-action="gchip" data-chip="' + c.k + '">' + esc(c.label) + '<span class="count">' + c.count + '</span></button>').join('');

    const rows = list.slice(0, 300).map((l) => {
      const over = isOverdue(l);
      const sel = state.selected.has(l.id);
      return '<tr data-action="open-drawer" data-id="' + l.id + '" class="' + (sel ? 'is-selected' : '') + '">' +
        (state.selectMode ? '<td data-action="toggle-select" data-id="' + l.id + '"><span class="ckbox ' + (sel ? 'on' : '') + '">' + (sel ? Icon('check', { size: 13 }) : '') + '</span></td>' : '') +
        '<td class="cell-name"><div class="cell-flex">' + avatar(l.fullName || 'Sin nombre', 'av-sm') + '<span>' + esc(l.fullName || 'Sin nombre') + (l.reentry ? ' ' + Icon('refresh', { size: 13 }) : '') + '</span></div></td>' +
        '<td class="num">' + esc(l.phone) + '</td><td>' + phaseChip(l.status) + '</td><td>' + tempBadge(l) + '</td>' +
        '<td>' + esc(l.project) + '</td><td>' + esc(l.asesorName) + '</td>' +
        '<td class="' + (over ? 'over' : '') + '">' + (over ? Icon('alert-triangle', { size: 13 }) + ' ' : '') + FMT.relative(l.lastActivityMin) + '</td></tr>';
    }).join('');

    const head = '<div class="toolbar" style="margin-top:12px">' + chips + '</div>' +
      '<div class="toolbar" style="margin-top:12px">' +
        '<div class="input-wrap" style="max-width:240px">' + Icon('search', { size: 16, cls: 'in-ic' }) +
          '<input class="input" style="height:34px" placeholder="Buscar nombre o teléfono…" data-action="search" data-key="global-leads" value="' + esc(f.q) + '"></div>' +
        '<button class="select' + (f.asesor ? ' is-active' : '') + '" data-action="gfilter-select" data-key="asesor">' + Icon('users', { size: 16, cls: 'sel-ic' }) + esc(f.asesor || 'Asesor') + Icon('chevron-down', { size: 15, cls: 'sel-caret' }) + '</button>' +
        '<button class="select' + (f.status ? ' is-active' : '') + '" data-action="gfilter-select" data-key="status">' + Icon('filter', { size: 16, cls: 'sel-ic' }) + esc(f.status ? PHASES[f.status].label : 'Estado') + Icon('chevron-down', { size: 15, cls: 'sel-caret' }) + '</button>' +
        '<span class="spacer"></span>' +
        (state.selectMode
          ? '<span class="muted" style="font-size:13px">' + state.selected.size + ' seleccionados</span>' +
            '<button class="btn sm primary" data-action="bulk-reassign">' + Icon('users', { size: 16 }) + ' Reasignar selección</button>' +
            '<button class="btn sm ghost" data-action="toggle-selectmode">Cancelar</button>'
          : '<button class="btn sm" data-action="toggle-selectmode">' + Icon('check-circle', { size: 16 }) + ' Seleccionar</button>') +
        '<button class="btn sm" data-action="export" data-kind="Leads">' + Icon('download', { size: 16 }) + ' Exportar</button>' +
      '</div>';

    return pageHead('Leads', null, null, FMT.number(list.length) + ' registros · vista global de todos los asesores y fuentes.') + head +
      '<div class="table-wrap" style="margin-top:12px"><table class="data-table"><thead><tr>' +
      (state.selectMode ? '<th></th>' : '') +
      '<th>Nombre</th><th>Teléfono</th><th>Estado</th><th>Temperatura</th><th>Proyecto</th><th>Asesor</th><th>Último contacto</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="8">' + UI.emptyState({ icon: 'search', title: 'Sin resultados', text: 'Ajusta los filtros o limpia la búsqueda.' }) + '</td></tr>') +
      '</tbody></table></div>';
  }

  /* ================================ EQUIPO =============================== */
  function teamView() {
    const cards = advisors.map((a) => {
      const mine = state.leads.filter((l) => l.asesorId === a.id);
      const cal = mine.filter((l) => l.status === 'CALIFICADO').length;
      const conv = mine.length ? (cal / mine.length) * 100 : 0;
      const open = mine.filter(isOpen).length;
      const overdue = mine.filter(isOverdue).length;
      const on = isAvailable(a.id);
      const load = Math.min(100, (open / 30) * 100);
      return '<div class="card card-pad" style="display:flex;flex-direction:column;gap:12px">' +
        '<div class="row-line">' + avatar(a.name, 'av-lg') +
          '<div style="flex:1"><div style="font-weight:600">' + esc(a.name) + '</div>' +
          '<div class="muted" style="font-size:12px">' + (on ? 'Disponible' : 'En pausa') + ' · peso ' + (a.weight || 1) + '</div></div>' +
          '<label class="switch" data-tip="Recibir leads por Round-Robin"><input type="checkbox" data-action="toggle-availability" data-id="' + a.id + '" ' + (on ? 'checked' : '') + '><span class="track"></span></label>' +
        '</div>' +
        '<div class="grid grid-3" style="gap:10px">' +
          '<div><div class="muted" style="font-size:12px">Carga abierta</div><div class="num" style="font-size:20px;font-weight:700">' + open + '</div></div>' +
          '<div><div class="muted" style="font-size:12px">Conversión</div><div class="num" style="font-size:20px;font-weight:700">' + FMT.one(conv) + '%</div></div>' +
          '<div><div class="muted" style="font-size:12px">Fuera SLA</div><div class="num" style="font-size:20px;font-weight:700;' + (overdue ? 'color:var(--brand)' : '') + '">' + overdue + '</div></div>' +
        '</div>' +
        '<div class="hbar-track"><i class="hbar-fill chart-bar" style="--w:' + load.toFixed(0) + '%;background:var(--ink-1)"></i></div>' +
      '</div>';
    }).join('');
    return pageHead('Equipo', null, null, advisors.length + ' asesores · distribución ' + esc(settings.assignment_strategy) + ' · la disponibilidad afecta la asignación automática.') +
      '<div class="grid grid-3">' + cards + '</div>';
  }

  /* =============================== INGESTA =============================== */
  if (!state._bulk) state._bulk = null;

  function ingestionView() {
    const form = state._ingestForm || { source: 'META_ADS', project: projects[0], phone: '' };
    state._ingestForm = form;
    const srcLabel = (DB.sources.find((s) => s.code === form.source) || {}).label || 'Fuente';

    const steps = [
      { k: 0, label: 'Validando teléfono' },
      { k: 1, label: 'Deduplicando contacto' },
      { k: 2, label: 'Asignando asesor' }
    ];
    const step = (state._ingest && state._ingest.step) || -1;
    const stepHTML = steps.map((s) => {
      const done = step > s.k || (step === 3);
      const active = step === s.k;
      return '<div class="ingest-step ' + (done ? 'done' : '') + '">' +
        '<span class="is-ic">' + (done ? Icon('check', { size: 16, animate: 'draw' }) : (active ? Icon('spinner', { size: 16, cls: 'ic-spin-fast' }) : Icon('clock', { size: 15 }))) + '</span>' +
        esc(s.label) + '</div>';
    }).join('');

    const result = state._ingest && state._ingest.result;
    const resultHTML = result ? resultCardHTML(result) : '';
    const stepperHTML = (step >= 0 && !result) ? '<div class="card card-pad" style="margin-top:14px"><div style="font-weight:600;margin-bottom:8px">Procesando…</div>' + stepHTML + '</div>' : '';

    const left = '<div class="card card-pad">' +
      '<div class="card-head" style="padding:0 0 12px"><h3>Alta rápida</h3><span class="hint">Un lead, con las reglas aplicadas</span></div>' +
      '<div class="field"><label for="in-phone">Teléfono</label><div class="input-wrap">' + Icon('phone', { size: 16, cls: 'in-ic' }) +
        '<input id="in-phone" class="input num" data-action="phone-input" placeholder="987 654 321" value="' + esc(form.phone) + '" autocomplete="off"></div></div>' +
      '<div class="norm-box" style="margin-bottom:14px">E.164 normalizado <span class="spacer"></span><b id="in-norm">' + esc(normalizePhone(form.phone) || '—') + '</b></div>' +
      '<div class="field"><label>Fuente</label><button class="select" style="width:100%;justify-content:flex-start" data-action="ingest-select" data-key="source">' +
        Icon((DB.sources.find((s) => s.code === form.source) || {}).iconKey || 'globe', { size: 16, cls: 'sel-ic' }) + esc(srcLabel) +
        '<span class="spacer"></span>' + Icon('chevron-down', { size: 15, cls: 'sel-caret' }) + '</button></div>' +
      '<div class="field"><label>Proyecto</label><button class="select" style="width:100%;justify-content:flex-start" data-action="ingest-select" data-key="project">' +
        Icon('building', { size: 16, cls: 'sel-ic' }) + esc(form.project) + '<span class="spacer"></span>' + Icon('chevron-down', { size: 15, cls: 'sel-caret' }) + '</button></div>' +
      '<div class="field"><label for="in-user">Usuario de red social (opcional)</label><input id="in-user" class="input" data-action="ingest-user" placeholder="usuario" value="' + esc(form.username || '') + '"></div>' +
      '<button class="btn primary block" data-action="quick-lead">' + Icon('rocket', { size: 17, cls: 'btn-ic' }) + ' Crear y asignar lead</button>' +
      stepperHTML + resultHTML +
      '<p class="proto-note" style="text-align:left">Al guardar: se normaliza el teléfono, se <b>deduplica</b>, se marca <b>Reingreso</b> si existe y se aplica <b>adscripción de 30 días</b> o <b>Round-Robin</b> entre asesores disponibles.</p>' +
      '</div>';

    const right = '<div class="stack">' +
      '<div class="card card-pad"><div class="card-head" style="padding:0 0 12px"><h3>Carga masiva</h3><span class="hint">CSV/XLSX · columnas por nombre de cabecera</span></div>' +
        '<div class="dropzone" data-action="pick-file" role="button" tabindex="0"><div class="dz-icon">' + Icon('upload', { size: 24 }) + '</div>' +
        '<div><b>Arrastra un archivo aquí</b> o haz clic para simular la carga</div>' +
        '<div class="muted" style="font-size:12px;margin-top:6px">Máx. 5 MB · 5 000 filas · dedupe y adscripción aplicadas</div></div>' +
        '<div id="preview-zone">' + (state._bulk ? bulkPreviewHTML() : '') + '</div></div>' +
      '<div class="card"><div class="card-head" style="padding:15px 18px 10px"><h3>Historial de cargas</h3></div>' +
        '<div class="table-wrap" style="border:0;box-shadow:none"><table class="data-table"><thead><tr><th>Archivo</th><th>Subido por</th><th>Filas</th><th>Aceptados</th><th>Reingresos</th><th>Rechazados</th><th>Estado</th></tr></thead><tbody>' +
        state.batches.map((b) => '<tr><td class="cell-name">' + esc(b.file) + '</td><td>' + esc(b.by) + '</td><td class="num">' + b.rows + '</td><td class="num">' + b.ok + '</td><td class="num">' + b.reentry + '</td><td class="num">' + b.bad + '</td>' +
          '<td>' + (b.status === 'ok' ? '<span class="badge badge-ok">' + Icon('check-circle', { size: 13 }) + ' COMPLETADO</span>' : '<span class="badge badge-sla">' + Icon('alert-triangle', { size: 13 }) + ' CON ERRORES</span>') + '</td></tr>').join('') +
        '</tbody></table></div></div>' +
      '</div>';

    return pageHead('Ingesta de leads', null, null, 'Alta individual, carga masiva y trazabilidad de lotes.') +
      '<div class="ingest-grid">' + left + right + '</div>';
  }

  function resultCardHTML(r) {
    if (r.error) {
      return '<div class="result-card bad" style="margin-top:14px"><div class="result-head" style="color:var(--brand)">' + Icon('x-circle', { size: 20 }) + ' No se pudo crear el lead</div>' +
        '<p class="muted">' + esc(r.error) + '</p></div>';
    }
    return '<div class="result-card ok" style="margin-top:14px"><div class="result-head" style="color:var(--ok)">' + Icon('check-circle', { size: 20, animate: 'draw' }) +
      ' Lead ' + (r.reentry ? 'marcado como reingreso' : 'creado') + '</div>' +
      '<div class="stack-sm">' +
        '<div class="inline">' + Icon('user', { size: 15 }) + ' <span class="muted">Cliente:</span> <b>' + esc(r.name || 'Sin nombre') + '</b></div>' +
        '<div class="inline">' + Icon('phone', { size: 15 }) + ' <span class="muted">Teléfono:</span> <b class="num">' + esc(r.phone) + '</b></div>' +
        '<div class="inline">' + Icon('users', { size: 15 }) + ' <span class="muted">Asignado a:</span> <b>' + esc(r.advisor) + '</b></div>' +
        '<div class="inline">' + Icon('info', { size: 15 }) + ' <span class="muted">Motivo:</span> <b>' + esc(r.reason) + '</b></div>' +
      '</div>' +
      '<div class="row-line" style="margin-top:12px">' +
        '<button class="btn primary sm" data-action="view-as" data-asesor="' + r.advisorId + '">' + Icon('eye', { size: 15 }) + ' Ver como ' + esc(r.advisor.split(' ')[0]) + '</button>' +
        '<button class="btn sm" data-action="ingest-again">' + Icon('plus', { size: 15 }) + ' Registrar otro</button>' +
      '</div></div>';
  }

  function bulkPreviewHTML() {
    const rows = state._bulk.rows;
    const ok = rows.filter((r) => r.ok).length;
    const reentry = rows.filter((r) => r.ok && r.reentry).length;
    const bad = rows.length - ok;
    return '<div style="margin-top:16px"><div class="inline"><b>Vista previa</b> <span class="muted" style="font-size:12px">columnas detectadas: telefono, nombre, fuente, campana, proyecto</span></div>' +
      '<div class="table-wrap" style="margin-top:10px;border:1px solid var(--line)"><table class="data-table"><thead><tr><th>Fila</th><th>Teléfono</th><th>Nombre</th><th>Resultado</th></tr></thead><tbody>' +
      rows.map((r, i) => '<tr><td class="num">' + (i + 2) + '</td><td class="num">' + esc(r.t) + '</td><td>' + esc(r.n) + '</td>' +
        '<td>' + (r.ok ? '<span class="badge badge-ok">' + (r.reentry ? Icon('refresh', { size: 12 }) + ' Reingreso' : Icon('check', { size: 12 }) + ' Válido') + '</span>' + (r.msg ? ' <span class="muted" style="font-size:12px">' + esc(r.msg) + '</span>' : '')
          : '<span class="badge badge-sla">' + Icon('x-circle', { size: 12 }) + ' ' + esc(r.msg) + '</span>') + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<div class="row-line" style="margin-top:12px"><span class="muted" style="font-size:13px">' + ok + ' válidos (' + reentry + ' reingresos) · ' + bad + ' rechazados</span><span class="spacer"></span>' +
      '<button class="btn ghost sm" data-action="cancel-batch">Cancelar</button>' +
      '<button class="btn primary sm" data-action="confirm-batch">' + Icon('upload', { size: 15 }) + ' Confirmar carga</button></div>' +
      '<div class="progress" style="margin-top:12px"><i id="batch-bar" style="width:0%"></i></div></div>';
  }

  function ingestZone() {
    const zone = document.getElementById('ingest-zone');
    return zone;
  }

  let ingestToken = 0;
  function startIngest() {
    const token = ++ingestToken;
    state._ingest = { step: 0, result: null };
    render();
    setTimeout(() => { if (token !== ingestToken || !state._ingest) return; state._ingest.step = 1; ingestUpdate(); }, 380);
    setTimeout(() => { if (token !== ingestToken || !state._ingest) return; state._ingest.step = 2; ingestUpdate(); }, 760);
    setTimeout(() => { if (token !== ingestToken) return; finishIngest(); }, 1180);
  }
  function ingestUpdate() { render(); }

  function finishIngest() {
    const form = state._ingestForm;
    if (!form || !state._ingest) return;
    const norm = normalizePhone(form.phone);
    if (!norm) {
      state._ingest = { step: 3, result: { error: 'El teléfono no es válido. Debe tener 9 dígitos y empezar con 9 (móvil de Perú).' } };
      logAudit('INGEST_REJECT', 'lead', 'Teléfono inválido: ' + form.phone);
      UI.toast('Teléfono inválido: no se creó el lead.', { type: 'err' });
      render(); return;
    }
    const existing = leadByPhone(form.phone);
    const adscriptionMin = settings.adscription_days * 1440;
    let advisorRow, reason, reentry = false, lead;

    if (existing) {
      reentry = true;
      if (existing.assignedMinAgo < adscriptionMin) {
        advisorRow = advisor(existing.asesorId) || advisors[0];
        reason = 'Adscripción ' + settings.adscription_days + ' días (mismo asesor)';
      } else {
        advisorRow = assignRoundRobin();
        reason = 'Round-Robin (reingreso ≥ ' + settings.adscription_days + ' días)';
      }
      existing.reentry = true; existing.assignedMinAgo = 0; existing.lastActivityMin = 0;
      existing.asesorId = advisorRow.id; existing.asesorName = advisorRow.name;
      existing.source = DB.sources.find((s) => s.code === form.source) || existing.source;
      lead = existing;
    } else {
      advisorRow = assignRoundRobin();
      reason = 'Round-Robin entre asesores disponibles';
      lead = {
        id: 'L' + String(900000 + state.leads.length), fullName: null, phone: norm,
        source: DB.sources.find((s) => s.code === form.source) || DB.sources[0],
        project: form.project, campaign: 'Alta manual',
        asesorId: advisorRow.id, asesorName: advisorRow.name, status: 'NUEVO', temperature: 'FRIO',
        reentry: false, assignedMinAgo: 0, ingestedMinAgo: 0, lastActivityMin: 0, firstContactMin: null,
        visitInMin: null, discardReason: null, observations: null,
        externalUsername: form.username || null
      };
      state.leads.unshift(lead);
    }

    state._ingest = { step: 3, result: { name: lead.fullName, phone: lead.phone, advisor: advisorRow.name, advisorId: advisorRow.id, reason, reentry } };
    state.flashId = lead.id;
    state.demoFlags.create = true;
    logAudit(reentry ? 'REENTRY' : 'INSERT', 'lead', lead.phone + ' → ' + advisorRow.name + ' (' + reason + ')');
    notify(reentry ? 'reentry' : 'ingestion', (reentry ? 'Reingreso: ' : 'Nuevo lead: ') + lead.phone + ' → ' + advisorRow.name);
    UI.toast(reentry ? 'Reingreso detectado y reasignado.' : 'Lead creado y asignado.', { type: 'ok' });
    render();
    setTimeout(() => { state.flashId = null; }, 1600);
  }

  function pickBulk() {
    state._bulk = { rows: [
      { t: '+51 987 111 222', n: 'María Pérez', ok: true, msg: '', reentry: false },
      { t: '987654321', n: 'Luis Ortega', ok: true, msg: 'normalizado a E.164', reentry: false },
      { t: 'abc-def', n: 'Sin nombre', ok: false, msg: 'Teléfono inválido' },
      { t: (state.leads[3] ? state.leads[3].phone : '+51 933 411 507'), n: 'Reingreso demo', ok: true, msg: 'reingreso · adscripción 30 d', reentry: true },
      { t: '12', n: 'Jorge Salas', ok: false, msg: 'menos de 9 dígitos' }
    ] };
    render();
  }

  function runBatch() {
    const rows = state._bulk.rows;
    let p = 0;
    const bar = document.getElementById('batch-bar');
    const it = setInterval(() => {
      p += 20; if (bar) bar.style.width = p + '%';
      if (p >= 100) {
        clearInterval(it);
        const ok = rows.filter((r) => r.ok).length, reentry = rows.filter((r) => r.ok && r.reentry).length, bad = rows.length - ok;
        state.batches.unshift({ file: 'carga_' + new Date().toISOString().slice(0, 10) + '.csv', by: 'Recepción / Marketing', rows: rows.length, ok: ok - reentry, reentry, bad, status: bad ? 'warn' : 'ok' });
        logAudit('BATCH', 'lead', rows.length + ' filas · ' + ok + ' aceptadas · ' + reentry + ' reingresos · ' + bad + ' rechazadas');
        notify('ingestion', 'Carga masiva: ' + ok + ' aceptadas, ' + bad + ' rechazadas');
        state._bulk = null;
        render();
        UI.toast('Lote procesado: ' + ok + ' aceptadas · ' + reentry + ' reingresos · ' + bad + ' rechazadas.', { type: ok ? 'ok' : 'warn' });
      }
    }, 200);
  }

  /* =============================== AUDITORÍA ============================= */
  function auditView() {
    const f = state._auditF || (state._auditF = { actor: '', action: '', q: '' });
    let list = state.audit.filter((e) => {
      if (f.actor && e.actor !== f.actor) return false;
      if (f.action && e.action !== f.action) return false;
      if (f.q && !(e.detail + e.entity + e.actor).toLowerCase().includes(f.q.toLowerCase())) return false;
      return true;
    });
    const actions = Array.from(new Set(state.audit.map((e) => e.action)));
    const actors = Array.from(new Set(state.audit.map((e) => e.actor)));
    const bad = (x) => ['ACCOUNT_LOCKED', 'PERMISSION_DENIED', 'INGEST_REJECT'].includes(x);

    return pageHead('Auditoría', null, null, 'Registro inmutable de todas las acciones de la sesión.') +
      '<div class="card card-pad" style="display:flex;gap:10px;align-items:center;margin-bottom:16px">' +
        Icon('lock', { size: 18 }) + '<b>Registro inmutable</b><span class="muted" style="font-size:13px">Solo lectura · cada acción de la sesión queda registrada (quién · qué · cuándo)</span></div>' +
      '<div class="toolbar" style="margin-bottom:12px">' +
        '<div class="input-wrap" style="max-width:240px">' + Icon('search', { size: 16, cls: 'in-ic' }) +
          '<input class="input" style="height:34px" placeholder="Buscar en el detalle…" data-action="audit-q" value="' + esc(f.q) + '"></div>' +
        '<button class="select' + (f.actor ? ' is-active' : '') + '" data-action="audit-select" data-key="actor">' + Icon('users', { size: 16, cls: 'sel-ic' }) + esc(f.actor || 'Actor') + Icon('chevron-down', { size: 15, cls: 'sel-caret' }) + '</button>' +
        '<button class="select' + (f.action ? ' is-active' : '') + '" data-action="audit-select" data-key="action">' + Icon('filter', { size: 16, cls: 'sel-ic' }) + esc(f.action || 'Acción') + Icon('chevron-down', { size: 15, cls: 'sel-caret' }) + '</button>' +
        (f.actor || f.action || f.q ? '<button class="chip on" data-action="audit-clear">' + Icon('x', { size: 13 }) + ' Limpiar</button>' : '') +
      '</div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Cuándo</th><th>Actor</th><th>Rol</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead><tbody>' +
      (list.map((e) => '<tr><td>' + FMT.relative((Date.now() - e.at) / 60000) + '</td><td class="cell-name">' + esc(e.actor) + '</td><td>' + esc(ROLE_LABEL[e.role] || e.role || '—') + '</td>' +
        '<td><span class="badge ' + (bad(e.action) ? 'badge-sla' : 'badge-neutral') + '">' + esc(e.action) + '</span></td><td>' + esc(e.entity) + '</td><td>' + esc(e.detail) + '</td></tr>').join('') ||
        '<tr><td colspan="6">' + UI.emptyState({ icon: 'shield', title: 'Sin registros', text: 'No hay acciones que coincidan con los filtros.' }) + '</td></tr>') +
      '</tbody></table></div>';
  }

  /* ================================ REPORTES ============================= */
  function reportsView() {
    const items = [
      ['Leads consolidados', 'Todas las altas del periodo con su estado y asesor.', 'list'],
      ['Rendimiento por asesor', 'Conversión y tiempo de primer contacto por persona.', 'users'],
      ['Leads por fuente', 'Volumen y calidad de cada canal de captación.', 'megaphone'],
      ['Embudo comercial', 'Conteo y % de paso entre etapas.', 'filter'],
      ['Leads sin atender (SLA)', 'Casos que superaron el SLA de primer contacto.', 'alert-triangle']
    ];
    return pageHead('Reportes y exportaciones', null, null, 'En el sistema final el archivo se genera en segundo plano y se descarga con una URL temporal de 15 min.') +
      '<div class="card" style="max-width:760px"><div class="card-body">' +
      items.map(([t, d, ic]) => '<div class="row-line" style="justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--line-2)">' +
        '<div class="inline">' + Icon(ic, { size: 18, cls: 'hbar-ic' }) + '<span><div style="font-weight:600">' + esc(t) + '</div><div class="muted" style="font-size:12px">' + esc(d) + '</div></span></div>' +
        '<span class="row-line">' +
          '<button class="btn sm" data-action="export" data-kind="' + esc(t) + '" data-fmt="CSV">CSV</button>' +
          '<button class="btn sm" data-action="export" data-kind="' + esc(t) + '" data-fmt="XLSX">XLSX</button>' +
          '<button class="btn sm" data-action="export" data-kind="' + esc(t) + '" data-fmt="PDF">PDF</button>' +
        '</span></div>').join('') +
      '</div></div>';
  }

  /* ================================ USUARIOS ============================= */
  function usersView() {
    const rows = Object.keys(state.accounts).map((email) => {
      const acc = state.accounts[email];
      const role = /gerente/.test(email) ? 'GERENTE' : /admin/.test(email) ? 'SUPERADMIN' : /recepcion/.test(email) ? 'RECEPCION' : 'ASESOR';
      const name = /gerente/.test(email) ? 'Gerente General' : /admin/.test(email) ? 'Administrador' : /recepcion/.test(email) ? 'Recepción / Marketing' : /jorge/.test(email) ? 'Jorge Salas' : 'Aline Reyes';
      return '<tr><td class="cell-name"><div class="cell-flex">' + avatar(name, 'av-sm') + esc(name) + '</div></td><td>' + esc(email) + '</td>' +
        '<td><span class="badge badge-neutral">' + esc(ROLE_LABEL[role]) + '</span></td>' +
        '<td>' + (acc.locked ? '<span class="badge badge-sla">' + Icon('lock', { size: 13 }) + ' Bloqueado (5 intentos)</span>' : '<span class="badge badge-ok">' + Icon('check-circle', { size: 13 }) + ' Activo</span>') + '</td>' +
        '<td><span class="row-line">' +
          (acc.locked ? '<button class="btn sm primary" data-action="unlock" data-email="' + esc(email) + '">' + Icon('unlock', { size: 15 }) + ' Desbloquear</button>' : '') +
          '<button class="btn sm" data-action="reset-pass" data-email="' + esc(email) + '">' + Icon('refresh', { size: 15 }) + ' Restablecer clave</button>' +
        '</span></td></tr>';
    }).join('');
    return pageHead('Usuarios', null, null, 'Control de acceso (RBAC), desbloqueo de cuentas y restablecimiento de contraseña.',
        '<button class="btn primary" data-action="new-user">' + Icon('plus', { size: 17, cls: 'btn-ic' }) + ' Crear usuario</button>') +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function newUserModal() {
    const box = UI.modal('<div class="modal-head"><h3>Crear usuario</h3></div>' +
      '<div class="modal-body"><div class="field"><label>Nombre completo</label><input class="input" id="nu-name" data-autofocus placeholder="Nombre y apellido"></div>' +
      '<div class="field"><label>Correo corporativo</label><input class="input" id="nu-email" placeholder="persona@empresa.com"></div>' +
      '<div class="field"><label>Rol</label><div class="toolbar" id="nu-role">' + Object.keys(ROLE_LABEL).map((r, i) => '<button class="chip ' + (i === 0 ? 'active' : '') + '" data-role="' + r + '">' + ROLE_LABEL[r] + '</button>').join('') + '</div></div></div>' +
      '<div class="modal-foot"><button class="btn ghost" data-cancel>Cancelar</button><button class="btn primary" data-ok>Crear usuario</button></div>');
    let role = 'ASESOR';
    box.querySelectorAll('#nu-role .chip').forEach((b) => b.onclick = () => { role = b.dataset.role; box.querySelectorAll('#nu-role .chip').forEach((x) => x.classList.toggle('active', x === b)); });
    box.querySelector('[data-cancel]').onclick = UI.closeModal;
    box.querySelector('[data-ok]').onclick = () => {
      const name = box.querySelector('#nu-name').value.trim() || 'Nuevo usuario';
      const email = box.querySelector('#nu-email').value.trim() || ('nuevo' + Date.now() + '@crm.test');
      state.accounts[email] = { locked: false };
      UI.closeModal();
      logAudit('CREATE_USER', 'user', name + ' (' + email + ') · ' + ROLE_LABEL[role]);
      notify('manager', 'Usuario creado: ' + name);
      render();
      UI.toast('Usuario ' + name + ' creado.', { type: 'ok' });
    };
  }

  /* ============================= CONFIGURACIÓN =========================== */
  function settingsView() {
    const groups = [
      { title: 'Asignación de leads', desc: 'Cómo se reparten los leads entre el equipo.', keys: [
        ['adscription_days', settings.adscription_days + ' días', 'Días en que un reingreso conserva a su asesor original.'],
        ['assignment_strategy', settings.assignment_strategy, 'Estrategia de reparto (Round-Robin).']
      ] },
      { title: 'SLA y temperatura', desc: 'Expectativas de respuesta y probabilidad de cierre.', keys: [
        ['first_contact_sla_minutes', settings.first_contact_sla_minutes + ' min', 'Tiempo máximo para el primer contacto.'],
        ['temperature_probability', 'Caliente ' + Math.round(settings.temperature_probability.CALIENTE * 100) + '% · Tibio ' + Math.round(settings.temperature_probability.TIBIO * 100) + '% · Frío ' + Math.round(settings.temperature_probability.FRIO * 100) + '%', 'Probabilidad de cierre por temperatura.']
      ] },
      { title: 'Sesión y seguridad', desc: 'Políticas de acceso.', keys: [
        ['max_failed_logins', '5 intentos', 'Intentos fallidos antes de bloquear la cuenta.'],
        ['idle_timeout_minutes', '60 min', 'Cierre de sesión por inactividad.'],
        ['access_token_minutes', '15 min', 'Vigencia del access token.']
      ] },
      { title: 'Regional', desc: 'Parámetros de localización.', keys: [
        ['business_timezone', 'America/Lima', 'Zona horaria del negocio.'],
        ['default_phone_region', settings.default_phone_region + ' (' + settings.country_code + ')', 'País para normalizar teléfonos.']
      ] }
    ];
    return pageHead('Configuración', null, null, 'Valores configurables, nunca en código. Los cambios se aplican a todo el prototipo.') +
      groups.map((g) => '<div class="card" style="max-width:820px;margin-bottom:16px"><div class="card-head"><h3>' + esc(g.title) + '</h3><span class="hint">' + esc(g.desc) + '</span></div>' +
        '<div class="card-body">' + g.keys.map(([k, v, d]) => '<div class="row-line" style="padding:12px 0;border-bottom:1px solid var(--line-2);align-items:flex-start">' +
          '<div style="flex:1"><div style="font-weight:600">' + esc(k) + '</div><div class="muted" style="font-size:12px">' + esc(d) + '</div></div>' +
          '<span class="badge badge-neutral num">' + esc(String(v)) + '</span></div>').join('') + '</div></div>').join('') +
      '<button class="btn primary" data-action="save-settings">' + Icon('check', { size: 17, cls: 'btn-ic' }) + ' Guardar configuración</button>';
  }

  /* ============================== PALETA (Ctrl+K) ======================== */
  function roleRoutes() {
    return (NAV[state.user.role] || []).reduce((a, g) => a.concat(g.items.map((i) => ({ route: i.route, label: i.label, icon: i.icon, section: g.section }))), []);
  }

  function openCmdk() {
    if (document.getElementById('cmdk')) return;
    const el = document.createElement('div');
    el.id = 'cmdk';
    el.className = 'cmdk-backdrop';
    el.innerHTML = '<div class="cmdk" role="dialog" aria-label="Búsqueda rápida">' +
      '<div class="cmdk-input">' + Icon('search', { size: 19 }) + '<input id="cmdk-q" placeholder="Buscar leads por nombre o teléfono, o saltar a una pantalla…" autocomplete="off">' +
      '<kbd style="font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:5px;padding:1px 6px">Esc</kbd></div>' +
      '<div class="cmdk-list" id="cmdk-list"></div></div>';
    document.body.appendChild(el);
    const input = el.querySelector('#cmdk-q');
    el.addEventListener('mousedown', (e) => { if (e.target === el) closeCmdk(); });
    input.addEventListener('input', () => renderCmdk(input.value));
    input.addEventListener('keydown', (e) => {
      const items = Array.from(el.querySelectorAll('.cmdk-item'));
      const idx = items.findIndex((i) => i.classList.contains('active'));
      if (e.key === 'ArrowDown') { e.preventDefault(); moveCmdk(items, idx, 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveCmdk(items, idx, -1); }
      else if (e.key === 'Enter') { e.preventDefault(); (items[Math.max(0, idx)] || items[0]) && (items[Math.max(0, idx)] || items[0]).click(); }
    });
    renderCmdk('');
    setTimeout(() => input.focus(), 30);
  }
  function moveCmdk(items, idx, d) {
    if (!items.length) return;
    items.forEach((i) => i.classList.remove('active'));
    const n = (idx + d + items.length) % items.length;
    items[n].classList.add('active');
    items[n].scrollIntoView({ block: 'nearest' });
  }
  function renderCmdk(q) {
    const list = document.getElementById('cmdk-list');
    if (!list) return;
    q = (q || '').trim().toLowerCase();
    const routes = roleRoutes().map((r) => ({ type: 'route', ...r }));
    const leads = q.length >= 1 ? state.leads.filter((l) => (l.fullName || '').toLowerCase().includes(q) || digits(l.phone).includes(digits(q))).slice(0, 8) : [];
    let html = '';
    const scr = routes.filter((r) => !q || r.label.toLowerCase().includes(q));
    if (scr.length) html += '<div class="cmdk-sec">Pantallas</div>' + scr.map((r) =>
      '<div class="cmdk-item" data-kind="route" data-route="' + r.route + '"><span class="ci-ic">' + Icon(r.icon, { size: 17 }) + '</span>' +
      '<span class="ci-main"><span class="ci-title">' + esc(r.label) + '</span><span class="ci-sub">' + esc(r.section) + '</span></span></div>').join('');
    if (leads.length) html += '<div class="cmdk-sec">Leads</div>' + leads.map((l) =>
      '<div class="cmdk-item" data-kind="lead" data-id="' + l.id + '"><span class="ci-ic">' + Icon(l.source.iconKey, { size: 16 }) + '</span>' +
      '<span class="ci-main"><span class="ci-title">' + esc(l.fullName || 'Sin nombre') + '</span><span class="ci-sub">' + esc(l.phone) + ' · ' + esc(l.project) + '</span></span>' +
      phaseChip(l.status) + '</div>').join('');
    if (!html) html = '<div class="cmdk-empty">Sin resultados para "' + esc(q) + '"</div>';
    list.innerHTML = html;
    list.querySelectorAll('.cmdk-item').forEach((it) => it.addEventListener('click', () => {
      if (it.dataset.kind === 'route') navigate(it.dataset.route);
      else { const id = it.dataset.id; const l = getLead(id); if (l && state.user.role === 'ASESOR') navigate('pipeline'); openDrawer(id); }
      closeCmdk();
    }));
    const first = list.querySelector('.cmdk-item'); if (first) first.classList.add('active');
  }
  function closeCmdk() { const e = document.getElementById('cmdk'); if (e) e.remove(); }

  /* ============================ NOTIFICACIONES =========================== */
  function notifIcon(kind) { return NOTIF_ICON[kind] || 'bell'; }
  function openNotifPanel(anchor) {
    const items = state.notifs.length ? state.notifs.map((n) => '<div class="notif-item ' + (n.read ? '' : 'unread') + '">' +
      '<span class="notif-ic">' + Icon(notifIcon(n.kind), { size: 16 }) + '</span>' +
      '<span class="notif-body"><span class="notif-text">' + esc(n.text) + '</span><span class="notif-time">' + FMT.relative((Date.now() - n.at) / 60000) + '</span></span></div>').join('')
      : '<div class="notif-empty">' + UI.emptyState({ icon: 'bell', title: 'Sin notificaciones', text: 'Aquí verás asignaciones, reingresos y alertas de SLA.' }) + '</div>';
    UI.popover(anchor, '<div class="notif-head"><h4>Notificaciones</h4>' +
      (unreadCount() ? '<button class="btn sm ghost" data-action="notif-mark-all">Marcar todas como leídas</button>' : '') + '</div>' +
      '<div class="notif-list">' + items + '</div>', { cls: 'notif-panel' });
  }

  /* ================================ AYUDA ================================ */
  function openHelpMenu(anchor) {
    UI.menu(anchor, [
      { icon: 'play', label: 'Ver tour guiado', value: 'tour' },
      { icon: 'report', label: 'Guía de mi rol', value: 'guide' },
      { icon: 'info', label: 'Atajos de teclado', value: 'keys' },
      { icon: 'help', label: 'Reglas explicadas', value: 'rules' },
      { sep: true },
      { icon: 'info', label: 'Sobre el prototipo', value: 'about' }
    ], (v) => {
      if (v === 'tour') startTour(state.user.role, true);
      else if (v === 'guide') showGuideModal();
      else if (v === 'keys') showKeysModal();
      else if (v === 'rules') showRulesModal();
      else if (v === 'about') showAboutModal();
    });
  }

  function showGuideModal() {
    const g = ROLE_GUIDE[state.user.role];
    UI.modal('<div class="modal-head"><h3>Guía de ' + esc(ROLE_LABEL[state.user.role]) + '</h3></div>' +
      '<div class="modal-body"><p class="modal-text">' + esc(g.intro) + '</p><div class="stack-sm" style="margin-top:12px">' +
      g.points.map((p) => '<div class="inline">' + Icon('check-circle', { size: 16, cls: 'hbar-ic' }) + '<span>' + esc(p) + '</span></div>').join('') +
      '</div></div><div class="modal-foot"><button class="btn primary" data-cancel>Entendido</button></div>');
    const b = modalRoot.querySelector('[data-cancel]'); if (b) b.onclick = UI.closeModal;
  }
  function showKeysModal() {
    const keys = [['Ctrl / Cmd + K', 'Abrir la búsqueda rápida'], ['Esc', 'Cerrar paneles y diálogos'], ['D', 'Mostrar u ocultar el modo demostración'], ['Tab / Shift+Tab', 'Navegar entre controles'], ['Enter', 'Activar el control enfocado'], ['Flechas', 'Recorrer listas y menús']];
    UI.modal('<div class="modal-head"><h3>Atajos de teclado</h3></div><div class="modal-body">' +
      keys.map(([k, d]) => '<div class="row-line" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line-2)"><span>' + esc(d) + '</span><span class="badge badge-neutral">' + esc(k) + '</span></div>').join('') +
      '</div><div class="modal-foot"><button class="btn primary" data-cancel>Entendido</button></div>', { cls: 'modal-sm' });
    const b = modalRoot.querySelector('[data-cancel]'); if (b) b.onclick = UI.closeModal;
  }
  function showRulesModal() {
    const rules = [
      ['Nombre obligatorio', 'Para pasar a VISITA AGENDADA, NEGOCIACIÓN o CALIFICADO el lead necesita nombre y apellido.'],
      ['Estados finales', 'CALIFICADO y DESECHADO no se reabren desde Asesor; solo Gerencia puede reactivarlos.'],
      ['Motivo de descarte', 'Mover a DESECHADO exige elegir un motivo.'],
      ['SLA de 15 min', 'El primer contacto debe ocurrir dentro de los primeros 15 minutos.'],
      ['Adscripción 30 días', 'Un reingreso antes de 30 días conserva al mismo asesor.'],
      ['Round-Robin', 'Los leads nuevos se reparten entre asesores disponibles, omitiendo a quienes están en pausa.']
    ];
    UI.modal('<div class="modal-head"><h3>Reglas del negocio, explicadas</h3></div><div class="modal-body"><div class="stack-sm">' +
      rules.map(([t, d]) => '<div><div style="font-weight:600">' + esc(t) + '</div><div class="muted" style="font-size:13px">' + esc(d) + '</div></div>').join('') +
      '</div></div><div class="modal-foot"><button class="btn primary" data-cancel>Entendido</button></div>');
    const b = modalRoot.querySelector('[data-cancel]'); if (b) b.onclick = UI.closeModal;
  }
  function showAboutModal() {
    UI.modal('<div class="modal-head"><h3>Sobre este prototipo</h3></div><div class="modal-body"><p class="modal-text">' +
      'Prototipo navegable de alta fidelidad del CRM inmobiliario. Los datos son <b>simulados y deterministas</b>; no hay backend ni persistencia: los cambios viven en memoria y se reinician con el botón del modo demostración.</p>' +
      '<p class="modal-text" style="margin-top:10px">Basado en <b>docs/plan_accion_crm_inmobiliario.md</b> y <b>docs/requisitos_inmobiliaria.md</b>.</p></div>' +
      '<div class="modal-foot"><button class="btn primary" data-cancel>Entendido</button></div>', { cls: 'modal-sm' });
    const b = modalRoot.querySelector('[data-cancel]'); if (b) b.onclick = UI.closeModal;
  }

  const ROLE_GUIDE = {
    ASESOR: { intro: 'Tu trabajo es contactar rápido y avanzar el pipeline.', points: ['Empieza en Mi panel: prioridades y visitas de hoy.', 'Contacta primero lo que está fuera de SLA (en rojo).', 'Registra cada interacción desde la tarjeta o el drawer.', 'Agenda visitas completando el nombre del cliente.', 'Pausa tus leads con el interruptor si no puedes atender.'] },
    GERENTE: { intro: 'Vigilas el avance del equipo y destrabas cuellos de botella.', points: ['Lee el dashboard y filtra por asesor, proyecto o fuente.', 'Atiende los leads fuera de SLA desde "Sin atender".', 'Reasigna leads individual o masivamente.', 'Gestiona la disponibilidad del equipo.', 'Reabre leads en estado final cuando corresponda.'] },
    RECEPCION: { intro: 'Eres la puerta de entrada de los leads.', points: ['Usa el alta rápida para un lead puntual.', 'La carga masiva muestra una vista previa antes de confirmar.', 'El sistema deduplica y marca reingresos automáticamente.', 'Si el teléfono es inválido, el lead no se crea.', 'Sigue el historial de cargas para auditar cada lote.'] },
    SUPERADMIN: { intro: 'Administras accesos y parámetros del sistema.', points: ['Crea usuarios y asigna su rol.', 'Desbloquea cuentas tras 5 intentos fallidos.', 'Restablece contraseñas sin verlas.', 'Ajusta adscripción, SLA y probabilidades.', 'Revisa la auditoría de la sesión.'] }
  };

  /* ================================= TOUR ================================ */
  const TOURS = {
    ASESOR: [
      { sel: '[data-nav="panel"]', title: 'Tu panel', text: 'Aquí empiezas el día: prioridades, KPIs y visitas.' },
      { sel: '[data-nav="pipeline"]', title: 'Tu pipeline', text: 'Tu tablero Kanban. Arrastra tarjetas o usa "Mover a…".' },
      { sel: '.topbar-search', title: 'Búsqueda rápida', text: 'Ctrl+K para encontrar un lead o saltar de pantalla.' },
      { sel: '[data-action="role-menu"]', title: 'Cambia de rol', text: 'Aquí cambias de perfil para recorrer el flujo completo.' }
    ],
    GERENTE: [
      { sel: '[data-nav="dashboard"]', title: 'Dashboard', text: 'KPIs y gráficos en vivo. Filtra por asesor, proyecto o fuente.' },
      { sel: '[data-nav="leads"]', title: 'Leads', text: 'Vista global: filtra, selecciona y reasigna en masa.' },
      { sel: '[data-nav="team"]', title: 'Equipo', text: 'Carga y disponibilidad de cada asesor.' },
      { sel: '[data-action="notif-panel"]', title: 'Notificaciones', text: 'Alertas de SLA, reingresos y cambios del equipo.' }
    ],
    RECEPCION: [
      { sel: '[data-nav="ingestion"]', title: 'Ingesta', text: 'Alta rápida y carga masiva con reglas aplicadas.' },
      { sel: '.dropzone', title: 'Carga masiva', text: 'Simula un archivo y revisa la vista previa.' },
      { sel: '[data-action="help-menu"]', title: 'Ayuda', text: 'Guía de tu rol y atajos, siempre a mano.' }
    ],
    SUPERADMIN: [
      { sel: '[data-nav="users"]', title: 'Usuarios', text: 'Crea usuarios, desbloquea y restablece claves.' },
      { sel: '[data-nav="settings"]', title: 'Configuración', text: 'Parámetros del sistema en un solo lugar.' },
      { sel: '[data-nav="audit"]', title: 'Auditoría', text: 'Registro inmutable de toda la actividad.' }
    ]
  };

  function startTour(role, force) {
    const steps = TOURS[role] || TOURS.ASESOR;
    state.tour = { role, idx: 0, steps, force: !!force };
    state.tourSeen[role] = true;
    renderTour();
  }
  function closeTour() {
    state.tour = null;
    const o = document.getElementById('tour'); if (o) o.remove();
  }
  function renderTour() {
    const t = state.tour; if (!t) return;
    let o = document.getElementById('tour');
    if (!o) { o = document.createElement('div'); o.id = 'tour'; document.body.appendChild(o); }
    const step = t.steps[t.idx];
    const target = step.sel ? document.querySelector(step.sel) : null;
    let rect = null;
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
      rect = target.getBoundingClientRect();
    }
    const pad = 6;
    const spot = rect ? '<div class="tour-spot" style="left:' + (rect.left - pad) + 'px;top:' + (rect.top - pad) + 'px;width:' + (rect.width + pad * 2) + 'px;height:' + (rect.height + pad * 2) + 'px"></div>' : '<div class="tour-spot" style="left:0;top:0;width:100%;height:100%;border-radius:0"></div>';
    const cardW = 320, gap = 14;
    let cx = rect ? Math.min(window.innerWidth - cardW - 16, Math.max(16, rect.left)) : (window.innerWidth - cardW) / 2;
    let cy = rect ? rect.bottom + gap : window.innerHeight / 2 - 80;
    if (cy + 180 > window.innerHeight) cy = Math.max(16, rect ? rect.top - 190 : 100);
    const dots = t.steps.map((_, i) => '<i class="' + (i === t.idx ? 'on' : '') + '"></i>').join('');
    o.className = 'tour-overlay';
    o.innerHTML = spot + '<div class="tour-card" style="left:' + cx + 'px;top:' + cy + 'px">' +
      '<h4>' + esc(step.title) + '</h4><p>' + esc(step.text) + '</p>' +
      '<div class="tour-foot"><span class="tour-dots">' + dots + '</span>' +
      '<button class="btn ghost sm" data-action="tour-skip">Omitir</button>' +
      (t.idx > 0 ? '<button class="btn sm" data-action="tour-prev">Atrás</button>' : '') +
      '<button class="btn primary sm" data-action="tour-next">' + (t.idx === t.steps.length - 1 ? 'Listo' : 'Siguiente') + '</button></div></div>';
    o.onclick = (e) => { if (e.target === o) closeTour(); };
  }

  /* ============================ MODO DEMOSTRACIÓN ======================== */
  const DEMO_STEPS = [
    { key: 'login', label: 'Inicia sesión con un perfil', roles: '*' },
    { key: 'panel', label: 'Abre "Mi panel" del Asesor', roles: 'ASESOR' },
    { key: 'contact', label: 'Contacta un lead fuera de SLA', roles: 'ASESOR' },
    { key: 'agenda', label: 'Mueve un lead a VISITA AGENDADA', roles: 'ASESOR' },
    { key: 'manager', label: 'Cambia a Gerente con el avatar', roles: 'GERENTE' },
    { key: 'reassign', label: 'Reasigna un lead (individual o masiva)', roles: 'GERENTE' },
    { key: 'create', label: 'Crea un lead desde Ingesta', roles: 'RECEPCION' }
  ];
  function demoDone(key) { return !!state.demoFlags[key]; }
  function renderDemoDock() {
    let root = document.getElementById('demo-root');
    if (!root) { root = document.createElement('div'); root.id = 'demo-root'; document.body.appendChild(root); }
    if (!state.user) { root.innerHTML = ''; return; }
    if (!state.demoOpen) {
      root.innerHTML = '<div class="demo-dock"><button class="demo-pill" data-action="toggle-demo"><span class="dp-live"></span> Modo demostración · ' + demoDoneCount() + '/7 · tecla D</button></div>';
      return;
    }
    const role = state.user ? state.user.role : 'ASESOR';
    const steps = DEMO_STEPS.map((s) => {
      const done = demoDone(s.key);
      const relevant = s.roles === '*' || s.roles === role;
      return '<div class="demo-step ' + (done ? 'done' : '') + (relevant && !done ? ' demo-next' : '') + '">' +
        '<span class="ds-check">' + (done ? Icon('check-circle', { size: 16 }) : Icon('check', { size: 16 })) + '</span>' + esc(s.label) + '</div>';
    }).join('');
    root.innerHTML = '<div class="demo-dock"><div class="demo-panel">' +
      '<div class="demo-head">' + Icon('play', { size: 16 }) + ' Modo demostración <span class="demo-tag">' + demoDoneCount() + '/7</span>' +
      '<span class="spacer"></span><button class="x-btn" data-action="toggle-demo" aria-label="Cerrar">' + Icon('x', { size: 16 }) + '</button></div>' +
      '<div class="demo-body"><div class="stack-sm">' + steps + '</div>' +
      '<div class="demo-actions">' +
        '<button class="demo-btn primary" data-action="demo-new-lead">' + Icon('download', { size: 15 }) + ' Simular lead entrante</button>' +
        '<button class="demo-btn" data-action="demo-reset">' + Icon('refresh', { size: 15 }) + ' Reiniciar demo</button></div>' +
      '<p class="muted" style="font-size:11px;margin-top:10px">La guía se marca sola al cumplir cada paso. Pulsa la tecla D para plegar.</p>' +
      '</div></div></div>';
  }
  function demoDoneCount() { return DEMO_STEPS.filter((s) => demoDone(s.key)).length; }

  function demoNewLead() {
    const src = DB.sources[Math.floor(Math.random() * DB.sources.length)];
    const a = state.user.role === 'ASESOR' ? advisor(state.user.id) : assignRoundRobin();
    const digits9 = '9' + String(Math.floor(10000000 + Math.random() * 89999999));
    const lead = {
      id: 'demo-' + Date.now(), fullName: null,
      phone: settings.country_code + ' ' + digits9.slice(0, 3) + ' ' + digits9.slice(3, 6) + ' ' + digits9.slice(6),
      source: src, project: projects[Math.floor(Math.random() * projects.length)], campaign: 'Campaña demo',
      asesorId: a.id, asesorName: a.name, status: 'NUEVO', temperature: 'FRIO', reentry: false,
      assignedMinAgo: 0, ingestedMinAgo: 0, lastActivityMin: 0, firstContactMin: null, visitInMin: null,
      discardReason: null, observations: null, externalUsername: null
    };
    state.leads.unshift(lead);
    state.flashId = lead.id;
    state.demoOpen = true;
    notify('ingestion', 'Nuevo lead en tiempo real → ' + a.name);
    render();
    setTimeout(() => { state.flashId = null; }, 1600);
    UI.toast('Lead nuevo asignado · aparece arriba en NUEVO.', { type: 'ok' });
  }
  function demoReset() {
    state.leads = DB.leads.slice();
    state.filters = { q: '', project: '', temperature: '', chip: 'todos', phase: '' };
    state.globalFilters = { q: '', asesor: '', status: '', chip: '' };
    state.selected = new Set(); state.selectMode = false;
    state.notifs = []; state.audit = [];
    state._ingest = null; state._bulk = null; state._ingestForm = null;
    state.demoFlags = {};
    state.dashFilters = { asesor: '', project: '', source: '' };
    advisors.forEach((a) => { state.availability[a.id] = a.isAvailable !== false; });
    closeDrawer(); UI.closeModal(); UI.closePopover();
    render();
    UI.toast('Datos de demostración reiniciados.', { type: 'ok' });
  }

  /* ================================ ROUTER ============================== */
  function viewContent() {
    switch (state.route) {
      case 'panel': return panelView();
      case 'pipeline': return pipelineView();
      case 'dashboard': return dashboardView();
      case 'leads': return leadsView();
      case 'team': return teamView();
      case 'ingestion': return ingestionView();
      case 'audit': return auditView();
      case 'reports': return reportsView();
      case 'users': return usersView();
      case 'settings': return settingsView();
      default: return UI.emptyState({ icon: 'info', title: 'Vista no disponible' });
    }
  }

  function captureView() {
    const view = document.getElementById('view');
    const snap = { top: view ? view.scrollTop : 0, boardLeft: 0, cols: {}, focus: null };
    const board = view ? view.querySelector('.board') : null;
    if (board) snap.boardLeft = board.scrollLeft;
    if (view) view.querySelectorAll('.board-col-body').forEach((b) => { const s = b.closest('.board-col'); if (s) snap.cols[s.dataset.status] = b.scrollTop; });
    const ae = document.activeElement;
    if (ae && ae.dataset && ae.dataset.focus) snap.focus = { key: ae.dataset.focus, start: ae.selectionStart, end: ae.selectionEnd };
    return snap;
  }
  function restoreView(snap) {
    const view = document.getElementById('view');
    if (!view) return;
    view.scrollTop = snap.top;
    const board = view.querySelector('.board');
    if (board) board.scrollLeft = snap.boardLeft;
    Object.keys(snap.cols).forEach((st) => {
      const col = view.querySelector('.board-col[data-status="' + st + '"] .board-col-body');
      if (col) col.scrollTop = snap.cols[st];
    });
    if (snap.focus) {
      const el = view.querySelector('[data-focus="' + snap.focus.key + '"]');
      if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(snap.focus.start, snap.focus.end); } catch (_) {} }
    }
  }

  function renderView() {
    const view = document.getElementById('view');
    if (!view) return;
    const snap = captureView();
    const isBoard = state.route === 'pipeline' && state.viewMode === 'kanban';
    const enter = state._lastRoute !== state.route;
    state._lastRoute = state.route;
    view.className = 'view' + (isBoard ? ' view-board' : '');
    view.innerHTML = '<div class="view-inner' + (enter ? ' enter' : '') + '">' + viewContent() + '</div>';
    restoreView(snap);
    UI.runCountUps(view);
  }

  function render() {
    if (!state.user) {
      shellRole = null;
      appEl.innerHTML = loginView();
      renderDrawer();
      renderDemoDock();
      return;
    }
    const role = state.user.role;
    const allowed = (NAV[role] || []).reduce((a, g) => a.concat(g.items.map((i) => i.route)), []);
    if (!allowed.includes(state.route)) state.route = DEFAULT_ROUTE[role];
    if (shellRole !== role) { appEl.innerHTML = shellTemplate(); shellRole = role; }
    updateTopbar();
    updateSidebar();
    renderView();
    if (state.route === 'panel' && role === 'ASESOR') state.demoFlags.panel = true;
    renderDrawer();
    renderDemoDock();
    if (!state.tourSeen[role]) { state.tourSeen[role] = true; startTour(role); }
  }

  function navigate(route) {
    if (state.route === route) { render(); return; }
    if (state.route === 'login') { state.route = route; render(); return; }
    location.hash = '#/' + route;
  }

  function onHashChange() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    if (!state.user) { state.route = 'login'; render(); return; }
    state.route = h && h !== 'login' ? h : DEFAULT_ROUTE[state.user.role];
    render();
  }

  function login(role) {
    state.user = USERS[role];
    state.route = DEFAULT_ROUTE[role];
    state.demoFlags.login = true;
    closeDrawer(); UI.closePopover(); UI.closeModal();
    logAudit('LOGIN_OK', 'session', state.user.name + ' inició sesión como ' + ROLE_LABEL[role]);
    render();
    UI.toast('Sesión iniciada como ' + ROLE_LABEL[role] + '.', { type: 'ok' });
  }

  function switchRole(role) {
    if (role === state.user.role) return;
    state.user = USERS[role];
    state.route = DEFAULT_ROUTE[role];
    if (role === 'GERENTE') state.demoFlags.manager = true;
    closeDrawer(); UI.closePopover();
    logAudit('SWITCH_ROLE', 'session', 'Cambió a ' + ROLE_LABEL[role]);
    location.hash = '#/' + state.route;
    render();
    UI.toast('Ahora ves como ' + ROLE_LABEL[role] + '.', { type: 'info' });
  }

  /* ============================== INTERACCIONES ========================= */
  function registerInteraction(id, kind, text) {
    const l = getLead(id);
    if (!l) return;
    const labels = { CALL: 'Llamada', WA: 'WhatsApp', VISIT: 'Visita', NOTE: 'Nota' };
    l._extra = (l._extra || []).concat([{ min: 0, title: (labels[kind] || 'Nota') + ' registrada', text: text || '', icon: kind === 'WA' ? 'chat' : kind === 'NOTE' ? 'edit' : 'phone-call', tone: 'ok' }]);
    l.lastActivityMin = 0;
    logAudit('INTERACTION', 'lead', (l.fullName || l.phone) + ' · ' + (labels[kind] || 'Nota'));
    renderDrawer();
    UI.toast('Interacción registrada. Último contacto actualizado.', { type: 'ok' });
  }

  function openCardMenu(anchor, id) {
    const l = getLead(id);
    if (!l) return;
    UI.menu(anchor, [
      { icon: 'chat', label: 'WhatsApp', value: 'wa' },
      { icon: 'message-plus', label: 'Registrar interacción', value: 'quick-interaction' },
      { icon: 'swap', label: 'Mover a…', value: 'move-menu' },
      { icon: 'copy', label: 'Copiar teléfono', value: 'copy' },
      { icon: 'users', label: 'Reasignar', value: 'open-reassign' },
      { sep: true },
      { icon: 'x-circle', label: 'Descartar lead', value: 'discard', danger: true }
    ], (v) => {
      if (v === 'move-menu') openMoveMenu(anchor, id);
      else if (v === 'discard') openDiscardModal(id);
      else if (v === 'open-reassign') openReassignModal(id);
      else if (v === 'copy') { if (navigator.clipboard) navigator.clipboard.writeText(l.phone).then(() => UI.toast('Teléfono copiado.', { type: 'info' })).catch(() => {}); else UI.toast('Teléfono: ' + l.phone, { type: 'info' }); }
      else if (v === 'wa') { l.lastActivityMin = 0; logAudit('WHATSAPP', 'lead', 'Abrió WhatsApp con ' + (l.fullName || l.phone)); UI.toast('Abriendo WhatsApp con el lead…', { type: 'ok', actionLabel: 'Registrar', onAction: () => registerInteraction(id, 'WA', '') }); render(); }
      else if (v === 'quick-interaction') { if (isOverdue(l)) state.demoFlags.contact = true; registerInteraction(id, 'CALL', ''); render(); }
    });
  }

  function openBulkReassign() {
    if (!state.selected.size) { UI.toast('Selecciona al menos un lead para reasignar.', { type: 'warn' }); return; }
    const n = state.selected.size;
    const box = UI.modal('<div class="modal-head"><h3>Reasignar ' + n + ' lead' + (n > 1 ? 's' : '') + '</h3></div>' +
      '<div class="modal-body"><p class="modal-text">Elige el asesor destino. Se registrará en la auditoría con el motivo indicado.</p>' +
      '<div style="margin-top:12px;max-height:300px;overflow:auto">' + advisors.map((a) => {
        const load = state.leads.filter((x) => x.asesorId === a.id && isOpen(x)).length;
        const dis = !isAvailable(a.id);
        return '<button class="modal-opt" data-asesor="' + a.id + '" ' + (dis ? 'disabled style="opacity:.5"' : '') + '>' +
          avatar(a.name, 'av-sm') + '<span style="flex:1"><b>' + esc(a.name) + '</b><span class="muted" style="font-size:12px"> · ' + load + ' abiertos' + (dis ? ' · en pausa' : '') + '</span></span></button>';
      }).join('') + '</div>' +
      '<div class="field" style="margin-top:12px"><label>Motivo (opcional)</label><input class="input" id="bulk-reason" placeholder="Ej.: redistribuir carga por vacaciones"></div>' +
      '</div><div class="modal-foot"><button class="btn ghost" data-cancel>Cancelar</button></div>');
    box.querySelector('[data-cancel]').onclick = UI.closeModal;
    box.querySelectorAll('.modal-opt:not([disabled])').forEach((b) => {
      b.onclick = () => {
        const a = advisor(b.dataset.asesor);
        const reasonEl = box.querySelector('#bulk-reason');
        const reason = (reasonEl && reasonEl.value.trim()) || 'Reasignación masiva';
        let moved = 0;
        const backup = [];
        state.selected.forEach((lid) => { const l = getLead(lid); if (l) { backup.push({ l, id: l.asesorId, name: l.asesorName }); l.asesorId = a.id; l.asesorName = a.name; moved++; } });
        UI.closeModal();
        logAudit('REASSIGN_BULK', 'lead', moved + ' leads → ' + a.name + ' · ' + reason);
        notify('manager', 'Reasignaste ' + moved + ' leads a ' + a.name);
        if (state.user.role === 'GERENTE') state.demoFlags.reassign = true;
        state.selected = new Set(); state.selectMode = false;
        render();
        UI.toast(moved + ' leads reasignados a ' + a.name + '.', { type: 'ok', actionLabel: 'Deshacer', onAction: () => {
          backup.forEach((b) => { b.l.asesorId = b.id; b.l.asesorName = b.name; }); render(); UI.toast('Reasignación masiva deshecha.', { type: 'info' });
        } });
      };
    });
  }

  function viewAs(advisorId) {
    const a = advisor(advisorId);
    if (!a) return;
    state.user = { id: a.id, name: a.name, role: 'ASESOR', email: a.email || (a.id + '@crm.test') };
    state.route = 'pipeline';
    state.demoFlags.create = true;
    closeDrawer(); UI.closePopover(); UI.closeModal();
    logAudit('VIEW_AS', 'session', 'Vista como ' + a.name);
    location.hash = '#/pipeline';
    render();
    UI.toast('Ahora ves el pipeline de ' + a.name + '.', { type: 'info' });
  }

  function buildSelectOptions(kind) {
    if (kind === 'project') return [{ value: '', label: 'Todos los proyectos', icon: 'building' }].concat(projects.map((p) => ({ value: p, label: p, icon: 'building' })));
    if (kind === 'temperature') return [{ value: '', label: 'Todas las temperaturas', icon: 'flame' }].concat(['CALIENTE', 'TIBIO', 'FRIO'].map((t) => ({ value: t, label: TEMPS[t].label, icon: TEMPS[t].icon })));
    return [];
  }

  /* --------------------------- Delegación clic --------------------------- */
  document.addEventListener('click', (e) => {
    const pop = document.getElementById('popover');
    if (pop && !e.target.closest('#popover') && !e.target.closest('[data-action^="role-menu"], [data-action$="-menu"], [data-action="help-menu"], [data-action="notif-panel"], [data-action="filter-select"], [data-action="dash-select"], [data-action="gfilter-select"], [data-action="ingest-select"], [data-action="audit-select"], [data-action="move-menu"], [data-action="card-more"], [data-action="temp-menu"]')) UI.closePopover();

    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    const id = t.dataset.id;

    switch (a) {
      /* Sesión */
      case 'login-submit': {
        const email = (document.getElementById('login-email').value || '').trim();
        const acc = state.accounts[email];
        const alert = document.getElementById('login-alert');
        if (acc && acc.locked) {
          if (alert) alert.innerHTML = '<div class="lock-banner">' + Icon('lock', { size: 16 }) + ' Cuenta bloqueada tras 5 intentos fallidos. Un superadministrador debe desbloquearla.</div>';
          logAudit('LOGIN_FAIL', 'session', 'Intento en cuenta bloqueada: ' + email);
          UI.toast('Cuenta bloqueada. Pide a un superadministrador que la desbloquee.', { type: 'err' });
          break;
        }
        const role = /gerente/.test(email) ? 'GERENTE' : /admin/.test(email) ? 'SUPERADMIN' : /recepcion/.test(email) ? 'RECEPCION' : 'ASESOR';
        login(role);
        break;
      }
      case 'login-role': login(t.dataset.role); break;
      case 'logout': state.user = null; state.route = 'login'; state.tourSeen = {}; closeDrawer(); UI.closePopover(); location.hash = ''; render(); break;
      case 'role-menu': e.stopPropagation(); UI.menu(t, Object.keys(ROLE_LABEL).map((r) => ({ icon: r === 'ASESOR' ? 'users' : r === 'GERENTE' ? 'dashboard' : r === 'RECEPCION' ? 'inbox' : 'user-cog', label: ROLE_LABEL[r], value: r, active: state.user.role === r, hint: r === 'ASESOR' ? 'Aline Reyes' : null })), (v) => switchRole(v)); break;
      case 'toggle-collapse': {
        const shell = document.getElementById('app-shell');
        if (shell) shell.classList.toggle('side-collapsed');
        break;
      }
      case 'toggle-side': { const sb = document.getElementById('sidebar'); if (sb) sb.classList.toggle('open'); break; }

      /* Navegación rápida / ayuda */
      case 'open-cmdk': openCmdk(); break;
      case 'help-menu': e.stopPropagation(); openHelpMenu(t); break;
      case 'notif-panel': e.stopPropagation(); openNotifPanel(t); break;
      case 'notif-mark-all': state.notifs.forEach((n) => { n.read = true; }); UI.closePopover(); updateBell(); UI.toast('Notificaciones marcadas como leídas.', { type: 'info' }); break;

      /* Panel */
      case 'go-pipeline': state.demoFlags.panel = true; navigate('pipeline'); break;
      case 'panel-sla': state.globalFilters.chip = 'sla'; navigate('leads'); break;
      case 'open-phase': state.filters.phase = t.dataset.phase; state.filters.chip = 'todos'; navigate('pipeline'); break;
      case 'leads-phase': state.globalFilters.status = t.dataset.phase; state.globalFilters.chip = ''; navigate('leads'); break;

      /* Pipeline */
      case 'view': state.viewMode = t.dataset.mode; render(); break;
      case 'more': state.colLimit += 12; render(); break;
      case 'toggle-desechado': state.desechadoOpen = !state.desechadoOpen; render(); break;
      case 'board-chip': state.filters.chip = t.dataset.chip; state.filters.phase = ''; render(); break;
      case 'clear-board-filters': state.filters.project = ''; state.filters.temperature = ''; state.filters.phase = ''; render(); break;
      case 'clear-phase': state.filters.phase = ''; render(); break;
      case 'filter-select': e.stopPropagation(); {
        const key = t.dataset.key;
        UI.select(t, buildSelectOptions(key), state.filters[key], (v) => { state.filters[key] = v; render(); });
        break;
      }

      /* Dashboard */
      case 'range': state.rangeDays = +t.dataset.days; render(); break;
      case 'dash-clear': state.dashFilters = { asesor: '', project: '', source: '' }; render(); break;
      case 'dash-select': e.stopPropagation(); {
        const key = t.dataset.key;
        let opts;
        if (key === 'asesor') opts = [{ value: '', label: 'Todos los asesores', icon: 'users' }].concat(advisors.map((x) => ({ value: x.name, label: x.name, icon: 'users' })));
        else if (key === 'project') opts = [{ value: '', label: 'Todos los proyectos', icon: 'building' }].concat(projects.map((p) => ({ value: p, label: p, icon: 'building' })));
        else opts = [{ value: '', label: 'Todas las fuentes', icon: 'megaphone' }].concat(DB.sources.map((s) => ({ value: s.code, label: s.label, icon: s.iconKey })));
        UI.select(t, opts, state.dashFilters[key], (v) => { state.dashFilters[key] = v; render(); });
        break;
      }
      case 'dash-source': state.dashFilters.source = t.dataset.value; render(); UI.toast('Filtrado por fuente: ' + sourceLabel(t.dataset.value), { type: 'info' }); break;
      case 'dash-asesor': state.dashFilters.asesor = t.dataset.name; render(); UI.toast('Filtrado por ' + t.dataset.name, { type: 'info' }); break;
      case 'go-sla': state.globalFilters.chip = 'sla'; if (state.user.role === 'ASESOR') navigate('pipeline'); else navigate('leads'); break;

      /* Leads globales */
      case 'gchip': state.globalFilters.chip = t.dataset.chip; render(); break;
      case 'gfilter-select': e.stopPropagation(); {
        const key = t.dataset.key;
        const opts = key === 'asesor'
          ? [{ value: '', label: 'Todos los asesores', icon: 'users' }].concat(advisors.map((x) => ({ value: x.name, label: x.name, icon: 'users' })))
          : [{ value: '', label: 'Todos los estados', icon: 'filter' }].concat(ORDER.map((k) => ({ value: k, label: PHASES[k].label, icon: PHASES[k].icon })));
        UI.select(t, opts, state.globalFilters[key], (v) => { state.globalFilters[key] = v; render(); });
        break;
      }
      case 'toggle-selectmode': state.selectMode = !state.selectMode; state.selected = new Set(); render(); break;
      case 'toggle-select': {
        e.stopPropagation();
        if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
        render();
        break;
      }
      case 'bulk-reassign': openBulkReassign(); break;

      /* Drawer / tarjeta */
      case 'open-drawer': openDrawer(id); break;
      case 'close-drawer': closeDrawer(); break;
      case 'step-move': attemptMove(id, t.dataset.status); break;
      case 'temp-menu': e.stopPropagation(); openTempMenu(t, id); break;
      case 'move-menu': e.stopPropagation(); openMoveMenu(t, id); break;
      case 'card-more': e.stopPropagation(); openCardMenu(t, id); break;
      case 'set-temp': setTemperature(id, t.dataset.temp); break;
      case 'composer-kind': state._quick = { kind: t.dataset.kind }; renderDrawer(); break;
      case 'save-interaction': {
        const ta = drawerRoot.querySelector('[data-key="composer"]');
        registerInteraction(id, (state._quick && state._quick.kind) || 'CALL', ta ? ta.value.trim() : '');
        break;
      }
      case 'quick-interaction': {
        const l = getLead(id);
        if (!l) break;
        if (isOverdue(l)) state.demoFlags.contact = true;
        registerInteraction(id, 'CALL', '');
        render();
        break;
      }
      case 'wa': e.stopPropagation(); {
        const l = getLead(id);
        if (l) { l.lastActivityMin = 0; logAudit('WHATSAPP', 'lead', 'Abrió WhatsApp con ' + (l.fullName || l.phone)); }
        UI.toast('Abriendo WhatsApp con el lead…', { type: 'ok', actionLabel: 'Registrar', onAction: () => registerInteraction(id, 'WA', '') });
        render();
        break;
      }
      case 'copy': {
        const l = getLead(id);
        if (l && navigator.clipboard) navigator.clipboard.writeText(l.phone).then(() => UI.toast('Teléfono copiado.', { type: 'info' })).catch(() => {});
        else UI.toast('Teléfono: ' + (l ? l.phone : ''), { type: 'info' });
        break;
      }
      case 'open-reassign': openReassignModal(id); break;
      case 'mark-won': { const l = getLead(id); if (l) { l.status = 'CALIFICADO'; logAudit('WON', 'lead', 'Venta registrada: ' + (l.fullName || l.phone)); notify('manager', 'Venta registrada: ' + (l.fullName || l.phone)); UI.toast('Venta registrada. ¡Felicidades!', { type: 'ok' }); closeDrawer(); render(); } break; }

      /* Modales */
      case 'close-modal': UI.closeModal(); break;

      /* Equipo / disponibilidad */
      case 'toggle-availability': break; /* manejado en change */

      /* Ingesta */
      case 'quick-lead': startIngest(); break;
      case 'ingest-select': e.stopPropagation(); {
        const key = t.dataset.key;
        const opts = key === 'source' ? DB.sources.map((s) => ({ value: s.code, label: s.label, icon: s.iconKey })) : projects.map((p) => ({ value: p, label: p, icon: 'building' }));
        UI.select(t, opts, state._ingestForm[key], (v) => { state._ingestForm[key] = v; render(); });
        break;
      }
      case 'ingest-again': state._ingest = null; if (document.getElementById('in-phone')) document.getElementById('in-phone').value = ''; state._ingestForm.phone = ''; render(); break;
      case 'view-as': viewAs(t.dataset.asesor); break;
      case 'pick-file': pickBulk(); break;
      case 'confirm-batch': runBatch(); break;
      case 'cancel-batch': state._bulk = null; render(); break;

      /* Auditoría */
      case 'audit-select': e.stopPropagation(); {
        const key = t.dataset.key;
        const vals = Array.from(new Set(state.audit.map((x) => key === 'actor' ? x.actor : x.action)));
        const opts = [{ value: '', label: key === 'actor' ? 'Todos los actores' : 'Todas las acciones', icon: key === 'actor' ? 'users' : 'filter' }]
          .concat(vals.map((v) => ({ value: v, label: v, icon: key === 'actor' ? 'user' : 'swap' })));
        UI.select(t, opts, state._auditF[key], (v) => { state._auditF[key] = v; render(); });
        break;
      }
      case 'audit-clear': state._auditF = { actor: '', action: '', q: '' }; render(); break;

      /* Exportar / admin */
      case 'export': {
        const kind = t.dataset.kind || 'Reporte';
        const fmt = t.dataset.fmt || 'CSV';
        UI.toast('Generando ' + kind + ' (' + fmt + ')…', { type: 'info' });
        setTimeout(() => {
          logAudit('EXPORT', 'report', kind + ' · ' + fmt);
          UI.toast(kind + ' listo para descargar (URL válida 15 min).', { type: 'ok' });
        }, 900);
        break;
      }
      case 'save-settings': UI.confirmDialog({ title: 'Guardar configuración', text: 'Los cambios se aplican a todo el prototipo. ¿Continuar?', confirmLabel: 'Guardar', onConfirm: () => { logAudit('UPDATE', 'settings', 'Configuración guardada'); notify('manager', 'Configuración actualizada'); UI.toast('Configuración guardada.', { type: 'ok' }); } }); break;
      case 'unlock': { const email = t.dataset.email; if (state.accounts[email]) state.accounts[email].locked = false; logAudit('UNLOCK', 'user', 'Cuenta desbloqueada: ' + email); notify('manager', 'Cuenta desbloqueada: ' + email); render(); UI.toast('Cuenta desbloqueada.', { type: 'ok' }); break; }
      case 'reset-pass': { const email = t.dataset.email; UI.confirmDialog({ title: 'Restablecer contraseña', text: 'Se enviará un enlace de restablecimiento a ' + email + '.', confirmLabel: 'Enviar enlace', onConfirm: () => { logAudit('RESET_PASS', 'user', 'Restablecimiento para ' + email); UI.toast('Enlace enviado a ' + email + '.', { type: 'ok' }); } }); break; }
      case 'new-user': newUserModal(); break;

      /* Modo demostración */
      case 'toggle-demo': state.demoOpen = !state.demoOpen; renderDemoDock(); break;
      case 'demo-new-lead': demoNewLead(); break;
      case 'demo-reset': demoReset(); break;

      /* Tour */
      case 'tour-next': { if (!state.tour) break; if (state.tour.idx >= state.tour.steps.length - 1) closeTour(); else { state.tour.idx++; renderTour(); } break; }
      case 'tour-prev': { if (state.tour && state.tour.idx > 0) { state.tour.idx--; renderTour(); } break; }
      case 'tour-skip': closeTour(); break;
    }
  });

  /* --------------------------- Input / change --------------------------- */
  document.addEventListener('input', (e) => {
    const t = e.target.closest('[data-action], [data-key]');
    if (!t) return;
    const a = t.dataset.action;
    if (a === 'search') {
      if (t.dataset.key === 'board') { state.filters.q = t.value; render(); }
      else if (t.dataset.key === 'global-leads') { state.globalFilters.q = t.value; render(); }
    } else if (a === 'phone-input') {
      state._ingestForm.phone = t.value;
      const norm = document.getElementById('in-norm');
      if (norm) norm.textContent = normalizePhone(t.value) || '—';
    } else if (a === 'ingest-user') { state._ingestForm.username = t.value.trim(); } else if (a === 'audit-q') { clearTimeout(state._auditT); state._auditT = setTimeout(() => { state._auditF.q = t.value; render(); }, 220); }
    else if (t.dataset.key === 'name') { const l = getLead(t.dataset.id); if (l) l.fullName = t.value.trim() || null; }
    else if (t.dataset.key === 'obs') { const l = getLead(t.dataset.id); if (l) l.observations = t.value.trim() || null; }
  });

  document.addEventListener('change', (e) => {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    if (a === 'toggle-availability') {
      const aid = t.dataset.id;
      state.availability[aid] = t.checked;
      const adv = advisor(aid);
      if (adv) adv.isAvailable = t.checked;
      logAudit('AVAILABILITY', 'user', (adv ? adv.name : aid) + (t.checked ? ' activó' : ' pausó') + ' la recepción de leads');
      render();
      UI.toast((adv ? adv.name : 'Asesor') + (t.checked ? ' vuelve a recibir leads.' : ' queda en pausa.'), { type: 'info' });
    }
  }, true);

  /* ------------------------------ Drag & drop --------------------------- */
  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest && e.target.closest('.lead-card');
    if (!card) return;
    const id = card.dataset.id;
    state.dragId = id;
    card.classList.add('dragging');
    const valid = moveValidity(id);
    state.dragValid = valid;
    document.querySelectorAll('.board-col').forEach((col) => {
      const st = col.dataset.status, v = valid[st];
      if (!v) return;
      if (v.ok) col.classList.add('drop-valid');
      else { col.classList.add('drop-invalid'); col.dataset.reason = v.reason; }
    });
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch (_) {}
  });
  document.addEventListener('dragend', () => {
    document.querySelectorAll('.lead-card.dragging').forEach((c) => c.classList.remove('dragging'));
    document.querySelectorAll('.board-col').forEach((c) => { c.classList.remove('drag-over', 'drop-valid', 'drop-invalid'); delete c.dataset.reason; });
  });
  document.addEventListener('dragover', (e) => {
    const col = e.target.closest && e.target.closest('.board-col');
    if (!col) return;
    e.preventDefault();
    document.querySelectorAll('.board-col.drag-over').forEach((c) => { if (c !== col) c.classList.remove('drag-over'); });
    col.classList.add('drag-over');
  });
  document.addEventListener('drop', (e) => {
    const col = e.target.closest && e.target.closest('.board-col');
    if (!col) return;
    e.preventDefault();
    const id = state.dragId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
    const v = state.dragValid && state.dragValid[col.dataset.status];
    if (id && v && v.ok) attemptMove(id, col.dataset.status);
    else if (id && v) UI.toast(v.reason, { type: 'warn' });
  });

  /* -------------------------------- Teclado ----------------------------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeCmdk(); if (state.tour) closeTour(); UI.closePopover(); UI.closeModal(); if (state.drawerLeadId) closeDrawer(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openCmdk(); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
    if (!typing) {
      if (e.key === 'd' || e.key === 'D') { state.demoOpen = !state.demoOpen; renderDemoDock(); }
      if (e.key === '?' ) { e.preventDefault(); if (state.user) openHelpMenu(document.querySelector('[data-action="help-menu"]')); }
      if (e.key === 'Enter' || e.key === ' ') {
        if (/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '')) return;
        const card = e.target.closest && e.target.closest('.lead-card');
        if (card) { e.preventDefault(); openDrawer(card.dataset.id); return; }
        const rb = e.target.closest && e.target.closest('[role="button"]');
        if (rb) { e.preventDefault(); rb.click(); return; }
        const row = e.target.closest && e.target.closest('tr[data-action]');
        if (row) { e.preventDefault(); openDrawer(row.dataset.id); return; }
      }
    }
  });

  /* ================================= INIT =============================== */
  window.addEventListener('hashchange', onHashChange);
  if (!state._ingestForm) state._ingestForm = { source: 'META_ADS', project: projects[0], phone: '' };
  render();
  if (location.hash) onHashChange();

/* @@APPEND@@ */
})();
