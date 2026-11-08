import { mensajeria } from '@impulsau/contracts';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { tokenVigente } from '../../api/cliente';
import { clienteConsultas } from '../../api/clienteConsultas';
import { entorno } from '../../entorno';

export type EstadoConexion = 'conectado' | 'conectando' | 'sin_conexion';

type SocketChat = Socket<mensajeria.EventosServidorACliente, mensajeria.EventosClienteAServidor>;

interface Oyentes {
  mensaje: Set<(mensaje: mensajeria.Mensaje) => void>;
  lectura: Set<(datos: mensajeria.EventoLecturaActualizada) => void>;
  escribiendo: Set<(datos: mensajeria.EventoEscribiendoActualizado) => void>;
  reconectado: Set<() => void>;
}

const oyentes: Oyentes = {
  mensaje: new Set(),
  lectura: new Set(),
  escribiendo: new Set(),
  reconectado: new Set(),
};

const estadoOyentes = new Set<() => void>();
let estado: EstadoConexion = 'sin_conexion';
let socket: SocketChat | null = null;
let usuarios = 0;
let yaConecto = false;

function cambiarEstado(nuevo: EstadoConexion): void {
  if (estado === nuevo) return;
  estado = nuevo;
  for (const oyente of estadoOyentes) oyente();
}

function refrescarListas(): void {
  void clienteConsultas.invalidateQueries({ queryKey: ['conversaciones'] });
  void clienteConsultas.invalidateQueries({ queryKey: ['intereses'] });
}

function crear(): SocketChat {
  const nuevo: SocketChat = io(entorno.VITE_API_URL, {
    transports: ['websocket'],
    // Se pide en cada (re)conexión, así un token renovado mientras tanto se usa de inmediato.
    auth: (entregar) => {
      void tokenVigente().then((token) => {
        entregar({ token: token ?? '' });
      });
    },
  });

  nuevo.on('connect', () => {
    cambiarEstado('conectado');
    if (yaConecto) {
      // Lo que pasó mientras no había conexión se recupera con la sincronización de cada hilo.
      refrescarListas();
      for (const oyente of oyentes.reconectado) oyente();
    }
    yaConecto = true;
  });
  nuevo.on('disconnect', () => {
    cambiarEstado('conectando');
  });
  nuevo.on('connect_error', () => {
    cambiarEstado('sin_conexion');
  });

  // Todo lo que llega por el socket es externo: se valida antes de usarlo.
  nuevo.on('message:new', (crudo: unknown) => {
    const mensaje = mensajeria.Mensaje.safeParse(crudo);
    if (!mensaje.success) return;
    refrescarListas();
    for (const oyente of oyentes.mensaje) oyente(mensaje.data);
  });
  nuevo.on('message:read', (crudo: unknown) => {
    const datos = mensajeria.EventoLecturaActualizada.safeParse(crudo);
    if (!datos.success) return;
    void clienteConsultas.invalidateQueries({ queryKey: ['conversaciones'] });
    for (const oyente of oyentes.lectura) oyente(datos.data);
  });
  nuevo.on('typing', (crudo: unknown) => {
    const datos = mensajeria.EventoEscribiendoActualizado.safeParse(crudo);
    if (!datos.success) return;
    for (const oyente of oyentes.escribiendo) oyente(datos.data);
  });
  nuevo.on('interest:accepted', (crudo: unknown) => {
    if (mensajeria.EventoInteresAceptado.safeParse(crudo).success) refrescarListas();
  });
  return nuevo;
}

/** Abre la conexión en vivo (una sola para toda la app) y devuelve cómo cerrarla. */
export function conectarTiempoReal(): () => void {
  usuarios += 1;
  if (!socket) {
    cambiarEstado('conectando');
    socket = crear();
  }
  return () => {
    usuarios -= 1;
    if (usuarios > 0 || !socket) return;
    socket.disconnect();
    socket = null;
    yaConecto = false;
    cambiarEstado('sin_conexion');
  };
}

export const estadoConexion = {
  obtener: (): EstadoConexion => estado,
  suscribir: (oyente: () => void): (() => void) => {
    estadoOyentes.add(oyente);
    return () => {
      estadoOyentes.delete(oyente);
    };
  },
};

export function alRecibirMensaje(oyente: (mensaje: mensajeria.Mensaje) => void): () => void {
  oyentes.mensaje.add(oyente);
  return () => {
    oyentes.mensaje.delete(oyente);
  };
}

export function alCambiarLectura(
  oyente: (datos: mensajeria.EventoLecturaActualizada) => void,
): () => void {
  oyentes.lectura.add(oyente);
  return () => {
    oyentes.lectura.delete(oyente);
  };
}

export function alEscribir(
  oyente: (datos: mensajeria.EventoEscribiendoActualizado) => void,
): () => void {
  oyentes.escribiendo.add(oyente);
  return () => {
    oyentes.escribiendo.delete(oyente);
  };
}

export function alReconectar(oyente: () => void): () => void {
  oyentes.reconectado.add(oyente);
  return () => {
    oyentes.reconectado.delete(oyente);
  };
}

const TIEMPO_ACK_MS = 8_000;

/** Envía por socket y espera el acuse; `null` si no hay conexión, se agotó el tiempo o el acuse es inválido. */
export async function enviarPorSocket(
  evento: mensajeria.EventoEnviarMensaje,
): Promise<mensajeria.ResultadoEnvio | null> {
  if (!socket?.connected) return null;
  try {
    const crudo: unknown = await socket.timeout(TIEMPO_ACK_MS).emitWithAck('message:send', evento);
    const resultado = mensajeria.ResultadoEnvio.safeParse(crudo);
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

export async function sincronizarPorSocket(
  conversacionId: string,
  despuesDeSecuencia: number,
): Promise<mensajeria.ResultadoSincronizacion | null> {
  if (!socket?.connected) return null;
  try {
    const crudo: unknown = await socket
      .timeout(TIEMPO_ACK_MS)
      .emitWithAck('conversation:sync', { conversacionId, despuesDeSecuencia });
    const resultado = mensajeria.ResultadoSincronizacion.safeParse(crudo);
    return resultado.success ? resultado.data : null;
  } catch {
    return null;
  }
}

/** Avisos efímeros: si no hay conexión simplemente se pierden. */
export function avisarLectura(conversacionId: string, secuencia: number): boolean {
  if (!socket?.connected) return false;
  socket.emit('message:read', { conversacionId, secuencia });
  return true;
}

export function avisarEscribiendo(conversacionId: string, activo: boolean): void {
  if (!socket?.connected) return;
  socket.emit(activo ? 'typing:start' : 'typing:stop', { conversacionId });
}
