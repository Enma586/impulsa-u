import type { auth } from '@impulsau/contracts';
import type { UsuarioAutenticado } from '../../../compartido/dominio/autenticacion.js';

export const REPOSITORIO_USUARIOS = Symbol('RepositorioUsuarios');

export interface NuevoTalento {
  id: string;
  correo: string;
  nombreCompleto: string;
  fechaNacimiento: string;
  estadoAcademico: 'estudiante' | 'egresado';
  ciclo: number | null;
  anioEgreso: number | null;
  declaracionSinExperienciaEn: Date;
}

export interface NuevaEmpresa {
  id: string;
  correo: string;
  nombreComercial: string;
  esAgencia: boolean;
  clienteDeclarado: string | null;
}

export interface RepositorioUsuarios {
  /** Crea `usuarios` y `talentos` en una sola transacción; `ya_existia` si el perfil ya estaba. */
  crearTalento(talento: NuevoTalento): Promise<'creado' | 'ya_existia'>;
  /** Crea `usuarios` y `empresas` en una sola transacción; `ya_existia` si el perfil ya estaba. */
  crearEmpresa(empresa: NuevaEmpresa): Promise<'creado' | 'ya_existia'>;
  buscarPorId(id: string): Promise<UsuarioAutenticado | null>;
  /** Datos que el cliente necesita tras autenticarse (correo, nombre del perfil). */
  resumenSesion(id: string): Promise<auth.UsuarioSesion | null>;
  /** Pasa de `pendiente_verificacion` a `activo` cuando Auth confirmó el correo. */
  activar(id: string): Promise<void>;
}
