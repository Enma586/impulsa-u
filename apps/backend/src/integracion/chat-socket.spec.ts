import { randomUUID } from 'node:crypto';
import { conexiones, mensajeria } from '@impulsau/contracts';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearArnes, leer, sembrarUsuarios } from './arnes.js';
import type { Arnes } from './arnes.js';

const empresa = randomUUID();
const ana = randomUUID();
const luis = randomUUID();

let arnes: Arnes;
let conversacion: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  arnes = await crearArnes(
    (base) =>
      sembrarUsuarios(base, {
        talentos: [
          { id: ana, nombre: 'Ana Pérez' },
          { id: luis, nombre: 'Luis Gómez' },
        ],
        empresas: [{ id: empresa, nombre: '[Empresa Uno]', verificada: true }],
      }),
    { socketsReales: true },
  );
}, 60_000);

afterAll(async () => {
  await arnes.cerrar();
});

beforeEach(async () => {
  await arnes.base.sql`DELETE FROM mensajes`;
  await arnes.base.sql`DELETE FROM lecturas`;
  await arnes.base.sql`DELETE FROM conversaciones`;
  await arnes.base.sql`DELETE FROM intereses`;
  await arnes.reiniciarLimites(empresa, ana, luis);
  conversacion = await abrirConversacion();
});

afterEach(() => {
  for (const socket of sockets.splice(0)) socket.close();
});

async function abrirConversacion(): Promise<string> {
  const interes = leer(
    await arnes.como(empresa, 'PUT', `/talentos/${ana}/interes`),
    conexiones.Interes,
  );
  const aceptado = leer(
    await arnes.como(ana, 'POST', `/intereses/${interes.id}/aceptar`),
    conexiones.Interes,
  );
  if (!aceptado.conversacionId) throw new Error('No se abrió la conversación');
  return aceptado.conversacionId;
}

async function conectar(usuario: string): Promise<Socket> {
  const socket = io(arnes.url, {
    auth: (entregar) => {
      entregar({ token: usuario });
    },
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);
  await new Promise<void>((resolver, rechazar) => {
    socket.once('connect', () => {
      resolver();
    });
    socket.once('connect_error', rechazar);
  });
  return socket;
}

/** Acumula los eventos de un tipo que llegan al socket. */
function escuchar(socket: Socket, evento: string): unknown[] {
  const recibidos: unknown[] = [];
  socket.on(evento, (datos: unknown) => {
    recibidos.push(datos);
  });
  return recibidos;
}

const pausa = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

async function esperarHasta(condicion: () => boolean): Promise<void> {
  for (let intento = 0; intento < 100 && !condicion(); intento++) await pausa(25);
}

async function enviar(
  socket: Socket,
  cuerpo: string,
  extra: { clientMessageId?: string; conversacionId?: string } = {},
): Promise<mensajeria.ResultadoEnvio> {
  const respuesta: unknown = await socket.timeout(5000).emitWithAck('message:send', {
    conversacionId: extra.conversacionId ?? conversacion,
    clientMessageId: extra.clientMessageId ?? randomUUID(),
    cuerpo,
  });
  return mensajeria.ResultadoEnvio.parse(respuesta);
}

describe('CU-32 mensajes en tiempo real', () => {
  it('message:send responde por ack con el mensaje y lo entrega a ambos participantes', async () => {
    const deEmpresa = await conectar(empresa);
    const deAna = await conectar(ana);
    const recibidoPorAna = escuchar(deAna, 'message:new');

    const resultado = await enviar(deEmpresa, 'Hola Ana');
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensaje).toMatchObject({
      conversacionId: conversacion,
      secuencia: 1,
      remitenteId: empresa,
      cuerpo: 'Hola Ana',
    });

    await esperarHasta(() => recibidoPorAna.length > 0);
    expect(recibidoPorAna).toEqual([resultado.mensaje]);
  });

  it('el mensaje llega también a los otros dispositivos de quien lo envía', async () => {
    const telefono = await conectar(empresa);
    const portatil = await conectar(empresa);
    const enPortatil = escuchar(portatil, 'message:new');

    const resultado = await enviar(telefono, 'Desde el teléfono');
    await esperarHasta(() => enPortatil.length > 0);

    expect(resultado.ok).toBe(true);
    expect(enPortatil).toHaveLength(1);
  });

  it('un reenvío con el mismo clientMessageId devuelve el mismo mensaje y no avisa otra vez', async () => {
    const deEmpresa = await conectar(empresa);
    const deAna = await conectar(ana);
    const recibidoPorAna = escuchar(deAna, 'message:new');
    const id = randomUUID();

    const primero = await enviar(deEmpresa, 'Hola', { clientMessageId: id });
    const segundo = await enviar(deEmpresa, 'Hola', { clientMessageId: id });
    await pausa(150);

    expect(segundo).toEqual(primero);
    expect(recibidoPorAna).toHaveLength(1);
  });

  it('una réplica HTTP y el socket comparten la misma secuencia', async () => {
    const deEmpresa = await conectar(empresa);
    await enviar(deEmpresa, 'Por socket');
    await arnes.como(empresa, 'POST', `/conversaciones/${conversacion}/mensajes`, {
      clientMessageId: randomUUID(),
      cuerpo: 'Por REST',
    });
    const tercero = await enviar(deEmpresa, 'Otra vez por socket');

    expect(tercero.ok && tercero.mensaje.secuencia).toBe(3);
  });

  it('un cuerpo inválido responde validacion por el ack y no guarda nada', async () => {
    const deEmpresa = await conectar(empresa);
    const resultado = await enviar(deEmpresa, '   ');
    expect(resultado).toMatchObject({ ok: false, error: { code: 'validacion' } });

    const respuesta: unknown = await deEmpresa
      .timeout(5000)
      .emitWithAck('message:send', { conversacionId: 'no-es-uuid' });
    expect(mensajeria.ResultadoEnvio.parse(respuesta)).toMatchObject({
      ok: false,
      error: { code: 'validacion' },
    });
    const [fila] = await arnes.base.sql<
      { total: number }[]
    >`SELECT count(*)::int AS total FROM mensajes`;
    expect(fila?.total).toBe(0);
  });

  it('sin ack o con datos basura el servidor no se cae y sigue atendiendo', async () => {
    const deEmpresa = await conectar(empresa);
    deEmpresa.emit('message:send', { conversacionId: conversacion });
    deEmpresa.emit('message:send', 42);
    deEmpresa.emit('message:send');
    deEmpresa.emit('conversation:sync', null);
    await pausa(150);

    expect((await enviar(deEmpresa, 'Sigo vivo')).ok).toBe(true);
  });

  it('quien no participa recibe no_encontrado por el ack', async () => {
    const intruso = await conectar(luis);
    const resultado = await enviar(intruso, 'Intruso');
    expect(resultado).toMatchObject({ ok: false, error: { code: 'no_encontrado' } });
  });

  it('con un bloqueo responde conversacion_bloqueada', async () => {
    const deEmpresa = await conectar(empresa);
    await arnes.base
      .sql`INSERT INTO bloqueos (bloqueador_id, bloqueado_id) VALUES (${ana}, ${empresa})`;
    try {
      const resultado = await enviar(deEmpresa, 'Hola');
      expect(resultado).toMatchObject({ ok: false, error: { code: 'conversacion_bloqueada' } });
    } finally {
      await arnes.base.sql`DELETE FROM bloqueos`;
    }
  });

  it('limita a 30 mensajes por 10 segundos y lo avisa por el ack', async () => {
    const deEmpresa = await conectar(empresa);
    const resultados: mensajeria.ResultadoEnvio[] = [];
    for (let i = 0; i < 31; i++) resultados.push(await enviar(deEmpresa, `m${String(i)}`));
    expect(resultados.slice(0, 30).every((r) => r.ok)).toBe(true);
    expect(resultados[30]).toMatchObject({ ok: false, error: { code: 'demasiadas_peticiones' } });
  });
});

describe('RNF-09 sincronizar tras reconectar', () => {
  async function sincronizar(
    socket: Socket,
    despuesDeSecuencia: number,
    conversacionId = conversacion,
  ): Promise<mensajeria.ResultadoSincronizacion> {
    const respuesta: unknown = await socket
      .timeout(5000)
      .emitWithAck('conversation:sync', { conversacionId, despuesDeSecuencia });
    return mensajeria.ResultadoSincronizacion.parse(respuesta);
  }

  it('recupera los mensajes que llegaron mientras estuvo desconectado, sin repetidos', async () => {
    const deEmpresa = await conectar(empresa);
    const deAna = await conectar(ana);
    await enviar(deEmpresa, 'uno');
    const visto = escuchar(deAna, 'message:new');
    await esperarHasta(() => visto.length > 0);

    deAna.close();
    await enviar(deEmpresa, 'dos');
    await enviar(deEmpresa, 'tres');

    const reconectada = await conectar(ana);
    const resultado = await sincronizar(reconectada, 1);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.mensajes.map((m) => [m.secuencia, m.cuerpo])).toEqual([
      [2, 'dos'],
      [3, 'tres'],
    ]);
    expect(resultado.hayMas).toBe(false);
  });

  it('desde cero entrega todo el historial en orden ascendente', async () => {
    const deEmpresa = await conectar(empresa);
    for (const texto of ['a', 'b', 'c']) await enviar(deEmpresa, texto);
    const resultado = await sincronizar(deEmpresa, 0);
    expect(resultado.ok && resultado.mensajes.map((m) => m.secuencia)).toEqual([1, 2, 3]);
  });

  it('avisa hayMas cuando faltan más de los que caben en una respuesta', async () => {
    const deEmpresa = await conectar(empresa);
    await arnes.base.sql`
      INSERT INTO mensajes (conversacion_id, secuencia, remitente_id, cuerpo, client_message_id)
      SELECT ${conversacion}, n, ${empresa}, 'm' || n, gen_random_uuid() FROM generate_series(1, 250) AS n`;
    await arnes.base
      .sql`UPDATE conversaciones SET ultima_secuencia = 250 WHERE id = ${conversacion}`;

    const primera = await sincronizar(deEmpresa, 0);
    expect(primera.ok && [primera.mensajes.length, primera.hayMas]).toEqual([200, true]);
    const resto = await sincronizar(deEmpresa, 200);
    expect(resto.ok && [resto.mensajes.length, resto.hayMas]).toEqual([50, false]);
  });

  it('quien no participa recibe no_encontrado', async () => {
    const intruso = await conectar(luis);
    const resultado = await sincronizar(intruso, 0);
    expect(resultado).toMatchObject({ ok: false, error: { code: 'no_encontrado' } });
  });
});

describe('apertura de la conversación en vivo', () => {
  it('interest:accepted llega a la empresa y al talento conectados', async () => {
    await arnes.base.sql`DELETE FROM mensajes`;
    await arnes.base.sql`DELETE FROM conversaciones`;
    await arnes.base.sql`DELETE FROM intereses`;
    const deEmpresa = await conectar(empresa);
    const deAna = await conectar(ana);
    const enEmpresa = escuchar(deEmpresa, 'interest:accepted');
    const enAna = escuchar(deAna, 'interest:accepted');

    const nueva = await abrirConversacion();
    await esperarHasta(() => enEmpresa.length > 0 && enAna.length > 0);

    expect(enEmpresa).toEqual(enAna);
    expect(enEmpresa[0]).toMatchObject({ conversacionId: nueva });
  });
});

describe('CU-34 leído y escribiendo en vivo', () => {
  it('message:read avisa a la otra parte con hasta dónde leyó', async () => {
    const deEmpresa = await conectar(empresa);
    const deAna = await conectar(ana);
    await enviar(deEmpresa, 'Hola');
    const enEmpresa = escuchar(deEmpresa, 'message:read');

    deAna.emit('message:read', { conversacionId: conversacion, secuencia: 1 });
    await esperarHasta(() => enEmpresa.length > 0);

    expect(enEmpresa).toEqual([{ conversacionId: conversacion, usuarioId: ana, secuencia: 1 }]);
  });

  it('message:read con datos basura o de un intruso no hace nada ni rompe el socket', async () => {
    const deEmpresa = await conectar(empresa);
    const intruso = await conectar(luis);
    await enviar(deEmpresa, 'Hola');
    const enEmpresa = escuchar(deEmpresa, 'message:read');

    intruso.emit('message:read', { conversacionId: conversacion, secuencia: 1 });
    deEmpresa.emit('message:read', { conversacionId: 'no-es-uuid', secuencia: 'x' });
    deEmpresa.emit('message:read');
    await pausa(200);

    expect(enEmpresa).toHaveLength(0);
    expect((await enviar(deEmpresa, 'Sigo vivo')).ok).toBe(true);
  });

  it('typing llega solo a la otra parte y distingue empezar de parar', async () => {
    const deEmpresa = await conectar(empresa);
    const deAna = await conectar(ana);
    const enAna = escuchar(deAna, 'typing');
    const enEmpresa = escuchar(deEmpresa, 'typing');

    deEmpresa.emit('typing:start', { conversacionId: conversacion });
    await esperarHasta(() => enAna.length > 0);
    deEmpresa.emit('typing:stop', { conversacionId: conversacion });
    await esperarHasta(() => enAna.length > 1);
    await pausa(100);

    expect(enAna).toEqual([
      { conversacionId: conversacion, usuarioId: empresa, activo: true },
      { conversacionId: conversacion, usuarioId: empresa, activo: false },
    ]);
    expect(enEmpresa).toHaveLength(0);
  });

  it('typing de quien no participa, o con un bloqueo, no se entrega', async () => {
    const deEmpresa = await conectar(empresa);
    const intruso = await conectar(luis);
    const deAna = await conectar(ana);
    const enAna = escuchar(deAna, 'typing');

    intruso.emit('typing:start', { conversacionId: conversacion });
    await arnes.base
      .sql`INSERT INTO bloqueos (bloqueador_id, bloqueado_id) VALUES (${ana}, ${empresa})`;
    try {
      deEmpresa.emit('typing:start', { conversacionId: conversacion });
      await pausa(250);
    } finally {
      await arnes.base.sql`DELETE FROM bloqueos`;
    }

    expect(enAna).toHaveLength(0);
  });

  it('descarta en silencio los typing que pasan de 20 en 5 segundos', async () => {
    const deEmpresa = await conectar(empresa);
    const deAna = await conectar(ana);
    const enAna = escuchar(deAna, 'typing');

    for (let i = 0; i < 30; i++) deEmpresa.emit('typing:start', { conversacionId: conversacion });
    await pausa(600);

    expect(enAna.length).toBeLessThanOrEqual(20);
    expect(enAna.length).toBeGreaterThan(0);
    expect((await enviar(deEmpresa, 'Los mensajes no se ven afectados')).ok).toBe(true);
  });
});
