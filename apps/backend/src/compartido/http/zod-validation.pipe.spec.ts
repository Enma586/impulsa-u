import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ErrorHttpApi } from './error-api.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const pipe = new ZodValidationPipe(z.object({ edad: z.number().int().min(18) }));

describe('ZodValidationPipe', () => {
  it('devuelve el valor validado', () => {
    expect(pipe.transform({ edad: 20 })).toEqual({ edad: 20 });
  });

  it('lanza 422 con el campo que falló', () => {
    try {
      pipe.transform({ edad: 10 });
      expect.unreachable();
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ErrorHttpApi);
      if (error instanceof ErrorHttpApi) {
        expect(error.getStatus()).toBe(422);
        expect(error.codigo).toBe('validacion');
        expect(error.detalles?.[0]?.campo).toBe('edad');
      }
    }
  });
});
