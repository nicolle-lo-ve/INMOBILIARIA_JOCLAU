# Documento de Especificación de Requerimientos de Software (SRS)

## Sistema de Gestión de Relaciones con Clientes (CRM) - Edición Empresarial

---

## 1. DEFINICIÓN DEL SISTEMA Y CONTEXTO DE NEGOCIO

### 1.1 Propósito del Sistema

El sistema a desarrollar es una plataforma CRM web de alta concurrencia diseñada para centralizar, automatizar y auditar el ciclo de vida completo de los prospectos comerciales (leads) desde su captación multicanal hasta la conversión o descarte. La solución actúa como el orquestador central entre el área de marketing, el equipo de ventas directas (asesores) y la alta gerencia.

Arquitectónicamente, el software reemplaza una infraestructura heterogénea basada en archivos de hojas de cálculo descentralizados y ejecuciones locales de automatización de escritorio (RPA) por una arquitectura cliente-servidor nativa en la nube, con persistencia relacional centralizada, procesamiento asíncrono de eventos e interfaces orientadas a roles (RBAC).

```
[Fuentes de Captura] ---> [API Gateway / Ingestion Service]
                                  |
                                  v
                        [Base de Datos Central]
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
[Módulo Gerencial (Consolidado)]              [Módulo Asesor (x9)]

```

### 1.2 Puntos de Dolor Operativos y Necesidades de Negocio

El desarrollo de esta plataforma responde a la necesidad de mitigar y eliminar las siguientes falencias estructurales del modelo operativo previo:

1. **Inconsistencia y Duplicidad de Datos**: La gestión distribuida mediante archivos Excel individuales por asesor provocaba duplicación de contactos, sobreescritura accidental de registros durante la ejecución de tareas batch y falta de un identificador único global por lead.
2. **Latencia en la Asignación y Procesamiento**: La ejecución de flujos de asignación vía RPA local introducía retardos de procesamiento (hasta 7.6 minutos por lote debido a retrasos en bucles de polling e interfaces visibles), generando tiempos muertos en el primer contacto comercial.
3. **Falta de Trazabilidad y Transparencia Operativa**: Ausencia de registros de auditoría (*audit logs*) para rastrear cambios de estado, reasignaciones de asesores, historiales de interacciones o intentos de edición no autorizados en los leads asignados.
4. **Acoplamiento Fuerte y Vulnerabilidad en Fórmulas**: Dependencia crítica de la estructura de filas y columnas en hojas de cálculo (ej. encabezados en fila 4, datos desde fila 5). Un cambio menor de formato por parte de un usuario derivaba en fallos catastróficos en las macros y motores de consulta (Power Query / Power Automate).
5. **Dificultad de Consolidación en Tiempo Real**: Necesidad de ejecutar procesos intensivos de transformación I/O para unificar la información de los 9 asesores comerciales con la matriz gerencial, imposibilitando la toma de decisiones basada en métricas en vivo.

---

## 2. ESPECIFICACIÓN DETALLADA DE MÓDULOS DEL SISTEMA IDEAL

### 2.1 Módulo 1: Ingesta, Captura y Asignación Automatizada de Leads

#### Descripción Funcional

Módulo encargado de recibir leads provenientes de diversas fuentes de campaña (Meta Ads, WhatsApp, Instagram, TikTok, Referidos, Web), validar su integridad, prevenir la duplicidad y ejecutar el algoritmo de distribución equitativa o condicionada hacia los asesores comerciales disponibles.

#### Inputs, Procesos Internos y Outputs

* **Inputs**: Payload JSON vía Webhooks/APIs o carga masiva tabular conteniendo:
* `ano` (int), `mes` (string)
* `fecha_ingreso` (datetime), `hora_ingreso` (time)
* `telefono` (string, min 9 dígitos)
* `usuario` (string)
* `fuente` (enum: WhatsApp, Meta Ads, Instagram, TikTok, Referido)
* `campana` (string), `proyecto` (string)


* **Procesos Lógicos Internos**:
1. Sanitización de cadenas (eliminación de espacios, normalización del prefijo telefónico internacional).
2. Consulta de duplicidad en la BD central utilizando `telefono` como clave de deduplicación.
3. Si el registro existe, se marca como reingreso y se asocia al historial del lead; si no, se instancian los campos del nuevo lead.
4. Ejecución del motor de asignación (Round-Robin o asignación por carga balanceada entre asesores activos).
5. Asignación automática de marcas de tiempo: `fecha_asignacion` y `hora_asignacion`.
6. Transición del estado del lead a nivel de infraestructura gerencial de `'Pendiente'` a `'Revisado'` una vez inyectado exitosamente en el buzón del asesor asignado.


* **Outputs**: Lead persistido con ID único (UUIDv4), asignado a un asesor específico y notificación push/event dispatch emitida.

#### Reglas de Negocio Críticas

* **RN-ING-001**: Ningún lead puede persistirse sin un número de teléfono válido.
* **RN-ING-002**: Si un lead ingresa con un número de teléfono previamente asignado a un asesor en un periodo menor a 30 días, debe ser asignado automáticamente al mismo asesor (Regla de Adscripción).
* **RN-ING-003**: La marcación del atributo `estado_revision` en el módulo de recepción gerencial DEBE transicionar de `'Pendiente'` a `'Revisado'` únicamente cuando la transacción de inserción en la vista/bandeja del asesor haya retornado un *HTTP 201 Created* o un *commit* de BD exitoso.

---

### 2.2 Módulo 2: Bandeja de Trabajo y Pipeline Comercial del Asesor

#### Descripción Funcional

Interfaz y lógica backend orientada al asesor comercial individual. Permite la visualización de los leads asignados en tiempo real, actualización de estados de venta, registro de interacciones y seguimiento de la temperatura del cliente.

#### Inputs, Procesos Internos y Outputs

* **Inputs**:
* Filtros de vista (por estado, proyecto, fecha).
* Actualización de formulario de lead: `nombre` (string), `estado` (enum: NUEVO, CONTACTADO, VISITA AGENDADA, NEGOCIACIÓN, CALIFICADO, DESECHADO), `temperatura` (enum: FRÍO, TIBIO, CALIENTE), `observaciones` (text).


* **Procesos Lógicos Internos**:
1. Validación de sesión y pertenencia del lead (`lead.asesor_id == current_user.id`).
2. Registro de auditoría del cambio de estado (`LeadHistory` table).
3. Recálculo automático de fechas de último contacto.
4. Emisión de eventos para actualización de reportes en tiempo real.


* **Outputs**: Objeto `Lead` actualizado, confirmación visual en UI y log de auditoría persistido.

#### Reglas de Negocio Críticas

* **RN-ASE-001**: Un asesor solo puede visualizar y editar los leads explícitamente asignados a su ID de usuario. Queda estrictamente prohibido el acceso cruzado entre asesores.
* **RN-ASE-002**: La transición al estado `'VISITA AGENDADA'` o `'NEGOCIACIÓN'` requiere obligatoriamente que el campo `nombre` del cliente esté diligenciado y no sea nulo.
* **RN-ASE-003**: Toda modificación en el estado del lead debe actualizar la marca de tiempo de última modificación (`updated_at`) de forma atómica.

---

### 2.3 Módulo 3: Consolidador Gerencial y Motor de Reportes

#### Descripción Funcional

Módulo centralizado de supervisión analítica para la alta dirección. Ofrece una vista unificada y en tiempo real de la base de datos de todos los asesores (sin dependencia de procesos batch o transformaciones externas en hojas de cálculo), permitiendo medir tasas de conversión, rendimiento por fuente de captura y estado global del embudo.

#### Inputs, Procesos Internos y Outputs

* **Inputs**: Parámetros de consulta (rangos de fechas, filtro por asesor, por proyecto, por campaña, por fuente).
* **Procesos Lógicos Internos**:
1. Agregación de datos mediante consultas SQL optimizadas sobre la base relacional única.
2. Cálculo de métricas KPI: Total Leads, % Contactados, Tasa de Conversión por Asesor, Tiempo Promedio de Primer Contacto.
3. Proyección de pipelines de venta basados en la temperatura de los leads.


* **Outputs**: Datasets estructurados para renderizado de dashboards interactivos y exportación de reportes en formatos estándar (CSV, XLSX, PDF).

#### Reglas de Negocio Críticas

* **RN-GER-001**: La vista gerencial debe ser omnisciente, reflejando las actualizaciones realizadas por cualquier asesor con una latencia máxima de propagación de 1 segundo (Consistencia Eventual / Real-time sync).
* **RN-GER-002**: Las métricas de desempeño no deben contabilizar registros marcados como eliminados lógicamente (*soft delete*).

---

### 2.4 Módulo 4: Control de Acceso y Gestión de Identidades (RBAC)

#### Descripción Funcional

Módulo transversal encubierto de seguridad que gestiona autenticación, autorización, roles y permisos de los usuarios del sistema.

#### Inputs, Procesos Internos y Outputs

* **Inputs**: Credenciales de usuario (Email/Password) o tokens Bearer JWT.
* **Procesos Lógicos Internos**:
1. Validación de hash de contraseña (vía BCrypt/Argon2).
2. Generación de Access Token (JWT corta duración) y Refresh Token.
3. Verificación de políticas de seguridad según el rol asignado (`SuperAdmin`, `Gerente`, `Recepción/Marketing`, `Asesor`).


* **Outputs**: Identity Principal con scopes y claims definidos para el consumo de la API.

#### Reglas de Negocio Críticas

* **RN-SEC-001**: Expiración forzada de tokens de acceso tras 60 minutos de inactividad.
* **RN-SEC-002**: Bloqueo automático de cuenta tras 5 intentos fallidos de inicio de sesión consecutivos.

---

## 3. ESTADO ACTUAL DEL MVP (ARQUITECTURA Y ALCANCE)

### 3.1 Descripción de la Arquitectura Actual

El MVP operativo actual consiste en una arquitectura híbrida y frágil basada en automatización de procesos mediante robótica de escritorio (RPA con Power Automate Desktop) integrada con archivos de Microsoft Excel actuando como pseudo-bases de datos relacionales, y Power Query actuando como motor ETL de consolidación.

```
[CRM GERENCIA Y ADMINISTRACIÓN.xlsx]
   │
   ├─ (Filas 5+ / Cols A-J) ──> [Power Automate Desktop (RPA)]
   │                                  │
   │                                  ▼ (Escritura Fila 5+)
   │                        [CRM <ASESOR>.xlsx (x9)]
   │                                  │
   └──────────< Power Query <─────────┘ (Consolidador ETL)

```

### 3.2 Componentes e Implementación del MVP Existente

1. **Persistencia de Datos (Hojas de Cálculo Excel)**:
* **Matriz General/Gerencial (`CRM GERENCIA Y ADMINISTRACIÓN.xlsx`)**: Almacena los leads receptados. Posee estructura fija donde las filas 1 a 3 corresponden a metadatos/encabezados de diseño, la fila 4 contiene los nombres de las columnas (Año, Mes, Fecha ingreso, Hora ingreso, Teléfono, usuario, Fecha de asignación, Hora de asignación, Asesor, Estado de revisión) y los datos inician estrictamente a partir de la Fila 5.


* **Plantillas de Asesores (`CRM <NOMBRE_ASESOR>.xlsx`)**: Existen 9 archivos independientes pertenecientes a cada asesor registrado (ej. `CRM ALINE REYES.xlsx`, `CRM AMADERLIN ALFONZO.xlsx`, etc.). Replicaban la misma estructura visual que la matriz gerencial, receptando las columnas A a I (1 a 9) y extendiendo campos propios para el seguimiento comercial (Nombre, Fuente, Campaña, Proyecto, Estado, Temperatura).


2. **Backend de Automatización (Power Automate Desktop)**:
* **Lógica de Procesamiento**: Ejecuta un bucle `For Each` que itera sobre la variable `ExcelData` (que lee un rango estático de filas desde la fila 5 hasta la fila 153/150).


* **Evaluación de Condicionales**: Compara si la columna índice `9` (Columna J - `Estado de revisión`) es igual a `'Pendiente'`. Si se cumple, parsea el nombre del asesor (índice `8` / Columna I), convierte el texto a mayúsculas para construir dinámicamente la ruta del archivo destino (`CRM <NOMBRE>.xlsx`), abre la instancia de Excel del asesor, escribe los datos del lead a partir de la variable `%FilaAsesor%` (iniciando en fila 5), guarda y cierra la instancia.
* **Actualización en Caliente**: Actualiza el valor del elemento en la tabla de datos en memoria `ExcelData` en el índice de fila `FilaActual - 5` y columna `9` marcándolo como `'Revisado'`.
* **Aumento de Contadores**: Incrementa las variables numéricas `%FilaAsesor%` y `%FilaActual%` en paso 1 en cada iteración correspondiente.




3. **Motor de Consolidación (Power Query ETL)**:
* Configurado en la pestaña `BASE DE DATOS CONSOLIDADA` del libro máster.
* Consume la carpeta local/compartida `...\ASESORES\` filtrando archivos que inician por la cadena `"CRM "`.
* Aplica transformación ETL: eliminación de las primeras 3 filas de offset, promoción de la fila 4 como encabezado, filtrado de cadenas de texto duplicadas que coincidan con los nombres de las columnas, eliminación de celdas `null` y regla de eliminación de duplicados basada en la columna `Teléfono`.
* Programado con refresco automático en segundo plano en intervalos de $X$ minutos y al abrir el libro.



### 3.3 Limitaciones Técnicas Identificadas en el MVP

* **Riesgo de Corrupción por Concurrencia**: Si un asesor mantiene su archivo de Excel abierto mientras el RPA o Power Query intenta escribir/leer, se generan bloqueos de archivo (*file locks*) produciendo excepciones no controladas.
* **Sobrecarga de I/O**: Apertura y cierre síncrono de procesos de Excel por cada fila iterada en el bucle del RPA, generando tiempos de procesamiento desproporcionados (demoras de varios minutos para lotes pequeños).
* **Acoplamiento de Interfaz y Datos**: La lectura basada en números de filas/columnas absolutos (`FilaActual - 5`, `Columna 9`) provoca que cualquier inserción de columna manual por parte de un usuario invalide el código del RPA o corrompa los encabezados.



---

## 4. ANÁLISIS COMPARATIVO DE BRECHAS TÉCNICAS (GAP ANALYSIS)

| Módulo / Componente Técnico | Requerimiento del Sistema Ideal (Especificación Cliente) | Implementación Actual en el MVP (Qué existe y cómo funciona) | Brecha Técnica Absoluta (Qué falta exactamente por programar e integrar) |
| --- | --- | --- | --- |
| **Arquitectura de Persistencia** | Base de datos relacional centralizada (PostgreSQL/MySQL) con esquema normalizado (3NF) e índices optimizados. | Archivos distribuidos Excel (`.xlsx`) en sistema de archivos local/OneDrive. | Diseñar e implementar DDL de tablas (`leads`, `users`, `campaigns`, `audit_logs`). Migrar datos históricos desde los libros Excel a la BD relacional. |
| **Ingesta de Leads** | API REST / Webhooks expuestos con soporte para cargas JSON en tiempo real y validación mediante esquemas DTO. | Lectura manual o por rango fijo mediante acción "Leer Excel" en Power Automate.

 | Desarrollar controladores API (`POST /api/v1/leads`), middleware de validación de campos, e integración con Webhooks de Meta/WhatsApp. |
| **Algoritmo de Asignación** | Motor de reglas backend (Round-Robin, carga ponderada) multitarea y no bloqueante. | Bucle `For Each` secuencial en RPA con aperturas/cierres síncronos de aplicaciones Excel. | Programar servicio de asignación asíncrono (ej. utilizando Celery/RabbitMQ o colas de fondo) eliminado por completo el uso de RPA escritorio. |
| **Consolidación de Datos** | Vista materializada o consultas agregadas SQL en tiempo real con latencia < 100ms. | Extracción ETL mediante Power Query que combina archivos `.xlsx` de una carpeta. | Reemplazar las consultas Power Query por vistas SQL indexadas y endpoints de analítica (`GET /api/v1/analytics/consolidated`). |
| **Control de Acceso (RBAC)** | Autenticación JWT con roles finos (`Gerente`, `Asesor`, `Recepción`) y filtrado a nivel de fila (*Row-Level Security*). | Ninguno. Acceso mediante carpetas compartidas del sistema operativo o archivos locales aislados. | Implementar módulo de autenticación (OAuth2/JWT), hashing de contraseñas y middleware de autorización para filtrar datos según el ID del usuario en sesión. |
| **Interfaz de Usuario (Frontend)** | SPA Web Dashboard moderna, responsiva, interactiva (React/Vue/Angular) con soporte WebSockets para tiempo real. | Hoja de cálculo de Microsoft Excel con tablas formateadas visualmente en color gris y rojo.

 | Diseñar y programar interfaz de usuario web completa (vistas de administración, tableros Kanban/Tablas para asesores y dashboards gerenciales). |
| **Prevención de Duplicados** | Validación mediante constraints de base de datos (`UNIQUE(phone)`) e indexación B-Tree. | Filtro "Quitar duplicados" ejecutado manualmente o durante el refresco de Power Query en el campo `Teléfono`. | Implementar constraints a nivel de base de datos (`ALTER TABLE leads ADD CONSTRAINT unique_phone UNIQUE(phone)`) y manejo explícito de errores de duplicidad en la API. |
| **Trazabilidad y Auditoría** | Registro histórico inmutable de cada cambio de estado, edición de campos, fecha y usuario responsable. | Modificación directa sobre celdas sin conservación de estados anteriores o valores previos. | Crear la entidad `LeadAuditLog` y disparadores (*triggers*) o middleware de aplicación para auditar todas las operaciones de mutación (INSERT, UPDATE, DELETE). |

---

## 5. MATRIZ DE REQUERIMIENTOS NO FUNCIONALES (RNF)

### 5.1 Seguridad y Autenticación

* **RNF-SEC-01 (Cifrado en Transito y Reposo)**: Todas las comunicaciones cliente-servidor deben estar protegidas mediante protocolo TLS 1.3 (HTTPS). Los datos sensibles persistidos en la base de datos deben estar cifrados en reposo utilizando el algoritmo AES-256.
* **RNF-SEC-02 (Autenticación y Sesiones)**: La autenticación se basará en JSON Web Tokens (JWT) firmados mediante algoritmo RS256 (asimétrico). Los refresh tokens deben almacenarse en cookies HTTP-Only, Secure y SameSite=Strict para mitigar ataques XSS y CSRF.
* **RNF-SEC-03 (Control de Acceso basado en Roles - RBAC)**:
* `ROLE_ADMIN` / `ROLE_GERENTE`: Acceso total CRUD sobre todas las entidades y endpoints analíticos.
* `ROLE_RECEPTOR`: Acceso exclusivo para la ingesta y creación de leads.
* `ROLE_ASESOR`: Acceso restringido exclusivamente a los registros donde `lead.asesor_id == user.id`. La base de datos o el ORM debe aplicar *Row-Level Security* para evitar fugas de información.


* **RNF-SEC-04 (Sanitización e Inyecciones)**: El backend debe utilizar consultas preparadas (*Parameterized Queries* / ORM) de forma estricta para mitigar Inyecciones SQL. Los inputs de texto deben sanitizarse para prevenir ataques XSS almacenados.

### 5.2 Escalabilidad y Rendimiento

* **RNF-PER-01 (Tiempo de Respuesta de la API)**: El $95\%$ de las peticiones de lectura (`GET`) deben responder en un tiempo menor a **200 ms**. Las peticiones de escritura (`POST/PUT`) no deben superar los **500 ms**.
* **RNF-PER-02 (Concurrencia y Rendimiento)**: La arquitectura backend debe soportar un mínimo de **100 solicitudes simultáneas por segundo (RPS)** sin degradación de servicio ni pérdida de paquetes de datos.
* **RNF-PER-03 (Procesamiento Asíncrono)**: Las operaciones de envío de notificaciones o ingesta masiva de leads deben procesarse en segundo plano mediante un broker de mensajería (ej. Redis Pub/Sub, RabbitMQ), liberando el hilo principal HTTP de forma inmediata (< 50 ms).

### 5.3 Disponibilidad, Tolerancia a Fallos y Respaldos

* **RNF-DIS-01 (SLA de Disponibilidad)**: El sistema debe garantizar una disponibilidad del **99.9%** en horario operativo comercial (24/7 con ventanas de mantenimiento programadas fuera de horas pico).
* **RNF-DIS-02 (Estrategia de Copias de Seguridad - Backups)**:
* Backups automatizados diarios de la base de datos relacional con retención de 30 días.
* *Point-in-Time Recovery* (PITR) habilitado para permitir la restauración de la base de datos a cualquier segundo específico de los últimos 7 días.


* **RNF-DIS-03 (Manejo de Excepciones y Resiliencia)**: Todo fallo no controlado en el backend debe ser capturado por un middleware global, retornando un objeto de error estandarizado RFC 7807 (*Problem Details for HTTP APIs*) y registrando el *stack trace* completo en un sistema centralizado de logs (ej. Sentry, Datadog).

### 5.4 Usabilidad, Diseño e Interfaces (UI/UX)

* **RNF-USA-01 (Diseño Responsivo y Multi-dispositivo)**: La interfaz web debe ser $100\%$ adaptativa (Responsive Design), garantizando una usabilidad óptima en pantallas de escritorio (1920x1080), laptops (1366x768) y dispositivos móviles/tablets (iOS/Android).
* **RNF-USA-02 (Fidelidad Visual e Identidad)**: La UI debe implementar un sistema de diseño (*Design System*) consistente con las pautas de estilo corporativo de la empresa:
* Paleta de colores primaria: Rojo Corporativo (hex `#C00000` / `#A60000`) para acentos y estados críticos, Gris Antracita / Oscuro (`#404040` / `#595959`) para barras de encabezado y contenedores neutros.


* Modos visuales de estado: Indicadores tipo Badge con código de colores claro para la temperatura del lead (Verde para Caliente, Amarillo para Tibio, Azul/Gris para Frío) y estados del pipeline.




* **RNF-USA-03 (Feedback Operativo)**: Toda acción de guardado, actualización o error debe proporcionar retroalimentación visual inmediata al usuario en un tiempo $< 100\text{ ms}$ mediante componentes Toast, Spinners de carga o Notificaciones flotantes, evitando la sensación de congelamiento de la interfaz.