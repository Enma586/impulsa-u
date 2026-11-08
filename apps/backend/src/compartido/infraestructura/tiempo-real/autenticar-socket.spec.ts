import { describe, expect, it } from 'vitest';
import { fallo, ok } from '../../dominio/resultado.js';
import type {
  BuscadorUsuario,
  UsuarioAutenticado,
  VerificadorToken,
} from '../../dominio/autenticacion.js';
import { autenticarSocket } from './autenticar-socket.js';

const ID = '0b6c1f0e-8f3b-4a52-9d57-0d7f6a3d9c11';
const SESION = '5d0e2d0c-4a8e-4b8b-9a0e-6c2f6f1f7a10';

const verificador: VerificadorToken = {
  verificar: (token) =>
    Promise.resolve(
      token === 'valido' ? ok({ usuarioId: ID, sesionId: SESION }) : fallo('token_invalido'),
    ),
};

function buscador(usuario: UsuarioAutenticado | null): BuscadorUsuario {
  return { buscarPorId: () => Promise.resolve(usuario) };
}

const activo: UsuarioAutenticado = { id: ID, rol: 'talento', estado: 'activo' };

describe('autenticarSocket (handshake del chat)', () => {
  it('acepta un token válido y deja usuario, sesión y rol', async () => {
    const resultado = await autenticarSocket(verificador, buscador(activo), { token: 'valido' });
    expect(resultado).toEqual(ok({ usuarioId: ID, sesionId: SESION, rol: 'talento' }));
  });

  it('acepta una cuenta pendiente de verificación, igual que el guard HTTP', async () => {
    const pendiente: UsuarioAutenticado = { ...activo, estado: 'pendiente_verificacion' };
    const resultado = await autenticarSocket(verificador, buscador(pendiente), { token: 'valido' });
    expect(resultado.ok).toBe(true);
  });

  it.each([undefined, null, {}, { token: '' }, { token: 42 }, 'valido'])(
    'rechaza un handshake sin token utilizable (%j)',
    async (auth) => {
      const resultado = await autenticarSocket(verificador, buscador(activo), auth);
      expect(resultado).toEqual(fallo('no_autenticado'));
    },
  );

  it('rechaza un token inválido', async () => {
    const resultado = await autenticarSocket(verificador, buscador(activo), { token: 'falso' });
    expect(resultado).toEqual(fallo('no_autenticado'));
  });

  it('rechaza una cuenta con token válido pero sin perfil en ImpulsaU', async () => {
    const resultado = await autenticarSocket(verificador, buscador(null), { token: 'valido' });
    expect(resultado).toEqual(fallo('perfil_incompleto'));
  });

  it('rechaza una cuenta suspendida', async () => {
    const suspendido: UsuarioAutenticado = { ...activo, estado: 'suspendido' };
    const resultado = await autenticarSocket(verificador, buscador(suspendido), {
      token: 'valido',
    });
    expect(resultado).toEqual(fallo('cuenta_suspendida'));
  });

  it('trata una cuenta eliminada como sin perfil', async () => {
    const eliminado: UsuarioAutenticado = { ...activo, estado: 'eliminado' };
    const resultado = await autenticarSocket(verificador, buscador(eliminado), {
      token: 'valido',
    });
    expect(resultado).toEqual(fallo('perfil_incompleto'));
  });
});
