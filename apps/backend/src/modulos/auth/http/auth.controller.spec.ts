import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { z } from 'zod';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { ALMACEN_IDEMPOTENCIA } from '../../../compartido/dominio/idempotencia.js';
import type {
  AlmacenIdempotencia,
  InicioIdempotencia,
} from '../../../compartido/dominio/idempotencia.js';
import { LIMITADOR_TASA } from '../../../compartido/dominio/limite-tasa.js';
import { CompartidoHttpModule } from '../../../compartido/http/compartido-http.module.js';
import { RegistrarTalento } from '../aplicacion/registrar-talento.js';
import { PROVEEDOR_IDENTIDAD } from '../puertos/proveedor-identidad.js';
import type { CuentaCreada, ProveedorIdentidad } from '../puertos/proveedor-identidad.js';
import { RELOJ } from '../puertos/reloj.js';
import { REPOSITORIO_USUARIOS } from '../puertos/repositorio-usuarios.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';
import { AuthController } from './auth.controller.js';

const ID = '0b6c1f0e-8f3b-4a52-9d57-0d7f6a3d9c11';

const base = {
  rol: 'talento',
  nombreCompleto: 'Ana Pérez',
  correo: 'ana@correo.com',
  contrasena: 'una-contrasena-larga',
  fechaNacimiento: '2000-05-20',
  declaracionSinExperiencia: true,
  aceptaTerminos: true,
};

const valido = { ...base, estadoAcademico: 'estudiante', ciclo: 4 };

let cuenta: Resultado<CuentaCreada, 'no_disponible'>;
let falloDelRepositorio: Error | null;
let perfiles: number;
let cuentasEliminadas: string[];
let sinLimite: boolean;

const identidad: ProveedorIdentidad = {
  crearCuenta: () => Promise.resolve(cuenta),
  eliminarCuenta: (id) => {
    cuentasEliminadas.push(id);
    return Promise.resolve();
  },
};

const usuarios: RepositorioUsuarios = {
  crearTalento: () => {
    if (falloDelRepositorio) return Promise.reject(falloDelRepositorio);
    perfiles += 1;
    return Promise.resolve('creado');
  },
  buscarPorId: () => Promise.resolve(null),
};

class AlmacenEnMemoria implements AlmacenIdempotencia {
  private readonly registros = new Map<string, { huella: string; cuerpo?: unknown }>();

  iniciar(llave: string, huella: string): Promise<InicioIdempotencia> {
    const existente = this.registros.get(llave);
    if (!existente) {
      this.registros.set(llave, { huella });
      return Promise.resolve({ tipo: 'nueva' });
    }
    if (existente.huella !== huella) return Promise.resolve({ tipo: 'huella_distinta' });
    return Promise.resolve(
      'cuerpo' in existente ? { tipo: 'repetida', cuerpo: existente.cuerpo } : { tipo: 'en_curso' },
    );
  }

  completar(llave: string, huella: string, cuerpo: unknown): Promise<void> {
    this.registros.set(llave, { huella, cuerpo });
    return Promise.resolve();
  }

  liberar(llave: string): Promise<void> {
    this.registros.delete(llave);
    return Promise.resolve();
  }
}

@Module({
  imports: [CompartidoHttpModule],
  controllers: [AuthController],
  providers: [
    RegistrarTalento,
    { provide: PROVEEDOR_IDENTIDAD, useValue: identidad },
    { provide: REPOSITORIO_USUARIOS, useValue: usuarios },
    {
      provide: LIMITADOR_TASA,
      useValue: {
        intentar: () =>
          Promise.resolve(
            sinLimite ? { permitido: true } : { permitido: false, reintentarEnMs: 30_000 },
          ),
      },
    },
    { provide: RELOJ, useValue: { ahora: () => new Date('2026-10-10T12:00:00Z') } },
    { provide: ALMACEN_IDEMPOTENCIA, useValue: new AlmacenEnMemoria() },
  ],
})
class PruebaModule {}

let app: NestFastifyApplication;

function registrar(cuerpo: object, llave: string = randomUUID()) {
  return app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: cuerpo,
    headers: { 'idempotency-key': llave },
  });
}

const ErrorConDetalles = z.object({ details: z.array(z.object({ campo: z.string() })) });

function campos(respuesta: { json: () => unknown }): string[] {
  return ErrorConDetalles.parse(respuesta.json()).details.map((d) => d.campo);
}

beforeEach(async () => {
  cuenta = ok({ tipo: 'nueva', id: ID });
  falloDelRepositorio = null;
  perfiles = 0;
  cuentasEliminadas = [];
  sinLimite = true;
  const modulo = await Test.createTestingModule({ imports: [PruebaModule] }).compile();
  app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useLogger(false);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterEach(async () => {
  await app.close();
});

describe('POST /auth/register (talento)', () => {
  it('CA-01.1 con datos válidos responde 202 y pide revisar el correo', async () => {
    const respuesta = await registrar(valido);
    expect(respuesta.statusCode).toBe(202);
    expect(respuesta.json()).toEqual({ estado: 'revisa_tu_correo' });
    expect(perfiles).toBe(1);
  });

  it('CA-01.2 un menor de 18 años recibe 422 con el mensaje esperado y no se crea nada', async () => {
    const respuesta = await registrar({ ...valido, fechaNacimiento: '2012-01-01' });
    expect(respuesta.statusCode).toBe(422);
    expect(respuesta.json()).toMatchObject({
      code: 'menor_de_edad',
      message: 'Debes tener 18 años o más',
    });
    expect(perfiles).toBe(0);
  });

  it('CA-01.3 sin la declaración de cero experiencia el backend responde 422', async () => {
    const respuesta = await registrar({ ...valido, declaracionSinExperiencia: false });
    expect(respuesta.statusCode).toBe(422);
    expect(campos(respuesta)).toContain('declaracionSinExperiencia');
    expect(perfiles).toBe(0);
  });

  it('CA-01.4 un estudiante sin ciclo recibe error en el campo ciclo', async () => {
    const respuesta = await registrar({ ...base, estadoAcademico: 'estudiante' });
    expect(respuesta.statusCode).toBe(422);
    expect(campos(respuesta)).toContain('ciclo');
  });

  it('CA-01.5 un egresado sin año de egreso recibe error en el campo anioEgreso', async () => {
    const respuesta = await registrar({ ...base, estadoAcademico: 'egresado' });
    expect(respuesta.statusCode).toBe(422);
    expect(campos(respuesta)).toContain('anioEgreso');
  });

  it('CA-01.9 una contraseña de menos de 10 caracteres recibe error de validación', async () => {
    const respuesta = await registrar({ ...valido, contrasena: '123456789' });
    expect(respuesta.statusCode).toBe(422);
    expect(campos(respuesta)).toContain('contrasena');
  });

  it('CA-01.6 un correo ya registrado recibe la misma respuesta que uno nuevo', async () => {
    const nuevo = await registrar(valido);
    cuenta = ok({ tipo: 'ya_registrada' });
    const existente = await registrar(valido);
    expect(existente.statusCode).toBe(nuevo.statusCode);
    expect(existente.json()).toEqual(nuevo.json());
  });

  it('CA-01.7 si falla el perfil responde un error genérico y elimina la cuenta de Auth', async () => {
    falloDelRepositorio = new Error('detalle interno de la base de datos');
    const respuesta = await registrar(valido);
    expect(respuesta.statusCode).toBe(500);
    expect(respuesta.json()).toEqual({
      code: 'error_interno',
      message: 'Ocurrió un error inesperado',
    });
    expect(cuentasEliminadas).toEqual([ID]);
  });

  it('CA-01.8 el doble clic con la misma Idempotency-Key crea una sola cuenta', async () => {
    const llave = randomUUID();
    const primera = await registrar(valido, llave);
    const segunda = await registrar(valido, llave);
    expect(segunda.statusCode).toBe(202);
    expect(segunda.json()).toEqual(primera.json());
    expect(perfiles).toBe(1);
  });

  it('CA-00.1 el backend valida aunque el navegador haya omitido la validación', async () => {
    const respuesta = await registrar({ ...valido, correo: 'no-es-un-correo' });
    expect(respuesta.statusCode).toBe(422);
    expect(campos(respuesta)).toContain('correo');
  });

  it('CA-00.3 al superar los intentos por correo responde 429 con el tiempo de espera', async () => {
    sinLimite = false;
    const respuesta = await registrar(valido);
    expect(respuesta.statusCode).toBe(429);
    expect(respuesta.json<{ message: string }>().message).toContain('30 segundos');
  });

  it('si Supabase no responde devuelve 503 sin culpar al usuario', async () => {
    cuenta = fallo('no_disponible');
    const respuesta = await registrar(valido);
    expect(respuesta.statusCode).toBe(503);
  });
});
