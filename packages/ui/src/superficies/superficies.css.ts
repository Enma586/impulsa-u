import { style, styleVariants } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { radios, tamanosTexto } from '../tema/escalas';

export const tarjeta = style({
  boxSizing: 'border-box',
  padding: '16px',
  borderRadius: radios.tarjeta,
  backgroundColor: tema.color.superficie,
  color: tema.color.texto,
});

export const nivel = styleVariants({
  base: {},
  elevada: { backgroundColor: tema.color.superficieElevada },
});

/** Esquina cortada arriba a la derecha (36 px grandes, 22 px pequeñas). */
export const corte = styleVariants({
  ninguno: {},
  grande: {
    clipPath: 'polygon(0 0, calc(100% - 36px) 0, 100% 36px, 100% 100%, 0 100%)',
    borderRadius: 0,
  },
  pequeno: {
    clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)',
    borderRadius: 0,
  },
});

export const velo = style({
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  backgroundColor: `color-mix(in srgb, ${tema.color.fondo} 70%, transparent)`,
});

export const modal = style({
  width: '100%',
  maxWidth: '480px',
  maxHeight: '100%',
  overflow: 'auto',
  border: `1px solid ${tema.color.borde}`,
  borderRadius: radios.tarjeta,
  backgroundColor: tema.color.superficieElevada,
  color: tema.color.texto,
  fontFamily: tema.fuente.texto,
});

export const dialogo = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  padding: '24px',
  outline: 'none',
});

export const tituloModal = style({
  margin: 0,
  paddingRight: '44px',
  fontFamily: tema.fuente.display,
  fontSize: tamanosTexto[22],
  fontWeight: 700,
});

export const cerrar = style({ position: 'absolute', top: '12px', right: '12px' });

export const acciones = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  justifyContent: 'flex-end',
});
