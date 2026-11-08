import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';
import type { Server, ServerOptions } from 'socket.io';
import type { BuscadorUsuario, VerificadorToken } from '../../dominio/autenticacion.js';
import { autenticarSocket } from './autenticar-socket.js';

export interface DependenciasAdaptador {
  corsOrigen: string;
  /** Conexión de publicación; el adaptador crea la de suscripción con `duplicate()`. */
  redis: Redis;
  verificador: VerificadorToken;
  usuarios: BuscadorUsuario;
}

/**
 * Servidor de Socket.IO con el adaptador de Redis (los eventos y los cierres llegan a todas las
 * réplicas) y autenticación en el handshake: sin token válido la conexión se rechaza.
 */
export class AdaptadorSocketRedis extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly dependencias: DependenciasAdaptador,
  ) {
    super(app);
  }

  override createIOServer(puerto: number, opciones?: ServerOptions): Server {
    const { corsOrigen, redis, verificador, usuarios } = this.dependencias;
    const configuracion = Object.assign({}, opciones, { cors: { origin: corsOrigen } });
    const servidor = super.createIOServer(puerto, configuracion);

    servidor.adapter(createAdapter(redis, redis.duplicate()));
    servidor.use((socket, siguiente) => {
      autenticarSocket(verificador, usuarios, socket.handshake.auth).then(
        (resultado) => {
          if (!resultado.ok) {
            siguiente(new Error(resultado.error));
            return;
          }
          Object.assign(socket.data, resultado.valor);
          siguiente();
        },
        () => {
          siguiente(new Error('no_autenticado'));
        },
      );
    });
    return servidor;
  }
}
