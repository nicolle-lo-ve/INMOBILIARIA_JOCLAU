# Sistema de diseño — Prototipo v2

Documenta los tokens, componentes, iconografía, movimiento y accesibilidad del prototipo. Todo vive en `prototype/css/styles.css` (tokens en `:root`) y en los módulos `prototype/js/icons.js`, `ui.js` y `charts.js`. Sin dependencias salvo la tipografía **Inter**.

## Principios

1. **Aire y jerarquía**: mucho espacio en blanco, una idea por bloque, encabezado de pantalla con **título + una línea que explica** + **una única acción primaria**.
2. **Iconografía vectorial propia**: nada de emojis ni glifos de fuente. Los iconos son SVG en línea (trazo, `currentColor`).
3. **El rojo, con moderación**: `#C00000` se reserva para **acción primaria**, **navegación activa**, **alertas** y **errores**. La estructura es **antracita**.
4. **Color con significado**: cada fase tiene su pastel y cada temperatura su badge. El color nunca es decorativo.
5. **Sin controles muertos**: todo lo que parece clicable, lo es (filtra, navega, abre o confirma).

## Color

### Marca

| Token | Valor | Uso |
|---|---|---|
| `--brand` | `#C00000` | Acción primaria, nav activa, alertas, errores |
| `--brand-hover` | `#A60000` | Estado *hover* de la acción primaria |
| `--brand-soft` | `#FBEAEA` | Fondos de alerta suave |

### Estructura (antracita)

| Token | Valor | Uso |
|---|---|---|
| `--ink-900` | `#1F1F1F` | Texto principal, topbar |
| `--ink-1` | `#404040` | Texto de cuerpo |
| `--ink-2` | `#595959` | Texto secundario |
| `--ink-3` | `#6E7377` | Texto terciario |
| `--muted` | `#8A9096` | Texto de apoyo |
| `--line` / `--line-2` | `#E5E7EA` / `#EEF0F2` | Bordes y separadores |
| `--surface` / `--surface-2` / `--bg` | `#FFFFFF` / `#F5F6F8` / `#F6F7F9` | Superficies y fondo de app |

### Semánticos

| Token | Valor | Uso |
|---|---|---|
| `--ok` / `--ok-bg` | `#2F7D4A` / `#E6F3EA` | Éxito, disponibilidad, completado |
| `--warn` / `--warn-bg` | `#9A6B00` / `#FDF3D6` | Advertencia, reingreso |
| `--danger` / `--danger-bg` | `#C00000` / `#FBEAEA` | Error, fuera de SLA |
| `--info` / `--info-bg` | `#0F7E80` / `#E1F2F2` | Información |

### Temperaturas

| Token | Valor | Badge |
|---|---|---|
| `--hot` / `--hot-bg` | `#17692F` / `#DFF3E4` | Caliente |
| `--warm` / `--warm-bg` | `#7A5A00` / `#FFF4CC` | Tibio |
| `--cold` / `--cold-bg` | `#2F5F8A` / `#E4EDF5` | Frío |

### Fases (fondo pastel + acento)

| Fase | Fondo | Acento |
|---|---|---|
| NUEVO | `--p-nuevo-bg` `#EEE9FB` | `--p-nuevo` `#5B3FC4` |
| CONTACTADO | `--p-contactado-bg` `#DFF3F3` | `--p-contactado` `#0F7E80` |
| VISITA AGENDADA | `--p-visita-bg` `#FDEBDD` | `--p-visita` `#C46418` |
| NEGOCIACIÓN | `--p-negociacion-bg` `#FBE4EE` | `--p-negociacion` `#A83268` |
| CALIFICADO | `--p-calificado-bg` `#E4F1E6` | `--p-calificado` `#2F7D4A` |
| DESECHADO | `--p-desechado-bg` `#ECEEF0` | `--p-desechado` `#6B7278` |

## Tipografía

Inter. Escala en tokens `--fs-12` … `--fs-32` (12, 13, 14, 16, 20, 24, 32 px). Títulos con `letter-spacing: -.01em`. Las **cifras** usan la clase `.num` con `font-variant-numeric: tabular-nums` para que no "bailen" al cambiar.

## Espaciado, radios, elevación

| Grupo | Tokens |
|---|---|
| Espaciado | `--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 · `--s7` 48 px |
| Radios | `--r1` 8 · `--r2` 12 · `--r3` 16 · `--rpill` 999 px |
| Elevación | `--e1` sutil · `--e2` tarjetas/popovers · `--e3` modales/drawer |
| z-index | `--z-top` 40 · `--z-side` 45 · `--z-pop` 60 · `--z-drawer` 70 · `--z-modal` 80 · `--z-toast` 90 · `--z-tour` 100 |

## Estructura de la app

- **Topbar** fina (56 px, `--topbar-h`) en antracita: logo + "Prototipo", buscador (`Ctrl`+`K`), indicador **En vivo**, ayuda, campana con contador y avatar.
- **Sidebar** blanca y colapsable (`--side-w` 238 px ↔ `--side-w-collapsed` 66 px) con **secciones etiquetadas**, **barra roja** en la opción activa, badges de alerta y pie con el rol actual.
- **Encabezado de pantalla** (`pageHead`): título + línea explicativa + acciones (normalmente **una** acción primaria roja).
- **Zonas de render**: el shell es estático; solo se repinta `#view`, preservando scroll, foco y valores de entrada.

## Componentes

| Componente | Notas |
|---|---|
| **Botón** (`btn`, `btn primary`, `btn ghost`, `btn sm`, `icon-btn`) | Primario rojo; hover `--brand-hover`; foco visible |
| **Chip / Segmented** | Filtros y conmutadores (Tablero/Lista) |
| **Select propio** | Reemplaza al `<select>` nativo; lista de opciones con icono y check |
| **Card** (`card`, `card-pad`, `card-head`) | Contenedor base con cabecera y acciones |
| **KPI** (`kpi`, `k-value`, `k-delta`, `k-spark`) | Count-up + sparkline; variante `alert` (roja) |
| **Badge** (`badge-ok`, `badge-sla`, `badge-reentry`, `badge-neutral`, `badge-temp`) | Estado y temperatura |
| **Tabla** (`data-table`, `cell-name`, `is-selected`) | Cabecera fija, filas clicables, selección múltiple |
| **Switch** (`switch`) | Disponibilidad de asesor y recepción de leads |
| **Dropzone** (`dropzone`) | Carga masiva simulada |
| **Stepper** (`stepper`, `ingest-step`) | Fases del lead y validación de ingesta |
| **Drawer** (`drawer`, `drawer-head/body/foot`) | Detalle del lead con stepper, timeline y pie fijo |
| **Modal** (`modal`, `modal-sm`) y **Popover/Menú** (`popover`, `pop-item`) | Diálogos y menús contextuales |
| **Toast** (`toast`) | Feedback breve, con acción (p. ej. **Deshacer**) |
| **Charts** | `spark`, `line`, `bars`, `donut`, `funnel`, `bullet` (SVG propio) |
| **Command palette** (`cmdk`) | Búsqueda global (`Ctrl`+`K`) |
| **Tour** (`tour-overlay`) | Coach-marks por rol |
| **Modo demostración** (`demo-dock`) | Píldora oscura con guía de 7 pasos |

## Iconografía

`Icon(name, { size, cls, animate })` devuelve un `<svg>` de 24×24, trazo `currentColor` (grosor 1.75), estilo lineal tipo Lucide, dibujado a mano. Sin emojis ni pictogramas.

Animaciones disponibles (clase en el SVG):

| `animate` | Efecto | Ejemplos de uso |
|---|---|---|
| `live` | Pulso | Indicador "En vivo" |
| `flame` | Llama | Temperatura Caliente |
| `spin` | Giro lento | Carga |
| `sun` | Pulso de sol | Temperatura Tibio |
| `bell` | Sacudida | Campana de notificaciones |
| `draw` | Trazo que se dibuja (`stroke-dashoffset`) | Check de confirmación |
| `pop` / `float` | Aparición / flotación | Detalles y estados vacíos |

## Movimiento

- Transiciones breves (≈120–220 ms). La vista entra con `fadeup` **solo al cambiar de pantalla** (`view-inner.enter`), no en cada repintado.
- Barras y donuts crecen al entrar (`growbar`, `donutin`); los KPIs hacen **count-up**; las tarjetas, `cardin`; el lead recién creado, `flash`.
- **`prefers-reduced-motion`**: se desactivan animaciones de iconos y bucles (`.anim-live`, `.anim-flame`, `.anim-spin`, `.anim-sun`, `.anim-float`, puntos "En vivo") y se acortan las duraciones.

## Accesibilidad

- **Foco visible** en todo control interactivo (`:focus-visible`, anillo rojo), incluso en el switch.
- **Rol y nombre** en gráficos (`role="img"` + `aria-label`) y **alternativa tabular** oculta (`.sr-only`) en `line`, `bars` y `donut`; tooltips nativos con `<title>`.
- **Navegación por teclado**: tarjetas, filas y elementos `role="button"` se activan con `Enter`/`Espacio`; `Esc` cierra; `Ctrl`+`K`, `D` y `?` abren utilidades.
- **Contraste AA**: texto sobre fondos claros y antracita; el rojo de marca se usa sobre blanco o como relleno con texto blanco.
- **Tooltips** vía `data-tip` (CSS) y `title` (nativo) para los iconos sin etiqueta.
- **Números estables** con `tabular-nums`.

## Responsive

| Breakpoint | Ajustes principales |
|---|---|
| ≤ 1240 px | KPIs a 3 columnas; columnas anchas pasan a fila completa |
| ≤ 1100 px | Sidebar en modo iconos (tooltips por `title`) |
| ≤ 1024 px | Login a una columna (se oculta la ilustración); grids 2/3 a 1; ingesta a 1 columna |
| ≤ 760 px | KPIs a 2 columnas; sidebar como panel deslizante con botón de menú; drawer a ancho completo |

Objetivo de verificación (Fase H): **1920×1080**, **1366×768** y **390×844** sin desbordamiento horizontal y sin errores de consola.
