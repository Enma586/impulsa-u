/** Valores de la tabla 11.3 de la especificación. Los usan los temas y la prueba de contraste. */
export const valoresOscuro = {
  fondo: '#0A0A0A',
  superficie: '#151515',
  superficieElevada: '#1F1F1F',
  borde: '#2B2B2B',
  texto: '#F5F5F5',
  textoSecundario: '#A3A3A3',
  enlace: '#7BE5B4',
  foco: '#7BE5B4',
  aval: '#B09FDC',
  accion: { fondo: '#3DDC97', texto: '#0F2A1F' },
  acento: { texto: '#7BE5B4' },
  logro: { fondo: 'rgba(61,220,151,0.14)', texto: '#7BE5B4' },
  advertencia: { fondo: 'rgba(255,196,107,0.14)', texto: '#FFC46B' },
  error: { fondo: 'rgba(255,143,133,0.14)', texto: '#FF8F85' },
} as const;

export const valoresClaro = {
  fondo: '#FFFFFF',
  superficie: '#F4F4F4',
  superficieElevada: '#EAEAEA',
  borde: '#DEDEDE',
  texto: '#0A0A0A',
  textoSecundario: '#5C5C5C',
  enlace: '#0D7A4F',
  foco: '#0D7A4F',
  aval: '#5B3FB0',
  accion: { fondo: '#3DDC97', texto: '#0F2A1F' },
  acento: { texto: '#0D7A4F' },
  logro: { fondo: '#D8F7E8', texto: '#0D7A4F' },
  advertencia: { fondo: '#FFF1D6', texto: '#8A5300' },
  error: { fondo: '#FBE9E7', texto: '#B42318' },
} as const;

export const familias = {
  display: "'Bricolage Grotesque', system-ui, sans-serif",
  texto: "'Figtree', system-ui, sans-serif",
  datos: "'JetBrains Mono', ui-monospace, monospace",
} as const;
