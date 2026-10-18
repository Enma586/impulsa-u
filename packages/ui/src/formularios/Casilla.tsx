import type { ReactNode } from 'react';
import { CheckboxButton, CheckboxField, FieldError } from 'react-aria-components';
import { IconoAlerta, IconoCheck } from '../iconos';
import * as estilos from './formularios.css';

export function Casilla({
  children,
  seleccionada,
  name,
  error,
  deshabilitado,
  onChange,
}: {
  children: ReactNode;
  seleccionada?: boolean;
  name?: string;
  error?: string | undefined;
  deshabilitado?: boolean;
  onChange?: (seleccionada: boolean) => void;
}) {
  return (
    <CheckboxField
      className={estilos.grupo}
      isSelected={seleccionada ?? false}
      isInvalid={Boolean(error)}
      isDisabled={deshabilitado ?? false}
      onChange={onChange ?? (() => undefined)}
      {...(name === undefined ? {} : { name })}
    >
      <CheckboxButton className={estilos.casilla}>
        {({ isSelected }) => (
          <>
            <span className={estilos.marca}>{isSelected && <IconoCheck />}</span>
            <span>{children}</span>
          </>
        )}
      </CheckboxButton>
      <FieldError className={estilos.error}>
        <IconoAlerta tamano={14} />
        {error}
      </FieldError>
    </CheckboxField>
  );
}
