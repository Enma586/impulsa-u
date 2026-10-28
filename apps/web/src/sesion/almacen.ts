import { auth } from '@impulsau/contracts';

const CLAVE = 'impulsau.sesion';

function leer(): auth.Sesion | null {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo === null) return null;
    const sesion = auth.Sesion.safeParse(JSON.parse(crudo));
    return sesion.success ? sesion.data : null;
  } catch {
    return null;
  }
}

let actual: auth.Sesion | null = leer();
const oyentes = new Set<() => void>();

function notificar(): void {
  for (const oyente of oyentes) oyente();
}

/** Sesión del navegador: vive en `localStorage`, validada con el contrato al leerla. */
export const almacenSesion = {
  obtener: (): auth.Sesion | null => actual,

  guardar(sesion: auth.Sesion): void {
    actual = sesion;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(sesion));
    } catch {
      // Sin almacenamiento la sesión dura lo que dure la pestaña.
    }
    notificar();
  },

  limpiar(): void {
    actual = null;
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      // Nada que limpiar si el navegador no deja escribir.
    }
    notificar();
  },

  suscribir: (oyente: () => void): (() => void) => {
    oyentes.add(oyente);
    return () => {
      oyentes.delete(oyente);
    };
  },
};
