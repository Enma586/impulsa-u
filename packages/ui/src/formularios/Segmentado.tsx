import { Label, RadioButton, RadioField, RadioGroup } from 'react-aria-components';
import * as estilos from './formularios.css';

export interface OpcionSegmentado {
  valor: string;
  etiqueta: string;
}

export function Segmentado({
  etiqueta,
  opciones,
  value,
  name,
  onChange,
}: {
  etiqueta: string;
  opciones: readonly OpcionSegmentado[];
  value?: string;
  name?: string;
  onChange?: (valor: string) => void;
}) {
  return (
    <RadioGroup
      className={estilos.grupo}
      orientation="horizontal"
      onChange={onChange ?? (() => undefined)}
      {...(value === undefined ? {} : { value })}
      {...(name === undefined ? {} : { name })}
    >
      <Label className={estilos.etiqueta}>{etiqueta}</Label>
      <div className={estilos.segmentado}>
        {opciones.map((o) => (
          <RadioField key={o.valor} value={o.valor} className={estilos.campoSegmento}>
            <RadioButton className={estilos.segmento}>{o.etiqueta}</RadioButton>
          </RadioField>
        ))}
      </div>
    </RadioGroup>
  );
}
