import { proyectos } from '@impulsau/contracts';
import {
  AreaTexto,
  AvisoError,
  Boton,
  Campo,
  CampoArchivo,
  Cargando,
  Esqueleto,
  Fila,
  GrupoFichas,
  Imagen,
  Pila,
  Segmentado,
  Texto,
} from '@impulsau/ui';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { mensajeDeError } from '../../api/cliente';
import { crearResolver } from '../../compartido/resolver';
import { useCatalogos } from '../catalogos/useCatalogos';
import { subirImagen } from './consultas';

export interface ValoresProyecto {
  titulo: string;
  descripcion: string;
  materia: string;
  periodo: string;
  urlRepositorio: string;
  urlDemo: string;
  urlVideo: string;
  tecnologiaIds: string[];
  imagenes: { id: string; url: string }[];
  estado: 'borrador' | 'publicado';
}

const CAMPOS: readonly string[] = [
  'titulo',
  'descripcion',
  'materia',
  'periodo',
  'urlRepositorio',
  'urlDemo',
  'urlVideo',
  'tecnologiaIds',
];

const textoONulo = (texto: string): string | null => (texto.trim() === '' ? null : texto.trim());

/** Cuerpo común a publicar y editar; el contrato valida el resto. */
export function aCandidato(v: ValoresProyecto) {
  return {
    titulo: v.titulo,
    descripcion: v.descripcion,
    materia: textoONulo(v.materia),
    periodo: textoONulo(v.periodo),
    urlRepositorio: textoONulo(v.urlRepositorio),
    urlDemo: textoONulo(v.urlDemo),
    urlVideo: textoONulo(v.urlVideo),
    tecnologiaIds: v.tecnologiaIds,
    archivoIds: v.imagenes.map((imagen) => imagen.id),
  };
}

const resolver = crearResolver<ValoresProyecto>(
  proyectos.PublicarProyectoEntrada.omit({ publicar: true }),
  aCandidato,
  (campo): campo is keyof ValoresProyecto => CAMPOS.includes(campo),
);

export const valoresVacios: ValoresProyecto = {
  titulo: '',
  descripcion: '',
  materia: '',
  periodo: '',
  urlRepositorio: '',
  urlDemo: '',
  urlVideo: '',
  tecnologiaIds: [],
  imagenes: [],
  estado: 'publicado',
};

/**
 * Formulario de proyecto para publicar (CU-17) y editar (CU-18). `onGuardar` recibe los valores
 * ya validados por el contrato y devuelve el mensaje de error si el servidor lo rechazó.
 */
export function FormularioProyecto({
  inicial,
  textoBoton,
  elegirEstado,
  onGuardar,
}: {
  inicial: ValoresProyecto;
  textoBoton: string;
  elegirEstado: boolean;
  onGuardar: (valores: ValoresProyecto) => Promise<string | null>;
}) {
  const catalogos = useCatalogos();
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<ValoresProyecto>({ resolver, defaultValues: inicial, mode: 'onTouched' });
  const [aviso, setAviso] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorImagen, setErrorImagen] = useState<string | null>(null);
  const imagenes = watch('imagenes');

  async function agregarImagenes(archivos: File[]): Promise<void> {
    setErrorImagen(null);
    setSubiendo(true);
    try {
      let actuales = imagenes;
      for (const archivo of archivos) {
        if (actuales.length >= 6) break;
        actuales = [...actuales, await subirImagen(archivo)];
        setValue('imagenes', actuales);
      }
    } catch (error: unknown) {
      setErrorImagen(mensajeDeError(error));
    } finally {
      setSubiendo(false);
    }
  }

  const enviar = handleSubmit(async (valores) => {
    setAviso(null);
    setAviso(await onGuardar(valores));
  });

  return (
    <form onSubmit={(evento) => void enviar(evento)} noValidate>
      <Pila espacio={18}>
        <Controller
          control={control}
          name="titulo"
          render={({ field, fieldState }) => (
            <Campo
              etiqueta="Título del proyecto"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              refInput={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="descripcion"
          render={({ field, fieldState }) => (
            <AreaTexto
              etiqueta="¿Qué construiste y cómo?"
              ayuda="Cuenta el problema, tu aporte y lo que aprendiste."
              filas={7}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              refInput={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />

        {catalogos.isPending ? (
          <Cargando etiqueta="Cargando tecnologías">
            <Esqueleto />
          </Cargando>
        ) : catalogos.data ? (
          <Controller
            control={control}
            name="tecnologiaIds"
            render={({ field, fieldState }) => (
              <GrupoFichas
                etiqueta="Tecnologías usadas"
                ayuda="Estas habilidades quedan respaldadas por este proyecto."
                opciones={catalogos.data.habilidades.map((habilidad) => ({
                  valor: habilidad.id,
                  etiqueta: habilidad.nombre,
                }))}
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />
        ) : (
          <AvisoError titulo="No pudimos cargar las tecnologías">
            Recarga la página para volver a intentarlo.
          </AvisoError>
        )}

        <Pila espacio={10}>
          <Texto tamano="pequeno" color="secundario">
            Imágenes (hasta 6, JPG, PNG o WebP de máximo 2 MB)
          </Texto>
          {imagenes.length > 0 && (
            <Fila espacio={12}>
              {imagenes.map((imagen, indice) => (
                <Pila key={imagen.id} espacio={6}>
                  <Imagen src={imagen.url} alt={`Imagen ${String(indice + 1)} del proyecto`} />
                  <Boton
                    variante="fantasma"
                    onPress={() => {
                      setValue(
                        'imagenes',
                        imagenes.filter((otra) => otra.id !== imagen.id),
                      );
                    }}
                  >
                    Quitar
                  </Boton>
                </Pila>
              ))}
            </Fila>
          )}
          <Fila>
            <CampoArchivo
              tipos={['image/jpeg', 'image/png', 'image/webp']}
              multiple
              deshabilitado={subiendo || imagenes.length >= 6}
              onSeleccion={(archivos) => void agregarImagenes(archivos)}
            >
              {subiendo ? 'Subiendo…' : 'Agregar imágenes'}
            </CampoArchivo>
          </Fila>
          {errorImagen && (
            <AvisoError titulo="No pudimos subir la imagen">{errorImagen}</AvisoError>
          )}
        </Pila>

        <Controller
          control={control}
          name="urlRepositorio"
          render={({ field, fieldState }) => (
            <Campo
              etiqueta="Repositorio (opcional)"
              placeholder="https://github.com/…"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              refInput={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="urlDemo"
          render={({ field, fieldState }) => (
            <Campo
              etiqueta="Demo en vivo (opcional)"
              placeholder="https://…"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              refInput={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="urlVideo"
          render={({ field, fieldState }) => (
            <Campo
              etiqueta="Video (opcional)"
              placeholder="https://…"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              refInput={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="materia"
          render={({ field, fieldState }) => (
            <Campo
              etiqueta="Materia (opcional)"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              refInput={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="periodo"
          render={({ field, fieldState }) => (
            <Campo
              etiqueta="Periodo (opcional)"
              placeholder="Ciclo 02-2026"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              refInput={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />

        {elegirEstado && (
          <Controller
            control={control}
            name="estado"
            render={({ field }) => (
              <Segmentado
                etiqueta="Visibilidad"
                value={field.value}
                onChange={(valor) => {
                  field.onChange(valor === 'borrador' ? 'borrador' : 'publicado');
                }}
                opciones={[
                  { valor: 'publicado', etiqueta: 'Publicado' },
                  { valor: 'borrador', etiqueta: 'Borrador' },
                ]}
              />
            )}
          />
        )}

        {aviso && <AvisoError titulo="No pudimos guardar el proyecto">{aviso}</AvisoError>}

        <Fila espacio={12}>
          <Boton type="submit" tamano="grande" cargando={isSubmitting} deshabilitado={subiendo}>
            {textoBoton}
          </Boton>
        </Fila>
      </Pila>
    </form>
  );
}
