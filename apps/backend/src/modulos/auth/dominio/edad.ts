export const EDAD_MINIMA = 18;

/** Edad cumplida en `hoy` para una fecha de nacimiento `YYYY-MM-DD` (calendario UTC). */
export function calcularEdad(fechaNacimiento: string, hoy: Date): number {
  const [anio = 0, mes = 0, dia = 0] = fechaNacimiento.split('-').map(Number);
  const cumpleEsteAnio =
    hoy.getUTCMonth() + 1 > mes || (hoy.getUTCMonth() + 1 === mes && hoy.getUTCDate() >= dia);
  return hoy.getUTCFullYear() - anio - (cumpleEsteAnio ? 0 : 1);
}

export function esMayorDeEdad(fechaNacimiento: string, hoy: Date): boolean {
  return calcularEdad(fechaNacimiento, hoy) >= EDAD_MINIMA;
}
