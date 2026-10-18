import type { ReactNode } from 'react';
import { Dialog, Heading, Modal as ModalAria, ModalOverlay } from 'react-aria-components';
import { BotonIcono } from '../acciones/Boton';
import { IconoCerrar } from '../iconos';
import * as estilos from './superficies.css';

/** Modal con foco atrapado, cierre con Escape y título accesible. */
export function Modal({
  abierto,
  onCambioAbierto,
  titulo,
  children,
  acciones,
}: {
  abierto: boolean;
  onCambioAbierto: (abierto: boolean) => void;
  titulo: string;
  children: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <ModalOverlay
      className={estilos.velo}
      isOpen={abierto}
      onOpenChange={onCambioAbierto}
      isDismissable
    >
      <ModalAria className={estilos.modal}>
        <Dialog className={estilos.dialogo}>
          <Heading slot="title" className={estilos.tituloModal}>
            {titulo}
          </Heading>
          <div>{children}</div>
          {acciones && <div className={estilos.acciones}>{acciones}</div>}
          <span className={estilos.cerrar}>
            <BotonIcono
              etiqueta="Cerrar"
              icono={<IconoCerrar />}
              onPress={() => {
                onCambioAbierto(false);
              }}
            />
          </span>
        </Dialog>
      </ModalAria>
    </ModalOverlay>
  );
}
