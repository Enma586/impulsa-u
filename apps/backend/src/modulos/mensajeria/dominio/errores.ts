import type { ErrorCasoUso } from '../../../compartido/dominio/errores.js';

/** Errores esperados del módulo: los comunes más las reglas propias de la mensajería. */
export type ErrorMensajeriaCaso =
  | ErrorCasoUso
  | { tipo: 'conversacion_bloqueada' }
  | { tipo: 'idempotencia_reutilizada' }
  | { tipo: 'demasiadas_peticiones'; reintentarEnMs: number };

/** Quién actúa; sirve igual para una petición HTTP que para un socket. */
export interface ActorMensajeria {
  id: string;
  rol: 'empresa' | 'talento';
}
