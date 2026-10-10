import { Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BUSCADOR_USUARIO, VERIFICADOR_TOKEN } from '../dominio/autenticacion.js';
import type { BuscadorUsuario, VerificadorToken } from '../dominio/autenticacion.js';
import { ErrorHttpApi } from './error-api.js';
import { MarcaPublica } from './publica.js';
import type { SolicitudAutenticada } from './solicitud-autenticada.js';

const PREFIJO = 'Bearer ';

/**
 * Valida el token de Supabase y carga el perfil de `usuarios`. Sin token válido responde 401;
 * sin perfil o con la cuenta suspendida, 403.
 */
@Injectable()
export class GuardAutenticacion implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(VERIFICADOR_TOKEN) private readonly verificador: VerificadorToken,
    @Inject(BUSCADOR_USUARIO) private readonly usuarios: BuscadorUsuario,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublica = this.reflector.getAllAndOverride(MarcaPublica, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublica) return true;

    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    const encabezado = solicitud.headers.authorization;
    if (!encabezado?.startsWith(PREFIJO)) throw this.sinSesion();

    const verificacion = await this.verificador.verificar(encabezado.slice(PREFIJO.length));
    if (!verificacion.ok) throw this.sinSesion();

    const usuario = await this.usuarios.buscarPorId(verificacion.valor.usuarioId);
    if (!usuario) throw this.perfilIncompleto();

    switch (usuario.estado) {
      case 'pendiente_verificacion':
      case 'activo':
        solicitud.usuario = usuario;
        return true;
      case 'suspendido':
        throw new ErrorHttpApi(403, 'cuenta_suspendida', 'Tu cuenta está suspendida');
      case 'eliminado':
        throw this.perfilIncompleto();
    }
  }

  private sinSesion(): ErrorHttpApi {
    return new ErrorHttpApi(401, 'no_autenticado', 'Inicia sesión para continuar');
  }

  private perfilIncompleto(): ErrorHttpApi {
    return new ErrorHttpApi(403, 'perfil_incompleto', 'Completa tu registro');
  }
}
