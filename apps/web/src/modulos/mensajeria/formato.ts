const hora = new Intl.DateTimeFormat('es-SV', { hour: '2-digit', minute: '2-digit' });
const dia = new Intl.DateTimeFormat('es-SV', { day: 'numeric', month: 'short' });
const diaLargo = new Intl.DateTimeFormat('es-SV', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const clave = (fecha: Date) =>
  `${String(fecha.getFullYear())}-${String(fecha.getMonth())}-${String(fecha.getDate())}`;

export function esMismoDia(a: string, b: string): boolean {
  return clave(new Date(a)) === clave(new Date(b));
}

export function horaCorta(iso: string): string {
  return hora.format(new Date(iso));
}

/** En la lista: la hora si fue hoy y el día si fue antes. */
export function horaOFecha(iso: string): string {
  const fecha = new Date(iso);
  return clave(fecha) === clave(new Date()) ? hora.format(fecha) : dia.format(fecha);
}

export function etiquetaDia(iso: string): string {
  const fecha = new Date(iso);
  const hoy = new Date();
  if (clave(fecha) === clave(hoy)) return 'Hoy';
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  return clave(fecha) === clave(ayer) ? 'Ayer' : diaLargo.format(fecha);
}
