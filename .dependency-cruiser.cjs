const modulos = '^apps/backend/src/modulos';
const librerias =
  'node_modules/(@nestjs/(?!common)|drizzle-orm|ioredis|bullmq|fastify|postgres|pg|@supabase)';

/** Reglas hexagonales de la sección 6.3 de la especificación técnica. */
module.exports = {
  forbidden: [
    {
      name: 'dominio-solo-dominio',
      comment: 'El dominio solo importa su propio dominio y compartido/dominio.',
      severity: 'error',
      from: { path: `${modulos}/([^/]+)/dominio` },
      to: {
        dependencyTypes: ['local'],
        pathNot: [`${modulos}/$1/dominio`, '^apps/backend/src/compartido/dominio'],
      },
    },
    {
      name: 'dominio-sin-librerias',
      comment: 'El dominio es TypeScript puro: no importa paquetes externos.',
      severity: 'error',
      from: { path: `${modulos}/[^/]+/dominio` },
      to: { dependencyTypesNot: ['local', 'core'] },
    },
    {
      name: 'aplicacion-sin-adaptadores',
      comment: 'La aplicación usa puertos, nunca infraestructura, http ni trabajos.',
      severity: 'error',
      from: { path: `${modulos}/[^/]+/aplicacion` },
      to: { path: `${modulos}/[^/]+/(infraestructura|http|trabajos)` },
    },
    {
      name: 'aplicacion-sin-librerias-de-infraestructura',
      comment:
        'De NestJS solo @nestjs/common; nada de Drizzle, Redis, Fastify, BullMQ ni Supabase.',
      severity: 'error',
      from: { path: `${modulos}/[^/]+/aplicacion` },
      to: { path: librerias },
    },
    {
      name: 'infraestructura-sin-http',
      severity: 'error',
      from: { path: `${modulos}/[^/]+/infraestructura` },
      to: { path: `${modulos}/[^/]+/http` },
    },
    {
      name: 'http-sin-infraestructura',
      comment: 'Los controladores llaman casos de uso, no adaptadores.',
      severity: 'error',
      from: { path: `${modulos}/[^/]+/http` },
      to: { path: `${modulos}/[^/]+/infraestructura` },
    },
    {
      name: 'modulo-solo-por-index',
      comment: 'Un módulo solo importa el index.ts de otro, nunca sus carpetas internas.',
      severity: 'error',
      from: { path: `${modulos}/([^/]+)/` },
      to: {
        path: `${modulos}/[^/]+/`,
        pathNot: [`${modulos}/$1/`, `${modulos}/[^/]+/index\.ts$`],
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)(dist|\.turbo)/' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      extensions: ['.ts', '.tsx', '.js'],
    },
  },
};
