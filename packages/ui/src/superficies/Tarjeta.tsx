import type { ReactNode } from 'react';
import * as estilos from './superficies.css';

export function Tarjeta({
  children,
  corte = 'ninguno',
  elevada = false,
  relleno = 'normal',
}: {
  children: ReactNode;
  corte?: keyof typeof estilos.corte;
  elevada?: boolean;
  relleno?: keyof typeof estilos.relleno;
}) {
  const clase = [
    estilos.tarjeta,
    estilos.nivel[elevada ? 'elevada' : 'base'],
    estilos.corte[corte],
    estilos.relleno[relleno],
  ].join(' ');
  return <div className={clase}>{children}</div>;
}
