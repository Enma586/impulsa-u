import type { ReactNode } from 'react';
import * as estilos from './datos.css';

export function Insignia({
  tono = 'neutro',
  children,
}: {
  tono?: keyof typeof estilos.tono;
  children: ReactNode;
}) {
  return <span className={[estilos.insignia, estilos.tono[tono]].join(' ')}>{children}</span>;
}
