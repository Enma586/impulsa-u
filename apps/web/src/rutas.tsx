import { Contenedor, Pila } from '@impulsau/ui';
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';
import { Galeria } from './galeria';
import { PaginaRegistro } from './modulos/auth/registro/PaginaRegistro';

const raiz = createRootRoute({ component: Outlet });

const inicio = createRoute({
  getParentRoute: () => raiz,
  path: '/',
  component: function Inicio() {
    return (
      <Contenedor ancho="medio">
        <Pila espacio={16}>
          <h1>ImpulsaU</h1>
          <p>Tu trayectoria, con evidencia.</p>
        </Pila>
      </Contenedor>
    );
  },
});

const componentes = createRoute({
  getParentRoute: () => raiz,
  path: '/componentes',
  component: Galeria,
});

const registro = createRoute({
  getParentRoute: () => raiz,
  path: '/registro',
  component: PaginaRegistro,
});

export const router = createRouter({
  routeTree: raiz.addChildren([inicio, registro, componentes]),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
