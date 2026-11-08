import type { ActorMensajeria } from './errores.js';

/** Solo empresas y talentos conversan; docentes y administradores no tienen conversaciones. */
export function comoActor(usuario: {
  id: string;
  rol: 'talento' | 'empresa' | 'docente' | 'admin';
}): ActorMensajeria | null {
  return usuario.rol === 'empresa' || usuario.rol === 'talento'
    ? { id: usuario.id, rol: usuario.rol }
    : null;
}
