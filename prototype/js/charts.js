/* ============================================================================
   CHARTS — gráficos SVG propios (sin librerías).
   · Colores vía `style` (soporta var(--token) en todos los navegadores).
   · Degradados de entrada, animación de crecimiento y tooltips (<title>).
   · Accesibles: role="img" + aria-label y alternativa tabular (.sr-only).
   ============================================================================ */
(function () {
  const n = (v) => FMT.number(v);
  let _uid = 0;
  const uid = (p) => p + (++_uid);

  /* Tabla accesible oculta (alternativa tabular) */
  function srTable(caption, rows) {
    return '<table class="sr-only"><caption>' + esc(caption) + '</caption><tbody>' +
      rows.map((r) => '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(String(r[1])) + '</td></tr>').join('') +
      '</tbody></table>';
  }

  /* Mini sparkline de KPI */
  function spark(values, o) {
    o = o || {};
    const w = o.w || 130, h = o.h || 36, pad = 3;
    if (!values || !values.length) return '';
    const max = Math.max.apply(null, values) || 1;
    const min = Math.min.apply(null, values);
    const span = (max - min) || 1;
    const step = (w - pad * 2) / (values.length - 1 || 1);
    const pts = values.map((v, i) => [pad + i * step, h - pad - ((v - min) / span) * (h - pad * 2)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ' L ' + pts[pts.length - 1][0].toFixed(1) + ' ' + (h - pad) + ' L ' + pad + ' ' + (h - pad) + ' Z';
    const color = o.color || 'var(--brand)';
    const gid = uid('spk');
    return '<svg class="spark-svg chart-anim" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" style="stop-color:' + color + ';stop-opacity:.28"></stop>' +
        '<stop offset="100%" style="stop-color:' + color + ';stop-opacity:0"></stop></linearGradient></defs>' +
      '<path d="' + area + '" style="fill:url(#' + gid + ')"></path>' +
      '<path class="chart-line" d="' + line + '" style="fill:none;stroke:' + color + ';stroke-width:2;stroke-linecap:round;stroke-linejoin:round"></path>' +
      '</svg>';
  }

  /* Gráfico de líneas con cuadrícula tenue, puntos y degradado */
  function line(values, o) {
    o = o || {};
    const w = o.w || 620, h = o.h || 180, padX = 26, padY = 22;
    const max = Math.max.apply(null, values.concat([1]));
    const step = (w - padX * 2) / (values.length - 1 || 1);
    const pts = values.map((v, i) => [padX + i * step, h - padY - (v / max) * (h - padY * 2)]);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = path + ' L ' + pts[pts.length - 1][0].toFixed(1) + ' ' + (h - padY) + ' L ' + padX + ' ' + (h - padY) + ' Z';
    const color = o.color || 'var(--brand)';
    const gid = uid('ln');
    const grid = [0, 1, 2, 3].map((i) => {
      const y = padY + i * ((h - padY * 2) / 3);
      return '<line x1="' + padX + '" x2="' + (w - padX) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" style="stroke:var(--line);stroke-width:1"></line>';
    }).join('');
    const dots = pts.map((p, i) => '<circle class="chart-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) +
      '" r="3" style="fill:#fff;stroke:' + color + ';stroke-width:2"><title>' + (o.labels ? esc(o.labels[i]) + ': ' : '') + n(values[i]) + '</title></circle>').join('');
    const labels = (o.labels || []).map((lb, i) => [lb, values[i]]);
    return '<svg class="chart-anim" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(o.aria || ('Serie de ' + values.length + ' valores')) + '">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" style="stop-color:' + color + ';stop-opacity:.22"></stop>' +
        '<stop offset="100%" style="stop-color:' + color + ';stop-opacity:0"></stop></linearGradient></defs>' +
      grid + '<path d="' + area + '" style="fill:url(#' + gid + ')"></path>' +
      '<path class="chart-line" d="' + path + '" style="fill:none;stroke:' + color + ';stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"></path>' +
      dots + '</svg>' + (labels.length ? srTable(o.aria || 'Serie temporal', labels) : '');
  }

  /* Barras horizontales con etiqueta, valor, meta y degradado */
  function bars(rows, o) {
    o = o || {};
    const max = Math.max.apply(null, rows.map((r) => r.value).concat([1]));
    const list = rows.map((r) => {
      const color = r.color || o.color || 'var(--ink-1)';
      const pct = Math.max(2, (r.value / max) * 100);
      return '<div class="hbar-row"' + (r.action ? ' data-action="' + r.action + '" data-value="' + esc(r.valueKey || '') + '" role="button" tabindex="0"' : '') + '>' +
        '<span class="hbar-label">' + (r.icon ? Icon(r.icon, { size: 16, cls: 'hbar-ic' }) : '') + esc(r.label) + '</span>' +
        '<span class="hbar-track"><i class="hbar-fill chart-bar" style="--w:' + pct.toFixed(1) + '%;background:' + color + '"></i></span>' +
        '<span class="hbar-meta">' + (r.meta || n(r.value)) + '</span>' +
        '</div>';
    }).join('');
    return list + srTable(o.aria || 'Valores por categoría', rows.map((r) => [r.label, r.value]));
  }

  /* Anillo (donut) */
  function donut(segments, o) {
    o = o || {};
    const size = o.size || 148, thick = o.thickness || 16;
    const r = (size - thick) / 2, cx = size / 2, cy = size / 2;
    const C = 2 * Math.PI * r;
    const total = segments.reduce((t, s) => t + s.value, 0) || 1;
    let acc = 0;
    const arcs = segments.map((s) => {
      const frac = s.value / total;
      const dash = (frac * C).toFixed(2);
      const el = '<circle class="chart-arc" cx="' + cx + '" cy="' + cy + '" r="' + r + '" style="fill:none;stroke:' + s.color +
        ';stroke-width:' + thick + ';stroke-dasharray:' + dash + ' ' + (C - dash).toFixed(2) +
        ';stroke-dashoffset:' + (-acc * C).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + esc(s.label || '') + ': ' + n(s.value) + '</title></circle>';
      acc += frac;
      return el;
    }).join('');
    const center = o.center != null ? '<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" class="donut-center">' + esc(o.center) + '</text>' : '';
    return '<svg class="chart-anim donut" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(o.aria || 'Distribución') + '">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" style="fill:none;stroke:var(--surface-2);stroke-width:' + thick + '"></circle>' +
      arcs + center + '</svg>' + srTable(o.aria || 'Distribución', segments.map((s) => [s.label, s.value]));
  }

  /* Embudo vertical con % de paso */
  function funnel(stages, o) {
    o = o || {};
    const max = Math.max.apply(null, stages.map((s) => s.value).concat([1]));
    return stages.map((s) => {
      const pct = Math.max(8, (s.value / max) * 100);
      return '<div class="funnel-row"' + (s.action ? ' data-action="' + s.action + '" data-phase="' + esc(s.phase || '') + '" role="button" tabindex="0"' : '') + '>' +
        '<span class="funnel-label">' + (s.icon ? Icon(s.icon, { size: 16, cls: 'hbar-ic' }) : '') + esc(s.label) + '</span>' +
        '<span class="funnel-track"><i class="funnel-fill chart-bar" style="--w:' + pct.toFixed(1) + '%;background:' + (s.color || 'var(--ink-1)') + ';color:' + (s.fg || '#fff') + '">' + n(s.value) + '</i></span>' +
        '<span class="hbar-meta">' + (s.step != null ? Math.round(s.step) + '%' : '') + '</span>' +
        '</div>';
    }).join('');
  }

  /* Bullet: valor vs meta sobre una escala */
  function bullet(o) {
    const max = o.max || 100;
    const v = Math.min(100, (o.value / max) * 100);
    const t = Math.min(100, (o.target / max) * 100);
    return '<div class="bullet">' +
      '<div class="bullet-head"><span>' + esc(o.label) + '</span><b>' + (o.display || n(o.value)) + '</b></div>' +
      '<div class="bullet-track"><i class="bullet-fill chart-bar" style="--w:' + v.toFixed(1) + '%;background:' + (o.color || 'var(--brand)') + '"></i>' +
      '<span class="bullet-mark" style="left:' + t.toFixed(1) + '%" title="Meta: ' + esc(o.targetLabel || o.target) + '"></span></div>' +
      '</div>';
  }

  window.Charts = { spark, line, bars, donut, funnel, bullet };
})();
