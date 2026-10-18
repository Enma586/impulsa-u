import { iniciarHttp } from './compartido/infraestructura/arranque.js';
import { AppHttpModule } from './app.http.module.js';

await iniciarHttp(AppHttpModule);
