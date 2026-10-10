import { Module } from '@nestjs/common';
import { AppHttpModule } from './app.http.module.js';
import { AppWorkerModule } from './app.worker.module.js';

/** API y worker en un mismo proceso (producción y dev en planes gratuitos). */
@Module({ imports: [AppHttpModule, AppWorkerModule] })
export class AppTodoModule {}
