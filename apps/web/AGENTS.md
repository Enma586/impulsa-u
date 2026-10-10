# apps/web

React + Vite, TanStack Router y Query, React Hook Form con Zod. Módulos espejo del backend.

- Ningún `className` ni `style`: solo componentes de `packages/ui`.
- Los tipos salen de `packages/contracts`; nada de tipos duplicados a mano.
- Cada pantalla con datos tiene esqueleto, vacío y error. Nunca consulta la base: todo pasa por el backend.
