import type { ReactNode } from 'react';
import { Link, RouterProvider } from 'react-aria-components';
import * as estilos from './app.css';

/** Conecta los enlaces de `packages/ui` con el enrutador de la app sin que `ui` lo conozca. */
export function ProveedorNavegacion({
  navegar,
  children,
}: {
  navegar: (destino: string) => void;
  children: ReactNode;
}) {
  return <RouterProvider navigate={navegar}>{children}</RouterProvider>;
}

export interface EnlaceNavegacion {
  href: string;
  etiqueta: string;
  icono: ReactNode;
  activo: boolean;
}

/**
 * Estructura de las pantallas autenticadas: barra superior, riel lateral en escritorio y barra
 * inferior en celular (sección 11 de la especificación).
 */
export function MarcoApp({
  enlaces,
  nombreUsuario,
  acciones,
  children,
}: {
  enlaces: readonly EnlaceNavegacion[];
  nombreUsuario: string;
  acciones: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={estilos.marco}>
      <header className={estilos.barraSuperior}>
        <Link className={estilos.marca} href="/" aria-label="ImpulsaU, ir al inicio">
          Impulsa<span className={estilos.marcaPunto}>U</span>
        </Link>
        <div className={estilos.acciones}>
          <span className={estilos.nombreUsuario}>{nombreUsuario}</span>
          {acciones}
        </div>
      </header>
      <div className={estilos.cuerpo}>
        <nav className={estilos.navegacion} aria-label="Principal">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              className={estilos.enlace}
              href={enlace.href}
              data-current={enlace.activo}
              aria-current={enlace.activo ? 'page' : false}
            >
              {enlace.icono}
              {enlace.etiqueta}
            </Link>
          ))}
        </nav>
        <main className={estilos.principal}>{children}</main>
      </div>
    </div>
  );
}
