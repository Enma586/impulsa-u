import { vacantes } from '@impulsau/contracts';
import type { Departamento } from '@impulsau/contracts';
import {
  AreaTexto,
  AvisoError,
  Boton,
  Campo,
  Contenedor,
  Dato,
  Fila,
  GrupoFichas,
  Pila,
  Segmentado,
  Selector,
  Texto,
  Titulo,
} from '@impulsau/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ErrorDeApi, mensajeDeError } from '../../api/cliente';
import { Carga, EsqueletoLista } from '../../compartido/Estados';
import {
  aOpciones,
  nombresModalidad,
  nombresTipoVacante,
  opcionesDepartamento,
} from '../../compartido/etiquetas';
import { crearResolver } from '../../compartido/resolver';
import { useCatalogos } from '../catalogos/useCatalogos';
import { editarVacante, publicarVacante, useVacante } from './consultas';

const NINGUNO = '';

interface ValoresVacante {
  titulo: string;
  descripcion: string;
  tipo: vacantes.TipoVacante;
  modalidad: vacantes.ModalidadVacante;
  departamento: string;
  requeridas: string[];
  deseables: string[];
  publicar: boolean;
}

const CAMPOS: readonly string[] = [
  'titulo',
  'descripcion',
  'tipo',
  'modalidad',
  'departamento',
  'requeridas',
];

function esDepartamento(valor: string): valor is Departamento {
  return opcionesDepartamento.some((opcion) => opcion.valor === valor);
}
function esTipo(valor: string): valor is vacantes.TipoVacante {
  return valor in nombresTipoVacante;
}
function esModalidad(valor: string): valor is vacantes.ModalidadVacante {
  return valor in nombresModalidad;
}

/** Cuerpo común a publicar y editar; el contrato valida el resto. */
function aCandidato(v: ValoresVacante) {
  const deseables = v.deseables.filter((id) => !v.requeridas.includes(id));
  return {
    titulo: v.titulo,
    descripcion: v.descripcion,
    tipo: v.tipo,
    modalidad: v.modalidad,
    departamento: esDepartamento(v.departamento) ? v.departamento : null,
    habilidades: [
      ...v.requeridas.map((id) => ({ id, requerida: true })),
      ...deseables.map((id) => ({ id, requerida: false })),
    ],
  };
}

const resolver = crearResolver<ValoresVacante>(
  vacantes.PublicarVacanteEntrada.omit({ publicar: true }),
  aCandidato,
  (campo): campo is keyof ValoresVacante => CAMPOS.includes(campo),
  { habilidades: 'requeridas' },
);

const valoresVacios: ValoresVacante = {
  titulo: '',
  descripcion: '',
  tipo: 'pasantia',
  modalidad: 'presencial',
  departamento: NINGUNO,
  requeridas: [],
  deseables: [],
  publicar: true,
};

function valoresDe(vacante: vacantes.VacanteDetalle): ValoresVacante {
  return {
    titulo: vacante.titulo,
    descripcion: vacante.descripcion,
    tipo: vacante.tipo,
    modalidad: vacante.modalidad,
    departamento: vacante.departamento ?? NINGUNO,
    requeridas: vacante.habilidades.filter((h) => h.requerida).map((h) => h.id),
    deseables: vacante.habilidades.filter((h) => !h.requerida).map((h) => h.id),
    publicar: true,
  };
}

function mensajeDeGuardado(error: unknown): string {
  if (error instanceof ErrorDeApi && error.codigo === 'conflicto') {
    return 'La vacante cambió en otro lugar. Recarga la página para ver la versión más reciente.';
  }
  return mensajeDeError(error);
}

function FormularioVacante({
  inicial,
  textoBoton,
  elegirPublicacion,
  onGuardar,
}: {
  inicial: ValoresVacante;
  textoBoton: string;
  elegirPublicacion: boolean;
  onGuardar: (valores: ValoresVacante) => Promise<string | null>;
}) {
  const catalogos = useCatalogos();
  const [aviso, setAviso] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ValoresVacante>({ resolver, defaultValues: inicial, mode: 'onTouched' });

  const enviar = handleSubmit(async (valores) => {
    setAviso(null);
    setAviso(await onGuardar(valores));
  });

  if (catalogos.isPending) return <EsqueletoLista filas={2} />;
  if (!catalogos.data) {
    return (
      <AvisoError titulo="No pudimos cargar las habilidades">
        Recarga la página para volver a intentarlo.
      </AvisoError>
    );
  }
  const habilidades = catalogos.data.habilidades.map((h) => ({ valor: h.id, etiqueta: h.nombre }));

  return (
    <form onSubmit={(evento) => void enviar(evento)} noValidate>
      <Pila espacio={18}>
        <Controller
          control={control}
          name="titulo"
          render={({ field, fieldState }) => (
            <Campo
              etiqueta="Título de la vacante"
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
              etiqueta="Descripción"
              ayuda="Qué hará la persona, qué aprenderá y cómo es el equipo."
              filas={8}
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
          name="tipo"
          render={({ field }) => (
            <Selector
              etiqueta="Tipo"
              value={field.value}
              opciones={aOpciones(nombresTipoVacante)}
              onChange={(valor) => {
                if (esTipo(valor)) field.onChange(valor);
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="modalidad"
          render={({ field }) => (
            <Selector
              etiqueta="Modalidad"
              value={field.value}
              opciones={aOpciones(nombresModalidad)}
              onChange={(valor) => {
                if (esModalidad(valor)) field.onChange(valor);
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="departamento"
          render={({ field }) => (
            <Selector
              etiqueta="Departamento"
              value={field.value}
              opciones={[{ valor: NINGUNO, etiqueta: 'Sin especificar' }, ...opcionesDepartamento]}
              onChange={(valor) => {
                field.onChange(valor === NINGUNO || esDepartamento(valor) ? valor : NINGUNO);
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="requeridas"
          render={({ field, fieldState }) => (
            <GrupoFichas
              etiqueta="Habilidades requeridas"
              opciones={habilidades}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="deseables"
          render={({ field }) => (
            <GrupoFichas
              etiqueta="Habilidades deseables (opcional)"
              opciones={habilidades}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {elegirPublicacion && (
          <Controller
            control={control}
            name="publicar"
            render={({ field }) => (
              <Segmentado
                etiqueta="Visibilidad"
                value={field.value ? 'publicar' : 'borrador'}
                onChange={(valor) => {
                  field.onChange(valor === 'publicar');
                }}
                opciones={[
                  { valor: 'publicar', etiqueta: 'Publicar ahora' },
                  { valor: 'borrador', etiqueta: 'Guardar borrador' },
                ]}
              />
            )}
          />
        )}

        {aviso && <AvisoError titulo="No pudimos guardar la vacante">{aviso}</AvisoError>}
        <Fila>
          <Boton type="submit" tamano="grande" cargando={isSubmitting}>
            {textoBoton}
          </Boton>
        </Fila>
      </Pila>
    </form>
  );
}

/** CU-40: publicar una vacante. */
export function PaginaNuevaVacante() {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();

  return (
    <Contenedor ancho="medio">
      <Pila espacio={20}>
        <Pila espacio={8}>
          <Dato color="acento">Nueva vacante</Dato>
          <Titulo nivel={1}>Encuentra talento que quiere empezar</Titulo>
          <Texto color="secundario">
            Pide solo lo necesario: aquí nadie tiene experiencia laboral, pero sí proyectos.
          </Texto>
        </Pila>
        <FormularioVacante
          inicial={valoresVacios}
          textoBoton="Guardar vacante"
          elegirPublicacion
          onGuardar={async (valores) => {
            try {
              const creada = await publicarVacante({
                ...aCandidato(valores),
                publicar: valores.publicar,
              });
              await clienteConsultas.invalidateQueries({ queryKey: ['vacantes'] });
              await navegar({ to: '/vacantes/$id', params: { id: creada.id } });
              return null;
            } catch (error: unknown) {
              return mensajeDeGuardado(error);
            }
          }}
        />
      </Pila>
    </Contenedor>
  );
}

/** CU-41: editar con bloqueo optimista por versión. */
export function PaginaEditarVacante() {
  const { id = '' } = useParams({ strict: false });
  const consulta = useVacante(id);
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();

  return (
    <Contenedor ancho="medio">
      <Pila espacio={20}>
        <Pila espacio={8}>
          <Dato color="acento">Editar vacante</Dato>
          <Titulo nivel={1}>Actualiza la vacante</Titulo>
        </Pila>
        <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={2} />}>
          {(vacante) => (
            <FormularioVacante
              inicial={valoresDe(vacante)}
              textoBoton="Guardar cambios"
              elegirPublicacion={false}
              onGuardar={async (valores) => {
                try {
                  await editarVacante(vacante.id, {
                    ...aCandidato(valores),
                    version: vacante.version,
                  });
                  await clienteConsultas.invalidateQueries({ queryKey: ['vacantes'] });
                  await navegar({ to: '/vacantes/$id', params: { id: vacante.id } });
                  return null;
                } catch (error: unknown) {
                  return mensajeDeGuardado(error);
                }
              }}
            />
          )}
        </Carga>
      </Pila>
    </Contenedor>
  );
}
