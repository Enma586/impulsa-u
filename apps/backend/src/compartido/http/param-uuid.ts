import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

/** Valida que un parámetro de ruta sea un uuid; si no, responde 422 con el formato de error. */
export const ParamUuid = new ZodValidationPipe(z.uuid());
