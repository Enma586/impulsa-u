import { createThemeContract } from '@vanilla-extract/css';

export const tema = createThemeContract({
  color: {
    fondo: null,
    superficie: null,
    superficieElevada: null,
    borde: null,
    texto: null,
    textoSecundario: null,
    enlace: null,
    foco: null,
    aval: null,
    accion: { fondo: null, texto: null },
    acento: { texto: null },
    logro: { fondo: null, texto: null },
    advertencia: { fondo: null, texto: null },
    error: { fondo: null, texto: null },
  },
  fuente: { display: null, texto: null, datos: null },
});
