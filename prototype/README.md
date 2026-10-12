# Prototipo navegable — CRM Inmobiliario (v2)

Prototipo de **alta fidelidad** que muestra al cliente **cómo será la interfaz final y el flujo de trabajo**, antes de construir el sistema real. Está basado en `docs/plan_accion_crm_inmobiliario.md` §4 (UI/UX y design tokens) y §7 (wireframes del prototipo).

> Nota: no es el producto final — no hay backend, base de datos ni lógica real. Todos los datos son ficticios y se generan de forma **determinista** (semilla fija) para que la demo sea siempre reproducible.

## Cómo abrirlo

- **Opción simple:** haz doble clic en `index.html` (funciona offline, sin instalación ni build step).
- **Opción servidor local** (recomendada si el navegador bloquea `file://`):

  ```powershell
  # Python
  python -m http.server 8080 --directory prototype

  # o Node
  npx serve prototype
  ```

  Luego abre `http://localhost:8080`.

## Estructura

```
prototype/
├─ index.html          Punto de entrada (sin build step)
├─ css/styles.css      Design system (tokens, componentes, responsive)
└─ js/
   ├─ data.js          Datos simulados (1251 leads, 9 asesores)
   ├─ icons.js         Set vectorial propio: Icon(name, { size, cls, animate })
   ├─ fmt.js           Formateadores es-PE (número, %, relativo, fecha) + esc()
   ├─ ui.js            Primitivas: toast, popover, menú, modal, select, count-up
   ├─ charts.js        Gráficos SVG: spark, line, bars, donut, funnel, bullet
   └─ app.js           Vistas, Kanban con drag & drop, reglas de negocio, router
```

Los scripts se cargan **en ese orden** mediante etiquetas `<script>`; no hay dependencias externas (solo la tipografía Inter).

## Roles y qué muestra cada uno

| Rol | Pantallas | Qué demuestra |
|---|---|---|
| **Asesor comercial** | `#/panel` (Mi panel), `#/pipeline` (Mi pipeline) | Prioridades del día, KPIs, embudo, Kanban, drawer del lead, temperatura, SLA |
| **Gerencia** | Dashboard, Leads, Equipo, Ingesta, Reportes, Auditoría | Consolidado en vivo, KPIs con filtros, embudo, carga por asesor, reasignación individual y masiva |
| **Recepción / Marketing** | Ingesta de leads | Alta individual con normalización + carga masiva con vista previa y reglas aplicadas |
| **Superadministrador** | Dashboard, Leads, Equipo, Ingesta, Auditoría, Usuarios, Configuración | RBAC, desbloqueo, parámetros del sistema, registro inmutable |

Arriba a la derecha puedes **cambiar de rol** en cualquier momento (avatar, menú "Ver como").

## Modo demostración

El botón **"Modo demostración"** (píldora oscura, abajo al centro; o la tecla **D**) abre una guía de 7 pasos que se **marca sola** al cumplir cada acción:

1. Inicia sesión con un perfil.
2. Abre "Mi panel" del Asesor.
3. Contacta un lead fuera de SLA.
4. Mueve un lead a VISITA AGENDADA.
5. Cambia a Gerente con el avatar.
6. Reasigna un lead (individual o masiva).
7. Crea un lead desde Ingesta.

Desde el mismo panel puedes **Simular lead entrante** (aparece solo en NUEVO con destello) y **Reiniciar demostración**.

## Guion de demostración (2 minutos)

1. Entra como **Asesor** (tarjeta de rol en el login). Verás **Mi panel**.
2. En "Prioridades de hoy", pulsa **Contactar ahora** en un lead en rojo (fuera de SLA): se registra la interacción.
3. Abre **Mi pipeline**, arrastra una tarjeta a **VISITA AGENDADA sin nombre**: vuelve y el drawer pide el nombre (regla **RN-ASE-002**).
4. Escribe el nombre y mueve de nuevo: cambia de fase y aparece "Estado actualizado · **Deshacer**".
5. Pulsa el **badge de temperatura** para pasarla de Tibio a Caliente. Prueba **Mover a…** y el menú de la tarjeta.
6. Cambia el rol a **Gerencia** (avatar ▾): el dashboard refleja el estado; filtra por asesor y abre **Leads** para reasignar en masa.
7. Cambia a **Recepción**: prueba el alta individual (mira la normalización del teléfono) y la carga masiva con vista previa.

## Reglas de negocio reflejadas en el prototipo

| Regla | Cómo se ve |
|---|---|
| **RN-ASE-002** — nombre obligatorio para fases avanzadas | Mover a VISITA/NEGOCIACIÓN/CALIFICADO sin nombre devuelve la tarjeta y abre el drawer con el foco en "Nombre" |
| **H-06** — CALIFICADO/DESECHADO son finales | Un asesor no puede reabrir; aparece el aviso "solo un gerente puede reabrir" |
| **DESECHADO** exige motivo | Diálogo con lista de motivos obligatoria |
| **RN-GER-002** — soft delete fuera de KPIs | Los DESECHADOS no cuentan en las métricas del dashboard ni del panel |
| **SLA de primer contacto** | Las tarjetas y filas se marcan en rojo (ícono de alerta) cuando un lead NUEVO supera el SLA |
| **Deduplicación / adscripción 30 días / Round-Robin** | Se aplican de verdad en el alta y en la carga masiva; el resultado indica el motivo de asignación |

## Atajos de teclado

| Tecla | Acción |
|---|---|
| `Ctrl` + `K` | Buscar leads y saltar de pantalla (paleta de comandos) |
| `D` | Mostrar u ocultar el panel de demostración |
| `?` | Abrir la ayuda (guía del rol, atajos, reglas) |
| `Esc` | Cerrar el diálogo, panel o drawer activo |
| `Enter` / `Espacio` | Activar tarjetas, filas y controles con foco |

## Siguiente paso

Si el cliente aprueba el flujo, estas pantallas son el **contrato visual** para los milestones **M10–M13** del plan (frontend React + Tailwind). Los *design tokens* y los componentes ya están alineados con §4 del plan.
