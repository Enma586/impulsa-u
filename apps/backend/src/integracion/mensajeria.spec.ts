import { randomUUID } from 'node:crypto';
import { conexiones, mensajeria } from '@impulsau/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearArnes, leer, sembrarUsuarios } from './arnes.js';
import type { Arnes } from './arnes.js';

const empresa = randomUUID();
const otraEmpresa = randomUUID();
const ana = randomUUID();
const luis = randomUUID();
const ajena = randomUUID();
const limitado = randomUUID();
const docente = randomUUID();

let arnes: Arnes;
let conversacion: string;

beforeAll(async () => {
  arnes = await crearArnes(async (base) => {
    await sembrarUsuarios(base, {
      talentos: [
        { id: ana, nombre: 'Ana Pérez' },
        { id: luis, nombre: 'Luis Gómez' },
        { id: ajena, nombre: 'Ajena' },
        { id: limitado, nombre: 'Limitado' },
      ],
      empresas: [
        { id: empresa, nombre: '[Empresa Uno]', verificada: true },
        { id: otraEmpresa, nombre: '[Empresa Dos]', verificada: true },
      ],
    });
    await base.sql`INSERT INTO auth.users (id) VALUES (${docente})`;
    await base.sql`INSERT INTO usuarios (id, correo, rol, estado) VALUES (${docente}, 'd@correo.com', 'docente', 'activo')`;
  });
}, 60_000);

afterAll(async () => {
  await arnes.cerrar();
});

/** Cada prueba parte de una conversación nueva entre la empresa y Ana, abierta por interés mutuo. */
beforeEach(async () => {
  await arnes.base.sql`DELETE FROM mensajes`;
  await arnes.base.sql`DELETE FROM lecturas`;
  await arnes.base.sql`DELETE FROM conversaciones`;
  await arnes.base.sql`DELETE FROM intereses`;
  await arnes.base.sql`DELETE FROM bloqueos`;
  await arnes.reiniciarLimiteMensajes(empresa, otraEmpresa, ana, luis, limitado);
  arnes.eventos.length = 0;
  conversacion = await abrirConversacion(empresa, ana);
  arnes.eventos.length = 0;
});

const como = (...argumentos: Parameters<Arnes['como']>) => arnes.como(...argumentos);

async function abrirConversacion(empresaId: string, talentoId: string): Promise<string> {
  const interes = leer(
    await como(empresaId, 'PUT', `/talentos/${talentoId}/interes`),
    conexiones.Interes,
  );
  const aceptado = leer(
    await como(talentoId, 'POST', `/intereses/${interes.id}/aceptar`),
    conexiones.Interes,
  );
  if (!aceptado.conversacionId) throw new Error('No se abrió la conversación');
  return aceptado.conversacionId;
}

const enviar = (
  usuario: string,
  cuerpo: string,
  clientMessageId = randomUUID(),
  id = conversacion,
) => como(usuario, 'POST', `/conversaciones/${id}/mensajes`, { clientMessageId, cuerpo });

describe('CU-32 enviar mensajes', () => {
  it('asigna secuencias consecutivas por conversación', async () => {
    const uno = leer(await enviar(empresa, 'Hola Ana'), mensajeria.Mensaje);
    const dos = leer(await enviar(ana, 'Hola, gracias por escribir'), mensajeria.Mensaje);
    const tres = leer(await enviar(empresa, '¿Podemos hablar mañana?'), mensajeria.Mensaje);

    expect([uno.secuencia, dos.secuencia, tres.secuencia]).toEqual([1, 2, 3]);
    expect(uno).toMatchObject({ conversacionId: conversacion, remitenteId: empresa });
    expect(dos.remitenteId).toBe(ana);
  });

  it('avisa con message:new a los dos participantes, una vez por mensaje', async () => {
    const mensaje = leer(await enviar(empresa, 'Hola Ana'), mensajeria.Mensaje);

    const nuevos = arnes.eventos.filter((e) => e.evento === 'message:new');
    expect(nuevos.map((e) => e.usuarioId).sort()).toEqual([ana, empresa].sort());
    expect(nuevos.every((e) => JSON.stringify(e.datos) === JSON.stringify([mensaje]))).toBe(true);
  });

  it('es idempotente por clientMessageId: el reenvío no duplica ni vuelve a avisar', async () => {
    const id = randomUUID();
    const primero = leer(await enviar(empresa, 'Hola Ana', id), mensajeria.Mensaje);
    const eventosAntes = arnes.eventos.length;
    const reenvio = leer(await enviar(empresa, 'Hola Ana', id), mensajeria.Mensaje);

    expect(reenvio).toEqual(primero);
    expect(arnes.eventos).toHaveLength(eventosAntes);
    const [fila] = await arnes.base.sql<
      { total: number }[]
    >`SELECT count(*)::int AS total FROM mensajes`;
    expect(fila?.total).toBe(1);
  });

  it('reusar el clientMessageId con otro contenido responde 422 idempotencia_reutilizada', async () => {
    const id = randomUUID();
    await enviar(empresa, 'Hola Ana', id);
    const respuesta = await enviar(empresa, 'Otro texto', id);
    expect(respuesta.statusCode).toBe(422);
    expect(respuesta.json()).toMatchObject({ code: 'idempotencia_reutilizada' });
  });

  it('veinte envíos simultáneos de ambos lados no repiten ni saltan secuencias', async () => {
    const respuestas = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        enviar(i % 2 === 0 ? empresa : ana, `mensaje ${String(i)}`),
      ),
    );
    expect(respuestas.every((r) => r.statusCode === 201)).toBe(true);

    const secuencias = await arnes.base.sql<{ secuencia: number }[]>`
      SELECT secuencia::int FROM mensajes ORDER BY secuencia`;
    expect(secuencias.map((s) => s.secuencia)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('un reenvío simultáneo del mismo clientMessageId guarda un solo mensaje', async () => {
    const id = randomUUID();
    const respuestas = await Promise.all(
      Array.from({ length: 5 }, () => enviar(empresa, 'Hola', id)),
    );
    expect(respuestas.every((r) => r.statusCode === 201)).toBe(true);
    const [fila] = await arnes.base.sql<
      { total: number }[]
    >`SELECT count(*)::int AS total FROM mensajes`;
    expect(fila?.total).toBe(1);
  });

  it('quien no participa recibe 404 y no puede escribir', async () => {
    expect((await enviar(luis, 'Intruso')).statusCode).toBe(404);
    expect((await enviar(otraEmpresa, 'Intruso')).statusCode).toBe(404);
    expect((await enviar(empresa, 'Hola', randomUUID(), randomUUID())).statusCode).toBe(404);
  });

  it('un docente no tiene conversaciones (403)', async () => {
    expect((await enviar(docente, 'Hola')).statusCode).toBe(403);
  });

  it('rechaza un cuerpo vacío o de más de 4000 caracteres (422)', async () => {
    expect((await enviar(empresa, '   ')).statusCode).toBe(422);
    expect((await enviar(empresa, 'x'.repeat(4001))).statusCode).toBe(422);
    expect((await enviar(empresa, 'x'.repeat(4000))).statusCode).toBe(201);
  });

  it('con un bloqueo entre las partes responde 403 conversacion_bloqueada', async () => {
    await arnes.base
      .sql`INSERT INTO bloqueos (bloqueador_id, bloqueado_id) VALUES (${ana}, ${empresa})`;
    const respuesta = await enviar(empresa, 'Hola');
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json()).toMatchObject({ code: 'conversacion_bloqueada' });
    expect((await enviar(ana, 'Hola')).statusCode).toBe(403);
  });

  it('una cuenta suspendida no puede escribir (403)', async () => {
    await arnes.base.sql`UPDATE usuarios SET estado = 'suspendido' WHERE id = ${ana}`;
    try {
      expect((await enviar(ana, 'Hola')).statusCode).toBe(403);
    } finally {
      await arnes.base.sql`UPDATE usuarios SET estado = 'activo' WHERE id = ${ana}`;
    }
  });

  it('limita a 30 mensajes por 10 segundos por usuario (429)', async () => {
    const conLimitado = await abrirConversacion(otraEmpresa, limitado);
    let ultimo = 201;
    for (let i = 0; i < 31; i++) {
      ultimo = (await enviar(limitado, `m${String(i)}`, randomUUID(), conLimitado)).statusCode;
      if (i < 30) expect(ultimo).toBe(201);
    }
    expect(ultimo).toBe(429);
    // El límite es por usuario: otro usuario sigue escribiendo.
    expect((await enviar(empresa, 'Sigo yo')).statusCode).toBe(201);
  });
});

describe('CU-33 historial paginado', () => {
  async function escribir(total: number): Promise<void> {
    for (let i = 1; i <= total; i++)
      await enviar(i % 2 === 0 ? ana : empresa, `mensaje ${String(i)}`);
  }

  it('devuelve del más nuevo al más antiguo y recorre todo con antesDeSecuencia', async () => {
    await escribir(7);

    const primera = leer(
      await como(ana, 'GET', `/conversaciones/${conversacion}/mensajes?limite=3`),
      mensajeria.PaginaMensajes,
    );
    expect(primera.items.map((m) => m.secuencia)).toEqual([7, 6, 5]);
    expect(primera.siguienteAntesDeSecuencia).toBe(5);

    const segunda = leer(
      await como(
        ana,
        'GET',
        `/conversaciones/${conversacion}/mensajes?limite=3&antesDeSecuencia=${String(primera.siguienteAntesDeSecuencia)}`,
      ),
      mensajeria.PaginaMensajes,
    );
    expect(segunda.items.map((m) => m.secuencia)).toEqual([4, 3, 2]);

    const ultima = leer(
      await como(
        ana,
        'GET',
        `/conversaciones/${conversacion}/mensajes?limite=3&antesDeSecuencia=2`,
      ),
      mensajeria.PaginaMensajes,
    );
    expect(ultima.items.map((m) => m.secuencia)).toEqual([1]);
    expect(ultima.siguienteAntesDeSecuencia).toBeNull();
  });

  it('una conversación sin mensajes devuelve la lista vacía', async () => {
    const pagina = leer(
      await como(ana, 'GET', `/conversaciones/${conversacion}/mensajes`),
      mensajeria.PaginaMensajes,
    );
    expect(pagina).toEqual({ items: [], siguienteAntesDeSecuencia: null });
  });

  it('quien no participa recibe 404', async () => {
    const respuesta = await como(luis, 'GET', `/conversaciones/${conversacion}/mensajes`);
    expect(respuesta.statusCode).toBe(404);
  });

  it('rechaza un limite fuera de rango (422)', async () => {
    const respuesta = await como(ana, 'GET', `/conversaciones/${conversacion}/mensajes?limite=500`);
    expect(respuesta.statusCode).toBe(422);
  });
});

describe('lista de conversaciones', () => {
  it('muestra al interlocutor, el último mensaje y los no leídos de cada lado', async () => {
    await enviar(empresa, 'Hola Ana');
    await enviar(empresa, '¿Cómo estás?');
    const ultimo = leer(await enviar(ana, 'Bien, gracias'), mensajeria.Mensaje);

    const deAna = leer(await como(ana, 'GET', '/conversaciones'), mensajeria.PaginaConversaciones);
    expect(deAna.items).toHaveLength(1);
    expect(deAna.items[0]).toMatchObject({
      id: conversacion,
      interlocutor: { id: empresa, nombre: '[Empresa Uno]' },
      ultimoMensaje: ultimo,
      noLeidos: 0,
      bloqueada: false,
    });

    const deEmpresa = leer(
      await como(empresa, 'GET', '/conversaciones'),
      mensajeria.PaginaConversaciones,
    );
    expect(deEmpresa.items[0]).toMatchObject({
      interlocutor: { id: ana, nombre: 'Ana Pérez' },
      noLeidos: 1,
      leidoPorOtroHasta: 3,
    });
  });

  it('una conversación sin mensajes aparece con ultimoMensaje nulo', async () => {
    const lista = leer(await como(ana, 'GET', '/conversaciones'), mensajeria.PaginaConversaciones);
    expect(lista.items[0]).toMatchObject({ ultimoMensaje: null, noLeidos: 0 });
  });

  it('solo muestra las conversaciones propias y marca las bloqueadas', async () => {
    const conLuis = await abrirConversacion(empresa, luis);
    await arnes.base
      .sql`INSERT INTO bloqueos (bloqueador_id, bloqueado_id) VALUES (${luis}, ${empresa})`;

    const deLuis = leer(
      await como(luis, 'GET', '/conversaciones'),
      mensajeria.PaginaConversaciones,
    );
    expect(deLuis.items.map((c) => c.id)).toEqual([conLuis]);
    expect(deLuis.items[0]?.bloqueada).toBe(true);
    const deAna = leer(await como(ana, 'GET', '/conversaciones'), mensajeria.PaginaConversaciones);
    expect(deAna.items.map((c) => c.id)).toEqual([conversacion]);
    expect(deAna.items[0]?.bloqueada).toBe(false);
  });

  it('ordena por la actividad más reciente y pagina por cursor', async () => {
    const conLuis = await abrirConversacion(empresa, luis);
    await enviar(empresa, 'Primero a Ana');
    await enviar(empresa, 'Luego a Luis', randomUUID(), conLuis);

    const primera = leer(
      await como(empresa, 'GET', '/conversaciones?limite=1'),
      mensajeria.PaginaConversaciones,
    );
    expect(primera.items.map((c) => c.id)).toEqual([conLuis]);
    expect(primera.siguienteCursor).not.toBeNull();

    const segunda = leer(
      await como(
        empresa,
        'GET',
        `/conversaciones?limite=1&cursor=${String(primera.siguienteCursor)}`,
      ),
      mensajeria.PaginaConversaciones,
    );
    expect(segunda.items.map((c) => c.id)).toEqual([conversacion]);
    expect(segunda.siguienteCursor).toBeNull();
  });
});
