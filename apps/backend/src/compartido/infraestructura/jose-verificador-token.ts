import { jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import { fallo, ok } from '../dominio/resultado.js';
import type { Resultado } from '../dominio/resultado.js';
import type { VerificadorToken } from '../dominio/autenticacion.js';

const Reclamos = z.object({ sub: z.uuid() });

export class JoseVerificadorToken implements VerificadorToken {
  constructor(
    private readonly claves: JWTVerifyGetKey,
    private readonly emisor: string,
    private readonly audiencia: string,
  ) {}

  async verificar(token: string): Promise<Resultado<{ usuarioId: string }, 'token_invalido'>> {
    try {
      const { payload } = await jwtVerify(token, this.claves, {
        issuer: this.emisor,
        audience: this.audiencia,
        algorithms: ['ES256', 'RS256'],
      });
      const reclamos = Reclamos.safeParse(payload);
      return reclamos.success ? ok({ usuarioId: reclamos.data.sub }) : fallo('token_invalido');
    } catch {
      return fallo('token_invalido');
    }
  }
}
