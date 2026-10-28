import { ProveedorTema } from '@impulsau/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { clienteConsultas } from './api/clienteConsultas';
import { router } from './rutas';

const raiz = document.getElementById('raiz');

if (raiz) {
  createRoot(raiz).render(
    <StrictMode>
      <ProveedorTema>
        <QueryClientProvider client={clienteConsultas}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ProveedorTema>
    </StrictMode>,
  );
}
