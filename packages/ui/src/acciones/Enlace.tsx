import type { ReactNode } from 'react';
import { Link } from 'react-aria-components';
import * as estilos from './acciones.css';

/** Enlace de texto dentro de un párrafo o de una tarjeta. */
export function Enlace({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link className={estilos.enlaceTexto} href={href}>
      {children}
    </Link>
  );
}

/** Enlace con la apariencia de un botón: para navegar, no para ejecutar una acción. */
export function EnlaceBoton({
  href,
  children,
  variante = 'accion',
  tamano = 'normal',
}: {
  href: string;
  children: ReactNode;
  variante?: keyof typeof estilos.variante;
  tamano?: keyof typeof estilos.tamano;
}) {
  const clase = [estilos.boton, estilos.variante[variante], estilos.tamano[tamano]].join(' ');
  return (
    <Link className={`${clase} ${estilos.sinSubrayado}`} href={href}>
      {children}
    </Link>
  );
}
