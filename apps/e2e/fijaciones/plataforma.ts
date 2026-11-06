import {
  auth,
  type catalogos,
  type interacciones,
  type perfiles,
  proyectos,
  vacantes,
} from '@impulsau/contracts';
import type { Page, Route } from '@playwright/test';

/**
 * Doble con estado de todo el backend que usa el frontend: sesión, catálogos, feed, likes,
 * proyectos, vacantes, postulaciones y perfiles. Cada petición se valida con los esquemas del
 * contrato, así que una prueba también falla si el frontend manda un cuerpo inválido.
 * No hay backend, Supabase, Redis ni correo reales.
 */

export type Rol = 'talento' | 'empresa';

export const CONTRASENA = 'una-clave-larga';
export const CORREO_TALENTO = 'ana@demo.impulsau.test';
export const CORREO_EMPRESA = 'empresa@demo.impulsau.test';

const id = (n: number): string =>
  `4b0a0a3e-3a0f-4c53-9a53-0d0a8f1b2c${n.toString(16).padStart(2, '0')}`;

export const ID_ANA = id(1);
export const ID_LUIS = id(2);
export const ID_EMPRESA = id(3);
export const ID_OTRA_EMPRESA = id(4);
export const ID_REACT = id(10);
export const ID_NODE = id(11);
export const ID_SQL = id(12);
export const ID_PROYECTO_LUIS = id(20);
export const ID_PROYECTO_ANA = id(21);
export const ID_VACANTE_WEB = id(30);
export const ID_VACANTE_DATOS = id(31);

const cabeceras = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type, authorization, idempotency-key',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const cuentas: Record<Rol, auth.UsuarioSesion> = {
  talento: {
    id: ID_ANA,
    correo: CORREO_TALENTO,
    rol: 'talento',
    estado: 'activo',
    nombre: 'Ana Demo',
  },
  empresa: {
    id: ID_EMPRESA,
    correo: CORREO_EMPRESA,
    rol: 'empresa',
    estado: 'activo',
    nombre: '[Empresa Demo]',
  },
};

export function sesionDe(rol: Rol): auth.Sesion {
  return {
    accessToken: `token-${rol}`,
    refreshToken: `renovacion-${rol}`,
    expiraEn: Math.floor(Date.now() / 1000) + 3600,
    usuario: cuentas[rol],
  };
}

const catalogo: catalogos.Catalogos = {
  habilidades: [
    { id: ID_REACT, nombre: 'React', slug: 'react', categoria: 'Frontend' },
    { id: ID_NODE, nombre: 'Node.js', slug: 'node-js', categoria: 'Backend' },
    { id: ID_SQL, nombre: 'SQL', slug: 'sql', categoria: 'Datos' },
  ],
  carreras: [{ id: id(40), nombre: 'Ingeniería en Sistemas', slug: 'ingenieria-sistemas' }],
  instituciones: [
    {
      id: id(41),
      nombre: '[Universidad Demo]',
      slug: 'universidad-demo',
      departamento: 'san_salvador',
    },
  ],
};

interface PostulacionGuardada {
  id: string;
  vacanteId: string;
  proyectoIds: string[];
  estado: vacantes.EstadoPostulacion;
  motivoDescarte: vacantes.MotivoDescarte | null;
  detalleDescarte: string | null;
  version: number;
}

/** Lo que el doble vio llegar; las pruebas lo consultan para afirmar efectos reales. */
export interface Plataforma {
  inicios: auth.IniciarSesionEntrada[];
  cierres: auth.CerrarSesionEntrada['alcance'][];
  likes: ('PUT' | 'DELETE')[];
  proyectosPublicados: proyectos.PublicarProyectoEntrada[];
  vacantesPublicadas: vacantes.PublicarVacanteEntrada[];
  cambiosDeVacante: vacantes.CambiarEstadoVacanteEntrada['estado'][];
  postulaciones: PostulacionGuardada[];
  cambiosDePostulacion: vacantes.CambiarEstadoPostulacionEntrada[];
  llavesDeIdempotencia: string[];
}

export interface OpcionesPlataforma {
  /** El inicio de sesión responde 401. */
  credencialesInvalidas?: boolean;
  /** Todo endpoint protegido responde 401 y la renovación también falla. */
  sesionVencida?: boolean;
  /** `GET /proyectos` responde 500. */
  feedFalla?: boolean;
  /** `GET /proyectos` responde sin elementos. */
  feedVacio?: boolean;
  /** `GET /proyectos` espera a que esta promesa se resuelva (para ver el esqueleto). */
  esperarFeed?: Promise<void>;
  /** `POST /auth/login` responde 429. */
  demasiadosIntentos?: boolean;
}

function error(estado: number, code: string, message: string) {
  return { estado, cuerpo: { code, message } };
}

function paginaDe<T>(items: T[]): { items: T[]; siguienteCursor: null } {
  return { items, siguienteCursor: null };
}

function resumenDe(p: proyectos.ProyectoDetalle): proyectos.ProyectoResumen {
  return {
    id: p.id,
    titulo: p.titulo,
    extracto: p.descripcion.slice(0, 140),
    autor: p.autor,
    tecnologias: p.tecnologias,
    imagenUrl: null,
    likes: p.likes,
    meGusta: p.meGusta,
    estado: p.estado,
    publicadoEn: p.publicadoEn ?? '2026-10-01T10:00:00.000Z',
  };
}

function habilidadesDe(
  elegidas: { id: string; requerida: boolean }[],
): vacantes.VacanteDetalle['habilidades'] {
  return elegidas.flatMap((elegida) => {
    const encontrada = catalogo.habilidades.find((h) => h.id === elegida.id);
    return encontrada
      ? [{ id: encontrada.id, nombre: encontrada.nombre, requerida: elegida.requerida }]
      : [];
  });
}

function proyectoBase(
  idProyecto: string,
  autor: { id: string; nombre: string },
  titulo: string,
  descripcion: string,
  likes: number,
): proyectos.ProyectoDetalle {
  return {
    id: idProyecto,
    titulo,
    descripcion,
    materia: null,
    periodo: null,
    urlRepositorio: null,
    urlDemo: null,
    urlVideo: null,
    autor,
    tecnologias: [{ id: ID_REACT, nombre: 'React' }],
    imagenes: [],
    likes,
    meGusta: false,
    estado: 'publicado',
    publicadoEn: '2026-10-01T10:00:00.000Z',
    esMio: false,
    version: 1,
  };
}

function vacanteBase(
  idVacante: string,
  empresa: { id: string; nombre: string },
  titulo: string,
  modalidad: vacantes.ModalidadVacante,
  tipo: vacantes.TipoVacante,
): vacantes.VacanteDetalle {
  return {
    id: idVacante,
    titulo,
    empresa,
    tipo,
    modalidad,
    departamento: 'san_salvador',
    estado: 'abierta',
    habilidades: [{ id: ID_REACT, nombre: 'React', requerida: true }],
    coincidencia: null,
    publicadaEn: '2026-10-02T10:00:00.000Z',
    descripcion:
      'Construirás pantallas reales junto a un equipo que te acompaña desde el primer día.',
    esMia: false,
    yaPostulado: false,
    version: 1,
  };
}

export async function simularPlataforma(
  page: Page,
  opciones: OpcionesPlataforma = {},
): Promise<Plataforma> {
  const plataforma: Plataforma = {
    inicios: [],
    cierres: [],
    likes: [],
    proyectosPublicados: [],
    vacantesPublicadas: [],
    cambiosDeVacante: [],
    postulaciones: [],
    cambiosDePostulacion: [],
    llavesDeIdempotencia: [],
  };

  const ana = { id: ID_ANA, nombre: 'Ana Demo' };
  const luis = { id: ID_LUIS, nombre: 'Luis Demo' };
  const proyectosGuardados: proyectos.ProyectoDetalle[] = [
    proyectoBase(
      ID_PROYECTO_LUIS,
      luis,
      'Gestor de tareas para estudiantes',
      'Aplicación web para organizar entregas y exámenes por materia.',
      2,
    ),
    proyectoBase(
      ID_PROYECTO_ANA,
      ana,
      'Tienda en línea con Node',
      'Catálogo, carrito y pagos simulados con una API propia.',
      0,
    ),
  ];
  const vacantesGuardadas: vacantes.VacanteDetalle[] = [
    vacanteBase(
      ID_VACANTE_WEB,
      { id: ID_EMPRESA, nombre: '[Empresa Demo]' },
      'Pasantía de desarrollo web',
      'hibrida',
      'pasantia',
    ),
    vacanteBase(
      ID_VACANTE_DATOS,
      { id: ID_OTRA_EMPRESA, nombre: '[Otra Empresa]' },
      'Trainee de datos',
      'remota',
      'trainee',
    ),
  ];

  function rolDe(autorizacion: string | undefined): Rol | null {
    if (opciones.sesionVencida) return null;
    if (autorizacion === 'Bearer token-talento') return 'talento';
    if (autorizacion === 'Bearer token-empresa') return 'empresa';
    return null;
  }

  function detalleDeVacante(v: vacantes.VacanteDetalle, rol: Rol): vacantes.VacanteDetalle {
    return {
      ...v,
      coincidencia: rol === 'talento' ? 100 : null,
      esMia: rol === 'empresa' && v.empresa.id === ID_EMPRESA,
      yaPostulado: rol === 'talento' && plataforma.postulaciones.some((p) => p.vacanteId === v.id),
    };
  }

  function tituloDeProyecto(idProyecto: string): { id: string; titulo: string } {
    const encontrado = proyectosGuardados.find((p) => p.id === idProyecto);
    return { id: idProyecto, titulo: encontrado?.titulo ?? 'Proyecto' };
  }

  function recibida(p: PostulacionGuardada): vacantes.PostulacionRecibida {
    return {
      id: p.id,
      talento: { id: ID_ANA, nombre: 'Ana Demo', carrera: 'Ingeniería en Sistemas' },
      estado: p.estado,
      motivoDescarte: p.motivoDescarte,
      detalleDescarte: p.detalleDescarte,
      proyectos: p.proyectoIds.map(tituloDeProyecto),
      creadaEn: '2026-10-03T10:00:00.000Z',
      version: p.version,
    };
  }

  function propia(p: PostulacionGuardada): vacantes.Postulacion {
    const vacante = vacantesGuardadas.find((v) => v.id === p.vacanteId);
    return {
      id: p.id,
      vacante: {
        id: p.vacanteId,
        titulo: vacante?.titulo ?? 'Vacante',
        empresa: vacante?.empresa.nombre ?? '[Empresa]',
      },
      estado: p.estado,
      motivoDescarte: p.motivoDescarte,
      proyectos: p.proyectoIds.map(tituloDeProyecto),
      creadaEn: '2026-10-03T10:00:00.000Z',
    };
  }

  async function responder(ruta: Route, estado: number, cuerpo?: unknown): Promise<void> {
    if (cuerpo === undefined) {
      await ruta.fulfill({ status: estado, headers: cabeceras });
      return;
    }
    await ruta.fulfill({
      status: estado,
      headers: cabeceras,
      contentType: 'application/json',
      body: JSON.stringify(cuerpo),
    });
  }

  await page.route('http://localhost:3000/**', async (ruta) => {
    const peticion = ruta.request();
    const url = new URL(peticion.url());
    const { pathname } = url;
    const metodo = peticion.method();
    const cuerpo: unknown = peticion.postData() === null ? undefined : peticion.postDataJSON();
    const falla = async ({ estado, cuerpo: c }: ReturnType<typeof error>) =>
      responder(ruta, estado, c);
    const noAutenticado = () => falla(error(401, 'no_autenticado', 'Sesión no válida'));

    if (metodo === 'OPTIONS') return responder(ruta, 204);

    // --- Sesión (sin autenticación) ---
    if (pathname === '/auth/login' && metodo === 'POST') {
      const entrada = auth.IniciarSesionEntrada.parse(cuerpo);
      plataforma.inicios.push(entrada);
      if (opciones.demasiadosIntentos) {
        return falla(error(429, 'demasiadas_peticiones', 'Demasiados intentos'));
      }
      const rol: Rol | null =
        entrada.correo === CORREO_TALENTO
          ? 'talento'
          : entrada.correo === CORREO_EMPRESA
            ? 'empresa'
            : null;
      if (opciones.credencialesInvalidas || rol === null || entrada.contrasena !== CONTRASENA) {
        return falla(error(401, 'credenciales_invalidas', 'Credenciales inválidas'));
      }
      return responder(ruta, 200, sesionDe(rol));
    }
    if (pathname === '/auth/refresh') {
      return opciones.sesionVencida ? noAutenticado() : responder(ruta, 200, sesionDe('talento'));
    }

    const rol = rolDe(peticion.headers()['authorization']);
    if (rol === null) return noAutenticado();

    if (pathname === '/auth/logout' && metodo === 'POST') {
      plataforma.cierres.push(auth.CerrarSesionEntrada.parse(cuerpo).alcance);
      return responder(ruta, 204);
    }
    if (pathname === '/catalogos') return responder(ruta, 200, catalogo);

    // --- Proyectos ---
    if (pathname === '/proyectos' && metodo === 'GET') {
      if (opciones.esperarFeed) await opciones.esperarFeed;
      if (opciones.feedFalla) return falla(error(500, 'error_interno', 'Falla simulada'));
      if (opciones.feedVacio) return responder(ruta, 200, paginaDe([]));
      const autorId = url.searchParams.get('autorId');
      const visibles = proyectosGuardados.filter(
        (p) => p.estado === 'publicado' && (autorId === null || p.autor.id === autorId),
      );
      return responder(ruta, 200, paginaDe(visibles.map(resumenDe)));
    }
    if (pathname === '/proyectos' && metodo === 'POST') {
      const llave = peticion.headers()['idempotency-key'];
      if (llave) plataforma.llavesDeIdempotencia.push(llave);
      const entrada = proyectos.PublicarProyectoEntrada.parse(cuerpo);
      plataforma.proyectosPublicados.push(entrada);
      const nuevo: proyectos.ProyectoDetalle = {
        ...proyectoBase(crypto.randomUUID(), ana, entrada.titulo, entrada.descripcion, 0),
        materia: entrada.materia,
        periodo: entrada.periodo,
        urlRepositorio: entrada.urlRepositorio,
        urlDemo: entrada.urlDemo,
        urlVideo: entrada.urlVideo,
        tecnologias: catalogo.habilidades
          .filter((h) => entrada.tecnologiaIds.includes(h.id))
          .map((h) => ({ id: h.id, nombre: h.nombre })),
        estado: entrada.publicar ? 'publicado' : 'borrador',
        esMio: true,
      };
      proyectosGuardados.unshift(nuevo);
      return responder(ruta, 201, nuevo);
    }
    const rutaProyecto = /^\/proyectos\/([^/]+)(\/like)?$/.exec(pathname);
    if (rutaProyecto) {
      const encontrado = proyectosGuardados.find((p) => p.id === rutaProyecto[1]);
      if (!encontrado) return falla(error(404, 'no_encontrado', 'No existe'));
      if (rutaProyecto[2]) {
        const quiere = metodo === 'PUT';
        plataforma.likes.push(quiere ? 'PUT' : 'DELETE');
        if (quiere && !encontrado.meGusta) encontrado.likes += 1;
        if (!quiere && encontrado.meGusta) encontrado.likes -= 1;
        encontrado.meGusta = quiere;
        const estado: interacciones.EstadoLike = {
          likes: encontrado.likes,
          meGusta: encontrado.meGusta,
        };
        return responder(ruta, 200, estado);
      }
      if (metodo === 'DELETE') {
        proyectosGuardados.splice(proyectosGuardados.indexOf(encontrado), 1);
        return responder(ruta, 204);
      }
      return responder(ruta, 200, {
        ...encontrado,
        esMio: encontrado.autor.id === cuentas[rol].id,
      });
    }

    // --- Vacantes y postulaciones ---
    if (pathname === '/vacantes' && metodo === 'GET') {
      const q = url.searchParams.get('q')?.toLowerCase();
      const tipo = url.searchParams.get('tipo');
      const modalidad = url.searchParams.get('modalidad');
      const visibles = vacantesGuardadas
        .filter((v) => (rol === 'empresa' ? v.empresa.id === ID_EMPRESA : v.estado === 'abierta'))
        .filter((v) => !q || v.titulo.toLowerCase().includes(q))
        .filter((v) => !tipo || v.tipo === tipo)
        .filter((v) => !modalidad || v.modalidad === modalidad)
        .map((v) => detalleDeVacante(v, rol));
      return responder(ruta, 200, paginaDe(visibles));
    }
    if (pathname === '/vacantes' && metodo === 'POST') {
      if (rol !== 'empresa') return falla(error(403, 'prohibido', 'Solo empresas'));
      const entrada = vacantes.PublicarVacanteEntrada.parse(cuerpo);
      plataforma.vacantesPublicadas.push(entrada);
      const nueva: vacantes.VacanteDetalle = {
        ...vacanteBase(
          crypto.randomUUID(),
          { id: ID_EMPRESA, nombre: '[Empresa Demo]' },
          entrada.titulo,
          entrada.modalidad,
          entrada.tipo,
        ),
        descripcion: entrada.descripcion,
        departamento: entrada.departamento,
        habilidades: habilidadesDe(entrada.habilidades),
        estado: entrada.publicar ? 'abierta' : 'borrador',
        publicadaEn: entrada.publicar ? new Date().toISOString() : null,
      };
      vacantesGuardadas.unshift(nueva);
      return responder(ruta, 201, detalleDeVacante(nueva, rol));
    }
    const rutaVacante = /^\/vacantes\/([^/]+)(\/estado|\/postulaciones)?$/.exec(pathname);
    if (rutaVacante) {
      const vacante = vacantesGuardadas.find((v) => v.id === rutaVacante[1]);
      if (!vacante) return falla(error(404, 'no_encontrado', 'No existe'));
      const sufijo = rutaVacante[2];
      if (sufijo === '/estado' && metodo === 'PUT') {
        const { estado } = vacantes.CambiarEstadoVacanteEntrada.parse(cuerpo);
        plataforma.cambiosDeVacante.push(estado);
        vacante.estado = estado;
        vacante.version += 1;
        return responder(ruta, 200, detalleDeVacante(vacante, rol));
      }
      if (sufijo === '/postulaciones' && metodo === 'POST') {
        const llave = peticion.headers()['idempotency-key'];
        if (llave) plataforma.llavesDeIdempotencia.push(llave);
        const entrada = vacantes.PostularseEntrada.parse(cuerpo);
        const repetida = plataforma.postulaciones.some((p) => p.vacanteId === vacante.id);
        if (repetida || vacante.estado !== 'abierta') {
          return falla(error(409, 'conflicto', 'Ya te postulaste o la vacante no está abierta'));
        }
        const nueva: PostulacionGuardada = {
          id: crypto.randomUUID(),
          vacanteId: vacante.id,
          proyectoIds: entrada.proyectoIds,
          estado: 'recibida',
          motivoDescarte: null,
          detalleDescarte: null,
          version: 1,
        };
        plataforma.postulaciones.push(nueva);
        return responder(ruta, 201, propia(nueva));
      }
      if (sufijo === '/postulaciones' && metodo === 'GET') {
        const recibidas = plataforma.postulaciones
          .filter((p) => p.vacanteId === vacante.id)
          .map(recibida);
        return responder(ruta, 200, recibidas);
      }
      return responder(ruta, 200, detalleDeVacante(vacante, rol));
    }
    if (pathname === '/postulaciones/mias') {
      return responder(ruta, 200, plataforma.postulaciones.map(propia));
    }
    const rutaPostulacion = /^\/postulaciones\/([^/]+)\/estado$/.exec(pathname);
    if (rutaPostulacion && metodo === 'PUT') {
      const entrada = vacantes.CambiarEstadoPostulacionEntrada.parse(cuerpo);
      plataforma.cambiosDePostulacion.push(entrada);
      const guardada = plataforma.postulaciones.find((p) => p.id === rutaPostulacion[1]);
      if (!guardada) return falla(error(404, 'no_encontrado', 'No existe'));
      if (guardada.version !== entrada.version) {
        return falla(error(409, 'conflicto', 'Versión desactualizada'));
      }
      guardada.estado = entrada.estado;
      guardada.motivoDescarte = entrada.motivoDescarte ?? null;
      guardada.detalleDescarte = entrada.detalleDescarte ?? null;
      guardada.version += 1;
      return responder(ruta, 200, recibida(guardada));
    }

    // --- Perfiles ---
    const rutaPerfil = /^\/perfiles\/(talentos|empresas)\/([^/]+)$/.exec(pathname);
    if (rutaPerfil && metodo === 'GET') {
      if (rutaPerfil[1] === 'talentos') {
        const perfil: perfiles.PerfilTalento = {
          id: ID_ANA,
          nombreCompleto: 'Ana Demo',
          estadoAcademico: 'estudiante',
          ciclo: 6,
          anioEgreso: null,
          carrera: { id: catalogo.carreras[0]?.id ?? id(40), nombre: 'Ingeniería en Sistemas' },
          institucion: { id: id(41), nombre: '[Universidad Demo]' },
          departamento: 'san_salvador',
          bio: 'Me gusta construir cosas pequeñas que funcionan de verdad.',
          habilidades: [
            { id: ID_REACT, nombre: 'React', categoria: 'Frontend', proyectos: 1 },
            { id: ID_SQL, nombre: 'SQL', categoria: 'Datos', proyectos: 0 },
          ],
          enlaces: [{ tipo: 'github', url: 'https://github.com/ana-demo' }],
          proyectos: proyectosGuardados
            .filter((p) => p.autor.id === ID_ANA && p.estado === 'publicado')
            .map((p) => ({
              id: p.id,
              titulo: p.titulo,
              imagenUrl: null,
              likes: p.likes,
              publicadoEn: p.publicadoEn ?? '2026-10-01T10:00:00.000Z',
            })),
          version: 1,
        };
        return responder(ruta, 200, perfil);
      }
      const perfil: perfiles.PerfilEmpresa = {
        id: ID_EMPRESA,
        nombreComercial: '[Empresa Demo]',
        nombreLegal: null,
        sector: 'Tecnología',
        sitioWeb: 'https://empresa-demo.example',
        descripcion: 'Equipo pequeño que contrata talento de entrada.',
        estadoVerificacion: 'verificada',
        esAgencia: false,
        clienteDeclarado: null,
        version: 1,
      };
      return responder(ruta, 200, perfil);
    }

    return falla(error(404, 'no_encontrado', 'No existe'));
  });

  return plataforma;
}

/** Deja la sesión guardada como si la persona ya hubiera iniciado sesión. */
export async function conSesion(page: Page, rol: Rol): Promise<void> {
  await page.addInitScript(
    (contenido: string) => {
      localStorage.setItem('impulsau.sesion', contenido);
    },
    JSON.stringify(sesionDe(rol)),
  );
}
