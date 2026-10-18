import { auth } from '@impulsau/contracts';
import type { FieldErrors, Resolver } from 'react-hook-form';
import '../../../configurarZod';

/** Lo que edita el formulario: los números llegan como texto desde los selectores. */
export interface ValoresRegistro {
  nombreCompleto: string;
  correo: string;
  contrasena: string;
  fechaNacimiento: string;
  estadoAcademico: 'estudiante' | 'egresado';
  ciclo: string;
  anioEgreso: string;
  declaracionSinExperiencia: boolean;
  aceptaTerminos: boolean;
}

export const valoresIniciales: ValoresRegistro = {
  nombreCompleto: '',
  correo: '',
  contrasena: '',
  fechaNacimiento: '',
  estadoAcademico: 'estudiante',
  ciclo: '',
  anioEgreso: '',
  declaracionSinExperiencia: false,
  aceptaTerminos: false,
};

export function esCampoRegistro(campo: string): campo is keyof ValoresRegistro {
  return Object.hasOwn(valoresIniciales, campo);
}

function aNumero(texto: string): number | undefined {
  return texto === '' ? undefined : Number(texto);
}

/** Arma el cuerpo que espera el contrato; el esquema del contrato es quien valida. */
export function aCandidato(v: ValoresRegistro): Record<string, unknown> {
  const comunes = {
    rol: 'talento',
    nombreCompleto: v.nombreCompleto,
    correo: v.correo,
    contrasena: v.contrasena,
    fechaNacimiento: v.fechaNacimiento,
    declaracionSinExperiencia: v.declaracionSinExperiencia,
    aceptaTerminos: v.aceptaTerminos,
    estadoAcademico: v.estadoAcademico,
  };
  switch (v.estadoAcademico) {
    case 'estudiante':
      return { ...comunes, ciclo: aNumero(v.ciclo) };
    case 'egresado':
      return { ...comunes, anioEgreso: aNumero(v.anioEgreso) };
  }
}

function estaVacio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === '';
}

export const resolverRegistro: Resolver<ValoresRegistro> = (valores) => {
  const candidato = aCandidato(valores);
  const resultado = auth.RegistrarTalentoEntrada.safeParse(candidato);
  if (resultado.success) return { values: valores, errors: {} };

  const errors: FieldErrors<ValoresRegistro> = {};
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0];
    if (typeof campo !== 'string' || !esCampoRegistro(campo) || campo in errors) continue;
    errors[campo] = {
      type: problema.code,
      message: estaVacio(candidato[campo]) ? 'Este campo es obligatorio' : problema.message,
    };
  }
  return { values: {}, errors };
};
