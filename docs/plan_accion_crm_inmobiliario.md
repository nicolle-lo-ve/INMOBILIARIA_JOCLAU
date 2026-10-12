# Plan de Acción Técnico y Arquitectónico — CRM Inmobiliario (Edición Empresarial)

> **Fuente:** `requisitos_inmobiliaria.md` (SRS del cliente) · **Destino:** IA programadora / equipo de desarrollo · **Versión:** 1.0
>
> Este documento es la **única fuente de verdad** para construir el sistema. Todo lo que el SRS no define y que fue necesario decidir está marcado como `[SUPUESTO]` o `[PENDIENTE-CLIENTE]` y concentrado en la sección 0.3 para validarlo antes de construir.

---

## Índice

0. Resumen ejecutivo, decisiones y ambigüedades del SRS
1. Mapa de puntos de dolor → solución
2. **Fase 1** — Modelado de datos
3. **Fase 2** — Arquitectura Backend (API REST)
4. **Fase 3** — Diseño de componentes Frontend (UI/UX)
5. **Fase 4** — Seguridad y Middleware
6. **Fase 5** — Estrategia de ejecución por Milestones
7. **Prototipo conceptual de alta fidelidad** (Bandeja del Asesor y Dashboard Gerencial)
8. Matriz de trazabilidad (RN / RNF → componente → milestone)
9. Reglas de oro para la IA programadora

---

## 0. Resumen ejecutivo, decisiones y ambigüedades del SRS

### 0.1 Qué se construye

Una plataforma CRM web que sustituye 10 archivos Excel (1 matriz gerencial + 9 libros de asesores), un RPA de escritorio (Power Automate) y un ETL (Power Query) por:

- **Una base de datos PostgreSQL única** (fuente única de verdad, con ID global por lead).
- **Un servicio de ingesta y asignación transaccional** (adiós al bucle `For Each` con apertura/cierre de Excel).
- **Una bandeja Kanban por asesor** y **un dashboard gerencial en tiempo real**.
- **Auditoría inmutable** de todo cambio.
- **RBAC con Row-Level Security** real, no carpetas compartidas.

### 0.2 Decisiones arquitectónicas

| ID | Decisión | Justificación |
|---|---|---|
| AD-01 | **Monolito modular** (un solo despliegue, módulos: `auth`, `ingestion`, `leads`, `analytics`, `audit`, `admin`) + un proceso *worker* | Carga real: 9 asesores y 100 RPS máx. (RNF-PER-02). Microservicios añadirían costo operativo sin beneficio. Los módulos se separan por carpetas e interfaces para poder extraerlos luego. |
| AD-02 | **PostgreSQL 16** | Necesario para RLS nativo, índices parciales, `citext`, `pg_trgm`, `LISTEN/NOTIFY`, PITR gestionado (RNF-DIS-02). |
| AD-03 | **Redis 7**: cola de tareas, Pub/Sub de tiempo real, rate limiting, caché corta | Cumple RNF-PER-03 (broker) sin sumar RabbitMQ. El SRS dice "ej." así que no es obligatorio. |
| AD-04 | **Backend:** Python 3.12 + FastAPI + SQLAlchemy 2 + Alembic + Pydantic v2 + Celery (workers) | Validación DTO declarativa, OpenAPI automático (contrato para el frontend), ecosistema maduro. *Alternativa válida:* NestJS + TypeORM/Prisma, siempre que se respeten los contratos de este documento. |
| AD-05 | **Frontend:** React 18 + TypeScript + Vite + Tailwind (con *design tokens*) + TanStack Query + dnd-kit + Recharts + react-hook-form/zod | SPA responsiva, Kanban accesible (dnd-kit soporta teclado), caché con actualizaciones optimistas. |
| AD-06 | **Tiempo real:** WebSocket (con fallback SSE) alimentado por **Transactional Outbox → Redis Pub/Sub** | RN-GER-001 exige ≤ 1 s. El *outbox* garantiza que nunca se emite un evento de algo que no se confirmó (*commit*) y viceversa. |
| AD-07 | **Contrato API primero:** OpenAPI 3.1 es la fuente del cliente TypeScript generado | Evita desfases entre frontend y backend. |
| AD-08 | **Infra:** Docker Compose (dev) · BD gestionada en la nube con PITR · CI con tests + escaneo de dependencias · Sentry para errores (RNF-DIS-03) | |
| AD-09 | **IDs:** UUIDv4 en todas las entidades expuestas (el SRS lo exige para leads) | |
| AD-10 | **Zona horaria:** todo se guarda en `timestamptz` (UTC); la UI muestra en la zona del negocio (`app_settings.business_timezone`) | Evita errores de "fecha/hora de ingreso" entre servidor y usuario. |

### 0.3 Ambigüedades e inconsistencias detectadas en el SRS

> Cada fila tiene la decisión que **este plan adopta por defecto**. Si el cliente la corrige, solo cambia el parámetro indicado.

| # | Hallazgo en el SRS | Decisión adoptada | Impacto si cambia |
|---|---|---|---|
| H-01 | **Roles con nombres distintos:** §2.4 dice `SuperAdmin, Gerente, Recepción/Marketing, Asesor`; RNF-SEC-03 dice `ROLE_ADMIN/ROLE_GERENTE, ROLE_RECEPTOR, ROLE_ASESOR`. | 4 roles canónicos: `SUPERADMIN`, `GERENTE`, `RECEPCION`, `ASESOR`. `SUPERADMIN` = gestión de usuarios/configuración; `GERENTE` = CRUD total sobre leads + analítica. | Catálogo `roles`. |
| H-02 | **Regla de adscripción (RN-ING-002):** no define desde qué fecha se cuentan los 30 días ni qué pasa si el asesor ya no está activo. | `[SUPUESTO]` Se cuenta desde la **última asignación activa o el último reingreso** del lead (lo más reciente). Si el asesor está inactivo/bloqueado/no disponible → se reasigna por el motor normal y se registra `reason = FALLBACK_ADSCRIPCION`. Parámetro `adscription_days = 30`. | `app_settings` |
| H-03 | **Lead con teléfono existente pasado el período de 30 días** no está definido. | `[SUPUESTO]` Se registra reingreso, se **reasigna con el motor normal** (puede caer en otro asesor), el historial del lead se conserva. | Lógica de asignación |
| H-04 | **Duplicados:** el SRS exige `UNIQUE(phone)` y a la vez "marcar como reingreso y asociar al historial". | Compatible: **un lead por teléfono** (UNIQUE) + tabla `lead_ingestions` donde cada llegada (incluida la primera) es una fila. `reingresos = COUNT(*) − 1`. | Modelo de datos |
| H-05 | **Soft delete (RN-GER-002) vs UNIQUE(phone):** si un lead eliminado lógicamente vuelve a ingresar, un UNIQUE parcial permitiría duplicar. | `UNIQUE(phone_e164)` **total** (incluye eliminados). Un reingreso de un lead eliminado lo **restaura** (`deleted_at = NULL`) y queda auditado. | Índice único |
| H-06 | **Estados del pipeline sin matriz de transiciones.** Solo hay una regla (RN-ASE-002). | `[SUPUESTO]` Movimiento libre entre estados abiertos (necesario para Kanban). `CALIFICADO` y `DESECHADO` son **estados finales**: solo `GERENTE` puede reabrirlos. `DESECHADO` exige `motivo_descarte`. | Tabla de transiciones (§3.6) |
| H-07 | **RN-ASE-002** exige nombre solo para `VISITA AGENDADA` y `NEGOCIACIÓN`. | `[SUPUESTO]` Se **extiende a `CALIFICADO`** (un lead calificado sin nombre no tiene sentido comercial). Se aplica en API **y** con `CHECK` en BD. | `CHECK` en `leads` |
| H-08 | **Fuentes:** el input lista 5 valores (WhatsApp, Meta Ads, Instagram, TikTok, Referido) pero la descripción menciona también **Web**. | Se modela `lead_sources` como **catálogo** (no enum rígido) con las 6 fuentes iniciales. | Catálogo editable |
| H-09 | **Latencias distintas:** RN-GER-001 = 1 s de propagación; brecha §4 = consultas < 100 ms; RNF-PER-01 = p95 < 200 ms. | No son contradictorias: 1 s = *propagación del evento*; 100 ms = *consulta agregada interna*; 200 ms = *p95 del endpoint*. Se usan los tres como criterios de aceptación separados. | Pruebas de carga |
| H-10 | **Expiración 60 min "de inactividad" (RN-SEC-001)** vs "JWT de corta duración". | Access Token = **15 min**; Refresh Token con **ventana deslizante de inactividad de 60 min** (si pasan 60 min sin refrescar, la sesión muere). | `app_settings` |
| H-11 | **Bloqueo tras 5 intentos (RN-SEC-002):** no define cómo se desbloquea. | `[SUPUESTO]` Desbloqueo **manual** por `SUPERADMIN`, más opción configurable de desbloqueo automático (`lockout_minutes`, por defecto desactivado). | `app_settings` |
| H-12 | **Volumen de datos y crecimiento** no indicados (solo "9 asesores" y lotes de ~150 filas). | Se diseña para decenas de miles de leads/año sin particionar; agregados con índices adecuados sin vistas materializadas en v1. Se deja listo el punto de extensión (caché de KPI invalidada por eventos). | Rendimiento |
| H-13 | **Prefijo telefónico/país no definido** (SRS: "normalizar prefijo internacional"). | `[PENDIENTE-CLIENTE]` País por defecto en `app_settings.default_phone_region` (ISO-3166). Se normaliza a **E.164** con la librería `libphonenumber`. | Normalización |
| H-14 | **Integraciones externas** (Meta, WhatsApp, Instagram, TikTok) se mencionan pero sin especificar cuentas/APIs. | `[PENDIENTE-CLIENTE]` Fase MVP: `POST /leads` + carga masiva + formulario manual + webhook genérico con API key + webhook de **Meta Lead Ads / WhatsApp Cloud API**. Instagram y TikTok entran vía Meta/CSV hasta confirmar acceso a sus APIs. | Alcance |
| H-15 | **Dos rojos corporativos** (`#C00000` / `#A60000`). | `#C00000` = color base; `#A60000` = estado *hover/pressed*. | Design tokens |
| H-16 | El SRS nombra `LeadHistory` (RN módulo 2) y `LeadAuditLog` (brecha §4). | Se separan por propósito: `lead_status_history` (línea de tiempo comercial y métricas de embudo) y `audit_logs` (bitácora forense inmutable de **todo**). | Modelo de datos |
| H-17 | **No hay valor monetario** del lead; "proyección de pipeline por temperatura" no tiene base para ser en dinero. | `[SUPUESTO]` La proyección es **en conversiones esperadas** = Σ(leads por temperatura × probabilidad configurable). Probabilidades en `app_settings` (valores iniciales editables, ver §3.8). | KPI de proyección |

### 0.4 Alcance sugerido por etapas (útil para propuesta comercial)

| Etapa | Contenido |
|---|---|
| **MVP (Etapas M0–M11)** | BD, auth/RBAC, ingesta (API + manual + CSV/XLSX + webhook Meta/WhatsApp), asignación, Kanban del asesor, dashboard gerencial, auditoría, migración desde Excel. |
| **Fase 2** | Notificaciones push/WhatsApp al asesor, integraciones directas Instagram/TikTok, recordatorios de seguimiento, app instalable (PWA). |
| **Fase 3** | Metas por asesor, comisiones, módulo de proyectos/inventario, reportes programados por correo. |

---

## 1. Mapa de puntos de dolor → solución

### 1.1 Dolores operativos (SRS §1.2)

| # | Dolor del sistema actual | Causa raíz | Cómo lo elimina la nueva arquitectura | Criterio de aceptación medible |
|---|---|---|---|---|
| D1 | Duplicidad y sobreescritura de datos | 10 archivos Excel independientes, sin ID global, dedupe manual en Power Query | Un único `leads` con `UUID` y `UNIQUE(phone_e164)`; inserción con `ON CONFLICT` atómico; reingresos en `lead_ingestions`; `version` para bloqueo optimista en ediciones | 50 peticiones concurrentes con el mismo teléfono ⇒ **exactamente 1 lead** y 49 reingresos |
| D2 | Latencia de hasta **7.6 min por lote** | RPA abre/cierra una instancia de Excel **por cada fila**, con *polling* e interfaces visibles | Asignación **en la misma transacción** de BD (milisegundos). Lotes masivos procesados por *workers* con operaciones por conjuntos (*set-based*) | Lead individual asignado y visible en la bandeja del asesor en **< 1 s**. Lote de 150 leads procesado en **< 10 s** (objetivo a validar con prueba de carga) |
| D3 | Sin trazabilidad | Celdas editables sin histórico | `audit_logs` inmutable (triggers + permisos + cadena de hash) y `lead_status_history` | Todo `INSERT/UPDATE/DELETE` de `leads` genera fila en `audit_logs` con quién, cuándo, antes/después. Intento de `UPDATE/DELETE` sobre `audit_logs` ⇒ error |
| D4 | Fórmulas frágiles (encabezados en fila 4, datos desde fila 5) | Acoplamiento a posiciones de filas/columnas | Esquema relacional con **nombres de columna**; la interfaz no permite alterar estructura. Migración detecta encabezados **por nombre**, no por posición | No existe ninguna dependencia posicional en el código (revisión de código + prueba de migración con columna insertada) |
| D5 | Consolidación gerencial lenta/manual | ETL de Power Query sobre 9 libros | Consultas agregadas sobre una sola BD + eventos en tiempo real vía WebSocket | Cambio hecho por un asesor visible en el dashboard en **≤ 1 s** (RN-GER-001) |

### 1.2 Limitaciones técnicas (SRS §3.3)

| Limitación | Solución |
|---|---|
| **Corrupción por concurrencia / *file locks*** de Excel abierto | PostgreSQL con MVCC y transacciones: los asesores nunca "abren un archivo". Escrituras concurrentes sobre el mismo lead resueltas con `version` (HTTP 409 + recarga). |
| **Sobrecarga de I/O** (abrir/cerrar Excel por fila) | Cero I/O de archivos en el camino crítico. Una conexión pool, una transacción por lead; lotes con `INSERT ... SELECT` por conjuntos. |
| **Acoplamiento interfaz-datos** (`FilaActual - 5`, `Columna 9`) | Contrato JSON versionado (`/api/v1`) y DTOs tipados. La UI jamás conoce posiciones. |
| **Sin RBAC / acceso por carpetas** | JWT + RBAC + **Row-Level Security** en PostgreSQL (defensa en profundidad: aunque falle la API, la BD no entrega filas ajenas). |

---

## 2. Fase 1 — Modelado de Datos

### 2.1 Convenciones

- Nombres de tablas/columnas en `snake_case`, **en inglés** técnico (la UI muestra etiquetas en español).
- PK: `id uuid DEFAULT gen_random_uuid()`.
- Todas las tablas mutables: `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()` (actualizado por trigger, atómico con la fila — RN-ASE-003).
- Eliminación lógica solo en `leads` y `users` (`deleted_at timestamptz NULL`).
- Extensiones: `pgcrypto`, `citext`, `pg_trgm`.
- Migraciones con Alembic, **versionadas y reversibles**.

### 2.2 Tipos enumerados

| Enum | Valores |
|---|---|
| `user_role` | `SUPERADMIN`, `GERENTE`, `RECEPCION`, `ASESOR` |
| `lead_status` | `NUEVO`, `CONTACTADO`, `VISITA_AGENDADA`, `NEGOCIACION`, `CALIFICADO`, `DESECHADO` |
| `lead_temperature` | `FRIO`, `TIBIO`, `CALIENTE` |
| `review_state` | `PENDIENTE`, `REVISADO` |
| `assignment_reason` | `ROUND_ROBIN`, `LEAST_LOADED`, `ADSCRIPCION_30D`, `FALLBACK_ADSCRIPCION`, `MANUAL_REASSIGN`, `BULK_REASSIGN` |
| `interaction_type` | `LLAMADA`, `WHATSAPP`, `EMAIL`, `VISITA`, `NOTA` |
| `batch_status` | `QUEUED`, `PROCESSING`, `COMPLETED`, `COMPLETED_WITH_ERRORS`, `FAILED` |
| `audit_action` | `INSERT`, `UPDATE`, `DELETE`, `LOGIN_OK`, `LOGIN_FAIL`, `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`, `TOKEN_REUSE`, `EXPORT`, `PERMISSION_DENIED` |

> `lead_status` y `lead_temperature` se mantienen como **enum de BD** (conjunto cerrado y definido por el SRS). Fuentes, proyectos y campañas son **catálogos** porque crecen.

### 2.3 Tablas

#### `users`
| Campo | Tipo | Restricciones |
|---|---|---|
| id | uuid | PK |
| email | citext | **UNIQUE**, NOT NULL |
| password_hash | text | NOT NULL (Argon2id) |
| full_name | varchar(120) | NOT NULL |
| role | user_role | NOT NULL |
| is_active | boolean | NOT NULL DEFAULT true |
| failed_login_attempts | smallint | NOT NULL DEFAULT 0, CHECK ≥ 0 |
| locked_at | timestamptz | NULL (≠ NULL ⇒ cuenta bloqueada) |
| token_version | int | NOT NULL DEFAULT 1 (al incrementarlo se invalidan todos los tokens) |
| must_change_password | boolean | NOT NULL DEFAULT true |
| last_login_at | timestamptz | NULL |
| created_at / updated_at / deleted_at | timestamptz | — |

#### `advisor_profiles` (1:1 con `users` de rol `ASESOR`)
| Campo | Tipo | Restricciones |
|---|---|---|
| user_id | uuid | PK, FK → `users.id` |
| is_available | boolean | NOT NULL DEFAULT true (pausa para vacaciones/ausencias) |
| capacity_weight | smallint | NOT NULL DEFAULT 1, CHECK 1–10 (peso en la distribución) |
| max_active_leads | int | NULL (tope opcional de carga) |
| last_assigned_at | timestamptz | NULL (apoyo del Round-Robin) |

#### `refresh_tokens`
| Campo | Tipo | Restricciones |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → `users.id` ON DELETE CASCADE |
| family_id | uuid | NOT NULL (agrupa la cadena de rotación) |
| token_hash | char(64) | **UNIQUE** (SHA-256; nunca se guarda el token plano) |
| expires_at | timestamptz | NOT NULL |
| last_used_at | timestamptz | NOT NULL (para inactividad de 60 min) |
| revoked_at | timestamptz | NULL |
| replaced_by | uuid | NULL, FK → `refresh_tokens.id` |
| ip, user_agent | inet, text | NULL |

#### Catálogos
| Tabla | Campos | Constraints únicos |
|---|---|---|
| `lead_sources` | id, code (varchar 30), label, is_active | **UNIQUE(code)** — semilla: `WHATSAPP`, `META_ADS`, `INSTAGRAM`, `TIKTOK`, `REFERIDO`, `WEB` |
| `projects` | id, name, is_active | **UNIQUE(lower(name))** |
| `campaigns` | id, name, source_id FK, project_id FK NULL, is_active | **UNIQUE(source_id, lower(name))** |

> Regla: si llega un `proyecto`/`campana` desconocido, el servicio de ingesta **lo crea automáticamente** (upsert por nombre normalizado) para no perder leads por un catálogo desactualizado. Un `GERENTE` puede fusionar duplicados luego.

#### `leads` (entidad central)
| Campo | Tipo | Restricciones / Notas |
|---|---|---|
| id | uuid | PK (UUIDv4 global) |
| phone_e164 | varchar(16) | NOT NULL, **UNIQUE (total)**, `CHECK (phone_e164 ~ '^\+[1-9][0-9]{8,14}$')` ⇒ RN-ING-001 |
| phone_raw | varchar(40) | Valor original recibido (solo trazabilidad) |
| full_name | varchar(150) | NULL |
| external_username | varchar(150) | NULL (campo `usuario` del SRS: usuario de la red social) |
| source_id | uuid | FK → `lead_sources`, NOT NULL |
| campaign_id | uuid | FK → `campaigns`, NULL |
| project_id | uuid | FK → `projects`, NULL |
| asesor_id | uuid | FK → `users.id`, NULL hasta asignar |
| status | lead_status | NOT NULL DEFAULT `NUEVO` |
| temperature | lead_temperature | NOT NULL DEFAULT `FRIO` `[SUPUESTO]` |
| discard_reason | varchar(200) | NULL; **obligatorio** si `status='DESECHADO'` |
| observations | text | NULL (≤ 5000 chars, sanitizado) |
| review_state | review_state | NOT NULL DEFAULT `PENDIENTE` (el "Estado de revisión" del Excel) |
| ingested_at | timestamptz | NOT NULL (reemplaza `fecha_ingreso` + `hora_ingreso`) |
| assigned_at | timestamptz | NULL (reemplaza `fecha_asignacion` + `hora_asignacion`) |
| first_contact_at | timestamptz | NULL (se fija **una sola vez**, ver §3.6) |
| last_contact_at | timestamptz | NULL (recálculo automático — módulo 2) |
| version | int | NOT NULL DEFAULT 1 (bloqueo optimista) |
| created_at / updated_at / deleted_at | timestamptz | — |

**CHECK constraints de negocio:**
1. `chk_name_required`: `status NOT IN ('VISITA_AGENDADA','NEGOCIACION','CALIFICADO') OR (full_name IS NOT NULL AND btrim(full_name) <> '')` ⇒ RN-ASE-002 (extendido, H-07).
2. `chk_discard_reason`: `status <> 'DESECHADO' OR (discard_reason IS NOT NULL AND btrim(discard_reason) <> '')`.
3. `chk_reviewed_has_asesor`: `review_state <> 'REVISADO' OR (asesor_id IS NOT NULL AND assigned_at IS NOT NULL)` ⇒ **RN-ING-003 garantizada también a nivel de BD**: nunca puede quedar "Revisado" sin asesor asignado.
4. `chk_assignment_pair`: `(asesor_id IS NULL) = (assigned_at IS NULL)`.

> Las columnas `ano` y `mes` del SRS **no se almacenan**: se derivan de `ingested_at` en la zona horaria del negocio (vista `v_leads_legacy`, §2.4).

#### `lead_ingestions` (cada llegada del lead, incluida la primera)
| Campo | Tipo | Restricciones |
|---|---|---|
| id | uuid | PK |
| lead_id | uuid | FK → `leads.id`, NOT NULL |
| source_id, campaign_id, project_id | uuid | FK (foto de la llegada) |
| external_username | varchar(150) | NULL |
| ingested_at | timestamptz | NOT NULL |
| is_reentry | boolean | NOT NULL (false en la primera llegada) |
| batch_id | uuid | FK → `ingestion_batches.id`, NULL |
| external_event_id | varchar(120) | NULL — **idempotencia** de webhooks |
| raw_payload | jsonb | NOT NULL (JSON original) |
| | | **UNIQUE(source_id, external_event_id) WHERE external_event_id IS NOT NULL** ⇒ el reintento de un webhook no duplica nada |

#### `lead_assignments` (historial de asignaciones)
| Campo | Tipo | Restricciones |
|---|---|---|
| id | uuid | PK |
| lead_id | uuid | FK → `leads.id`, NOT NULL |
| asesor_id | uuid | FK → `users.id`, NOT NULL |
| assigned_at | timestamptz | NOT NULL DEFAULT now() |
| ended_at | timestamptz | NULL |
| reason | assignment_reason | NOT NULL |
| assigned_by | uuid | FK → `users.id`, NULL = sistema |
| | | **UNIQUE(lead_id) WHERE ended_at IS NULL** ⇒ un lead tiene **una sola asignación vigente** |

> Esta tabla es la base de la **Regla de Adscripción (RN-ING-002)**: se consulta la asignación más reciente del lead.

#### `lead_interactions`
| Campo | Tipo | Restricciones |
|---|---|---|
| id | uuid | PK |
| lead_id | uuid | FK, NOT NULL |
| asesor_id | uuid | FK, NOT NULL |
| type | interaction_type | NOT NULL |
| notes | text | NULL (≤ 2000) |
| occurred_at | timestamptz | NOT NULL DEFAULT now(), CHECK ≤ now() + 5 min |

#### `lead_status_history` (inmutable)
| Campo | Tipo |
|---|---|
| id | uuid PK |
| lead_id | uuid FK |
| from_status / to_status | lead_status (`from_status` NULL en el alta) |
| from_temperature / to_temperature | lead_temperature |
| changed_by | uuid FK → users (NULL = sistema) |
| changed_at | timestamptz NOT NULL DEFAULT now() |
| seconds_in_previous_status | int NULL |

#### `audit_logs` (inmutable, bitácora forense)
| Campo | Tipo | Notas |
|---|---|---|
| id | bigint | PK identity (orden total garantizado) |
| occurred_at | timestamptz | NOT NULL DEFAULT now() |
| actor_id | uuid | NULL = sistema/webhook |
| actor_role | user_role | NULL |
| action | audit_action | NOT NULL |
| entity_type | varchar(40) | `lead`, `user`, `session`, `setting`… |
| entity_id | uuid | NULL |
| before_data / after_data | jsonb | NULL (diferencias de campos) |
| ip | inet | NULL |
| request_id | uuid | Correlación con logs de aplicación |
| prev_hash / row_hash | char(64) | **Cadena de hash** (ver §2.5) |

#### Ingesta masiva y API
| Tabla | Campos clave |
|---|---|
| `ingestion_batches` | id, uploaded_by FK, filename, file_sha256 (**UNIQUE** ⇒ no reprocesar el mismo archivo), total_rows, accepted, reentries, rejected, status (`batch_status`), started_at, finished_at |
| `ingestion_batch_errors` | id, batch_id FK, row_number, raw_row jsonb, error_code, error_message |
| `api_clients` | id, name, source_id FK NULL, key_hash char(64) **UNIQUE**, hmac_secret_enc bytea, is_active, last_used_at, created_by |

#### Infraestructura
| Tabla | Propósito / campos |
|---|---|
| `outbox_events` | id bigint PK, aggregate_type, aggregate_id, event_type, payload jsonb, created_at, published_at NULL. Se escribe **dentro de la misma transacción** que el cambio; un *relay* publica en Redis y marca `published_at`. |
| `assignment_state` | Fila única: `last_advisor_id`, `cursor`, `updated_at`. Se bloquea con `SELECT ... FOR UPDATE` para serializar el Round-Robin sin condiciones de carrera. |
| `app_settings` | key (PK), value jsonb, updated_by, updated_at. Claves iniciales abajo. |
| `notifications` | id, user_id FK, type, payload jsonb, read_at NULL, created_at (campana de la UI) |

**Claves iniciales de `app_settings`:**

| Clave | Valor por defecto |
|---|---|
| `adscription_days` | 30 |
| `assignment_strategy` | `ROUND_ROBIN` (alternativa: `LEAST_LOADED`) |
| `max_failed_logins` | 5 |
| `lockout_minutes` | 0 (0 = solo desbloqueo manual) |
| `access_token_minutes` | 15 |
| `idle_timeout_minutes` | 60 |
| `business_timezone` | `[PENDIENTE-CLIENTE]` |
| `default_phone_region` | `[PENDIENTE-CLIENTE]` |
| `first_contact_sla_minutes` | 15 (para alertas en rojo en la UI) |
| `temperature_probability` | `{"CALIENTE":0.5,"TIBIO":0.2,"FRIO":0.05}` — **valores iniciales de ejemplo, el cliente debe calibrarlos** |

### 2.4 Índices

| Índice | Tabla | Objetivo |
|---|---|---|
| `ux_leads_phone` UNIQUE (phone_e164) | leads | Deduplicación (RN-ING-001) |
| `ix_leads_asesor_status` (asesor_id, status) WHERE deleted_at IS NULL | leads | Bandeja Kanban del asesor |
| `ix_leads_ingested_at` (ingested_at DESC) WHERE deleted_at IS NULL | leads | Filtros por fecha, KPIs |
| `ix_leads_source_ingested` (source_id, ingested_at) WHERE deleted_at IS NULL | leads | Rendimiento por fuente |
| `ix_leads_project_campaign` (project_id, campaign_id) | leads | Filtros gerenciales |
| `ix_leads_search_trgm` GIN (full_name gin_trgm_ops, phone_e164 gin_trgm_ops) | leads | Búsqueda instantánea "mientras escribes" |
| `ix_assign_lead_recent` (lead_id, assigned_at DESC) | lead_assignments | Regla de 30 días |
| `ix_inter_lead` (lead_id, occurred_at DESC) | lead_interactions | Línea de tiempo |
| `ix_audit_entity` (entity_type, entity_id, occurred_at DESC) | audit_logs | Consulta de auditoría por entidad |
| `ix_outbox_unpublished` (id) WHERE published_at IS NULL | outbox_events | Relay eficiente |

**Vista de compatibilidad `v_leads_legacy`:** reproduce las columnas del Excel original (Año, Mes, Fecha ingreso, Hora ingreso, Teléfono, Usuario, Fecha asignación, Hora asignación, Asesor, Estado de revisión) para que la gerencia reconozca el formato en las exportaciones y facilitar la validación de la migración.

### 2.5 Garantía de inmutabilidad de `audit_logs` y `lead_status_history`

Se aplican **cinco capas** (si una falla, las otras protegen):

1. **Permisos:** el rol de BD de la aplicación (`crm_app`) recibe solo `INSERT` y `SELECT` sobre estas tablas. `REVOKE UPDATE, DELETE, TRUNCATE`.
2. **Triggers:** `BEFORE UPDATE OR DELETE` y `BEFORE TRUNCATE` que ejecutan `RAISE EXCEPTION 'tabla inmutable'`.
3. **Cadena de hash:** `row_hash = SHA256(prev_hash || contenido de la fila)`. Un job nocturno recorre la cadena y alerta ante cualquier ruptura (detección de manipulación por un superusuario de BD).
4. **Dueño distinto:** las tablas pertenecen a un rol de migraciones (`crm_owner`), no al rol que usa la aplicación.
5. **Escritura por trigger:** los *triggers* `AFTER INSERT/UPDATE/DELETE` sobre `leads` (y `users`, `app_settings`) escriben en `audit_logs` con `SECURITY DEFINER`, tomando el actor desde `current_setting('app.user_id')`. Así **ninguna ruta de código puede olvidarse de auditar**.

### 2.6 Row-Level Security (RLS) — RNF-SEC-03 y RN-ASE-001

- Se activa `ENABLE` + `FORCE ROW LEVEL SECURITY` en `leads`, `lead_interactions`, `lead_assignments`, `lead_status_history`.
- Por cada transacción la API ejecuta `SET LOCAL app.user_id = '<uuid>'` y `SET LOCAL app.role = '<ROL>'` (con `SET LOCAL`, el valor muere con la transacción ⇒ sin fugas entre conexiones del *pool*).
- Políticas:
  - **ASESOR:** `USING (asesor_id = current_setting('app.user_id')::uuid AND deleted_at IS NULL)`. En `INSERT/UPDATE`, `WITH CHECK` con la misma condición ⇒ no puede reasignarse leads a sí mismo ni a otro.
  - **GERENTE / SUPERADMIN:** acceso total.
  - **RECEPCION:** solo `INSERT` (sin `SELECT` sobre leads ajenos, salvo los ids que ella misma creó en `lead_ingestions` para ver el resultado del lote).
  - **Servicio de ingesta/worker:** rol de BD propio `crm_ingest` con permisos mínimos para insertar/asignar.
- **Prueba obligatoria:** test automatizado que, con el usuario ASESOR A, intenta `SELECT`/`UPDATE` de un lead del asesor B directamente por SQL y debe obtener 0 filas / 0 afectadas.

### 2.7 Diagrama relacional resumido

```
users 1─1 advisor_profiles
users 1─N refresh_tokens
users 1─N leads (asesor_id)
lead_sources 1─N campaigns N─1 projects
leads N─1 lead_sources / campaigns / projects
leads 1─N lead_ingestions N─1 ingestion_batches
leads 1─N lead_assignments
leads 1─N lead_interactions
leads 1─N lead_status_history
(todas las mutaciones) ──trigger──> audit_logs (append-only, hash-chained)
(todas las mutaciones relevantes) ──misma tx──> outbox_events ──relay──> Redis ──> WebSocket
```

---
## 3. Fase 2 — Arquitectura Backend (API REST)

### 3.1 Convenciones globales

| Tema | Regla |
|---|---|
| Base | `/api/v1`. Contrato OpenAPI 3.1 autogenerado. |
| Formato | JSON UTF-8. Fechas ISO-8601 con zona (`2026-10-11T14:05:00-05:00`). |
| Autenticación | `Authorization: Bearer <access_token>`. Webhooks: `X-API-Key` + firma HMAC (§5.5). |
| Errores | **RFC 7807** `application/problem+json` con extensión `code` (catálogo §3.9) y `errors[]` por campo. |
| Paginación | Por **cursor** (`?limit=50&cursor=...`), máximo 200. Respuesta: `{ items, next_cursor, total_estimate }`. |
| Concurrencia | Cada `Lead` devuelve `version` y `ETag`. `PATCH` exige `If-Match: <version>`; si difiere ⇒ **409 `VERSION_CONFLICT`** con el estado actual. |
| Idempotencia | `POST` de creación acepta `Idempotency-Key`; webhooks usan `external_event_id`. |
| Rate limiting | Por IP y por usuario/cliente API: 429 con `Retry-After`. |
| Trazabilidad | Cabecera `X-Request-Id` en toda respuesta; se propaga a `audit_logs.request_id` y a Sentry. |
| Soft delete | Los `GET` nunca devuelven registros con `deleted_at` salvo `?include_deleted=true` (solo GERENTE+). |

### 3.2 Módulo RBAC / Identidad (Módulo 4)

| Método | Ruta | Roles | Descripción | Respuestas |
|---|---|---|---|---|
| POST | `/auth/login` | Público | Body `{ "email", "password" }` | 200 `{ access_token, expires_in, user }` + cookie `refresh_token` (HttpOnly, Secure, SameSite=Strict) · 401 `INVALID_CREDENTIALS` · 423 `ACCOUNT_LOCKED` · 429 |
| POST | `/auth/refresh` | Cookie refresh | Rota el refresh token | 200 nuevo access · 401 `SESSION_EXPIRED` / `TOKEN_REUSED` |
| POST | `/auth/logout` | Autenticado | Revoca la familia de refresh tokens | 204 |
| GET | `/auth/me` | Autenticado | Perfil, rol, permisos | 200 |
| POST | `/auth/change-password` | Autenticado | `{ current_password, new_password }` | 204 · 422 `WEAK_PASSWORD` |
| GET | `/users` | SUPERADMIN, GERENTE (solo lectura) | Filtros: rol, activo, bloqueado | 200 |
| POST | `/users` | SUPERADMIN | `{ email, full_name, role, temp_password? }`. Si `role=ASESOR` crea su `advisor_profile` | 201 · 409 `EMAIL_TAKEN` |
| PATCH | `/users/{id}` | SUPERADMIN | Nombre, rol, activo | 200 · 409 |
| POST | `/users/{id}/unlock` | SUPERADMIN | Limpia `locked_at` y contador, `token_version++` | 204 |
| POST | `/users/{id}/reset-password` | SUPERADMIN | Genera clave temporal, fuerza cambio | 200 |
| DELETE | `/users/{id}` | SUPERADMIN | Soft delete. **Bloqueado (409 `USER_HAS_ACTIVE_LEADS`)** si es asesor con leads vivos: primero reasignar | 204 |
| PATCH | `/advisors/{id}/availability` | GERENTE, SUPERADMIN, el propio ASESOR | `{ "is_available": false }` | 200 |

**Validación de login (orden estricto):** usuario existe e `is_active` → cuenta no bloqueada → verificar hash → éxito: resetear contador / fallo: incremento atómico (`UPDATE ... SET failed_login_attempts = failed_login_attempts + 1 RETURNING`) y, si llega a 5, fijar `locked_at` y emitir evento `ACCOUNT_LOCKED` (alerta al SUPERADMIN).

### 3.3 Módulo 1 — Ingesta, Captura y Asignación

| Método | Ruta | Roles | Descripción | Respuestas |
|---|---|---|---|---|
| POST | `/leads` | RECEPCION, GERENTE, SUPERADMIN, `api_client` | Alta **individual síncrona** | **201** lead nuevo · **200** reingreso (`"reentry": true`) · 422 `PHONE_INVALID` |
| POST | `/ingestion/webhooks/{provider}` | `api_client` (HMAC) | `provider` ∈ `meta`, `whatsapp`, `generic`. Valida firma, encola y responde de inmediato | **202** `{ "event_id" }` · 401 firma inválida |
| GET | `/ingestion/webhooks/meta` | Meta | Verificación de suscripción (`hub.challenge`) | 200 |
| POST | `/ingestion/batches` | RECEPCION, GERENTE, SUPERADMIN | `multipart/form-data` con CSV/XLSX (máx. 5 MB / 5.000 filas). Mapea columnas **por nombre de cabecera** | **202** `{ batch_id }` · 409 `BATCH_DUPLICATE` (mismo SHA-256) · 413 · 422 `MISSING_COLUMNS` |
| GET | `/ingestion/batches/{id}` | Creador, GERENTE+ | Progreso: totales, aceptados, reingresos, rechazados | 200 |
| GET | `/ingestion/batches/{id}/errors` | Creador, GERENTE+ | Filas rechazadas con motivo (descargable CSV) | 200 |
| GET | `/ingestion/batches` | RECEPCION (propios), GERENTE+ | Historial de cargas | 200 |
| GET | `/assignment/queue` | GERENTE+ | Leads en `PENDIENTE` (no pudieron asignarse) | 200 |
| POST | `/assignment/queue/retry` | GERENTE+ | Reintenta asignación | 202 |
| GET / PUT | `/assignment/config` | GERENTE+ | Estrategia, pesos, disponibilidad | 200 |

**Payload de entrada de `POST /leads`** (mapea 1:1 con el SRS §2.1):

```json
{
  "telefono": "+51 987 654 321",
  "usuario": "maria.perez_ig",
  "fuente": "META_ADS",
  "campana": "Octubre - Departamentos Lima",
  "proyecto": "Torre Miraflores",
  "fecha_ingreso": "2026-10-11T14:05:00-05:00",
  "external_event_id": "meta-lead-4471123"
}
```

> `ano` y `mes` **no se envían** (se derivan). Si `fecha_ingreso` falta, el servidor usa `now()`. Si el cliente la envía, no puede ser futura (> 5 min) ni anterior a 2 años (422 `DATE_OUT_OF_RANGE`).

**Respuesta 201:**

```json
{
  "id": "6f1b6a9e-....",
  "reentry": false,
  "review_state": "REVISADO",
  "asesor": { "id": "…", "full_name": "Aline Reyes" },
  "assignment_reason": "ROUND_ROBIN",
  "assigned_at": "2026-10-11T19:05:00.312Z"
}
```

#### 3.3.1 Pipeline de validaciones y lógica de ingesta (orden estricto)

Todo ocurre en **una sola transacción** de BD (con `SET LOCAL` de contexto de auditoría):

| Paso | Acción | Falla ⇒ |
|---|---|---|
| V1 | **Esquema DTO:** campos obligatorios, tipos, longitudes, `fuente` ∈ catálogo activo | 400/422 con `errors[]` |
| V2 | **Sanitización:** `trim`, colapsar espacios, quitar caracteres de control, escapar HTML en textos (RNF-SEC-04) | — |
| V3 | **Normalización de teléfono → E.164** (`libphonenumber`, región por defecto de `app_settings`). Debe quedar de ≥ 9 dígitos | 422 `PHONE_INVALID` (RN-ING-001) — **el lead no se persiste** |
| V4 | **Idempotencia:** si `(source, external_event_id)` ya existe en `lead_ingestions` ⇒ devolver el resultado previo | 200 con el mismo cuerpo |
| V5 | **Catálogos:** upsert de `campaña` y `proyecto` por nombre normalizado | — |
| V6 | **Dedupe atómico:** `INSERT ... ON CONFLICT (phone_e164) DO UPDATE SET reentry_touch...` y detección de si fue inserción o conflicto | — |
| V7 | **Registrar `lead_ingestions`** (`is_reentry` según V6). Si el lead estaba con `deleted_at`, restaurarlo | — |
| V8 | **Regla de Adscripción (RN-ING-002)** (§3.3.2) | — |
| V9 | **Motor de asignación** (§3.3.3) si V8 no determinó asesor | Si no hay asesores elegibles ⇒ el lead queda `PENDIENTE` y aparece en `/assignment/queue` + alerta al gerente (no se pierde nunca) |
| V10 | **Confirmación RN-ING-003:** en la misma transacción se escribe `lead_assignments`, `leads.asesor_id`, `assigned_at` y `review_state = 'REVISADO'`. Como la "bandeja del asesor" es una **consulta sobre `leads WHERE asesor_id = yo`**, el *commit* **es** la entrega a la bandeja. Si algo falla ⇒ *rollback* y el estado permanece `PENDIENTE` | — |
| V11 | **Outbox:** escribir `LeadAssigned` (y `LeadReentry` si aplica) en `outbox_events` | — |
| V12 | **Respuesta** 201/200. Notificaciones y WebSocket salen **después del commit** por el relay (RNF-PER-03: hilo HTTP liberado) | — |

> **Nota sobre RN-ING-003:** el SRS habla de "HTTP 201 o commit exitoso". Aquí se cumple por la opción *commit*, que es más fuerte: el estado `REVISADO` y la visibilidad del lead para el asesor son **atómicos**. Además el `CHECK chk_reviewed_has_asesor` impide a nivel de BD marcar "Revisado" sin asesor.

#### 3.3.2 Regla de Adscripción de 30 días (RN-ING-002)

```
Entrada: lead existente (por phone_e164) + fecha del nuevo ingreso
1. ref = MAX( última asignación (lead_assignments.assigned_at), última llegada previa (lead_ingestions.ingested_at) )
2. Si (ahora − ref) < adscription_days  Y  hay asesor vigente A:
     2a. Si A está activo, no bloqueado, is_available y no supera max_active_leads
           ⇒ asignar a A. reason = ADSCRIPCION_30D
     2b. Si no ⇒ pasar al motor de asignación. reason = FALLBACK_ADSCRIPCION
                 y notificar al GERENTE
3. Si ≥ adscription_days ⇒ pasar al motor de asignación (H-03). Cierra la asignación anterior (ended_at)
4. Si el asesor vigente no cambia, NO se crea nueva asignación: solo se registra el reingreso
   y se notifica al asesor ("Reingreso de <lead>")
```

#### 3.3.3 Motor de asignación

- **Candidatos elegibles:** `role = ASESOR`, `is_active`, sin `locked_at`, `is_available`, y bajo `max_active_leads` si existe.
- **`ROUND_ROBIN` ponderado (por defecto):** el cursor vive en `assignment_state`; se serializa con `SELECT ... FOR UPDATE` (sin carreras con 100 RPS). `capacity_weight` define cuántos turnos consecutivos recibe cada asesor.
- **`LEAST_LOADED`:** asigna al asesor con menos leads en estados abiertos (`NUEVO`, `CONTACTADO`, `VISITA_AGENDADA`, `NEGOCIACION`), desempate por `last_assigned_at` más antiguo.
- **Lotes:** el *worker* procesa en bloques de 100 leads con una sola transacción por bloque y el cursor se reserva una vez por bloque.
- El número de asesores **no está fijo en 9**: es dato de BD.

### 3.4 Módulo 2 — Bandeja y Pipeline del Asesor

| Método | Ruta | Roles | Descripción | Respuestas |
|---|---|---|---|---|
| GET | `/me/leads` | ASESOR | Lista paginada. Filtros: `status[]`, `temperature[]`, `project_id`, `campaign_id`, `q` (nombre/teléfono), `from`, `to`, `sort` | 200 |
| GET | `/me/leads/board` | ASESOR | Datos del Kanban agrupados por estado: `{ columns: [{ status, count, items[≤30], next_cursor }] }` | 200 |
| GET | `/me/summary` | ASESOR | Contadores: nuevos sin contactar, vencidos por SLA, visitas de hoy | 200 |
| GET | `/leads/{id}` | ASESOR (propio), GERENTE+ | Detalle completo | 200 · 404 si no es suyo (**no 403**, para no revelar existencia) |
| PATCH | `/leads/{id}` | ASESOR (propio), GERENTE+ | `{ "full_name", "observations" }` + `If-Match` | 200 · 409 · 422 |
| PATCH | `/leads/{id}/status` | ASESOR (propio), GERENTE+ | `{ "status", "discard_reason?" }` + `If-Match` | 200 · 409 `VERSION_CONFLICT` · 422 `NAME_REQUIRED` / `DISCARD_REASON_REQUIRED` / `TRANSITION_NOT_ALLOWED` |
| PATCH | `/leads/{id}/temperature` | ASESOR (propio), GERENTE+ | `{ "temperature" }` | 200 |
| POST | `/leads/{id}/interactions` | ASESOR (propio) | `{ "type", "notes", "occurred_at?" }` | 201. Actualiza `last_contact_at`; si es la primera interacción efectiva fija `first_contact_at` |
| GET | `/leads/{id}/timeline` | ASESOR (propio), GERENTE+ | Mezcla ordenada de interacciones, cambios de estado/temperatura, asignaciones y reingresos | 200 |

**Ejemplo de cambio de estado (arrastrar tarjeta):**

```json
PATCH /api/v1/leads/6f1b6a9e/status
If-Match: 4
{ "status": "VISITA_AGENDADA" }
```
Respuesta 422 si falta nombre:
```json
{
  "type": "https://crm.example/errors/name-required",
  "title": "El nombre es obligatorio para agendar visita",
  "status": 422,
  "code": "NAME_REQUIRED",
  "errors": [{ "field": "full_name", "message": "Completa el nombre del cliente" }]
}
```

#### 3.4.1 Validaciones de la capa de lead (en este orden)

1. **Sesión y pertenencia (RN-ASE-001):** `lead.asesor_id == current_user.id` (la RLS lo garantiza igualmente). Si no ⇒ 404.
2. **Versión:** `If-Match == leads.version` ⇒ si no, 409.
3. **Reglas de estado:** matriz §3.6 + RN-ASE-002 (nombre, validando el nombre **resultante**: el del cuerpo o el ya guardado).
4. **Escritura atómica (RN-ASE-003):** en una sola transacción: `UPDATE leads SET ..., version = version + 1, updated_at = now()`, `INSERT lead_status_history`, `INSERT outbox_events` (`LeadUpdated`). El trigger genera el `audit_logs`.
5. **Recalculo de contacto:** `last_contact_at = now()` cuando el cambio implique contacto (`→ CONTACTADO` o posterior, o una interacción); `first_contact_at` solo si era `NULL`.

#### 3.4.2 Matriz de transiciones de estado `[SUPUESTO]` (H-06)

| Desde \ Hacia | NUEVO | CONTACTADO | VISITA_AGENDADA | NEGOCIACION | CALIFICADO | DESECHADO |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| **NUEVO** | — | ✅ | ✅ (nombre) | ✅ (nombre) | ✅ (nombre) | ✅ (motivo) |
| **CONTACTADO** | ✅ | — | ✅ (nombre) | ✅ (nombre) | ✅ (nombre) | ✅ (motivo) |
| **VISITA_AGENDADA** | ✅ | ✅ | — | ✅ (nombre) | ✅ (nombre) | ✅ (motivo) |
| **NEGOCIACION** | ✅ | ✅ | ✅ | — | ✅ (nombre) | ✅ (motivo) |
| **CALIFICADO** | 🔒 GERENTE | 🔒 GERENTE | 🔒 GERENTE | 🔒 GERENTE | — | 🔒 GERENTE |
| **DESECHADO** | 🔒 GERENTE | 🔒 GERENTE | 🔒 GERENTE | 🔒 GERENTE | 🔒 GERENTE | — |

### 3.5 Módulo 3 — Consolidador Gerencial y Reportes

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| GET | `/leads` | GERENTE+ | Tabla global. Filtros: asesor, estado, temperatura, fuente, campaña, proyecto, fechas, `q`, `review_state` |
| POST | `/leads/{id}/reassign` | GERENTE+ | `{ "asesor_id", "reason_note" }` ⇒ cierra asignación vigente, crea nueva (`MANUAL_REASSIGN`). 422 `ADVISOR_NOT_ELIGIBLE` |
| POST | `/leads/bulk-reassign` | GERENTE+ | `{ "lead_ids": [...], "asesor_id" }` (máx. 500) ⇒ 202 job |
| DELETE | `/leads/{id}` | GERENTE+ | Soft delete (204). Excluido de KPIs (RN-GER-002) |
| POST | `/leads/{id}/restore` | GERENTE+ | Restaura (200) |
| GET | `/analytics/kpis` | GERENTE+ | Total leads, % contactados, tasa de conversión global, tiempo promedio de primer contacto, leads sin atender fuera de SLA — **con comparación vs periodo anterior** |
| GET | `/analytics/by-source` | GERENTE+ | Por fuente: leads, % contactados, calificados, conversión |
| GET | `/analytics/by-advisor` | GERENTE+ | Por asesor: asignados, contactados, calificados, conversión, 1.er contacto promedio, carga abierta |
| GET | `/analytics/funnel` | GERENTE+ | Conteo por estado y tasa de paso entre etapas |
| GET | `/analytics/timeseries` | GERENTE+ | Leads por día/semana (para línea de tendencia) |
| GET | `/analytics/pipeline-projection` | GERENTE+ | Conversiones esperadas por temperatura (H-17) |
| GET | `/analytics/consolidated` | GERENTE+ | Dataset consolidado equivalente a la hoja "BASE DE DATOS CONSOLIDADA" (nombre tomado del SRS §4) |
| POST | `/reports/exports` | GERENTE+ | `{ "type": "leads|by_advisor|…", "format": "csv|xlsx|pdf", "filters": {…} }` ⇒ **202** `{ export_id }` (job asíncrono) |
| GET | `/reports/exports/{id}` | Creador | Estado + URL de descarga firmada y temporal (15 min) |
| GET | `/audit-logs` | GERENTE+, SUPERADMIN | Solo lectura. Filtros: entidad, actor, acción, fechas |
| GET | `/audit-logs/verify-chain` | SUPERADMIN | Ejecuta verificación de la cadena de hash |
| GET / PUT | `/settings` | SUPERADMIN | Parámetros `app_settings` |
| GET / POST / PATCH | `/catalogs/{sources|projects|campaigns}` | GERENTE+ | Gestión de catálogos y fusión de duplicados |

**Reglas de las analíticas:**

- Todas las consultas filtran `deleted_at IS NULL` (RN-GER-002) y son parametrizadas.
- **Definiciones fijas** (para que el cliente no discuta números después):
  - *% Contactados* = leads con `first_contact_at IS NOT NULL` ÷ leads asignados en el periodo.
  - *Tasa de conversión* = leads `CALIFICADO` ÷ leads asignados en el periodo `[SUPUESTO: CALIFICADO = conversión]`.
  - *Tiempo promedio de primer contacto* = promedio de `first_contact_at − assigned_at`.
  - *Fuera de SLA* = `status='NUEVO'` y `now() − assigned_at > first_contact_sla_minutes`.
- Rendimiento: consultas sobre los índices de §2.4 apuntando a **< 100 ms** internas y **p95 < 200 ms** por endpoint (RNF-PER-01). Si el volumen crece, se activa caché Redis de KPIs de 1–2 s invalidada por eventos (no vistas materializadas en v1).

### 3.6 Tiempo real

| Canal | Descripción |
|---|---|
| `WS /realtime` (token en el primer mensaje, **no** en la URL) | Suscripción automática por rol: el ASESOR recibe solo eventos de **sus** leads (`asesor:{id}`); el GERENTE recibe `global`. |
| Eventos | `lead.assigned`, `lead.reentry`, `lead.updated`, `lead.status_changed`, `batch.progress`, `assignment.pending`, `account.locked` |
| Entrega | Outbox → relay (≤ 200 ms de ciclo) → Redis Pub/Sub → WebSocket. Objetivo extremo a extremo **≤ 1 s** (RN-GER-001). |
| Resiliencia | Cada evento lleva `event_id` incremental; al reconectar el cliente envía el último recibido y el servidor reenvía los faltantes (ventana de 5 min); si la brecha es mayor, el cliente recarga por REST. |

### 3.7 Salud y operación

`GET /health/live`, `GET /health/ready` (BD + Redis), métricas Prometheus `/metrics` (solo red interna), logs estructurados JSON con `request_id`.

### 3.8 Respuestas HTTP — resumen de uso

| Código | Uso |
|---|---|
| 200 | Lectura/actualización correcta; reingreso de lead existente |
| 201 | Creación (lead nuevo, usuario, interacción) |
| 202 | Trabajo encolado (webhooks, lotes, exportaciones, reasignación masiva) |
| 204 | Acción sin cuerpo (logout, delete, unlock) |
| 400 | JSON mal formado |
| 401 | Sin token / token inválido o expirado / credenciales inválidas |
| 403 | Rol sin permiso para la ruta |
| 404 | No existe **o no es tuyo** (asesor) |
| 409 | Conflicto: `VERSION_CONFLICT`, `EMAIL_TAKEN`, `BATCH_DUPLICATE` |
| 413 | Archivo demasiado grande |
| 422 | Regla de negocio o validación de campo |
| 423 | Cuenta bloqueada |
| 429 | Límite de tasa |
| 500 | Error no controlado (cuerpo RFC 7807 genérico + `request_id`; el detalle va a Sentry, nunca al cliente) |

### 3.9 Catálogo de códigos de error de negocio

`PHONE_INVALID`, `DATE_OUT_OF_RANGE`, `SOURCE_UNKNOWN`, `NAME_REQUIRED`, `DISCARD_REASON_REQUIRED`, `TRANSITION_NOT_ALLOWED`, `VERSION_CONFLICT`, `ADVISOR_NOT_ELIGIBLE`, `NO_ELIGIBLE_ADVISORS`, `BATCH_DUPLICATE`, `MISSING_COLUMNS`, `ACCOUNT_LOCKED`, `INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `TOKEN_REUSED`, `WEAK_PASSWORD`, `USER_HAS_ACTIVE_LEADS`, `EMAIL_TAKEN`, `RATE_LIMITED`.

---

## 4. Fase 3 — Diseño de Componentes Frontend (UI/UX)

### 4.1 Principios de diseño ("Estilo Google" con vitalidad)

| Principio | Cómo se materializa |
|---|---|
| **Espacio en blanco como protagonista** | Fondo `#FFFFFF` / superficies `#FAFAFA`; rejilla de 8 px; márgenes generosos; máx. 1 acción primaria roja por pantalla. |
| **Información mínima por defecto, detalle bajo demanda** | La tarjeta muestra 5 datos; el resto vive en un **panel lateral (drawer)**, sin cambiar de página. |
| **Manipulación directa** | Arrastrar tarjetas para cambiar de estado; clic en el *badge* de temperatura para cambiarlo (menú de 3 opciones); edición *inline* del nombre; búsqueda instantánea. |
| **Vitalidad operativa** | Color por fase, microanimaciones de 150–200 ms, contadores que se animan, **tarjetas nuevas que entran con un destello suave** al llegar un lead, indicador "● En vivo". |
| **Cero congelamiento** | Actualizaciones optimistas + *toast* con **Deshacer**; *skeletons* en vez de pantallas en blanco (RNF-USA-03: feedback < 100 ms). |
| **Accesible** | WCAG 2.1 AA: contraste ≥ 4.5:1, foco visible, DnD operable con teclado, el color **nunca** es el único portador de significado (siempre icono + texto). |
| **Tipografía** | *Inter* (alternativa libre equivalente a Google Sans), 14 px base, 12 px metadatos, 20–28 px cifras de KPI. |

### 4.2 Sistema de diseño (*design tokens*)

**Estructura de marca (RNF-USA-02):**

| Token | Valor | Uso |
|---|---|---|
| `--brand-red` | `#C00000` | Botón primario, indicador de navegación activa, alertas de SLA, errores, acciones destructivas |
| `--brand-red-hover` | `#A60000` | Hover/pressed del rojo |
| `--ink-900` | `#404040` | Barra superior, texto principal |
| `--ink-700` | `#595959` | Navegación lateral, texto secundario, íconos |
| `--surface` | `#FFFFFF` · `--surface-2` `#FAFAFA` · `--line` `#E8EAED` | Fondos y bordes |

**Color por fase del pipeline (estilo Miro/Kanban).** Regla: el color de fase se aplica **solo** como *tinte suave de la cabecera de columna* + *franja izquierda de 4 px en la tarjeta* + *punto de color en el selector de estado*; **nunca como relleno completo ni como píldora**. Eso lo distingue visualmente de los *badges* de temperatura (que son píldoras con ícono).

| Fase | Fondo pastel | Acento | Icono |
|---|---|---|---|
| NUEVO | `#EEE9FB` | `#6B4FD8` (violeta) | ✦ |
| CONTACTADO | `#DFF3F3` | `#0F8B8D` (turquesa) | ☎ |
| VISITA AGENDADA | `#FDEBDD` | `#D9732A` (naranja) | 📅 |
| NEGOCIACIÓN | `#FBE4EE` | `#B83A74` (magenta) | ⇄ |
| CALIFICADO | `#E4F1E6` | `#2F7D4A` (pino) | ✔ |
| DESECHADO | `#ECEEF0` | `#7A838C` (gris piedra) | ✕ (columna colapsable, tarjetas al 70 % de opacidad) |

**Badges de temperatura** (píldora redondeada con icono, 24 px de alto):

| Temperatura | Fondo | Texto | Icono |
|---|---|---|---|
| CALIENTE | `#DFF3E4` | `#17692F` | llama |
| TIBIO | `#FFF4CC` | `#7A5A00` | media llama |
| FRÍO | `#E4EDF5` | `#2F5F8A` | copo de nieve |

> Estados críticos (lead sin contactar fuera de SLA, error de guardado, cuenta bloqueada) usan **rojo corporativo** con icono ⚠ + texto, nunca solo color.

### 4.3 Jerarquía de vistas

```
App
├─ /login                         Pantalla limpia, una tarjeta centrada; mensajes de error y bloqueo claros
├─ Shell autenticado
│   ├─ Barra superior (#404040): logo · búsqueda global (Ctrl+K) · indicador "En vivo" · campana · avatar
│   ├─ Navegación lateral (colapsable a íconos; en móvil: barra inferior)
│   └─ Contenido (según rol)
│
├─ ASESOR
│   ├─ /inbox            "Mi bandeja" — Kanban (por defecto) | Tabla (conmutador)
│   │    └─ Drawer del lead (panel derecho): datos, línea de tiempo, interacciones, observaciones
│   └─ /me               Mi resumen y disponibilidad
│
├─ GERENTE
│   ├─ /dashboard        Dashboard gerencial (§4.5)
│   ├─ /leads            Tabla global con filtros, selección múltiple y reasignación masiva
│   ├─ /team             Asesores: carga, disponibilidad, distribución (arrastrar peso)
│   ├─ /ingestion        Cargas e incidencias (leads pendientes de asignar)
│   ├─ /audit            Bitácora (solo lectura)
│   └─ /reports          Exportaciones
│
├─ RECEPCION
│   └─ /ingestion        Alta rápida (formulario de 4 campos) + carga masiva con vista previa + historial
│
└─ SUPERADMIN
    ├─ /admin/users      Usuarios, roles, desbloqueo, restablecer clave
    ├─ /admin/catalogs   Fuentes, proyectos, campañas
    └─ /admin/settings   Parámetros del sistema
```

### 4.4 Bandeja del Asesor (Kanban interactivo)

**Estructura:** 6 columnas en el orden del embudo. Cabecera de columna con tinte pastel de la fase, nombre, contador y total de leads con temperatura CALIENTE de esa columna. `DESECHADO` aparece colapsada por defecto.

**Barra superior de la bandeja:** búsqueda instantánea (filtra mientras se escribe, con *debounce* de 150 ms sobre el cliente y consulta al servidor solo si hay más de 30 resultados por columna), *chips* de filtro (Proyecto · Temperatura · "Sin contactar" · "Reingresos"), conmutador **Kanban / Tabla**.

**Tarjeta de lead (*Lead Card*) — 5 datos máximo visibles:**

| Zona | Contenido |
|---|---|
| Franja izquierda | Color de la fase actual (4 px) |
| Línea 1 | **Nombre** (o teléfono si no tiene nombre, en gris + "Sin nombre") · si es reingreso, chip `↻ Reingreso` |
| Línea 2 | Teléfono con acción de 1 clic **"Abrir WhatsApp"** y copiar |
| Línea 3 | Proyecto · icono de fuente |
| Línea 4 | **Badge de temperatura** (clicable) · tiempo transcurrido ("hace 2 h"); en **rojo ⚠** si es NUEVO y supera el SLA |

**Interacciones:**

| Acción | Comportamiento |
|---|---|
| Arrastrar tarjeta a otra columna | Actualización **optimista** (la tarjeta se mueve de inmediato) → `PATCH /status`. Si el servidor responde error, la tarjeta **vuelve** con animación y aparece un *toast* explicativo. |
| Soltar en VISITA AGENDADA / NEGOCIACIÓN / CALIFICADO sin nombre | **No se envía** al servidor: la tarjeta regresa, se abre el *drawer* con el foco en el campo "Nombre" y un aviso "Completa el nombre para agendar visita" (RN-ASE-002 anticipada en el cliente; el servidor la vuelve a validar). |
| Soltar en DESECHADO | Mini-diálogo para elegir/escribir el **motivo de descarte**. |
| Clic en badge de temperatura | Menú desplegable de 3 opciones, un clic cambia y guarda. |
| Clic en tarjeta | Se abre el *drawer* derecho (la tarjeta permanece visible). |
| Teclado | `Enter` abre, `Espacio` levanta/suelta tarjeta, flechas mueven entre columnas, `Esc` cancela. |
| Llega un lead nuevo (WebSocket) | Entra por arriba de NUEVO con animación y *toast* discreto "Nuevo lead asignado". |
| Alguien (gerente) cambia mi lead | Tarjeta se actualiza con un pulso sutil y se muestra quién lo cambió. |
| Conflicto de versión (409) | Aviso no bloqueante "Este lead cambió" con botón **Actualizar**. |

**Alternativa Tabla minimalista:** columnas Nombre · Teléfono · Estado (selector con punto de color) · Temperatura (badge) · Proyecto · Último contacto; paginada por cursor (50 filas), cabecera fija, orden por columna, filas con altura de 48 px.

**Rendimiento:** columnas con **virtualización** y carga incremental ("Cargar 30 más") para asesores con cientos de leads.

**Responsivo:** en móvil, las columnas pasan a un carrusel horizontal con *snap* y un selector de fase tipo pestañas; el *drawer* pasa a pantalla completa tipo *bottom sheet*; el DnD se reemplaza por un menú "Mover a…" (más fiable en táctil).

### 4.5 Dashboard Gerencial

**Barra de filtros fija:** rango de fechas (*chips*: Hoy · 7 d · 30 d · Este mes · Personalizado) · Asesor · Proyecto · Campaña · Fuente · botón **Exportar** (CSV/XLSX/PDF).

**Fila 1 — 5 tarjetas KPI** (sin bordes pesados, cifra grande, variación vs periodo anterior con flecha y color neutro/verde/rojo + texto):

| KPI | Detalle |
|---|---|
| Total de leads | Con mini-línea de tendencia |
| % Contactados | Con barra de progreso fina |
| Tasa de conversión | Calificados ÷ asignados |
| Tiempo prom. 1.er contacto | Formato "12 min"; rojo si supera el SLA |
| Sin atender (fuera de SLA) | Rojo corporativo; **clic ⇒ lleva a la tabla filtrada** |

**Fila 2 — gráficos de rendimiento (2 columnas):**

1. **Leads por fuente:** barras horizontales ordenadas con segundo trazo de conversión; clic en una barra aplica el filtro global (interactividad cruzada).
2. **Embudo comercial:** las 5 fases con el **mismo color pastel de fase** que el Kanban (coherencia visual) y % de paso entre etapas.

**Fila 3 — rendimiento por asesor:** tabla-gráfico limpia: Asesor · Asignados · Contactados · Calificados · Conversión (barra) · 1.er contacto · Carga abierta. Ordenable. Clic en una fila ⇒ filtra todo el dashboard por ese asesor.

**Fila 4 (2 columnas):** *Tendencia de leads* (línea suave, 1 serie, sin cuadrículas pesadas) y *Proyección por temperatura* (barra apilada Caliente/Tibio/Frío con **conversiones esperadas**).

**Estética de gráficos:** sin 3D ni sombras, cuadrícula casi invisible, etiquetas directas en vez de leyendas cuando sea posible, una sola paleta (colores de fase para estados, gris para lo secundario, rojo corporativo solo para alertas), animación de entrada de 300 ms.

**Tiempo real:** las cifras se actualizan por WebSocket con transición numérica; un punto verde pulsante "En vivo" confirma la conexión; si se pierde, pasa a gris con "Reconectando…" (nunca datos obsoletos sin avisar).

### 4.6 Componentes de retroalimentación inmediata (RNF-USA-03)

| Componente | Cuándo | Reglas |
|---|---|---|
| **Toast de éxito** | Guardado, cambio de estado, reasignación | Abajo-izquierda, 4 s, con botón **Deshacer** (5 s) en cambios de estado |
| **Toast de error** | Falla de red/servidor | Persistente hasta cerrar; botón **Reintentar**; muestra `request_id` en un detalle expandible |
| **Spinner en botón** | Envío de formularios | El botón se deshabilita y muestra spinner en < 100 ms |
| **Skeleton** | Carga inicial de bandeja/dashboard | Imita la forma real del contenido |
| **Barra de progreso** | Carga masiva y exportaciones | Alimentada por evento `batch.progress` |
| **Banner de sesión** | Falta 1 minuto para expirar por inactividad | "¿Sigues ahí?" con botón **Continuar** (refresca el token) |
| **Validación inline** | Formularios | Mensaje bajo el campo (rojo + icono) al perder el foco, nunca solo al enviar |
| **Estados vacíos** | Sin leads / sin resultados | Ilustración mínima + texto + acción sugerida |
| **Indicador de conexión** | Siempre visible en la barra superior | Verde "En vivo" / gris "Reconectando" |

### 4.7 Gestión de estado del frontend

- **TanStack Query** para datos de servidor (caché por clave: `["board", filtros]`, `["kpis", filtros]`).
- Los eventos de WebSocket **actualizan la caché** (`setQueryData`) en vez de recargar listas.
- Estado local de UI (drawer abierto, vista Kanban/Tabla) en un *store* ligero (Zustand).
- Cliente HTTP generado desde OpenAPI; interceptor que, ante 401, intenta **un** `refresh` y reintenta la petición original; ante `SESSION_EXPIRED` redirige a login conservando la ruta.

---

## 5. Fase 4 — Seguridad y Middleware

### 5.1 Cadena de middleware (orden estricto de ejecución)

| # | Capa | Función | Falla ⇒ |
|---|---|---|---|
| 1 | **Request-ID & logging** | Genera `X-Request-Id`, inicia log estructurado | — |
| 2 | **Cabeceras de seguridad y CORS** | HSTS, `X-Content-Type-Options`, CSP estricta, `Referrer-Policy`; CORS solo al origen del frontend | Bloqueo del navegador |
| 3 | **Límite de tamaño y tasa** | Cuerpos máx. por ruta; *rate limit* (Redis): login 5/min/IP, API general 300/min/usuario, webhooks por cliente | 413 / 429 |
| 4 | **Autenticación** | Verifica JWT **RS256** (firma, `exp`, `iss`, `aud`, `kid`). Para webhooks: `X-API-Key` + HMAC | 401 |
| 5 | **Estado de la cuenta** | Consulta (caché 30 s en Redis) que el usuario siga `is_active`, **sin `locked_at`** y que `token_version` del JWT coincida | 401 `SESSION_EXPIRED` / 423 |
| 6 | **Autorización RBAC** | Decorador por ruta con los roles permitidos (matriz §5.6) | 403 (y registro `PERMISSION_DENIED`) |
| 7 | **Contexto de BD (RLS)** | Abre transacción y ejecuta `SET LOCAL app.user_id`, `app.role`, `app.request_id` | 500 (fail-closed) |
| 8 | **Validación DTO** | Pydantic/zod estricto: tipos, longitudes, *whitelist* de campos (rechaza campos extra) | 400/422 |
| 9 | **Handler de negocio** | Lógica del módulo | 4xx de negocio |
| 10 | **Auditoría y outbox** | Triggers de BD + eventos en la misma transacción | *rollback* |
| 11 | **Manejador global de excepciones** | Convierte cualquier excepción a RFC 7807 genérico; envía *stack trace* completo a Sentry con `request_id` (RNF-DIS-03) | 500 |

### 5.2 Estrategia JWT

| Elemento | Especificación |
|---|---|
| Algoritmo | **RS256** (par de llaves asimétrico; clave privada solo en el servicio de autenticación; la pública publicada vía `kid`/JWKS para rotación) |
| Access Token | Vida **15 min**. Claims: `sub`, `role`, `tv` (token_version), `jti`, `iat`, `exp`, `iss`, `aud`. Se guarda **solo en memoria** del navegador (nunca `localStorage`) |
| Refresh Token | Opaco, 256 bits aleatorios; en BD solo su **hash SHA-256**. Cookie `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` |
| Inactividad (RN-SEC-001) | Cada `refresh` exige `now() − last_used_at ≤ 60 min`; si no ⇒ 401 `SESSION_EXPIRED`. Como el frontend refresca solo con actividad real, la sesión muere a los 60 min de inactividad |
| Rotación | Cada refresh emite uno nuevo y marca el anterior como `replaced_by`. **Detección de reutilización:** si llega un refresh ya rotado ⇒ se revoca toda la `family_id`, se registra `TOKEN_REUSE` y se alerta |
| Revocación inmediata | Bloqueo, desactivación o cambio de rol ⇒ `token_version++` ⇒ todos los access tokens vivos dejan de valer en ≤ 30 s (por la caché de la capa 5) |
| CSRF | Cookie `SameSite=Strict` + el único endpoint con cookie (`/auth/refresh`) exige cabecera `X-Requested-With` personalizada |

### 5.3 Bloqueo de cuentas tras intentos fallidos (RN-SEC-002)

```
POST /auth/login
 ├─ ¿existe y activo? ── no ──> responder 401 INVALID_CREDENTIALS (mismo mensaje y tiempo de respuesta*)
 ├─ ¿locked_at ≠ NULL? ── sí ──> 423 ACCOUNT_LOCKED ("Contacta al administrador")
 │                              (si lockout_minutes > 0 y ya transcurrió ⇒ desbloqueo automático)
 ├─ verificar hash (Argon2id)
 │    ├─ OK  ──> failed_login_attempts = 0 · last_login_at = now() · emitir tokens · audit LOGIN_OK
 │    └─ FAIL ─> UPDATE ... SET failed_login_attempts = failed_login_attempts + 1 RETURNING (atómico)
 │               ├─ < 5  ──> 401 INVALID_CREDENTIALS · audit LOGIN_FAIL
 │               └─ = 5  ──> locked_at = now() · token_version++ · revocar refresh tokens
 │                           audit ACCOUNT_LOCKED · evento al SUPERADMIN · 423
```
\* Se ejecuta un hash "señuelo" cuando el usuario no existe para igualar el tiempo de respuesta y evitar enumeración de cuentas.

Complementos: *rate limit* por IP (independiente del bloqueo de cuenta, para frenar ataques que bloquean cuentas ajenas a propósito), registro de IP/agente en cada intento, `SUPERADMIN` ve en `/admin/users` un indicador de cuentas bloqueadas.

### 5.4 Contraseñas

Argon2id (parámetros según OWASP vigente); mínimo 12 caracteres, verificación contra lista de contraseñas filtradas; `must_change_password` en el primer ingreso; las claves nunca se registran en logs.

### 5.5 Seguridad de la ingesta (webhooks y cargas)

- **Webhooks:** `X-API-Key` (guardada como hash) + **firma HMAC-SHA256** del cuerpo (Meta: `X-Hub-Signature-256`) con comparación en tiempo constante; *timestamp* con ventana de 5 min contra *replay*; idempotencia por `external_event_id`.
- **Cargas de archivo:** validar tipo real (no solo extensión), límite de tamaño y filas, lectura en modo seguro (sin ejecutar macros ni fórmulas; las celdas que empiecen por `= + - @` se neutralizan para evitar **inyección de fórmulas** al reexportar).
- **Exportaciones:** URLs firmadas con expiración de 15 min; el evento queda en `audit_logs` (`EXPORT`).

### 5.6 Matriz RBAC

| Recurso / acción | SUPERADMIN | GERENTE | RECEPCION | ASESOR |
|---|:-:|:-:|:-:|:-:|
| Crear lead / cargar lote | ✅ | ✅ | ✅ | ❌ |
| Ver leads propios | — | — | — | ✅ |
| Ver todos los leads | ✅ | ✅ | ❌ | ❌ |
| Editar/mover lead | ✅ | ✅ | ❌ | ✅ (solo propios) |
| Reabrir CALIFICADO/DESECHADO | ✅ | ✅ | ❌ | ❌ |
| Reasignar / eliminar lógico | ✅ | ✅ | ❌ | ❌ |
| Dashboard y exportaciones | ✅ | ✅ | ❌ | ❌ |
| Ver auditoría | ✅ | ✅ | ❌ | ❌ |
| Gestionar usuarios y desbloquear | ✅ | ❌ (solo lectura) | ❌ | ❌ |
| Configuración y catálogos | ✅ | Catálogos | ❌ | ❌ |

### 5.7 Otras medidas (RNF-SEC-01/04, RNF-DIS)

- **TLS 1.3** extremo a extremo; cifrado en reposo **AES-256** (disco/BD gestionada) y cifrado de columna para secretos (`hmac_secret_enc`).
- Consultas **solo parametrizadas** (ORM); sanitización contra XSS almacenado en `full_name`, `observations`, `notes`; la UI renderiza siempre como texto (nunca `innerHTML`).
- **Backups diarios con retención de 30 días y PITR de 7 días**; ensayo de restauración trimestral documentado.
- **Disponibilidad 99.9 %:** al menos 2 réplicas de la API detrás de un balanceador, *health checks*, despliegues sin caída (rolling), BD con réplica/alta disponibilidad gestionada.
- Gestión de secretos fuera del repositorio; escaneo de dependencias y de imágenes en CI; principio de mínimo privilegio en los roles de BD (`crm_owner`, `crm_app`, `crm_ingest`, `crm_readonly`).

---
## 6. Fase 5 — Estrategia de Ejecución por Milestones (para la IA programadora)

**Protocolo por milestone (obligatorio):**
1. Leer solo las secciones de este documento que el milestone cita.
2. Escribir primero las **pruebas de aceptación** del milestone, luego el código.
3. No avanzar al siguiente milestone hasta que el *Definition of Done* (DoD) pase en verde en CI.
4. Al terminar, entregar: resumen de lo hecho, comandos para ejecutarlo y lista de decisiones tomadas fuera de este documento.

| Hito | Nombre | Depende de |
|---|---|---|
| M0 | Cimientos del repositorio | — |
| M1 | Base de datos, migraciones y semillas | M0 |
| M2 | Autenticación, sesiones y bloqueo | M1 |
| M3 | Usuarios y RBAC (+ RLS) | M2 |
| M4 | Ingesta individual y deduplicación | M3 |
| M5 | Regla de adscripción y motor de asignación | M4 |
| M6 | Pipeline del asesor, máquina de estados y auditoría | M5 |
| M7 | Tiempo real (Outbox → WebSocket) | M6 |
| M8 | Ingesta masiva y webhooks | M5, M7 |
| M9 | Analítica y exportaciones | M6 |
| M10 | Frontend: shell, sistema de diseño y login | M2 (contrato API) |
| M11 | Frontend: Bandeja del Asesor (Kanban/Tabla) | M6, M7, M10 |
| M12 | Frontend: Ingesta (Recepción) | M8, M10 |
| M13 | Frontend: Dashboard Gerencial y vistas de gestión | M9, M10 |
| M14 | Migración de datos desde Excel | M5 |
| M15 | Endurecimiento: carga, seguridad, operación | M1–M14 |
| M16 | UAT, ejecución en paralelo y salida a producción | M15 |

> M10 puede avanzar en paralelo con M3–M9 usando el contrato OpenAPI y datos simulados (*mocks*).

---

### M0 — Cimientos del repositorio
- **Objetivo:** esqueleto ejecutable con calidad automatizada.
- **Tareas:** monorepo (`/backend`, `/frontend`, `/infra`, `/docs`); Docker Compose (PostgreSQL 16, Redis 7, API, worker, frontend); linters y formateadores; CI (lint + tests + escaneo de dependencias); configuración por variables de entorno; `GET /health/live`; manejador global de errores RFC 7807 vacío; logging estructurado con `request_id`.
- **DoD:** `docker compose up` levanta todo; `GET /health/ready` verifica BD y Redis; CI en verde con un test trivial; un error forzado devuelve JSON RFC 7807 y aparece en Sentry de prueba.

### M1 — Base de datos, migraciones y semillas
- **Objetivo:** esquema completo de la §2 con integridad garantizada por la propia BD.
- **Tareas:** migraciones Alembic para todas las tablas, enums, `CHECK`, índices únicos/parciales (§2.3–2.4); roles de BD (`crm_owner`, `crm_app`, `crm_ingest`); triggers de `updated_at`, de auditoría y de inmutabilidad; cadena de hash; políticas RLS; vista `v_leads_legacy`; semillas (fuentes, `app_settings`, usuario SUPERADMIN inicial).
- **DoD (pruebas de BD, ejecutadas con SQL directo):**
  - Insertar lead con teléfono inválido ⇒ falla (`chk` de formato).
  - Insertar dos leads con el mismo teléfono ⇒ falla `UNIQUE`.
  - `status='VISITA_AGENDADA'` con `full_name` nulo ⇒ falla.
  - `review_state='REVISADO'` con `asesor_id` nulo ⇒ falla.
  - `UPDATE`/`DELETE`/`TRUNCATE` sobre `audit_logs` con el rol `crm_app` ⇒ falla.
  - Un `UPDATE` de lead genera exactamente 1 fila en `audit_logs` con `before/after`.
  - Con `app.user_id` = asesor A, `SELECT` de lead del asesor B ⇒ 0 filas.
  - La verificación de la cadena de hash detecta una fila alterada (prueba con superusuario).
  - `alembic downgrade` y `upgrade` funcionan sin errores.

### M2 — Autenticación, sesiones y bloqueo
- **Objetivo:** login seguro conforme a §5.2–5.4.
- **Tareas:** `POST /auth/login|refresh|logout`, `GET /auth/me`, `change-password`; JWT RS256 con `kid`; refresh opaco con rotación y detección de reutilización; Argon2id; contador atómico de intentos y bloqueo; *hash señuelo*; *rate limit* de login; eventos de auditoría de sesión.
- **DoD:**
  - 5 contraseñas erróneas ⇒ 5.ª respuesta **423**; la contraseña correcta después **sigue** dando 423.
  - 20 intentos fallidos **concurrentes** ⇒ la cuenta queda bloqueada y el contador no supera lo esperado (sin carreras).
  - Un refresh token reutilizado revoca toda la familia.
  - Refresh con `last_used_at` > 60 min ⇒ 401 `SESSION_EXPIRED`.
  - Token con firma alterada / `exp` vencido / `tv` obsoleto ⇒ 401.
  - Mismo mensaje y tiempos similares para "usuario inexistente" y "clave incorrecta".

### M3 — Usuarios y RBAC (+ RLS operativa)
- **Objetivo:** gestión de usuarios y autorización por rol y por fila.
- **Tareas:** endpoints de `/users`, `/advisors/{id}/availability`; decoradores de roles (§5.6); middleware de contexto RLS (capas 5–7); registro `PERMISSION_DENIED`.
- **DoD:** matriz de pruebas **rol × endpoint** generada automáticamente a partir de §5.6 (cada combinación prohibida ⇒ 403); asesor no puede leer ni editar leads ajenos por API **ni por SQL**; no se puede eliminar un asesor con leads vivos; desbloqueo por SUPERADMIN funciona y revoca tokens previos.

### M4 — Ingesta individual y deduplicación
- **Objetivo:** `POST /leads` con las validaciones V1–V7 y V11–V12 (§3.3.1), aún sin asignación.
- **Tareas:** DTO; sanitización; normalización E.164; upsert de catálogos; `INSERT ... ON CONFLICT`; `lead_ingestions`; idempotencia por `external_event_id`; `outbox_events`.
- **DoD:**
  - Teléfonos en formatos distintos del mismo número (`+51 987 654 321`, `987654321`, `(51) 987-654-321`) ⇒ **un solo lead**.
  - **50 peticiones simultáneas** con el mismo teléfono ⇒ 1 lead creado, 49 reingresos, 0 errores 500.
  - Teléfono con < 9 dígitos o con letras ⇒ 422 `PHONE_INVALID` y **nada persistido**.
  - Reintento con el mismo `external_event_id` ⇒ misma respuesta, sin duplicar.
  - Lead eliminado lógicamente que reingresa ⇒ restaurado y auditado.
  - Textos con `<script>` quedan neutralizados.

### M5 — Regla de adscripción y motor de asignación
- **Objetivo:** V8–V10 (§3.3.2–3.3.3) con RN-ING-002 y RN-ING-003.
- **Tareas:** servicio de asignación (`ROUND_ROBIN` ponderado y `LEAST_LOADED`); `assignment_state` con bloqueo; `lead_assignments`; cola `PENDIENTE` y reintento; `GET/PUT /assignment/config`; `/assignment/queue`.
- **DoD:**
  - 90 leads nuevos con 9 asesores iguales ⇒ 10 por asesor (±1).
  - Peso 2 en un asesor ⇒ recibe el doble.
  - Lead reingresado a los 29 días ⇒ **mismo asesor**; a los 31 días ⇒ reasignado por el motor (usar reloj simulado).
  - Asesor de adscripción inactivo ⇒ `FALLBACK_ADSCRIPCION` + notificación.
  - Sin asesores elegibles ⇒ lead queda `PENDIENTE`, en la cola, **no se pierde**.
  - Simular fallo en V10 ⇒ *rollback* completo y `review_state` permanece `PENDIENTE` (RN-ING-003).
  - Con 100 RPS sostenidos no hay asignaciones duplicadas ni desbalance mayor a ±1.

### M6 — Pipeline del asesor, máquina de estados y auditoría
- **Objetivo:** módulo 2 completo (§3.4).
- **Tareas:** `/me/leads`, `/me/leads/board`, `/me/summary`, `GET/PATCH /leads/{id}`, `/status`, `/temperature`, `/interactions`, `/timeline`; matriz de transiciones; control de versión (`If-Match`); `lead_status_history`; cálculo de `first_contact_at` / `last_contact_at`; reasignación y borrado lógico (rutas del gerente).
- **DoD:**
  - Mover a `VISITA_AGENDADA`/`NEGOCIACION`/`CALIFICADO` sin nombre ⇒ 422 `NAME_REQUIRED`.
  - Cada cambio de estado ⇒ 1 fila en `lead_status_history`, 1 en `audit_logs` y `updated_at` y `version` incrementados **en la misma transacción**.
  - Dos asesores/gerente editando a la vez con la misma versión ⇒ uno recibe 409.
  - ASESOR pidiendo un lead ajeno ⇒ 404.
  - `first_contact_at` no cambia en cambios posteriores.
  - `DESECHADO` sin motivo ⇒ 422; reabrir `CALIFICADO` siendo ASESOR ⇒ 403/422 según matriz.

### M7 — Tiempo real (Outbox → WebSocket)
- **Objetivo:** propagación ≤ 1 s (RN-GER-001).
- **Tareas:** relay de outbox (`SKIP LOCKED`), Redis Pub/Sub, endpoint WebSocket con autenticación por primer mensaje, canales por rol, reenvío de eventos perdidos.
- **DoD:** prueba automatizada que mide `commit → mensaje recibido` con p95 ≤ 1 s; un ASESOR **no recibe** eventos de leads ajenos; tras cortar y restaurar la conexión se recuperan los eventos perdidos; si el proceso muere entre *commit* y publicación, el evento se publica al reiniciar (nada se pierde).

### M8 — Ingesta masiva y webhooks
- **Objetivo:** §3.3 completo (lotes y webhooks).
- **Tareas:** `POST /ingestion/batches` (CSV/XLSX, mapeo **por nombre de cabecera**, tolerante a mayúsculas/acentos y a columnas extra o reordenadas), procesamiento asíncrono por bloques, `ingestion_batch_errors`, descarga de errores; webhooks Meta/WhatsApp/genérico con HMAC y verificación de suscripción.
- **DoD:**
  - Archivo con columnas reordenadas y una columna extra ⇒ se procesa bien (cierra el dolor D4).
  - Lote de 150 filas ⇒ procesado en < 10 s, con conteos correctos de aceptados/reingresos/rechazados.
  - Mismo archivo subido dos veces ⇒ 409 `BATCH_DUPLICATE`.
  - Firma HMAC inválida o *replay* ⇒ 401; reentrega del mismo evento ⇒ sin duplicados.
  - Celdas con fórmulas (`=HYPERLINK(...)`) no se ejecutan ni se reexportan peligrosas.
  - La respuesta HTTP del webhook tarda < 50 ms (RNF-PER-03).

### M9 — Analítica y exportaciones
- **Objetivo:** módulo 3 (§3.5).
- **Tareas:** endpoints `/analytics/*`; definiciones de KPI fijas; exportaciones asíncronas CSV/XLSX/PDF con URL firmada; `/audit-logs` y verificación de cadena; caché opcional de KPI.
- **DoD:** con un conjunto de datos *fixture* conocido, cada KPI coincide **exactamente** con el valor calculado a mano (documentar el cálculo); leads con `deleted_at` no cuentan (RN-GER-002); p95 < 200 ms con 50.000 leads sembrados; el XLSX exportado abre sin advertencias y su hoja "consolidada" tiene el formato de `v_leads_legacy`.

### M10 — Frontend: shell, sistema de diseño y login
- **Objetivo:** base visual y de navegación.
- **Tareas:** *design tokens* (§4.2); librería de componentes (Botón, Badge de temperatura, Chip de fase, Card, Drawer, Toast, Skeleton, Spinner, Tabla, Selector, Diálogo); layout con barra `#404040` y navegación por rol; pantalla de login; cliente API generado; gestión de sesión (access en memoria, refresh por cookie, interceptor 401); banner de inactividad; rutas protegidas por rol; página de estilos (*storybook* o página interna `/ui-kit`).
- **DoD:** login con bloqueo muestra mensaje claro; recarga de página mantiene sesión vía refresh; rutas de otro rol redirigen; auditoría de accesibilidad automatizada (axe) sin errores críticos; los tokens cumplen contraste AA.

### M11 — Frontend: Bandeja del Asesor
- **Objetivo:** §4.4.
- **Tareas:** Kanban con dnd-kit (mouse, táctil y teclado), tarjetas, drawer del lead, edición inline del nombre, badge clicable, búsqueda instantánea y filtros, vista Tabla, actualizaciones optimistas con Deshacer, manejo de 409/422, integración WebSocket, virtualización, versión móvil.
- **DoD (pruebas E2E con Playwright):** arrastrar sin nombre a VISITA AGENDADA ⇒ la tarjeta regresa y se abre el *drawer* con foco en Nombre; arrastrar con nombre ⇒ el cambio persiste tras recargar; llega un lead por WebSocket ⇒ aparece en NUEVO sin recargar; conflicto 409 ⇒ aviso con "Actualizar"; cada acción da feedback visual en < 100 ms; funciona en 1920×1080, 1366×768 y 390×844.

### M12 — Frontend: Ingesta (Recepción)
- **Tareas:** formulario de alta rápida con normalización visible del teléfono, carga masiva con **vista previa** (primeras filas, columnas detectadas, errores previstos), barra de progreso en vivo, historial de lotes, descarga de rechazos.
- **DoD:** E2E: cargar un CSV con 3 filas inválidas ⇒ la vista previa las marca antes de confirmar; el resumen final coincide con los conteos del servidor.

### M13 — Frontend: Dashboard Gerencial y vistas de gestión
- **Tareas:** dashboard (§4.5) con filtros globales e interactividad cruzada; tabla global `/leads` con selección múltiple y reasignación masiva; `/team`; `/audit`; `/reports`; `/admin/*`.
- **DoD:** un cambio de estado hecho por un asesor mueve las cifras del dashboard en ≤ 1 s (prueba E2E con dos navegadores); clic en "Sin atender" lleva a la tabla filtrada; exportar descarga el archivo; SUPERADMIN puede desbloquear una cuenta desde la UI.

### M14 — Migración de datos desde Excel
- **Objetivo:** llevar el histórico sin perder ni duplicar leads.
- **Tareas:** script de migración **idempotente** y con modo *dry-run*:
  1. Leer `CRM GERENCIA Y ADMINISTRACIÓN.xlsx` y los 9 libros `CRM <ASESOR>.xlsx` **localizando las cabeceras por nombre** (no por "fila 4").
  2. Normalizar teléfonos a E.164 y fusionar por teléfono.
  3. **Reglas de conflicto** `[SUPUESTO]`: mismo teléfono en varios archivos ⇒ `ingested_at` = el más antiguo; asesor = el del registro con mayor avance de estado o, a igualdad, el más reciente; las demás apariciones pasan a `lead_ingestions` como reingresos.
  4. Mapear usuarios (asesores) y crear sus cuentas con clave temporal.
  5. Generar **informe de reconciliación** (filas leídas, importadas, fusionadas, rechazadas con motivo).
- **DoD:** reconciliación 100 % explicada (leídas = importadas + fusionadas + rechazadas); ejecutar el script dos veces no duplica nada; un libro con una columna insertada o filas de título extra se procesa igual; el gerente valida una muestra contra el Excel original.

### M15 — Endurecimiento: carga, seguridad y operación
- **Tareas:** pruebas de carga (≥ 100 RPS sostenidos: lecturas p95 < 200 ms, escrituras p95 < 500 ms, aceptación asíncrona < 50 ms); *pentest* básico (OWASP Top 10: inyección SQL, XSS almacenado, IDOR entre asesores, fuerza bruta, CSRF, *replay* de webhooks); revisión de cabeceras y TLS 1.3; cifrado en reposo verificado; backups + **ensayo de restauración PITR**; alertas (errores 5xx, cola atrasada, outbox sin publicar, ruptura de cadena de hash, picos de login fallido); manual de operación.
- **DoD:** informe de carga con los umbrales de los RNF cumplidos; cero hallazgos críticos/altos abiertos; restauración de BD a un punto en el tiempo demostrada y cronometrada; *runbook* de incidentes entregado.

### M16 — UAT, ejecución en paralelo y salida a producción
- **Tareas:** UAT con 2–3 asesores y el gerente usando datos reales; **semana en paralelo** (el Excel sigue vivo en modo solo lectura, comparar conteos diariamente); capacitación de 30 min por rol con guía de una página; corte final: congelar Excel, migración final, apagar el RPA, publicar.
- **DoD:** conteos del sistema nuevo = conteos oficiales durante 5 días seguidos; criterios de aceptación de los RN/RNF firmados por el cliente (§8); plan de contingencia (volver al Excel por 24 h) documentado.

---
## 7. Prototipo conceptual de alta fidelidad (para presentación a la junta directiva)

> **Nota de uso:** los wireframes son esquemas conceptuales en texto. Las cifras y nombres son **ilustrativos**. El color se describe entre corchetes porque el texto plano no lo muestra; la versión visual se entrega en el milestone M10–M13 con los *design tokens* de §4.2. Para una presentación a la junta se recomienda convertir estos esquemas en un prototipo navegable (Figma o una página HTML con datos de ejemplo) antes de comenzar M0; este documento sirve como guion exacto.

### 7.1 Vista 1 — Bandeja de Entrada del Asesor (Kanban)

**Qué ve el asesor de un vistazo:** seis columnas del embudo, cada una con su **identidad cromática** (cabecera con tinte pastel + franja izquierda `▌` en cada tarjeta). Dentro de cada tarjeta, el *badge* de temperatura es la única "píldora" de color, así el ojo distingue **fase** (columna) y **temperatura** (badge) sin confundirlos.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CRM Inmobiliario     Mi bandeja   Resumen                    [ Buscar lead, teléfono…  Ctrl+K ]   ● En vivo   (3)   Asesor A ▾ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  Mi bandeja    [ Kanban | Tabla ]     Proyecto ▾    Temperatura ▾    ( Sin contactar )    ( Reingresos )                         

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ NUEVO  12        │  │ CONTACTADO  18   │  │ VISITA AGEND.  5 │  │ NEGOCIACIÓN  4   │  │ CALIFICADO  9    │  │ DESECHADO  31    │
│ [violeta pastel] │  │ [turquesa pastel]│  │ [naranja pastel] │  │ [magenta pastel] │  │ [verde pino past]│  │ [gris piedra]    │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│▌Sin nombre       │  │▌María Pérez      │  │▌Jorge Salas      │  │▌Ana Torres       │  │▌Pedro Ruiz       │  │ (colapsada)      │
│ +51 987 654 321  │  │ +51 945 220 031  │  │ +51 987 100 222  │  │ +51 954 870 663  │  │ +51 976 332 019  │  │                  │
│ Miraflores·Meta  │  │ Miraflores·Web   │  │ Miraflores·IG    │  │ Surco·Meta       │  │ Miraflores·Meta  │  │ ▸ Expandir (31)  │
│ ● TIBIO   (!) 18m│  │ ● CALIENTE    2h │  │ ● CALIENTE    3h │  │ ● CALIENTE    1d │  │ ● CALIENTE    4d │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐                                                                                        
│▌Luis Ortega  ↻   │  │▌Carla Núñez      │                                                                                        
│ +51 912 004 118  │  │ +51 933 411 507  │                                                                                        
│ Surco·WhatsApp   │  │ Surco·Referido   │                                                                                        
│ ● FRÍO        5m │  │ ● TIBIO       1d │                                                                                        
└──────────────────┘  └──────────────────┘                                                                                        
```

**Leyenda de color (aplicada por la interfaz real):**

| Elemento | Color |
|---|---|
| Columna NUEVO · franja `▌` | Violeta pastel `#EEE9FB` / acento `#6B4FD8` |
| Columna CONTACTADO | Turquesa pastel `#DFF3F3` / acento `#0F8B8D` |
| Columna VISITA AGENDADA | Naranja pastel `#FDEBDD` / acento `#D9732A` |
| Columna NEGOCIACIÓN | Magenta pastel `#FBE4EE` / acento `#B83A74` |
| Columna CALIFICADO | Verde pino pastel `#E4F1E6` / acento `#2F7D4A` |
| Columna DESECHADO | Gris piedra `#ECEEF0` / acento `#7A838C`, colapsada |
| `● CALIENTE` | Badge **verde** `#DFF3E4` con texto `#17692F` |
| `● TIBIO` | Badge **amarillo** `#FFF4CC` con texto `#7A5A00` |
| `● FRÍO` | Badge **azul/gris** `#E4EDF5` con texto `#2F5F8A` |
| `(!) 18m` | **Rojo corporativo** `#C00000`: lead nuevo sin contactar fuera de SLA |
| Barra superior | Gris antracita `#404040`, texto blanco; botón primario rojo `#C00000` |

**Anatomía de la tarjeta:**

```
┌─ Lead Card (ampliada) ─────────────────────────┐
│ ▌ María Pérez                    ↻ Reingreso   │
│   +51 945 220 031     [ WhatsApp ]  [ Copiar ] │
│   Torre Miraflores  ·  (icono Meta Ads)        │
│   [● CALIENTE ▾]                   hace 2 h    │
└────────────────────────────────────────────────┘
```

**Panel lateral (se abre al hacer clic en una tarjeta; el tablero sigue visible a la izquierda):**

```
┌─ Panel lateral del lead ─────────────────────────┐
│ María Pérez                                [ x ] │
│ +51 945 220 031     Meta Ads · Torre Miraflores  │
│                                                  │
│ Estado       [ ● CONTACTADO            ▾ ]       │
│ Temperatura  [ ● CALIENTE ▾ ]                    │
│ Nombre       [ María Pérez                  ]    │
│                                                  │
│ Línea de tiempo                                  │
│   ○ Hoy 14:10  Llamada: pidió precios 2 hab.     │
│   ○ Hoy 12:03  Estado: NUEVO → CONTACTADO        │
│   ○ Hoy 11:58  Asignado a ti (Round-Robin)       │
│   ○ Ayer 17:40 Reingreso (Web)                   │
│                                                  │
│ Observaciones                                    │
│   [ Prefiere visita sábado por la mañana…   ]    │
│                                                  │
│ [ + Registrar interacción ]     [ Guardar ]      │
└──────────────────────────────────────────────────┘
```

**Guion de demostración (90 segundos):**
1. Entra un lead nuevo: la tarjeta aparece sola en NUEVO con un destello (tiempo real).
2. El asesor arrastra la tarjeta a VISITA AGENDADA **sin nombre**: regresa a su sitio y el panel pide el nombre (regla RN-ASE-002 visible para el cliente).
3. Escribe el nombre, arrastra de nuevo: se mueve, aparece el aviso "Estado actualizado · Deshacer".
4. Un clic en el *badge* cambia la temperatura de Tibio a Caliente.
5. En otra pantalla (gerente), las cifras del dashboard se mueven al instante.

### 7.2 Vista 2 — Dashboard Gerencial

**Distribución:** barra de filtros fija → 5 tarjetas KPI → fuente y embudo → rendimiento por asesor → tendencia y proyección. Mucho aire entre bloques; las únicas notas de rojo son las alertas (SLA).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CRM Inmobiliario    Dashboard  Leads  Equipo  Ingesta  Auditoría           [ Buscar… Ctrl+K ]  ● En vivo  (2)  Gerente ▾ │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
  ( Hoy ) ( 7 d ) [ 30 d ] ( Este mes ) ( Personalizado )   Asesor ▾  Proyecto ▾  Campaña ▾  Fuente ▾      [ Exportar ▾ ]   

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐
│ Total de leads      │  │ % Contactados       │  │ Tasa de conversión  │  │ 1.er contacto prom. │  │ Sin atender (SLA)    │
│ 1.248               │  │ 86%                 │  │ 7,4%                │  │ 12 min              │  │ (!) 9                │
│ ▲ 12% vs. anterior  │  │ ▲ 4 pts             │  │ ▲ 0,8 pts           │  │ ▼ 3 min (mejor)     │  │ clic → ver lista     │
│ ▁▂▃▃▅▅▆▇▆▇          │  │ ████████░░          │  │ Calif. / asignados  │  │ SLA meta: 15 min    │  │ (en rojo corp.)      │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  └──────────────────────┘

┌─ Leads por fuente ────────────────────────────────────────┐  ┌─ Embudo comercial ────────────────────────────────────────┐
│ Meta Ads    ████████████████████  512   conv 8,1%         │  │ NUEVO        ██████████████████████  1.248                │
│ WhatsApp    ██████████████        366   conv 7,9%         │  │ CONTACTADO   ███████████████████      1.073   (86%)       │
│ Instagram   ████████              171   conv 6,4%         │  │ VISITA       ████████                   402   (37%)       │
│ Web         █████                  98   conv 7,1%         │  │ NEGOCIACIÓN  ████                       190   (47%)       │
│ Referido    ███                    64   conv 9,4%         │  │ CALIFICADO   ██                          92   (48%)       │
│ TikTok      ██                     37   conv 2,7%         │  │                                                           │
│                                                           │  │ cada barra usa el color pastel de su fase                 │
│ clic en una barra = filtra todo el tablero                │  │                                                           │
└───────────────────────────────────────────────────────────┘  └───────────────────────────────────────────────────────────┘

┌─ Rendimiento por asesor ─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Asesor      Asignados  Contactados  Calificados  Conversión            1.er contacto  Carga abierta                      │
│ Asesor A        152        138           14       █████████░  9,2%        8 min          41                              │
│ Asesor B        149        131           13       ████████░░  8,7%       10 min          38                              │
│ Asesor C        141        124           11       ███████░░░  7,8%       12 min          44                              │
│ Asesor D        138        115            9       ██████░░░░  6,5%       19 min          47                              │
│ Asesor E        133        112            8       █████░░░░░  6,0%       21 min          52                              │
│ … (muestra de 5 de 9 asesores · clic en fila = filtrar tablero por asesor)                                               │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─ Tendencia ───────────────────────────────────────────────┐  ┌─ Proyección por temperatura ──────────────────────────────┐
│ Leads por día (últimos 14)                                │  │ Leads abiertos por temperatura  →  conversiones esperadas │
│                                                           │  │                                                           │
│  120 ┤        ╭─╮      ╭──╮                               │  │ CALIENTE  ██████         64  × 50% =  32                  │
│   90 ┤   ╭────╯ ╰─╮ ╭──╯  ╰─╮   ╭───                      │  │ TIBIO     ████████████  210  × 20% =  42                  │
│   60 ┤╭──╯        ╰─╯       ╰───╯                         │  │ FRÍO      ████████████  330  ×  5% =  17                  │
│   30 ┤                                                    │  │                                                           │
│      └────────────────────────────                        │  │ Esperadas ≈ 91     (probabilidades configurables)         │
│       1  3  5  7  9 11 13 15                              │  │                                                           │
└───────────────────────────────────────────────────────────┘  └───────────────────────────────────────────────────────────┘
```

**Lectura del tablero (qué responde a la dirección):**

| Pregunta de la junta | Dónde se responde |
|---|---|
| ¿Cuántos leads entran y cómo evoluciona? | Tarjeta "Total de leads" + Tendencia |
| ¿Qué canal rinde mejor? | "Leads por fuente" (volumen y conversión) |
| ¿Dónde se nos cae el embudo? | "Embudo comercial" (% de paso entre fases) |
| ¿Quién rinde y quién está saturado? | "Rendimiento por asesor" (conversión, rapidez y carga) |
| ¿Estamos atendiendo a tiempo? | "1.er contacto" y "Sin atender (SLA)" |
| ¿Qué podemos esperar cerrar? | "Proyección por temperatura" |

### 7.3 Antes / después (diapositiva de cierre sugerida)

| | **Hoy (Excel + RPA + Power Query)** | **Con el nuevo CRM** |
|---|---|---|
| Asignación de un lote | Hasta **7,6 minutos** | Lead individual **< 1 s**; lote de 150 en segundos |
| Duplicados | Se limpian "a mano" | **Imposibles** por diseño (restricción única) |
| Archivo abierto por un asesor | Bloquea el proceso | No existen archivos que bloquear |
| ¿Quién cambió qué? | No se sabe | Bitácora **inmutable** completa |
| Vista de gerencia | Refresco manual, retrasada | **En vivo** (≤ 1 s) |
| Un cambio de formato en Excel | Rompe macros | Imposible: no hay macros ni hojas |
| Acceso | Carpetas compartidas | Roles, sesiones seguras y bloqueo de cuentas |

---

## 8. Matriz de trazabilidad (SRS → diseño → verificación)

| Requisito del SRS | Dónde se implementa | Hito | Cómo se verifica |
|---|---|---|---|
| **RN-ING-001** Sin teléfono válido no hay lead | `CHECK` de formato E.164 en `leads`; V3 de la ingesta | M1, M4 | Prueba SQL directa + `POST /leads` con teléfono inválido ⇒ 422 y 0 filas |
| **RN-ING-002** Adscripción de 30 días | §3.3.2; `lead_assignments`; `adscription_days` | M5 | Pruebas con reloj simulado a 29 y 31 días |
| **RN-ING-003** `Pendiente → Revisado` solo tras éxito de entrega | V10 (misma transacción) + `chk_reviewed_has_asesor` | M5 | Inyección de fallo en V10 ⇒ *rollback* y sigue `PENDIENTE` |
| **RN-ASE-001** Sin acceso cruzado entre asesores | RLS + filtro de API + 404 | M1, M3, M6 | Prueba por API y por SQL con dos asesores |
| **RN-ASE-002** Nombre obligatorio en VISITA/NEGOCIACIÓN | `CHECK chk_name_required` + validación API + validación previa en UI | M1, M6, M11 | Pruebas BD, API y E2E (arrastrar sin nombre) |
| **RN-ASE-003** `updated_at` atómico | Trigger + `UPDATE` en la misma transacción que historial y *outbox* | M1, M6 | Test de transacción: fallo parcial ⇒ nada cambia |
| **RN-GER-001** Propagación ≤ 1 s | Outbox → Redis → WebSocket (§3.6) | M7, M13 | Medición p95 `commit → cliente` |
| **RN-GER-002** Soft delete fuera de KPIs | `deleted_at IS NULL` en todas las consultas analíticas | M9 | *Fixture* con leads eliminados |
| **RN-SEC-001** Expiración a 60 min de inactividad | Refresh deslizante (§5.2) | M2, M10 | Prueba con reloj simulado |
| **RN-SEC-002** Bloqueo a los 5 intentos | §5.3, contador atómico | M2 | 20 intentos concurrentes |
| **RNF-SEC-01** TLS 1.3 y AES-256 en reposo | §5.7 | M15 | Escaneo TLS + evidencia de configuración |
| **RNF-SEC-02** JWT RS256 + cookie HttpOnly/Secure/SameSite=Strict | §5.2 | M2 | Inspección de cabeceras y pruebas de firma |
| **RNF-SEC-03** RBAC + Row-Level Security | §2.6, §5.6 | M1, M3 | Matriz rol × endpoint automatizada |
| **RNF-SEC-04** Consultas parametrizadas y sanitización XSS | ORM, V2, renderizado como texto | M4, M15 | Pruebas de inyección SQL/XSS en *pentest* |
| **RNF-PER-01** GET p95 < 200 ms · POST/PUT < 500 ms | Índices §2.4, pool de conexiones | M9, M15 | Prueba de carga |
| **RNF-PER-02** ≥ 100 RPS | Diseño sin bloqueos largos; asignación serializada solo en una fila | M5, M15 | Prueba de carga sostenida |
| **RNF-PER-03** Procesos en segundo plano, HTTP < 50 ms | Webhooks 202, lotes y exportaciones por *workers* | M8, M9 | Medición de latencia de aceptación |
| **RNF-DIS-01** Disponibilidad 99,9 % | ≥ 2 réplicas, *health checks*, BD en alta disponibilidad | M15 | Prueba de caída de una réplica |
| **RNF-DIS-02** Backups 30 d + PITR 7 d | Servicio gestionado de BD | M15 | Ensayo de restauración cronometrado |
| **RNF-DIS-03** RFC 7807 + logs centralizados | Middleware global (§5.1 capa 11) + Sentry | M0, M15 | Error forzado visible en Sentry |
| **RNF-USA-01** Responsivo | §4.4 (móvil), Tailwind | M10–M13 | E2E en 3 resoluciones |
| **RNF-USA-02** Identidad visual y badges | §4.2 *design tokens* | M10 | Revisión visual + prueba de contraste |
| **RNF-USA-03** Feedback < 100 ms | §4.6 | M10–M13 | Pruebas E2E con medición |
| **Brecha:** `UNIQUE(phone)` | §2.3 | M1 | Prueba SQL |
| **Brecha:** `LeadAuditLog` inmutable | §2.5 | M1 | Pruebas de permisos y *triggers* |
| **Brecha:** `GET /analytics/consolidated` | §3.5 | M9 | Comparación con el consolidado actual (M16) |
| **Brecha:** migrar datos históricos | M14 | M14 | Informe de reconciliación |

---

## 9. Reglas de oro para la IA programadora

1. **Este documento manda.** Si algo no está definido, elige la opción más simple y segura, **anótala** en la entrega del milestone y sigue; no inventes funcionalidades.
2. **La base de datos es la última línea de defensa:** toda regla de integridad (único, `CHECK`, RLS, inmutabilidad) vive en la BD *además* de en el código. Nunca confíes solo en la validación de la aplicación.
3. **Nada de posiciones:** ningún código puede depender del orden o número de columnas/filas de un archivo. Siempre por nombre de cabecera.
4. **Una transacción, un cambio coherente:** actualización del lead + historial + *outbox* + auditoría se confirman juntos o no se confirman.
5. **Los eventos salen después del *commit*, siempre** (patrón Outbox). Nunca publicar en Redis dentro de la transacción.
6. **Nunca uses `localStorage`/`sessionStorage` para tokens.** El access token vive en memoria; el refresh va en cookie HttpOnly.
7. **Nunca devuelvas detalles internos** (trazas, SQL, rutas) al cliente. Un error 500 devuelve un mensaje genérico + `request_id`.
8. **Un asesor que pide un lead ajeno recibe 404**, no 403.
9. **Cada milestone se cierra con sus pruebas en verde.** Las pruebas de aceptación de cada hito son parte del entregable.
10. **Código simple y legible por humanos:** el equipo del cliente lo mantendrá después. Nombres claros, módulos pequeños, comentarios solo para el *porqué*.
11. **Los valores configurables no se escriben a mano en el código** (30 días, 5 intentos, 60 min, SLA, probabilidades): salen de `app_settings`.
12. **Accesibilidad no es opcional:** todo estado comunicado por color lleva también icono o texto.

---

## Anexo A — Glosario

| Término | Significado |
|---|---|
| Lead | Prospecto comercial; identificado globalmente por UUID y por su teléfono normalizado |
| Reingreso | Nueva llegada de un teléfono que ya existe; se registra en `lead_ingestions`, no crea otro lead |
| Adscripción | Regla de los 30 días: el lead vuelve al mismo asesor |
| Outbox | Tabla de eventos escrita en la misma transacción que el cambio para publicar después de forma fiable |
| RLS | *Row-Level Security*: la BD filtra filas según el usuario |
| SLA de primer contacto | Tiempo máximo (por defecto 15 min) para el primer contacto tras la asignación |
| PITR | *Point-In-Time Recovery*: restaurar la BD a un instante exacto |

## Anexo B — Preguntas para validar con el cliente antes de M0

1. ¿País/prefijo telefónico por defecto y zona horaria del negocio? (H-13, AD-10)
2. ¿Se confirma que `CALIFICADO` = conversión y que es estado final? (H-06, H-17)
3. ¿Qué pasa con un lead que reingresa pasados los 30 días: nuevo asesor o el mismo? (H-03)
4. ¿Se acepta extender la obligatoriedad del nombre a `CALIFICADO`? (H-07)
5. ¿Qué SLA de primer contacto quiere la gerencia y con qué probabilidades por temperatura se proyecta el pipeline? (H-17)
6. ¿Qué cuentas/APIs reales existen hoy: Meta Lead Ads, WhatsApp Cloud API, Instagram, TikTok? (H-14)
7. ¿Desbloqueo de cuentas solo manual o también automático tras N minutos? (H-11)
8. ¿Volumen mensual esperado de leads y número de asesores a 12 meses? (H-12)
9. ¿Dónde se alojará (nube preferida) y quién operará los respaldos y el monitoreo?
10. ¿Hay motivos de descarte predefinidos que quieran usar como lista cerrada?
