import { useState, type Ref } from 'react';
import { FieldError, Input, Label, Text, TextField, Button } from 'react-aria-components';
import { IconoAlerta, IconoOjo, IconoOjoTachado } from '../iconos';
import * as estilos from './formularios.css';

const tipos = { texto: 'text', correo: 'email', contrasena: 'password', fecha: 'date' } as const;

interface PropsCampo {
  etiqueta: string;
  tipo?: keyof typeof tipos;
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  ayuda?: string;
  /** Mensaje de error; si existe, el campo queda marcado como inválido. */
  error?: string;
  requerido?: boolean;
  deshabilitado?: boolean;
  onChange?: (valor: string) => void;
  onBlur?: () => void;
  refInput?: Ref<HTMLInputElement>;
}

export function Campo({
  etiqueta,
  tipo = 'texto',
  ayuda,
  error,
  requerido,
  deshabilitado,
  refInput,
  ...resto
}: PropsCampo) {
  const [visible, setVisible] = useState(false);
  const esContrasena = tipo === 'contrasena';
  const tipoHtml = esContrasena && visible ? 'text' : tipos[tipo];

  return (
    <TextField
      {...resto}
      type={tipoHtml}
      className={estilos.grupo}
      isInvalid={Boolean(error)}
      isRequired={requerido ?? false}
      isDisabled={deshabilitado ?? false}
    >
      <Label className={estilos.etiqueta}>{etiqueta}</Label>
      <div
        className={[estilos.caja, esContrasena && estilos.cajaConAccion].filter(Boolean).join(' ')}
      >
        <Input className={estilos.entrada} ref={refInput ?? null} />
        {esContrasena && (
          <Button
            className={estilos.boton}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => {
              setVisible((v) => !v);
            }}
          >
            {visible ? <IconoOjoTachado /> : <IconoOjo />}
          </Button>
        )}
      </div>
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
