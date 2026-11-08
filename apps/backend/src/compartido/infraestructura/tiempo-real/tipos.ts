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

/** Lo que un módulo registra para atender los eventos de cada socket que se conecta. */
export interface ManejadorSocket {
  alConectar(socket: SocketCliente): void;
}

export const REGISTRO_MANEJADORES_SOCKET = Symbol('RegistroManejadoresSocket');

export interface RegistroManejadoresSocket {
  registrar(manejador: ManejadorSocket): void;
}

export const salaUsuario = (usuarioId: string): string => `user:${usuarioId}`;
export const salaSesion = (sesionId: string): string => `sesion:${sesionId}`;
