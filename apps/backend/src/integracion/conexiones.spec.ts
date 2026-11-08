import { randomUUID } from 'node:crypto';
import { conexiones } from '@impulsau/contracts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearArnes, leer, sembrarUsuarios } from './arnes.js';
import type { Arnes } from './arnes.js';

const verificada = randomUUID();
const sinVerificar = randomUUID();
const otraVerificada = randomUUID();
const ana = randomUUID();
const luis = randomUUID();
const sofia = randomUUID();
const conEmpleo = randomUUID();
const suspendida = randomUUID();

let arnes: Arnes;

beforeAll(async () => {
  arnes = await crearArnes((base) =>
    sembrarUsuarios(base, {
      talentos: [
        { id: ana, nombre: 'Ana Pérez' },
        { id: luis, nombre: 'Luis Gómez' },
        { id: sofia, nombre: 'Sofía Díaz' },
        { id: conEmpleo, nombre: 'Con Empleo', primerEmpleo: true },
        { id: suspendida, nombre: 'Suspendida', estado: 'suspendido' },
      ],
      empresas: [
        { id: verificada, nombre: '[Empresa Uno]', verificada: true },
        { id: sinVerificar, nombre: '[Empresa Dos]', verificada: false },
        { id: otraVerificada, nombre: '[Empresa Tres]', verificada: true },
      ],
    }),
  );
}, 60_000);

afterAll(async () => {
  await arnes.cerrar();
});

beforeEach(async () => {
  await arnes.base.sql`DELETE FROM mensajes`;
  await arnes.base.sql`DELETE FROM conversaciones`;
  await arnes.base.sql`DELETE FROM intereses`;
  await arnes.base.sql`DELETE FROM bloqueos`;
  arnes.eventos.length = 0;
});

const como = (...argumentos: Parameters<Arnes['como']>) => arnes.como(...argumentos);

async function contarConversaciones(): Promise<number> {
  const [fila] = await arnes.base.sql<
    { total: number }[]
  >`SELECT count(*)::int AS total FROM conversaciones`;
  return fila?.total ?? 0;
}

describe('CU-29 la empresa verificada muestra interés en un talento', () => {
  it('crea un interés pendiente con el mensaje y sin conversación', async () => {
    const respuesta = await como(verificada, 'PUT', `/talentos/${ana}/interes`, {
      mensaje: 'Nos gustó tu proyecto de inventario',
    });
    expect(respuesta.statusCode).toBe(200);
    expect(leer(respuesta, conexiones.Interes)).toMatchObject({
      direccion: 'empresa_a_talento',
      estado: 'pendiente',
      mensaje: 'Nos gustó tu proyecto de inventario',
      conversacionId: null,
      empresa: { id: verificada, nombre: '[Empresa Uno]' },
      talento: { id: ana, nombre: 'Ana Pérez' },
    });
    expect(await contarConversaciones()).toBe(0);
  });

  it('es idempotente: repetir el PUT devuelve el mismo interés', async () => {
    const primera = leer(
      await como(verificada, 'PUT', `/talentos/${ana}/interes`),
      conexiones.Interes,
    );
    const segunda = leer(
      await como(verificada, 'PUT', `/talentos/${ana}/interes`),
      conexiones.Interes,
    );
    expect(segunda.id).toBe(primera.id);
    const [fila] = await arnes.base.sql<
      { total: number }[]
    >`SELECT count(*)::int AS total FROM intereses`;
    expect(fila?.total).toBe(1);
  });

  it('RN-07: una empresa sin verificar recibe 403 empresa_no_verificada', async () => {
    const respuesta = await como(sinVerificar, 'PUT', `/talentos/${ana}/interes`);
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json()).toMatchObject({ code: 'empresa_no_verificada' });
  });

  it('un talento con primer empleo no recibe intereses (409 talento_no_disponible)', async () => {
    const respuesta = await como(verificada, 'PUT', `/talentos/${conEmpleo}/interes`);
    expect(respuesta.statusCode).toBe(409);
    expect(respuesta.json()).toMatchObject({ code: 'talento_no_disponible' });
  });

  it.each([
    ['inexistente', randomUUID()],
    ['suspendido', suspendida],
  ])('un talento %s responde 404', async (_nombre, destino) => {
    const respuesta = await como(verificada, 'PUT', `/talentos/${destino}/interes`);
    expect(respuesta.statusCode).toBe(404);
  });

  it('un talento no puede usar la ruta de la empresa (403)', async () => {
    const respuesta = await como(luis, 'PUT', `/talentos/${ana}/interes`);
    expect(respuesta.statusCode).toBe(403);
  });

  it('el mensaje de más de 300 caracteres es inválido (422)', async () => {
    const respuesta = await como(verificada, 'PUT', `/talentos/${ana}/interes`, {
      mensaje: 'x'.repeat(301),
    });
    expect(respuesta.statusCode).toBe(422);
  });

  it('sin token responde 401', async () => {
    const respuesta = await arnes.app.inject({ method: 'PUT', url: `/talentos/${ana}/interes` });
    expect(respuesta.statusCode).toBe(401);
  });
});

describe('CU-31 aceptar o declinar un interés', () => {
  async function interesDe(empresaId: string, talentoId: string): Promise<conexiones.Interes> {
    return leer(await como(empresaId, 'PUT', `/talentos/${talentoId}/interes`), conexiones.Interes);
  }

  it('el talento lista el interés recibido y al aceptar se abre la conversación', async () => {
    const interes = await interesDe(verificada, ana);

    const lista = leer(
      await como(ana, 'GET', '/intereses?tipo=recibidos'),
      conexiones.PaginaIntereses,
    );
    expect(lista.items.map((i) => i.id)).toEqual([interes.id]);

    const respuesta = await como(ana, 'POST', `/intereses/${interes.id}/aceptar`);
    expect(respuesta.statusCode).toBe(200);
    const aceptado = leer(respuesta, conexiones.Interes);
    expect(aceptado.estado).toBe('aceptado');
    expect(aceptado.conversacionId).not.toBeNull();
    expect(await contarConversaciones()).toBe(1);
  });

  it('avisa a ambos por socket con interest:accepted solo la primera vez', async () => {
    const interes = await interesDe(verificada, ana);
    await como(ana, 'POST', `/intereses/${interes.id}/aceptar`);
    await como(ana, 'POST', `/intereses/${interes.id}/aceptar`);

    expect(arnes.eventos.map((e) => [e.usuarioId, e.evento]).sort()).toEqual(
      [
        [ana, 'interest:accepted'],
        [verificada, 'interest:accepted'],
      ].sort(),
    );
  });

  it('aceptar dos veces es idempotente y devuelve la misma conversación', async () => {
    const interes = await interesDe(verificada, ana);
    const uno = leer(
      await como(ana, 'POST', `/intereses/${interes.id}/aceptar`),
      conexiones.Interes,
    );
    const dos = leer(
      await como(ana, 'POST', `/intereses/${interes.id}/aceptar`),
      conexiones.Interes,
    );
    expect(dos.conversacionId).toBe(uno.conversacionId);
    expect(await contarConversaciones()).toBe(1);
  });

  it('declinar deja el interés declinado, no abre conversación y la empresa no puede reenviarlo', async () => {
    const interes = await interesDe(verificada, ana);
    const respuesta = await como(ana, 'POST', `/intereses/${interes.id}/declinar`);
    expect(leer(respuesta, conexiones.Interes)).toMatchObject({
      estado: 'declinado',
      conversacionId: null,
    });
    expect(await contarConversaciones()).toBe(0);

    const reenvio = await como(verificada, 'PUT', `/talentos/${ana}/interes`);
    expect(reenvio.statusCode).toBe(409);
  });

  it('no se puede aceptar uno ya declinado (409)', async () => {
    const interes = await interesDe(verificada, ana);
    await como(ana, 'POST', `/intereses/${interes.id}/declinar`);
    const respuesta = await como(ana, 'POST', `/intereses/${interes.id}/aceptar`);
    expect(respuesta.statusCode).toBe(409);
  });

  it('quien envió el interés no puede responderlo (403) y un tercero no lo ve (404)', async () => {
    const interes = await interesDe(verificada, ana);
    expect((await como(verificada, 'POST', `/intereses/${interes.id}/aceptar`)).statusCode).toBe(
      403,
    );
    expect((await como(luis, 'POST', `/intereses/${interes.id}/aceptar`)).statusCode).toBe(404);
    expect((await como(ana, 'POST', `/intereses/${randomUUID()}/aceptar`)).statusCode).toBe(404);
  });
});

describe('CU-30 el talento muestra interés en una empresa', () => {
  it('la empresa lo recibe, lo acepta y se abre la conversación', async () => {
    const enviado = leer(
      await como(luis, 'PUT', `/empresas/${verificada}/interes`),
      conexiones.Interes,
    );
    expect(enviado.direccion).toBe('talento_a_empresa');

    const recibidos = leer(
      await como(verificada, 'GET', '/intereses?tipo=recibidos'),
      conexiones.PaginaIntereses,
    );
    expect(recibidos.items.map((i) => i.id)).toEqual([enviado.id]);
    const delTalento = leer(
      await como(luis, 'GET', '/intereses?tipo=enviados'),
      conexiones.PaginaIntereses,
    );
    expect(delTalento.items.map((i) => i.id)).toEqual([enviado.id]);

    const aceptado = leer(
      await como(verificada, 'POST', `/intereses/${enviado.id}/aceptar`),
      conexiones.Interes,
    );
    expect(aceptado.conversacionId).not.toBeNull();
  });

  it('una empresa no puede usar la ruta del talento (403)', async () => {
    const respuesta = await como(verificada, 'PUT', `/empresas/${otraVerificada}/interes`);
    expect(respuesta.statusCode).toBe(403);
  });
});

describe('interés mutuo: ambos lados muestran interés', () => {
  it('abre una sola conversación y deja los dos intereses aceptados', async () => {
    const deEmpresa = leer(
      await como(verificada, 'PUT', `/talentos/${ana}/interes`),
      conexiones.Interes,
    );
    const deTalento = leer(
      await como(ana, 'PUT', `/empresas/${verificada}/interes`),
      conexiones.Interes,
    );

    expect(deTalento.estado).toBe('aceptado');
    expect(deTalento.conversacionId).not.toBeNull();
    const [original] = await arnes.base.sql<{ estado: string }[]>`
      SELECT estado FROM intereses WHERE id = ${deEmpresa.id}`;
    expect(original?.estado).toBe('aceptado');
    expect(await contarConversaciones()).toBe(1);
    expect(arnes.eventos.filter((e) => e.evento === 'interest:accepted')).toHaveLength(2);
  });

  it('si ambos lo hacen a la vez sigue habiendo una sola conversación', async () => {
    const [uno, dos] = await Promise.all([
      como(verificada, 'PUT', `/talentos/${sofia}/interes`),
      como(sofia, 'PUT', `/empresas/${verificada}/interes`),
    ]);
    expect(uno.statusCode).toBe(200);
    expect(dos.statusCode).toBe(200);

    expect(await contarConversaciones()).toBe(1);
    const estados = await arnes.base.sql<{ estado: string }[]>`SELECT estado FROM intereses`;
    expect(estados.map((e) => e.estado)).toEqual(['aceptado', 'aceptado']);
  });
});

describe('retirar un interés', () => {
  it('borra el interés pendiente (204) y es idempotente', async () => {
    await como(verificada, 'PUT', `/talentos/${ana}/interes`);
    expect((await como(verificada, 'DELETE', `/talentos/${ana}/interes`)).statusCode).toBe(204);
    expect((await como(verificada, 'DELETE', `/talentos/${ana}/interes`)).statusCode).toBe(204);
    const lista = leer(await como(ana, 'GET', '/intereses'), conexiones.PaginaIntereses);
    expect(lista.items).toHaveLength(0);
  });

  it('no se puede retirar uno ya respondido (409)', async () => {
    const interes = leer(
      await como(verificada, 'PUT', `/talentos/${ana}/interes`),
      conexiones.Interes,
    );
    await como(ana, 'POST', `/intereses/${interes.id}/aceptar`);
    const respuesta = await como(verificada, 'DELETE', `/talentos/${ana}/interes`);
    expect(respuesta.statusCode).toBe(409);
  });
});

describe('bloqueos', () => {
  it('si el talento bloqueó a la empresa, la empresa ve un 404 y no se entera del bloqueo', async () => {
    await arnes.base
      .sql`INSERT INTO bloqueos (bloqueador_id, bloqueado_id) VALUES (${ana}, ${verificada})`;
    const respuesta = await como(verificada, 'PUT', `/talentos/${ana}/interes`);
    expect(respuesta.statusCode).toBe(404);
  });

  it('si la empresa bloqueó al talento, recibe 403 usuario_bloqueado', async () => {
    await arnes.base
      .sql`INSERT INTO bloqueos (bloqueador_id, bloqueado_id) VALUES (${verificada}, ${ana})`;
    const respuesta = await como(verificada, 'PUT', `/talentos/${ana}/interes`);
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json()).toMatchObject({ code: 'usuario_bloqueado' });
  });

  it('no se puede aceptar un interés si hay un bloqueo entre las partes', async () => {
    const interes = leer(
      await como(verificada, 'PUT', `/talentos/${ana}/interes`),
      conexiones.Interes,
    );
    await arnes.base
      .sql`INSERT INTO bloqueos (bloqueador_id, bloqueado_id) VALUES (${ana}, ${verificada})`;
    const respuesta = await como(ana, 'POST', `/intereses/${interes.id}/aceptar`);
    expect(respuesta.statusCode).toBe(403);
    expect(await contarConversaciones()).toBe(0);
  });
});

describe('listado paginado', () => {
  it('pagina por cursor del más nuevo al más antiguo sin repetir ni saltar', async () => {
    for (const empresa of [verificada, otraVerificada]) {
      for (const talento of [ana, luis]) {
        await como(empresa, 'PUT', `/talentos/${talento}/interes`);
      }
    }
    const vistos: string[] = [];
    let cursor: string | null = null;
    do {
      const pagina: conexiones.PaginaIntereses = leer(
        await como(
          ana,
          'GET',
          `/intereses?tipo=recibidos&limite=1${cursor ? `&cursor=${cursor}` : ''}`,
        ),
        conexiones.PaginaIntereses,
      );
      vistos.push(...pagina.items.map((i) => i.id));
      cursor = pagina.siguienteCursor;
    } while (cursor);

    expect(vistos).toHaveLength(2);
    expect(new Set(vistos).size).toBe(2);
  });

  it('filtra por estado', async () => {
    const interes = leer(
      await como(verificada, 'PUT', `/talentos/${ana}/interes`),
      conexiones.Interes,
    );
    await como(otraVerificada, 'PUT', `/talentos/${ana}/interes`);
    await como(ana, 'POST', `/intereses/${interes.id}/declinar`);

    const pendientes = leer(
      await como(ana, 'GET', '/intereses?tipo=recibidos&estado=pendiente'),
      conexiones.PaginaIntereses,
    );
    expect(pendientes.items).toHaveLength(1);
    expect(pendientes.items[0]?.empresa.id).toBe(otraVerificada);
  });
});
