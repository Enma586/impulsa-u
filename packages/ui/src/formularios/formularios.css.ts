import { style } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { areaTactilMinima, radios, tamanosTexto } from '../tema/escalas';
import { anilloFoco } from '../tema/foco';

export const grupo = style({ display: 'flex', flexDirection: 'column', gap: '8px' });

export const etiqueta = style({
  fontSize: tamanosTexto[14],
  fontWeight: 600,
  color: tema.color.texto,
});

export const ayuda = style({ fontSize: tamanosTexto[13], color: tema.color.textoSecundario });

export const error = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: tamanosTexto[13],
  color: tema.color.error.texto,
});

export const caja = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  height: '48px',
  padding: '0 14px',
  border: `1px solid ${tema.color.borde}`,
  borderRadius: radios.control,
  backgroundColor: tema.color.superficie,
  selectors: {
    '&:focus-within': { borderColor: tema.color.foco },
    '[data-invalid] &': { borderColor: tema.color.error.texto },
  },
});

export const cajaConAccion = style({ paddingRight: '6px' });

export const entrada = style({
  flexGrow: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: tema.color.texto,
  fontFamily: 'inherit',
  fontSize: tamanosTexto[15],
  '::placeholder': { color: tema.color.textoSecundario },
});

export const boton = style({
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: radios.control,
  background: 'transparent',
  color: tema.color.textoSecundario,
  cursor: 'pointer',
  selectors: { '&[data-focus-visible]': anilloFoco },
});

export const selector = style([
  caja,
  {
    width: '100%',
    justifyContent: 'space-between',
    fontFamily: 'inherit',
    fontSize: tamanosTexto[15],
    color: tema.color.texto,
    cursor: 'pointer',
    selectors: { '&[data-focus-visible]': anilloFoco },
  },
]);

export const ventana = style({
  minWidth: 'var(--trigger-width)',
  padding: '4px',
  border: `1px solid ${tema.color.borde}`,
  borderRadius: radios.control,
  backgroundColor: tema.color.superficieElevada,
  color: tema.color.texto,
  fontFamily: tema.fuente.texto,
});

export const lista = style({ outline: 'none', maxHeight: '260px', overflow: 'auto' });

export const opcion = style({
  display: 'flex',
  alignItems: 'center',
  minHeight: areaTactilMinima,
  padding: '0 12px',
  borderRadius: radios.etiqueta,
  fontSize: tamanosTexto[15],
  cursor: 'pointer',
  outline: 'none',
  selectors: {
    '&[data-focused]': { backgroundColor: tema.color.superficie },
    '&[data-selected]': { fontWeight: 700, color: tema.color.acento.texto },
  },
});

export const casilla = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  cursor: 'pointer',
  fontSize: tamanosTexto[15],
  lineHeight: 1.45,
  color: tema.color.texto,
  selectors: { '&[data-disabled]': { opacity: 0.5, cursor: 'not-allowed' } },
});

export const marca = style({
  width: '22px',
  height: '22px',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `2px solid ${tema.color.textoSecundario}`,
  borderRadius: radios.etiqueta,
  color: 'transparent',
  selectors: {
    [`${casilla}[data-selected] &`]: {
      backgroundColor: tema.color.accion.fondo,
      borderColor: tema.color.accion.fondo,
      color: tema.color.accion.texto,
    },
    [`${casilla}[data-invalid] &`]: { borderColor: tema.color.error.texto },
    [`${casilla}[data-focus-visible] &`]: anilloFoco,
  },
});

export const segmentado = style({
  display: 'flex',
  gap: '4px',
  padding: '4px',
  border: `1px solid ${tema.color.borde}`,
  borderRadius: radios.control,
  backgroundColor: tema.color.superficie,
});

export const campoSegmento = style({ flex: '1 1 0', display: 'flex' });

export const segmento = style({
  flex: '1 1 0',
  minHeight: areaTactilMinima,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: radios.etiqueta,
  color: tema.color.textoSecundario,
  fontSize: tamanosTexto[15],
  fontWeight: 500,
  cursor: 'pointer',
  selectors: {
    '&[data-selected]': {
      backgroundColor: tema.color.superficieElevada,
      color: tema.color.texto,
      fontWeight: 700,
    },
    '&[data-focus-visible]': anilloFoco,
  },
});

export const areaTexto = style({
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '120px',
  padding: '12px 14px',
  border: `1px solid ${tema.color.borde}`,
  borderRadius: radios.control,
  backgroundColor: tema.color.superficie,
  color: tema.color.texto,
  fontFamily: 'inherit',
  fontSize: tamanosTexto[15],
  lineHeight: 1.5,
  resize: 'vertical',
  outline: 'none',
  selectors: {
    '&[data-focused]': { borderColor: tema.color.foco },
    '&[data-invalid]': { borderColor: tema.color.error.texto },
  },
});

export const fichas = style({ display: 'flex', flexWrap: 'wrap', gap: '8px' });

export const ficha = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  minHeight: areaTactilMinima,
  padding: '0 14px',
  border: `1px solid ${tema.color.borde}`,
  borderRadius: radios.circulo,
  backgroundColor: tema.color.superficie,
  color: tema.color.texto,
  fontFamily: 'inherit',
  fontSize: tamanosTexto[14],
  cursor: 'pointer',
  selectors: {
    '&[data-focus-visible]': anilloFoco,
    '&[data-selected]': {
      backgroundColor: tema.color.logro.fondo,
      color: tema.color.logro.texto,
      borderColor: tema.color.logro.texto,
    },
  },
});
