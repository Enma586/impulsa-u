import { style } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { areaTactilMinima, radios, tamanosTexto } from '../tema/escalas';
import { anilloFoco } from '../tema/foco';

const PUNTO_ESCRITORIO = '(min-width: 900px)';
const ALTO_BARRA_INFERIOR = '64px';
const ANCHO_RIEL = '220px';

export const marco = style({
  minHeight: '100vh',
  backgroundColor: tema.color.fondo,
  color: tema.color.texto,
});

export const barraSuperior = style({
  position: 'sticky',
  top: 0,
  zIndex: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  height: '60px',
  padding: '0 16px',
  borderBottom: `1px solid ${tema.color.borde}`,
  backgroundColor: tema.color.fondo,
});

export const marca = style({
  fontFamily: tema.fuente.display,
  fontSize: tamanosTexto[22],
  fontWeight: 800,
  color: tema.color.texto,
  textDecoration: 'none',
  letterSpacing: '-0.02em',
  selectors: { '&[data-focus-visible]': anilloFoco },
});

export const marcaPunto = style({ color: tema.color.acento.texto });

export const acciones = style({ display: 'flex', alignItems: 'center', gap: '12px' });

export const nombreUsuario = style({
  display: 'none',
  fontSize: tamanosTexto[14],
  color: tema.color.textoSecundario,
  '@media': { [PUNTO_ESCRITORIO]: { display: 'inline' } },
});

export const cuerpo = style({
  '@media': {
    [PUNTO_ESCRITORIO]: { display: 'grid', gridTemplateColumns: `${ANCHO_RIEL} 1fr` },
  },
});

export const navegacion = style({
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 20,
  height: ALTO_BARRA_INFERIOR,
  display: 'flex',
  borderTop: `1px solid ${tema.color.borde}`,
  backgroundColor: tema.color.fondo,
  '@media': {
    [PUNTO_ESCRITORIO]: {
      position: 'sticky',
      top: '60px',
      alignSelf: 'start',
      height: 'calc(100vh - 60px)',
      flexDirection: 'column',
      gap: '4px',
      padding: '16px 12px',
      borderTop: 'none',
      borderRight: `1px solid ${tema.color.borde}`,
    },
  },
});

export const enlace = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  minHeight: areaTactilMinima,
  fontSize: tamanosTexto[12],
  fontWeight: 600,
  color: tema.color.textoSecundario,
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: {
    '&[data-focus-visible]': anilloFoco,
    '&[data-current="true"]': { color: tema.color.acento.texto },
    '&[data-hovered]': { color: tema.color.texto },
  },
  '@media': {
    [PUNTO_ESCRITORIO]: {
      flex: 'none',
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: '12px',
      padding: '0 12px',
      fontSize: tamanosTexto[15],
      borderRadius: radios.control,
      selectors: { '&[data-current="true"]': { backgroundColor: tema.color.superficie } },
    },
  },
});

export const principal = style({
  minWidth: 0,
  padding: `24px 16px calc(${ALTO_BARRA_INFERIOR} + 24px)`,
  '@media': { [PUNTO_ESCRITORIO]: { padding: '32px 32px 48px' } },
});
