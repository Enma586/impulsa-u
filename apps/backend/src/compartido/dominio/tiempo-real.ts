export const CIERRE_CONEXIONES = Symbol('CierreConexiones');

/** Cierra las conexiones en vivo (Socket.IO) de una sesión o de un usuario, en todas las réplicas. */
export interface CierreConexiones {
  cerrarSesion(sesionId: string): void;
  cerrarUsuario(usuarioId: string): void;
}
