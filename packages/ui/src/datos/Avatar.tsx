import * as estilos from './datos.css';

function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join('');
}

/** Con `src` muestra la foto; sin ella, las iniciales. `nombre` es su texto accesible. */
export function Avatar({
  nombre,
  src,
  tamano = 'medio',
}: {
  nombre: string;
  src?: string;
  tamano?: keyof typeof estilos.tamanoAvatar;
}) {
  const clase = [estilos.avatar, estilos.tamanoAvatar[tamano]].join(' ');

  if (src) {
    return (
      <span className={clase}>
        <img className={estilos.imagenAvatar} src={src} alt={nombre} />
      </span>
    );
  }
  return (
    <span className={clase} role="img" aria-label={nombre}>
      {iniciales(nombre)}
    </span>
  );
}
