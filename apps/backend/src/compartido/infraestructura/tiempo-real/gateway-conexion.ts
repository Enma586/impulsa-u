import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { OnGatewayConnection } from '@nestjs/websockets';
import type { CierreConexiones } from '../../dominio/tiempo-real.js';
import { salaSesion, salaUsuario } from './tipos.js';
import type { ServidorSockets, SocketCliente } from './tipos.js';

/**
 * Punto de entrada de las conexiones en vivo. Mete cada socket en sus salas (`user:{id}` y
 * `sesion:{id}`) y cierra conexiones por sesión o usuario en todas las réplicas.
 */
@WebSocketGateway()
export class GatewayConexion implements OnGatewayConnection, CierreConexiones {
  @WebSocketServer()
  private servidor: ServidorSockets | undefined;

  handleConnection(socket: SocketCliente): void {
    void socket.join(salaUsuario(socket.data.usuarioId));
    if (socket.data.sesionId) void socket.join(salaSesion(socket.data.sesionId));
  }

  cerrarSesion(sesionId: string): void {
    this.servidor?.in(salaSesion(sesionId)).disconnectSockets(true);
  }

  cerrarUsuario(usuarioId: string): void {
    this.servidor?.in(salaUsuario(usuarioId)).disconnectSockets(true);
  }
}
