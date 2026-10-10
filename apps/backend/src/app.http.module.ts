import { Module } from '@nestjs/common';
import { CompartidoHttpModule } from './compartido/http/compartido-http.module.js';
import { ConfiguracionModule } from './compartido/infraestructura/configuracion.module.js';
import { RegistroModule } from './compartido/infraestructura/logger.module.js';

@Module({ imports: [ConfiguracionModule, RegistroModule, CompartidoHttpModule] })
export class AppHttpModule {}
