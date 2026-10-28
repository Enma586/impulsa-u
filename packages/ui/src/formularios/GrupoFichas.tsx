import { Label, Text, ToggleButton, ToggleButtonGroup } from 'react-aria-components';
import type { Key } from 'react-aria-components';
import { IconoAlerta, IconoCheck } from '../iconos';
import * as estilos from './formularios.css';

export interface OpcionFicha {
  valor: string;
  etiqueta: string;
}

/** Selección múltiple como fichas (habilidades, tecnologías). `value` son los valores elegidos. */
export function GrupoFichas({
  etiqueta,
  opciones,
  value,
  ayuda,
  error,
  onChange,
}: {
  etiqueta: string;
  opciones: readonly OpcionFicha[];
  value: readonly string[];
  ayuda?: string;
  error?: string | undefined;
  onChange: (valores: string[]) => void;
}) {
  const claves = new Set<Key>(value);
  return (
    <div className={estilos.grupo} role="group" aria-label={etiqueta}>
      <Label className={estilos.etiqueta}>{etiqueta}</Label>
      <ToggleButtonGroup
        className={estilos.fichas}
        selectionMode="multiple"
        selectedKeys={claves}
        onSelectionChange={(seleccion) => {
          onChange([...seleccion].map(String));
        }}
      >
        {opciones.map((opcion) => (
          <ToggleButton key={opcion.valor} id={opcion.valor} className={estilos.ficha}>
            {({ isSelected }) => (
              <>
                {isSelected && <IconoCheck tamano={14} />}
                {opcion.etiqueta}
              </>
            )}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {ayuda && <Text className={estilos.ayuda}>{ayuda}</Text>}
      {error && (
        <span className={estilos.error} role="alert">
          <IconoAlerta tamano={14} />
          {error}
        </span>
      )}
    </div>
  );
}
