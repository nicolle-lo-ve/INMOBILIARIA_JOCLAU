# Changelog — Prototipo v2

Resumen de la mejora **v2** del prototipo navegable frente a la v1. El objetivo fue llevarlo a calidad de producto: interfaz profesional, iconografía vectorial (cero emojis), panel del asesor intuitivo y **cero controles muertos**. Se trabajó por fases (A–H) según el brief.

> Sigue sin haber build step, frameworks ni librerías externas (solo la tipografía Inter). Los módulos se cargan con etiquetas `<script>` ordenadas.

## Fase A — Base de render y formato

- **`render()` por zonas** (shell estático + `#view`): conserva **scroll** (vista y columnas del Kanban), **foco** e **valores de entrada** entre repintados.
- La animación de entrada de vista (`view-inner.enter`) ocurre **solo al cambiar de pantalla**, no en cada repintado.
- Nuevos formateadores en `js/fmt.js` (`window.FMT`): `number`, `percent`, `relative`, `date`… más `window.esc()` para escapar HTML.
- Clase `.num` / `.tabnum` con `tabular-nums` para cifras estables.
- CSS con `:focus-visible`, `prefers-reduced-motion` y breakpoints **1240 / 1100 / 1024 / 760**.

## Fase B — Iconografía vectorial

- Nuevo **`js/icons.js`**: `Icon(name, { size, cls, animate })` devuelve SVG en línea (24×24, trazo `currentColor`, grosor 1.75, estilo Lucide).
- **Se eliminaron todos los emojis y glifos** usados como iconos. Verificación: `0` coincidencias en los rangos prohibidos.
- Animaciones sutiles: `live` (pulso), `flame`, `spin`, `sun`, `bell`, check **dibujado** (`stroke-dashoffset`), `pop`, `float`, y barras/donuts que **crecen** al entrar.

## Fase C — Sistema de diseño y shell

- **Tokens** en `:root` (marca, antracita, semánticos, temperaturas, fases, espaciado, radios, elevación, tipografía, z-index).
- **Topbar** fina de 56 px en antracita; **sidebar** blanca con secciones etiquetadas, barra roja de activo y modo colapsado con tooltips.
- **Encabezado de pantalla** estándar (título + una línea explicativa + **una** acción primaria).
- **Selects propios** que reemplazan al `<select>` nativo (no queda ninguno).
- **Login** a dos columnas con ilustración SVG de marca y **cuatro tarjetas de rol**.

## Fase D — Interacción y cero controles muertos

- **Tour** de coach-marks por rol, ayuda (`?`), **paleta de comandos** (`Ctrl`+`K`) y tooltips contextuales.
- **Drag & drop** con pista visual y **alternativa accesible/táctil** "Mover a…", más **Deshacer** en mover, temperatura y reasignación (individual y masiva).
- **Acción sugerida** en cada tarjeta.
- Todo control responde: filtros del dashboard recalculan, SLA lleva a **Leads** filtrado, la campana se llena de **eventos reales** de la sesión, la disponibilidad del asesor afecta al **Round-Robin** y a **Equipo**, la reasignación individual/masiva tiene diálogo + motivo + auditoría, y el desbloqueo/reinicio **cambia el estado real**.
- **Auditoría** alimentada por las acciones de la sesión, con banner **"Registro inmutable"**.
- **Ingesta** que **aplica de verdad**: normalización, dedupe, reingreso, adscripción de 30 días y Round-Robin entre asesores disponibles (teléfono inválido = error claro), con **stepper** animado, tarjeta de resultado (**"Ver como …"** / **"Registrar otro"**) y **vista previa** de carga masiva.
- **Modo demostración**: píldora oscura abajo al centro (tecla `D`) con guía de 7 pasos que **se marca sola**, más **simular lead** y **reiniciar demo**.

## Fase E — Pantalla estrella del asesor

- Navegación del asesor: **Mi panel** (por defecto) + **Mi pipeline** (se retiró "Mi resumen").
- **Mi panel** en rejilla de 12 columnas (máx. 1440 px): 5 **KPIs** con count-up y sparkline (uno rojo y clicable), **Prioridades de hoy**, **Mi embudo**, **temperatura**, **rendimiento vs equipo**, **origen de leads**, **agenda** y **actividad reciente** (se añadió `visitAt` derivado del `id`).
- **Mi pipeline**: barra de resumen + chips, búsqueda y filtros propios, vista segmentada **Tablero / Lista**; Kanban de **altura fija con scroll interno** y cabecera fija; **DESECHADO** como riel colapsado; tarjeta compacta de 3 filas con acciones rápidas al pasar el cursor; **drawer** con stepper de fase, copiar/WhatsApp, edición de nombre en línea, compositor de interacción, **timeline vertical** de iconos y **pie fijo**.

## Fase F — Resto de pantallas

- Se aplicó el sistema de diseño a **Dashboard, Leads, Equipo, Ingesta, Reportes, Auditoría, Usuarios y Configuración**.
- Gráficos con tooltips, `aria-label`, **alternativa tabular**, degradados y animación de entrada.

## Fase G — Documentación

- Nuevos documentos: `docs/README.md`, `docs/flujos/{asesor,gerente,recepcion,superadmin}.md`, `docs/guia-demo.md`, `docs/diseno/sistema-de-diseno.md` y este changelog. Actualizado `prototype/README.md`.

## Fase H — Verificación

- **0 emojis/pictogramas** en los rangos prohibidos (y ningún `<select>` nativo).
- Flujo recorrido de extremo a extremo para cada rol **sin errores de ejecución**.
- Revisión de **1920×1080**, **1366×768** y **390×844** (sin desbordamiento horizontal), navegación por teclado, foco visible, contraste AA, `prefers-reduced-motion` y coherencia al cambiar de rol.

## Cambios que rompen compatibilidad (internos del prototipo)

- `DB.sources[].icon` (emoji) pasa a **`iconKey`** (nombre de icono vectorial).
- Se mantiene `window.DB` y **no** cambian los campos existentes; los campos nuevos (`idHash`, `visitInMin`/`visitAt`, `weight`, `isAvailable`, `iconKey`, `settings.default_phone_region`, `settings.country_code`) **no consumen** el generador aleatorio, por lo que las cifras de la v1 no cambian.
- Nuevos módulos: `js/fmt.js`, `js/icons.js`, `js/ui.js`, `js/charts.js` (además de `data.js` y `app.js`).

## Decisiones propias (no especificadas en el brief)

- Los datos ficticios siguen con **semilla fija**; los campos nuevos se derivan con un **hash FNV-1a del `id`**.
- Los flags del tour se guardan **en memoria** (no en `localStorage`).
- La paleta `Ctrl`+`K` y los menús usan **delegación de eventos** con `data-action`.
- Tooltips de navegación con `title` nativo (por el recorte del sidebar); el resto, con `data-tip` (CSS).
- `viewAs(asesor)` deriva un pseudo-usuario **ASESOR** para ver el pipeline del asesor indicado.

## Pendientes / limitaciones conocidas

- **Sin backend ni persistencia**: todo el estado vive en memoria; se reinicia con recarga o **Reiniciar demo**.
- En **Configuración** los parámetros se muestran como referencia; **"Guardar configuración"** confirma, avisa y audita (la edición persistente llega con el sistema real).
- La lista de **Leads** usa scroll + *cargar más* en lugar de virtualización de filas.
- Los nombres de empresa/proyecto, los KPIs del dashboard y el logo son **ficticios** (pendiente de datos reales del cliente).
