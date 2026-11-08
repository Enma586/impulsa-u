import type { mensajeria } from '@impulsau/contracts';

export const CIERRE_CONEXIONES = Symbol('CierreConexiones');

/** Cierra las conexiones en vivo (Socket.IO) de una sesión o de un usuario, en todas las réplicas. */
export interface CierreConexiones {
  cerrarSesion(sesionId: string): void;
  cerrarUsuario(usuarioId: string): void;
}

export const EMISOR_TIEMPO_REAL = Symbol('EmisorTiempoReal');

type Evento = keyof mensajeria.EventosServidorACliente;
type DatosEvento<E extends Evento> = Parameters<mensajeria.EventosServidorACliente[E]>;

/** Envía un evento a las conexiones de un usuario o de una conversación, en todas las réplicas. */
export interface EmisorTiempoReal {
  aUsuario<E extends Evento>(usuarioId: string, evento: E, ...datos: DatosEvento<E>): void;
  aConversacion<E extends Evento>(
    conversacionId: string,
    evento: E,
    ...datos: DatosEvento<E>
  ): void;
}
