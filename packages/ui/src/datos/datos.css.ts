import { style, styleVariants } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { radios, tamanosTexto } from '../tema/escalas';

export const insignia = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 8px',
  border: '1px solid transparent',
  borderRadius: radios.etiqueta,
  fontFamily: tema.fuente.datos,
  fontSize: tamanosTexto[11],
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});

export const tono = styleVariants({
  neutro: {
    backgroundColor: tema.color.superficieElevada,
    color: tema.color.textoSecundario,
  },
  logro: { backgroundColor: tema.color.logro.fondo, color: tema.color.logro.texto },
  falta: {
    backgroundColor: tema.color.advertencia.fondo,
    color: tema.color.advertencia.texto,
  },
  aval: { borderColor: tema.color.aval, color: tema.color.aval },
});

export const avatar = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  overflow: 'hidden',
  borderRadius: radios.circulo,
  backgroundColor: tema.color.superficieElevada,
  color: tema.color.texto,
  fontFamily: tema.fuente.display,
  fontWeight: 700,
});

export const tamanoAvatar = styleVariants({
  pequeno: { width: '28px', height: '28px', fontSize: tamanosTexto[11] },
  medio: { width: '44px', height: '44px', fontSize: tamanosTexto[16] },
  grande: { width: '96px', height: '96px', fontSize: tamanosTexto[34] },
});

export const imagenAvatar = style({ width: '100%', height: '100%', objectFit: 'cover' });

export const marcoImagen = style({
  overflow: 'hidden',
  borderRadius: radios.control,
  backgroundColor: tema.color.superficieElevada,
});

export const proporcion = styleVariants({
  panoramica: { aspectRatio: '16 / 9' },
  cuadrada: { aspectRatio: '1 / 1' },
});

export const imagen = style({
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});
