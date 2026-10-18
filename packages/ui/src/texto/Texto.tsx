import type { ReactNode } from 'react';
import * as estilos from './texto.css';

type Color = keyof typeof estilos.colorTexto;

export function Titulo({
  nivel = 2,
  tamano = 'medio',
  children,
}: {
  nivel?: 1 | 2 | 3;
  tamano?: keyof typeof estilos.tamanoTitulo;
  children: ReactNode;
}) {
  const clase = [estilos.titulo, estilos.tamanoTitulo[tamano]].join(' ');
  switch (nivel) {
    case 1:
      return <h1 className={clase}>{children}</h1>;
    case 2:
      return <h2 className={clase}>{children}</h2>;
    case 3:
      return <h3 className={clase}>{children}</h3>;
  }
}

export function Texto({
  tamano = 'normal',
  color = 'principal',
  children,
}: {
  tamano?: keyof typeof estilos.tamanoTexto;
  color?: Color;
  children: ReactNode;
}) {
  const clase = [estilos.texto, estilos.tamanoTexto[tamano], estilos.colorTexto[color]].join(' ');
  return <p className={clase}>{children}</p>;
}

/** Texto monoespaciado en mayúsculas: etiquetas, metadatos, estados. */
export function Dato({ color = 'secundario', children }: { color?: Color; children: ReactNode }) {
  return <span className={[estilos.dato, estilos.colorTexto[color]].join(' ')}>{children}</span>;
}
