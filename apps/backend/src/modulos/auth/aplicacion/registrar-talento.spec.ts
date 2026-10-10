import { beforeEach, describe, expect, it } from 'vitest';
import type { auth } from '@impulsau/contracts';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import type { LimitadorTasa, ResultadoLimite } from '../../../compartido/dominio/limite-tasa.js';
import type { CuentaCreada, ProveedorIdentidad } from '../puertos/proveedor-identidad.js';
import type { NuevoTalento, RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';
import { RegistrarTalento } from './registrar-talento.js';

const HOY = new Date('2026-10-10T12:00:00Z');
const ID = '0b6c1f0e-8f3b-4a52-9d57-0d7f6a3d9c11';

const estudiante: auth.RegistrarTalentoEntrada = {
  rol: 'talento',
  nombreCompleto: 'Ana Pérez',
  correo: 'ana@correo.com',
  contrasena: 'una-contrasena-larga',
  fechaNacimiento: '2000-05-20',
  declaracionSinExperiencia: true,
  aceptaTerminos: true,
  estadoAcademico: 'estudiante',
  ciclo: 4,
};

const egresado: auth.RegistrarTalentoEntrada = {
  rol: 'talento',
  nombreCompleto: 'Luis Gómez',
  correo: 'luis@correo.com',
  contrasena: 'una-contrasena-larga',
  fechaNacimiento: '1998-01-15',
  declaracionSinExperiencia: true,
  aceptaTerminos: true,
  estadoAcademico: 'egresado',
  anioEgreso: 2024,
};

let cuentaDelProveedor: Resultado<CuentaCreada, 'no_disponible'>;
let respuestaRepositorio: 'creado' | 'ya_existia' | Error;
let limite: ResultadoLimite;
let cuentasCreadas: { correo: string; contrasena: string }[];
let cuentasEliminadas: string[];
let talentosGuardados: NuevoTalento[];
let clavesDeLimite: string[];

const identidad: ProveedorIdentidad = {
  crearCuenta: (datos) => {
    cuentasCreadas.push(datos);
    return Promise.resolve(cuentaDelProveedor);
  },
  eliminarCuenta: (id) => {
    cuentasEliminadas.push(id);
    return Promise.resolve();
  },
};

const usuarios: RepositorioUsuarios = {
  crearTalento: (talento) => {
    talentosGuardados.push(talento);
    return respuestaRepositorio instanceof Error
      ? Promise.reject(respuestaRepositorio)
      : Promise.resolve(respuestaRepositorio);
  },
  buscarPorId: () => Promise.resolve(null),
};

const limitador: LimitadorTasa = {
  intentar: (clave) => {
    clavesDeLimite.push(clave);
    return Promise.resolve(limite);
  },
};

const casoDeUso = new RegistrarTalento(identidad, usuarios, limitador, { ahora: () => HOY });

beforeEach(() => {
  cuentaDelProveedor = ok({ tipo: 'nueva', id: ID });
  respuestaRepositorio = 'creado';
  limite = { permitido: true };
  cuentasCreadas = [];
  cuentasEliminadas = [];
  talentosGuardados = [];
  clavesDeLimite = [];
});

describe('RegistrarTalento', () => {
  it('CA-01.1 con datos válidos crea la cuenta y el perfil y pide revisar el correo', async () => {
    const resultado = await casoDeUso.ejecutar(estudiante);
    expect(resultado).toEqual({ ok: true, valor: { estado: 'revisa_tu_correo' } });
    expect(cuentasCreadas).toEqual([
      { correo: 'ana@correo.com', contrasena: estudiante.contrasena },
    ]);
    expect(talentosGuardados).toEqual([
      {
        id: ID,
        correo: 'ana@correo.com',
        nombreCompleto: 'Ana Pérez',
        fechaNacimiento: '2000-05-20',
        estadoAcademico: 'estudiante',
        ciclo: 4,
        anioEgreso: null,
        declaracionSinExperienciaEn: HOY,
      },
    ]);
  });

  it('CA-01.5 un egresado guarda su año de egreso y no un ciclo', async () => {
    await casoDeUso.ejecutar(egresado);
    expect(talentosGuardados[0]).toMatchObject({
      estadoAcademico: 'egresado',
      ciclo: null,
      anioEgreso: 2024,
    });
  });

  it('CA-01.2 un menor de 18 años se rechaza sin crear nada', async () => {
    const menor = { ...estudiante, fechaNacimiento: '2008-10-11' };
    const resultado = await casoDeUso.ejecutar(menor);
    expect(resultado).toEqual({ ok: false, error: { tipo: 'menor_de_edad' } });
    expect(cuentasCreadas).toHaveLength(0);
    expect(talentosGuardados).toHaveLength(0);
  });

  it('CA-01.2 quien cumple 18 años hoy puede registrarse', async () => {
    const exacto = { ...estudiante, fechaNacimiento: '2008-10-10' };
    expect((await casoDeUso.ejecutar(exacto)).ok).toBe(true);
  });

  it('CA-01.6 un correo ya registrado recibe la misma respuesta y no se crea nada', async () => {
    cuentaDelProveedor = ok({ tipo: 'ya_registrada' });
    const resultado = await casoDeUso.ejecutar(estudiante);
    expect(resultado).toEqual({ ok: true, valor: { estado: 'revisa_tu_correo' } });
    expect(talentosGuardados).toHaveLength(0);
    expect(cuentasEliminadas).toHaveLength(0);
  });

  it('CA-01.6 si el perfil ya existía responde igual y no elimina la cuenta', async () => {
    respuestaRepositorio = 'ya_existia';
    const resultado = await casoDeUso.ejecutar(estudiante);
    expect(resultado).toEqual({ ok: true, valor: { estado: 'revisa_tu_correo' } });
    expect(cuentasEliminadas).toHaveLength(0);
  });

  it('CA-01.7 si falla la creación del perfil elimina la cuenta de Auth y propaga el error', async () => {
    respuestaRepositorio = new Error('falló la base de datos');
    await expect(casoDeUso.ejecutar(estudiante)).rejects.toThrow('falló la base de datos');
    expect(cuentasEliminadas).toEqual([ID]);
  });

  it('si el proveedor de identidad no responde devuelve un error recuperable', async () => {
    cuentaDelProveedor = fallo('no_disponible');
    const resultado = await casoDeUso.ejecutar(estudiante);
    expect(resultado).toEqual({ ok: false, error: { tipo: 'proveedor_no_disponible' } });
    expect(talentosGuardados).toHaveLength(0);
  });

  it('CA-00.3 al superar los intentos por correo responde con el tiempo de espera', async () => {
    limite = { permitido: false, reintentarEnMs: 90_000 };
    const resultado = await casoDeUso.ejecutar(estudiante);
    expect(resultado).toEqual({
      ok: false,
      error: { tipo: 'demasiados_intentos', reintentarEnMs: 90_000 },
    });
    expect(cuentasCreadas).toHaveLength(0);
  });

  it('CA-00.2 la clave del límite no contiene el correo en claro', async () => {
    await casoDeUso.ejecutar(estudiante);
    expect(clavesDeLimite[0]).toBeDefined();
    expect(clavesDeLimite[0]).not.toContain('ana@correo.com');
  });
});
