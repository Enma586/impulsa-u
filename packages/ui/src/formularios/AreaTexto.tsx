import type { Ref } from 'react';
import { FieldError, Label, Text, TextArea, TextField } from 'react-aria-components';
import { IconoAlerta } from '../iconos';
import * as estilos from './formularios.css';

export function AreaTexto({
  etiqueta,
  value,
  placeholder,
  ayuda,
  error,
  requerido,
  deshabilitado,
  filas = 5,
  onChange,
  onBlur,
  refInput,
}: {
  etiqueta: string;
  value?: string;
  placeholder?: string;
  ayuda?: string;
  error?: string | undefined;
  requerido?: boolean;
  deshabilitado?: boolean;
  filas?: number;
  onChange?: (valor: string) => void;
  onBlur?: () => void;
  refInput?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <TextField
      className={estilos.grupo}
      isInvalid={Boolean(error)}
      isRequired={requerido ?? false}
      isDisabled={deshabilitado ?? false}
      {...(value === undefined ? {} : { value })}
      {...(onChange ? { onChange } : {})}
      {...(onBlur ? { onBlur } : {})}
    >
      <Label className={estilos.etiqueta}>{etiqueta}</Label>
      <TextArea
        className={estilos.areaTexto}
        rows={filas}
        ref={refInput ?? null}
        {...(placeholder === undefined ? {} : { placeholder })}
      />
      {ayuda && (
        <Text slot="description" className={estilos.ayuda}>
          {ayuda}
        </Text>
      )}
      <FieldError className={estilos.error}>
        <IconoAlerta tamano={14} />
        {error}
      </FieldError>
    </TextField>
  );
}
