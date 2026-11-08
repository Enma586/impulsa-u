import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { mensajeria } from '@impulsau/contracts';
import { z } from 'zod';
import { REGISTRO_MANEJADORES_SOCKET } from '../../../compartido/infraestructura/tiempo-real/tipos.js';
import type {
  ManejadorSocket,
  RegistroManejadoresSocket,
  SocketCliente,
} from '../../../compartido/infraestructura/tiempo-real/tipos.js';
import { EnviarMensaje, SincronizarConversacion } from '../aplicacion/mensajes.js';
import type { ActorMensajeria, ErrorMensajeriaCaso } from '../dominio/errores.js';

/** El `ack` lo manda el cliente: puede faltar o no ser una función, así que se valida. */
const Ack = z.custom<(resultado: unknown) => void>((valor) => typeof valor === 'function');

const ERROR_INTERNO: mensajeria.ErrorMensajeria = {
  code: 'error_interno',
  message: 'No pudimos procesar tu solicitud',
};

function aErrorContrato(error: ErrorMensajeriaCaso): mensajeria.ErrorMensajeria {
  switch (error.tipo) {
    case 'no_encontrado':
      return { code: 'no_encontrado', message: 'No encontramos esa conversación' };
    case 'prohibido':
      return { code: 'prohibido', message: 'No tienes permiso para hacer esto' };
    case 'conflicto':
      return { code: 'validacion', message: error.mensaje };
    case 'invalido':
      return {
        code: 'validacion',
        message: 'Los datos enviados no son válidos',
        details: [{ campo: error.campo, mensaje: error.mensaje }],
      };
    case 'conversacion_bloqueada':
      return { code: 'conversacion_bloqueada', message: 'No puedes escribir en esta conversación' };
    case 'idempotencia_reutilizada':
      return {
        code: 'idempotencia_reutilizada',
        message: 'Ese identificador de mensaje ya se usó con otro contenido',
      };
    case 'demasiadas_peticiones':
      return {
        code: 'demasiadas_peticiones',
        message: `Escribes muy rápido. Espera ${String(Math.ceil(error.reintentarEnMs / 1000))} segundos`,
      };
  }
}

function errorDeValidacion(error: z.ZodError): mensajeria.ErrorMensajeria {
  return {
    code: 'validacion',
    message: 'Los datos enviados no son válidos',
    details: error.issues.map((problema) => ({
      campo: problema.path.join('.'),
      mensaje: problema.message,
    })),
  };
}

function actorDe(socket: SocketCliente): ActorMensajeria | null {
  const { usuarioId, rol } = socket.data;
  return rol === 'empresa' || rol === 'talento' ? { id: usuarioId, rol } : null;
}

/**
 * Eventos del chat por Socket.IO. Todo lo que llega del cliente entra como `unknown` y se valida
 * con los esquemas del contrato; los errores esperados vuelven por el `ack`, nunca como excepción.
 */
@Injectable()
export class ManejadorMensajeriaSocket implements ManejadorSocket, OnModuleInit {
  private readonly registro = new Logger(ManejadorMensajeriaSocket.name);

  constructor(
    @Inject(REGISTRO_MANEJADORES_SOCKET) private readonly sockets: RegistroManejadoresSocket,
    @Inject(EnviarMensaje) private readonly enviar: EnviarMensaje,
    @Inject(SincronizarConversacion) private readonly sincronizar: SincronizarConversacion,
  ) {}

  onModuleInit(): void {
    this.sockets.registrar(this);
  }

  alConectar(socket: SocketCliente): void {
    socket.on('message:send', (datos: unknown, ack: unknown) => {
      void this.alEnviar(socket, datos, ack);
    });
    socket.on('conversation:sync', (datos: unknown, ack: unknown) => {
      void this.alSincronizar(socket, datos, ack);
    });
  }

  private responder(ack: unknown, resultado: unknown): void {
    const funcion = Ack.safeParse(ack);
    if (funcion.success) funcion.data(resultado);
  }

  private async alEnviar(socket: SocketCliente, datos: unknown, ack: unknown): Promise<void> {
    const responder = (resultado: mensajeria.ResultadoEnvio): void => {
      this.responder(ack, resultado);
    };
    const entrada = mensajeria.EventoEnviarMensaje.safeParse(datos);
    if (!entrada.success) {
      responder({ ok: false, error: errorDeValidacion(entrada.error) });
      return;
    }
    const actor = actorDe(socket);
    if (!actor) {
      responder({ ok: false, error: aErrorContrato({ tipo: 'prohibido' }) });
      return;
    }

    try {
      const { conversacionId, ...mensaje } = entrada.data;
      const resultado = await this.enviar.ejecutar(actor, conversacionId, mensaje);
      responder(
        resultado.ok
          ? { ok: true, mensaje: resultado.valor }
          : { ok: false, error: aErrorContrato(resultado.error) },
      );
    } catch (error) {
      this.registro.error('Falló message:send', error instanceof Error ? error.stack : undefined);
      responder({ ok: false, error: ERROR_INTERNO });
    }
  }

  private async alSincronizar(socket: SocketCliente, datos: unknown, ack: unknown): Promise<void> {
    const responder = (resultado: mensajeria.ResultadoSincronizacion): void => {
      this.responder(ack, resultado);
    };
    const entrada = mensajeria.EventoSincronizar.safeParse(datos);
    if (!entrada.success) {
      responder({ ok: false, error: errorDeValidacion(entrada.error) });
      return;
    }
    const actor = actorDe(socket);
    if (!actor) {
      responder({ ok: false, error: aErrorContrato({ tipo: 'prohibido' }) });
      return;
    }

    try {
      const resultado = await this.sincronizar.ejecutar(actor, entrada.data);
      responder(
        resultado.ok
          ? { ok: true, ...resultado.valor }
          : { ok: false, error: aErrorContrato(resultado.error) },
      );
    } catch (error) {
      this.registro.error(
        'Falló conversation:sync',
        error instanceof Error ? error.stack : undefined,
      );
      responder({ ok: false, error: ERROR_INTERNO });
    }
  }
}
