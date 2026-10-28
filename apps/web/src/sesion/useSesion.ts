import type { auth } from '@impulsau/contracts';
import { useSyncExternalStore } from 'react';
import { almacenSesion } from './almacen';

/** Sesión actual del navegador; `null` si no hay una iniciada. */
export function useSesion(): auth.Sesion | null {
  return useSyncExternalStore(almacenSesion.suscribir, almacenSesion.obtener);
}

/** Usuario de la sesión; solo se usa dentro de las rutas protegidas. */
export function useUsuario(): auth.UsuarioSesion {
  const sesion = useSesion();
  if (!sesion) throw new Error('useUsuario se usó fuera de una ruta protegida');
  return sesion.usuario;
}
