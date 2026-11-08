import { style, styleVariants } from '@vanilla-extract/css';
import { tema } from '../tema/contrato.css';
import { areaTactilMinima, radios, tamanosTexto } from '../tema/escalas';
import { anilloFoco } from '../tema/foco';

const PUNTO_DOS_PANELES = '(min-width: 900px)';

/** Lista y detalle lado a lado en pantallas anchas; en celular se ve uno a la vez. */
export const panel = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  height: 'calc(100dvh - 190px)',
  minHeight: '420px',
  border: `1px solid ${tema.color.borde}`,
  borderRadius: radios.tarjeta,
  backgroundColor: tema.color.superficie,
  overflow: 'hidden',
  '@media': { [PUNTO_DOS_PANELES]: { gridTemplateColumns: '340px minmax(0, 1fr)' } },
});

export const panelLista = style({
  minWidth: 0,
  minHeight: 0,
  overflowY: 'auto',
  borderRight: `1px solid ${tema.color.borde}`,
  selectors: { '[data-detalle="true"] &': { display: 'none' } },
  '@media': {
    [PUNTO_DOS_PANELES]: {
      selectors: { '[data-detalle="true"] &': { display: 'block' } },
    },
  },
});

export const panelDetalle = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
  selectors: { '[data-detalle="false"] &': { display: 'none' } },
  '@media': {
    [PUNTO_DOS_PANELES]: {
      selectors: { '[data-detalle="false"] &': { display: 'flex' } },
    },
  },
});

export const itemConversacion = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  minHeight: areaTactilMinima,
  padding: '12px 16px',
  borderBottom: `1px solid ${tema.color.borde}`,
  borderLeft: '3px solid transparent',
  color: tema.color.texto,
  fontFamily: tema.fuente.texto,
  textDecoration: 'none',
  cursor: 'pointer',
  selectors: {
    '&[data-hovered]': { backgroundColor: tema.color.superficieElevada },
    '&[data-current="true"]': {
      backgroundColor: tema.color.superficieElevada,
      borderLeftColor: tema.color.accion.fondo,
    },
    '&[data-focus-visible]': { ...anilloFoco, outlineOffset: '-2px' },
  },
});

export const itemCuerpo = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  flex: 1,
  minWidth: 0,
});

export const itemFila = style({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: '8px',
});

export const itemNombre = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: tamanosTexto[15],
  fontWeight: 600,
});

export const itemHora = style({
  flexShrink: 0,
  fontFamily: tema.fuente.datos,
  fontSize: tamanosTexto[11],
  color: tema.color.textoSecundario,
});

export const itemVista = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: tamanosTexto[13],
  color: tema.color.textoSecundario,
});

export const itemSinLeer = style({ fontWeight: 700, color: tema.color.texto });

export const contadorSinLeer = style({
  flexShrink: 0,
  minWidth: '22px',
  padding: '2px 7px',
  borderRadius: radios.circulo,
  backgroundColor: tema.color.accion.fondo,
  color: tema.color.accion.texto,
  fontFamily: tema.fuente.datos,
  fontSize: tamanosTexto[11],
  fontWeight: 700,
  textAlign: 'center',
});

export const hilo = style({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: '16px',
  overscrollBehavior: 'contain',
});

export const listaMensajes = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  margin: 0,
  padding: 0,
  listStyle: 'none',
});

export const mensaje = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  maxWidth: '78%',
  selectors: { '&[data-propio="true"]': { alignSelf: 'flex-end', alignItems: 'flex-end' } },
});

export const burbuja = style({
  padding: '8px 12px',
  borderRadius: radios.tarjeta,
  fontSize: tamanosTexto[15],
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
});

export const burbujaTono = styleVariants({
  ajeno: { backgroundColor: tema.color.superficieElevada, color: tema.color.texto },
  propio: { backgroundColor: tema.color.accion.fondo, color: tema.color.accion.texto },
});

export const pieMensaje = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontFamily: tema.fuente.datos,
  fontSize: tamanosTexto[11],
  color: tema.color.textoSecundario,
});

export const pieError = style({ color: tema.color.error.texto, fontWeight: 700 });

export const separadorDia = style({
  alignSelf: 'center',
  margin: '8px 0',
  padding: '2px 10px',
  borderRadius: radios.circulo,
  backgroundColor: tema.color.superficieElevada,
  fontFamily: tema.fuente.datos,
  fontSize: tamanosTexto[11],
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: tema.color.textoSecundario,
});

export const cargarAnteriores = style({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: '12px',
});

export const composer = style({
  display: 'flex',
  alignItems: 'flex-end',
  gap: '8px',
  padding: '12px 16px',
  borderTop: `1px solid ${tema.color.borde}`,
});

export const composerCampo = style({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: '4px',
  minWidth: 0,
});

export const composerTexto = style({
  boxSizing: 'border-box',
  width: '100%',
  minHeight: '44px',
  maxHeight: '160px',
  padding: '10px 14px',
  border: `1px solid ${tema.color.borde}`,
  borderRadius: radios.control,
  backgroundColor: tema.color.superficie,
  color: tema.color.texto,
  fontFamily: tema.fuente.texto,
  fontSize: tamanosTexto[15],
  lineHeight: 1.4,
  resize: 'none',
  fieldSizing: 'content',
  selectors: {
    '&[data-focused]': { borderColor: tema.color.foco },
    '&[data-disabled]': { opacity: 0.6 },
  },
});

export const contadorCaracteres = style({
  alignSelf: 'flex-end',
  fontFamily: tema.fuente.datos,
  fontSize: tamanosTexto[11],
  color: tema.color.textoSecundario,
  selectors: { '&[data-excedido="true"]': { color: tema.color.error.texto, fontWeight: 700 } },
});

export const escribiendo = style({
  minHeight: '20px',
  padding: '0 16px 4px',
  fontSize: tamanosTexto[13],
  fontStyle: 'italic',
  color: tema.color.textoSecundario,
});

export const avisoConexion = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 16px',
  fontSize: tamanosTexto[13],
  fontWeight: 600,
});

export const avisoConexionTono = styleVariants({
  advertencia: {
    backgroundColor: tema.color.advertencia.fondo,
    color: tema.color.advertencia.texto,
  },
  error: { backgroundColor: tema.color.error.fondo, color: tema.color.error.texto },
});

export const encabezado = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  minHeight: '64px',
  padding: '8px 16px',
  borderBottom: `1px solid ${tema.color.borde}`,
});

export const encabezadoTexto = style({ flex: 1, minWidth: 0 });

export const vacio = style({
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  textAlign: 'center',
  color: tema.color.textoSecundario,
});
