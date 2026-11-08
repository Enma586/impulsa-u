import type { ErrorCasoUso } from '../../../compartido/dominio/errores.js';

/** Errores esperados del módulo: los comunes más las reglas propias de la conexión directa. */
export type ErrorConexion =
  | ErrorCasoUso
  | { tipo: 'empresa_no_verificada' }
  | { tipo: 'talento_no_disponible' }
  | { tipo: 'usuario_bloqueado' };
