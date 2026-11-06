# Pendientes para la demo con el cliente

Actualizado: 2026-11-05. Rama de trabajo: `feat/nucleo-demo-local` (PR #22 abierto).

## Estado actual

- Datos de presentación cargados en Supabase dev (4 empresas, 12 talentos, 17 proyectos, 10 vacantes, 13 postulaciones). Código en `apps/backend/src/demo/historia-presentacion.ts`.
- App corriendo solo en local (`localhost:5173` y `localhost:3000`). Nada está desplegado todavía.
- Cambios de código **sin commit**: `historia.ts`, `sembrar-demo.ts`, `historia-presentacion.ts`, `main-demo.ts`, `packages/db/src/catalogos-iniciales.ts`.

Cargar los datos (solo contra Supabase dev, con autorización):

```bash
DEMO_HISTORIA=presentacion DEMO_CONTRASENA='<mín. 10 caracteres>' pnpm --filter @impulsau/backend demo
```

Si cambia el catálogo, antes: `pnpm --filter @impulsau/db sembrar`. No recompilar `db` mientras corre el backend en `dev` (se cae).

## Pendiente, en orden

### 1. Limpiar la demo

- [ ] Borrar las cuentas y datos del seed básico (`ana@`, `luis@`, `sofia@`, `empresa@` en `demo.impulsau.test`). Hoy el feed muestra 21 proyectos y 11 vacantes en lugar de 17 y 9. Requiere visto bueno: es destructivo.
- [ ] Cambiar la contraseña `pepe123456` si la URL va a ser pública.
- [ ] Decidir si se quita la regla de `AGENTS.md` sobre no inventar cifras/empresas para este seed, o si se pasa a marcadores.

### 2. Código a `main`

- [ ] Fusionar PR #21 (`chore/sincronizar-main` → `develop`) con _Create a merge commit_. Comprobar: `gh api repos/Enma586/impulsa-u/compare/develop...main --jq .behind_by` debe dar 0.
- [ ] Rama nueva desde `develop` con los datos de presentación (PR propio, sin los cambios de otras tareas que hay sin commit en la rama actual).
- [ ] Fusionar PR #22 (núcleo de la demo) en `develop`.
- [ ] Promover `develop` a `main` con PR (no existe `promover-prod.yml`; hace falta bypass en el ruleset `proteger-main` para el fast-forward).

### 3. Backend en Render

- [ ] _New → Blueprint_ sobre el repo (lee `render.yaml`: servicio Docker + Redis).
- [ ] Cargar en el panel: `DATABASE_URL`, `DATABASE_URL_MIGRACIONES`, `SUPABASE_URL`, `SUPABASE_JWKS_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_SERVICE_URL`, `AI_SERVICE_TOKEN`.
- [ ] `CORS_ORIGIN` = URL exacta del frontend en Vercel, sin `/` final. `TRUST_PROXY=1` ya viene en el archivo.
- [ ] Comprobar `/salud` y `/salud/listo`. El plan gratuito se duerme: despertarlo antes de la reunión.

### 4. Frontend en Vercel

- [ ] Importar el repo con _Root Directory_ = `apps/web`.
- [ ] Definir `VITE_API_URL` con la URL pública de Render y redesplegar (Vite la incrusta al compilar).
- [ ] En Supabase → _Authentication → URL Configuration_: agregar la URL de Vercel como _Site URL_ y a las redirecciones permitidas.
- [ ] Declarar `VITE_API_URL` en `turbo.json` (avisos de Turborepo en Vercel).

### 5. Revisión antes de la reunión

- [ ] Recorrer la demo con una cuenta de talento y una de empresa en la URL desplegada.
- [ ] Revisión visual en modo claro, celular y tablet (solo se hizo en oscuro).
- [ ] Las tarjetas de proyecto no tienen imágenes (la subida es por URL prefirmada): decidir si se suben portadas a mano.
- [ ] Probar login desde un navegador limpio (sin sesión previa).

## Después de la demo

- Brevo (SMTP) para registro real contra Supabase dev.
- Job de E2E en CI.
- T-05 (promoción a producción) y roles de BD separados.
- Siguiente en backlog: B-07 (catálogos) y B-08 (editar perfil).
