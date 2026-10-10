# ImpulsaU — Pruebas extremo a extremo con Playwright

> **Versión:** 1.1 (fase 0) — Autenticación con Supabase Auth
> **Fecha:** 30 de septiembre de 2026
> **Relacionado:** criterios de aceptación por caso de uso, sección 19 de `impulsau-especificacion-tecnica-stack.md` (preview, CI y despliegue)

---

## 1. Objetivo y alcance

Las pruebas E2E verifican que los **flujos críticos** funcionan de punta a punta en un navegador real, contra el preview de cada PR, antes del merge. No reemplazan a las pruebas unitarias ni de integración: prueban lo que solo se ve cuando todo está conectado (frontend, API, WebSocket, colas, base y almacenamiento).

| Sí se prueba con Playwright | No se prueba con Playwright |
|---|---|
| Flujos completos de usuario (registro → publicar → recibir interés → chatear) | Cada regla de negocio (va en pruebas unitarias del dominio) |
| Tiempo real entre dos usuarios | Cada combinación de validación de formularios |
| Idempotencia visible (doble clic, reconexión) | Rendimiento (va en k6) |
| Accesibilidad de pantallas clave | Calidad de las respuestas del agente (va en su conjunto de preguntas) |
| Responsive y temas en pantallas clave | |

---

## 2. Ubicación y estructura

Un paquete propio del monorepo, con el mismo TypeScript estricto (cero `any`):

```
apps/e2e/
├── playwright.config.ts
├── pruebas/
│   ├── auth/              # Mismos nombres de módulo que backend y frontend
│   ├── proyectos/
│   ├── interacciones/
│   ├── conexiones/
│   ├── mensajeria/
│   ├── vacantes/
│   ├── avales/
│   ├── agente/
│   ├── moderacion/
│   └── transversales/     # accesibilidad, responsive, temas, estados de error
├── paginas/               # Page objects tipados por pantalla
├── fijaciones/            # Fixtures: usuarios por rol, API de semillas, dos navegadores
├── datos/                 # Generadores de datos únicos por prueba
└── configuracion-global.ts
```

---

## 3. Principios

| Principio | En la práctica |
|---|---|
| **Selectores accesibles** | `getByRole`, `getByLabel`, `getByText`. Como la UI usa HTML semántico (botones reales, `label` en campos, `aria-label` en íconos), los selectores accesibles funcionan y además prueban la accesibilidad. `data-testid` solo como último recurso justificado |
| **Aislamiento total** | Cada prueba crea sus propios usuarios y datos (correos únicos con UUID). Ninguna prueba depende de otra ni de un orden |
| **Paralelismo** | Gracias al aislamiento, todas las pruebas corren en paralelo |
| **Sin esperas fijas** | Prohibido `waitForTimeout`. Solo aserciones que esperan solas (`await expect(...).toBeVisible()`) |
| **Deterministas** | El agente de IA corre en **modo simulado** durante E2E (respuestas fijas por intención) para no depender del modelo real |
| **Nombres ligados a casos de uso** | `CU-22 · dar like dos veces cuenta una sola vez` |
| **Tipado estricto** | Page objects y fixtures tipados; los datos de semilla usan los tipos de `packages/contracts` |

---

## 4. Proyectos (dispositivos y temas)

| Proyecto | Viewport | Tema | Navegador | Cuándo corre |
|---|---|---|---|---|
| `escritorio-oscuro` | 1440 × 1024 | Oscuro | Chromium | Cada PR |
| `celular-oscuro` | 390 × 844 (táctil) | Oscuro | Chromium | Cada PR |
| `escritorio-claro` | 1440 × 1024 | Claro | Chromium | Nocturno |
| `tablet-oscuro` | 834 × 1194 (táctil) | Oscuro | Chromium | Nocturno |
| `celular-webkit` | 390 × 844 (táctil) | Oscuro | WebKit | Nocturno |
| `escritorio-firefox` | 1440 × 1024 | Oscuro | Firefox | Nocturno |

El tema se controla con la opción `colorScheme` de Playwright, que activa la preferencia del sistema que la app respeta.

---

## 5. Datos y autenticación

### 5.1 API de semillas

- Endpoints bajo `/test/semillas` que **solo existen** cuando la variable `HABILITAR_SEMILLAS_TEST` está activa (CI, preview y dev). En producción el módulo ni siquiera se registra.
- Protegidos con un token propio (`TOKEN_SEMILLAS_TEST`).
- Permiten crear en un paso lo que no es objeto de la prueba: talento con proyectos publicados, empresa ya verificada, docente verificado, vacante abierta.
- Los usuarios se crean en el proyecto `impulsau-dev` de **Supabase Auth** con su API de administración, ya confirmados, y su perfil en la base del preview.
- Para probar la verificación de correo y la recuperación de contraseña sin leer buzones, la API de semillas pide a Supabase el **enlace generado** y la prueba lo abre directamente.
- Los tipos de entrada y salida vienen de `packages/contracts`.

### 5.2 Sesiones por rol

- La configuración global crea (vía API de semillas) una cuenta base por rol: talento, empresa verificada, docente y administrador, y guarda su sesión (`storageState`).
- Las pruebas que **modifican** datos del usuario crean su propio usuario en la fixture, para no afectar a otras pruebas en paralelo.

### 5.3 Dos usuarios a la vez

Una fixture `dosUsuarios` abre **dos contextos de navegador** independientes (por ejemplo, empresa y talento) para probar tiempo real: interés mutuo, chat, notificaciones y cambios de estado de postulaciones.

### 5.4 Aislamiento por PR

En el preview, cada PR tiene su propia rama de Neon (sección 19.15 de la especificación técnica), así que los datos de prueba nunca contaminan dev.

---

## 6. Suites y casos

Etiquetas: `@humo` (mínimo vital), `@critico` (flujo de la demo), `@a11y`, `@visual`, `@completo`.

### 6.1 `auth`

| Prueba | Etiquetas |
|---|---|
| CU-01 · registro de talento completo lleva a completar perfil | `@humo` `@critico` |
| CU-01 · registro rechaza menor de 18 años con mensaje claro | `@completo` |
| CU-01 · no se puede crear cuenta sin la declaración de cero experiencia | `@critico` |
| CU-05 · inicio de sesión correcto e incorrecto (mensaje genérico) | `@humo` |
| CU-06 · cerrar sesión invalida el acceso a pantallas privadas | `@critico` |
| CU-07 · la sesión se renueva sola con dos pestañas abiertas sin cerrarse | `@completo` |
| CU-04 · el enlace de verificación activa la cuenta | `@critico` |
| CU-08 · el enlace de recuperación permite cambiar la contraseña | `@completo` |
| Un usuario creado directo en Supabase (sin pasar por el backend) no puede usar la plataforma | `@completo` |

### 6.2 `proyectos`

| Prueba | Etiquetas |
|---|---|
| CU-17 · publicar proyecto con dos imágenes: aparece en el feed y en el perfil | `@humo` `@critico` |
| CU-17 · la subida muestra progreso y rechaza archivos de más de 5 MB | `@completo` |
| CU-17 · al superar la cuota de 20 MB se muestra el aviso y no se sube | `@completo` |
| CU-17 · tecnologías solo del catálogo (autocompletado) | `@completo` |
| CU-18 · dos colaboradores editan a la vez: el segundo ve el aviso de conflicto | `@critico` |
| CU-20 · el feed carga con skeleton y luego contenido | `@completo` |

### 6.3 `interacciones`

| Prueba | Etiquetas |
|---|---|
| CU-22 · dar like actualiza el contador al instante | `@humo` |
| CU-22 · doble clic rápido cuenta un solo like (idempotencia) | `@critico` |
| CU-22 · el like persiste al recargar la página | `@critico` |
| CU-23 · comentar y responder a un comentario | `@completo` |

### 6.4 `conexiones` y `mensajeria`

| Prueba | Etiquetas |
|---|---|
| CU-29/31 · empresa muestra interés, talento lo recibe en tiempo real y acepta: se abre el chat en ambos lados | `@critico` |
| CU-29 · interés mutuo simultáneo crea una sola conversación | `@completo` |
| CU-32 · mensaje enviado aparece en el otro navegador sin recargar | `@critico` |
| CU-32 · sin conexión (`context.setOffline`) el mensaje queda pendiente y se envía al reconectar, sin duplicarse | `@critico` |
| CU-34 · el remitente ve "Leído" cuando el otro abre la conversación | `@completo` |

### 6.5 `vacantes`

| Prueba | Etiquetas |
|---|---|
| CU-40 · empresa verificada publica vacante; empresa no verificada no puede | `@critico` |
| CU-43 · talento se postula adjuntando dos proyectos | `@humo` `@critico` |
| CU-43 · no se puede postular dos veces a la misma vacante | `@completo` |
| CU-44 · empresa mueve la postulación a entrevista y el talento recibe la notificación en tiempo real | `@critico` |
| CU-46 · descartar exige elegir un motivo y el talento lo ve | `@completo` |

### 6.6 `avales`

| Prueba | Etiquetas |
|---|---|
| CU-49/50 · talento solicita aval, docente lo aprueba y el sello aparece en el proyecto | `@critico` |
| CU-51 · docente revoca un aval y el sello desaparece | `@completo` |

### 6.7 `agente` (modo simulado)

| Prueba | Etiquetas |
|---|---|
| CU-36 · talento pregunta y ve skeleton, luego respuesta estructurada con brechas y proyecto sugerido | `@critico` |
| CU-37 · empresa busca en lenguaje natural y obtiene candidatos con motivo | `@critico` |
| CU-36 · cola llena (429) muestra el aviso de asistente ocupado | `@completo` |
| CU-39 · calificar respuesta como útil | `@completo` |

### 6.8 `moderacion`

| Prueba | Etiquetas |
|---|---|
| CU-25/55 · un reporte llega a la cola y al ocultarlo el contenido deja de verse | `@completo` |
| CU-54 · administrador aprueba una empresa y esta puede publicar vacantes | `@critico` |

### 6.9 `transversales`

| Prueba | Etiquetas |
|---|---|
| Accesibilidad con `@axe-core/playwright` en login, registro, feed, perfil, detalle, vacante, chat y asistente: falla con violaciones graves o críticas | `@a11y` |
| Navegación completa con teclado en registro y publicación de proyecto | `@a11y` |
| Navegación correcta por dispositivo: barra superior, riel lateral o barra inferior | `@completo` |
| Estados de error simulados con `page.route` (sin conexión, 409, subida fallida) | `@completo` |
| Capturas de referencia de pantallas clave por dispositivo y tema | `@visual` |

### 6.10 Flujo de la demo (una sola prueba larga)

`@critico` — reproduce la historia que verá el jurado: un talento se registra, publica un proyecto, un docente lo avala, una empresa lo encuentra con el asistente, muestra interés, el talento acepta, conversan, se postula, pasa a entrevista y marca "conseguí mi primer empleo". Si esta prueba pasa, la demo funciona.

---

## 7. Ejecución en CI

| Momento | Qué corre | Proyectos | Contra |
|---|---|---|---|
| Cada PR (tras el preview) | `@humo` + `@critico` | `escritorio-oscuro`, `celular-oscuro` | Preview de Vercel + slot de backend |
| Merge a `develop` | `@humo` | `escritorio-oscuro` | Dev |
| Nocturno | Todo (`@completo`, `@a11y`, `@visual`) | Todos | Dev |
| Tras promover a producción | `@humo` de **solo lectura** (sin crear datos) | `escritorio-oscuro` | Producción |

**Detalles del workflow `e2e-preview.yml`:**

- Se dispara cuando Vercel termina el preview y espera a que el slot de backend responda en `/salud`.
- Si el preview de Vercel está protegido, usa el mecanismo de *bypass* para automatización de Vercel con un secreto, en lugar de desactivar la protección.
- Usa la imagen Docker oficial de Playwright para que navegadores y fuentes sean idénticos en cada ejecución (necesario para las capturas `@visual`).
- Reintentos: 2 en CI, 0 en local.
- Evidencias: `trace` en el primer reintento, video y captura solo si falla. El reporte HTML se sube como artefacto y el bot comenta en el PR un resumen con el enlace.
- El check de E2E es **obligatorio** para hacer merge a `develop`.

---

## 8. Ejemplo de estructura tipada

```ts
// apps/e2e/pruebas/interacciones/likes.spec.ts
import { test, expect } from '../../fijaciones';

test('CU-22 · doble clic rápido cuenta un solo like @critico', async ({ page, semillas }) => {
  const proyecto = await semillas.proyectoPublicado();
  await page.goto(`/proyectos/${proyecto.id}`);

  const boton = page.getByRole('button', { name: /me gusta/i });
  await boton.dblclick();

  await expect(boton).toHaveAccessibleName('Me gusta, 1');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Me gusta, 1' })).toBeVisible();
});
```

La fixture `semillas` está tipada con los esquemas de `packages/contracts`, así que `proyecto.id` es un `ProyectoId` y no un `any`.

---

## 9. Política contra pruebas inestables

- Una prueba que falla de forma intermitente se marca `@cuarentena` en el mismo día, sale del check obligatorio y se abre una tarea para arreglarla en menos de 48 horas.
- Nunca se "arregla" una prueba inestable agregando esperas fijas.
- El reporte nocturno muestra las pruebas que necesitaron reintentos, para detectarlas antes de que fallen.

---

## 10. Pendientes

| # | Pendiente | Fecha límite |
|---|---|---|
| 1 | Definir el modo simulado del agente (respuestas fijas por intención) | 3 oct |
| 2 | Contrato de la API de semillas en `packages/contracts` | 3 oct |
| 3 | Plantilla del paquete `apps/e2e` con configuración y fixtures | Semana 1 |
| 4 | Capturas de referencia iniciales para `@visual` | Cuando las pantallas estén implementadas |
