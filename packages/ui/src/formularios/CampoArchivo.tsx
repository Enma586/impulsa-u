import type { ReactNode } from 'react';
import { Button, FileTrigger } from 'react-aria-components';
import * as acciones from '../acciones/acciones.css';

/** Botón que abre el selector de archivos del sistema. */
export function CampoArchivo({
  children,
  tipos,
  multiple = false,
  deshabilitado = false,
  onSeleccion,
}: {
  children: ReactNode;
  tipos: readonly string[];
  multiple?: boolean;
  deshabilitado?: boolean;
  onSeleccion: (archivos: File[]) => void;
}) {
  return (
    <FileTrigger
      acceptedFileTypes={[...tipos]}
      allowsMultiple={multiple}
      onSelect={(lista) => {
        onSeleccion(lista ? [...lista] : []);
      }}
    >
      <Button
        className={[acciones.boton, acciones.variante.secundario].join(' ')}
        isDisabled={deshabilitado}
      >
        {children}
      </Button>
    </FileTrigger>
  );
}
