import { Module } from '@nestjs/common';
import { ConfiguracionModule } from './compartido/infraestructura/configuracion.module.js';
import { RegistroModule } from './compartido/infraestructura/logger.module.js';

@Module({ imports: [ConfiguracionModule, RegistroModule] })
export class AppWorkerModule {}
