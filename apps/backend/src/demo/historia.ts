import type { Departamento } from '@impulsau/contracts';

/** Personas y empresas ficticias: la demo cuenta una historia coherente sin datos reales. */
export interface TalentoDemo {
  correo: string;
  nombre: string;
  carrera: string;
  institucion: string;
  estado: 'estudiante' | 'egresado';
  ciclo: number | null;
  anioEgreso: number | null;
  departamento: Departamento;
  bio: string;
  habilidades: string[];
  enlaces: { tipo: 'github' | 'linkedin' | 'portafolio'; url: string }[];
}

export interface ProyectoDemo {
  autor: string;
  titulo: string;
  descripcion: string;
  materia: string;
  periodo: string;
  urlRepositorio: string | null;
  tecnologias: string[];
  /** Correos de quienes le dan like. */
  likesDe: string[];
}

export interface VacanteDemo {
  titulo: string;
  descripcion: string;
  tipo: 'pasantia' | 'primer_empleo' | 'trainee';
  modalidad: 'presencial' | 'hibrida' | 'remota';
  departamento: Departamento | null;
  estado: 'abierta' | 'borrador';
  requeridas: string[];
  deseables: string[];
}

export interface PostulacionDemo {
  vacante: string;
  talento: string;
  proyectos: string[];
  estado: 'recibida' | 'en_revision' | 'entrevista';
}

export const EMPRESA_DEMO = {
  correo: 'empresa@demo.impulsau.test',
  nombreComercial: '[Empresa Demo]',
  sector: 'Desarrollo de software',
  sitioWeb: 'https://empresa-demo.example.com',
  descripcion:
    'Equipo pequeño que construye productos web y quiere formar a su próxima generación de desarrolladores.',
};

export const TALENTOS_DEMO: readonly TalentoDemo[] = [
  {
    correo: 'ana@demo.impulsau.test',
    nombre: 'Ana Demo',
    carrera: 'Ingeniería de Sistemas',
    institucion: 'Universidad pública',
    estado: 'estudiante',
    ciclo: 8,
    anioEgreso: null,
    departamento: 'san_salvador',
    bio: 'Estudiante de último año. Me gusta construir interfaces claras y APIs sencillas.',
    habilidades: ['TypeScript', 'React', 'Node.js', 'Git', 'Trabajo en equipo'],
    enlaces: [{ tipo: 'github', url: 'https://github.com/ana-demo' }],
  },
  {
    correo: 'luis@demo.impulsau.test',
    nombre: 'Luis Demo',
    carrera: 'Ingeniería en Ciencias de la Computación',
    institucion: 'Universidad privada',
    estado: 'egresado',
    ciclo: null,
    anioEgreso: 2026,
    departamento: 'la_libertad',
    bio: 'Egresado con interés en datos y backend. Busco mi primera oportunidad.',
    habilidades: ['Python', 'SQL', 'PostgreSQL', 'Análisis de datos'],
    enlaces: [{ tipo: 'portafolio', url: 'https://luis-demo.example.com' }],
  },
  {
    correo: 'sofia@demo.impulsau.test',
    nombre: 'Sofía Demo',
    carrera: 'Licenciatura en Diseño Gráfico',
    institucion: 'Instituto técnico',
    estado: 'estudiante',
    ciclo: 5,
    anioEgreso: null,
    departamento: 'santa_ana',
    bio: 'Diseño interfaces pensando en la accesibilidad desde el primer boceto.',
    habilidades: ['Figma', 'Diseño de interfaces', 'Accesibilidad web', 'HTML y CSS'],
    enlaces: [],
  },
];

export const PROYECTOS_DEMO: readonly ProyectoDemo[] = [
  {
    autor: 'ana@demo.impulsau.test',
    titulo: 'Gestor de tareas para estudiantes',
    descripcion:
      'Aplicación web para organizar entregas y exámenes por materia. Usé React en el frontend y una API en Node.js con PostgreSQL. Aprendí a modelar fechas límite y a pensar en el móvil primero.',
    materia: 'Ingeniería de Software',
    periodo: 'Ciclo 01-2026',
    urlRepositorio: 'https://github.com/ana-demo/gestor-tareas',
    tecnologias: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    likesDe: ['luis@demo.impulsau.test', 'sofia@demo.impulsau.test'],
  },
  {
    autor: 'ana@demo.impulsau.test',
    titulo: 'API de biblioteca universitaria',
    descripcion:
      'API REST para consultar y reservar libros, con autenticación y paginación por cursor. Escribí pruebas de integración contra una base real y documenté cada endpoint.',
    materia: 'Bases de Datos II',
    periodo: 'Ciclo 02-2025',
    urlRepositorio: 'https://github.com/ana-demo/api-biblioteca',
    tecnologias: ['Node.js', 'TypeScript', 'APIs REST', 'PostgreSQL'],
    likesDe: ['luis@demo.impulsau.test'],
  },
  {
    autor: 'luis@demo.impulsau.test',
    titulo: 'Tablero de ventas con análisis de datos',
    descripcion:
      'Limpié y analicé un conjunto de ventas de una tienda local para encontrar los productos con mejor margen. Automaticé el informe semanal con Python y consultas SQL.',
    materia: 'Minería de Datos',
    periodo: 'Ciclo 02-2025',
    urlRepositorio: null,
    tecnologias: ['Python', 'SQL', 'Análisis de datos'],
    likesDe: ['ana@demo.impulsau.test'],
  },
  {
    autor: 'sofia@demo.impulsau.test',
    titulo: 'Rediseño accesible de una app de transporte',
    descripcion:
      'Auditoría de accesibilidad y rediseño de las pantallas principales de una app de rutas. Probé contraste, tamaños táctiles y navegación con lector de pantalla, y documenté las decisiones en Figma.',
    materia: 'Diseño de Interacción',
    periodo: 'Ciclo 01-2026',
    urlRepositorio: null,
    tecnologias: ['Figma', 'Diseño de interfaces', 'Accesibilidad web'],
    likesDe: ['ana@demo.impulsau.test', 'luis@demo.impulsau.test'],
  },
];

export const VACANTES_DEMO: readonly VacanteDemo[] = [
  {
    titulo: 'Pasantía de desarrollo web',
    descripcion:
      'Te sumarás al equipo de producto para construir pantallas con React y consumir nuestra API. Tendrás una persona mentora y revisión de código en cada entrega.',
    tipo: 'pasantia',
    modalidad: 'hibrida',
    departamento: 'san_salvador',
    estado: 'abierta',
    requeridas: ['React', 'TypeScript'],
    deseables: ['Git', 'Node.js'],
  },
  {
    titulo: 'Analista de datos junior',
    descripcion:
      'Apoyarás la preparación de informes y la limpieza de datos de clientes. Buscamos curiosidad y buen manejo de SQL; el resto lo aprendemos juntos.',
    tipo: 'primer_empleo',
    modalidad: 'remota',
    departamento: null,
    estado: 'abierta',
    requeridas: ['SQL', 'Análisis de datos'],
    deseables: ['Python'],
  },
  {
    titulo: 'Diseñador de interfaces (borrador)',
    descripcion:
      'Vacante en preparación para el equipo de diseño. Todavía estamos definiendo el alcance del puesto y las herramientas.',
    tipo: 'trainee',
    modalidad: 'presencial',
    departamento: 'san_salvador',
    estado: 'borrador',
    requeridas: ['Figma'],
    deseables: [],
  },
];

export const POSTULACIONES_DEMO: readonly PostulacionDemo[] = [
  {
    vacante: 'Pasantía de desarrollo web',
    talento: 'ana@demo.impulsau.test',
    proyectos: ['Gestor de tareas para estudiantes', 'API de biblioteca universitaria'],
    estado: 'en_revision',
  },
  {
    vacante: 'Analista de datos junior',
    talento: 'luis@demo.impulsau.test',
    proyectos: ['Tablero de ventas con análisis de datos'],
    estado: 'recibida',
  },
];
