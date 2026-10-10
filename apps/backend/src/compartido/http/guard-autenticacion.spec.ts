import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { fallo, ok } from '../dominio/resultado.js';
import { BUSCADOR_USUARIO, VERIFICADOR_TOKEN } from '../dominio/autenticacion.js';
import type {
  BuscadorUsuario,
  UsuarioAutenticado,
  VerificadorToken,
} from '../dominio/autenticacion.js';
import { CompartidoHttpModule } from './compartido-http.module.js';
import { GuardAutenticacion } from './guard-autenticacion.js';
import { Publica } from './publica.js';
import { UsuarioActual } from './usuario-actual.decorator.js';

const ID = '0b6c1f0e-8f3b-4a52-9d57-0d7f6a3d9c11';

@Controller('privada')
class PrivadaController {
  @Get()
  quien(@UsuarioActual() usuario: UsuarioAutenticado): UsuarioAutenticado {
    return usuario;
  }

  @Publica()
  @Get('abierta')
  abierta(): { abierta: true } {
    return { abierta: true };
  }
}

const verificadorSimulado: VerificadorToken = {
  verificar: (token) =>
    Promise.resolve(token === 'valido' ? ok({ usuarioId: ID }) : fallo('token_invalido')),
};

let usuarioEnBase: UsuarioAutenticado | null = null;

const buscadorSimulado: BuscadorUsuario = {
  buscarPorId: () => Promise.resolve(usuarioEnBase),
};

@Module({
  imports: [CompartidoHttpModule],
  controllers: [PrivadaController],
  providers: [
    { provide: APP_GUARD, useClass: GuardAutenticacion },
    { provide: VERIFICADOR_TOKEN, useValue: verificadorSimulado },
    { provide: BUSCADOR_USUARIO, useValue: buscadorSimulado },
  ],
})
class PruebaModule {}

let app: NestFastifyApplication;

async function crearApp(usuario: UsuarioAutenticado | null): Promise<NestFastifyApplication> {
  usuarioEnBase = usuario;
  const modulo = await Test.createTestingModule({ imports: [PruebaModule] }).compile();
  app = modulo.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.useLogger(false);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

function pedir(servidor: NestFastifyApplication, url: string, token?: string) {
  return servidor.inject({
    method: 'GET',
    url,
    ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
  });
}

afterEach(async () => {
  await app.close();
});

describe('GuardAutenticacion', () => {
  it('sin token responde 401', async () => {
    const respuesta = await pedir(await crearApp(null), '/privada');
    expect(respuesta.statusCode).toBe(401);
    expect(respuesta.json()).toMatchObject({ code: 'no_autenticado' });
  });

  it('con un token inválido responde 401', async () => {
    const respuesta = await pedir(await crearApp(null), '/privada', 'falso');
    expect(respuesta.statusCode).toBe(401);
  });

  it('CA-05.5 una cuenta sin perfil en usuarios recibe 403 de registro incompleto', async () => {
    const respuesta = await pedir(await crearApp(null), '/privada', 'valido');
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json()).toMatchObject({ code: 'perfil_incompleto' });
  });

  it('CA-05.3 una cuenta suspendida recibe 403 de cuenta suspendida', async () => {
    const suspendido: UsuarioAutenticado = { id: ID, rol: 'talento', estado: 'suspendido' };
    const respuesta = await pedir(await crearApp(suspendido), '/privada', 'valido');
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json()).toMatchObject({ code: 'cuenta_suspendida' });
  });

  it('una cuenta eliminada se trata como sin perfil', async () => {
    const eliminado: UsuarioAutenticado = { id: ID, rol: 'talento', estado: 'eliminado' };
    const respuesta = await pedir(await crearApp(eliminado), '/privada', 'valido');
    expect(respuesta.statusCode).toBe(403);
    expect(respuesta.json()).toMatchObject({ code: 'perfil_incompleto' });
  });

  it('una cuenta activa entra y el controlador recibe el usuario', async () => {
    const activo: UsuarioAutenticado = { id: ID, rol: 'empresa', estado: 'activo' };
    const respuesta = await pedir(await crearApp(activo), '/privada', 'valido');
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual(activo);
  });

  it('las rutas de salud no piden token (las consulta la plataforma de despliegue)', async () => {
    const servidor = await crearApp(null);
    expect((await pedir(servidor, '/salud')).statusCode).toBe(200);
    expect((await pedir(servidor, '/salud/listo')).statusCode).toBe(200);
  });

  it('una ruta marcada como pública no pide token', async () => {
    const respuesta = await pedir(await crearApp(null), '/privada/abierta');
    expect(respuesta.statusCode).toBe(200);
  });
});
