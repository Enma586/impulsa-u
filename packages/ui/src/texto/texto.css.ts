import { style, styleVariants } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { tamanosTexto } from '../tema/escalas';

export const titulo = style({ fontWeight: 700, letterSpacing: '-0.03em', color: tema.color.texto });

export const tamanoTitulo = styleVariants({
  pequeno: { fontSize: tamanosTexto[22] },
  medio: { fontSize: tamanosTexto[34], lineHeight: 1.05 },
  grande: { fontSize: tamanosTexto[56], lineHeight: 0.98 },
});

export const texto = style({ margin: 0, fontFamily: tema.fuente.texto, lineHeight: 1.45 });

export const tamanoTexto = styleVariants({
  pequeno: { fontSize: tamanosTexto[13] },
  normal: { fontSize: tamanosTexto[15] },
  grande: { fontSize: tamanosTexto[18] },
});

export const colorTexto = styleVariants({
  principal: { color: tema.color.texto },
  secundario: { color: tema.color.textoSecundario },
  acento: { color: tema.color.acento.texto },
});

export const dato = style({
  fontFamily: tema.fuente.datos,
  fontSize: tamanosTexto[11],
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
});
