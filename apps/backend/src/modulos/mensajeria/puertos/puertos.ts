import type { mensajeria } from '@impulsau/contracts';

export const REPOSITORIO_MENSAJES = Symbol('RepositorioMensajes');

export type ResultadoEnviar =
  | {
      tipo: 'ok';
      mensaje: mensajeria.Mensaje;
      /** `false` si era un reenvío del mismo `clientMessageId` y no se guardó otra vez. */
      nuevo: boolean;
      empresaId: string;
      talentoId: string;
    }
  | { tipo: 'no_encontrado' }
  | { tipo: 'prohibido' }
  | { tipo: 'conversacion_bloqueada' }
  | { tipo: 'idempotencia_reutilizada' };

export interface MensajesDesde {
  mensajes: mensajeria.Mensaje[];
  hayMas: boolean;
}

export interface RepositorioMensajes {
  /**
   * Guarda un mensaje con la siguiente secuencia de la conversación. Bloquea la conversación para
   * que la secuencia no tenga huecos ni repetidos, y es idempotente por `clientMessageId`.
   */
  enviar(
    usuarioId: string,
    conversacionId: string,
    entrada: mensajeria.EnviarMensajeEntrada,
    ahora: Date,
  ): Promise<ResultadoEnviar>;
  /** `null` si la conversación no existe o el usuario no participa en ella. */
  historial(
    usuarioId: string,
    conversacionId: string,
    consulta: mensajeria.ConsultaHistorial,
  ): Promise<mensajeria.PaginaMensajes | null>;
  /** Mensajes con secuencia mayor a `despuesDeSecuencia`, del más antiguo al más nuevo. */
  desde(
    usuarioId: string,
    conversacionId: string,
    despuesDeSecuencia: number,
  ): Promise<MensajesDesde | null>;
  listar(
    usuarioId: string,
    rol: 'empresa' | 'talento',
    consulta: mensajeria.ConsultaConversaciones,
  ): Promise<mensajeria.PaginaConversaciones>;
}
