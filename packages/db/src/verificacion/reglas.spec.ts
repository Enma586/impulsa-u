import { describe, expect, it } from 'vitest';
import { esDestructiva, leerCambios, migracionesModificadas, migracionesNuevas } from './reglas.js';

const salida = [
  'A\tpackages/db/migraciones/0003_nueva.sql',
  'M\tpackages/db/migraciones/0001_usuarios_talentos.sql',
  'D\tpackages/db/migraciones/0002_activar_rls.sql',
  'R100\tpackages/db/migraciones/0000_extensiones.sql\tpackages/db/migraciones/0000_ext.sql',
].join('\n');

describe('leerCambios', () => {
  it('interpreta altas, ediciones, borrados y renombrados', () => {
    const cambios = leerCambios(salida);
    expect(cambios).toContainEqual({ estado: 'A', ruta: 'packages/db/migraciones/0003_nueva.sql' });
    expect(cambios).toContainEqual({ estado: 'R', ruta: 'packages/db/migraciones/0000_ext.sql' });
  });

  it('ignora líneas vacías', () => {
    expect(leerCambios('\n')).toEqual([]);
  });
});

describe('migraciones inmutables', () => {
  it('señala las migraciones editadas, borradas o renombradas', () => {
    expect(migracionesModificadas(leerCambios(salida))).toEqual([
      'packages/db/migraciones/0001_usuarios_talentos.sql',
      'packages/db/migraciones/0002_activar_rls.sql',
      'packages/db/migraciones/0000_extensiones.sql',
      'packages/db/migraciones/0000_ext.sql',
    ]);
  });

  it('solo cuenta como nuevas las altas de archivos .sql', () => {
    expect(migracionesNuevas(leerCambios(salida))).toEqual([
      'packages/db/migraciones/0003_nueva.sql',
    ]);
  });
});

describe('esDestructiva', () => {
  it.each([
    'DROP TABLE "usuarios";',
    'ALTER TABLE "a" DROP COLUMN "b";',
    'ALTER TABLE "a" RENAME COLUMN "b" TO "c";',
    'ALTER TABLE "a" RENAME TO "b";',
    'truncate "a";',
  ])('detecta %s', (sql) => {
    expect(esDestructiva(sql)).toBe(true);
  });

  it.each([
    'CREATE TABLE "a" ("id" uuid);',
    'ALTER TABLE "a" ADD COLUMN "b" text;',
    'CREATE INDEX "i" ON "a" ("b");',
  ])('deja pasar %s', (sql) => {
    expect(esDestructiva(sql)).toBe(false);
  });
});
