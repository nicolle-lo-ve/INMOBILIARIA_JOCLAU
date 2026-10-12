/* ============================================================================
   Datos simulados del prototipo — CRM Inmobiliario (v2)
   ----------------------------------------------------------------------------
   Todos los nombres, teléfonos, proyectos y cifras son FICTICIOS (ver plan §7).
   La generación es determinista (semilla fija) para que la demo sea siempre
   reproducible. Los campos añadidos en v2 NO consumen el generador `rnd()`:
   se derivan de un hash del `id` para que las cifras existentes no cambien.
   ============================================================================ */
(function () {
  /* --- PRNG determinista (LCG) para datos reproducibles --- */
  function lcg(seed) {
    let s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  const rnd = lcg(20261011);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const chance = (p) => rnd() < p;
  function weighted(list) {
    const total = list.reduce((t, i) => t + i.w, 0);
    let r = rnd() * total;
    for (const i of list) { r -= i.w; if (r <= 0) return i; }
    return list[list.length - 1];
  }
  /* Hash FNV-1a de 32 bits — para campos derivados sin tocar rnd() */
  function idHash(id) {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0);
  }

  const ADVISORS = [
    { id: 'u-1', name: 'Aline Reyes',       weight: 1, isAvailable: true },
    { id: 'u-2', name: 'Amaderlin Alfonzo', weight: 2, isAvailable: true },
    { id: 'u-3', name: 'Carla Núñez',       weight: 1, isAvailable: true },
    { id: 'u-4', name: 'Jorge Salas',       weight: 1, isAvailable: true },
    { id: 'u-5', name: 'Marina Cordero',    weight: 1, isAvailable: true },
    { id: 'u-6', name: 'Pedro Ruiz',        weight: 1, isAvailable: true },
    { id: 'u-7', name: 'Rocío Delgado',     weight: 1, isAvailable: false },
    { id: 'u-8', name: 'Sebastián Vega',    weight: 1, isAvailable: true },
    { id: 'u-9', name: 'Vanessa Ríos',      weight: 1, isAvailable: true }
  ];

  const FIRST = ['María','José','Carlos','Ana','Luis','Carla','Jorge','Pedro','Sofía','Diego',
    'Valeria','Ricardo','Lucía','Fernando','Camila','Andrés','Paola','Miguel','Daniela','Raúl',
    'Elena','Iván','Gabriela','Héctor','Natalia','Alonso','Rosa','Emilio','Beatriz','Óscar',
    'Patricia','Manuel','Verónica','Sergio','Claudia','Ramiro','Silvia','Tomás','Mónica','Fabián'];
  const LAST = ['Pérez','Salas','Torres','Ruiz','Ortega','Núñez','Ramírez','Flores','Rojas','Vargas',
    'Mendoza','Castro','Chávez','Ramos','Guzmán','Herrera','Castillo','Vega','Ríos','Delgado',
    'Cordero','Arévalo','Portugal','Ibáñez'];

  /* `iconKey` reemplaza el antiguo emoji. La UI lo resuelve con Icon(iconKey). */
  const SOURCES = [
    { code: 'META_ADS',  label: 'Meta Ads',  iconKey: 'megaphone',  w: 5 },
    { code: 'WHATSAPP',  label: 'WhatsApp',  iconKey: 'chat',       w: 4 },
    { code: 'INSTAGRAM', label: 'Instagram', iconKey: 'camera',     w: 2 },
    { code: 'WEB',       label: 'Web',       iconKey: 'globe',      w: 1 },
    { code: 'REFERIDO',  label: 'Referido',  iconKey: 'users-plus', w: 1 },
    { code: 'TIKTOK',    label: 'TikTok',    iconKey: 'music',      w: 1 }
  ];

  const PROJECTS = ['Torre Miraflores', 'Residencial Surco', 'Condominio Barranco', 'Precio de Lima', 'Lomas de Asia'];

  const CAMPAIGNS = {
    META_ADS:  ['Octubre - Departamentos Lima', 'Septiembre - Preventa'],
    WHATSAPP:  ['Campaña WhatsApp Directo'],
    INSTAGRAM: ['Reels - Miraflores'],
    WEB:       ['Formulario Web'],
    REFERIDO:  ['Programa Referidos'],
    TIKTOK:    ['TikTok - Lomas']
  };

  const STATUS = [
    { key: 'NUEVO', w: 15 }, { key: 'CONTACTADO', w: 30 }, { key: 'VISITA_AGENDADA', w: 12 },
    { key: 'NEGOCIACION', w: 8 }, { key: 'CALIFICADO', w: 12 }, { key: 'DESECHADO', w: 23 }
  ];

  const DISCARD = [
    'No contesta / número inválido',
    'Presupuesto insuficiente',
    'Compró con la competencia',
    'Busca alquiler, no compra',
    'Datos incompletos'
  ];

  const TOTAL = 1251;
  const leads = [];

  for (let i = 0; i < TOTAL; i++) {
    const advisor = ADVISORS[i % ADVISORS.length];
    const source = weighted(SOURCES);
    const status = weighted(STATUS).key;
    const advanced = ['VISITA_AGENDADA', 'NEGOCIACION', 'CALIFICADO'].includes(status);
    const hasName = advanced ? true : chance(0.82);

    const assignedMinAgo = status === 'NUEVO' ? ri(1, 240) : ri(40, 26000);
    const ingestedMinAgo = assignedMinAgo + ri(0, 1500);
    const lastActivityMin = status === 'NUEVO' ? assignedMinAgo : ri(1, Math.max(5, assignedMinAgo - 15));
    const firstContactMin = status === 'NUEVO' ? null : (chance(0.78) ? ri(2, 14) : ri(16, 90));

    let temperature;
    if (['CALIFICADO', 'NEGOCIACION'].includes(status)) temperature = chance(0.9) ? 'CALIENTE' : 'TIBIO';
    else if (status === 'VISITA_AGENDADA') temperature = chance(0.7) ? 'CALIENTE' : 'TIBIO';
    else if (status === 'CONTACTADO') temperature = chance(0.4) ? 'CALIENTE' : (chance(0.6) ? 'TIBIO' : 'FRIO');
    else if (status === 'DESECHADO') temperature = chance(0.5) ? 'FRIO' : 'TIBIO';
    else temperature = chance(0.5) ? 'FRIO' : 'TIBIO';

    const digits = () => String(ri(100, 999));

    const id = 'L' + String(100000 + i);
    const h = idHash(id);
    // Visita futura (min desde ahora) derivada del id — 30 min .. 7 días.
    const visitInMin = status === 'VISITA_AGENDADA' ? (30 + (h % (7 * 24 * 60 - 30))) : null;

    leads.push({
      id,
      fullName: hasName ? pick(FIRST) + ' ' + pick(LAST) : null,
      phone: '+51 9' + ri(10, 99) + ' ' + digits() + ' ' + digits(),
      source,
      project: pick(PROJECTS),
      campaign: pick(CAMPAIGNS[source.code]),
      asesorId: advisor.id,
      asesorName: advisor.name,
      status,
      temperature,
      reentry: chance(0.12),
      assignedMinAgo,
      ingestedMinAgo,
      lastActivityMin,
      firstContactMin,
      visitInMin,
      discardReason: status === 'DESECHADO' ? pick(DISCARD) : null,
      observations: chance(0.4) ? 'Cliente interesado, coordinar visita fuera de horario laboral.' : null,
      externalUsername: ['INSTAGRAM', 'TIKTOK'].includes(source.code) && chance(0.6) ? ('user_' + ri(1000, 9999)) : null
    });
  }

  window.DB = {
    advisors: ADVISORS,
    sources: SOURCES,
    projects: PROJECTS,
    discardReasons: DISCARD,
    leads,
    users: {
      ASESOR:     { id: 'u-1',  name: 'Aline Reyes',           role: 'ASESOR',     email: 'asesor@crm.test' },
      GERENTE:    { id: 'u-99', name: 'Gerente General',       role: 'GERENTE',    email: 'gerente@crm.test' },
      RECEPCION:  { id: 'u-50', name: 'Recepción / Marketing', role: 'RECEPCION',  email: 'recepcion@crm.test' },
      SUPERADMIN: { id: 'u-0',  name: 'Administrador',         role: 'SUPERADMIN', email: 'admin@crm.test' }
    },
    settings: {
      adscription_days: 30,
      assignment_strategy: 'ROUND_ROBIN',
      first_contact_sla_minutes: 15,
      default_phone_region: 'PE',
      country_code: '+51',
      temperature_probability: { CALIENTE: 0.5, TIBIO: 0.2, FRIO: 0.05 }
    },
    idHash
  };
})();
