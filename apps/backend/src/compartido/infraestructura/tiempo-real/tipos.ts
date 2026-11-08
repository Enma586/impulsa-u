import type { mensajeria } from '@impulsau/contracts';
import type { Server, Socket } from 'socket.io';
import type { auth } from '@impulsau/contracts';

/** Lo que el handshake deja en `socket.data` una vez validado el token. */
export interface DatosSocket {
  usuarioId: string;
  sesionId: string | null;
  rol: auth.Rol;
}

type SinEventosEntreServidores = Record<string, never>;

export type ServidorSockets = Server<
  mensajeria.EventosClienteAServidor,
  mensajeria.EventosServidorACliente,
  SinEventosEntreServidores,
  DatosSocket
>;

export type SocketCliente = Socket<
  mensajeria.EventosClienteAServidor,
  mensajeria.EventosServidorACliente,
  SinEventosEntreServidores,
  DatosSocket
>;

export const salaUsuario = (usuarioId: string): string => `user:${usuarioId}`;
export const salaSesion = (sesionId: string): string => `sesion:${sesionId}`;
