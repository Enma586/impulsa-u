import { describe, expect, it } from 'vitest';
import { crearAdaptador } from './arranque.js';

async function ipDelCliente(trustProxy: number): Promise<string> {
  const adaptador = crearAdaptador({ TRUST_PROXY: trustProxy });
  const servidor = adaptador.getInstance();
  servidor.get('/ip', (solicitud) => solicitud.ip);
  await servidor.ready();
  const respuesta = await servidor.inject({
    method: 'GET',
    url: '/ip',
    remoteAddress: '10.0.0.1',
    headers: { 'x-forwarded-for': '203.0.113.7' },
  });
  await servidor.close();
  return respuesta.body;
}

describe('crearAdaptador', () => {
  it('ignora X-Forwarded-For cuando TRUST_PROXY es 0', async () => {
    expect(await ipDelCliente(0)).toBe('10.0.0.1');
  });

  it('usa la IP del cliente real cuando TRUST_PROXY es 1', async () => {
    expect(await ipDelCliente(1)).toBe('203.0.113.7');
  });
});
