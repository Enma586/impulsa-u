import { Module } from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';
import { VERIFICADOR_TOKEN } from '../dominio/autenticacion.js';
import { ENTORNO } from '../infraestructura/configuracion.module.js';
import type { Entorno } from '../infraestructura/entorno.js';
import { JoseVerificadorToken } from '../infraestructura/jose-verificador-token.js';

@Module({
  providers: [
    {
      provide: VERIFICADOR_TOKEN,
      inject: [ENTORNO],
      useFactory: (entorno: Entorno) =>
        new JoseVerificadorToken(
          createRemoteJWKSet(new URL(entorno.SUPABASE_JWKS_URL)),
          `${entorno.SUPABASE_URL}/auth/v1`,
          'authenticated',
        ),
    },
  ],
  exports: [VERIFICADOR_TOKEN],
})
export class AutenticacionModule {}
