import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { crearBaseDeDatos } from '@impulsau/db';
import type { ConexionBaseDeDatos } from '@impulsau/db';
import type { z } from 'zod';
import { AppHttpModule } from '../app.http.module.js';
import { BUSCADOR_USUARIO, VERIFICADOR_TOKEN } from '../compartido/dominio/autenticacion.js';
import type { BuscadorUsuario, VerificadorToken } from '../compartido/dominio/autenticacion.js';
import { REDIS } from '../compartido/infraestructura/conexion-redis.module.js';
import { AdaptadorSocketRedis } from '../compartido/infraestructura/tiempo-real/adaptador-socket-redis.js';
import type { Redis } from 'ioredis';
import { EMISOR_TIEMPO_REAL } from '../compartido/dominio/tiempo-real.js';
import type { EmisorTiempoReal } from '../compartido/dominio/tiempo-real.js';
import { fallo, ok } from '../compartido/dominio/resultado.js';

/**
 * Levanta la API completa sobre un Postgres y un Redis reales (los del compose), con la identidad
 * simulada: el token es el id del usuario. Cada arnés crea y borra su propia base de datos.
 */
const URL_ADMIN =
  process.env['DATABASE_URL_PRUEBAS'] ?? 'postgres://impulsau:impulsau@localhost:5432/impulsau';
const DIRECTORIO_MIGRACIONES = fileURLToPath(
  new URL('../../../../packages/db/migraciones/', import.meta.url),
);

export interface EventoEmitido {
  usuarioId: string;
  evento: string;
  datos: unknown;
}

export interface Arnes {
  app: NestFastifyApplication;
  base: ConexionBaseDeDatos;
  /** Eventos que la API habría enviado por socket, en orden (vacío con `socketsReales`). */
  eventos: EventoEmitido[];
  /** Dirección del servidor cuando se pidió `socketsReales`. */
  url: string;
  como(
    usuarioId: string,
    metodo: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    cuerpo?: object,
  ): ReturnType<NestFastifyApplication['inject']>;
  /** Borra el contador de mensajes por ventana de estos usuarios (las pruebas escriben a ráfagas). */
  reiniciarLimiteMensajes(...usuarios: string[]): Promise<void>;
  cerrar(): Promise<void>;
}

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

export interface OpcionesArnes {
  /** Escucha en un puerto con Socket.IO real (adaptador de Redis y autenticación del handshake). */
  socketsReales?: boolean;
}

export async function crearArnes(
  sembrar: (base: ConexionBaseDeDatos) => Promise<void>,
  opciones: OpcionesArnes = {},
): Promise<Arnes> {
  const nombre = `integracion_${randomUUID().replaceAll('-', '')}`;
  const admin = crearBaseDeDatos(URL_ADMIN, 1);
  await admin.sql.unsafe(`CREATE DATABASE ${nombre}`);
  const base = crearBaseDeDatos(urlDeBase(nombre), 3);
  await aplicarMigraciones(base);
  await sembrar(base);

  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '3999',
    CORS_ORIGIN: 'http://localhost:5173',
    DATABASE_URL: urlDeBase(nombre),
    DATABASE_URL_MIGRACIONES: urlDeBase(nombre),
    MIGRAR_AL_INICIAR: 'false',
    REDIS_URL: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    SUPABASE_URL: 'https://proyecto-de-prueba.supabase.co',
    SUPABASE_JWKS_URL: 'https://proyecto-de-prueba.supabase.co/auth/v1/.well-known/jwks.json',
    SUPABASE_SERVICE_ROLE_KEY: 'llave-de-prueba',
    AI_SERVICE_URL: 'http://localhost:7860',
    AI_SERVICE_TOKEN: 'x'.repeat(32),
  });

  const eventos: EventoEmitido[] = [];
  const emisor: EmisorTiempoReal = {
    aUsuario: (usuarioId, evento, ...datos) => {
      eventos.push({ usuarioId, evento, datos });
    },
  };

  const constructor = Test.createTestingModule({ imports: [AppHttpModule] })
    .overrideProvider(VERIFICADOR_TOKEN)
    .useValue({
      verificar: (token: string) =>
        Promise.resolve(
          token.length === 36 ? ok({ usuarioId: token, sesionId: null }) : fallo('token_invalido'),
        ),
    });
  const modulo = await (
    opciones.socketsReales
      ? constructor
      : constructor.overrideProvider(EMISOR_TIEMPO_REAL).useValue(emisor)
  ).compile();
  const app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  let url = '';
  if (opciones.socketsReales) {
    app.useWebSocketAdapter(
      new AdaptadorSocketRedis(app, {
        corsOrigen: 'http://localhost:5173',
        redis: app.get<Redis>(REDIS),
        verificador: app.get<VerificadorToken>(VERIFICADOR_TOKEN, { strict: false }),
        usuarios: app.get<BuscadorUsuario>(BUSCADOR_USUARIO, { strict: false }),
      }),
    );
    await app.listen(0, '127.0.0.1');
    url = (await app.getUrl()).replace('[::1]', '127.0.0.1');
  } else {
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }

  return {
    app,
    base,
    eventos,
    url,
    como: (usuarioId, metodo, url, cuerpo) =>
      app.inject({
        method: metodo,
        url,
        headers: {
          authorization: `Bearer ${usuarioId}`,
          ...(metodo === 'POST' ? { 'idempotency-key': randomUUID() } : {}),
        },
        ...(cuerpo ? { payload: cuerpo } : {}),
      }),
    reiniciarLimiteMensajes: async (...usuarios) => {
      if (usuarios.length === 0) return;
      await app.get<Redis>(REDIS).del(...usuarios.map((id) => `tasa:mensaje:${id}`));
    },
    cerrar: async () => {
      await app.close();
      await base.cerrar();
      await admin.sql.unsafe(`DROP DATABASE IF EXISTS ${nombre} WITH (FORCE)`);
      await admin.cerrar();
    },
  };
}

/** Valida la respuesta con el esquema del contrato: además de leerla tipada, prueba que lo cumple. */
export function leer<S extends z.ZodType>(respuesta: { json(): unknown }, esquema: S): z.output<S> {
  return esquema.parse(respuesta.json());
}

/** Inserta un usuario con su perfil de talento o de empresa. */
export async function sembrarUsuarios(
  base: ConexionBaseDeDatos,
  datos: {
    talentos: { id: string; nombre: string; primerEmpleo?: boolean; estado?: string }[];
    empresas: { id: string; nombre: string; verificada: boolean }[];
  },
): Promise<void> {
  const { sql } = base;
  for (const t of datos.talentos) {
    await sql`INSERT INTO auth.users (id) VALUES (${t.id})`;
    await sql`INSERT INTO usuarios (id, correo, rol, estado, fecha_nacimiento)
      VALUES (${t.id}, ${`${t.id}@correo.com`}, 'talento', ${t.estado ?? 'activo'}, '2000-01-01')`;
    await sql`INSERT INTO talentos (usuario_id, nombre_completo, estado_academico, ciclo, declaracion_sin_experiencia_en, primer_empleo_en)
      VALUES (${t.id}, ${t.nombre}, 'estudiante', 4, now(), ${t.primerEmpleo ? new Date().toISOString() : null})`;
  }
  for (const e of datos.empresas) {
    await sql`INSERT INTO auth.users (id) VALUES (${e.id})`;
    await sql`INSERT INTO usuarios (id, correo, rol, estado)
      VALUES (${e.id}, ${`${e.id}@correo.com`}, 'empresa', 'activo')`;
    await sql`INSERT INTO empresas (usuario_id, nombre_comercial, estado_verificacion)
      VALUES (${e.id}, ${e.nombre}, ${e.verificada ? 'verificada' : 'sin_solicitar'})`;
  }
}
