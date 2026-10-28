import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { auth } from '@impulsau/contracts';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { LIMITADOR_TASA } from '../../../compartido/dominio/limite-tasa.js';
import type { LimitadorTasa } from '../../../compartido/dominio/limite-tasa.js';
import type { ErrorSesion } from '../dominio/errores.js';
import { PROVEEDOR_IDENTIDAD } from '../puertos/proveedor-identidad.js';
import type { ProveedorIdentidad, TokensSesion } from '../puertos/proveedor-identidad.js';
import { REPOSITORIO_USUARIOS } from '../puertos/repositorio-usuarios.js';
import type { RepositorioUsuarios } from '../puertos/repositorio-usuarios.js';

const INTENTOS_POR_CORREO = 8;
const DIEZ_MINUTOS_MS = 600_000;

@Injectable()
export class IniciarSesion {
  constructor(
    @Inject(PROVEEDOR_IDENTIDAD) private readonly identidad: ProveedorIdentidad,
    @Inject(REPOSITORIO_USUARIOS) private readonly usuarios: RepositorioUsuarios,
    @Inject(LIMITADOR_TASA) private readonly limitador: LimitadorTasa,
  ) {}

  /** CU-05. Un correo confirmado en Auth deja la cuenta `activa` (CU-04). */
  async ejecutar(entrada: auth.IniciarSesionEntrada): Promise<Resultado<auth.Sesion, ErrorSesion>> {
    const huella = createHash('sha256').update(entrada.correo).digest('hex');
    const limite = await this.limitador.intentar(
      `login:correo:${huella}`,
      INTENTOS_POR_CORREO,
      DIEZ_MINUTOS_MS,
    );
    if (!limite.permitido) {
      return fallo({ tipo: 'demasiados_intentos', reintentarEnMs: limite.reintentarEnMs });
    }

    const tokens = await this.identidad.iniciarSesion(entrada);
    if (!tokens.ok) {
      switch (tokens.error) {
        case 'credenciales_invalidas':
          return fallo({ tipo: 'credenciales_invalidas' });
        case 'correo_no_verificado':
          return fallo({ tipo: 'correo_no_verificado' });
        case 'no_disponible':
          return fallo({ tipo: 'proveedor_no_disponible' });
      }
    }
    return armarSesion(this.usuarios, tokens.valor, true);
  }
}

@Injectable()
export class RenovarSesion {
  constructor(
    @Inject(PROVEEDOR_IDENTIDAD) private readonly identidad: ProveedorIdentidad,
    @Inject(REPOSITORIO_USUARIOS) private readonly usuarios: RepositorioUsuarios,
  ) {}

  /** CU-07. */
  async ejecutar(entrada: auth.RenovarSesionEntrada): Promise<Resultado<auth.Sesion, ErrorSesion>> {
    const tokens = await this.identidad.renovarSesion(entrada.refreshToken);
    if (!tokens.ok) {
      return fallo(
        tokens.error === 'sesion_invalida'
          ? { tipo: 'credenciales_invalidas' }
          : { tipo: 'proveedor_no_disponible' },
      );
    }
    return armarSesion(this.usuarios, tokens.valor, false);
  }
}

@Injectable()
export class CerrarSesion {
  constructor(@Inject(PROVEEDOR_IDENTIDAD) private readonly identidad: ProveedorIdentidad) {}

  /** CU-06: en este dispositivo (`local`) o en todos (`global`). */
  async ejecutar(
    accessToken: string,
    entrada: auth.CerrarSesionEntrada,
  ): Promise<Resultado<true, ErrorSesion>> {
    const resultado = await this.identidad.cerrarSesion(accessToken, entrada.alcance);
    return resultado.ok ? ok(true) : fallo({ tipo: 'proveedor_no_disponible' });
  }
}

@Injectable()
export class ObtenerSesionActual {
  constructor(@Inject(REPOSITORIO_USUARIOS) private readonly usuarios: RepositorioUsuarios) {}

  async ejecutar(usuarioId: string): Promise<auth.UsuarioSesion | null> {
    return this.usuarios.resumenSesion(usuarioId);
  }
}

async function armarSesion(
  usuarios: RepositorioUsuarios,
  tokens: TokensSesion,
  activar: boolean,
): Promise<Resultado<auth.Sesion, ErrorSesion>> {
  if (activar) await usuarios.activar(tokens.usuarioId);
  const usuario = await usuarios.resumenSesion(tokens.usuarioId);
  if (!usuario) return fallo({ tipo: 'sin_perfil' });
  return ok({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiraEn: tokens.expiraEn,
    usuario,
  });
}
