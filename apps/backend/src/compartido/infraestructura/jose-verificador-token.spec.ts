import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import type { CryptoKey } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { JoseVerificadorToken } from './jose-verificador-token.js';

const EMISOR = 'https://proyecto.supabase.co/auth/v1';
const USUARIO = '0b6c1f0e-8f3b-4a52-9d57-0d7f6a3d9c11';

interface OpcionesToken {
  sub?: string;
  emisor?: string;
  audiencia?: string;
  expira?: string;
  clave?: CryptoKey;
}

let verificador: JoseVerificadorToken;
let privada: CryptoKey;

function firmar(opciones: OpcionesToken = {}): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: 'clave-1' })
    .setSubject(opciones.sub ?? USUARIO)
    .setIssuer(opciones.emisor ?? EMISOR)
    .setAudience(opciones.audiencia ?? 'authenticated')
    .setExpirationTime(opciones.expira ?? '1h')
    .sign(opciones.clave ?? privada);
}

beforeAll(async () => {
  const claves = await generateKeyPair('ES256');
  privada = claves.privateKey;
  const publica = { ...(await exportJWK(claves.publicKey)), kid: 'clave-1', alg: 'ES256' };
  verificador = new JoseVerificadorToken(
    createLocalJWKSet({ keys: [publica] }),
    EMISOR,
    'authenticated',
  );
});

describe('JoseVerificadorToken', () => {
  it('acepta un token válido y devuelve el id del usuario', async () => {
    const resultado = await verificador.verificar(await firmar());
    expect(resultado).toEqual({ ok: true, valor: { usuarioId: USUARIO } });
  });

  it('rechaza un token vencido', async () => {
    const resultado = await verificador.verificar(await firmar({ expira: '-1m' }));
    expect(resultado.ok).toBe(false);
  });

  it('rechaza otra audiencia', async () => {
    const resultado = await verificador.verificar(await firmar({ audiencia: 'anon' }));
    expect(resultado.ok).toBe(false);
  });

  it('rechaza otro emisor', async () => {
    const resultado = await verificador.verificar(
      await firmar({ emisor: 'https://otro.co/auth/v1' }),
    );
    expect(resultado.ok).toBe(false);
  });

  it('rechaza un token firmado con otra llave', async () => {
    const ajena = await generateKeyPair('ES256');
    const resultado = await verificador.verificar(await firmar({ clave: ajena.privateKey }));
    expect(resultado.ok).toBe(false);
  });

  it('rechaza un sub que no es un uuid', async () => {
    const resultado = await verificador.verificar(await firmar({ sub: 'no-es-uuid' }));
    expect(resultado.ok).toBe(false);
  });

  it('rechaza texto que no es un token', async () => {
    expect((await verificador.verificar('basura')).ok).toBe(false);
  });
});
