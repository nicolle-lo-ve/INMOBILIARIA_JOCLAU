# Guion de demostración (10 minutos)

Guion para presentar el prototipo a un cliente. El prototipo **no tiene backend**: todo el estado vive en memoria y se reinicia con **Reiniciar demo** o recargando la página. Ten el archivo `prototype/index.html` abierto (doble clic) antes de empezar.

> Consejo: usa el **Modo demostración** (píldora oscura abajo al centro, o la tecla `D`) como hilo conductor. Se marca solo (`n/7`) a medida que cumples cada paso.

## Antes de empezar (1 min)

1. Abre `prototype/index.html` y sube el zoom del navegador si la sala es grande.
2. Comprueba que ves el **login** con las cuatro tarjetas de perfil.
3. Pulsa `D` para dejar a la vista el **Modo demostración** (arranca en `1/7` tras iniciar sesión).
4. Ten claro el mensaje: *"Es un prototipo navegable de alta fidelidad; sirve para validar flujo y reglas, no es el producto final."*

## Guion minuto a minuto

| Tiempo | Perfil | Qué mostrar |
|---|---|---|
| 0:00–1:00 | — | Login: cuatro perfiles, credenciales, cuenta bloqueada a propósito |
| 1:00–3:30 | **Asesor** | Mi panel, prioridades, pipeline, mover con reglas, temperatura, deshacer |
| 3:30–5:30 | **Gerencia** | Dashboard y filtros, clic en embudo/fuente, reasignación en masa |
| 5:30–7:00 | **Recepción** | Alta rápida (normalización), teléfono inválido, carga masiva |
| 7:00–8:30 | **Superadmin** | Bloqueo/desbloqueo, Usuarios, Configuración, Auditoría |
| 8:30–9:30 | — | Tour guiado, `Ctrl`+`K`, accesibilidad, modo demo `7/7` |
| 9:30–10:00 | — | Cierre y próximos pasos |

### 0:00–1:00 · Apertura

- Señala las **cuatro tarjetas** del login: *"Cada perfil ve solo lo suyo."*
- Muestra el campo de correo y explica que `jorge@crm.test` está **bloqueado a propósito**.
- No entres aún con credenciales; usa la tarjeta de rol para ir rápido.

### 1:00–3:30 · Asesor (Aline Reyes)

1. Pulsa **"Entrar como Asesor comercial"** → aterriza en **Mi panel**.
2. Recorre: 5 KPIs con **count-up** y **sparkline**, **Prioridades de hoy**, **Mi embudo**, **Mis leads por temperatura**, **Rendimiento vs equipo**, **Agenda de visitas**.
3. Pulsa **"Contactar ahora"** en una fila **Fuera de SLA**: *"El SLA de primer contacto es de 15 minutos."*
4. Pulsa **"Abrir mi pipeline"**. Arrastra una tarjeta **sin nombre** a **VISITA AGENDADA**: vuelve y se abre el drawer con el foco en el nombre. *"Regla RN-ASE-002: nombre obligatorio."*
5. Escribe el nombre, mueve de nuevo: sale **"Estado actualizado … → VISITA AGENDADA"** con **"Deshacer"**.
6. Cambia la **temperatura** a **Caliente** y muestra **"Deshacer"** otra vez.
7. Abre **"Más opciones"** en una tarjeta → **"Mover a…"** → **DESECHADO** → elige un **motivo** (obligatorio).

### 3:30–5:30 · Gerencia

1. En el avatar, abre el menú **"Ver como"** y elige **"Gerencia"**.
2. En **Dashboard**, cambia el rango a **7 d** y filtra por **Asesor**.
3. Pulsa la tarjeta **"Sin atender (SLA)"**: salta a **Leads** filtrado por **Sin atender**.
4. Vuelve al Dashboard y pulsa una etapa del **"Embudo comercial"** y una barra de **"Leads por fuente"**: cada uno filtra **Leads**.
5. En **Leads**, pulsa **"Seleccionar"**, marca 3–4 filas y pulsa **"Reasignar selección"**: elige asesor, escribe un **motivo** y confirma. Muestra el **"Deshacer"**.
6. Ve a **Equipo** y pausa a un asesor con el interruptor: *"deja de recibir leads por Round-Robin."*

### 5:30–7:00 · Recepción / Marketing

1. Cambia a **Recepción / Marketing**.
2. En **"Teléfono"**, teclea `987 654 321` y muestra el **E.164 normalizado** en vivo.
3. Pulsa **"Crear y asignar lead"**: recorre el **stepper** (Validando / Deduplicando / Asignando) y la tarjeta de resultado con el **Motivo**. Prueba **"Ver como …"** y **"Registrar otro"**.
4. Escribe un teléfono malo (`12`) y pulsa de nuevo: **no se crea** y muestra el error.
5. Pulsa la **dropzone** de **Carga masiva**, revisa la **Vista previa** (válidas, **Reingreso**, rechazadas) y **"Confirmar carga"**.

### 7:00–8:30 · Superadministrador

1. Cambia a **Superadministrador**.
2. Abre **Usuarios**: crea uno (**"Crear usuario"**) y **desbloquea** `jorge@crm.test`.
3. Cierra sesión (**"Cambiar rol / salir"**) e inicia con `jorge@crm.test` para enseñar que ya entra; vuelve a **Superadministrador**.
4. Abre **Configuración**: recorre los cuatro grupos y pulsa **"Guardar configuración"** → **"Guardar"**.
5. Abre **Auditoría**: muestra el banner **"Registro inmutable"** y filtra por **Acción**.

### 8:30–9:30 · Detalles que conquistan

- Abre la ayuda (`?`) → **"Ver tour guiado"**: el coach-mark resalta cada zona.
- Pulsa `Ctrl`+`K` y busca un lead por nombre o teléfono; salta entre pantallas.
- Pausa y muestra el **Modo demostración** en **7/7**; prueba **"Simular lead entrante"** (aparece arriba en NUEVO con destello).
- Navega con `Tab` para enseñar el **foco visible**; comenta **prefers-reduced-motion** y contraste AA.

### 9:30–10:00 · Cierre

- Recapitula: *orden del panel, reglas que se aplican solas, cero controles muertos, todo auditado.*
- **"Reiniciar demo"** para dejarlo limpio.
- Propón los siguientes pasos (milestones **M10–M13**): React + Tailwind alineado a los mismos tokens.

## Plan B (si algo falla en vivo)

| Situación | Qué hacer |
|---|---|
| El estado quedó raro (datos movidos, avisos acumulados) | Pulsa **"Reiniciar demo"** en el Modo demostración (o recarga la página). |
| El drag & drop no responde (proyector, táctil, zoom) | Usa **"Mover a…"** en la tarjeta o en el pie del drawer. Es la alternativa accesible. |
| No aparece una tarjeta que esperabas | Filtra por **Todos** y limpia **Proyecto**/**Temperatura** (botón **"Limpiar"**). |
| Se cierra un panel/diálogo sin querer | Pulsa `Esc` para cerrar todo y reintenta. |
| Preguntan por persistencia | Aclara que es un prototipo **sin backend**: los cambios viven en memoria y se reinician. |
| Preguntan por datos reales | Todos los nombres y cifras son **ficticios y deterministas** (semilla fija) para demos reproducibles. |
| El navegador bloquea `file://` | Sirve la carpeta: `python -m http.server 8080 --directory prototype` y abre `http://localhost:8080`. |
| Falta tiempo | Salta a: Asesor (mover con nombre) → Gerencia (filtro + reasignación) → Recepción (alta rápida). Son los tres momentos clave. |

## Chuleta de reglas para responder en vivo

- **RN-ASE-002** — nombre obligatorio para VISITA / NEGOCIACIÓN / CALIFICADO.
- **H-06** — CALIFICADO y DESECHADO son finales; solo Gerencia reabre.
- **DESECHADO** — motivo obligatorio.
- **SLA** — primer contacto en **15 min**.
- **Adscripción 30 días** — un reingreso antes de 30 días conserva al mismo asesor.
- **Round-Robin** — reparto entre asesores disponibles (omite a los que están **"En pausa"**).
