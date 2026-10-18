import type { ReactNode } from 'react';
import { IconoAlerta } from '../iconos';
import * as estilos from './estados.css';

/** Error a nivel de formulario o pantalla: ícono, título y texto, nunca solo color. */
export function AvisoError({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className={estilos.aviso} role="alert">
      <IconoAlerta />
      <div>
        <p className={estilos.avisoTitulo}>{titulo}</p>
        {children && <p className={estilos.avisoMensaje}>{children}</p>}
      </div>
    </div>
  );
}
