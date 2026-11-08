import type { conexiones } from '@impulsau/contracts';

export const REPOSITORIO_INTERESES = Symbol('RepositorioIntereses');

export type ResultadoMostrar =
  | {
      tipo: 'ok';
      interes: conexiones.Interes;
      /** `true` si este interés cerró un interés mutuo y se abrió la conversación. */
      abrioConversacion: boolean;
    }
  | { tipo: 'destino_no_encontrado' }
  | { tipo: 'empresa_no_verificada' }
  | { tipo: 'talento_no_disponible' }
  | { tipo: 'usuario_bloqueado' }
  | { tipo: 'ya_declinado' };

export type ResultadoRetirar = 'ok' | 'ya_respondido';

export type ResultadoResponder =
  | {
      tipo: 'ok';
      interes: conexiones.Interes;
      /** `false` si la decisión ya estaba tomada (reintento idempotente). */
      nuevo: boolean;
      empresaId: string;
      talentoId: string;
    }
  | { tipo: 'no_encontrado' }
  | { tipo: 'prohibido' }
  | { tipo: 'conflicto' }
  | { tipo: 'usuario_bloqueado' };

export interface ParInteres {
  empresaId: string;
  talentoId: string;
  direccion: conexiones.DireccionInteres;
}

export interface RepositorioIntereses {
  /** Idempotente: repetirlo devuelve el interés existente. Dos intereses opuestos abren la conversación. */
  mostrar(par: ParInteres, mensaje: string | null, ahora: Date): Promise<ResultadoMostrar>;
  /** Retira un interés pendiente; si no existe, no hace nada. */
  retirar(par: ParInteres): Promise<ResultadoRetirar>;
  /** Acepta o declina; al aceptar abre la conversación única del par. */
  responder(
    interesId: string,
    receptorId: string,
    aceptar: boolean,
    ahora: Date,
  ): Promise<ResultadoResponder>;
  listar(
    usuarioId: string,
    rol: 'empresa' | 'talento',
    consulta: conexiones.ConsultaIntereses,
  ): Promise<conexiones.PaginaIntereses>;
}
