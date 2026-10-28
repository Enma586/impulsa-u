import type { proyectos } from '@impulsau/contracts';
import {
  BotonAlternar,
  Dato,
  Enlace,
  Fila,
  IconoCorazon,
  Imagen,
  Insignia,
  Pila,
  Tarjeta,
  Texto,
  Titulo,
} from '@impulsau/ui';
import { useState } from 'react';
import { fechaLegible } from '../../compartido/etiquetas';
import { alternarLike } from './consultas';

/** Botón de "me gusta" con el contador. El servidor es la fuente de verdad del resultado. */
export function BotonLike({
  proyectoId,
  meGusta,
  likes,
}: {
  proyectoId: string;
  meGusta: boolean;
  likes: number;
}) {
  const [estado, setEstado] = useState({ meGusta, likes });
  const [enCurso, setEnCurso] = useState(false);

  async function cambiar(quiere: boolean): Promise<void> {
    setEnCurso(true);
    try {
      setEstado(await alternarLike(proyectoId, quiere));
    } catch {
      // Si falla, se queda el estado anterior: el botón sigue reflejando lo que guardó el servidor.
    } finally {
      setEnCurso(false);
    }
  }

  return (
    <BotonAlternar
      seleccionado={estado.meGusta}
      etiqueta={estado.meGusta ? 'Quitar me gusta' : 'Dar me gusta'}
      deshabilitado={enCurso}
      onCambio={(quiere) => void cambiar(quiere)}
    >
      <IconoCorazon relleno={estado.meGusta} />
      {estado.likes}
    </BotonAlternar>
  );
}

export function TarjetaProyecto({ proyecto }: { proyecto: proyectos.ProyectoResumen }) {
  return (
    <Tarjeta>
      <Pila espacio={12}>
        {proyecto.imagenUrl && (
          <Imagen src={proyecto.imagenUrl} alt={`Imagen de ${proyecto.titulo}`} />
        )}
        <Fila espacio={8} alinear="centro">
          {proyecto.estado === 'borrador' && <Insignia tono="falta">Borrador</Insignia>}
          <Dato>
            <Enlace href={`/talentos/${proyecto.autor.id}`}>{proyecto.autor.nombre}</Enlace>
            {proyecto.publicadoEn && ` · ${fechaLegible(proyecto.publicadoEn)}`}
          </Dato>
        </Fila>
        <Titulo nivel={3}>
          <Enlace href={`/proyectos/${proyecto.id}`}>{proyecto.titulo}</Enlace>
        </Titulo>
        <Texto color="secundario">{proyecto.extracto}</Texto>
        <Fila espacio={6}>
          {proyecto.tecnologias.map((tecnologia) => (
            <Insignia key={tecnologia.id}>{tecnologia.nombre}</Insignia>
          ))}
        </Fila>
        {proyecto.estado === 'publicado' && (
          <Fila>
            <BotonLike proyectoId={proyecto.id} meGusta={proyecto.meGusta} likes={proyecto.likes} />
          </Fila>
        )}
      </Pila>
    </Tarjeta>
  );
}
