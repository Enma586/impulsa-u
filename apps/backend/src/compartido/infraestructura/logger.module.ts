import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ENTORNO } from './configuracion.module.js';
import type { Entorno } from './entorno.js';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ENTORNO],
      useFactory: (entorno: Entorno) => ({
        pinoHttp: {
          level: entorno.NODE_ENV === 'test' ? 'silent' : 'info',
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),
  ],
})
export class RegistroModule {}
