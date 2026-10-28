import { Inject, Injectable } from '@nestjs/common';
import type { vacantes } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';
import { NO_ENCONTRADO, PROHIBIDO } from '../../../compartido/dominio/errores.js';
import type { ErrorCasoUso, ResultadoEscritura } from '../../../compartido/dominio/errores.js';
import { fallo, ok } from '../../../compartido/dominio/resultado.js';
import type { Resultado } from '../../../compartido/dominio/resultado.js';
import { REPOSITORIO_POSTULACIONES, REPOSITORIO_VACANTES } from '../puertos/puertos.js';
import type { RepositorioPostulaciones, RepositorioVacantes } from '../puertos/puertos.js';

const CONFLICTO_VERSION: ErrorCasoUso = {
  tipo: 'conflicto',
  mensaje: 'Esto cambió en otro lugar. Recarga para ver la versión más reciente',
};

function traducir<T>(resultado: ResultadoEscritura<T>): Resultado<T, ErrorCasoUso> {
  switch (resultado.tipo) {
    case 'ok':
      return ok(resultado.valor);
    case 'no_encontrado':
      return fallo(NO_ENCONTRADO);
    case 'prohibido':
      return fallo(PROHIBIDO);
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
export class PublicarVacante {
  constructor(@Inject(REPOSITORIO_VACANTES) private readonly vacantes: RepositorioVacantes) {}

  /** CU-40. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    entrada: vacantes.PublicarVacanteEntrada,
  ): Promise<Resultado<vacantes.VacanteDetalle, ErrorCasoUso>> {
    if (usuario.rol !== 'empresa') return fallo(PROHIBIDO);
    const creada = traducir(await this.vacantes.crear(usuario.id, entrada, new Date()));
    if (!creada.ok) return creada;
    const detalle = await this.vacantes.obtener(creada.valor.id, usuario);
    return detalle ? ok(detalle) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class EditarVacante {
  constructor(@Inject(REPOSITORIO_VACANTES) private readonly vacantes: RepositorioVacantes) {}

  /** CU-41, con bloqueo optimista. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    id: string,
    entrada: vacantes.EditarVacanteEntrada,
  ): Promise<Resultado<vacantes.VacanteDetalle, ErrorCasoUso>> {
    if (usuario.rol !== 'empresa') return fallo(PROHIBIDO);
    const editada = traducir(await this.vacantes.editar(id, usuario.id, entrada, new Date()));
    if (!editada.ok) return editada;
    const detalle = await this.vacantes.obtener(id, usuario);
    return detalle ? ok(detalle) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class CambiarEstadoVacante {
  constructor(@Inject(REPOSITORIO_VACANTES) private readonly vacantes: RepositorioVacantes) {}

  /** CU-41: pausar, reabrir o cerrar. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    id: string,
    entrada: vacantes.CambiarEstadoVacanteEntrada,
  ): Promise<Resultado<vacantes.VacanteDetalle, ErrorCasoUso>> {
    if (usuario.rol !== 'empresa') return fallo(PROHIBIDO);
    const cambio = traducir(
      await this.vacantes.cambiarEstado(id, usuario.id, entrada.estado, new Date()),
    );
    if (!cambio.ok) return cambio;
    const detalle = await this.vacantes.obtener(id, usuario);
    return detalle ? ok(detalle) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class ObtenerVacante {
  constructor(@Inject(REPOSITORIO_VACANTES) private readonly vacantes: RepositorioVacantes) {}

  async ejecutar(
    usuario: UsuarioAutenticado,
    id: string,
  ): Promise<Resultado<vacantes.VacanteDetalle, ErrorCasoUso>> {
    const detalle = await this.vacantes.obtener(id, usuario);
    return detalle ? ok(detalle) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class ExplorarVacantes {
  constructor(@Inject(REPOSITORIO_VACANTES) private readonly vacantes: RepositorioVacantes) {}

  /** CU-42. */
  ejecutar(
    usuario: UsuarioAutenticado,
    consulta: vacantes.ConsultaVacantes,
  ): Promise<vacantes.PaginaVacantes> {
    return this.vacantes.listar(usuario, consulta);
  }
}

@Injectable()
export class Postularse {
  constructor(
    @Inject(REPOSITORIO_POSTULACIONES) private readonly postulaciones: RepositorioPostulaciones,
  ) {}

  /** CU-43: el talento adjunta proyectos propios y publicados. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    vacanteId: string,
    entrada: vacantes.PostularseEntrada,
  ): Promise<Resultado<vacantes.Postulacion, ErrorCasoUso>> {
    if (usuario.rol !== 'talento') return fallo(PROHIBIDO);
    const resultado = await this.postulaciones.postular(usuario.id, vacanteId, entrada.proyectoIds);
    switch (resultado.tipo) {
      case 'vacante_no_encontrada':
        return fallo(NO_ENCONTRADO);
      case 'vacante_no_abierta':
        return fallo({ tipo: 'conflicto', mensaje: 'Esta vacante ya no recibe postulaciones' });
      case 'ya_postulado':
        return fallo({ tipo: 'conflicto', mensaje: 'Ya te postulaste a esta vacante' });
      case 'proyecto_invalido':
        return fallo({
          tipo: 'invalido',
          campo: 'proyectoIds',
          mensaje: 'Solo puedes adjuntar tus proyectos publicados',
        });
      case 'ok': {
        const postulacion = await this.postulaciones.obtenerDelTalento(resultado.id, usuario.id);
        return postulacion ? ok(postulacion) : fallo(NO_ENCONTRADO);
      }
    }
  }
}

@Injectable()
export class MisPostulaciones {
  constructor(
    @Inject(REPOSITORIO_POSTULACIONES) private readonly postulaciones: RepositorioPostulaciones,
  ) {}

  /** CU-45. */
  async ejecutar(
    usuario: UsuarioAutenticado,
  ): Promise<Resultado<vacantes.Postulacion[], ErrorCasoUso>> {
    if (usuario.rol !== 'talento') return fallo(PROHIBIDO);
    return ok(await this.postulaciones.delTalento(usuario.id));
  }
}

@Injectable()
export class PostulacionesDeVacante {
  constructor(
    @Inject(REPOSITORIO_POSTULACIONES) private readonly postulaciones: RepositorioPostulaciones,
  ) {}

  /** CU-44: solo la empresa dueña de la vacante ve su tablero. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    vacanteId: string,
  ): Promise<Resultado<vacantes.PostulacionRecibida[], ErrorCasoUso>> {
    if (usuario.rol !== 'empresa') return fallo(PROHIBIDO);
    const lista = await this.postulaciones.deLaVacante(vacanteId, usuario.id);
    return lista ? ok(lista) : fallo(NO_ENCONTRADO);
  }
}

@Injectable()
export class CambiarEstadoPostulacion {
  constructor(
    @Inject(REPOSITORIO_POSTULACIONES) private readonly postulaciones: RepositorioPostulaciones,
  ) {}

  /** CU-44 y CU-46: mover la postulación; descartar exige motivo. */
  async ejecutar(
    usuario: UsuarioAutenticado,
    id: string,
    entrada: vacantes.CambiarEstadoPostulacionEntrada,
  ): Promise<Resultado<vacantes.PostulacionRecibida, ErrorCasoUso>> {
    if (usuario.rol !== 'empresa') return fallo(PROHIBIDO);
    return traducir(await this.postulaciones.cambiarEstado(id, usuario.id, entrada, new Date()));
  }
}
