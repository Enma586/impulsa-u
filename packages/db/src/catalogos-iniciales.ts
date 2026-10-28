import { carreras, departamento, habilidades, instituciones } from './esquema/index.js';
import type { BaseDeDatos } from './cliente.js';

const HABILIDADES: readonly (readonly [string, string])[] = [
  ['TypeScript', 'Lenguajes'],
  ['JavaScript', 'Lenguajes'],
  ['Python', 'Lenguajes'],
  ['Java', 'Lenguajes'],
  ['C#', 'Lenguajes'],
  ['SQL', 'Datos'],
  ['PostgreSQL', 'Datos'],
  ['MongoDB', 'Datos'],
  ['Análisis de datos', 'Datos'],
  ['React', 'Frontend'],
  ['HTML y CSS', 'Frontend'],
  ['Accesibilidad web', 'Frontend'],
  ['Node.js', 'Backend'],
  ['NestJS', 'Backend'],
  ['APIs REST', 'Backend'],
  ['Git', 'Herramientas'],
  ['Docker', 'Herramientas'],
  ['Linux', 'Herramientas'],
  ['Figma', 'Diseño'],
  ['Diseño de interfaces', 'Diseño'],
  ['Excel avanzado', 'Negocios'],
  ['Contabilidad básica', 'Negocios'],
  ['Marketing digital', 'Negocios'],
  ['Trabajo en equipo', 'Transversales'],
  ['Comunicación', 'Transversales'],
];

const CARRERAS: readonly string[] = [
  'Ingeniería de Sistemas',
  'Ingeniería en Ciencias de la Computación',
  'Ingeniería Industrial',
  'Licenciatura en Diseño Gráfico',
  'Licenciatura en Contaduría Pública',
  'Licenciatura en Administración de Empresas',
  'Licenciatura en Mercadeo',
  'Técnico en Desarrollo de Software',
];

type Departamento = (typeof departamento.enumValues)[number];

const INSTITUCIONES: readonly (readonly [string, Departamento])[] = [
  ['Universidad pública', 'san_salvador'],
  ['Universidad privada', 'la_libertad'],
  ['Instituto técnico', 'santa_ana'],
];

const slug = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Carga los catálogos mínimos para una demo. Se puede repetir: lo que ya existe se conserva. */
export async function sembrarCatalogos(db: BaseDeDatos): Promise<void> {
  await db
    .insert(habilidades)
    .values(HABILIDADES.map(([nombre, categoria]) => ({ nombre, categoria, slug: slug(nombre) })))
    .onConflictDoNothing();
  await db
    .insert(carreras)
    .values(CARRERAS.map((nombre) => ({ nombre, slug: slug(nombre) })))
    .onConflictDoNothing();
  await db
    .insert(instituciones)
    .values(
      INSTITUCIONES.map(([nombre, sede]) => ({ nombre, slug: slug(nombre), departamento: sede })),
    )
    .onConflictDoNothing();
}
