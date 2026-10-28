import { beforeEach, describe, expect, it } from 'vitest';
import type { auth } from '@impulsau/contracts';
import type { LimitadorTasa, ResultadoLimite } from '../../../compartido/dominio/limite-tasa.js';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import type {
  ErrorInicioSesion,
  ProveedorIdentidad,
  TokensSesion,
} from '../puertos/proveedor-identidad.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';
import { CerrarSesion, IniciarSesion, RenovarSesion } from './sesion.js';

const ID = '0b6c1f0e-8f3b-4a52-9d57-0d7f6a3d9c11';
const tokens: TokensSesion = {
  usuarioId: ID,
  accessToken: 'acceso',
  refreshToken: 'renovacion',
  expiraEn: 1_800_000_000,
};
const resumen: auth.UsuarioSesion = {
  id: ID,
  correo: 'ana@correo.com',
  rol: 'talento',
  estado: 'activo',
  nombre: 'Ana Pérez',
};

let inicio: Resultado<TokensSesion, ErrorInicioSesion>;
let renovacion: Resultado<TokensSesion, 'sesion_invalida' | 'no_disponible'>;
let cierre: Resultado<true, 'no_disponible'>;
let alcances: string[];
let activados: string[];
let perfil: auth.UsuarioSesion | null;
let limite: ResultadoLimite;

const identidad: ProveedorIdentidad = {
  crearCuenta: () => Promise.reject(new Error('no se usa')),
  eliminarCuenta: () => Promise.resolve(),
  iniciarSesion: () => Promise.resolve(inicio),
  renovarSesion: () => Promise.resolve(renovacion),
  cerrarSesion: (_token, alcance) => {
    alcances.push(alcance);
    return Promise.resolve(cierre);
  },
};

const usuarios: RepositorioUsuarios = {
  crearTalento: () => Promise.reject(new Error('no se usa')),
  crearEmpresa: () => Promise.reject(new Error('no se usa')),
  buscarPorId: () => Promise.resolve(null),
  resumenSesion: () => Promise.resolve(perfil),
  activar: (id) => {
    activados.push(id);
    return Promise.resolve();
  },
};

const limitador: LimitadorTasa = { intentar: () => Promise.resolve(limite) };

beforeEach(() => {
  inicio = ok(tokens);
  renovacion = ok(tokens);
  cierre = ok(true);
  alcances = [];
  activados = [];
  perfil = resumen;
  limite = { permitido: true };
});

describe('CU-05 iniciar sesión', () => {
  const entrada = { correo: 'ana@correo.com', contrasena: 'una-contrasena-larga' };

  it('CA-05.1 devuelve la sesión con el usuario y activa la cuenta verificada', async () => {
    const resultado = await new IniciarSesion(identidad, usuarios, limitador).ejecutar(entrada);
    expect(resultado).toEqual(
      ok({
        accessToken: 'acceso',
        refreshToken: 'renovacion',
        expiraEn: 1_800_000_000,
        usuario: resumen,
      }),
    );
    expect(activados).toEqual([ID]);
  });

  it('CA-05.2 credenciales inválidas no revelan si el correo existe', async () => {
    inicio = fallo('credenciales_invalidas');
    const resultado = await new IniciarSesion(identidad, usuarios, limitador).ejecutar(entrada);
    expect(resultado).toEqual(fallo({ tipo: 'credenciales_invalidas' }));
    expect(activados).toEqual([]);
  });

  it('CA-05.3 con el correo sin confirmar avisa que falta verificar', async () => {
    inicio = fallo('correo_no_verificado');
    const resultado = await new IniciarSesion(identidad, usuarios, limitador).ejecutar(entrada);
    expect(resultado).toEqual(fallo({ tipo: 'correo_no_verificado' }));
  });

  it('CA-05.4 responde sin_perfil si la cuenta de Auth no tiene perfil', async () => {
    perfil = null;
    const resultado = await new IniciarSesion(identidad, usuarios, limitador).ejecutar(entrada);
    expect(resultado).toEqual(fallo({ tipo: 'sin_perfil' }));
  });

  it('CA-05.5 limita los intentos por correo', async () => {
    limite = { permitido: false, reintentarEnMs: 5_000 };
    const resultado = await new IniciarSesion(identidad, usuarios, limitador).ejecutar(entrada);
    expect(resultado).toEqual(fallo({ tipo: 'demasiados_intentos', reintentarEnMs: 5_000 }));
  });
});

describe('CU-07 renovar la sesión', () => {
  it('CA-07.1 entrega tokens nuevos', async () => {
    const resultado = await new RenovarSesion(identidad, usuarios).ejecutar({
      refreshToken: 'renovacion',
    });
    expect(resultado.ok).toBe(true);
  });

  it('CA-07.2 un refresh token inválido exige iniciar sesión otra vez', async () => {
    renovacion = fallo('sesion_invalida');
    const resultado = await new RenovarSesion(identidad, usuarios).ejecutar({
      refreshToken: 'viejo',
    });
    expect(resultado).toEqual(fallo({ tipo: 'credenciales_invalidas' }));
  });
});

describe('CU-06 cerrar sesión', () => {
  it('CA-06.1 cierra solo este dispositivo o todos según el alcance', async () => {
    const caso = new CerrarSesion(identidad);
    await caso.ejecutar('acceso', { alcance: 'local' });
    await caso.ejecutar('acceso', { alcance: 'global' });
    expect(alcances).toEqual(['local', 'global']);
  });

  it('CA-06.2 informa si el proveedor no pudo revocar la sesión', async () => {
    cierre = fallo('no_disponible');
    const resultado = await new CerrarSesion(identidad).ejecutar('acceso', { alcance: 'global' });
    expect(resultado).toEqual(fallo({ tipo: 'proveedor_no_disponible' }));
  });
});
