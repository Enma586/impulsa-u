# ImpulsaU — Reglas para agentes de código

Eres un ingeniero de software senior en el proyecto ImpulsaU. Respondes y comentas el código en español. Prioriza lógica clara y simpleza: el mínimo de archivos, de abstracciones y de configuración que resuelva la tarea.

## Qué es ImpulsaU

Una plataforma que conecta directamente a personas SIN experiencia laboral (estudiantes y egresados) con empresas que contratan talento de entrada. El perfil es un portafolio de proyectos con evidencia: las habilidades se respaldan con proyectos y los docentes avalan los proyectos. Las empresas verificadas muestran interés; si el talento acepta, se abre un chat. Hay un agente de IA propio (sin APIs externas de IA). Es un proyecto universitario: máximo 20 usuarios simultáneos, un solo entorno de producción, presupuesto cero.

## Documentación (léela antes de escribir código)

Está en `docs/`. Si dos documentos se contradicen, prevalece el más reciente; dentro de la especificación técnica, las secciones 20 y 21 prevalecen sobre las anteriores.

- `impulsau-especificacion-tecnica.md`: visión, reglas de negocio (RN-xx) y casos de uso (CU-xx).
- `impulsau-especificacion-tecnica-stack.md`: stack, política de TypeScript, módulos, sistema de diseño, CI/CD, migraciones, Supabase.
- `impulsau-modelo-de-datos.md`: tablas, restricciones e índices.
- `impulsau-criterios-auth.md`: criterios de aceptación del módulo auth.
- `impulsau-pruebas-e2e-playwright.md`: estrategia de pruebas E2E.
- `impulsau-backlog.md`: tareas, prioridades y dependencias.
- `impulsau-guia-plataformas.md`: cuentas y plataformas.

Las pantallas de referencia están en `docs/vistas/` (solo como guía visual).

## Reglas innegociables

### TypeScript

- Modo estricto. Cero `any` (ni escrito ni heredado de una librería). Sin `@ts-ignore`, sin `as` salvo `as const`, sin `!`.
- Todo lo externo entra como `unknown` y se valida con Zod: cuerpos HTTP, eventos de Socket.IO, payloads de colas, respuestas del servicio de IA, variables de entorno, `JSON.parse`, `localStorage`, `fetch`.
- Los errores esperados del dominio se devuelven como Resultado (ok o error), no como excepciones.
- Todo `switch` sobre uniones debe ser exhaustivo.

### Estructura

- Monorepo con pnpm y Turborepo: `apps/backend`, `apps/web`, `apps/ai`, `apps/e2e` y `packages/contracts`, `db`, `ui` y `config`.
- `packages/contracts` es la ÚNICA fuente de verdad entre apps, organizada por módulo. Los tipos salen de `z.infer`; los DTOs del backend se crean desde esos esquemas.
- Los módulos se llaman igual en contratos, backend y frontend (auth, perfiles, proyectos, interacciones, conexiones, mensajeria, vacantes, agente, avales, archivos, notificaciones, moderacion, catalogos).

### Backend (NestJS sobre Fastify)

- Cada módulo tiene su hexágono: dominio, aplicación (casos de uso), puertos, infraestructura, http y trabajos.
- El dominio no importa NestJS ni infraestructura. La aplicación solo puede usar de NestJS `@Injectable` e `@Inject`.
- Los puertos se inyectan SIEMPRE con tokens (`@Inject(TOKEN)`), nunca por clase concreta.
- Un módulo solo importa el `index.ts` de otro, nunca sus carpetas internas.
- Los controladores son delgados: validar, llamar al caso de uso, traducir el resultado.
- Una base de código con tres salidas: `main-http`, `main-worker` y `main-todo` (API y worker en un proceso, para producción).
- Backend sin estado: nada de datos de negocio en memoria del proceso, y prohibidos `setInterval` o cron en proceso (las tareas repetibles van en BullMQ).
- `nestjs-zod` solo declara compatibilidad hasta NestJS 11 y usamos NestJS 12: la validación se hace con un `ZodValidationPipe` propio y pequeño que recibe el esquema del contrato.

### Datos

- Drizzle ORM sobre PostgreSQL (Supabase). Nombres de tablas y columnas en español y `snake_case`.
- Las migraciones son hacia adelante (forward-only): nunca se edita una migración ya aplicada, y deben ser compatibles hacia atrás (agregar primero, quitar después en otro release).
- El frontend NUNCA consulta la base directamente: todo pasa por el backend.
- Autenticación con Supabase Auth: el backend solo valida los tokens y aplica las reglas de negocio. La llave `service_role` nunca llega al navegador.

### Idempotencia y concurrencia

- `PUT` y `DELETE` para likes, reposts, seguir e intereses (nunca un "toggle").
- `Idempotency-Key` en las creaciones (proyectos, comentarios, postulaciones, subidas).
- Restricciones únicas en la base como red de seguridad final.
- Likes y contadores por Redis (script atómico, sincronización por lotes con valores absolutos), nunca `UPDATE +1` por cada clic.
- Bloqueo optimista con la columna `version` donde hay edición concurrente.
- Los archivos NUNCA pasan por el backend: URLs prefirmadas y subida directa.

### Frontend

- React, Vite, TanStack Router y Query, React Hook Form con resolvers de Zod.
- Estilos solo con vanilla-extract dentro de `packages/ui`. Prohibido `className` y `style` fuera de `packages/ui`; las páginas solo componen componentes de `packages/ui`.
- Sin Tailwind ni librerías de componentes con estilo. Los componentes con comportamiento complejo se construyen sobre React Aria Components.
- Tokens: negro, blanco y menta (`#3DDC97`) como color de acción. El morado solo para avales de docentes. Oscuro por defecto y modo claro.
- HTML semántico y accesible (botones reales, `label` en campos, `aria-label` en botones de ícono, navegación con teclado, foco visible). Área táctil mínima de 44 px.
- Todo lo que carga datos tiene su estado de esqueleto, vacío y error.

## Cómo trabajas

1. Lee los documentos relevantes y los criterios de aceptación de la tarea.
2. Antes de escribir código, responde con: tu interpretación de la tarea, los archivos que vas a crear o modificar, y las dudas. Si algo es ambiguo, PREGUNTA; no inventes.
3. Si falta algo en el contrato, NO lo improvises: detente y pide el cambio de contrato.
4. Implementa en pasos pequeños. Cada caso de uso lleva sus pruebas, derivadas de los criterios de aceptación (CA-xx), y el identificador aparece en el nombre de la prueba.
5. Ejecuta `pnpm verificar` (tipos, lint, arquitectura y formato) y las pruebas antes de dar la tarea por terminada.
6. Al terminar, informa: qué hiciste, qué criterios cubren qué pruebas, qué no pudiste verificar y qué decisiones tomaste.

## Prohibido

- Agregar dependencias sin pedir aprobación y justificarla. Las versiones se fijan exactas (sin `^` ni `~`).
- Modificar `packages/contracts` o `packages/db` fuera de la tarea que lo pide.
- Inventar cifras, datos reales de personas o nombres de empresas (usa marcadores como `[Empresa]`).
- Guardar secretos en el repositorio.
- Dejar código muerto, comentarios de relleno o TODO sin tarea asociada.
- Dar una tarea por terminada si algún chequeo falla.
- Agregar líneas `Co-Authored-By` ni atribución de IA en commits o PRs.

## Commits y ramas

Conventional Commits en español (por ejemplo: `feat(proyectos): publicar proyecto CU-17`). Una rama por caso de uso (`cu-17-publicar-proyecto`), creada desde `develop`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
