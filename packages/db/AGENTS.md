# packages/db

Esquema Drizzle en `src/esquema/` (un archivo por agregado) y migraciones.

- Tablas y columnas en español y `snake_case`; UUID v7; `timestamptz`.
- Migraciones hacia adelante y compatibles hacia atrás; nunca se edita una ya aplicada.
- Solo se modifica con una tarea aprobada por la persona arquitecta.
