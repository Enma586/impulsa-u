import { QueryClient } from '@tanstack/react-query';

/** Caché de consultas compartida: se vacía al cerrar sesión para no mezclar usuarios. */
export const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } },
});
