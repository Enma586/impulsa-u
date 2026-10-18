import { style } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { areaTactilMinima, tamanosTexto } from '../tema/escalas';
import { anilloFoco } from '../tema/foco';

export const pestanas = style({ display: 'flex', flexDirection: 'column', gap: '16px' });

export const lista = style({
  display: 'flex',
  gap: '20px',
  overflowX: 'auto',
  overflowY: 'hidden',
  borderBottom: `1px solid ${tema.color.borde}`,
});

export const pestana = style({
  display: 'flex',
  alignItems: 'center',
  minHeight: areaTactilMinima,
  borderBottom: '2px solid transparent',
  color: tema.color.textoSecundario,
  fontFamily: tema.fuente.datos,
  fontSize: tamanosTexto[12],
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  outline: 'none',
  selectors: {
    '&[data-selected]': { color: tema.color.texto, borderBottomColor: tema.color.accion.fondo },
    '&[data-focus-visible]': anilloFoco,
  },
});

export const panel = style({
  outline: 'none',
  selectors: { '&[data-focus-visible]': anilloFoco },
});
