# ImpulsaU

Plataforma que conecta talento sin experiencia laboral con empresas que contratan perfiles de entrada. Documentación en [`docs/`](docs/); reglas para agentes en [`AGENTS.md`](AGENTS.md).

## Levantar el entorno

Requisitos: Node 24 y Docker.

```bash
npm i -g pnpm@10.34.6                            # 1. gestor de paquetes
pnpm install                                     # 2. dependencias y hooks de git
pnpm infra:arriba                                # 3. PostgreSQL (pgvector) y Redis en Docker
cp apps/backend/.env.example apps/backend/.env   # 4. variables (completar valores)
pnpm verificar                                   # 5. tipos, lint, arquitectura y formato
```

Almacenamiento y autenticación se toman de Supabase dev; no se replican en local. Las pruebas del backend usan el Redis de Docker (`REDIS_URL`, por defecto `redis://localhost:6379`): levántalo con `pnpm infra:arriba` antes de `pnpm test`.

## Correr la app en local

Con el entorno levantado (sección anterior), `apps/backend/.env` completo y el proyecto de Supabase dev activo (el plan gratuito lo pausa tras unos días sin uso: se reactiva desde su panel):

```bash
pnpm --filter @impulsau/db migrar      # aplica las migraciones en Supabase dev
pnpm --filter @impulsau/db sembrar     # catálogos: habilidades, carreras e instituciones (se puede repetir)
pnpm --filter @impulsau/backend dev    # API en http://localhost:3000 (/salud, /salud/listo)
pnpm --filter @impulsau/web dev        # frontend en http://localhost:5173
```

`CORS_ORIGIN` en el `.env` del backend debe ser `http://localhost:5173`. El frontend usa `VITE_API_URL` (por defecto `http://localhost:3000`). Para crear usuarios hay que confirmar el correo con el enlace que envía Supabase, así que para registrar cuentas reales hace falta configurar el SMTP (Brevo).

Para tener datos de demostración sin pasar por el correo, el backend trae una historia coherente (una empresa verificada, tres talentos con proyectos, likes, vacantes y postulaciones). Crea cuentas ya confirmadas en Supabase con tu llave de servicio, así que corre solo contra el proyecto dev y con tu autorización:

```bash
DEMO_CONTRASENA='<mínimo 10 caracteres>' pnpm --filter @impulsau/backend demo
```

Inicias sesión con `empresa@`, `ana@`, `luis@` o `sofia@` (dominio `demo.impulsau.test`) y esa contraseña. Si la empresa ya existe, el comando no cambia nada. El bucket público `archivos` de Supabase Storage se crea al primer uso.

La versión local cubre: inicio y cierre de sesión, registro de empresa y de talento, perfiles (con evidencia de habilidades), publicar proyectos con imágenes, feed con likes, vacantes y postulaciones con tablero para la empresa. No incluye el agente de IA ni el chat en tiempo real.

Para probar la imagen del backend como en producción:

```bash
docker compose -f infra/docker-compose.yml --profile app up --build   # backend en http://localhost:3000
```

En producción, `TRUST_PROXY=1` (un proxy delante); en local se deja en `0`. `render.yaml` describe el despliegue del backend en Render (imagen Docker y Redis); los valores secretos se cargan en su panel y `VITE_API_URL` en Vercel.

## Comandos

| Comando                      | Qué hace                                                                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`             | `tsc --noEmit` en todo el monorepo                                                                                                                                    |
| `pnpm test`                  | Pruebas (Vitest)                                                                                                                                                      |
| `pnpm lint`                  | ESLint (cero `any`, sin `className` fuera de `packages/ui`)                                                                                                           |
| `pnpm arquitectura`          | dependency-cruiser: reglas hexagonales                                                                                                                                |
| `pnpm verificar-migraciones` | Migraciones: sin esquema pendiente, consistentes, inmutables, sin operaciones destructivas y aplicables desde cero (necesita Postgres del compose y `origin/develop`) |
| `pnpm formato`               | Prettier                                                                                                                                                              |
| `pnpm verificar`             | Todo lo anterior                                                                                                                                                      |
| `pnpm infra:abajo`           | Detiene PostgreSQL y Redis                                                                                                                                            |
