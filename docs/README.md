# Documentación del prototipo CRM Inmobiliario (v2)

Índice de la documentación de acompañamiento del prototipo navegable. El **prototipo** vive en `prototype/` y esta carpeta **`docs/`** reúne la guía de uso por rol, el guion de demo, el sistema de diseño y el registro de cambios de la versión v2.

> Fuente de verdad funcional: `docs/plan_accion_crm_inmobiliario.md` (§4 UI/UX y §7 prototipo) y `docs/requisitos_inmobiliaria.md`. Si algo entra en conflicto, manda el plan.

## Mapa de documentos

| Documento | Para qué sirve |
|---|---|
| `docs/README.md` | Este índice; cómo abrir el prototipo y mapa general. |
| `docs/flujos/asesor.md` | Guía del perfil **Asesor comercial** (Aline Reyes). |
| `docs/flujos/gerente.md` | Guía del perfil **Gerencia**. |
| `docs/flujos/recepcion.md` | Guía del perfil **Recepción / Marketing**. |
| `docs/flujos/superadmin.md` | Guía del perfil **Superadministrador**. |
| `docs/guia-demo.md` | Guion de demostración de 10 minutos + plan B. |
| `docs/diseno/sistema-de-diseno.md` | Tokens, componentes, iconografía y accesibilidad. |
| `docs/CHANGELOG-prototipo-v2.md` | Qué cambió respecto de la v1 del prototipo. |
| `prototype/README.md` | Cómo abrir el prototipo y recorrido de 2 minutos. |

## Cómo abrir el prototipo

- **Doble clic** en `prototype/index.html` (funciona sin build step, sin instalación).
- O bien, servir la carpeta:

  ```powershell
  python -m http.server 8080 --directory prototype
  # luego abre http://localhost:8080
  ```

No hay backend ni base de datos: todo el estado vive en memoria y se **reinicia** con el botón **Reiniciar demo** del modo demostración (o recargando la página).

## Las cuatro voces del sistema

El prototipo se recorre cambiando de perfil desde el **avatar** (menú "Ver como") o desde las cuatro tarjetas del login. Cada perfil tiene su propia navegación:

| Perfil | Navegación |
|---|---|
| **Asesor comercial** | Mi panel · Mi pipeline |
| **Gerencia** | Dashboard · Leads · Equipo · Ingesta · Reportes · Auditoría |
| **Recepción / Marketing** | Ingesta de leads |
| **Superadministrador** | Dashboard · Leads · Equipo · Ingesta · Auditoría · Usuarios · Configuración |

## Convenciones de esta documentación

- Las **rutas** se escriben como `#/panel`, `#/pipeline`, `#/dashboard`, `#/leads`, `#/team`, `#/ingestion`, `#/reports`, `#/audit`, `#/users`, `#/settings`.
- Los **textos de botones y etiquetas** se citan entre comillas **tal como aparecen en pantalla**.
- Los **atajos** se marcan con `tecla`.
- Los diagramas usan `mermaid` (`flowchart TD`); se renderizan en cualquier visor Markdown compatible (GitHub, VS Code, Obsidian).
