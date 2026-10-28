import { crearBaseDeDatos } from './cliente.js';
import { sembrarCatalogos } from './catalogos-iniciales.js';

const url = process.env['DATABASE_URL_MIGRACIONES'];
if (!url) throw new Error('Falta DATABASE_URL_MIGRACIONES');

const conexion = crearBaseDeDatos(url, 1);
try {
  await sembrarCatalogos(conexion.db);
  console.log('Catálogos cargados');
} finally {
  await conexion.cerrar();
}
