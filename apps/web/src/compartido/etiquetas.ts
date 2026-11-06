import type { Departamento, vacantes } from '@impulsau/contracts';

export const nombresDepartamento: Record<Departamento, string> = {
  ahuachapan: 'Ahuachapán',
  santa_ana: 'Santa Ana',
  sonsonate: 'Sonsonate',
  chalatenango: 'Chalatenango',
  la_libertad: 'La Libertad',
  san_salvador: 'San Salvador',
  cuscatlan: 'Cuscatlán',
  la_paz: 'La Paz',
  cabanas: 'Cabañas',
  san_vicente: 'San Vicente',
  usulutan: 'Usulután',
  san_miguel: 'San Miguel',
  morazan: 'Morazán',
  la_union: 'La Unión',
};

export const opcionesDepartamento = Object.entries(nombresDepartamento).map(
  ([valor, etiqueta]) => ({ valor, etiqueta }),
);

export const nombresTipoVacante: Record<vacantes.TipoVacante, string> = {
  pasantia: 'Pasantía',
  primer_empleo: 'Primer empleo',
  trainee: 'Trainee',
};

export const nombresModalidad: Record<vacantes.ModalidadVacante, string> = {
  presencial: 'Presencial',
  hibrida: 'Híbrida',
  remota: 'Remota',
};

export const nombresEstadoVacante: Record<vacantes.EstadoVacante, string> = {
  borrador: 'Borrador',
  abierta: 'Abierta',
  pausada: 'Pausada',
  cerrada: 'Cerrada',
};

export const nombresEstadoPostulacion: Record<vacantes.EstadoPostulacion, string> = {
  recibida: 'Recibida',
  en_revision: 'En revisión',
  entrevista: 'Entrevista',
  seleccionada: 'Seleccionada',
  descartada: 'Descartada',
};

export const nombresMotivoDescarte: Record<vacantes.MotivoDescarte, string> = {
  falta_habilidad_tecnica: 'Falta una habilidad técnica',
  perfil_incompleto: 'Perfil incompleto',
  otro_candidato: 'Eligieron a otra persona',
  vacante_cerrada: 'La vacante se cerró',
  otro: 'Otro motivo',
};

export function aOpciones<T extends string>(nombres: Record<T, string>) {
  return Object.entries<string>(nombres).map(([valor, etiqueta]) => ({ valor, etiqueta }));
}

const formatoFecha = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' });

export function fechaLegible(iso: string | null): string {
  return iso === null ? '' : formatoFecha.format(new Date(iso));
}
