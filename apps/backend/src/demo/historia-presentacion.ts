import type { HistoriaDemo } from './historia.js';

/**
 * Datos de presentación para mostrar la plataforma a un cliente: personas, empresas y proyectos
 * ficticios pero con aspecto real. Ninguna empresa ni persona existe; los correos usan el dominio
 * reservado `.test`.
 */
const D = 'presentacion.impulsau.test';
const correo = (usuario: string): string => `${usuario}@${D}`;

const MARIA = correo('maria.rivas');
const JOSE = correo('jose.menjivar');
const KARLA = correo('karla.hernandez');
const DIEGO = correo('diego.cruz');
const GABRIELA = correo('gabriela.orellana');
const CARLOS = correo('carlos.portillo');
const DANIELA = correo('daniela.guzman');
const KEVIN = correo('kevin.alvarado');
const ANDREA = correo('andrea.martinez');
const RODRIGO = correo('rodrigo.salazar');
const VALERIA = correo('valeria.chavez');
const OSCAR = correo('oscar.mejia');

const CUSCATLAN = correo('cuscatlan.digital');
const AGROALBA = correo('grupo.agroalba');
const LUMEN = correo('lumen.estudio');
const REDES = correo('redes.pacifico');

export const HISTORIA_PRESENTACION: HistoriaDemo = {
  empresas: [
    {
      correo: CUSCATLAN,
      nombreComercial: 'Cuscatlán Digital',
      sector: 'Desarrollo de software',
      sitioWeb: 'https://cuscatlandigital.example.com',
      descripcion:
        'Estudio de software con sede en San Salvador. Construimos plataformas de pagos y banca en línea para cooperativas y pequeñas financieras de la región. Somos 38 personas y cada pasante trabaja con una persona mentora desde el primer día.',
    },
    {
      correo: AGROALBA,
      nombreComercial: 'Grupo Agroalba',
      sector: 'Agroindustria',
      sitioWeb: 'https://agroalba.example.com',
      descripcion:
        'Productores y exportadores de café y hortalizas con operaciones en Santa Ana y Ahuachapán. Estamos digitalizando el seguimiento de cosechas, inventarios y costos, y buscamos gente joven con ganas de aprender el negocio.',
    },
    {
      correo: LUMEN,
      nombreComercial: 'Lumen Estudio Creativo',
      sector: 'Diseño y mercadeo digital',
      sitioWeb: 'https://lumenestudio.example.com',
      descripcion:
        'Agencia boutique de diseño, marca y contenido para negocios locales y emprendimientos. Un equipo de 14 personas que valora el portafolio por encima del currículum.',
    },
    {
      correo: REDES,
      nombreComercial: 'Redes del Pacífico',
      sector: 'Telecomunicaciones y soporte TI',
      sitioWeb: 'https://redesdelpacifico.example.com',
      descripcion:
        'Proveedor de internet y servicios administrados de TI para empresas medianas de La Libertad y San Miguel. Ofrecemos formación técnica interna y rutas de crecimiento hacia infraestructura y seguridad.',
    },
  ],

  talentos: [
    {
      correo: MARIA,
      nombre: 'María Fernanda Rivas',
      carrera: 'Ingeniería de Sistemas',
      institucion: 'Universidad Metropolitana Cuscatlán',
      estado: 'estudiante',
      ciclo: 9,
      anioEgreso: null,
      departamento: 'san_salvador',
      bio: 'Estudiante de último ciclo apasionada por el desarrollo web. Lidero el frontend de mi proyecto de graduación y me gusta escribir código que otra persona pueda leer sin sufrir. Busco una pasantía donde aprender de un equipo con revisión de código.',
      habilidades: ['TypeScript', 'React', 'Next.js', 'Git', 'Pruebas automatizadas', 'Scrum'],
      enlaces: [
        { tipo: 'github', url: 'https://github.com/mfrivas-dev' },
        { tipo: 'linkedin', url: 'https://www.linkedin.com/in/mfernanda-rivas' },
      ],
    },
    {
      correo: JOSE,
      nombre: 'José Alejandro Menjívar',
      carrera: 'Ingeniería en Ciencias de la Computación',
      institucion: 'Universidad del Valle de Zapotitán',
      estado: 'egresado',
      ciclo: null,
      anioEgreso: 2026,
      departamento: 'la_libertad',
      bio: 'Egresado en 2026, enfocado en backend y bases de datos. Me interesa diseñar APIs que no se rompan cuando crece el tráfico. Mi tesis fue un sistema de reservas con más de 600 reservas reales en su piloto.',
      habilidades: ['Node.js', 'NestJS', 'PostgreSQL', 'Docker', 'APIs REST', 'Linux'],
      enlaces: [
        { tipo: 'github', url: 'https://github.com/jmenjivar-code' },
        { tipo: 'portafolio', url: 'https://josemenjivar.example.com' },
      ],
    },
    {
      correo: KARLA,
      nombre: 'Karla Beatriz Hernández',
      carrera: 'Licenciatura en Administración de Empresas',
      institucion: 'Universidad Horizonte de Occidente',
      estado: 'estudiante',
      ciclo: 8,
      anioEgreso: null,
      departamento: 'santa_ana',
      bio: 'Estudio administración con enfoque en datos. Aprendí Excel avanzado y Power BI para ayudar al negocio familiar de café a entender sus costos. Quiero llevar esa mirada analítica a una empresa más grande.',
      habilidades: ['Excel avanzado', 'Power BI', 'SQL', 'Análisis de datos', 'Comunicación'],
      enlaces: [{ tipo: 'linkedin', url: 'https://www.linkedin.com/in/karla-b-hernandez' }],
    },
    {
      correo: DIEGO,
      nombre: 'Diego Armando Cruz',
      carrera: 'Técnico en Redes y Telecomunicaciones',
      institucion: 'Instituto Politécnico Lempa',
      estado: 'egresado',
      ciclo: null,
      anioEgreso: 2025,
      departamento: 'san_miguel',
      bio: 'Técnico en redes con prácticas en un proveedor local de internet. Configuré y documenté la red de mi instituto con segmentación por VLAN. Busco mi primer empleo en soporte o infraestructura.',
      habilidades: ['Redes y conectividad', 'Linux', 'Ciberseguridad', 'Atención al cliente'],
      enlaces: [{ tipo: 'github', url: 'https://github.com/diego-redes' }],
    },
    {
      correo: GABRIELA,
      nombre: 'Gabriela Alexandra Orellana',
      carrera: 'Licenciatura en Diseño Gráfico',
      institucion: 'Universidad Metropolitana Cuscatlán',
      estado: 'estudiante',
      ciclo: 7,
      anioEgreso: null,
      departamento: 'san_salvador',
      bio: 'Diseñadora en formación con interés en identidad de marca e interfaces. He trabajado con tres emprendimientos locales como voluntaria. Me importa que lo que diseño se pueda usar de verdad, no solo que se vea bien.',
      habilidades: [
        'Figma',
        'Diseño de interfaces',
        'Photoshop',
        'Ilustración digital',
        'Comunicación',
      ],
      enlaces: [{ tipo: 'portafolio', url: 'https://gabyorellana.example.com' }],
    },
    {
      correo: CARLOS,
      nombre: 'Carlos Eduardo Portillo',
      carrera: 'Ingeniería de Sistemas',
      institucion: 'Universidad pública',
      estado: 'estudiante',
      ciclo: 10,
      anioEgreso: null,
      departamento: 'san_salvador',
      bio: 'Cursando el último ciclo con foco en datos y aprendizaje automático. Me gusta explicar los resultados a gente que no es técnica. Busco una pasantía de análisis o ciencia de datos.',
      habilidades: ['Python', 'Machine learning', 'SQL', 'Análisis de datos', 'Git'],
      enlaces: [
        { tipo: 'github', url: 'https://github.com/cportillo-datos' },
        { tipo: 'linkedin', url: 'https://www.linkedin.com/in/carlos-e-portillo' },
      ],
    },
    {
      correo: DANIELA,
      nombre: 'Daniela Michelle Guzmán',
      carrera: 'Licenciatura en Ciencias de la Comunicación',
      institucion: 'Universidad Horizonte de Occidente',
      estado: 'egresado',
      ciclo: null,
      anioEgreso: 2026,
      departamento: 'sonsonate',
      bio: 'Comunicadora con experiencia en redacción y gestión de redes para pequeños negocios de Sonsonate. Manejo calendarios editoriales, SEO básico y edición de video corto. Busco mi primera oportunidad en una agencia.',
      habilidades: [
        'Redacción de contenidos',
        'Redes sociales',
        'SEO',
        'Edición de video',
        'Marketing digital',
      ],
      enlaces: [{ tipo: 'portafolio', url: 'https://danielaguzman.example.com' }],
    },
    {
      correo: KEVIN,
      nombre: 'Kevin Josué Alvarado',
      carrera: 'Técnico en Desarrollo de Software',
      institucion: 'Instituto técnico',
      estado: 'estudiante',
      ciclo: 4,
      anioEgreso: null,
      departamento: 'santa_ana',
      bio: 'Técnico en desarrollo de software, aprendiendo con proyectos pequeños y constantes. Publico lo que construyo aunque no sea perfecto. Quiero entrar a un equipo donde pueda crecer rápido.',
      habilidades: ['JavaScript', 'HTML y CSS', 'React', 'Git', 'Trabajo en equipo'],
      enlaces: [{ tipo: 'github', url: 'https://github.com/kalvarado-dev' }],
    },
    {
      correo: ANDREA,
      nombre: 'Andrea Lissette Martínez',
      carrera: 'Ingeniería en Ciberseguridad',
      institucion: 'Universidad del Valle de Zapotitán',
      estado: 'estudiante',
      ciclo: 9,
      anioEgreso: null,
      departamento: 'la_libertad',
      bio: 'Estudiante de ciberseguridad con participación en dos competencias CTF universitarias. Me interesa la seguridad de aplicaciones web y la respuesta a incidentes. Escribo informes claros de cada hallazgo.',
      habilidades: ['Ciberseguridad', 'Linux', 'Python', 'Redes y conectividad', 'Docker'],
      enlaces: [
        { tipo: 'github', url: 'https://github.com/andrea-sec' },
        { tipo: 'linkedin', url: 'https://www.linkedin.com/in/andrea-l-martinez' },
      ],
    },
    {
      correo: RODRIGO,
      nombre: 'Rodrigo Antonio Salazar',
      carrera: 'Ingeniería Industrial',
      institucion: 'Universidad pública',
      estado: 'egresado',
      ciclo: null,
      anioEgreso: 2025,
      departamento: 'la_paz',
      bio: 'Ingeniero industrial egresado con enfoque en procesos y mejora continua. Automatizo reportes con Excel y Python para dejar de hacerlos a mano. Busco un puesto de analista de operaciones.',
      habilidades: [
        'Excel avanzado',
        'Python',
        'Gestión de proyectos',
        'Análisis de datos',
        'Comunicación',
      ],
      enlaces: [{ tipo: 'linkedin', url: 'https://www.linkedin.com/in/rodrigo-a-salazar' }],
    },
    {
      correo: VALERIA,
      nombre: 'Valeria Nicole Chávez',
      carrera: 'Ingeniería en Ciencias de la Computación',
      institucion: 'Universidad Metropolitana Cuscatlán',
      estado: 'estudiante',
      ciclo: 8,
      anioEgreso: null,
      departamento: 'cuscatlan',
      bio: 'Desarrolladora móvil en formación. Publiqué una app en Google Play usada por mi facultad y aprendí a lidiar con reseñas reales. Me atraen los productos donde la gente los usa todos los días.',
      habilidades: ['Flutter', 'Kotlin', 'Git', 'Figma', 'APIs REST'],
      enlaces: [{ tipo: 'github', url: 'https://github.com/vchavez-mobile' }],
    },
    {
      correo: OSCAR,
      nombre: 'Óscar David Mejía',
      carrera: 'Licenciatura en Contaduría Pública',
      institucion: 'Universidad pública',
      estado: 'estudiante',
      ciclo: 9,
      anioEgreso: null,
      departamento: 'usulutan',
      bio: 'Estudiante de contaduría que automatiza lo repetitivo. Armé una plantilla de conciliación bancaria que usan tres pequeños comercios de mi comunidad. Busco práctica en finanzas o auditoría.',
      habilidades: ['Contabilidad básica', 'Excel avanzado', 'Power BI', 'Atención al cliente'],
      enlaces: [],
    },
  ],

  proyectos: [
    {
      autor: MARIA,
      titulo: 'Panel de reservas para canchas de fútbol 7',
      descripcion:
        'Aplicación web para que los dueños de canchas gestionen horarios y las personas reserven desde el celular. Usé React con TypeScript y TanStack Query, y cubrí los flujos principales con pruebas de componentes. Lo probamos con una cancha real durante dos meses: pasó de agenda en cuaderno a 40 reservas semanales.',
      materia: 'Proyecto de Graduación I',
      periodo: 'Ciclo 02-2026',
      urlRepositorio: 'https://github.com/mfrivas-dev/reservas-canchas',
      tecnologias: ['React', 'TypeScript', 'Pruebas automatizadas', 'Git'],
      likesDe: [JOSE, KEVIN, VALERIA, GABRIELA, CARLOS],
    },
    {
      autor: MARIA,
      titulo: 'Sistema de diseño en React para el curso de Interfaces',
      descripcion:
        'Biblioteca de 18 componentes accesibles (botones, formularios, diálogos) con modo claro y oscuro y documentación en Storybook. Cada componente se probó con teclado y lector de pantalla. La usaron cuatro equipos del curso en sus entregas finales.',
      materia: 'Interacción Humano-Computadora',
      periodo: 'Ciclo 01-2026',
      urlRepositorio: 'https://github.com/mfrivas-dev/sistema-diseno',
      tecnologias: ['React', 'TypeScript', 'Next.js'],
      likesDe: [GABRIELA, KEVIN, ANDREA],
    },
    {
      autor: JOSE,
      titulo: 'API de reservas para clínicas con control de concurrencia',
      descripcion:
        'Backend en NestJS y PostgreSQL para agendar citas sin dobles reservas aunque dos personas escojan el mismo horario al mismo tiempo. Resolví la concurrencia con restricciones únicas y bloqueo optimista, y lo validé con una prueba de carga de 200 solicitudes simultáneas. Piloto con una clínica privada: más de 600 citas gestionadas.',
      materia: 'Trabajo de Graduación',
      periodo: 'Ciclo 01-2026',
      urlRepositorio: 'https://github.com/jmenjivar-code/api-citas',
      tecnologias: ['NestJS', 'PostgreSQL', 'APIs REST', 'Docker'],
      likesDe: [MARIA, CARLOS, ANDREA, DIEGO, VALERIA, RODRIGO],
    },
    {
      autor: JOSE,
      titulo: 'Despliegue automatizado con Docker para un monolito legado',
      descripcion:
        'Contenericé una aplicación PHP de la facultad que se desplegaba a mano en un servidor compartido. Dejé un pipeline que construye, prueba y publica en menos de seis minutos, y documenté el procedimiento de recuperación.',
      materia: 'Administración de Servidores',
      periodo: 'Ciclo 02-2025',
      urlRepositorio: 'https://github.com/jmenjivar-code/deploy-docker',
      tecnologias: ['Docker', 'Linux', 'PHP', 'Git'],
      likesDe: [DIEGO, ANDREA],
    },
    {
      autor: KARLA,
      titulo: 'Control de costos de beneficiado de café en Power BI',
      descripcion:
        'Tablero que cruza los costos de mano de obra, transporte y beneficiado por lote de café del negocio de mi familia. Descubrí que dos lotes pequeños tenían un costo por quintal 23 % mayor al promedio, lo que cambió cómo se programa el corte. Los datos venían de hojas de Excel y los limpié con consultas SQL.',
      materia: 'Sistemas de Información Gerencial',
      periodo: 'Ciclo 01-2026',
      urlRepositorio: null,
      tecnologias: ['Power BI', 'SQL', 'Excel avanzado', 'Análisis de datos'],
      likesDe: [CARLOS, RODRIGO, OSCAR, MARIA],
    },
    {
      autor: DIEGO,
      titulo: 'Rediseño de la red del instituto con VLAN y documentación',
      descripcion:
        'Segmenté la red de 60 equipos del instituto en cuatro VLAN (administración, laboratorios, docentes e invitados) y configuré reglas de acceso entre ellas. Entregué diagrama, tabla de direccionamiento y un manual para el encargado. El tráfico de invitados dejó de afectar los laboratorios.',
      materia: 'Redes Avanzadas',
      periodo: 'Ciclo 02-2025',
      urlRepositorio: null,
      tecnologias: ['Redes y conectividad', 'Linux', 'Ciberseguridad'],
      likesDe: [ANDREA, JOSE],
    },
    {
      autor: GABRIELA,
      titulo: 'Identidad visual y sistema de marca para una cafetería de especialidad',
      descripcion:
        'Desarrollé logotipo, paleta, tipografía y 12 aplicaciones (empaque, menú, rotulación) para una cafetería de Santa Tecla. Presenté tres rutas conceptuales al cliente y documenté por qué se eligió una. Entregué un manual de marca de 24 páginas.',
      materia: 'Branding',
      periodo: 'Ciclo 02-2026',
      urlRepositorio: null,
      tecnologias: ['Photoshop', 'Ilustración digital', 'Diseño de interfaces'],
      likesDe: [DANIELA, MARIA, VALERIA, KARLA],
    },
    {
      autor: GABRIELA,
      titulo: 'Prototipo de app de pagos de servicios para adultos mayores',
      descripcion:
        'Investigué con 9 adultos mayores cómo pagan sus recibos y diseñé un flujo de tres pasos con texto grande y confirmaciones claras. Hice dos rondas de pruebas de usabilidad: la tasa de finalización subió de 4 a 8 de 9 personas entre la primera versión y la final. Prototipo completo en Figma.',
      materia: 'Diseño de Interacción',
      periodo: 'Ciclo 01-2026',
      urlRepositorio: null,
      tecnologias: ['Figma', 'Diseño de interfaces'],
      likesDe: [MARIA, VALERIA, KEVIN, JOSE, DANIELA],
    },
    {
      autor: CARLOS,
      titulo: 'Predicción de deserción estudiantil con datos abiertos',
      descripcion:
        'Modelo de clasificación entrenado con datos abiertos de matrícula para identificar señales tempranas de deserción. Comparé regresión logística y bosques aleatorios, y reporté precisión, sensibilidad y las limitaciones del conjunto de datos. Presenté los resultados en un informe de cinco páginas para personas no técnicas.',
      materia: 'Aprendizaje Automático',
      periodo: 'Ciclo 01-2026',
      urlRepositorio: 'https://github.com/cportillo-datos/desercion',
      tecnologias: ['Python', 'Machine learning', 'Análisis de datos', 'Git'],
      likesDe: [KARLA, RODRIGO, JOSE, ANDREA],
    },
    {
      autor: CARLOS,
      titulo: 'Consultas SQL para el análisis de un mercado municipal',
      descripcion:
        'Modelé una base de datos con 11 tablas para los puestos y ventas de un mercado y escribí 25 consultas analíticas (ventas por rubro, horas pico, productos estacionales). Optimicé las tres más lentas con índices y las bajé de 4 s a menos de 300 ms.',
      materia: 'Bases de Datos II',
      periodo: 'Ciclo 02-2025',
      urlRepositorio: 'https://github.com/cportillo-datos/mercado-sql',
      tecnologias: ['SQL', 'PostgreSQL'],
      likesDe: [KARLA, JOSE],
    },
    {
      autor: DANIELA,
      titulo: 'Estrategia de contenido para una panadería artesanal',
      descripcion:
        'Plan de seis semanas con calendario editorial, guiones de video corto y metas medibles. En ese periodo las interacciones en Instagram subieron 3,1 veces y los pedidos por mensaje directo pasaron de 4 a 19 por semana. Documenté qué funcionó y qué descarté.',
      materia: 'Mercadotecnia Digital',
      periodo: 'Ciclo 02-2025',
      urlRepositorio: null,
      tecnologias: ['Redes sociales', 'Redacción de contenidos', 'Edición de video', 'SEO'],
      likesDe: [GABRIELA, KARLA, OSCAR],
    },
    {
      autor: KEVIN,
      titulo: 'Calculadora de gastos compartidos para estudiantes',
      descripcion:
        'Aplicación web sencilla para dividir gastos entre compañeros de cuarto y saber quién le debe a quién. La hice con JavaScript y React, guarda los datos en el navegador y funciona sin conexión. Es mi primer proyecto con componentes y estado.',
      materia: 'Programación Web',
      periodo: 'Ciclo 02-2026',
      urlRepositorio: 'https://github.com/kalvarado-dev/gastos-compartidos',
      tecnologias: ['JavaScript', 'React', 'HTML y CSS'],
      likesDe: [MARIA, VALERIA],
    },
    {
      autor: ANDREA,
      titulo: 'Auditoría de seguridad de una aplicación web vulnerable',
      descripcion:
        'Evalué una aplicación de prueba con vulnerabilidades conocidas y encontré inyección SQL, control de acceso roto y credenciales por defecto. Entregué un informe con cada hallazgo, su gravedad, cómo reproducirlo y la corrección sugerida. Trabajé en un entorno aislado y con autorización de la cátedra.',
      materia: 'Seguridad de Aplicaciones',
      periodo: 'Ciclo 01-2026',
      urlRepositorio: 'https://github.com/andrea-sec/auditoria-app-vulnerable',
      tecnologias: ['Ciberseguridad', 'Linux', 'Python'],
      likesDe: [DIEGO, JOSE, CARLOS, MARIA],
    },
    {
      autor: ANDREA,
      titulo: 'Laboratorio de detección de intrusos con contenedores',
      descripcion:
        'Monté un laboratorio con Docker para simular ataques de fuerza bruta y escaneo de puertos y detectarlos con reglas de alerta. Incluye guía de instalación para que otra persona lo reproduzca en menos de 20 minutos.',
      materia: 'Redes y Seguridad',
      periodo: 'Ciclo 02-2025',
      urlRepositorio: 'https://github.com/andrea-sec/lab-deteccion',
      tecnologias: ['Docker', 'Redes y conectividad', 'Ciberseguridad'],
      likesDe: [DIEGO, JOSE],
    },
    {
      autor: RODRIGO,
      titulo: 'Automatización del reporte semanal de producción',
      descripcion:
        'Reemplacé un reporte que tomaba unas 5 horas a la semana en una planta de empaque por un script en Python que lee los registros diarios y genera el resumen con indicadores. Reduje los errores de transcripción a cero en las ocho semanas que lo monitoreé.',
      materia: 'Ingeniería de Procesos',
      periodo: 'Ciclo 01-2025',
      urlRepositorio: null,
      tecnologias: ['Python', 'Excel avanzado', 'Análisis de datos'],
      likesDe: [KARLA, CARLOS, OSCAR],
    },
    {
      autor: VALERIA,
      titulo: 'App móvil de horarios y aulas para la facultad',
      descripcion:
        'Aplicación en Flutter publicada en Google Play que muestra horarios, aulas y avisos de la facultad. Tiene más de 450 descargas y 4,4 estrellas. Aprendí a priorizar según reseñas reales y a manejar actualizaciones sin romper a quienes no actualizan.',
      materia: 'Desarrollo de Aplicaciones Móviles',
      periodo: 'Ciclo 02-2026',
      urlRepositorio: 'https://github.com/vchavez-mobile/horarios-facultad',
      tecnologias: ['Flutter', 'Kotlin', 'APIs REST', 'Git'],
      likesDe: [MARIA, GABRIELA, KEVIN, JOSE, KARLA],
    },
    {
      autor: OSCAR,
      titulo: 'Plantilla de conciliación bancaria para pequeños comercios',
      descripcion:
        'Libro de Excel con fórmulas y validaciones que concilia el estado de cuenta con los registros del comercio y marca las diferencias. Lo usan tres negocios de mi comunidad; uno redujo el cierre mensual de dos días a medio día.',
      materia: 'Contabilidad Intermedia',
      periodo: 'Ciclo 02-2026',
      urlRepositorio: null,
      tecnologias: ['Excel avanzado', 'Contabilidad básica'],
      likesDe: [KARLA, RODRIGO],
    },
  ],

  vacantes: [
    {
      empresa: CUSCATLAN,
      titulo: 'Pasantía de desarrollo frontend con React',
      descripcion:
        'Te unirás al equipo de banca en línea para construir pantallas con React y TypeScript. Tendrás una persona mentora, revisión de código en cada entrega y un proyecto propio de tres meses. Pasantía remunerada de 6 meses con posibilidad de contratación.',
      tipo: 'pasantia',
      modalidad: 'hibrida',
      departamento: 'san_salvador',
      estado: 'abierta',
      requeridas: ['React', 'TypeScript'],
      deseables: ['Git', 'Pruebas automatizadas', 'Next.js'],
    },
    {
      empresa: CUSCATLAN,
      titulo: 'Desarrollador backend junior (NestJS)',
      descripcion:
        'Primer empleo en nuestro equipo de pagos. Trabajarás en APIs con NestJS y PostgreSQL, con pruebas de integración y despliegue en contenedores. Valoramos más un buen proyecto que años de experiencia.',
      tipo: 'primer_empleo',
      modalidad: 'hibrida',
      departamento: 'san_salvador',
      estado: 'abierta',
      requeridas: ['Node.js', 'PostgreSQL', 'APIs REST'],
      deseables: ['NestJS', 'Docker'],
    },
    {
      empresa: CUSCATLAN,
      titulo: 'Desarrollador móvil trainee (Flutter)',
      descripcion:
        'Programa de formación de cuatro meses para desarrollar la app móvil de nuestros clientes cooperativos. Aprenderás arquitectura móvil, pruebas y publicación en tiendas.',
      tipo: 'trainee',
      modalidad: 'presencial',
      departamento: 'san_salvador',
      estado: 'abierta',
      requeridas: ['Flutter'],
      deseables: ['Kotlin', 'APIs REST', 'Figma'],
    },
    {
      empresa: AGROALBA,
      titulo: 'Analista de datos junior para agroindustria',
      descripcion:
        'Construirás los tableros de costos, inventarios y producción de nuestras fincas en Santa Ana. Trabajarás con la gerencia de operaciones y el equipo contable. Se requiere SQL y buen manejo de Excel; enseñamos Power BI.',
      tipo: 'primer_empleo',
      modalidad: 'presencial',
      departamento: 'santa_ana',
      estado: 'abierta',
      requeridas: ['SQL', 'Excel avanzado', 'Análisis de datos'],
      deseables: ['Power BI', 'Python'],
    },
    {
      empresa: AGROALBA,
      titulo: 'Pasantía en contabilidad de costos',
      descripcion:
        'Apoyarás el registro y la conciliación de costos de cosecha y beneficiado. Ideal para estudiantes de contaduría o administración en los últimos ciclos. Pasantía de 5 meses con medio tiempo flexible.',
      tipo: 'pasantia',
      modalidad: 'presencial',
      departamento: 'ahuachapan',
      estado: 'abierta',
      requeridas: ['Contabilidad básica', 'Excel avanzado'],
      deseables: ['Power BI'],
    },
    {
      empresa: LUMEN,
      titulo: 'Diseñador/a de marca e interfaces',
      descripcion:
        'Participarás en proyectos de identidad y diseño web para emprendimientos. Presentarás propuestas al cliente con apoyo de la dirección creativa. Pedimos portafolio con al menos dos proyectos completos.',
      tipo: 'primer_empleo',
      modalidad: 'hibrida',
      departamento: 'san_salvador',
      estado: 'abierta',
      requeridas: ['Figma', 'Diseño de interfaces'],
      deseables: ['Photoshop', 'Ilustración digital'],
    },
    {
      empresa: LUMEN,
      titulo: 'Pasantía de contenido y redes sociales',
      descripcion:
        'Planificarás y producirás contenido para tres cuentas de clientes: guiones, redacción, edición de video corto y reporte mensual de métricas. Trabajo 100 % remoto con reuniones semanales.',
      tipo: 'pasantia',
      modalidad: 'remota',
      departamento: null,
      estado: 'abierta',
      requeridas: ['Redacción de contenidos', 'Redes sociales'],
      deseables: ['Edición de video', 'SEO', 'Marketing digital'],
    },
    {
      empresa: REDES,
      titulo: 'Técnico de soporte y redes nivel 1',
      descripcion:
        'Atenderás incidencias de clientes empresariales, configurarás equipos y escalarás con documentación clara. Ruta de crecimiento a infraestructura y seguridad con formación interna y certificación pagada tras seis meses.',
      tipo: 'primer_empleo',
      modalidad: 'presencial',
      departamento: 'san_miguel',
      estado: 'abierta',
      requeridas: ['Redes y conectividad', 'Atención al cliente'],
      deseables: ['Linux', 'Ciberseguridad'],
    },
    {
      empresa: REDES,
      titulo: 'Trainee de seguridad informática',
      descripcion:
        'Programa de cinco meses en nuestro centro de operaciones de seguridad: revisarás alertas, documentarás incidentes y aprenderás a automatizar respuestas. Se requiere base en redes y Linux.',
      tipo: 'trainee',
      modalidad: 'hibrida',
      departamento: 'la_libertad',
      estado: 'abierta',
      requeridas: ['Ciberseguridad', 'Linux'],
      deseables: ['Python', 'Docker', 'Redes y conectividad'],
    },
    {
      empresa: CUSCATLAN,
      titulo: 'Analista de calidad (QA) automatizada',
      descripcion:
        'Vacante en preparación para el equipo de calidad. Estamos definiendo el alcance del puesto, las herramientas de pruebas y el plan de formación.',
      tipo: 'primer_empleo',
      modalidad: 'hibrida',
      departamento: 'san_salvador',
      estado: 'borrador',
      requeridas: ['Pruebas automatizadas'],
      deseables: ['TypeScript', 'Git'],
    },
  ],

  postulaciones: [
    {
      vacante: 'Pasantía de desarrollo frontend con React',
      talento: MARIA,
      proyectos: [
        'Panel de reservas para canchas de fútbol 7',
        'Sistema de diseño en React para el curso de Interfaces',
      ],
      estado: 'entrevista',
    },
    {
      vacante: 'Pasantía de desarrollo frontend con React',
      talento: KEVIN,
      proyectos: ['Calculadora de gastos compartidos para estudiantes'],
      estado: 'descartada',
      motivoDescarte: 'falta_habilidad_tecnica',
    },
    {
      vacante: 'Desarrollador backend junior (NestJS)',
      talento: JOSE,
      proyectos: [
        'API de reservas para clínicas con control de concurrencia',
        'Despliegue automatizado con Docker para un monolito legado',
      ],
      estado: 'seleccionada',
    },
    {
      vacante: 'Desarrollador móvil trainee (Flutter)',
      talento: VALERIA,
      proyectos: ['App móvil de horarios y aulas para la facultad'],
      estado: 'en_revision',
    },
    {
      vacante: 'Analista de datos junior para agroindustria',
      talento: KARLA,
      proyectos: ['Control de costos de beneficiado de café en Power BI'],
      estado: 'entrevista',
    },
    {
      vacante: 'Analista de datos junior para agroindustria',
      talento: CARLOS,
      proyectos: [
        'Consultas SQL para el análisis de un mercado municipal',
        'Predicción de deserción estudiantil con datos abiertos',
      ],
      estado: 'en_revision',
    },
    {
      vacante: 'Analista de datos junior para agroindustria',
      talento: RODRIGO,
      proyectos: ['Automatización del reporte semanal de producción'],
      estado: 'recibida',
    },
    {
      vacante: 'Pasantía en contabilidad de costos',
      talento: OSCAR,
      proyectos: ['Plantilla de conciliación bancaria para pequeños comercios'],
      estado: 'en_revision',
    },
    {
      vacante: 'Diseñador/a de marca e interfaces',
      talento: GABRIELA,
      proyectos: [
        'Identidad visual y sistema de marca para una cafetería de especialidad',
        'Prototipo de app de pagos de servicios para adultos mayores',
      ],
      estado: 'entrevista',
    },
    {
      vacante: 'Pasantía de contenido y redes sociales',
      talento: DANIELA,
      proyectos: ['Estrategia de contenido para una panadería artesanal'],
      estado: 'recibida',
    },
    {
      vacante: 'Técnico de soporte y redes nivel 1',
      talento: DIEGO,
      proyectos: ['Rediseño de la red del instituto con VLAN y documentación'],
      estado: 'en_revision',
    },
    {
      vacante: 'Trainee de seguridad informática',
      talento: ANDREA,
      proyectos: [
        'Auditoría de seguridad de una aplicación web vulnerable',
        'Laboratorio de detección de intrusos con contenedores',
      ],
      estado: 'entrevista',
    },
    {
      vacante: 'Trainee de seguridad informática',
      talento: DIEGO,
      proyectos: ['Rediseño de la red del instituto con VLAN y documentación'],
      estado: 'recibida',
    },
  ],
};
