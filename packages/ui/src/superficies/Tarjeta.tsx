import type { ReactNode } from 'react';
import * as estilos from './superficies.css';

export function Tarjeta({
  children,
  corte = 'ninguno',
  elevada = false,
}: {
  children: ReactNode;
  corte?: keyof typeof estilos.corte;
  elevada?: boolean;
}) {
  const clase = [
    estilos.tarjeta,
    estilos.nivel[elevada ? 'elevada' : 'base'],
    estilos.corte[corte],
  ].join(' ');
  return <div className={clase}>{children}</div>;
}
