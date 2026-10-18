import { globalStyle } from '@vanilla-extract/css';
import { tema } from './contrato.css';
import { tamanosTexto } from './escalas';

globalStyle('*, *::before, *::after', { boxSizing: 'border-box' });

globalStyle('body', {
  margin: 0,
  backgroundColor: tema.color.fondo,
  color: tema.color.texto,
  fontFamily: tema.fuente.texto,
  fontSize: tamanosTexto[15],
  lineHeight: 1.5,
});

globalStyle('h1, h2, h3', { fontFamily: tema.fuente.display, lineHeight: 1.15, margin: 0 });

globalStyle('a', { color: tema.color.enlace });

globalStyle(':focus-visible', { outline: `2px solid ${tema.color.foco}`, outlineOffset: '2px' });

globalStyle('::selection', {
  backgroundColor: tema.color.accion.fondo,
  color: tema.color.accion.texto,
});

globalStyle('*', {
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none' } },
});
