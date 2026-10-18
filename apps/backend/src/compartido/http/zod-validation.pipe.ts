import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ErrorHttpApi } from './error-api.js';

/** Valida el valor entrante contra un esquema del contrato; todo lo externo entra como `unknown`. */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly esquema: S) {}

  transform(valor: unknown): z.output<S> {
    const resultado = this.esquema.safeParse(valor);
    if (resultado.success) return resultado.data;
    throw new ErrorHttpApi(
      422,
      'validacion',
      'Los datos enviados no son válidos',
      resultado.error.issues.map((problema) => ({
        campo: problema.path.join('.'),
        mensaje: problema.message,
      })),
    );
  }
}
