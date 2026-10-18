import {
  Button,
  FieldError,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select,
  SelectValue,
  Text,
} from 'react-aria-components';
import { IconoAlerta, IconoChevron } from '../iconos';
import * as estilos from './formularios.css';

export interface OpcionSelector {
  valor: string;
  etiqueta: string;
}

export function Selector({
  etiqueta,
  opciones,
  value,
  name,
  placeholder = 'Selecciona una opción',
  ayuda,
  error,
  requerido,
  deshabilitado,
  onChange,
}: {
  etiqueta: string;
  opciones: readonly OpcionSelector[];
  value?: string | null;
  name?: string;
  placeholder?: string;
  ayuda?: string;
  error?: string | undefined;
  requerido?: boolean;
  deshabilitado?: boolean;
  onChange?: (valor: string) => void;
}) {
  return (
    <Select
      className={estilos.grupo}
      value={value ?? null}
      placeholder={placeholder}
      isInvalid={Boolean(error)}
      isRequired={requerido ?? false}
      isDisabled={deshabilitado ?? false}
      onChange={(clave) => {
        if (clave !== null) onChange?.(String(clave));
      }}
      {...(name === undefined ? {} : { name })}
    >
      <Label className={estilos.etiqueta}>{etiqueta}</Label>
      <Button className={estilos.selector}>
        <SelectValue />
        <IconoChevron />
      </Button>
      {ayuda && (
        <Text slot="description" className={estilos.ayuda}>
          {ayuda}
        </Text>
      )}
      <FieldError className={estilos.error}>
        <IconoAlerta tamano={14} />
        {error}
      </FieldError>
      <Popover className={estilos.ventana}>
        <ListBox className={estilos.lista}>
          {opciones.map((o) => (
            <ListBoxItem
              key={o.valor}
              id={o.valor}
              textValue={o.etiqueta}
              className={estilos.opcion}
            >
              {o.etiqueta}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
