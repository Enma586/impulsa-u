import { style, styleVariants } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { espaciado } from '../tema/escalas';

export const gap = styleVariants(espaciado, (valor) => ({ gap: valor }));

export const pila = style({ display: 'flex', flexDirection: 'column' });
export const fila = style({ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' });

export const alineacion = styleVariants({
  inicio: { alignItems: 'flex-start' },
  centro: { alignItems: 'center' },
  fin: { alignItems: 'flex-end' },
  estirar: { alignItems: 'stretch' },
});

export const justificacion = styleVariants({
  inicio: { justifyContent: 'flex-start' },
  centro: { justifyContent: 'center' },
  fin: { justifyContent: 'flex-end' },
  entre: { justifyContent: 'space-between' },
});

export const grilla = style({ display: 'grid' });

export const columnas = styleVariants({
  1: { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' },
  2: { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
  3: { gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' },
  4: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
});

export const contenedor = style({
  width: '100%',
  marginInline: 'auto',
  paddingInline: espaciado[16],
});

export const anchoContenedor = styleVariants({
  angosto: { maxWidth: '480px' },
  medio: { maxWidth: '760px' },
  ancho: { maxWidth: '1120px' },
});

export const separador = style({
  border: 0,
  backgroundColor: tema.color.borde,
  margin: 0,
  flexShrink: 0,
});

export const separadorHorizontal = style({ height: '1px', width: '100%' });
export const separadorVertical = style({ width: '1px', alignSelf: 'stretch' });
