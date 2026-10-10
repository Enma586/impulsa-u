# ImpulsaU — Especificación técnica del stack

> **Versión:** 2.1 (fase 0) — Sin Azure: Supabase (base, archivos y autenticación) para una carga máxima de 20 usuarios simultáneos
> **Fecha:** 29 de septiembre de 2026
> **Complementa a:** `impulsau-especificacion-tecnica.md` (visión, casos de uso, arquitectura general).
> **Reemplaza en ese documento:** la IA en Python (ahora TypeScript), el ORM y el framework "por confirmar" (ahora Drizzle y NestJS sobre Fastify), la separación API/worker (ahora una app con dos salidas) y la paleta anterior (ahora negro, blanco y menta).


> **⚠ Cambios de la versión 2.0 (1 oct 2026).** La sección **20** prevalece sobre todo lo que contradiga en este documento:
> - **Azure queda descartado.** Las subsecciones 19.3 a 19.14 y 19.19 que mencionan la VM, Azure PostgreSQL, Caddy o dos réplicas quedan como referencia para escalar en el futuro, no como plan actual.
> - **Supabase** aporta PostgreSQL, almacenamiento de archivos y **autenticación** (con sus correos), en dos proyectos: producción y dev.
> - La autenticación propia (Argon2, emisión de JWT, refresh tokens en Redis, tokens de correo) **se elimina**: el backend solo valida los tokens de Supabase.
> - Carga objetivo: **máximo 20 usuarios simultáneos**, por lo que producción corre en **una sola instancia**.

---

## Índice

1. [Principios](#1-principios)
2. [Stack decidido](#2-stack-decidido)
3. [Política de TypeScript estricto (cero `any`)](#3-política-de-typescript-estricto-cero-any)
4. [Monorepo y herramientas](#4-monorepo-y-herramientas)
5. [Paquete de contratos](#5-paquete-de-contratos)
6. [Backend (NestJS): una base de código, dos salidas](#6-backend-nestjs-una-base-de-código-dos-salidas)
7. [Base de datos](#7-base-de-datos)
8. [Redis y colas](#8-redis-y-colas)
9. [Servicio de IA en TypeScript](#9-servicio-de-ia-en-typescript)
10. [Frontend](#10-frontend)
11. [Sistema de diseño](#11-sistema-de-diseño)
12. [Seguridad](#12-seguridad)
13. [Pruebas](#13-pruebas)
14. [CI y calidad](#14-ci-y-calidad)
15. [Configuración y entornos](#15-configuración-y-entornos)
16. [Convenciones](#16-convenciones)
17. [Reglas para agentes de desarrollo](#17-reglas-para-agentes-de-desarrollo)
18. [Pendientes técnicos](#18-pendientes-técnicos)
19. [Despliegue, entornos y CI/CD](#19-despliegue-entornos-y-cicd)
20. [Versión 2.0: Supabase y despliegue sin Azure](#20-versión-20-supabase-y-despliegue-sin-azure)
21. [Ajustes del esqueleto del repositorio](#21-ajustes-del-esqueleto-del-repositorio)

---

## 1. Principios

| Principio | En la práctica |
|---|---|
| **Todo TypeScript** | Frontend, API, worker y servicio de IA en TS. Un solo lenguaje, un solo linter, un solo CI. |
| **Cero `any`** | Ni escrito ni heredado de librerías. Todo lo externo entra como `unknown` y se valida con Zod. |
| **Contratos primero** | Ningún endpoint, evento o job existe sin su esquema en `packages/contracts`. |
| **Módulos con hexágono interno** | Cada módulo (auth, proyectos…) tiene su dominio, aplicación, puertos e infraestructura. El dominio no conoce NestJS, Drizzle ni Redis. Se verifica en CI. |
| **Idempotente por diseño** | `PUT`/`DELETE` en vez de toggles, `Idempotency-Key`, restricciones únicas, `jobId` deterministas. |
| **Sistema de diseño propio** | Sin Tailwind, sin MUI, sin clases sueltas. Estilos solo dentro de `packages/ui`. |
| **Costo cero** | Todo corre en planes gratuitos; solo se paga el dominio. |

---

## 2. Stack decidido

| Capa | Tecnología | Motivo |
|---|---|---|
| Lenguaje | TypeScript en modo estricto | Tipos compartidos de punta a punta |
| Gestor de paquetes | pnpm (workspaces) | Rápido, estricto con dependencias fantasma |
| Orquestación del monorepo | Turborepo | Caché de builds y tareas por paquete |
| Runtime | Node.js LTS | Requerido por NestJS, BullMQ y node-llama-cpp |
| Framework backend | **NestJS** con **adaptador de Fastify** (`@nestjs/platform-fastify`) | Módulos, inyección de dependencias con decoradores, guards, interceptores, filtros |
| Build del backend | Nest CLI con **SWC** y verificación de tipos con `tsc --noEmit` | Soporta metadata de decoradores y compila rápido |
| Validación en backend | **nestjs-zod** (`createZodDto` + `ZodValidationPipe`) | DTOs generados desde los esquemas Zod del contrato |
| Tiempo real | `@nestjs/websockets` + `@nestjs/platform-socket.io` + adaptador de Redis | Gateways con decoradores, salas, reconexión |
| Colas | **`@nestjs/bullmq`** (BullMQ) | Procesadores con decoradores; solo se registran en la salida worker |
| Configuración | `@nestjs/config` con validación Zod | El proceso no arranca con variables inválidas |
| Logs | `nestjs-pino` | Logs estructurados con id de petición |
| Validación y contratos | **Zod** | Una sola fuente para tipos, validación y OpenAPI |
| ORM / consultas | **Drizzle ORM** + `drizzle-kit` | Control de SQL, `ON CONFLICT`, bloqueos, pgvector |
| Base de datos | PostgreSQL + pgvector | Datos y embeddings en un solo lugar |
| Caché y contadores | Redis (ioredis) | Contadores, rate limit, idempotencia, sesiones |
| IA: servidor | NestJS (app `apps/ai`, misma base que el backend) | Mismo lenguaje, mismas convenciones |
| IA: LLM | **node-llama-cpp** (modelo GGUF cuantizado) | Salida forzada por esquema JSON |
| IA: embeddings | **Transformers.js** (`@huggingface/transformers`) | Embeddings multilingües en CPU |
| Frontend | React + Vite (SPA) | Ya decidido |
| Rutas | **TanStack Router** | Rutas y parámetros tipados |
| Datos del servidor | **TanStack Query** | Caché, reintentos, UI optimista |
| Formularios | React Hook Form + `@hookform/resolvers/zod` | Reutiliza esquemas del contrato |
| Estilos | **vanilla-extract** (`css`, `recipes`) | Estilos en TS, tema tipado, sin runtime |
| Componentes accesibles | **React Aria Components** (headless) | Accesibilidad sin estilo impuesto |
| Subida de archivos | Uppy (plugin S3 multiparte) | Partes, reintentos, reanudación |
| Autenticación | `@nestjs/jwt` / `jose` + Argon2 (`@node-rs/argon2`) | Estándar y sin dependencias nativas pesadas |
| Pruebas | Vitest (o Jest) + `@nestjs/testing` + Testing Library + Playwright | Unitarias, integración, componentes y extremo a extremo |
| Carga | k6 | Pruebas de concurrencia y rendimiento |

**Versiones:** se fijan exactas (sin `^` ni `~`) en la semana 1 y se actualizan solo de forma deliberada.

---

## 3. Política de TypeScript estricto (cero `any`)

### 3.1 `tsconfig.base.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "skipLibCheck": true
  }
}
```

El backend y `apps/ai` extienden esta base y agregan lo que NestJS necesita:

```jsonc
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

El frontend y los paquetes compartidos usan `"module": "ESNext"`, `"moduleResolution": "Bundler"` y **no** activan decoradores.

### 3.2 Reglas de ESLint (typescript-eslint, preset `strict-type-checked`)

| Regla | Nivel | Por qué |
|---|---|---|
| `@typescript-eslint/no-explicit-any` | error | Prohíbe escribir `any` |
| `@typescript-eslint/no-unsafe-assignment` / `-member-access` / `-call` / `-return` / `-argument` | error | Detecta el `any` que llega de librerías o `JSON.parse` |
| `@typescript-eslint/ban-ts-comment` | error (sin excepciones) | Prohíbe `@ts-ignore` y `@ts-nocheck`; `@ts-expect-error` solo con descripción |
| `@typescript-eslint/consistent-type-assertions` | error, `assertionStyle: "never"` salvo `as const` | Las aserciones `as` esconden errores |
| `@typescript-eslint/no-non-null-assertion` | error | Prohíbe `!` |
| `@typescript-eslint/switch-exhaustiveness-check` | error | Todo `switch` sobre uniones debe ser exhaustivo |
| `@typescript-eslint/no-floating-promises` | error | Toda promesa se espera o se maneja |
| `react/forbid-dom-props` y `react/forbid-component-props` (`className`, `style`) | error fuera de `packages/ui` | Cero clases sueltas |

### 3.3 Fronteras: todo entra como `unknown`

| Frontera | Cómo se tipa |
|---|---|
| Cuerpo, parámetros y query HTTP | DTOs de `nestjs-zod` creados desde el contrato + `ZodValidationPipe` global |
| Eventos de Socket.IO entrantes | Pipe Zod en cada `@SubscribeMessage` |
| Payloads de BullMQ | Validación Zod al inicio de cada procesador |
| Respuestas del servicio de IA | Validación Zod en el adaptador `ModeloIA` |
| Salida del LLM | Gramática por esquema JSON + validación Zod posterior |
| Variables de entorno | `ConfigModule` con función `validate` basada en Zod |
| `JSON.parse`, `localStorage`, `fetch` | Envoltorios que devuelven `unknown` y se validan |
| Errores en `catch` | `unknown`; se estrechan con `instanceof` o guardas |

### 3.4 Puntos de NestJS donde puede colarse `any`

| Punto | Regla |
|---|---|
| `ExecutionContext.switchToHttp().getRequest()` | Siempre con tipo explícito (`getRequest<SolicitudAutenticada>()`) y solo dentro de guards e interceptores de `compartido/` |
| `createParamDecorator` | El dato llega como `unknown` y se valida antes de devolverlo |
| Metadata con `Reflector` | Usar `Reflector.createDecorator<T>()` para decoradores tipados |
| Cuerpo crudo en `@Body()` | Prohibido sin DTO de Zod |
| Payload en `@MessageBody()` | Prohibido sin pipe de Zod |

Si una librería expone `any`, se encapsula en un **adaptador tipado** y el resto del código solo ve la interfaz propia.

### 3.5 Errores del dominio

Los casos de uso no lanzan excepciones para errores esperados: devuelven `Resultado<T, ErrorDominio>` (unión discriminada `{ ok: true, valor } | { ok: false, error }`). El controlador traduce cada `ErrorDominio` a su excepción HTTP con un `switch` exhaustivo; un filtro de excepciones global produce el formato de error del contrato.

---

## 4. Monorepo y herramientas

```
impulsau/
├── apps/
│   ├── backend/          # NestJS: una base de código, dos salidas (HTTP y worker)
│   ├── web/              # React + Vite (SPA), módulos espejo del backend
│   └── ai/               # Servicio de IA (NestJS + node-llama-cpp + Transformers.js)
├── packages/
│   ├── contracts/        # Zod por módulo: REST, WebSocket, jobs, eventos, servicio IA
│   ├── db/               # Esquema Drizzle, migraciones, seeds
│   ├── ui/               # Sistema de diseño: tokens, tema, componentes
│   └── config/           # tsconfig, ESLint y Prettier compartidos
├── infra/
│   └── docker-compose.yml   # Postgres+pgvector, Redis, MinIO
├── turbo.json
└── pnpm-workspace.yaml
```

| Herramienta | Uso |
|---|---|
| Prettier | Formato único |
| ESLint (flat config) | Reglas de la sección 3 y de arquitectura |
| dependency-cruiser | Reglas hexagonales y entre módulos (sección 6.3) |
| Husky + lint-staged | Lint y formato antes de cada commit |

---

## 5. Paquete de contratos

`packages/contracts` es la **única fuente de verdad** entre apps y se organiza con **los mismos módulos** que el backend y el frontend.

```
packages/contracts/src/
├── comun/            # Paginación por cursor, errores, ids, fechas
├── auth/             # rest.ts, eventos.ts
├── perfiles/
├── proyectos/        # rest.ts, jobs.ts, eventos.ts
├── interacciones/
├── conexiones/
├── mensajeria/       # rest.ts, ws.ts
├── vacantes/
├── agente/           # rest.ts, ws.ts, ia.ts (intenciones)
├── avales/
├── archivos/
├── notificaciones/   # rest.ts, ws.ts
├── moderacion/
└── catalogos/
```

**Reglas:**

- Cada esquema exporta su tipo con `z.infer`; nadie escribe interfaces duplicadas a mano.
- En el backend, los DTOs se crean con `createZodDto(esquema)`: la clase existe para NestJS, pero su forma viene del contrato.
- IDs con tipos de marca (`z.string().uuid().brand<"ProyectoId">()`).
- Fechas como strings ISO en el contrato; se convierten a `Date` en los bordes.
- Errores con formato único: `{ code, message, details? }`, con `code` como unión literal.
- La especificación OpenAPI se genera desde los esquemas Zod.
- Cambios incompatibles requieren aprobación de la persona arquitecta.

---

## 6. Backend (NestJS): una base de código, dos salidas

### 6.1 Estructura por módulos

```
apps/backend/src/
├── modulos/
│   ├── auth/
│   │   ├── dominio/              # Entidades, value objects, errores, eventos (TypeScript puro)
│   │   ├── aplicacion/           # Casos de uso: registrarse.ts, iniciar-sesion.ts…
│   │   ├── puertos/              # Interfaces + tokens de inyección
│   │   ├── infraestructura/      # Adaptadores: Drizzle, Argon2, JWT…
│   │   ├── http/                 # auth.controller.ts, DTOs
│   │   ├── trabajos/             # Procesadores de BullMQ (si el módulo tiene jobs)
│   │   ├── auth.module.ts        # Módulo base: casos de uso y adaptadores
│   │   ├── auth.http.module.ts   # Importa el base + controladores y gateways
│   │   ├── auth.worker.module.ts # Importa el base + procesadores
│   │   └── index.ts              # API pública del módulo
│   ├── perfiles/  proyectos/  interacciones/  conexiones/  mensajeria/
│   ├── vacantes/  agente/  avales/  archivos/  notificaciones/
│   └── moderacion/  catalogos/
├── compartido/
│   ├── dominio/                  # Resultado, ErrorDominio, EventoDominio
│   ├── infraestructura/          # Módulos globales: base de datos, Redis, colas, logger, config
│   └── http/                     # Guards (auth, roles), interceptores (idempotencia), filtro de errores
├── app.http.module.ts            # Une los *.http.module de todos los módulos
├── app.worker.module.ts          # Une los *.worker.module de todos los módulos
├── main-http.ts                  # Salida 1: API REST + WebSocket
└── main-worker.ts                # Salida 2: procesadores de colas
```

### 6.2 Las dos salidas

| Salida | Arranque | Registra | Escala |
|---|---|---|---|
| **HTTP** (`main-http.ts`) | `NestFactory.create(AppHttpModule, new FastifyAdapter())` | Controladores, gateways de Socket.IO, guards, interceptores; puede **encolar** jobs | Por tráfico web |
| **Worker** (`main-worker.ts`) | `NestFactory.createApplicationContext(AppWorkerModule)` | Procesadores de BullMQ y tareas repetibles; sin servidor HTTP | Por volumen de jobs |

Ambas comparten los mismos módulos base (dominio, casos de uso, adaptadores), así que una regla de negocio existe en un solo lugar. Se despliegan como **dos procesos** del mismo build; si el plan gratuito solo permite un servicio, pueden correr juntos en un mismo contenedor durante el MVP.

### 6.3 Reglas de dependencias

| Capa | Puede importar | No puede importar |
|---|---|---|
| `dominio/` | Solo `compartido/dominio` | NestJS, Drizzle, Redis, Zod de infraestructura, otros módulos |
| `aplicacion/` | `dominio/`, `puertos/`, y de NestJS **solo** `@Injectable` e `@Inject` | Adaptadores, Drizzle, Redis, Fastify |
| `infraestructura/` | Todo lo anterior + librerías externas | `http/` |
| `http/` | `aplicacion/`, contratos, `compartido/http` | `infraestructura/` directamente |
| Otro módulo | Solo su `index.ts` | Sus carpetas internas |

La comunicación entre módulos es por la API pública (`index.ts`) o por eventos de dominio. dependency-cruiser verifica todas estas reglas en CI.

### 6.4 Inyección de dependencias

Los puertos son interfaces (desaparecen al compilar), así que **siempre** se inyectan con tokens explícitos:

```ts
// modulos/auth/puertos/repositorio-usuarios.ts
export const REPOSITORIO_USUARIOS = Symbol('RepositorioUsuarios');
export interface RepositorioUsuarios {
  buscarPorCorreo(correo: Correo): Promise<Usuario | null>;
  guardar(usuario: Usuario): Promise<void>;
}

// modulos/auth/aplicacion/iniciar-sesion.ts
@Injectable()
export class IniciarSesion {
  constructor(
    @Inject(REPOSITORIO_USUARIOS) private readonly usuarios: RepositorioUsuarios,
    @Inject(SERVICIO_HASH) private readonly hash: ServicioHash,
    @Inject(SERVICIO_TOKENS) private readonly tokens: ServicioTokens,
  ) {}

  async ejecutar(entrada: EntradaIniciarSesion): Promise<Resultado<Sesion, ErrorAuth>> { /* … */ }
}

// modulos/auth/auth.module.ts
@Module({
  providers: [
    IniciarSesion, Registrarse, CerrarSesion,
    { provide: REPOSITORIO_USUARIOS, useClass: DrizzleRepositorioUsuarios },
    { provide: SERVICIO_HASH, useClass: Argon2Hash },
    { provide: SERVICIO_TOKENS, useClass: JoseTokens },
  ],
  exports: [IniciarSesion, Registrarse, CerrarSesion],
})
export class AuthModule {}
```

En pruebas, cambiar un adaptador es tan simple como `overrideProvider(REPOSITORIO_USUARIOS).useValue(simulado)` con `@nestjs/testing`.

### 6.5 Piezas transversales (`compartido/http`)

| Pieza | Responsabilidad |
|---|---|
| `JwtGuard` | Autenticación en rutas y en el handshake del socket |
| `RolesGuard` + decorador `@Roles()` tipado | Permisos por rol (talento, empresa, docente, admin) |
| `IdempotenciaInterceptor` | `Idempotency-Key` con Redis (`SET NX`, 24 h) |
| `LimiteTasaGuard` | Rate limiting con script Lua en Redis |
| `FiltroErrores` | Formato único `{ code, message, details }` |
| `ZodValidationPipe` global | Validación de todos los DTOs |

### 6.6 Controladores delgados

Un controlador solo: recibe el DTO validado, llama al caso de uso, traduce el `Resultado` a respuesta o excepción. Ninguna regla de negocio vive en `http/`.

### 6.7 Tiempo real

- `@WebSocketGateway` por módulo que lo necesite (`mensajeria`, `notificaciones`, `agente`).
- Adaptador de Socket.IO personalizado con el adaptador de Redis desde el inicio.
- Autenticación en el handshake con el mismo `JwtGuard`.
- Salas `user:{id}` y `conversation:{id}`; acknowledgments tipados según el contrato.
- El worker emite eventos a usuarios a través del emisor de Redis de Socket.IO, sin servidor HTTP propio.

---

## 7. Base de datos

| Aspecto | Decisión |
|---|---|
| Esquema | Drizzle en `packages/db/src/esquema/`, un archivo por agregado |
| Migraciones | `drizzle-kit generate`; revisadas a mano; nunca se editan una vez aplicadas |
| Nombres | Tablas y columnas en `snake_case` y español (`proyectos`, `creado_en`) |
| IDs | UUID v7 (ordenables por tiempo) generados en la aplicación |
| Fechas | `timestamptz` siempre |
| Borrado | Lógico (`eliminado_en`) en proyectos, comentarios y perfiles; físico en likes y sesiones |
| Bloqueo optimista | Columna `version` en proyectos, postulaciones y perfiles |
| Vectores | `vector(384)` de pgvector con índice HNSW |
| Búsqueda de texto | Extensión `pg_trgm` con índices GIN |
| Conexión | Pool pequeño por proceso; cadena con pooling para la app, directa para migraciones |
| Seeds | Idempotentes (`ON CONFLICT DO NOTHING/UPDATE`): catálogos y datos de demostración |

El detalle de entidades, restricciones e índices va en el documento de modelo de datos (siguiente entregable de la fase 0).

---

## 8. Redis y colas

| Uso | Implementación |
|---|---|
| Likes y contadores | Scripts Lua atómicos + Stream + sincronización por lotes (valores absolutos) |
| Idempotencia | `SET NX` con expiración de 24 h |
| Rate limiting | Script Lua de ventana deslizante |
| Sesiones | Refresh tokens revocables |
| Caché | Lecturas con expiración corta y candado contra estampida |
| Socket.IO | Adaptador de Redis |

| Cola | Concurrencia | Notas |
|---|---|---|
| `embeddings` | 2 | `jobId` por entidad y versión de contenido |
| `agente` | 1 | Límite de tamaño; si se llena, la API responde `429` |
| `notificaciones` | 4 | Deduplicación por id de evento |
| `archivos` | 2 | Tipo real, miniaturas, limpieza de EXIF |
| `reacciones-sync` | 1 | Repetible cada 10 s |
| `outbox` | 1 | Repetible cada 2 s, `FOR UPDATE SKIP LOCKED` |
| `limpieza` | 1 | Repetible cada hora |

Los nombres de colas y sus payloads viven en el `jobs.ts` de cada módulo en `packages/contracts`. Los procesadores se declaran con `@Processor` dentro del módulo dueño y solo se registran en la salida worker.

---

## 9. Servicio de IA en TypeScript

### 9.1 Diseño

- App separada (`apps/ai`) con NestJS: cargar un modelo ocupa mucha RAM y CPU, y no debe competir con la API.
- Sin estado y sin acceso a la base de datos.
- Protegido con token de servicio.
- Desplegable en Hugging Face Spaces (Docker, CPU).

### 9.2 Endpoints

| Ruta | Entrada | Salida | Tecnología |
|---|---|---|---|
| `POST /v1/embed` | textos | vectores de 384 dimensiones | Transformers.js |
| `POST /v1/parse` | pregunta, rol | intención estructurada | node-llama-cpp con gramática por esquema |
| `POST /v1/generate` | intención, rol, datos | respuesta redactada | node-llama-cpp (o plantillas como plan B) |
| `GET /health` | — | estado y modelos cargados | — |

### 9.3 Intenciones con esquema forzado

El esquema de intenciones se define una vez en `packages/contracts/src/ia` con Zod, se convierte a JSON Schema para la gramática de node-llama-cpp y se usa también para validar la salida. Así el modelo **no puede** devolver una intención o un filtro que no exista.

### 9.4 Modelos (a confirmar en la prueba de la semana 1)

| Uso | Candidato | Criterio de aceptación |
|---|---|---|
| Embeddings | Modelo multilingüe pequeño (p. ej. familia e5-small) | < 300 ms por texto corto en CPU |
| LLM | Modelo instruct de 1.5B–3B en GGUF Q4 | Interpretación correcta en ≥ 85 % de las preguntas de prueba; respuesta completa en ≤ 30 s |

---

## 10. Frontend

### 10.1 Estructura (espejo de los módulos del backend)

```
apps/web/src/
├── modulos/
│   ├── auth/
│   │   ├── api/          # Consultas y mutaciones de TanStack Query con el cliente tipado
│   │   ├── componentes/  # Composición con componentes de packages/ui (sin estilos propios)
│   │   ├── pantallas/    # IniciarSesion.tsx, Registro.tsx
│   │   └── rutas.tsx     # Rutas del módulo
│   ├── perfiles/  proyectos/  interacciones/  conexiones/  mensajeria/
│   ├── vacantes/  agente/  avales/  archivos/  notificaciones/
│   └── moderacion/  catalogos/
├── compartido/           # Cliente HTTP tipado, socket, sesión, tema
├── rutas.tsx             # Une las rutas de todos los módulos
└── main.tsx
```

Un caso de uso como "publicar proyecto" vive en carpetas con el mismo nombre en tres lugares: `packages/contracts/src/proyectos`, `apps/backend/src/modulos/proyectos` y `apps/web/src/modulos/proyectos`.

### 10.2 Decisiones

| Tema | Decisión |
|---|---|
| Rutas | TanStack Router con parámetros y búsqueda validados por Zod |
| Datos | TanStack Query; claves de consulta tipadas por módulo |
| UI optimista | Likes, reposts, seguir y mensajes |
| Formularios | React Hook Form + resolver de Zod con los esquemas del contrato |
| Estado global | Mínimo: sesión y tema. Sin Redux ni librerías de estado global |
| Tiempo real | Un único socket compartido; los eventos actualizan la caché de TanStack Query |
| Sesión | Renovación única compartida entre peticiones concurrentes |
| Tema | Oscuro por defecto; respeta la preferencia del sistema; interruptor manual guardado |

### 10.3 Puntos de quiebre

| Nombre | Rango | Navegación |
|---|---|---|
| Celular | < 768 px | Barra inferior con 5 destinos; publicar al centro |
| Tablet | 768–1199 px | Riel lateral con íconos y etiquetas |
| Escritorio | ≥ 1200 px | Barra superior con enlaces |

---

## 11. Sistema de diseño

### 11.1 Identidad

Dirección visual **Trayectoria**: negro y blanco como base, **menta** como color de marca y de acción, morado reservado **solo** para avales docentes.

**Motivos propios** (se implementan como componentes, no como estilos sueltos):

| Motivo | Uso |
|---|---|
| Línea de trayectoria | Perfil, panel lateral, verificación de empresa, pasos de formularios |
| Medidor de evidencia segmentado | Habilidades demostradas, coincidencias con vacantes |
| Esquina cortada | Tarjetas de proyecto y bloques destacados |
| Tipografía monoespaciada en datos | Etiquetas, tecnologías, fechas, estados |
| Sello de aval | Proyectos avalados |

### 11.2 Tipografía

| Rol | Familia | Uso |
|---|---|---|
| Display | Bricolage Grotesque (600, 700) | Títulos |
| Texto | Figtree (400–700) | Cuerpo, botones, formularios |
| Datos | JetBrains Mono (400, 500, 700) | Etiquetas en mayúsculas, métricas, metadatos |

Escala: 10, 11, 12, 13, 14, 15, 16, 18, 22, 28, 34, 40, 56, 64 px. Cuerpo mínimo de 15 px en pantalla.

### 11.3 Tokens de color

| Token semántico | Oscuro (por defecto) | Claro |
|---|---|---|
| `fondo` | #0A0A0A | #FFFFFF |
| `superficie` | #151515 | #F4F4F4 |
| `superficieElevada` | #1F1F1F | #EAEAEA |
| `borde` | #2B2B2B | #DEDEDE |
| `texto` | #F5F5F5 | #0A0A0A |
| `textoSecundario` | #A3A3A3 | #5C5C5C |
| `accion.fondo` | #3DDC97 | #3DDC97 |
| `accion.texto` | #0F2A1F | #0F2A1F |
| `acento.texto` (menta como texto) | #7BE5B4 | #0D7A4F |
| `logro.fondo` / `logro.texto` | rgba(61,220,151,0.14) / #7BE5B4 | #D8F7E8 / #0D7A4F |
| `aval` | #B09FDC | #5B3FB0 |
| `advertencia.fondo` / `advertencia.texto` | rgba(255,196,107,0.14) / #FFC46B | #FFF1D6 / #8A5300 |
| `error.fondo` / `error.texto` | rgba(255,143,133,0.14) / #FF8F85 | #FBE9E7 / #B42318 |
| `enlace` | #7BE5B4 | #0D7A4F |
| `foco` | #7BE5B4 | #0D7A4F |

**Reglas:** una sola acción en menta por bloque; la menta nunca va como texto sobre fondo claro (se usa `acento.texto`); todo estado lleva ícono o texto además del color; validar contraste AA al implementar.

### 11.4 Forma y espacio

| Token | Valores |
|---|---|
| Espaciado | 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48 px |
| Radios | 4 (etiquetas), 8 (botones, campos), 10–12 (tarjetas), 999 (avatares, puntos) |
| Corte diagonal | 36 px (tarjetas grandes), 22 px (tarjetas pequeñas), 64 px (panel de marca) |
| Área táctil mínima | 44 × 44 px |

### 11.5 Implementación con vanilla-extract

```ts
// packages/ui/src/tema/contrato.css.ts
import { createThemeContract } from '@vanilla-extract/css';

export const tema = createThemeContract({
  color: {
    fondo: null, superficie: null, superficieElevada: null, borde: null,
    texto: null, textoSecundario: null, enlace: null, foco: null, aval: null,
    accion: { fondo: null, texto: null },
    acento: { texto: null },
    logro: { fondo: null, texto: null },
    advertencia: { fondo: null, texto: null },
    error: { fondo: null, texto: null },
  },
  fuente: { display: null, texto: null, datos: null },
});
```

Los valores de la tabla 11.3 se asignan con `createTheme(tema, {...})` en `temaOscuro.css.ts` y `temaClaro.css.ts`. Ningún componente usa un color literal: solo `tema.color.*`.

### 11.6 Componentes de `packages/ui`

| Grupo | Componentes |
|---|---|
| Layout | `Pila`, `Fila`, `Grilla`, `Contenedor`, `Separador` |
| Texto | `Titulo`, `Texto`, `Dato` (monoespaciado) |
| Acciones | `Boton` (variante: accion, secundario, fantasma, advertencia), `BotonIcono`, `Enlace` |
| Formularios | `Campo`, `AreaTexto`, `Selector`, `Casilla`, `Segmentado`, `CampoTecnologias`, `ZonaSubida` |
| Datos | `Insignia` (logro, neutro, falta, aval), `MedidorEvidencia`, `Avatar`, `Estadistica` |
| Superficies | `Tarjeta` (con o sin corte), `Panel`, `Modal`, `Hoja` (móvil) |
| Navegación | `BarraSuperior`, `RielLateral`, `BarraInferior`, `Pestañas`, `Pasos` |
| Producto | `TarjetaProyecto`, `Trayectoria` (horizontal y vertical), `SelloAval`, `RespuestaAsistente`, `BurbujaMensaje`, `FilaCandidato`, `Notificacion` |
| Estados | `Esqueleto`, `EstadoVacio`, `AvisoError`, `AvisoConexion` |

Cada componente expone **solo props tipadas** (variantes, tamaños, estados); ninguno acepta `className` ni `style`. Los que tienen comportamiento complejo (modal, selector, pestañas, casilla) se construyen sobre React Aria Components.

### 11.7 Accesibilidad

- Elementos nativos (`button`, `a`, `input` con `label`); nunca `onClick` en `div`.
- `aria-label` en botones de solo ícono; `aria-current` en navegación; `aria-busy` en esqueletos.
- Navegación completa con teclado y foco visible con el token `foco`.
- Contraste AA verificado por cada par de tokens.
- Respeto de `prefers-reduced-motion`.

---

## 12. Seguridad

| Tema | Decisión |
|---|---|
| Contraseñas | Argon2id |
| Tokens | JWT de acceso de 15 min; refresh en cookie `httpOnly`, `Secure`, `SameSite=Lax`, con rotación y revocación en Redis |
| CORS | Solo el dominio de ImpulsaU |
| Encabezados | `@fastify/helmet` registrado en el adaptador de Fastify de NestJS |
| Rate limit | Login, registro, mensajería, subidas y agente |
| Autorización | Verificada en los casos de uso por rol y propiedad, nunca solo en el frontend |
| Archivos | URLs prefirmadas de corta duración; bucket privado para CV y documentos |
| Servicio de IA | Token de servicio; nunca expuesto al navegador |
| Secretos | Solo en variables de entorno de cada plataforma; nunca en el repositorio |
| Dependencias | Auditoría en CI (`pnpm audit`) |

---

## 13. Pruebas

| Tipo | Herramienta | Alcance mínimo |
|---|---|---|
| Unitarias de dominio | Vitest | Reglas de negocio y casos de uso con puertos simulados |
| Módulos NestJS | `@nestjs/testing` | Casos de uso con adaptadores reemplazados por `overrideProvider` |
| Integración | Vitest + contenedores de Postgres y Redis | Adaptadores, rutas y contratos |
| Concurrencia | Vitest con `Promise.all` | Likes, interés mutuo, postulaciones, cuotas, mensajes |
| Componentes | Vitest + Testing Library | Componentes de `packages/ui` |
| Extremo a extremo | Playwright | Ver `impulsau-pruebas-e2e-playwright.md` |
| Carga | k6 | Feed, chat y cola del agente |
| Agente | Conjunto de 30–50 preguntas | Acierto de intención y relevancia |

**Regla:** cada caso de uso se entrega con sus pruebas derivadas de los criterios de aceptación.

---

## 14. CI y calidad

Pipeline en cada PR (GitHub Actions):

1. Instalación con caché de pnpm.
2. `tsc --noEmit` en todo el monorepo.
3. ESLint (incluye cero `any` y cero `className` fuera de `ui`).
4. dependency-cruiser (reglas hexagonales).
5. Pruebas unitarias e integración.
6. Detección de cambios incompatibles en OpenAPI.
7. Build de todas las apps.

**Protección de ramas:** `main` solo acepta PRs con CI en verde y al menos una revisión humana; `packages/contracts` y `packages/db` requieren revisión de la persona arquitecta (CODEOWNERS).

---

## 15. Configuración y entornos

| Entorno | Uso |
|---|---|
| Local | Docker Compose (Postgres + pgvector, Redis, MinIO) y apps con `pnpm dev` |
| Producción | Plataformas gratuitas (ver especificación general, sección 13) |

Cada app valida sus variables al arrancar (en NestJS, este esquema se pasa como función `validate` a `ConfigModule.forRoot`):

```ts
// apps/backend/src/compartido/infraestructura/entorno.ts
import { z } from 'zod';

const Entorno = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  AI_SERVICE_URL: z.string().url(),
  AI_SERVICE_TOKEN: z.string().min(32),
  CORS_ORIGIN: z.string().url(),
});

export const entorno = Entorno.parse(process.env);
```

---

## 16. Convenciones

| Tema | Convención |
|---|---|
| Idioma del código | Dominio y negocio en español (`Proyecto`, `darLike`); términos técnicos estándar en inglés cuando no tienen traducción natural |
| Archivos | `kebab-case.ts`; sufijos de NestJS (`.module.ts`, `.controller.ts`, `.gateway.ts`, `.processor.ts`); componentes React en `PascalCase.tsx` |
| Módulos | Mismo nombre en contratos, backend y frontend |
| Tipos | `PascalCase`; sin prefijo `I` en interfaces |
| Rutas REST | Recursos en inglés y plural (`/projects`, `/vacancies`), como en la especificación general |
| Commits | Conventional Commits (`feat(proyectos): publicar proyecto CU-17`) |
| Ramas | `cu-17-publicar-proyecto`, una por caso de uso |
| PRs | Pequeños, con referencia al caso de uso y sus criterios de aceptación |
| Fechas | UTC en servidor y base; zona de El Salvador solo al mostrar |

---

## 17. Reglas para agentes de desarrollo

Cada app y paquete tiene su archivo de instrucciones. Reglas comunes a todos:

1. Leer el contrato antes de escribir código; si falta algo, **solicitar** el cambio, no improvisar.
2. Cero `any`, cero `as` (salvo `as const`), cero `!`, cero `@ts-ignore`.
3. Todo lo externo entra como `unknown` y se valida con Zod.
4. Un caso de uso por tarea, con sus pruebas.
5. No agregar dependencias sin aprobación.
6. En el frontend, ningún `className` ni `style`: solo componentes de `packages/ui`.
7. En el backend, el dominio no importa NestJS ni infraestructura; la capa de aplicación solo usa `@Injectable` e `@Inject`.
8. Puertos siempre inyectados con tokens (`@Inject(TOKEN)`), nunca por clase concreta.
9. Trabajar dentro del módulo asignado; otros módulos solo a través de su `index.ts`.
10. Los procesadores de colas se registran solo en el `*.worker.module.ts`; los controladores y gateways, solo en el `*.http.module.ts`.
11. Nunca editar migraciones aplicadas ni el contrato sin PR aprobado.

---

## 18. Pendientes técnicos

| # | Pendiente | Fecha límite |
|---|---|---|
| 1 | Prueba del LLM y embeddings en Hugging Face Spaces | 4 oct |
| 2 | Fijar versiones exactas de todas las dependencias | 4 oct |
| 3 | Confirmar proveedor de almacenamiento compatible S3 | 6 oct |
| 4 | Validar contraste AA de todos los pares de tokens | 3 oct |
| 5 | Modelo de datos detallado | ✓ `impulsau-modelo-de-datos.md` |
| 6 | Contratos detallados por módulo | 2 oct |
| 7 | Criterios de aceptación por caso de uso | 2 oct |
| 8 | Archivos de instrucciones de cada agente | 3 oct |
| 9 | Activar Azure for Students y verificar elegibilidad con correo institucional | 1 oct |
| 10 | Crear repositorio, entornos de GitHub, proyecto en Vercel y dominio | 3 oct |
| 11 | Confirmar extensión `vector` en Azure Database for PostgreSQL | 4 oct |
| 12 | Confirmar RAM real de la VM elegida y regiones permitidas por la suscripción | 1 oct |
| 13 | Confirmar máximo de conexiones del plan B1MS y ajustar pools | 3 oct |
| 14 | Medir consumo de memoria con 2 réplicas HTTP + worker en la VM | 4 oct |

---

## 19. Despliegue, entornos y CI/CD

### 19.1 Entornos

| Entorno | Rama | Propósito | Dominio (ejemplo) |
|---|---|---|---|
| **Preview** | Cada PR hacia `develop` | Probar el cambio completo (frontend y, si aplica, backend) **antes** del merge | URL automática de Vercel por PR + `api-preview.impulsau.[tld]` |
| **Dev** | `develop` | Integración continua del equipo; datos de prueba | `dev.impulsau.[tld]` y `api-dev.impulsau.[tld]` |
| **Producción** | `main` | Demo y entrega final; datos de demostración curados | `impulsau.[tld]` y `api.impulsau.[tld]` |

Todos los previews de Vercel apuntan al **slot de preview del backend** (sección 19.15), que ejecuta el backend del PR que se está probando o, si ninguno lo ocupa, el de `develop`.

### 19.2 Flujo de ramas

```
cu-17-publicar-proyecto ──PR──► develop ──PR de release──► main
        │                          │                         │
  CI + preview completo       deploy a dev         promoción por fast-forward
  prueba manual en preview    automático           (misma imagen ya probada)
```

- Una rama por caso de uso, creada desde `develop` y **rebasada** sobre `develop` antes del merge (historial lineal).
- Nada entra a `develop` sin CI en verde, E2E en verde contra el preview y la casilla "Probado en preview" marcada por quien revisa.
- A `main` **solo** llegan PRs cuyo origen es `develop`. Un check lo verifica y bloquea cualquier otro origen.
- `main` nunca recibe commits propios: siempre es un **fast-forward** de `develop` (sección 19.16).
- No hay hotfix directo a `main`: una corrección urgente entra a `develop` como cualquier cambio y se promueve con un release inmediato. Así el historial nunca diverge.

### 19.3 Dónde se despliega cada pieza (propuesta recomendada)

| Componente | Producción | Dev | Motivo |
|---|---|---|---|
| Frontend (`apps/web`) | **Vercel** (rama `main`) | **Vercel** (rama `develop`) + previews por PR | Previews automáticos por rama, CDN y TLS sin configuración |
| Backend HTTP + worker (`apps/backend`) | **Azure** – máquina virtual burstable con Docker Compose (dos contenedores del mismo build: `http` y `worker`) + Caddy para TLS | **Render** (plan gratuito, ambas salidas en un contenedor) | En Azure no se duerme: WebSocket estables y sin arranque en frío en la demo |
| Base de datos | **Azure Database for PostgreSQL** – Flexible Server B1MS, base `impulsau` | **Neon** (plan gratuito) | Producción gestionada y sin pausas; dev separado para no abrir el firewall de producción a Render |
| Redis | **Upstash** (base de producción) | **Upstash** (base de dev) | Azure no ofrece Redis gestionado gratuito; ahorra RAM en la VM |
| Almacenamiento de archivos | **Cloudflare R2** u otro compatible S3 (buckets `prod-publico`, `prod-privado`) | Buckets `dev-*` | Azure Blob no es compatible con S3; se mantiene el diseño de URLs prefirmadas y Uppy |
| Servicio de IA (`apps/ai`) | **Hugging Face Spaces** (CPU, Docker) | El mismo Space | Es la opción gratuita con más RAM; las VMs gratuitas de Azure no alcanzan para el modelo |
| Correo | Proveedor SMTP transaccional (plan gratuito) | El mismo, con remitente de pruebas | Verificación y recuperación |
| Imágenes Docker | **GitHub Container Registry** | Igual | Gratuito e integrado con Actions |
| DNS | Registrador del dominio | — | Único gasto del proyecto |

**Plan B sin Azure** (si la verificación de estudiante falla o se agota el crédito): backend en Render o Koyeb, base de datos en Neon o Supabase. El código no cambia; solo variables de entorno y el workflow de despliegue.

### 19.4 Evaluación de Azure for Students

| Aspecto | Evaluación |
|---|---|
| Costo y requisitos | Crédito de USD 100 por 12 meses, sin tarjeta, renovable cada año mientras se siga siendo estudiante. Exige ser estudiante universitario a tiempo completo, mayor de 18 años y verificarse (normalmente con correo institucional) |
| PostgreSQL | **Muy viable.** 750 horas mensuales de Flexible Server B1MS con 32 GB durante 12 meses: alcanza para un servidor encendido todo el mes. Hay que habilitar la extensión `vector` en la configuración del servidor. Se usa solo para producción |
| Backend (VM) | **Viable pero ajustado.** 750 horas mensuales de VMs burstable pequeñas por 12 meses. Tienen poca RAM (alrededor de 1 GB), suficiente para `http` + `worker` de NestJS con swap y Redis fuera de la VM, pero no para el modelo de IA |
| Container Apps | Viable como alternativa a la VM, con escalado a cero; pero el escalado a cero corta los WebSocket y un contenedor siempre encendido consume la cuota gratuita y luego el crédito |
| Servicio de IA | **No recomendable.** El modelo necesita varios GB de RAM; en Azure consumiría el crédito rápidamente. Hugging Face Spaces es mejor opción |
| Redis gestionado | **No viable gratis.** Se mantiene Upstash |
| Almacenamiento | Blob Storage tiene cuota gratuita, pero **no es compatible con S3**: exigiría otro adaptador de almacenamiento y reemplazar el plugin de subida. Se mantiene un proveedor compatible S3 |
| Frontend | Static Web Apps es gratuito, pero Vercel ofrece previews por rama con menos configuración |
| Riesgos | Los servicios "gratis por 12 meses" pasan a cobrarse después; sin tarjeta, al agotarse el crédito los recursos se detienen. Configurar **alertas de presupuesto** desde el primer día y apagar lo que no se use |

**Conclusión:** Azure es factible y conveniente para la **base de datos** y el **backend siempre encendido**, que son justo los puntos débiles de otros planes gratuitos (pausas y arranques en frío). Para frontend, IA, Redis y archivos conviene quedarse con Vercel, Hugging Face, Upstash y un proveedor S3.

### 19.5 Workflows de GitHub Actions

| Workflow | Disparador | Qué hace |
|---|---|---|
| `ci.yml` | PR hacia `develop` o `main` | Instala con caché, `tsc --noEmit`, ESLint, dependency-cruiser, **verificación de migraciones** (sección 19.18), pruebas unitarias e integración (con Postgres y Redis como servicios del job), build. Turborepo ejecuta solo lo afectado |
| `contratos.yml` | PR que toca `packages/contracts` | Genera OpenAPI y detecta cambios incompatibles; requiere aprobación de la persona arquitecta (CODEOWNERS) |
| `preview-backend.yml` | PR hacia `develop` que toca `apps/backend`, `packages/contracts` o `packages/db` (o con la etiqueta `preview-backend`) | Toma el slot de preview, crea una rama de base en Neon desde dev, migra, despliega la imagen del PR y deja un comentario con las URLs |
| `e2e-preview.yml` | Cuando Vercel termina un deploy de preview y el slot está listo | Corre Playwright contra la URL del preview y el slot del backend |
| `liberar-preview.yml` | PR cerrado o fusionado | Borra la rama de Neon y devuelve el slot a la imagen de `develop` |
| `origen-release.yml` | PR hacia `main` | Falla si la rama de origen no es `develop` o si `main` no es ancestro de `develop` (check obligatorio) |
| `deploy-dev.yml` | Push a `develop` | Construye la imagen del backend (etiqueta = SHA), la publica en GHCR, ejecuta migraciones en Neon (dev) y actualiza Render. Vercel despliega el frontend por su cuenta |
| `promover-prod.yml` | PR de release aprobado (o ejecución manual) | En el entorno `production` con **aprobación manual**: verifica que sea fast-forward, empuja `develop` a `main` sin crear commits nuevos, y despliega en la VM de Azure **la misma imagen que ya corre en dev** (no reconstruye) |
| `deploy-ai.yml` | Push a `main` que toca `apps/ai` | Sincroniza `apps/ai` con el Space de Hugging Face |
| `seguridad.yml` | Semanal y en PR | `pnpm audit` y análisis de código (CodeQL si el repositorio es público) |
| `mantenimiento.yml` | Programado (diario) | Llama al endpoint de salud del servicio de IA y del backend de dev, y avisa si alguno falla |

**Reglas de los workflows:**

- Migraciones siempre **antes** de actualizar el backend, y compatibles hacia atrás (agregar columnas primero, quitar después).
- Secretos solo en **GitHub Environments** (`dev`, `production`), nunca en el repositorio.
- Un despliegue que falla no borra la versión anterior: la VM conserva la imagen previa para volver atrás con un solo comando.
- Si el repositorio es privado, revisar los minutos gratuitos de Actions y la disponibilidad de aprobaciones en entornos según el plan de GitHub del equipo.

### 19.6 Configuración de Vercel

- Proyecto apuntando a `apps/web` en el monorepo; build con `pnpm turbo build --filter=web`.
- Rama de producción: `main`. Dominio fijo de `develop`: `dev.impulsau.[tld]`.
- Variables por entorno: `VITE_API_URL` y `VITE_WS_URL` apuntan a dev en previews y en `develop`, y a producción en `main`.
- Reescritura de todas las rutas a `index.html` (SPA).
- El endpoint `/p/:id` con Open Graph lo sirve el backend, no Vercel.

### 19.7 VM de Azure (producción)

- Docker Compose con: `caddy` (TLS automático y **balanceador de carga**), **dos réplicas** de `backend-http` y una de `backend-worker`, todas de la misma imagen con distinto comando (ver 19.19).
- Límite de memoria por contenedor y archivo de swap para absorber picos.
- Firewall: solo puertos 80, 443 y SSH restringido.
- Alertas de presupuesto en la suscripción y monitoreo básico de la VM.

### 19.8 Decisiones de despliegue cerradas

| # | Decisión | Elección | Motivo |
|---|---|---|---|
| D1 | Producción | Azure (VM + PostgreSQL gestionado) | Sin pausas ni arranque en frío; WebSocket estables |
| D2 | Dev | Render (backend) + Neon (PostgreSQL) + Upstash (Redis de dev) | Totalmente separado de producción; si se duerme, no afecta la demo |
| D3 | Tamaño de VM | La burstable de 2 vCPU con arquitectura **x86** (AMD) incluida en la oferta gratuita | Mismas imágenes Docker que en local y en CI; la ARM obligaría a construir imágenes `arm64` |
| D4 | Región | La región de EE. UU. más cercana que la suscripción permita **para ambos** (VM y PostgreSQL), p. ej. centro-sur o este | Menor latencia desde El Salvador; VM y base en la misma región para evitar latencia y costos de red |
| D5 | Acceso a la base de producción | Solo desde la IP pública de la VM (firewall del servidor) | Nadie más llega a producción; las migraciones corren desde la VM |
| D6 | Imágenes | Una imagen del backend por commit en GHCR, etiquetada con el SHA; `latest-prod` y `latest-dev` como alias | Despliegues reproducibles y reversión inmediata |
| D7 | TLS | Caddy en la VM con certificados automáticos | Sin configuración manual de certificados |
| D8 | Aprobación de producción | Entorno `production` de GitHub con revisor obligatorio (persona arquitecta) | Nada llega a producción sin revisión humana |
| D9 | Presupuesto | Alertas de Azure al 25 %, 50 % y 80 % del crédito | Detectar consumo antes de que se agote |
| D10 | Respaldos | Respaldos automáticos del servidor (retención por defecto) + volcado semanal cifrado al bucket privado | Protección si se pierde la suscripción o el crédito |

### 19.9 Convención de nombres en Azure

| Recurso | Nombre |
|---|---|
| Grupo de recursos | `rg-impulsau-prod` |
| Máquina virtual | `vm-impulsau-prod` |
| IP pública | `ip-impulsau-prod` |
| Grupo de seguridad de red | `nsg-impulsau-prod` |
| Servidor PostgreSQL | `psql-impulsau-prod` |
| Base de datos | `impulsau` |
| Alerta de presupuesto | `budget-impulsau` |

Todo en un solo grupo de recursos: al terminar el proyecto, borrar el grupo elimina todo y evita cobros posteriores.

### 19.10 DNS

| Registro | Tipo | Apunta a |
|---|---|---|
| `impulsau.[tld]` | A / ALIAS | Vercel (producción) |
| `www` | CNAME | Vercel |
| `dev` | CNAME | Vercel (rama `develop`) |
| `api` | A | IP pública de la VM de Azure |
| `api-dev` | CNAME | Servicio de Render |

El servicio de IA **no** tiene subdominio público propio: solo lo llaman el worker de producción y el de dev, con su token.

### 19.11 Red y seguridad

| Punto | Regla |
|---|---|
| Grupo de seguridad de la VM | Entrada solo 80 y 443 desde internet; 22 (SSH) solo con llave, sin contraseña |
| SSH desde GitHub Actions | Usuario de despliegue dedicado con llave propia guardada como secreto del entorno `production` |
| Firewall de PostgreSQL | Solo la IP de la VM; acceso administrativo temporal agregando la IP propia y quitándola al terminar |
| Conexión a la base | TLS obligatorio (`sslmode=require`) |
| Usuarios de base | Uno para la aplicación (sin permisos de administración) y otro para migraciones |
| Actualizaciones de la VM | Actualizaciones automáticas de seguridad del sistema operativo |

### 19.12 Secretos por entorno (GitHub Environments)

| Secreto | `dev` | `production` |
|---|---|---|
| `DATABASE_URL` / `DATABASE_URL_MIGRACIONES` | Neon | Azure PostgreSQL |
| `REDIS_URL` | Upstash dev | Upstash prod |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Propios de dev | Propios de prod (nunca compartidos) |
| `S3_*` | Buckets `dev-*` | Buckets `prod-*` |
| `AI_SERVICE_URL` / `AI_SERVICE_TOKEN` | Space de IA | Space de IA (token distinto) |
| `SMTP_*` | Remitente de pruebas | Remitente real |
| `RENDER_DEPLOY_HOOK` | ✓ | — |
| `VM_HOST` / `VM_USUARIO` / `VM_LLAVE_SSH` | — | ✓ |
| `GHCR_TOKEN` | ✓ | ✓ |

Las variables públicas del frontend (`VITE_API_URL`, `VITE_WS_URL`) se configuran en Vercel por entorno, no en GitHub.

### 19.13 Despliegue a producción paso a paso (`promover-prod.yml`)

1. **Aprobación:** el job espera al revisor del entorno `production`.
2. **Promoción:** verifica que `main` sea ancestro de `develop` y empuja `develop` a `main` (fast-forward). No se construye nada: la imagen con ese SHA ya existe desde `deploy-dev`.
3. **Conexión:** entra a la VM por SSH con el usuario de despliegue.
4. **Descarga:** `docker compose pull` de la imagen con ese SHA.
5. **Migraciones:** corre las migraciones con un contenedor temporal de la misma imagen, usando el usuario de migraciones. Si fallan, el despliegue se detiene y la versión anterior sigue funcionando.
6. **Actualización escalonada:** se reemplaza una réplica de `backend-http` a la vez (Caddy deja de enviarle tráfico mientras se reinicia) y luego el worker. La API nunca queda sin atender (ver 19.19).
7. **Verificación:** consulta `https://api.impulsau.[tld]/salud` hasta recibir respuesta correcta o agotar el tiempo.
8. **Reversión automática:** si la verificación falla, vuelve a levantar la imagen anterior y marca el job como fallido.

### 19.14 Puesta en marcha (orden de ejecución)

| # | Paso | Fecha | Dependencia |
|---|---|---|---|
| 1 | Activar Azure for Students y confirmar verificación | 1 oct | — |
| 2 | Revisar regiones permitidas y RAM de la VM elegida | 1 oct | 1 |
| 3 | Comprar el dominio | 1 oct | — |
| 4 | Crear repositorio, ramas `main` y `develop`, protección de ramas, CODEOWNERS | 2 oct | — |
| 5 | Crear entornos `dev` y `production` en GitHub con sus secretos | 3 oct | 4 |
| 6 | Crear cuentas: Vercel, Render, Neon, Upstash, R2, Hugging Face, SMTP | 2 oct | — |
| 7 | Crear en Azure: grupo de recursos, alerta de presupuesto, PostgreSQL, VM | 2–3 oct | 2 |
| 8 | Preparar la VM: Docker, swap, usuario de despliegue, Caddy, firewall | 3 oct | 7 |
| 9 | Configurar DNS | 3 oct | 3, 7 |
| 10 | Desplegar un "hola mundo" en todos los entornos por el flujo completo de CI/CD | 4 oct | 5–9 |

El paso 10 es el criterio de salida de la fase 0 en infraestructura: si un cambio trivial viaja solo desde una rama hasta producción pasando por preview, dev y aprobación, la infraestructura está lista.

### 19.15 Preview completo antes del merge

Un preview solo de frontend no alcanza: si el PR cambia el backend, el preview mostraría el backend viejo. Por eso existe un **slot de preview del backend**.

| Pieza | Cómo funciona |
|---|---|
| Slot | Un servicio gratuito de Render (`impulsau-api-preview`) en `api-preview.impulsau.[tld]`, con salida HTTP y worker en un contenedor |
| Base de datos | Por cada PR, una **rama de Neon** creada desde la base de dev: datos realistas y migraciones del PR sin tocar dev |
| Redis y archivos | Base de Upstash y buckets propios del slot, que se limpian al liberarlo |
| Frontend | Todos los previews de Vercel apuntan a `api-preview` |
| Estado por defecto | Sin PR de backend ocupándolo, el slot ejecuta la imagen de `develop` sobre su propia rama de Neon; así los PRs solo de frontend también tienen backend para probar |
| Concurrencia | Un PR de backend a la vez (`concurrency` de GitHub Actions). Si hay otro, el workflow espera y comenta en el PR que está en cola |
| Liberación | Al cerrar o fusionar el PR: se borra la rama de Neon, se limpian Redis y buckets, y el slot vuelve a `develop` |

**Flujo de un PR con cambios de backend:**

1. Se abre el PR → corre el CI.
2. `preview-backend.yml` toma el slot, crea la rama de Neon, migra y despliega la imagen del PR.
3. Vercel publica el preview del frontend; el bot comenta en el PR ambas URLs.
4. Corren las E2E contra ese preview.
5. Quien revisa **prueba a mano** en el preview y marca "Probado en preview" en la plantilla del PR.
6. Solo entonces se habilita el merge.

**Limitación asumida:** un solo backend de preview a la vez. Con PRs pequeños (uno por caso de uso) la cola es corta; si se vuelve un cuello de botella, se agrega un segundo slot.

### 19.16 Releases hacia `main`: rebase desde `develop` y fast-forward

**Por qué no usar el botón "Rebase and merge" de GitHub:** GitHub recrea los commits al rebasar, con SHAs nuevos. Entonces `main` y `develop` quedan con historiales distintos, el siguiente release arrastra commits "repetidos" y la imagen de producción no sería la misma que se probó en dev.

**Cómo se hace en ImpulsaU:**

1. `develop` siempre está por delante de `main` (como `main` solo recibe fast-forwards, nunca divergen y no hace falta rebasar en cada release).
2. Se abre el PR de release `develop` → `main`. Corren el CI y `origen-release.yml`.
3. La persona arquitecta aprueba el PR.
4. `promover-prod.yml` (en el entorno `production`, con su aprobación) empuja `develop` a `main` como **fast-forward**. GitHub marca el PR como fusionado automáticamente, porque sus commits ya están en `main`.
5. Se despliega en producción la imagen con ese mismo SHA, la que ya corrió en dev y en el preview.

**Si algún día `develop` y `main` divergieran** (por ejemplo, por un cambio accidental), `origen-release.yml` falla y la solución es rebasar `develop` sobre `main` y forzar el push de `develop` antes del release.

**Detalle técnico:** los pushes hechos con el `GITHUB_TOKEN` no disparan otros workflows, así que `promover-prod.yml` hace el push **y** el despliegue en el mismo flujo (o usa el token de una GitHub App si se prefiere separarlos).

### 19.17 Reglas de protección (rulesets de GitHub)

| Rama | Reglas |
|---|---|
| `develop` | Sin push directo; PR obligatorio; historial lineal; rama actualizada antes del merge; checks obligatorios: CI, E2E del preview; 1 aprobación; método de merge: squash o rebase (un commit limpio por caso de uso) |
| `main` | Sin push directo excepto el workflow de promoción; PR obligatorio; historial lineal; checks obligatorios: CI y `origen-release`; aprobación de la persona arquitecta; sin botón de merge (lo cierra la promoción) |
| Ambas | Sin force-push ni borrado, salvo la corrección excepcional de 19.16 hecha por la persona arquitecta |

**Plantilla de PR** (`.github/pull_request_template.md`): caso de uso (CU-xx), criterios de aceptación cubiertos, capturas del preview y la casilla obligatoria "Probado en preview".

### 19.18 Migraciones automáticas

Ninguna migración se aplica a mano. Cada entorno migra solo, en el momento exacto en que recibe código nuevo.

| Entorno | Cuándo se migra | Dónde corre | Base |
|---|---|---|---|
| CI | En cada PR | Job de CI | Postgres temporal del job (desde cero) |
| Preview | Al abrir el PR y en **cada push** que toque migraciones | `preview-backend.yml` | Rama de Neon del PR (se recrea desde dev si cambian las migraciones del PR) |
| Dev | Al hacer **merge a `develop`** | `deploy-dev.yml`, antes de actualizar Render | Neon (dev) |
| Producción | Al **promover a `main`** | `promover-prod.yml`, desde la VM, antes de actualizar los contenedores | Azure PostgreSQL |

Una misma migración pasa así por cuatro bases antes de llegar a producción: la vacía del CI, la rama del preview, dev y, finalmente, producción.

#### Cómo se ejecutan

- **Un script propio** en `packages/db` (`migrar.ts`) que usa el migrador de Drizzle. Drizzle registra en una tabla interna qué migraciones ya se aplicaron, así que correrlo dos veces no repite nada.
- **Candado:** el script toma un *advisory lock* de PostgreSQL antes de migrar. Si por error dos despliegues coinciden, el segundo espera en vez de aplicar la misma migración en paralelo.
- **Transacciones:** cada migración corre dentro de una transacción; si falla, no queda a medias.
- **Usuario de migraciones:** separado del usuario de la aplicación, que no tiene permisos para alterar el esquema.
- **Orden estricto:** primero migrar, después actualizar la aplicación. Si la migración falla, el despliegue se detiene y la versión anterior sigue funcionando.
- **Respaldo previo en producción:** antes de migrar, `promover-prod.yml` guarda un volcado de la base en el bucket privado.

#### Verificaciones en CI (bloquean el merge)

| Verificación | Qué detecta |
|---|---|
| Esquema sin migración | Se cambió el esquema de Drizzle pero no se generó la migración: el CI genera las migraciones y falla si aparece algún archivo nuevo |
| Migraciones consistentes | `drizzle-kit check` sobre el historial de migraciones |
| Migraciones inmutables | Un PR modifica o borra una migración que ya existe en `develop` |
| Aplicación desde cero | Todas las migraciones se aplican sobre una base vacía sin errores |
| Operaciones destructivas | Aviso obligatorio (requiere aprobación de la persona arquitecta) si una migración contiene `DROP` o renombra columnas o tablas |

#### Reglas para escribir migraciones

**Compatibles hacia atrás (expandir y contraer).** Durante unos segundos, la versión anterior de la aplicación convive con el esquema nuevo. Por eso:

| Cambio | Cómo se hace |
|---|---|
| Agregar columna | Nullable o con valor por defecto |
| Agregar tabla o índice | Directo |
| Renombrar columna | Release 1: crear la nueva y escribir en ambas. Release 2: migrar datos y leer de la nueva. Release 3: borrar la vieja |
| Borrar columna o tabla | Release 1: dejar de usarla en el código. Release 2: borrarla |
| Cambiar tipo de columna | Como un renombrado: columna nueva, migración de datos, borrado posterior |

**Sin migraciones de reversa.** Si una migración ya aplicada tiene un error, se corrige con **una migración nueva** (política *forward-only*). Nunca se edita una migración que ya llegó a `develop`.

**Datos y esquema separados.** Las migraciones de datos (rellenar una columna nueva, por ejemplo) van en archivos propios y deben ser idempotentes.

#### Dos PRs con migraciones al mismo tiempo

Como `develop` exige que la rama esté actualizada antes del merge, si otro PR con migración entra primero, el segundo debe rebasarse sobre `develop` y **regenerar** su migración para que quede después de la nueva. El registro de migraciones de Drizzle genera un conflicto en git que lo hace evidente; el CI vuelve a verificar todo después del rebase.

### 19.19 Balanceo de carga y concurrencia

#### Principio: backend sin estado

El backend ya está diseñado para correr en **varias instancias a la vez** sin que importe cuál atiende cada petición. Nada vive en la memoria de un proceso:

| Estado | Dónde vive | Por qué permite varias instancias |
|---|---|---|
| Sesiones | Redis | Cualquier instancia valida y revoca tokens |
| Idempotencia y rate limit | Redis (operaciones atómicas) | Los límites y llaves son globales, no por instancia |
| Likes y contadores | Redis (Lua) | Atómicos sin importar qué instancia recibe el clic |
| Eventos de Socket.IO | Adaptador de Redis | Un mensaje emitido en una instancia llega a usuarios conectados a otra |
| Archivos | Almacenamiento S3 | Las subidas nunca pasan por el backend |
| Tareas y jobs programados | BullMQ | Las tareas repetibles se ejecutan **una vez**, no una por instancia (prohibido `setInterval` o cron en proceso) |
| Outbox | PostgreSQL con `FOR UPDATE SKIP LOCKED` | Varios workers no toman el mismo evento |
| Migraciones | Advisory lock de PostgreSQL | Solo una instancia migra |

**Regla para agentes y equipo:** ningún dato de negocio se guarda en variables de módulo, mapas en memoria ni cachés locales del proceso.

#### Topología en producción

```
                 Internet
                     │
              ┌──────▼──────┐
              │    Caddy    │  TLS + balanceo + health checks
              └──┬───────┬──┘
        ┌────────▼┐     ┌▼────────┐
        │ http #1 │     │ http #2 │   NestJS (REST + Socket.IO)
        └────┬────┘     └────┬────┘
             │   Redis (Upstash)  │── adaptador Socket.IO, colas, contadores
             │   PostgreSQL (Azure)
        ┌────▼────┐
        │ worker  │   BullMQ (concurrencia por cola)
        └─────────┘
```

| Pieza | Configuración |
|---|---|
| Réplicas `backend-http` | 2 (una por vCPU; Node usa un núcleo por proceso) |
| Política de balanceo | `least_conn` (menos conexiones activas), adecuada con WebSocket de larga duración |
| Afinidad (sticky) | Cookie de Caddy, necesaria para Socket.IO cuando cae al transporte de *long-polling* |
| Transporte de Socket.IO | WebSocket primero; *long-polling* solo como respaldo en redes que bloquean WebSocket |
| Health checks activos | Caddy consulta `/salud` de cada réplica cada pocos segundos y saca de rotación a la que falla |
| Reintentos del proxy | Solo para peticiones idempotentes (`GET`, `PUT`, `DELETE` y creaciones con `Idempotency-Key`) |
| Réplicas `backend-worker` | 1 (el paralelismo se controla con la concurrencia de cada cola) |

#### Protección contra sobrecarga

| Mecanismo | Qué hace |
|---|---|
| `@fastify/under-pressure` | Si el event loop se retrasa o la memoria sube de un umbral, la instancia responde `503` con `Retry-After` en vez de degradarse para todos; Caddy prueba otra réplica |
| Rate limit global y por usuario (Redis) | Frena ráfagas antes de que lleguen a la base |
| Cola del agente con tamaño máximo | Responde `429` cuando se llena, en lugar de acumular esperas |
| Concurrencia por cola en BullMQ | El worker nunca procesa más jobs de los que la VM soporta |
| Límite de conexiones de Socket.IO por usuario | Evita que un cliente abra decenas de sockets |
| Timeouts en todo | HTTP, base, Redis y servicio de IA, para que una dependencia lenta no bloquee instancias |

#### Presupuesto de conexiones a PostgreSQL

El servidor B1MS admite pocas conexiones simultáneas, así que se reparten de forma explícita:

| Proceso | Pool máximo |
|---|---|
| `backend-http` #1 | 8 |
| `backend-http` #2 | 8 |
| `backend-worker` | 6 |
| Migraciones y administración | 3 |
| **Total** | **25** |

El total debe quedar por debajo del máximo del plan (a confirmar al crear el servidor). Si se agregan réplicas, se reduce el pool de cada una o se activa el pooler de conexiones que ofrece Azure para PostgreSQL.

#### Despliegues sin caída

Con dos réplicas, cada despliegue es **escalonado**:

1. Se detiene la réplica #1: NestJS recibe la señal de apagado, deja de aceptar peticiones, termina las que están en curso y cierra los sockets (los clientes se reconectan solos a la réplica #2 y sincronizan los mensajes perdidos).
2. Caddy detecta que #1 no responde y envía todo a #2.
3. La réplica #1 arranca con la versión nueva y vuelve a rotación cuando `/salud` responde.
4. Se repite con la réplica #2 y, al final, con el worker (que termina sus jobs en curso antes de apagarse; BullMQ reintenta los que queden a medias).

Requisitos en el código: `enableShutdownHooks()` en NestJS, cierre ordenado de Fastify, Socket.IO, BullMQ, Redis y el pool de PostgreSQL, y un endpoint `/salud` que distinga "vivo" de "listo para recibir tráfico".

#### Límite honesto de la VM gratuita

La VM tiene 2 vCPU y poca RAM. Dos réplicas HTTP más el worker caben con límites de memoria por contenedor y swap, pero hay que **medirlo**. Si la memoria no alcanza, se corre con una réplica HTTP y el diseño sigue igual: el balanceo queda configurado y se activa en cuanto haya recursos.

**Para crecer más adelante** (fuera del presupuesto actual), el diseño sin estado permite, sin cambiar código: más réplicas en una VM mayor, varias VMs detrás de un balanceador gestionado, o contenedores con autoescalado. El servicio de IA escala aparte, con más instancias del Space repartidas por el adaptador `ModeloIA`.

#### Verificación con k6

| Escenario | Qué se comprueba |
|---|---|
| Ráfaga de likes al mismo proyecto desde muchos usuarios | El contador final es exacto con dos réplicas |
| Chat con usuarios repartidos entre réplicas | Los mensajes llegan en orden y sin duplicados de una réplica a otra |
| Despliegue durante carga sostenida | Cero errores 5xx visibles mientras se reemplazan las réplicas |
| Caída forzada de una réplica | Caddy la saca de rotación y los sockets se reconectan a la otra |
| Saturación del agente | La API responde `429` y el resto de la app sigue rápida |

---

## 20. Versión 2.0: Supabase y despliegue sin Azure

### 20.1 Contexto

ImpulsaU se entrega como proyecto universitario, con un máximo estimado de **20 usuarios simultáneos**. A esa escala no se justifican una VM, un balanceador ni varias réplicas. El backend sigue siendo **sin estado** (sección 19.19), así que puede escalar más adelante sin cambiar código.

### 20.2 Mapa de servicios

| Pieza | Producción | Dev | Preview por PR |
|---|---|---|---|
| Frontend | Vercel (`main`) | Vercel (`develop`) | Vercel (preview automático) |
| Backend (API + worker en un proceso, `main-todo.ts`) | Render (plan gratuito) | Koyeb (plan gratuito) | Slot en Koyeb |
| PostgreSQL | Supabase `impulsau-prod` | Supabase `impulsau-dev` | Rama de Neon creada desde una base de preview con seeds |
| Archivos | Supabase Storage (`impulsau-prod`) | Supabase Storage (`impulsau-dev`) | Supabase Storage (`impulsau-dev`, carpeta por PR) |
| Autenticación y sus correos | Supabase Auth (`impulsau-prod`) | Supabase Auth (`impulsau-dev`) | Supabase Auth (`impulsau-dev`) |
| Envío real de correos | SMTP propio configurado **dentro** de Supabase (Resend o Brevo) | Igual | Igual |
| Redis | Upstash `impulsau-prod` | Upstash `impulsau-dev` | Upstash `impulsau-preview` |
| IA | Hugging Face Spaces | Igual | Igual |

**Servicios que ya no se usan:** Azure, Cloudflare R2 y Caddy. Cloudflare puede quedarse solo para el DNS.

### 20.3 Supabase Auth

**Qué hace Supabase:** registro con correo y contraseña, verificación de correo, inicio y cierre de sesión (incluido "en todos los dispositivos"), recuperación de contraseña, renovación automática de la sesión en el navegador y **envío de esos correos** con plantillas.

**Qué sigue haciendo ImpulsaU:** reglas de negocio del registro, roles, perfiles y autorización.

#### Correos: SMTP propio obligatorio

El servicio de correo incluido en Supabase está pensado solo para pruebas: entrega únicamente a direcciones del equipo del proyecto y con un límite muy bajo por hora. Por eso se configura un **SMTP propio** (Resend o Brevo, plan gratuito) en *Authentication → SMTP Settings* de cada proyecto. Supabase sigue disparando los correos y usando sus plantillas; el SMTP solo los entrega. Con SMTP propio, Supabase aplica un límite inicial de 30 correos por hora, suficiente para 20 usuarios y ajustable.

**Plantillas:** se personalizan en español y con la identidad de ImpulsaU (confirmar correo, recuperar contraseña, cambio de correo). Se guardan versionadas en el repositorio y se copian a ambos proyectos.

#### Flujo de registro (las reglas de negocio no se saltan)

1. El frontend envía el formulario de registro **al backend**, no directo a Supabase.
2. El caso de uso `Registrarse` valida las reglas: edad ≥ 18, declaración de cero experiencia, rol, estado académico y, para docentes, dominio institucional aprobado.
3. Si todo es válido, el backend crea la cuenta en Supabase Auth (lo que dispara el correo de verificación) y, en la misma operación lógica, crea el perfil en `usuarios` y la tabla de su rol. Si falla la creación del perfil, se elimina la cuenta de Auth (compensación).
4. El usuario confirma su correo desde el enlace y vuelve a ImpulsaU.

**Protección contra registros directos:** como la llave pública de Supabase es visible en el navegador, alguien podría crear una cuenta directamente contra Supabase. Esa cuenta **no sirve para nada**: el guard del backend rechaza cualquier token cuyo usuario no tenga perfil válido en `usuarios` (con declaración y rol). Además, el job de limpieza borra cuentas de Auth sin perfil después de 24 horas.

#### Inicio de sesión, sesión y cierre

- El frontend usa el cliente de Supabase para iniciar sesión, cerrar sesión y renovar el token automáticamente.
- Cada petición al backend lleva el token de acceso de Supabase como `Bearer`.
- El handshake de Socket.IO usa el mismo token.
- "Cerrar sesión en todos los dispositivos" usa el cierre de sesión global de Supabase.

#### Validación en NestJS

- Guard `SupabaseJwtGuard` en `compartido/http`: verifica la firma del token con las llaves públicas del proyecto (JWKS), la expiración y la audiencia.
- Con el `sub` del token carga el usuario de `usuarios` (rol y estado) y lo adjunta a la petición, tipado. Sin perfil o con cuenta suspendida, responde `403`.
- El puerto `ProveedorIdentidad` (crear cuenta, eliminar cuenta, generar enlaces) tiene un adaptador de Supabase. Si algún día se cambia de proveedor, solo cambia el adaptador.

#### URLs de redirección

| Proyecto | URL del sitio | URLs permitidas |
|---|---|---|
| `impulsau-prod` | `https://impulsau.[tld]` | Solo el dominio de producción |
| `impulsau-dev` | `https://dev.impulsau.[tld]` | Dominio de dev, previews de Vercel del proyecto (patrón con comodín) y `localhost` |

### 20.4 Supabase como PostgreSQL

- Extensiones `vector`, `pg_trgm` y `citext` habilitadas en ambos proyectos.
- Drizzle sigue siendo el ORM; las migraciones siguen el flujo de la sección 19.18.
- Conexión desde el backend por el pooler de Supabase en **modo sesión** (o modo transacción con sentencias preparadas desactivadas en el driver).
- Las tablas de ImpulsaU viven en el esquema `public`; Supabase Auth administra el esquema `auth`. `usuarios.id` es el mismo id del usuario de Auth.
- **No se usan** la API de datos automática de Supabase ni Row Level Security desde el navegador: el frontend nunca consulta la base directamente; todo pasa por NestJS. Se deshabilita el acceso de la API de datos a las tablas de `public` para que la llave pública no exponga nada.

### 20.5 Supabase Storage

- Compatible con S3: el adaptador de almacenamiento y las URLs prefirmadas no cambian.
- Buckets por proyecto: `publico` (imágenes de proyectos) y `privado` (CV y documentos de verificación).
- Las subidas siguen yendo **directo del navegador** al almacenamiento.

**Cuotas ajustadas** (el plan gratuito tiene 1 GB de archivos por proyecto):

| Ajuste | Antes | Ahora |
|---|---|---|
| Cuota por usuario | 500 MB | 20 MB |
| Imágenes de proyecto | Hasta 5 MB guardadas | Hasta 5 MB al subir; el worker las comprime a menos de 500 KB y borra el original |
| Adjuntos ZIP | Hasta 50 MB | Eliminados: el código va en el enlace al repositorio |
| Subida multiparte | Para archivos > 10 MB | No se necesita con estos límites; queda diseñada para el futuro |
| Video | Enlace de YouTube | Igual |

### 20.6 Límites del plan gratuito y mitigaciones

| Límite | Mitigación |
|---|---|
| Pausa tras 7 días de poca actividad | Workflow diario `mantener-activo.yml` que consulta ambos proyectos; revisión manual antes de la demo y la defensa |
| Sin respaldos automáticos | Volcado semanal de la base de producción al bucket privado de dev (o almacenamiento externo), con retención de 4 semanas |
| 500 MB de base por proyecto | Suficiente para la carga prevista; los vectores (384 dimensiones) ocupan poco |
| 1 GB de archivos y 5 GB de salida | Cuotas de 20.5 y miniaturas comprimidas |
| Dos proyectos activos | Producción y dev; los previews usan Neon |
| Backend gratuito que se duerme | Workflow que llama a `/salud` cada pocos minutos en las fechas de demo y defensa |

### 20.7 Cambios en el resto de la arquitectura

| Tema | Cambio |
|---|---|
| Módulo `auth` | Se reduce a `Registrarse` (con reglas de negocio), sincronización de perfil y guard de tokens. Se eliminan hash de contraseñas, emisión de JWT, refresh tokens y tokens de correo |
| Redis | Deja de guardar sesiones. Sigue para colas, contadores, idempotencia y rate limit |
| Salidas del backend | Se agrega `main-todo.ts` (API + worker en un proceso) para producción y dev; `main-http.ts` y `main-worker.ts` se mantienen para escalar |
| Balanceo | Una instancia; el diseño de 19.19 queda listo para cuando haya recursos |
| Variables de entorno | Nuevas: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (frontend), `SUPABASE_SERVICE_ROLE_KEY` (solo backend, nunca en el navegador), `SUPABASE_JWKS_URL`. Se eliminan `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` |
| Despliegue a producción | `promover-prod.yml` hace el fast-forward, migra contra Supabase y dispara el despliegue en Render con su *deploy hook*. Render reemplaza la instancia cuando la nueva responde |
| Pruebas E2E | Las semillas crean usuarios ya confirmados con la API de administración de Supabase; la verificación de correo se prueba generando el enlace con esa misma API, sin leer correos |

### 20.8 Cuentas necesarias (versión final)

| # | Plataforma | Uso |
|---|---|---|
| 1 | GitHub (+ Student Developer Pack) | Repositorio y CI/CD |
| 2 | Registrador de dominio (+ Cloudflare solo DNS, opcional) | Dominio |
| 3 | Supabase | Proyectos `impulsau-prod` e `impulsau-dev` |
| 4 | Resend o Brevo | SMTP para los correos de Supabase Auth (dominio verificado con SPF y DKIM) |
| 5 | Vercel | Frontend |
| 6 | Render | Backend de producción |
| 7 | Koyeb | Backend de dev y slot de preview |
| 8 | Neon | Bases de preview por PR |
| 9 | Upstash | Redis |
| 10 | Hugging Face | Servicio de IA |
| 11 | Bitwarden | Secretos del equipo |

---

## 21. Ajustes del esqueleto del repositorio

Al generar el repositorio inicial con las versiones vigentes (octubre de 2026) se ajustaron estos puntos. Prevalecen sobre lo anterior:

| Tema | Ajuste | Motivo |
|---|---|---|
| Node.js | **24** (`.nvmrc`), mínimo 22.22.3 | Requisito de las herramientas de NestJS 12 |
| NestJS | **12, solo ESM**: backend e IA con `"type": "module"`, `module`/`moduleResolution` `NodeNext` e imports relativos con extensión `.js` | NestJS 12 se publica únicamente como ESM |
| Build del backend | `nest build` con el compilador de TypeScript (no SWC) | Más simple y con soporte completo de metadata de decoradores |
| TypeScript | **6.0** | typescript-eslint aún no soporta TypeScript 7 |
| ESLint | **10** con `strict-type-checked`; la prohibición de `className`/`style` es una regla `no-restricted-syntax` propia | `eslint-plugin-react` no soporta ESLint 10 |
| Paquetes compartidos | `contracts` y `db` son ESM compilados con `tsc`; `ui` se consume como código fuente desde Vite | Una sola forma de módulos en todo el monorepo |
| pnpm | 10 (fijado en `packageManager`) | Versión estable conocida; el empaquetado usa `pnpm deploy --legacy` |
| Migraciones | Se aplican **al arrancar el contenedor** (`MIGRAR_AL_INICIAR=true`) con el candado de PostgreSQL; la primera migración crea las extensiones | Con una sola instancia por entorno es más simple y evita carreras entre el workflow y la plataforma |
| Conexiones a Supabase | App por el pooler en modo transacción; migraciones y respaldos por el pooler en modo sesión | La conexión directa del plan gratuito suele ser solo IPv6 |
| Imágenes | Backend e IA publicados en GHCR (públicos); Koyeb y Hugging Face los descargan. Render construye desde el `Dockerfile` en `main` | Una imagen por commit para dev y preview |

