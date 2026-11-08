import { randomUUID } from 'node:crypto';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fallo, ok } from '../../dominio/resultado.js';
import type {
  BuscadorUsuario,
  UsuarioAutenticado,
  VerificadorToken,
} from '../../dominio/autenticacion.js';
import { CIERRE_CONEXIONES } from '../../dominio/tiempo-real.js';
import type { CierreConexiones } from '../../dominio/tiempo-real.js';
import { AdaptadorSocketRedis } from './adaptador-socket-redis.js';
import { TiempoRealModule } from './tiempo-real.module.js';

/** Token de prueba con la forma `usuario|sesion` (la sesión es opcional). */
const verificador: VerificadorToken = {
  verificar: (token) => {
    const [usuarioId, sesionId] = token.split('|');
    return Promise.resolve(
      usuarioId ? ok({ usuarioId, sesionId: sesionId ?? null }) : fallo('token_invalido'),
    );
  },
};

const suspendidos = new Set<string>();

const buscador: BuscadorUsuario = {
  buscarPorId: (id) => {
    const usuario: UsuarioAutenticado = {
      id,
      rol: 'talento',
      estado: suspendidos.has(id) ? 'suspendido' : 'activo',
    };
    return Promise.resolve(usuario);
  },
};

interface Replica {
  app: NestFastifyApplication;
  url: string;
}

const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379');
const replicas: Replica[] = [];
const sockets: Socket[] = [];

async function levantarReplica(): Promise<Replica> {
  const modulo = await Test.createTestingModule({ imports: [TiempoRealModule] }).compile();
  const app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useLogger(false);
  app.useWebSocketAdapter(
    new AdaptadorSocketRedis(app, {
      corsOrigen: 'http://localhost:5173',
      redis,
      verificador,
      usuarios: buscador,
    }),
  );
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  const replica = { app, url: url.replace('[::1]', '127.0.0.1') };
  replicas.push(replica);
  return replica;
}

function conectar(url: string, token: () => string): Socket {
  const socket = io(url, {
    auth: (entregar) => {
      entregar({ token: token() });
    },
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);
  return socket;
}

function esperar(socket: Socket, evento: 'connect' | 'disconnect' | 'connect_error') {
  return new Promise<unknown>((resolver) => {
    socket.once(evento, resolver);
  });
}

/** Da tiempo a que un cierre llegue; sirve para comprobar que algo NO se desconectó. */
const pausa = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

function cierre(replica: Replica): CierreConexiones {
  return replica.app.get<CierreConexiones>(CIERRE_CONEXIONES);
}

let replicaA: Replica;
let replicaB: Replica;

beforeAll(async () => {
  replicaA = await levantarReplica();
  replicaB = await levantarReplica();
});

afterEach(() => {
  for (const socket of sockets.splice(0)) socket.close();
  suspendidos.clear();
});

afterAll(async () => {
  for (const { app } of replicas) await app.close();
  await redis.quit();
});

describe('T-20 handshake de Socket.IO', () => {
  it('conecta con un token válido', async () => {
    const socket = conectar(replicaA.url, () => `${randomUUID()}|${randomUUID()}`);
    await esperar(socket, 'connect');
    expect(socket.connected).toBe(true);
  });

  it('rechaza la conexión sin token con el motivo no_autenticado', async () => {
    const socket = conectar(replicaA.url, () => '');
    const error = await esperar(socket, 'connect_error');
    expect(error).toMatchObject({ message: 'no_autenticado' });
    expect(socket.connected).toBe(false);
  });

  it('rechaza a una cuenta suspendida', async () => {
    const usuario = randomUUID();
    suspendidos.add(usuario);
    const socket = conectar(replicaA.url, () => usuario);
    const error = await esperar(socket, 'connect_error');
    expect(error).toMatchObject({ message: 'cuenta_suspendida' });
  });
});

describe('CA-06.3 cerrar sesión cierra el socket', () => {
  it('al cerrar esta sesión se desconecta ese socket y no el de otro dispositivo', async () => {
    const usuario = randomUUID();
    const sesionTelefono = randomUUID();
    const telefono = conectar(replicaA.url, () => `${usuario}|${sesionTelefono}`);
    const portatil = conectar(replicaA.url, () => `${usuario}|${randomUUID()}`);
    await Promise.all([esperar(telefono, 'connect'), esperar(portatil, 'connect')]);

    const cerrado = esperar(telefono, 'disconnect');
    cierre(replicaA).cerrarSesion(sesionTelefono);
    await cerrado;
    await pausa(150);

    expect(telefono.connected).toBe(false);
    expect(portatil.connected).toBe(true);
  });

  it('al cerrar todos los dispositivos se desconectan los sockets del usuario y solo los suyos', async () => {
    const usuario = randomUUID();
    const uno = conectar(replicaA.url, () => `${usuario}|${randomUUID()}`);
    const dos = conectar(replicaA.url, () => `${usuario}|${randomUUID()}`);
    const ajeno = conectar(replicaA.url, () => `${randomUUID()}|${randomUUID()}`);
    await Promise.all([
      esperar(uno, 'connect'),
      esperar(dos, 'connect'),
      esperar(ajeno, 'connect'),
    ]);

    const cerrados = Promise.all([esperar(uno, 'disconnect'), esperar(dos, 'disconnect')]);
    cierre(replicaA).cerrarUsuario(usuario);
    await cerrados;
    await pausa(150);

    expect(ajeno.connected).toBe(true);
  });

  it('el cierre ordenado en una réplica llega al socket conectado en otra (Redis)', async () => {
    const usuario = randomUUID();
    const enB = conectar(replicaB.url, () => `${usuario}|${randomUUID()}`);
    await esperar(enB, 'connect');

    const cerrado = esperar(enB, 'disconnect');
    cierre(replicaA).cerrarUsuario(usuario);
    await cerrado;

    expect(enB.connected).toBe(false);
  });
});

describe('CA-07.4 el socket se reconecta con el token nuevo', () => {
  it('al reconectar el handshake manda el token vigente y no el viejo', async () => {
    const usuario = randomUUID();
    const sesionVieja = randomUUID();
    let token = `${usuario}|${sesionVieja}`;
    const socket = conectar(replicaA.url, () => token);
    await esperar(socket, 'connect');

    // La sesión se renueva (token nuevo) y el servidor cierra la anterior: el cliente vuelve a entrar.
    token = `${usuario}|${randomUUID()}`;
    const cerrado = esperar(socket, 'disconnect');
    cierre(replicaA).cerrarSesion(sesionVieja);
    await cerrado;
    socket.connect();
    await esperar(socket, 'connect');

    expect(socket.connected).toBe(true);
    // El token viejo ya no figura: cerrarlo de nuevo no toca al socket reconectado.
    cierre(replicaA).cerrarSesion(sesionVieja);
    await pausa(150);
    expect(socket.connected).toBe(true);
  });
});
