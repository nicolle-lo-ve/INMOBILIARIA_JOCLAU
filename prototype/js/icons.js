/* ============================================================================
   ICONS — set vectorial propio (estilo línea, 24x24, trazo currentColor).
   Sin dependencias ni logos de marca. Uso: Icon('bell', { size: 18 })
   Animaciones: Icon(name, { animate: 'live' | 'flame' | 'spin' | 'sun' | 'bell' | 'draw' })
   ============================================================================ */
(function () {
  const P = {
    logo: '<path d="M4 20V10l8-5 8 5v10"/><path d="M4 20h16"/><path d="M9.5 20v-5.5h5V20"/>',
    dashboard: '<rect x="3" y="3" width="7.5" height="8.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="5" rx="2"/><rect x="13.5" y="10.5" width="7.5" height="10.5" rx="2"/><rect x="3" y="14" width="7.5" height="7" rx="2"/>',
    kanban: '<rect x="3" y="4" width="5" height="16" rx="1.6"/><rect x="9.5" y="4" width="5" height="11" rx="1.6"/><rect x="16" y="4" width="5" height="7" rx="1.6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.6" cy="6" r="1"/><circle cx="3.6" cy="12" r="1"/><circle cx="3.6" cy="18" r="1"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16.5 5.3a3 3 0 0 1 0 5.4"/><path d="M18 20a5.5 5.5 0 0 0-3.2-5"/>',
    'users-plus': '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>',
    inbox: '<path d="M3.2 13.5h4.3l1.4 2.6h5.8l1.4-2.6h4.5"/><path d="M5.2 4.5h13.6l1.9 9v4.5a2 2 0 0 1-2 2H5.3a2 2 0 0 1-2-2v-4.5Z"/>',
    upload: '<path d="M4 15.5v2.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5"/><path d="M12 15.5V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/>',
    download: '<path d="M4 15.5v2.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5"/><path d="M12 4v11.5"/><path d="m7.5 11 4.5 4.5 4.5-4.5"/>',
    report: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 17v-3M12.5 17v-5M16 17v-2"/>',
    shield: '<path d="M12 3.2 19 6v5.2c0 4.3-3 7.3-7 8.8-4-1.5-7-4.5-7-8.8V6Z"/><path class="ic-check" pathLength="100" d="m9 12 2 2 4-4.2"/>',
    settings: '<path d="M10.3 3.4a1 1 0 0 1 1-.9h1.4a1 1 0 0 1 1 .9l.3 1.7 1.5.9 1.6-.7a1 1 0 0 1 1.2.3l.7 1.2a1 1 0 0 1-.2 1.3l-1.3 1v1.8l1.3 1a1 1 0 0 1 .2 1.3l-.7 1.2a1 1 0 0 1-1.2.3l-1.6-.7-1.5.9-.3 1.7a1 1 0 0 1-1 .9h-1.4a1 1 0 0 1-1-.9l-.3-1.7-1.5-.9-1.6.7a1 1 0 0 1-1.2-.3l-.7-1.2a1 1 0 0 1 .2-1.3l1.3-1v-1.8l-1.3-1a1 1 0 0 1-.2-1.3l.7-1.2a1 1 0 0 1 1.2-.3l1.6.7 1.5-.9Z"/><circle cx="12" cy="12" r="3"/>',
    'user-cog': '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 11.3-4.4"/><circle cx="18" cy="16.5" r="2"/><path d="M18 12.8v1.5M18 18.7v1.5M21.7 16.5h-1.5M15.8 16.5h-1.5M20.6 13.9l-1 1M16.4 18.1l-1 1M20.6 19.1l-1-1M16.4 14.9l-1-1"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/>',
    bell: '<path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/>',
    'bell-ringing': '<path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6"/><path d="M10.3 20a2 2 0 0 0 3.4 0"/><path d="M3.4 4.6 1.8 6.2M20.6 4.6l1.6 1.6"/>',
    flame: '<path d="M12 3c.4 2.6 2.4 4.1 3.6 5.7A6.6 6.6 0 0 1 17 12.8 5 5 0 0 1 12 18a5 5 0 0 1-5-5.3c0-1.7.7-3 1.5-4 .4 1 1 1.8 1.9 2.3C10.7 8.8 11.2 5.7 12 3Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.2M12 19.2v2.2M21.4 12h-2.2M4.8 12H2.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"/>',
    snowflake: '<path d="M12 2.6v18.8M4.3 7.4l15.4 9.2M19.7 7.4 4.3 16.6"/><path d="M12 6.2 9.6 4M12 6.2 14.4 4M12 17.8l-2.4 2.2M12 17.8l2.4 2.2"/>',
    phone: '<path d="M6.5 3.5h3l1.4 3.7-1.9 1.5a12.5 12.5 0 0 0 5.3 5.3l1.5-1.9 3.7 1.4v3a2 2 0 0 1-2.2 2A16.3 16.3 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z"/>',
    'phone-call': '<path d="M6.5 3.5h3l1.4 3.7-1.9 1.5a12.5 12.5 0 0 0 5.3 5.3l1.5-1.9 3.7 1.4v3a2 2 0 0 1-2.2 2A16.3 16.3 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z"/><path d="M15.5 3.6a6 6 0 0 1 5 5M15.2 7a2.6 2.6 0 0 1 2.4 2.4"/>',
    chat: '<path d="M20 15.5a2 2 0 0 1-2 2H8l-4 3.2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z"/>',
    'message-plus': '<path d="M20 15a2 2 0 0 1-2 2H8l-4 3.2V6a2 2 0 0 1 2-2h6"/><path d="M17 3v6M14 6h6"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2.2"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H5.5A2.5 2.5 0 0 0 3 5.5v7A2.5 2.5 0 0 0 5.5 15"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    handshake: '<path d="M3 13.5 7.5 9a2 2 0 0 1 2.8 0L12 10.7l1.7-1.7a2 2 0 0 1 2.8 0L21 13.5l-3.3 3.3-2.2-2.2-3.5 3.5-3.5-3.5-2.2 2.2Z"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path class="ic-check" pathLength="100" d="m8.5 12.3 2.5 2.5 4.5-5.1"/>',
    check: '<path class="ic-check" pathLength="100" d="m5 12.5 4.5 4.5L19 7"/>',
    'x-circle': '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    sparkles: '<path d="M11 3l1.5 4.2L16.7 8.7 12.5 10.2 11 14.4 9.5 10.2 5.3 8.7 9.5 7.2Z"/><path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/>',
    swap: '<path d="M4 8.5h13l-3.2-3.2M20 15.5H7l3.2 3.2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    history: '<path d="M3.6 12a8.5 8.5 0 1 0 2.6-6.1L3.6 8"/><path d="M3.6 4v4h4"/><path d="M12 8.2v3.9l3 1.9"/>',
    'alert-triangle': '<path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.8 3h15.2a2 2 0 0 0 1.8-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/><path d="M12 9.5v4.2M12 17.2h.01"/>',
    refresh: '<path d="M3.5 12a8.5 8.5 0 0 1 14.5-6L21 8.5"/><path d="M21 3.6v5h-5"/><path d="M20.5 12a8.5 8.5 0 0 1-14.5 6L3 15.5"/><path d="M3 20.4v-5h5"/>',
    grip: '<circle cx="9" cy="6" r="1.25"/><circle cx="15" cy="6" r="1.25"/><circle cx="9" cy="12" r="1.25"/><circle cx="15" cy="12" r="1.25"/><circle cx="9" cy="18" r="1.25"/><circle cx="15" cy="18" r="1.25"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    'chevron-left': '<path d="m15 6-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    filter: '<path d="M4 5h16l-6.3 7.4V19l-3.4-2v-4.6Z"/>',
    logout: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 12H3.5M6.5 8.5 3 12l3.5 3.5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.4 9.5a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1 .8-1 1.5v.3"/><path d="M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.2M12 7.8h.01"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    unlock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 0 1 7.6-1.6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.2"/><path d="m4 7.2 8 5.8 8-5.8"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 3 2.6 15 0 18M12 3c-2.6 3-2.6 15 0 18"/>',
    megaphone: '<path d="M4 10.6v2.9A1.5 1.5 0 0 0 5.5 15H8l6 3.4V5.6L8 9H5.5A1.5 1.5 0 0 0 4 10.6Z"/><path d="M17.8 9.2a4 4 0 0 1 0 5.6"/>',
    camera: '<path d="M4 8.5h3l1.4-2.2h7.2l1.4 2.2h3A1.5 1.5 0 0 1 21.5 10v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z"/><circle cx="12" cy="13.5" r="3.2"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    'trending-up': '<path d="M3 16.5l6-6 4 4 8-8"/><path d="M15 6.5h6v6"/>',
    'trending-down': '<path d="M3 7.5l6 6 4-4 8 8"/><path d="M15 17.5h6v-6"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/>',
    eye: '<path d="M2.5 12S5.6 6 12 6s9.5 6 9.5 6-3.1 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.8"/>',
    play: '<path d="M7.5 5.4 18 12 7.5 18.6Z"/>',
    pause: '<path d="M9.5 5.5v13M14.5 5.5v13"/>',
    rocket: '<path d="M12 3c3.4 1.6 5.8 5 5.8 8.9L15 15H9l-2.8-3.1C6.2 8 8.6 4.6 12 3Z"/><circle cx="12" cy="10" r="1.5"/><path d="M9 18.2c-1 .9-1.4 2.8-1.4 2.8M15 18.2c1 .9 1.4 2.8 1.4 2.8"/>',
    building: '<rect x="5" y="3.5" width="14" height="17" rx="1.6"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20.5v-4h4v4"/>',
    location: '<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    edit: '<path d="M4 20h4l10-10-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
    'arrow-right': '<path d="M4 12h15M13 6l6 6-6 6"/>',
    'arrow-left': '<path d="M20 12H5M11 6l-6 6 6 6"/>',
    pie: '<path d="M12 3.2V12h8.8A9 9 0 0 0 12 3.2Z"/><path d="M20.8 13.5A9 9 0 1 1 10.5 3.2"/>',
    spinner: '<path d="M21 12a9 9 0 1 1-2.7-6.4"/>',
    empty: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M3.5 13h4l1.4 2.4h6.2L16.5 13h4"/>'
  };

  function Icon(name, opts) {
    opts = opts || {};
    const size = opts.size || 20;
    const stroke = opts.stroke || 1.75;
    const inner = P[name] || P.info;
    const cls = 'icon ' + (opts.cls || '') + (opts.animate ? ' anim-' + opts.animate : '');
    return '<svg class="' + cls + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="' + stroke + '" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false">' + inner + '</svg>';
  }
  Icon.names = Object.keys(P);
  window.Icon = Icon;
})();
