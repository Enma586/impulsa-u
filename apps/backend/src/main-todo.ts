import { iniciarHttp } from './compartido/infraestructura/arranque.js';
import { AppTodoModule } from './app.todo.module.js';

await iniciarHttp(AppTodoModule);
