import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { FiltroErrores } from './filtro-errores.js';
import { COMPROBADORES_LISTO, SaludController } from './salud.controller.js';

@Module({
  controllers: [SaludController],
  providers: [
    { provide: APP_FILTER, useClass: FiltroErrores },
    { provide: COMPROBADORES_LISTO, useValue: [] },
  ],
})
export class CompartidoHttpModule {}
