# apps/backend

NestJS 12 sobre Fastify, solo ESM (`NodeNext`, imports relativos con extensión `.js`). Estructura por módulos con hexágono en `src/modulos/<modulo>/{dominio,aplicacion,puertos,infraestructura,http,trabajos}`.

- El dominio no importa NestJS ni infraestructura; la aplicación solo usa `@Injectable` e `@Inject`. `pnpm arquitectura` lo verifica.
- Puertos con tokens, controladores delgados, resultados en lugar de excepciones para errores esperados.
- Procesadores de colas solo en `*.worker.module.ts`; controladores y gateways solo en `*.http.module.ts`.
- Sin estado en memoria ni `setInterval`.
