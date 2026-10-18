import { useEffect, type ReactNode } from 'react';
import './global.css';
import { temaClaro } from './temaClaro.css';
import { temaOscuro } from './temaOscuro.css';

export type NombreTema = 'oscuro' | 'claro';

const clases: Record<NombreTema, string> = { oscuro: temaOscuro, claro: temaClaro };

/** Aplica la clase del tema a <html>, para que también cubra el fondo del body. */
export function ProveedorTema({
  tema = 'oscuro',
  children,
}: {
  tema?: NombreTema;
  children: ReactNode;
}) {
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.remove(temaOscuro, temaClaro);
    raiz.classList.add(clases[tema]);
    raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  }, [tema]);

  return <>{children}</>;
}
