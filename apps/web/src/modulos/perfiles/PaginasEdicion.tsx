import { perfiles } from '@impulsau/contracts';
import type { Departamento } from '@impulsau/contracts';
import {
  AreaTexto,
  AvisoError,
  Boton,
  Campo,
  Casilla,
  Contenedor,
  Dato,
  Fila,
  GrupoFichas,
  Pila,
  Selector,
  Titulo,
} from '@impulsau/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ErrorDeApi, mensajeDeError } from '../../api/cliente';
import { Carga, EsqueletoLista } from '../../compartido/Estados';
import { opcionesDepartamento } from '../../compartido/etiquetas';
import { crearResolver } from '../../compartido/resolver';
import { useUsuario } from '../../sesion/useSesion';
import { useCatalogos } from '../catalogos/useCatalogos';
import {
  guardarPerfilEmpresa,
  guardarPerfilTalento,
  usePerfilEmpresa,
  usePerfilTalento,
} from './consultas';

const NINGUNO = '';
const textoONulo = (texto: string): string | null => (texto.trim() === '' ? null : texto.trim());
const idONulo = (valor: string): string | null => (valor === NINGUNO ? null : valor);

function mensajeDeGuardado(error: unknown): string {
  if (error instanceof ErrorDeApi && error.codigo === 'conflicto') {
    return 'Tu perfil cambió en otro lugar. Recarga la página para ver la versión más reciente.';
  }
  return mensajeDeError(error);
}

function esDepartamento(valor: string): valor is Departamento {
  return opcionesDepartamento.some((opcion) => opcion.valor === valor);
}

interface ValoresTalento {
  nombreCompleto: string;
  carreraId: string;
  institucionId: string;
  departamento: string;
  bio: string;
  habilidadIds: string[];
  github: string;
  linkedin: string;
  portafolio: string;
}

const CAMPOS_TALENTO: readonly string[] = [
  'nombreCompleto',
  'carreraId',
  'institucionId',
  'departamento',
  'bio',
  'habilidadIds',
];

function enlacesDe(valores: ValoresTalento): perfiles.EnlaceTalento[] {
  const candidatos: { tipo: perfiles.TipoEnlace; url: string }[] = [
    { tipo: 'github', url: valores.github.trim() },
    { tipo: 'linkedin', url: valores.linkedin.trim() },
    { tipo: 'portafolio', url: valores.portafolio.trim() },
  ];
  return candidatos.filter((enlace) => enlace.url !== '');
}

function aEntradaTalento(valores: ValoresTalento, version: number) {
  return {
    nombreCompleto: valores.nombreCompleto,
    carreraId: idONulo(valores.carreraId),
    institucionId: idONulo(valores.institucionId),
    departamento: idONulo(valores.departamento),
    bio: textoONulo(valores.bio),
    habilidadIds: valores.habilidadIds,
    enlaces: enlacesDe(valores),
    version,
  };
}

const resolverTalento = crearResolver<ValoresTalento>(
  perfiles.ActualizarPerfilTalentoEntrada,
  (valores) => aEntradaTalento(valores, 1),
  (campo): campo is keyof ValoresTalento => CAMPOS_TALENTO.includes(campo),
);

function urlDe(perfil: perfiles.PerfilTalento, tipo: perfiles.TipoEnlace): string {
  return perfil.enlaces.find((enlace) => enlace.tipo === tipo)?.url ?? '';
}

function FormularioTalento({ perfil }: { perfil: perfiles.PerfilTalento }) {
  const catalogos = useCatalogos();
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const [aviso, setAviso] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ValoresTalento>({
    resolver: resolverTalento,
    mode: 'onTouched',
    defaultValues: {
      nombreCompleto: perfil.nombreCompleto,
      carreraId: perfil.carrera?.id ?? NINGUNO,
      institucionId: perfil.institucion?.id ?? NINGUNO,
      departamento: perfil.departamento ?? NINGUNO,
      bio: perfil.bio ?? '',
      habilidadIds: perfil.habilidades.map((habilidad) => habilidad.id),
      github: urlDe(perfil, 'github'),
      linkedin: urlDe(perfil, 'linkedin'),
      portafolio: urlDe(perfil, 'portafolio'),
    },
  });

  const enviar = handleSubmit(async (valores) => {
    setAviso(null);
    try {
      const entrada = perfiles.ActualizarPerfilTalentoEntrada.parse(
        aEntradaTalento(valores, perfil.version),
      );
      await guardarPerfilTalento(entrada);
      await clienteConsultas.invalidateQueries({ queryKey: ['perfiles'] });
      await navegar({ to: '/perfil' });
    } catch (error: unknown) {
      setAviso(mensajeDeGuardado(error));
    }
  });

  if (catalogos.isPending) return <EsqueletoLista filas={2} />;
  if (!catalogos.data) {
    return (
      <AvisoError titulo="No pudimos cargar los catálogos">
        Recarga la página para volver a intentarlo.
      </AvisoError>
    );
  }
  const datos = catalogos.data;
  const sinSeleccion = { valor: NINGUNO, etiqueta: 'Sin especificar' };

  return (
    <form onSubmit={(evento) => void enviar(evento)} noValidate>
      <Pila espacio={18}>
        <Controller
          control={control}
          name="nombreCompleto"
          render={({ field, fieldState }) => (
            <Campo
              etiqueta="Nombre completo"
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
          name="carreraId"
          render={({ field, fieldState }) => (
            <Selector
              etiqueta="Carrera"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              opciones={[
                sinSeleccion,
                ...datos.carreras.map((carrera) => ({
                  valor: carrera.id,
                  etiqueta: carrera.nombre,
                })),
              ]}
            />
          )}
        />
        <Controller
          control={control}
          name="institucionId"
          render={({ field, fieldState }) => (
            <Selector
              etiqueta="Institución"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              opciones={[
                sinSeleccion,
                ...datos.instituciones.map((institucion) => ({
                  valor: institucion.id,
                  etiqueta: institucion.nombre,
                })),
              ]}
            />
          )}
        />
        <Controller
          control={control}
          name="departamento"
          render={({ field, fieldState }) => (
            <Selector
              etiqueta="Departamento"
              value={field.value}
              onChange={(valor) => {
                field.onChange(valor === NINGUNO || esDepartamento(valor) ? valor : NINGUNO);
              }}
              error={fieldState.error?.message}
              opciones={[sinSeleccion, ...opcionesDepartamento]}
            />
          )}
        />
        <Controller
          control={control}
          name="bio"
          render={({ field, fieldState }) => (
            <AreaTexto
              etiqueta="Sobre ti"
              ayuda="Hasta 600 caracteres."
              filas={5}
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
          name="habilidadIds"
          render={({ field, fieldState }) => (
            <GrupoFichas
              etiqueta="Habilidades"
              ayuda="Se marcan como respaldadas cuando un proyecto publicado las usa."
              opciones={datos.habilidades.map((habilidad) => ({
                valor: habilidad.id,
                etiqueta: habilidad.nombre,
              }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        {(['github', 'linkedin', 'portafolio'] as const).map((nombre) => (
          <Controller
            key={nombre}
            control={control}
            name={nombre}
            render={({ field }) => (
              <Campo
                etiqueta={
                  nombre === 'github' ? 'GitHub' : nombre === 'linkedin' ? 'LinkedIn' : 'Portafolio'
                }
                placeholder="https://…"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                refInput={field.ref}
              />
            )}
          />
        ))}

        {aviso && <AvisoError titulo="No pudimos guardar tu perfil">{aviso}</AvisoError>}

        <Fila>
          <Boton type="submit" tamano="grande" cargando={isSubmitting}>
            Guardar perfil
          </Boton>
        </Fila>
      </Pila>
    </form>
  );
}

interface ValoresEmpresa {
  nombreComercial: string;
  nombreLegal: string;
  sector: string;
  sitioWeb: string;
  descripcion: string;
  esAgencia: boolean;
  clienteDeclarado: string;
}

const CAMPOS_EMPRESA: readonly string[] = [
  'nombreComercial',
  'nombreLegal',
  'sector',
  'sitioWeb',
  'descripcion',
  'clienteDeclarado',
];

function aEntradaEmpresa(valores: ValoresEmpresa, version: number) {
  return {
    nombreComercial: valores.nombreComercial,
    nombreLegal: textoONulo(valores.nombreLegal),
    sector: textoONulo(valores.sector),
    sitioWeb: textoONulo(valores.sitioWeb),
    descripcion: textoONulo(valores.descripcion),
    esAgencia: valores.esAgencia,
    clienteDeclarado: valores.esAgencia ? textoONulo(valores.clienteDeclarado) : null,
    version,
  };
}

const resolverEmpresa = crearResolver<ValoresEmpresa>(
  perfiles.ActualizarPerfilEmpresaEntrada,
  (valores) => aEntradaEmpresa(valores, 1),
  (campo): campo is keyof ValoresEmpresa => CAMPOS_EMPRESA.includes(campo),
);

function FormularioEmpresa({ perfil }: { perfil: perfiles.PerfilEmpresa }) {
  const navegar = useNavigate();
  const clienteConsultas = useQueryClient();
  const [aviso, setAviso] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<ValoresEmpresa>({
    resolver: resolverEmpresa,
    mode: 'onTouched',
    defaultValues: {
      nombreComercial: perfil.nombreComercial,
      nombreLegal: perfil.nombreLegal ?? '',
      sector: perfil.sector ?? '',
      sitioWeb: perfil.sitioWeb ?? '',
      descripcion: perfil.descripcion ?? '',
      esAgencia: perfil.esAgencia,
      clienteDeclarado: perfil.clienteDeclarado ?? '',
    },
  });
  const esAgencia = watch('esAgencia');

  const enviar = handleSubmit(async (valores) => {
    setAviso(null);
    try {
      const entrada = perfiles.ActualizarPerfilEmpresaEntrada.parse(
        aEntradaEmpresa(valores, perfil.version),
      );
      await guardarPerfilEmpresa(entrada);
      await clienteConsultas.invalidateQueries({ queryKey: ['perfiles'] });
      await navegar({ to: '/perfil' });
    } catch (error: unknown) {
      setAviso(mensajeDeGuardado(error));
    }
  });

  const campoTexto = (
    nombre: 'nombreComercial' | 'nombreLegal' | 'sector' | 'sitioWeb',
    etiqueta: string,
    placeholder?: string,
  ) => (
    <Controller
      control={control}
      name={nombre}
      render={({ field, fieldState }) => (
        <Campo
          etiqueta={etiqueta}
          {...(placeholder === undefined ? {} : { placeholder })}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          refInput={field.ref}
          error={fieldState.error?.message}
        />
      )}
    />
  );

  return (
    <form onSubmit={(evento) => void enviar(evento)} noValidate>
      <Pila espacio={18}>
        {campoTexto('nombreComercial', 'Nombre comercial')}
        {campoTexto('nombreLegal', 'Nombre legal (opcional)')}
        {campoTexto('sector', 'Sector (opcional)')}
        {campoTexto('sitioWeb', 'Sitio web (opcional)', 'https://…')}
        <Controller
          control={control}
          name="descripcion"
          render={({ field, fieldState }) => (
            <AreaTexto
              etiqueta="Descripción"
              ayuda="Hasta 1000 caracteres."
              filas={5}
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
          name="esAgencia"
          render={({ field }) => (
            <Casilla seleccionada={field.value} onChange={field.onChange}>
              Somos una agencia que recluta para otros clientes
            </Casilla>
          )}
        />
        {esAgencia && (
          <Controller
            control={control}
            name="clienteDeclarado"
            render={({ field, fieldState }) => (
              <Campo
                etiqueta="Cliente para el que reclutas"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                refInput={field.ref}
                error={fieldState.error?.message}
              />
            )}
          />
        )}

        {aviso && <AvisoError titulo="No pudimos guardar tu perfil">{aviso}</AvisoError>}

        <Fila>
          <Boton type="submit" tamano="grande" cargando={isSubmitting}>
            Guardar perfil
          </Boton>
        </Fila>
      </Pila>
    </form>
  );
}

function EdicionTalento({ id }: { id: string }) {
  const consulta = usePerfilTalento(id);
  return (
    <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={2} />}>
      {(perfil) => <FormularioTalento perfil={perfil} />}
    </Carga>
  );
}

function EdicionEmpresa({ id }: { id: string }) {
  const consulta = usePerfilEmpresa(id);
  return (
    <Carga consulta={consulta} esqueleto={<EsqueletoLista filas={2} />}>
      {(perfil) => <FormularioEmpresa perfil={perfil} />}
    </Carga>
  );
}

/** CU-09 y CU-10: edita el perfil propio según el rol. */
export function PaginaEditarPerfil() {
  const usuario = useUsuario();
  return (
    <Contenedor ancho="medio">
      <Pila espacio={20}>
        <Pila espacio={8}>
          <Dato color="acento">Mi perfil</Dato>
          <Titulo nivel={1}>Edita tu perfil</Titulo>
        </Pila>
        {usuario.rol === 'empresa' ? (
          <EdicionEmpresa id={usuario.id} />
        ) : (
          <EdicionTalento id={usuario.id} />
        )}
      </Pila>
    </Contenedor>
  );
}
