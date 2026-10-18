# ImpulsaU — Guía de creación y conexión de plataformas

> **Versión:** 1.0 · **Fecha:** 3 de octubre de 2026
> **Base:** especificación técnica, secciones 20 (Supabase) y 19 (CI/CD)
> **Nota:** los paneles de cada plataforma cambian de diseño con frecuencia; si un menú no está donde se indica, búsquenlo por su nombre en la configuración.

---

## 0. Orden y dependencias

| Paso | Plataforma | Se puede hacer ya | Necesita que el repositorio tenga código |
|---|---|---|---|
| 1 | GitHub | Sí | — |
| 2 | Dominio y DNS | Sí | — |
| 3 | Supabase (prod y dev) | Sí | — |
| 4 | Resend o Brevo + SMTP en Supabase | Sí | — |
| 5 | Neon | Sí | — |
| 6 | Upstash | Sí | — |
| 7 | Hugging Face | Sí (Space vacío) | Para el primer despliegue |
| 8 | Vercel | Cuenta sí | Sí: el proyecto se importa cuando exista `apps/web` |
| 9 | Render | Cuenta sí | Sí: el servicio se crea cuando exista el `Dockerfile` del backend |
| 10 | Koyeb | Cuenta sí | Sí: igual que Render |
| 11 | GitHub Environments (secretos) | Sí, a medida que se obtienen las llaves | — |

Todo lo que se obtiene en cada paso se guarda **de inmediato** en Bitwarden, en una colección por plataforma y entorno.

---

## 1. GitHub

1. Organización `impulsau` con al menos dos dueños.
2. Repositorio **privado** `impulsau`, vacío (sin README ni licencia), para que el equipo suba su monorepo sin conflictos.
3. Ramas: `main` (por defecto) y `develop`.
4. *Settings → Environments*:
   - `dev`: sin aprobación.
   - `production`: **revisor obligatorio** (persona arquitecta) y restringido a la rama `main`.
5. *Settings → Rules*: crear los rulesets de `develop` y `main` (sección 19.17 de la especificación). Los checks obligatorios se agregan cuando los workflows existan y hayan corrido una vez.
6. *Settings → Actions*: permitir que los workflows creen comentarios en PRs y publiquen paquetes en GitHub Container Registry.
7. Activar **Dependabot** para alertas de seguridad.

## 2. Dominio y DNS

1. Comprar `impulsau.[tld]`.
2. Si usan Cloudflare para el DNS, cambiar los *nameservers* del registrador a los que indique Cloudflare.
3. Los registros se van agregando en los pasos siguientes. Al final deben quedar:

| Registro | Tipo | Apunta a | Se agrega en |
|---|---|---|---|
| `impulsau.[tld]` | A / CNAME (según Vercel) | Vercel (producción) | Paso 8 |
| `www` | CNAME | Vercel | Paso 8 |
| `dev` | CNAME | Vercel (rama `develop`) | Paso 8 |
| `api` | CNAME | Render | Paso 9 |
| `api-dev` | CNAME | Koyeb (dev) | Paso 10 |
| `api-preview` | CNAME | Koyeb (slot de preview) | Paso 10 |
| Registros del correo (SPF, DKIM, DMARC) | TXT / CNAME | Resend o Brevo | Paso 4 |

> Si usan Cloudflare, los registros que apuntan a Vercel, Render y Koyeb van **sin proxy** (nube gris), para que cada plataforma emita su propio certificado.

## 3. Supabase

Crear **dos proyectos** en la misma organización y región (una región de EE. UU. cercana a El Salvador): `impulsau-prod` e `impulsau-dev`. Guardar la contraseña de la base de cada uno en Bitwarden al crearlo.

Repetir en **ambos** proyectos:

| Sección | Configuración |
|---|---|
| Database → Extensions | Habilitar `vector`, `pg_trgm` y `citext` |
| Database → Roles | Crear dos roles: uno para la aplicación (lectura y escritura de datos, sin permisos sobre el esquema) y otro para migraciones (puede alterar el esquema) |
| API / Data API | Quitar `public` de los esquemas expuestos (o desactivar la API de datos), para que la llave pública no dé acceso a las tablas |
| Storage | Buckets `publico` (público) y `privado` (privado), con límite de tamaño de 5 MB por archivo y tipos permitidos: JPG, PNG, WebP y PDF |
| Storage → S3 | Generar llaves de acceso S3 para el backend |
| Authentication → Providers | Correo y contraseña activado; **confirmación de correo obligatoria**; longitud mínima de contraseña 10 |
| Authentication → URL Configuration | Ver tabla de URLs abajo |
| Authentication → Email Templates | Plantillas en español con la identidad de ImpulsaU: confirmar correo, recuperar contraseña y cambio de correo |
| Authentication → Rate Limits | Revisar los límites de envío y de intentos tras configurar el SMTP |
| Authentication → SMTP | Ver paso 4 |

**URLs de Auth:**

| Proyecto | Site URL | Redirect URLs |
|---|---|---|
| `impulsau-prod` | `https://impulsau.[tld]` | `https://impulsau.[tld]/**` |
| `impulsau-dev` | `https://dev.impulsau.[tld]` | `https://dev.impulsau.[tld]/**`, el patrón de los previews de Vercel del proyecto y `http://localhost:5173/**` |

**Datos a guardar en Bitwarden por proyecto:** URL del proyecto, llave `anon`, llave `service_role`, URL de JWKS, cadena de conexión del pooler (modo sesión) con el rol de la aplicación, cadena de conexión **directa** con el rol de migraciones, llaves S3 y endpoint S3.

## 4. Resend o Brevo (SMTP)

1. Crear la cuenta y agregar el dominio `impulsau.[tld]`.
2. Copiar los registros SPF, DKIM (y DMARC si lo ofrecen) al DNS y esperar a que queden verificados.
3. Crear credenciales SMTP.
4. En **cada proyecto de Supabase** (*Authentication → SMTP*): activar SMTP personalizado con host, puerto, usuario y contraseña del proveedor; remitente `no-responder@impulsau.[tld]` y nombre "ImpulsaU".
5. Prueba: registrar un usuario de prueba en `impulsau-dev` con un correo **fuera del equipo** (Gmail y Outlook) y confirmar que llega a la bandeja principal.

## 5. Neon

1. Proyecto `impulsau-preview` en la misma región de EE. UU.
2. Habilitar `vector`, `pg_trgm` y `citext` en la rama principal.
3. Esa rama principal será la **base de preview**: se le aplican las migraciones de `develop` y los seeds de demostración; cada PR crea una rama a partir de ella.
4. Crear una API key y guardar el ID del proyecto.

## 6. Upstash

1. Tres bases de Redis en la región más cercana a Supabase: `impulsau-prod`, `impulsau-dev` e `impulsau-preview`.
2. Activar TLS (las URLs empiezan con `rediss://`).
3. Guardar la URL de conexión de cada una.

## 7. Hugging Face

1. Organización `impulsau`.
2. Space `impulsau-ai`: tipo **Docker**, hardware **CPU básico** gratuito, visibilidad **privada**.
3. En la configuración del Space, agregar como secretos los tokens de servicio aceptados (uno para prod y otro para dev).
4. Crear un token de acceso con permiso de escritura para el workflow `deploy-ai.yml`.

## 8. Vercel

Cuando el repositorio tenga `apps/web`:

1. *Add New → Project* e importar el repositorio `impulsau`.
2. **Root Directory:** `apps/web`. **Framework:** Vite. El comando de instalación y de build los define el equipo según su configuración de pnpm y Turborepo.
3. **Production Branch:** `main`.
4. Variables de entorno (ver tabla de abajo), separadas por entorno, con la variante de **Preview para la rama `develop`**.
5. *Settings → Domains*: agregar `impulsau.[tld]` y `www` (producción) y `dev.impulsau.[tld]` asignado a la rama `develop`. Copiar al DNS los registros que indique Vercel.
6. *Settings → Git*: activar el paso de build ignorado cuando no haya cambios que afecten a `apps/web`.
7. *Deployment Protection*: si los previews quedan protegidos, crear el secreto de **bypass para automatización** y guardarlo para las pruebas E2E.

| Variable | Production | Preview (todas) | Preview (`develop`) |
|---|---|---|---|
| `VITE_API_URL` | `https://api.impulsau.[tld]` | `https://api-preview.impulsau.[tld]` | `https://api-dev.impulsau.[tld]` |
| `VITE_WS_URL` | `wss://api.impulsau.[tld]` | `wss://api-preview.impulsau.[tld]` | `wss://api-dev.impulsau.[tld]` |
| `VITE_SUPABASE_URL` | `impulsau-prod` | `impulsau-dev` | `impulsau-dev` |
| `VITE_SUPABASE_ANON_KEY` | anon de prod | anon de dev | anon de dev |

## 9. Render (backend de producción)

Cuando exista el `Dockerfile` del backend:

1. *New → Web Service* desde una **imagen existente** de GitHub Container Registry (la imagen que publica el CI), o desde el repositorio con el `Dockerfile` de `apps/backend`. Recomendado: imagen, para desplegar exactamente la misma que se probó en dev.
2. Plan gratuito, misma región de EE. UU.
3. Comando de arranque: la salida `main-todo` (API y worker en un proceso).
4. **Health check path:** `/salud`.
5. **Auto-deploy desactivado**: solo despliega `promover-prod.yml` mediante el *deploy hook*.
6. Variables de entorno de producción (sección "Render y Koyeb" de la guía de variables).
   Incluye `TRUST_PROXY=1` (un proxy delante): sin él, el límite de tasa vería la IP del proxy de Render para todos los clientes.
7. *Settings → Custom Domains*: `api.impulsau.[tld]` y su registro en el DNS.
8. Copiar el **Deploy Hook URL** a GitHub (`production`).

## 10. Koyeb (dev y slot de preview)

Cuando exista el `Dockerfile` del backend:

1. Servicio `impulsau-api-dev`: imagen de GHCR con la etiqueta de `develop`, salida `main-todo`, health check `/salud`, variables de dev, dominio `api-dev.impulsau.[tld]`. Con `TRUST_PROXY=1`, igual que en el servicio de preview.
2. Servicio `impulsau-api-preview`: igual, con variables de preview y dominio `api-preview.impulsau.[tld]`. Su `DATABASE_URL` la actualiza el workflow `preview-backend.yml` en cada PR.
3. Crear un token de API para los workflows.

> Si el plan gratuito de Koyeb no permite dos servicios en la misma cuenta, el slot de preview va en una segunda organización de Koyeb o en Render (con su propio límite de horas).

## 11. GitHub Environments: secretos

| Secreto | `dev` | `production` |
|---|---|---|
| `DATABASE_URL_MIGRACIONES` | Supabase dev (conexión directa, rol de migraciones) | Supabase prod (conexión directa, rol de migraciones) |
| `NEON_API_KEY`, `NEON_PROJECT_ID` | ✓ | — |
| `KOYEB_TOKEN` | ✓ | — |
| `SUPABASE_URL_DEV`, `SUPABASE_SERVICE_ROLE_KEY_DEV` | ✓ (semillas y E2E) | — |
| `TOKEN_SEMILLAS_TEST` | ✓ | — |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | ✓ | — |
| `RENDER_DEPLOY_HOOK_URL` | — | ✓ |
| `HF_TOKEN` | — | ✓ |
| Credenciales del destino del respaldo semanal | — | ✓ |
| URLs de Supabase prod y dev para `mantener-activo.yml` | ✓ | ✓ |

Las variables **de ejecución** del backend no van aquí: van en Render y Koyeb.

---

## 12. Mapa de conexiones final

| Desde | Hacia | Cómo |
|---|---|---|
| GitHub | Vercel | Integración de Git (previews y producción automáticos) |
| GitHub Actions | GHCR | Publica la imagen del backend por commit |
| GitHub Actions | Supabase dev / prod | Migraciones con conexión directa |
| GitHub Actions | Neon | Crea y borra ramas por PR |
| GitHub Actions | Koyeb | Actualiza dev y el slot de preview |
| GitHub Actions | Render | Deploy hook al promover a producción |
| GitHub Actions | Hugging Face | Sincroniza `apps/ai` |
| Vercel (frontend) | Supabase Auth | Inicio de sesión y renovación de sesión (llave `anon`) |
| Vercel (frontend) | Backend | REST y WebSocket |
| Navegador | Supabase Storage | Subida directa con URL prefirmada |
| Backend | Supabase (base, Auth admin, Storage) | Pooler, `service_role`, S3 |
| Backend | Upstash | Colas, contadores, idempotencia, rate limit |
| Backend (worker) | Hugging Face | Embeddings, interpretación y redacción |
| Supabase Auth | Resend o Brevo | SMTP de los correos de cuenta |

## 13. Lista de verificación final

- [ ] Correo de verificación de Supabase dev llega a Gmail y Outlook (no a spam).
- [ ] Extensiones activas en los dos proyectos de Supabase y en Neon.
- [ ] La API de datos de Supabase no expone tablas de `public`.
- [ ] Buckets `publico` y `privado` creados con límites de tamaño y tipo.
- [ ] Todos los secretos están en Bitwarden y en su lugar correspondiente.
- [ ] `production` en GitHub exige revisor.
- [ ] Un cambio trivial viaja solo desde una rama hasta producción pasando por preview, dev y aprobación (cuando exista código).
