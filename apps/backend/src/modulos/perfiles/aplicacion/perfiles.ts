import { Inject, Injectable } from '@nestjs/common';
import type { perfiles } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { NO_ENCONTRADO, PROHIBIDO } from '../../../compartido/dominio/errores.js';
import type { ErrorCasoUso } from '../../../compartido/dominio/errores.js';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { REPOSITORIO_PERFILES } from '../puertos/repositorio-perfiles.js';
import type {
  RepositorioPerfiles,
  ResultadoActualizacion,
} from '../puertos/repositorio-perfiles.js';

const CONFLICTO_VERSION: ErrorCasoUso = {
  tipo: 'conflicto',
  mensaje: 'Tu perfil cambió en otro lugar. Recarga para ver la versión más reciente',
};

function traducir<T>(resultado: ResultadoActualizacion<T>): Resultado<T, ErrorCasoUso> {
  switch (resultado.tipo) {
    case 'ok':
      return ok(resultado.perfil);
    case 'no_encontrado':
      return fallo(NO_ENCONTRADO);
    case 'conflicto':
      return fallo(CONFLICTO_VERSION);
    case 'referencia_invalida':
      return fallo({
        tipo: 'invalido',
        campo: resultado.campo,
        mensaje: 'Contiene un valor que no existe en el catálogo',
      });
  }
}

@Injectable()
export class ObtenerPerfilTalento {
  constructor(@Inject(REPOSITORIO_PERFILES) private readonly perfiles: RepositorioPerfiles) {}

  /** CU-11: cualquier usuario autenticado puede ver el perfil público de un talento. */
  async ejecutar(id: string): Promise<Resultado<perfiles.PerfilTalento, ErrorCasoUso>> {
    const perfil = await this.perfiles.obtenerTalento(id);
    return perfil ? ok(perfil) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class ActualizarPerfilTalento {
  constructor(@Inject(REPOSITORIO_PERFILES) private readonly perfiles: RepositorioPerfiles) {}

  /** CU-09. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    entrada: perfiles.ActualizarPerfilTalentoEntrada,
  ): Promise<Resultado<perfiles.PerfilTalento, ErrorCasoUso>> {
    if (usuario.rol !== 'talento') return fallo(PROHIBIDO);
    return traducir(await this.perfiles.actualizarTalento(usuario.id, entrada));
  }
}

@Injectable()
export class ObtenerPerfilEmpresa {
  constructor(@Inject(REPOSITORIO_PERFILES) private readonly perfiles: RepositorioPerfiles) {}

  async ejecutar(id: string): Promise<Resultado<perfiles.PerfilEmpresa, ErrorCasoUso>> {
    const perfil = await this.perfiles.obtenerEmpresa(id);
    return perfil ? ok(perfil) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class ActualizarPerfilEmpresa {
  constructor(@Inject(REPOSITORIO_PERFILES) private readonly perfiles: RepositorioPerfiles) {}

  /** CU-10. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    entrada: perfiles.ActualizarPerfilEmpresaEntrada,
  ): Promise<Resultado<perfiles.PerfilEmpresa, ErrorCasoUso>> {
    if (usuario.rol !== 'empresa') return fallo(PROHIBIDO);
    return traducir(await this.perfiles.actualizarEmpresa(usuario.id, entrada));
  }
}
