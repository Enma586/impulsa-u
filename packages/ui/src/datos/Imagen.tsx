import * as estilos from './datos.css';

/** Imagen con proporción fija y recorte; `alt` vacío solo si es decorativa. */
export function Imagen({
  src,
  alt,
  proporcion = 'panoramica',
}: {
  src: string;
  alt: string;
  proporcion?: keyof typeof estilos.proporcion;
}) {
  return (
    <div className={[estilos.marcoImagen, estilos.proporcion[proporcion]].join(' ')}>
      <img className={estilos.imagen} src={src} alt={alt} loading="lazy" />
    </div>
  );
}
