import type { ReactNode } from 'react';
import type { Espacio } from '../tema/escalas';
import * as estilos from './layout.css';

type Alineacion = keyof typeof estilos.alineacion;
type Justificacion = keyof typeof estilos.justificacion;

interface PropsFlex {
  children: ReactNode;
  espacio?: Espacio;
  alinear?: Alineacion;
  justificar?: Justificacion;
}

function clasesFlex(
  base: string,
  { espacio = 8, alinear, justificar }: Omit<PropsFlex, 'children'>,
) {
  return [
    base,
    estilos.gap[espacio],
    alinear && estilos.alineacion[alinear],
    justificar && estilos.justificacion[justificar],
  ]
    .filter(Boolean)
    .join(' ');
}

export function Pila({ children, ...resto }: PropsFlex) {
  return <div className={clasesFlex(estilos.pila, resto)}>{children}</div>;
}

export function Fila({ children, ...resto }: PropsFlex) {
  return <div className={clasesFlex(estilos.fila, resto)}>{children}</div>;
}

export function Grilla({
  children,
  columnas = 1,
  espacio = 16,
}: {
  children: ReactNode;
  columnas?: keyof typeof estilos.columnas;
  espacio?: Espacio;
}) {
  return (
    <div className={[estilos.grilla, estilos.columnas[columnas], estilos.gap[espacio]].join(' ')}>
      {children}
    </div>
  );
}

export function Contenedor({
  children,
  ancho = 'ancho',
}: {
  children: ReactNode;
  ancho?: keyof typeof estilos.anchoContenedor;
}) {
  return (
    <div className={[estilos.contenedor, estilos.anchoContenedor[ancho]].join(' ')}>{children}</div>
  );
}

export function Separador({
  orientacion = 'horizontal',
}: {
  orientacion?: 'horizontal' | 'vertical';
}) {
  const orientada =
    orientacion === 'horizontal' ? estilos.separadorHorizontal : estilos.separadorVertical;
  return <hr className={[estilos.separador, orientada].join(' ')} aria-orientation={orientacion} />;
}
