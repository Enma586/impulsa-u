import { Inject, Injectable } from '@nestjs/common';
import type { mensajeria } from '@impulsau/contracts';
import { NO_ENCONTRADO, PROHIBIDO } from '../../../compartido/dominio/errores.js';
import { LIMITADOR_TASA } from '../../../compartido/dominio/limite-tasa.js';
import type { LimitadorTasa } from '../../../compartido/dominio/limite-tasa.js';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { EMISOR_TIEMPO_REAL } from '../../../compartido/dominio/tiempo-real.js';
import type { EmisorTiempoReal } from '../../../compartido/dominio/tiempo-real.js';
import type { ActorMensajeria, ErrorMensajeriaCaso } from '../dominio/errores.js';
import { REPOSITORIO_MENSAJES } from '../puertos/puertos.js';
import type { MensajesDesde, RepositorioMensajes } from '../puertos/puertos.js';

const MENSAJES_POR_VENTANA = 30;
const VENTANA_MS = 10_000;

@Injectable()
export class EnviarMensaje {
  constructor(
    @Inject(REPOSITORIO_MENSAJES) private readonly mensajes: RepositorioMensajes,
    @Inject(LIMITADOR_TASA) private readonly limitador: LimitadorTasa,
    @Inject(EMISOR_TIEMPO_REAL) private readonly emisor: EmisorTiempoReal,
  ) {}

  /**
   * CU-32. Idempotente por `clientMessageId`: un reenvío devuelve el mismo mensaje sin duplicarlo ni
   * volver a avisar. El mensaje nuevo llega a todos los dispositivos de ambos participantes.
   */
  async ejecutar(
    actor: ActorMensajeria,
    conversacionId: string,
    entrada: mensajeria.EnviarMensajeEntrada,
  ): Promise<Resultado<mensajeria.Mensaje, ErrorMensajeriaCaso>> {
    const limite = await this.limitador.intentar(
      `mensaje:${actor.id}`,
      MENSAJES_POR_VENTANA,
      VENTANA_MS,
    );
    if (!limite.permitido) {
      return fallo({ tipo: 'demasiadas_peticiones', reintentarEnMs: limite.reintentarEnMs });
    }

    const resultado = await this.mensajes.enviar(actor.id, conversacionId, entrada, new Date());
    switch (resultado.tipo) {
      case 'ok':
        if (resultado.nuevo) {
          this.emisor.aUsuario(resultado.empresaId, 'message:new', resultado.mensaje);
          this.emisor.aUsuario(resultado.talentoId, 'message:new', resultado.mensaje);
        }
        return ok(resultado.mensaje);
      case 'no_encontrado':
        return fallo(NO_ENCONTRADO);
      case 'prohibido':
        return fallo(PROHIBIDO);
      case 'conversacion_bloqueada':
        return fallo({ tipo: 'conversacion_bloqueada' });
      case 'idempotencia_reutilizada':
        return fallo({ tipo: 'idempotencia_reutilizada' });
    }
  }
}

@Injectable()
export class ObtenerHistorial {
  constructor(@Inject(REPOSITORIO_MENSAJES) private readonly mensajes: RepositorioMensajes) {}

  /** CU-33: del mensaje más nuevo al más antiguo, paginado por secuencia. */
  async ejecutar(
    actor: ActorMensajeria,
    conversacionId: string,
    consulta: mensajeria.ConsultaHistorial,
  ): Promise<Resultado<mensajeria.PaginaMensajes, ErrorMensajeriaCaso>> {
    const pagina = await this.mensajes.historial(actor.id, conversacionId, consulta);
    return pagina ? ok(pagina) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class SincronizarConversacion {
  constructor(@Inject(REPOSITORIO_MENSAJES) private readonly mensajes: RepositorioMensajes) {}

  /** RNF-09: tras reconectar, el cliente pide lo que se perdió desde su última secuencia. */
  async ejecutar(
    actor: ActorMensajeria,
    entrada: mensajeria.EventoSincronizar,
  ): Promise<Resultado<MensajesDesde, ErrorMensajeriaCaso>> {
    const resultado = await this.mensajes.desde(
      actor.id,
      entrada.conversacionId,
      entrada.despuesDeSecuencia,
    );
    return resultado ? ok(resultado) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class ListarConversaciones {
  constructor(@Inject(REPOSITORIO_MENSAJES) private readonly mensajes: RepositorioMensajes) {}

  /** Conversaciones del usuario con el último mensaje y los no leídos, la más reciente primero. */
  async ejecutar(
    actor: ActorMensajeria,
    consulta: mensajeria.ConsultaConversaciones,
  ): Promise<Resultado<mensajeria.PaginaConversaciones, ErrorMensajeriaCaso>> {
    return ok(await this.mensajes.listar(actor.id, actor.rol, consulta));
  }
}
