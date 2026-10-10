import { migrar } from './migrar.js';

const url = process.env['DATABASE_URL_MIGRACIONES'];
if (!url) throw new Error('Falta DATABASE_URL_MIGRACIONES');

await migrar(url);
console.log('Migraciones aplicadas');
