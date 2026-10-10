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

Almacenamiento y autenticación se toman de Supabase dev; no se replican en local.

## Comandos

| Comando             | Qué hace                                                    |
| ------------------- | ----------------------------------------------------------- |
| `pnpm typecheck`    | `tsc --noEmit` en todo el monorepo                          |
| `pnpm test`         | Pruebas (Vitest)                                            |
| `pnpm lint`         | ESLint (cero `any`, sin `className` fuera de `packages/ui`) |
| `pnpm arquitectura` | dependency-cruiser: reglas hexagonales                      |
| `pnpm formato`      | Prettier                                                    |
| `pnpm verificar`    | Todo lo anterior                                            |
| `pnpm infra:abajo`  | Detiene PostgreSQL y Redis                                  |
