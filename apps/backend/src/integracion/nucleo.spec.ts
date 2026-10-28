import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import {
  auth,
  catalogos,
  interacciones,
  perfiles,
  proyectos as contratoProyectos,
  vacantes as contratoVacantes,
  archivos as contratoArchivos,
} from '@impulsau/contracts';
import { crearBaseDeDatos, sembrarCatalogos } from '@impulsau/db';
import { z } from 'zod';
import type { ConexionBaseDeDatos } from '@impulsau/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppHttpModule } from '../app.http.module.js';
import { VERIFICADOR_TOKEN } from '../compartido/dominio/autenticacion.js';
import { fallo, ok } from '../compartido/dominio/resultado.js';
import { ALMACEN_ARCHIVOS } from '../modulos/archivos/puertos/puertos.js';

/**
 * Recorre la API completa sobre un Postgres y un Redis reales (los del compose), con la identidad
 * y el almacenamiento simulados. Cada ejecución crea y borra su propia base de datos.
 */
const URL_ADMIN =
  process.env['DATABASE_URL_PRUEBAS'] ?? 'postgres://impulsau:impulsau@localhost:5432/impulsau';
const NOMBRE_BASE = `integracion_${randomUUID().replaceAll('-', '')}`;
const DIRECTORIO_MIGRACIONES = fileURLToPath(
  new URL('../../../../packages/db/migraciones/', import.meta.url),
);

const talentoA = randomUUID();
const talentoB = randomUUID();
const empresaE = randomUUID();
const otraEmpresa = randomUUID();
const habilidadA = randomUUID();
const habilidadB = randomUUID();
const habilidadC = randomUUID();

let admin: ConexionBaseDeDatos;
let base: ConexionBaseDeDatos;
let app: NestFastifyApplication;

function urlDeBase(nombre: string): string {
  const url = new URL(URL_ADMIN);
  url.pathname = `/${nombre}`;
  return url.toString();
}

async function aplicarMigraciones(conexion: ConexionBaseDeDatos): Promise<void> {
  // Supabase ya trae `auth.users`; en un Postgres vacío hay que imitarla.
  await conexion.sql.unsafe('CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY)');
  const archivos = readdirSync(DIRECTORIO_MIGRACIONES)
    .filter((nombre) => nombre.endsWith('.sql'))
    .sort();
  for (const archivo of archivos) {
    const sentencias = readFileSync(`${DIRECTORIO_MIGRACIONES}${archivo}`, 'utf8').split(
      '--> statement-breakpoint',
    );
    for (const sentencia of sentencias) await conexion.sql.unsafe(sentencia);
  }
}

async function sembrar(): Promise<void> {
  const { sql } = base;
  for (const id of [talentoA, talentoB, empresaE, otraEmpresa]) {
    await sql`INSERT INTO auth.users (id) VALUES (${id})`;
  }
  await sql`INSERT INTO usuarios (id, correo, rol, estado, fecha_nacimiento) VALUES
    (${talentoA}, 'a@correo.com', 'talento', 'activo', '2000-01-01'),
    (${talentoB}, 'b@correo.com', 'talento', 'activo', '2000-01-01')`;
  await sql`INSERT INTO usuarios (id, correo, rol, estado) VALUES
    (${empresaE}, 'e@correo.com', 'empresa', 'activo'),
    (${otraEmpresa}, 'o@correo.com', 'empresa', 'activo')`;
  await sql`INSERT INTO talentos (usuario_id, nombre_completo, estado_academico, ciclo, declaracion_sin_experiencia_en) VALUES
    (${talentoA}, 'Ana Pérez', 'estudiante', 4, now()),
    (${talentoB}, 'Luis Gómez', 'estudiante', 6, now())`;
  await sql`INSERT INTO empresas (usuario_id, nombre_comercial) VALUES
    (${empresaE}, '[Empresa Uno]'), (${otraEmpresa}, '[Empresa Dos]')`;
  await sql`INSERT INTO habilidades (id, nombre, slug, categoria) VALUES
    (${habilidadA}, 'TypeScript', 'typescript', 'Lenguajes'),
    (${habilidadB}, 'React', 'react', 'Frontend'),
    (${habilidadC}, 'PostgreSQL', 'postgresql', 'Datos')`;
  await sql`INSERT INTO carreras (nombre, slug) VALUES ('Ingeniería en Sistemas', 'sistemas')`;
}

function como(
  usuarioId: string,
  metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  cuerpo?: object,
) {
  return app.inject({
    method: metodo,
    url,
    headers: {
      authorization: `Bearer ${usuarioId}`,
      ...(metodo === 'POST' ? { 'idempotency-key': randomUUID() } : {}),
    },
    ...(cuerpo ? { payload: cuerpo } : {}),
  });
}

/** Valida la respuesta con el esquema del contrato: además de leerla tipada, prueba que lo cumple. */
function leer<S extends z.ZodType>(respuesta: { json(): unknown }, esquema: S): z.output<S> {
  return esquema.parse(respuesta.json());
}

const proyecto = (extra: object = {}) => ({
  titulo: 'Sistema de inventario',
  descripcion: 'Un inventario con alertas de stock bajo.',
  materia: null,
  periodo: null,
  urlRepositorio: 'https://github.com/ejemplo/inventario',
  urlDemo: null,
  urlVideo: null,
  tecnologiaIds: [habilidadA, habilidadB],
  archivoIds: [],
  publicar: true,
  ...extra,
});

beforeAll(async () => {
  admin = crearBaseDeDatos(URL_ADMIN, 1);
  await admin.sql.unsafe(`CREATE DATABASE ${NOMBRE_BASE}`);
  base = crearBaseDeDatos(urlDeBase(NOMBRE_BASE), 3);
  await aplicarMigraciones(base);
  await sembrar();

  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '3999',
    CORS_ORIGIN: 'http://localhost:5173',
    DATABASE_URL: urlDeBase(NOMBRE_BASE),
    DATABASE_URL_MIGRACIONES: urlDeBase(NOMBRE_BASE),
    MIGRAR_AL_INICIAR: 'false',
    REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    SUPABASE_URL: 'https://proyecto-de-prueba.supabase.co',
    SUPABASE_JWKS_URL: 'https://proyecto-de-prueba.supabase.co/auth/v1/.well-known/jwks.json',
    SUPABASE_SERVICE_ROLE_KEY: 'llave-de-prueba',
    AI_SERVICE_URL: 'http://localhost:7860',
    AI_SERVICE_TOKEN: 'x'.repeat(32),
  });

  const modulo = await Test.createTestingModule({ imports: [AppHttpModule] })
    .overrideProvider(VERIFICADOR_TOKEN)
    .useValue({
      verificar: (token: string) =>
        Promise.resolve(token.length === 36 ? ok({ usuarioId: token }) : fallo('token_invalido')),
    })
    .overrideProvider(ALMACEN_ARCHIVOS)
    .useValue({
      firmarSubida: (clave: string) => Promise.resolve(ok(`https://almacen.prueba/subir/${clave}`)),
      tamanoSubido: () => Promise.resolve(ok(1024)),
      urlPublica: (clave: string) => `https://almacen.prueba/publico/${clave}`,
    })
    .compile();
  app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
}, 60_000);

afterAll(async () => {
  await app.close();
  await base.cerrar();
  await admin.sql.unsafe(`DROP DATABASE IF EXISTS ${NOMBRE_BASE} WITH (FORCE)`);
  await admin.cerrar();
});

describe('sesión y catálogos', () => {
  it('rechaza las rutas protegidas sin token', async () => {
    const respuesta = await app.inject({ method: 'GET', url: '/catalogos' });
    expect(respuesta.statusCode).toBe(401);
  });

  it('CU-05 /auth/me devuelve el resumen del usuario autenticado', async () => {
    const respuesta = await como(talentoA, 'GET', '/auth/me');
    expect(respuesta.statusCode).toBe(200);
    expect(leer(respuesta, auth.UsuarioSesion)).toMatchObject({
      rol: 'talento',
      nombre: 'Ana Pérez',
    });
  });

  it('CU-57 lista habilidades, carreras e instituciones', async () => {
    const respuesta = await como(talentoA, 'GET', '/catalogos');
    expect(respuesta.statusCode).toBe(200);
    const datos = leer(respuesta, catalogos.Catalogos);
    expect(datos.habilidades).toHaveLength(3);
    expect(datos.carreras).toHaveLength(1);
  });
});

describe('perfiles', () => {
  it('CU-09 edita el perfil y el bloqueo optimista rechaza una versión vieja', async () => {
    const entrada = {
      nombreCompleto: 'Ana Pérez',
      carreraId: null,
      institucionId: null,
      departamento: 'san_salvador',
      bio: 'Me gusta construir cosas.',
      habilidadIds: [habilidadA, habilidadC],
      enlaces: [{ tipo: 'github', url: 'https://github.com/ana' }],
      version: 1,
    };
    const primera = await como(talentoA, 'PUT', '/perfiles/talentos/me', entrada);
    expect(primera.statusCode).toBe(200);
    const perfil = leer(primera, perfiles.PerfilTalento);
    expect(perfil).toMatchObject({ version: 2, departamento: 'san_salvador' });
    expect(perfil.habilidades).toHaveLength(2);

    const vieja = await como(talentoA, 'PUT', '/perfiles/talentos/me', entrada);
    expect(vieja.statusCode).toBe(409);
  });

  it('CU-09 una habilidad que no existe en el catálogo da 422', async () => {
    const respuesta = await como(talentoA, 'PUT', '/perfiles/talentos/me', {
      nombreCompleto: 'Ana Pérez',
      carreraId: null,
      institucionId: null,
      departamento: null,
      bio: null,
      habilidadIds: [randomUUID()],
      enlaces: [],
      version: 2,
    });
    expect(respuesta.statusCode).toBe(422);
  });

  it('CU-09 una empresa no puede editar un perfil de talento', async () => {
    const respuesta = await como(empresaE, 'PUT', '/perfiles/talentos/me', {
      nombreCompleto: 'Intruso',
      carreraId: null,
      institucionId: null,
      departamento: null,
      bio: null,
      habilidadIds: [],
      enlaces: [],
      version: 1,
    });
    expect(respuesta.statusCode).toBe(403);
  });

  it('CU-10 la empresa edita su perfil y exige cliente si es agencia', async () => {
    const comun = {
      nombreComercial: '[Empresa Uno]',
      nombreLegal: null,
      sector: 'Tecnología',
      sitioWeb: 'https://empresa-uno.example',
      descripcion: 'Desarrollamos software.',
      version: 1,
    };
    const agenciaSinCliente = await como(empresaE, 'PUT', '/perfiles/empresas/me', {
      ...comun,
      esAgencia: true,
      clienteDeclarado: null,
    });
    expect(agenciaSinCliente.statusCode).toBe(422);

    const correcta = await como(empresaE, 'PUT', '/perfiles/empresas/me', {
      ...comun,
      esAgencia: false,
      clienteDeclarado: null,
    });
    expect(correcta.statusCode).toBe(200);
    expect(leer(correcta, perfiles.PerfilEmpresa)).toMatchObject({
      sector: 'Tecnología',
      version: 2,
    });
  });
});

describe('archivos y proyectos', () => {
  let archivoId = '';
  let proyectoId = '';

  it('CU-17 reserva una subida directa y la confirma', async () => {
    const solicitud = await como(talentoA, 'POST', '/archivos/subidas', {
      proposito: 'imagen_proyecto',
      tipoMime: 'image/png',
      tamanoBytes: 1024,
    });
    expect(solicitud.statusCode).toBe(201);
    const subida = leer(solicitud, contratoArchivos.SubidaSolicitada);
    archivoId = subida.archivoId;
    expect(subida.urlSubida).toContain('https://almacen.prueba/subir/');

    const confirmacion = await como(talentoA, 'POST', `/archivos/${archivoId}/confirmar`);
    expect(confirmacion.statusCode).toBe(200);
  });

  it('CU-17 otro usuario no puede confirmar un archivo ajeno', async () => {
    const respuesta = await como(talentoB, 'POST', `/archivos/${archivoId}/confirmar`);
    expect(respuesta.statusCode).toBe(404);
  });

  it('CU-17 publica un proyecto con imagen y repetir la llave no lo duplica', async () => {
    const llave = randomUUID();
    const enviar = () =>
      app.inject({
        method: 'POST',
        url: '/proyectos',
        headers: { authorization: `Bearer ${talentoA}`, 'idempotency-key': llave },
        payload: proyecto({ archivoIds: [archivoId] }),
      });
    const primera = await enviar();
    expect(primera.statusCode).toBe(201);
    const detalle = leer(primera, contratoProyectos.ProyectoDetalle);
    proyectoId = detalle.id;
    expect(detalle).toMatchObject({ estado: 'publicado', esMio: true });
    expect(detalle.imagenes).toHaveLength(1);

    const repetida = await enviar();
    expect(leer(repetida, contratoProyectos.ProyectoDetalle).id).toBe(proyectoId);
    const total = await base.sql`SELECT count(*)::int AS total FROM proyectos`;
    expect(total[0]?.['total']).toBe(1);
  });

  it('CU-17 una empresa no puede publicar proyectos', async () => {
    const respuesta = await como(empresaE, 'POST', '/proyectos', proyecto());
    expect(respuesta.statusCode).toBe(403);
  });

  it('CU-17 rechaza una tecnología inexistente', async () => {
    const respuesta = await como(
      talentoA,
      'POST',
      '/proyectos',
      proyecto({ tecnologiaIds: [randomUUID()] }),
    );
    expect(respuesta.statusCode).toBe(422);
  });

  it('CU-20 el feed pagina por cursor sin repetir ni saltar proyectos', async () => {
    await como(talentoA, 'POST', '/proyectos', proyecto({ titulo: 'Segundo proyecto' }));
    await como(talentoB, 'POST', '/proyectos', proyecto({ titulo: 'Tercer proyecto' }));

    const primera = leer(
      await como(talentoB, 'GET', '/proyectos?limite=2'),
      contratoProyectos.PaginaProyectos,
    );
    expect(primera.items).toHaveLength(2);
    expect(primera.siguienteCursor).not.toBeNull();

    const segunda = leer(
      await como(talentoB, 'GET', `/proyectos?limite=2&cursor=${primera.siguienteCursor ?? ''}`),
      contratoProyectos.PaginaProyectos,
    );
    expect(segunda.items).toHaveLength(1);
    expect(segunda.siguienteCursor).toBeNull();

    const ids = [...primera.items, ...segunda.items].map((item) => item.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('CU-22 dar y quitar like es idempotente', async () => {
    const ponerDos = [
      leer(await como(talentoB, 'PUT', `/proyectos/${proyectoId}/like`), interacciones.EstadoLike),
      leer(await como(talentoB, 'PUT', `/proyectos/${proyectoId}/like`), interacciones.EstadoLike),
    ];
    expect(ponerDos).toEqual([
      { likes: 1, meGusta: true },
      { likes: 1, meGusta: true },
    ]);
    const quitarDos = [
      leer(
        await como(talentoB, 'DELETE', `/proyectos/${proyectoId}/like`),
        interacciones.EstadoLike,
      ),
      leer(
        await como(talentoB, 'DELETE', `/proyectos/${proyectoId}/like`),
        interacciones.EstadoLike,
      ),
    ];
    expect(quitarDos).toEqual([
      { likes: 0, meGusta: false },
      { likes: 0, meGusta: false },
    ]);
  });

  it('CU-11 el perfil muestra la evidencia: proyectos publicados por habilidad', async () => {
    const perfil = leer(
      await como(empresaE, 'GET', `/perfiles/talentos/${talentoA}`),
      perfiles.PerfilTalento,
    );
    const typescript = perfil.habilidades.find((habilidad) => habilidad.nombre === 'TypeScript');
    expect(typescript?.proyectos).toBe(2);
    expect(perfil.proyectos).toHaveLength(2);
  });

  it('CU-18 editar con versión vieja da 409 y con la actual guarda; pasar a borrador quita evidencia', async () => {
    const cuerpo = { ...proyecto({ archivoIds: [archivoId] }), estado: 'borrador', version: 1 };
    const buena = await como(talentoA, 'PUT', `/proyectos/${proyectoId}`, cuerpo);
    expect(buena.statusCode).toBe(200);
    expect(leer(buena, contratoProyectos.ProyectoDetalle)).toMatchObject({
      estado: 'borrador',
      version: 2,
    });

    const vieja = await como(talentoA, 'PUT', `/proyectos/${proyectoId}`, cuerpo);
    expect(vieja.statusCode).toBe(409);

    const ajeno = await como(talentoB, 'PUT', `/proyectos/${proyectoId}`, {
      ...cuerpo,
      version: 2,
    });
    expect(ajeno.statusCode).toBe(403);

    const perfil = leer(
      await como(empresaE, 'GET', `/perfiles/talentos/${talentoA}`),
      perfiles.PerfilTalento,
    );
    const typescript = perfil.habilidades.find((habilidad) => habilidad.nombre === 'TypeScript');
    expect(typescript?.proyectos).toBe(1);
  });

  it('CU-19 un borrador solo lo ve su autor', async () => {
    expect((await como(talentoB, 'GET', `/proyectos/${proyectoId}`)).statusCode).toBe(404);
    expect((await como(talentoA, 'GET', `/proyectos/${proyectoId}`)).statusCode).toBe(200);
  });

  it('CU-18 eliminar es lógico y solo del autor', async () => {
    expect((await como(talentoB, 'DELETE', `/proyectos/${proyectoId}`)).statusCode).toBe(403);
    expect((await como(talentoA, 'DELETE', `/proyectos/${proyectoId}`)).statusCode).toBe(204);
    expect((await como(talentoA, 'GET', `/proyectos/${proyectoId}`)).statusCode).toBe(404);
  });
});

describe('vacantes y postulaciones', () => {
  let vacanteId = '';
  let postulacionId = '';

  const vacante = (extra: object = {}) => ({
    titulo: 'Desarrollador junior',
    descripcion: 'Buscamos a alguien con ganas de aprender y construir producto.',
    tipo: 'primer_empleo',
    modalidad: 'hibrida',
    departamento: 'san_salvador',
    habilidades: [
      { id: habilidadA, requerida: true },
      { id: habilidadB, requerida: false },
    ],
    publicar: true,
    ...extra,
  });

  it('CU-40 solo una empresa publica vacantes', async () => {
    expect((await como(talentoA, 'POST', '/vacantes', vacante())).statusCode).toBe(403);
    const creada = await como(empresaE, 'POST', '/vacantes', vacante());
    expect(creada.statusCode).toBe(201);
    const detalle = leer(creada, contratoVacantes.VacanteDetalle);
    vacanteId = detalle.id;
    expect(detalle).toMatchObject({ estado: 'abierta', esMia: true });
  });

  it('CU-42 la coincidencia cuenta habilidades declaradas y demostradas con proyectos', async () => {
    // Ana declaró TypeScript y demostró TypeScript y React con proyectos publicados: 2 de 2.
    const ana = leer(await como(talentoA, 'GET', '/vacantes'), contratoVacantes.PaginaVacantes);
    expect(ana.items).toHaveLength(1);
    expect(ana.items[0]?.coincidencia).toBe(100);

    const filtrada = leer(
      await como(talentoB, 'GET', '/vacantes?q=junior'),
      contratoVacantes.PaginaVacantes,
    );
    expect(filtrada.items).toHaveLength(1);
    const ninguna = leer(
      await como(talentoB, 'GET', '/vacantes?q=inexistente'),
      contratoVacantes.PaginaVacantes,
    );
    expect(ninguna.items).toHaveLength(0);

    const empresa = leer(await como(empresaE, 'GET', '/vacantes'), contratoVacantes.PaginaVacantes);
    expect(empresa.items[0]?.coincidencia).toBeNull();
  });

  it('CU-43 se postula con proyectos propios y publicados, y no dos veces', async () => {
    const publicado = leer(
      await como(talentoA, 'POST', '/proyectos', proyecto({ titulo: 'Proyecto para postular' })),
      contratoProyectos.ProyectoDetalle,
    );

    const ajeno = await como(talentoB, 'POST', `/vacantes/${vacanteId}/postulaciones`, {
      proyectoIds: [publicado.id],
    });
    expect(ajeno.statusCode).toBe(422);

    const postulacion = await como(talentoA, 'POST', `/vacantes/${vacanteId}/postulaciones`, {
      proyectoIds: [publicado.id],
    });
    expect(postulacion.statusCode).toBe(201);
    const creada = leer(postulacion, contratoVacantes.Postulacion);
    postulacionId = creada.id;
    expect(creada).toMatchObject({ estado: 'recibida' });

    const repetida = await como(talentoA, 'POST', `/vacantes/${vacanteId}/postulaciones`, {
      proyectoIds: [publicado.id],
    });
    expect(repetida.statusCode).toBe(409);
  });

  it('CU-45 el talento ve el seguimiento de sus postulaciones', async () => {
    const mias = leer(
      await como(talentoA, 'GET', '/postulaciones/mias'),
      z.array(contratoVacantes.Postulacion),
    );
    expect(mias).toHaveLength(1);
    expect(mias[0]?.vacante.empresa).toBe('[Empresa Uno]');
    const detalle = leer(
      await como(talentoA, 'GET', `/vacantes/${vacanteId}`),
      contratoVacantes.VacanteDetalle,
    );
    expect(detalle.yaPostulado).toBe(true);
  });

  it('CU-44 solo la empresa dueña ve y mueve las postulaciones', async () => {
    const ajena = await como(otraEmpresa, 'GET', `/vacantes/${vacanteId}/postulaciones`);
    expect(ajena.statusCode).toBe(404);

    const lista = leer(
      await como(empresaE, 'GET', `/vacantes/${vacanteId}/postulaciones`),
      z.array(contratoVacantes.PostulacionRecibida),
    );
    expect(lista).toHaveLength(1);
    expect(lista[0]?.talento.nombre).toBe('Ana Pérez');

    const deOtra = await como(otraEmpresa, 'PUT', `/postulaciones/${postulacionId}/estado`, {
      estado: 'en_revision',
      version: 1,
    });
    expect(deOtra.statusCode).toBe(404);

    const revision = await como(empresaE, 'PUT', `/postulaciones/${postulacionId}/estado`, {
      estado: 'en_revision',
      version: 1,
    });
    expect(revision.statusCode).toBe(200);
    expect(leer(revision, contratoVacantes.PostulacionRecibida)).toMatchObject({
      estado: 'en_revision',
      version: 2,
    });
  });

  it('CU-46 descartar exige motivo y una versión vieja da 409', async () => {
    const sinMotivo = await como(empresaE, 'PUT', `/postulaciones/${postulacionId}/estado`, {
      estado: 'descartada',
      version: 2,
    });
    expect(sinMotivo.statusCode).toBe(422);

    const vieja = await como(empresaE, 'PUT', `/postulaciones/${postulacionId}/estado`, {
      estado: 'entrevista',
      version: 1,
    });
    expect(vieja.statusCode).toBe(409);

    const descartada = await como(empresaE, 'PUT', `/postulaciones/${postulacionId}/estado`, {
      estado: 'descartada',
      motivoDescarte: 'otro_candidato',
      version: 2,
    });
    expect(leer(descartada, contratoVacantes.PostulacionRecibida)).toMatchObject({
      estado: 'descartada',
      motivoDescarte: 'otro_candidato',
    });
  });

  it('CU-41 pausar la vacante la saca de la lista y bloquea nuevas postulaciones', async () => {
    const pausada = await como(empresaE, 'PUT', `/vacantes/${vacanteId}/estado`, {
      estado: 'pausada',
    });
    expect(leer(pausada, contratoVacantes.VacanteDetalle)).toMatchObject({
      estado: 'pausada',
      version: 2,
    });

    const publica = leer(await como(talentoB, 'GET', '/vacantes'), contratoVacantes.PaginaVacantes);
    expect(publica.items).toHaveLength(0);
    const mias = leer(
      await como(empresaE, 'GET', '/vacantes?mias=true'),
      contratoVacantes.PaginaVacantes,
    );
    expect(mias.items).toHaveLength(1);

    const postular = await como(talentoB, 'POST', `/vacantes/${vacanteId}/postulaciones`, {
      proyectoIds: [randomUUID()],
    });
    expect(postular.statusCode).toBe(409);
  });
});

describe('catálogos iniciales', () => {
  it('se cargan completos y repetirlos no duplica nada', async () => {
    await sembrarCatalogos(base.db);
    const primera = leer(await como(talentoA, 'GET', '/catalogos'), catalogos.Catalogos);
    await sembrarCatalogos(base.db);
    const segunda = leer(await como(talentoA, 'GET', '/catalogos'), catalogos.Catalogos);

    expect(primera.habilidades.length).toBeGreaterThan(20);
    expect(primera.carreras.length).toBeGreaterThan(0);
    expect(primera.instituciones.length).toBeGreaterThan(0);
    expect(segunda.habilidades).toHaveLength(primera.habilidades.length);
  });
});
