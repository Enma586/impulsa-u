/** Bucket público de Supabase Storage donde viven las imágenes; las claves las genera el servidor. */
export const BUCKET_ARCHIVOS = 'archivos';

/** URL pública de un objeto del bucket (los archivos nunca pasan por el backend). */
export function urlPublicaArchivo(urlSupabase: string, clave: string): string {
  return `${urlSupabase}/storage/v1/object/public/${BUCKET_ARCHIVOS}/${clave}`;
}
