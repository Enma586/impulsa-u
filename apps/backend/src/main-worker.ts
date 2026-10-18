import { iniciarWorker } from './compartido/infraestructura/arranque.js';
import { AppWorkerModule } from './app.worker.module.js';

await iniciarWorker(AppWorkerModule);
