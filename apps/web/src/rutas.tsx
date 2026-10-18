import { Contenedor, Pila } from '@impulsau/ui';
import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';

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

export const router = createRouter({ routeTree: raiz.addChildren([inicio]) });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
