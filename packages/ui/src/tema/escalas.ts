/** Escalas de las secciones 11.2 y 11.4. */
export const espaciado = {
  2: '2px',
  4: '4px',
  6: '6px',
  8: '8px',
  10: '10px',
  12: '12px',
  14: '14px',
  16: '16px',
  18: '18px',
  20: '20px',
  24: '24px',
  28: '28px',
  32: '32px',
  40: '40px',
  48: '48px',
} as const;

export const radios = {
  etiqueta: '4px',
  control: '8px',
  tarjeta: '12px',
  circulo: '999px',
} as const;

export const tamanosTexto = {
  10: '10px',
  11: '11px',
  12: '12px',
  13: '13px',
  14: '14px',
  15: '15px',
  16: '16px',
  18: '18px',
  22: '22px',
  28: '28px',
  34: '34px',
  40: '40px',
  56: '56px',
  64: '64px',
} as const;

export const areaTactilMinima = '44px';

export type Espacio = keyof typeof espaciado;
