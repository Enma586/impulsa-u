import type { ReactNode } from 'react';
import { Tab, TabList, TabPanel, Tabs } from 'react-aria-components';
import * as estilos from './navegacion.css';

export interface Pestana {
  id: string;
  etiqueta: string;
  contenido: ReactNode;
}

export function Pestanas({
  etiquetaAria,
  pestanas,
  seleccionada,
  onCambio,
}: {
  etiquetaAria: string;
  pestanas: readonly Pestana[];
  seleccionada?: string;
  onCambio?: (id: string) => void;
}) {
  return (
    <Tabs
      className={estilos.pestanas}
      {...(seleccionada === undefined ? {} : { selectedKey: seleccionada })}
      onSelectionChange={(clave) => {
        onCambio?.(String(clave));
      }}
    >
      <TabList className={estilos.lista} aria-label={etiquetaAria}>
        {pestanas.map((p) => (
          <Tab key={p.id} id={p.id} className={estilos.pestana}>
            {p.etiqueta}
          </Tab>
        ))}
      </TabList>
      {pestanas.map((p) => (
        <TabPanel key={p.id} id={p.id} className={estilos.panel}>
          {p.contenido}
        </TabPanel>
      ))}
    </Tabs>
  );
}
