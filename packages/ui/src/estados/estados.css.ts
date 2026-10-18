import { keyframes, style, styleVariants } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { radios, tamanosTexto } from '../tema/escalas';

const pulso = keyframes({ '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } });

export const esqueleto = style({
  display: 'block',
  backgroundColor: tema.color.superficieElevada,
  animation: `${pulso} 1.4s ease-in-out infinite`,
});

export const forma = styleVariants({
  linea: { height: '10px', borderRadius: radios.circulo },
  titulo: { height: '24px', borderRadius: radios.control },
  bloque: { height: '160px', borderRadius: radios.tarjeta },
  circulo: { width: '44px', height: '44px', borderRadius: radios.circulo },
});

export const ancho = styleVariants({
  completo: { width: '100%' },
  tresCuartos: { width: '75%' },
  mitad: { width: '50%' },
  corto: { width: '25%' },
});

export const soloLectores = style({
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
});

export const aviso = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  padding: '12px 14px',
  border: `1px solid ${tema.color.error.texto}`,
  borderRadius: radios.control,
  backgroundColor: tema.color.error.fondo,
  color: tema.color.error.texto,
  fontSize: tamanosTexto[14],
  lineHeight: 1.4,
});

export const avisoTitulo = style({ margin: 0, fontWeight: 700 });
export const avisoMensaje = style({ margin: 0 });
