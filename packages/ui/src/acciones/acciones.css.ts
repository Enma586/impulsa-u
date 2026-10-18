import { keyframes, style, styleVariants } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { areaTactilMinima, radios, tamanosTexto } from '../tema/escalas';
import { anilloFoco } from '../tema/foco';

export const boton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  minHeight: areaTactilMinima,
  padding: '0 18px',
  border: '1px solid transparent',
  borderRadius: radios.control,
  fontFamily: tema.fuente.texto,
  fontSize: tamanosTexto[15],
  fontWeight: 700,
  cursor: 'pointer',
  selectors: {
    '&[data-focus-visible]': anilloFoco,
    '&[data-disabled]': { opacity: 0.5, cursor: 'not-allowed' },
    '&[data-pending]': { cursor: 'progress' },
  },
});

export const variante = styleVariants({
  accion: { backgroundColor: tema.color.accion.fondo, color: tema.color.accion.texto },
  secundario: {
    backgroundColor: tema.color.superficie,
    color: tema.color.texto,
    borderColor: tema.color.borde,
  },
  fantasma: { backgroundColor: 'transparent', color: tema.color.texto },
  advertencia: {
    backgroundColor: tema.color.advertencia.fondo,
    color: tema.color.advertencia.texto,
    borderColor: tema.color.advertencia.texto,
  },
});

export const tamano = styleVariants({
  normal: {},
  grande: { minHeight: '52px', fontSize: tamanosTexto[16] },
});

export const anchoCompleto = style({ width: '100%' });

export const botonIcono = style([
  boton,
  {
    width: areaTactilMinima,
    padding: 0,
    backgroundColor: 'transparent',
    color: tema.color.textoSecundario,
  },
]);

const rotar = keyframes({ to: { transform: 'rotate(360deg)' } });

export const giro = style({
  width: '14px',
  height: '14px',
  border: '2px solid currentColor',
  borderTopColor: 'transparent',
  borderRadius: radios.circulo,
  animation: `${rotar} 0.8s linear infinite`,
});
