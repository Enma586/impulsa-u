import { Global, Module } from '@nestjs/common';
import { leerEntorno } from './entorno.js';

export const ENTORNO = Symbol('ENTORNO');

@Global()
@Module({
  providers: [{ provide: ENTORNO, useFactory: () => leerEntorno(process.env) }],
  exports: [ENTORNO],
})
export class ConfiguracionModule {}
