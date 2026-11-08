import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { OnGatewayConnection } from '@nestjs/websockets';
import type { mensajeria } from '@impulsau/contracts';
import type { CierreConexiones, EmisorTiempoReal } from '../../dominio/tiempo-real.js';
import { salaSesion, salaUsuario } from './tipos.js';
import type {
  ManejadorSocket,
  RegistroManejadoresSocket,
  ServidorSockets,
  SocketCliente,
} from './tipos.js';

type Evento = keyof mensajeria.EventosServidorACliente;
type DatosEvento<E extends Evento> = Parameters<mensajeria.EventosServidorACliente[E]>;

/**
 * Punto de entrada de las conexiones en vivo. Mete cada socket en sus salas (`user:{id}` y
 * `sesion:{id}`), cierra conexiones por sesión o usuario y emite eventos, todo en todas las réplicas.
 */
@WebSocketGateway()
export class GatewayConexion
  implements OnGatewayConnection, CierreConexiones, EmisorTiempoReal, RegistroManejadoresSocket
{
  @WebSocketServer()
  private servidor: ServidorSockets | undefined;

  private readonly manejadores: ManejadorSocket[] = [];

  registrar(manejador: ManejadorSocket): void {
    this.manejadores.push(manejador);
  }

  handleConnection(socket: SocketCliente): void {
    void socket.join(salaUsuario(socket.data.usuarioId));
    if (socket.data.sesionId) void socket.join(salaSesion(socket.data.sesionId));
    for (const manejador of this.manejadores) manejador.alConectar(socket);
  }

  cerrarSesion(sesionId: string): void {
    this.servidor?.in(salaSesion(sesionId)).disconnectSockets(true);
  }

  cerrarUsuario(usuarioId: string): void {
    this.servidor?.in(salaUsuario(usuarioId)).disconnectSockets(true);
  }

  aUsuario<E extends Evento>(usuarioId: string, evento: E, ...datos: DatosEvento<E>): void {
    this.servidor?.to(salaUsuario(usuarioId)).emit(evento, ...datos);
  }
}
