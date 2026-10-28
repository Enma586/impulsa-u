import type { ErrorCasoUso } from '../dominio/errores.js';
import { ErrorHttpApi } from './error-api.js';

/** Traduce un error esperado de un caso de uso a la excepción HTTP del contrato. */
export function aErrorHttp(error: ErrorCasoUso): ErrorHttpApi {
  switch (error.tipo) {
    case 'no_encontrado':
      return new ErrorHttpApi(404, 'no_encontrado', 'No encontramos lo que buscas');
    case 'prohibido':
      return new ErrorHttpApi(403, 'prohibido', 'No tienes permiso para hacer esto');
    case 'conflicto':
      return new ErrorHttpApi(409, 'conflicto', error.mensaje);
    case 'invalido':
      return new ErrorHttpApi(422, 'validacion', 'Los datos enviados no son válidos', [
        { campo: error.campo, mensaje: error.mensaje },
      ]);
  }
}
