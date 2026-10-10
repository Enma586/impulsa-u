# ImpulsaU — Backlog de construcción

> **Versión:** 1.0 · **Fecha:** 3 de octubre de 2026
> **Inicio del código:** lunes 5 de octubre · **Versión para la demo:** domingo 18 de octubre · **Congelamiento:** domingo 1 de noviembre · **Entrega:** viernes 6 de noviembre (tentativa)
> **Regla:** cada tarea de caso de uso incluye contrato, migración (si aplica), backend, frontend, pruebas y revisión en el preview. Se cierra solo cuando todos sus criterios de aceptación pasan.

---

## 1. Semanas

| Semana | Fechas | Meta |
|---|---|---|
| S1 | 5 – 11 oct | Repositorio, CI/CD funcionando de punta a punta, prueba del modelo de IA, autenticación, catálogos y perfiles base |
| S2 | 12 – 18 oct | Proyectos, feed, likes, búsqueda y vacantes básicas → **versión para la demo** |
| S3 | 19 – 25 oct | Agente de IA, interés mutuo, mensajería y postulaciones completas |
| S4 | 26 oct – 1 nov | Comentarios, notificaciones, avales, verificación de empresas, administración; P3 solo si hay margen |
| S5 | 2 – 6 nov | Congelamiento: corrección de errores, pruebas de carga, documentación y ensayo |

**Leyenda de áreas:** C = contratos · BD = base de datos · BE = backend · FE = frontend · IA = servicio de IA · E2E = pruebas · INF = infraestructura.

---

## 2. Tareas técnicas (habilitadoras)

| ID | Tarea | Áreas | Prioridad | Semana | Depende de |
|---|---|---|---|---|---|
| T-01 | Monorepo, configuración estricta de TypeScript y ESLint, dependency-cruiser | INF | P1 | S1 | — |
| T-02 | Docker Compose local (PostgreSQL con extensiones, Redis, almacenamiento) | INF | P1 | S1 | T-01 |
| T-03 | Conectar Vercel, Render, Koyeb y Hugging Face con un "hola mundo" de cada app | INF | P1 | S1 | T-01 |
| T-04 | Workflows: CI, deploy a dev, preview de backend, E2E del preview, liberar preview | INF | P1 | S1 | T-03 |
| T-05 | Workflows: origen del release, promoción a producción, mantener activo, respaldo semanal | INF | P1 | S1 | T-04 |
| T-06 | Rulesets de `develop` y `main`, CODEOWNERS y plantilla de PR | INF | P1 | S1 | T-01 |
| T-07 | **Prueba del modelo de IA** en Hugging Face (tiempos y acierto con el conjunto de preguntas) | IA | P1 | S1 | T-03, T-08 |
| T-08 | Conjunto de 30–50 preguntas de prueba del agente | IA | P1 | S1 | — |
| T-09 | Base de NestJS: `main-http`, `main-worker`, `main-todo`, configuración validada, logs, filtro de errores | BE | P1 | S1 | T-01 |
| T-10 | Guard de tokens de Supabase, guard de roles, interceptor de idempotencia, rate limit | BE | P1 | S1 | T-09 |
| T-11 | Migrador con candado y verificaciones de migraciones en CI | BD | P1 | S1 | T-01 |
| T-12 | `packages/ui`: tokens, temas oscuro y claro, tipografías, primitivas de layout | FE | P1 | S1 | T-01 |
| T-13 | `packages/ui`: componentes base (botón, campo, tarjeta, insignia, avatar, esqueleto, pestañas, modal) | FE | P1 | S1–S2 | T-12 |
| T-14 | Navegación por dispositivo (barra superior, riel lateral, barra inferior) y rutas | FE | P1 | S1 | T-13 |
| T-15 | API de semillas de prueba y modo simulado del agente | BE | P1 | S1–S2 | T-09 |
| T-16 | Paquete `apps/e2e` con fixtures por rol y de dos navegadores | E2E | P1 | S2 | T-15 |
| T-17 | Adaptador de almacenamiento (Supabase Storage, URLs prefirmadas) y procesamiento de imágenes en el worker | BE | P1 | S2 | T-09 |
| T-18 | Redis: script de likes, stream y sincronización por lotes | BE | P1 | S2 | T-09 |
| T-19 | Outbox y eventos de dominio | BE | P2 | S3 | T-09 |
| T-20 | Socket.IO con adaptador de Redis y autenticación en el handshake | BE | P1 | S3 | T-10 |
| T-21 | Datos de demostración con una historia coherente | BD | P1 | S4 | Todo P1 |
| T-22 | Pruebas de carga con k6 (20 usuarios simultáneos y picos) | E2E | P2 | S5 | Todo P1 |

---

## 3. Casos de uso

### S1 · Autenticación, catálogos y perfiles base

| ID | Caso de uso | Áreas | Prioridad | Depende de |
|---|---|---|---|---|
| B-01 | CU-01 Registrarse como Talento | C, BD, BE, FE, E2E | P1 | T-10 |
| B-02 | CU-02 Registrarse como Empresa | C, BE, FE | P1 | B-01 |
| B-03 | CU-04 Verificar correo | BE, FE, E2E | P1 | B-01 |
| B-04 | CU-05 Iniciar sesión | FE, E2E | P1 | B-01 |
| B-05 | CU-06 Cerrar sesión (este dispositivo y todos) | FE, E2E | P1 | B-04 |
| B-06 | CU-07 Renovar la sesión | FE | P1 | B-04 |
| B-07 | CU-57 Catálogos: habilidades, carreras, instituciones, dominios (lectura y seed) | C, BD, BE | P1 | T-11 |
| B-08 | CU-09 Editar perfil de talento | C, BD, BE, FE | P1 | B-07 |
| B-09 | CU-10 Editar perfil de empresa | C, BE, FE | P1 | B-02 |
| B-10 | CU-11 Ver perfil público (con trayectoria y evidencia) | C, BE, FE | P1 | B-08 |

### S2 · Proyectos, feed, búsqueda y vacantes (versión para la demo)

| ID | Caso de uso | Áreas | Prioridad | Depende de |
|---|---|---|---|---|
| B-11 | CU-17 Publicar proyecto (con subida de imágenes) | C, BD, BE, FE, E2E | P1 | T-17, B-08 |
| B-12 | CU-18 Editar o eliminar proyecto (con bloqueo optimista) | C, BE, FE, E2E | P1 | B-11 |
| B-13 | CU-19 Ver detalle de proyecto | C, BE, FE | P1 | B-11 |
| B-14 | CU-20 Explorar feed (paginación por cursor, esqueletos) | C, BE, FE | P1 | B-11 |
| B-15 | CU-22 Dar y quitar like | C, BE, FE, E2E | P1 | T-18, B-14 |
| B-16 | Evidencia de habilidades (recalcular `evidencia_habilidades`) | BD, BE | P1 | B-11 |
| B-17 | Embeddings de proyectos, perfiles y vacantes | BE, IA | P1 | T-07, B-11 |
| B-18 | CU-12 Buscar talentos con filtros y búsqueda semántica | C, BE, FE | P1 | B-16, B-17 |
| B-19 | CU-40 Publicar vacante de entrada | C, BD, BE, FE | P1 | B-09 |
| B-20 | CU-41 Editar, pausar o cerrar vacante | BE, FE | P1 | B-19 |
| B-21 | CU-42 Explorar y buscar vacantes (con coincidencia) | C, BE, FE | P1 | B-19, B-16 |

### S3 · Agente, conexión directa, mensajería y postulaciones

| ID | Caso de uso | Áreas | Prioridad | Depende de |
|---|---|---|---|---|
| B-22 | CU-36 Consultar al agente sobre su perfil (talento) | C, BE, IA, FE, E2E | P1 | T-07, B-16, B-21 |
| B-23 | CU-37 Buscar candidatos en lenguaje natural (empresa) | C, BE, IA, FE, E2E | P1 | B-18, B-22 |
| B-24 | CU-29 / CU-30 Mostrar interés (empresa y talento) | C, BD, BE, FE | P1 | B-10 |
| B-25 | CU-31 Aceptar o declinar interés (abre conversación única) | BE, FE, E2E | P1 | B-24 |
| B-26 | CU-32 Mensajes en tiempo real (secuencia e idempotencia) | C, BD, BE, FE, E2E | P1 | T-20, B-25 |
| B-27 | CU-33 Historial de conversación paginado | BE, FE | P1 | B-26 |
| B-28 | CU-43 Postularse adjuntando proyectos | C, BD, BE, FE, E2E | P1 | B-21 |
| B-29 | CU-44 Revisar postulaciones y cambiar estado (tablero) | C, BE, FE, E2E | P1 | B-28 |
| B-30 | CU-45 Seguimiento de mis postulaciones | BE, FE | P1 | B-28 |

### S4 · Completar P2 (y P3 si hay margen)

| ID | Caso de uso | Áreas | Prioridad | Depende de |
|---|---|---|---|---|
| B-31 | CU-08 Recuperar contraseña | FE, E2E | P2 | B-04 |
| B-32 | CU-03 Registrarse como Docente | C, BE, FE | P2 | B-07 |
| B-33 | CU-49 / CU-50 / CU-51 Solicitar, aprobar y revocar avales | C, BD, BE, FE, E2E | P2 | B-32, B-11 |
| B-34 | CU-23 / CU-24 Comentar, responder, editar y eliminar | C, BD, BE, FE | P2 | B-13 |
| B-35 | CU-47 / CU-48 Notificaciones en tiempo real y bandeja | C, BD, BE, FE | P2 | T-19, T-20 |
| B-36 | CU-34 Escribiendo y leído | BE, FE | P2 | B-26 |
| B-37 | CU-53 / CU-54 Verificación de empresas | C, BD, BE, FE | P2 | B-09 |
| B-38 | CU-25 / CU-55 Reportes y moderación | C, BD, BE, FE | P2 | B-14 |
| B-39 | CU-56 Suspender y reactivar cuentas | BE, FE | P2 | B-38 |
| B-40 | CU-13 Privacidad del perfil | BE, FE | P2 | B-08 |
| B-41 | CU-14 Indicador de perfil completo | FE | P2 | B-08 |
| B-42 | CU-15 Marcar primer empleo conseguido | BE, FE | P2 | B-08 |
| B-43 | CU-21 Colaboradores y contribuciones | C, BD, BE, FE | P2 | B-11 |
| B-44 | CU-38 / CU-39 Historial y calificación del agente | BE, FE | P2 | B-22 |
| B-45 | CU-35 Bloquear o reportar usuario | BE, FE | P2 | B-26 |
| B-46 | CU-26 / CU-27 / CU-28 Repostear y compartir | C, BD, BE, FE | P3 | B-14 |
| B-47 | CU-46 Retroalimentación obligatoria al descartar | BE, FE | P3 | B-29 |
| B-48 | CU-58 Listas de candidatos | C, BD, BE, FE | P3 | B-18 |
| B-49 | CU-16 Seguir a un talento o empresa | C, BD, BE, FE | P3 | B-10 |

### Fuera de esta entrega (trabajo futuro)

CU-52 Invitar docentes por correo · CU-59 Retos de empresas · Estadísticas de perfil · Video alojado en la plataforma · Ranking de populares.

---

## 4. Ruta crítica

`T-01 → T-09 → T-10 → B-01 → B-08 → B-11 → B-16 → B-18 → B-22 → B-23`

Cualquier retraso en esta cadena retrasa la demo del agente, que es el diferenciador de ImpulsaU. Si se atrasa, se protege la cadena moviendo personas desde tareas P2.

## 5. Definición de "terminado"

Una tarea está terminada cuando:

1. Su contrato está aprobado en `packages/contracts`.
2. Sus criterios de aceptación pasan en pruebas unitarias, de integración y E2E según corresponda.
3. El CI está en verde (tipos, lint, arquitectura, migraciones).
4. Alguien distinto a quien la hizo la probó en el preview y marcó la casilla en el PR.
5. Fue integrada en `develop` y desplegada en dev sin errores.

## 6. Cómo cargarlo en GitHub

Cada fila es un *issue* con el título `B-xx · CU-yy Nombre`, etiquetas de área (`area:backend`, `area:frontend`…), prioridad (`P1`, `P2`, `P3`) y semana (`S1`…`S5`), dentro de un **GitHub Project** con columnas: Por hacer, En progreso, En revisión (preview), Hecho. Los criterios de aceptación del caso de uso se pegan en la descripción del issue.

> Pendiente de completar cuando se conozca el equipo: asignar cada tarea a una persona y su agente.
