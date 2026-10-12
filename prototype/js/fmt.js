/* ============================================================================
   FMT — utilidades de formato (es-PE). Cifras con tabular-nums vía CSS.
   ============================================================================ */
(function () {
  const nf = new Intl.NumberFormat('es-PE');
  const nf1 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const FMT = {
    number: (n) => nf.format(Math.round(Number(n) || 0)),
    one: (n) => nf1.format(Number(n) || 0),
    percent: (n, digits) => (digits ? nf1.format(Number(n) || 0) : nf.format(Math.round(Number(n) || 0))) + '%',
    money: (n) => 'S/ ' + nf.format(Math.round(Number(n) || 0)),

    /* "Ahora" · "hace 2 m" · "hace 3 h" · "hace 5 d" (minutos transcurridos) */
    relative: (min) => {
      min = Math.max(0, Math.round(min));
      if (min < 1) return 'Ahora';
      if (min < 60) return 'hace ' + min + ' m';
      if (min < 1440) return 'hace ' + Math.round(min / 60) + ' h';
      return 'hace ' + Math.round(min / 1440) + ' d';
    },

    /* "en 2 h" · "en 3 d" (minutos futuros) */
    relativeFuture: (min) => {
      min = Math.max(0, Math.round(min));
      if (min < 60) return 'en ' + min + ' m';
      if (min < 1440) return 'en ' + Math.round(min / 60) + ' h';
      return 'en ' + Math.round(min / 1440) + ' d';
    },

    /* Fecha corta es-PE a partir de un timestamp */
    date: (ts) => new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(new Date(ts)),

    /* Hora HH:mm */
    time: (ts) => new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts)),

    /* "lunes, 12 de octubre" */
    longDate: (ts) => new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(ts)),

    initials: (name) => (name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase(),

    /* Saludo según la hora */
    greeting: () => {
      const h = new Date().getHours();
      if (h < 12) return 'Buenos días';
      if (h < 19) return 'Buenas tardes';
      return 'Buenas noches';
    },

    /* Teléfono normalizado visible: +51 987 654 321 */
    phone: (e164) => e164
  };
  window.FMT = FMT;

  /* Escapa texto para interpolar en HTML con seguridad */
  window.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
})();
