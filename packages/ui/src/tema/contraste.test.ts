import { describe, expect, it } from 'vitest';
import { valoresClaro, valoresOscuro } from './valores';

type Rgb = [number, number, number];

/** Convierte #RRGGBB o rgba(r,g,b,a) y lo compone sobre el fondo dado. */
function aRgb(color: string, sobre: Rgb): Rgb {
  if (color.startsWith('#')) {
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    return [r, g, b];
  }
  const [r = 0, g = 0, b = 0, a = 1] = color.match(/[\d.]+/g)?.map(Number) ?? [];
  const mezclar = (canal: number, fondo: number) => canal * a + fondo * (1 - a);
  return [mezclar(r, sobre[0]), mezclar(g, sobre[1]), mezclar(b, sobre[2])];
}

function luminancia(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contraste(texto: string, fondo: string, base: Rgb): number {
  const fondoRgb = aRgb(fondo, base);
  const [a, b] = [luminancia(aRgb(texto, fondoRgb)), luminancia(fondoRgb)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe.each([
  ['oscuro', valoresOscuro],
  ['claro', valoresClaro],
] as const)('contraste AA del tema %s', (_nombre, v) => {
  const base = aRgb(v.fondo, [0, 0, 0]);
  const textos: [string, string, string][] = [
    ['texto/fondo', v.texto, v.fondo],
    ['texto/superficie', v.texto, v.superficie],
    ['texto/superficieElevada', v.texto, v.superficieElevada],
    ['textoSecundario/fondo', v.textoSecundario, v.fondo],
    ['textoSecundario/superficie', v.textoSecundario, v.superficie],
    ['accion.texto/accion.fondo', v.accion.texto, v.accion.fondo],
    ['acento.texto/fondo', v.acento.texto, v.fondo],
    ['enlace/fondo', v.enlace, v.fondo],
    ['aval/fondo', v.aval, v.fondo],
    ['logro', v.logro.texto, v.logro.fondo],
    ['advertencia', v.advertencia.texto, v.advertencia.fondo],
    ['error', v.error.texto, v.error.fondo],
  ];

  it.each(textos)('%s alcanza 4.5:1', (_par, texto, fondo) => {
    expect(contraste(texto, fondo, base)).toBeGreaterThanOrEqual(4.5);
  });

  it('el foco alcanza 3:1 sobre el fondo', () => {
    expect(contraste(v.foco, v.fondo, base)).toBeGreaterThanOrEqual(3);
  });
});
