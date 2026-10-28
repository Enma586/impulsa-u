export interface CambioArchivo {
  estado: string;
  ruta: string;
}

/** Lee la salida de `git diff --name-status` (renombrados: estado, ruta vieja y ruta nueva). */
export function leerCambios(salida: string): CambioArchivo[] {
  return salida
    .split('\n')
    .filter((linea) => linea.trim() !== '')
    .flatMap((linea) => {
      const [estado = '', ...rutas] = linea.split('\t');
      return rutas.map((ruta) => ({ estado: estado.slice(0, 1), ruta }));
    });
}

/**
 * Una migración que ya existe en la rama base solo puede quedar igual: no se edita, borra ni renombra.
 * El diario `_journal.json` se exceptúa: drizzle-kit le agrega una entrada con cada migración nueva.
 */
export function migracionesModificadas(cambios: CambioArchivo[]): string[] {
  return cambios
    .filter((cambio) => cambio.estado !== 'A' && !cambio.ruta.endsWith('/meta/_journal.json'))
    .map((cambio) => cambio.ruta);
}

export function migracionesNuevas(cambios: CambioArchivo[]): string[] {
  return cambios
    .filter((cambio) => cambio.estado === 'A' && cambio.ruta.endsWith('.sql'))
    .map((cambio) => cambio.ruta);
}

const OPERACIONES_DESTRUCTIVAS = [
  /\bDROP\s+(TABLE|COLUMN|SCHEMA|TYPE|INDEX|CONSTRAINT|EXTENSION)\b/i,
  /\bRENAME\s+(TO|COLUMN|CONSTRAINT)\b/i,
  /\bTRUNCATE\b/i,
];

export function esDestructiva(sql: string): boolean {
  return OPERACIONES_DESTRUCTIVAS.some((patron) => patron.test(sql));
}
