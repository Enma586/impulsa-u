import type { ReactNode } from 'react';
import { ToggleButton } from 'react-aria-components';
import * as estilos from './acciones.css';

/** Botón con dos estados (por ejemplo, "me gusta"); anuncia `aria-pressed` a lectores de pantalla. */
export function BotonAlternar({
  seleccionado,
  onCambio,
  etiqueta,
  deshabilitado = false,
  children,
}: {
  seleccionado: boolean;
  onCambio: (seleccionado: boolean) => void;
  etiqueta: string;
  deshabilitado?: boolean;
  children: ReactNode;
}) {
  return (
    <ToggleButton
      className={estilos.alternar}
      isSelected={seleccionado}
      onChange={onCambio}
      isDisabled={deshabilitado}
      aria-label={etiqueta}
    >
      {children}
    </ToggleButton>
  );
}
