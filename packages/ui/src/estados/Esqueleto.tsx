import type { ReactNode } from 'react';
import * as estilos from './estados.css';

/** Región que carga datos: anuncia el estado a lectores de pantalla y marca `aria-busy`. */
export function Cargando({
  children,
  etiqueta = 'Cargando',
}: {
  children: ReactNode;
  etiqueta?: string;
}) {
  return (
    <div role="status" aria-busy="true">
      <span className={estilos.soloLectores}>{etiqueta}</span>
      {children}
    </div>
  );
}

/** Pieza decorativa del esqueleto; va dentro de `Cargando`. */
export function Esqueleto({
  forma = 'linea',
  ancho = 'completo',
}: {
  forma?: keyof typeof estilos.forma;
  ancho?: keyof typeof estilos.ancho;
}) {
  const claseAncho = forma === 'circulo' ? '' : estilos.ancho[ancho];
  return (
    <span
      className={[estilos.esqueleto, estilos.forma[forma], claseAncho].join(' ')}
      aria-hidden="true"
    />
  );
}
