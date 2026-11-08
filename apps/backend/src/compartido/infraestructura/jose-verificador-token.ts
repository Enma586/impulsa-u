import { jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import { fallo, ok } from '../dominio/resultado.js';
import type { Resultado } from '../dominio/resultado.js';
import type { IdentidadToken, VerificadorToken } from '../dominio/autenticacion.js';

const Reclamos = z.object({ sub: z.uuid(), session_id: z.uuid().optional() });

export class JoseVerificadorToken implements VerificadorToken {
  constructor(
    private readonly claves: JWTVerifyGetKey,
    private readonly emisor: string,
    private readonly audiencia: string,
  ) {}

  async verificar(token: string): Promise<Resultado<IdentidadToken, 'token_invalido'>> {
    try {
      const { payload } = await jwtVerify(token, this.claves, {
        issuer: this.emisor,
        audience: this.audiencia,
        algorithms: ['ES256', 'RS256'],
      });
      const reclamos = Reclamos.safeParse(payload);
      return reclamos.success
        ? ok({ usuarioId: reclamos.data.sub, sesionId: reclamos.data.session_id ?? null })
        : fallo('token_invalido');
    } catch {
      return fallo('token_invalido');
    }
  }
}
