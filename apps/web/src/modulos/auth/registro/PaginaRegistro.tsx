import { auth } from '@impulsau/contracts';
import {
  AvisoError,
  Boton,
  Campo,
  Casilla,
  Contenedor,
  Dato,
  Fila,
  Modal,
  Pila,
  Segmentado,
  Selector,
  Texto,
  Titulo,
} from '@impulsau/ui';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { entorno } from '../../../entorno';
import { registrarTalento, type FalloRegistro } from '../api';
import {
  aCandidato,
  esCampoRegistro,
  resolverRegistro,
  valoresIniciales,
  type ValoresRegistro,
} from './resolver';

const ciclos = Array.from({ length: 20 }, (_, i) => ({
  valor: String(i + 1),
  etiqueta: `Ciclo ${String(i + 1)}`,
}));

const anioActual = new Date().getFullYear();
const aniosEgreso = Array.from({ length: anioActual - 1990 + 1 }, (_, i) => {
  const anio = String(anioActual - i);
  return { valor: anio, etiqueta: anio };
});

interface AvisoRegistro {
  titulo: string;
  texto: string;
}

/** Texto para el usuario según el fallo; los códigos de campo se manejan aparte. */
function avisoDeFallo(fallo: FalloRegistro): AvisoRegistro {
  const generico = {
    titulo: 'No pudimos crear la cuenta',
    texto: 'Inténtalo de nuevo en unos minutos.',
  };
  switch (fallo.tipo) {
    case 'red':
      return {
        titulo: 'Sin conexión con el servidor',
        texto: 'Revisa tu conexión e inténtalo de nuevo.',
      };
    case 'respuesta_invalida':
      return generico;
    case 'api':
      switch (fallo.codigo) {
        case 'demasiadas_peticiones':
          return {
            titulo: 'Demasiados intentos',
            texto: 'Espera un momento antes de volver a intentarlo.',
          };
        case 'conflicto':
          return {
            titulo: 'Ya estamos procesando tu registro',
            texto: 'Espera unos segundos antes de intentarlo otra vez.',
          };
        case 'validacion':
          return { titulo: 'Revisa los datos', texto: 'Hay datos que el servidor no aceptó.' };
        case 'menor_de_edad':
        case 'idempotencia_reutilizada':
        case 'error_interno':
          return generico;
      }
  }
}

export function PaginaRegistro() {
  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { isSubmitting },
  } = useForm<ValoresRegistro>({
    resolver: resolverRegistro,
    defaultValues: valoresIniciales,
    mode: 'onTouched',
  });
  const mutacion = useMutation({
    mutationFn: (datos: { entrada: auth.RegistrarTalentoEntrada; llave: string }) =>
      registrarTalento(entorno.VITE_API_URL, datos.entrada, datos.llave),
  });

  const [aviso, setAviso] = useState<AvisoRegistro | null>(null);
  const [correoRegistrado, setCorreoRegistrado] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const enviando = useRef(false);
  const llave = useRef<{ cuerpo: string; id: string } | null>(null);
  const estadoAcademico = watch('estadoAcademico');

  /** Misma llave al reintentar el mismo cuerpo; llave nueva si el usuario cambió algo. */
  function llaveDe(cuerpo: string): string {
    if (llave.current?.cuerpo !== cuerpo) llave.current = { cuerpo, id: crypto.randomUUID() };
    return llave.current.id;
  }

  const enviar = handleSubmit(async (valores) => {
    if (enviando.current) return;
    const validado = auth.RegistrarTalentoEntrada.safeParse(aCandidato(valores));
    if (!validado.success) return;

    enviando.current = true;
    setAviso(null);
    try {
      const entrada = validado.data;
      const resultado = await mutacion.mutateAsync({
        entrada,
        llave: llaveDe(JSON.stringify(entrada)),
      });
      if (resultado.ok) {
        setCorreoRegistrado(entrada.correo);
        return;
      }

      const { fallo } = resultado;
      if (fallo.tipo === 'api' && fallo.codigo === 'menor_de_edad') {
        setError('fechaNacimiento', { message: 'Debes tener 18 años o más' });
        return;
      }
      if (fallo.tipo === 'api' && fallo.codigo === 'validacion' && fallo.detalles?.length) {
        for (const detalle of fallo.detalles) {
          if (esCampoRegistro(detalle.campo)) {
            setError(detalle.campo, { message: detalle.mensaje });
          }
        }
        return;
      }
      setAviso(avisoDeFallo(fallo));
    } finally {
      enviando.current = false;
    }
  });

  if (correoRegistrado !== null) {
    return (
      <Contenedor ancho="angosto">
        <Pila espacio={16}>
          <Dato color="acento">Cuenta creada</Dato>
          <Titulo nivel={1}>Revisa tu correo</Titulo>
          <Texto color="secundario">
            Te enviamos un enlace de verificación a {correoRegistrado}. Ábrelo para activar tu
            cuenta.
          </Texto>
        </Pila>
      </Contenedor>
    );
  }

  return (
    <Contenedor ancho="medio">
      <form onSubmit={(evento) => void enviar(evento)} noValidate>
        <Pila espacio={18}>
          <Pila espacio={8}>
            <Dato color="acento">Crear cuenta</Dato>
            <Titulo nivel={1}>Empieza tu trayectoria</Titulo>
          </Pila>

          <Controller
            control={control}
            name="nombreCompleto"
            render={({ field, fieldState }) => (
              <Campo
                etiqueta="Nombre completo"
                autoComplete="name"
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
            name="correo"
            render={({ field, fieldState }) => (
              <Campo
                etiqueta="Correo electrónico"
                tipo="correo"
                autoComplete="email"
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
            name="contrasena"
            render={({ field, fieldState }) => (
              <Campo
                etiqueta="Crea una contraseña"
                tipo="contrasena"
                autoComplete="new-password"
                ayuda="Mínimo 10 caracteres."
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
            name="fechaNacimiento"
            render={({ field, fieldState }) => (
              <Campo
                etiqueta="Fecha de nacimiento"
                tipo="fecha"
                autoComplete="bday"
                ayuda="Debes tener 18 años o más."
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
            name="estadoAcademico"
            render={({ field }) => (
              <Segmentado
                etiqueta="Estado académico"
                value={field.value}
                onChange={(valor) => {
                  field.onChange(valor === 'egresado' ? 'egresado' : 'estudiante');
                }}
                opciones={[
                  { valor: 'estudiante', etiqueta: 'Estudiante' },
                  { valor: 'egresado', etiqueta: 'Egresado' },
                ]}
              />
            )}
          />
          {estadoAcademico === 'estudiante' ? (
            <Controller
              control={control}
              name="ciclo"
              render={({ field, fieldState }) => (
                <Selector
                  etiqueta="Ciclo actual"
                  opciones={ciclos}
                  value={field.value || null}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          ) : (
            <Controller
              control={control}
              name="anioEgreso"
              render={({ field, fieldState }) => (
                <Selector
                  etiqueta="Año de egreso"
                  opciones={aniosEgreso}
                  value={field.value || null}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
          )}

          <Controller
            control={control}
            name="declaracionSinExperiencia"
            render={({ field, fieldState }) => (
              <Casilla
                seleccionada={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              >
                Declaro que no tengo experiencia laboral formal en mi área. Prácticas, pasantías,
                horas sociales y voluntariado no cuentan.
              </Casilla>
            )}
          />
          <Fila>
            <Boton
              variante="fantasma"
              onPress={() => {
                setModalAbierto(true);
              }}
            >
              ¿Qué cuenta como experiencia?
            </Boton>
          </Fila>
          <Controller
            control={control}
            name="aceptaTerminos"
            render={({ field, fieldState }) => (
              <Casilla
                seleccionada={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              >
                Acepto los términos de uso.
              </Casilla>
            )}
          />

          {aviso && <AvisoError titulo={aviso.titulo}>{aviso.texto}</AvisoError>}

          <Boton type="submit" tamano="grande" anchoCompleto cargando={isSubmitting}>
            Crear cuenta
          </Boton>
        </Pila>
      </form>

      <Modal
        abierto={modalAbierto}
        onCambioAbierto={setModalAbierto}
        titulo="¿Qué cuenta como experiencia?"
        acciones={
          <Boton
            onPress={() => {
              setModalAbierto(false);
            }}
          >
            Entendido
          </Boton>
        }
      >
        <Texto color="secundario">
          Cuenta como experiencia el empleo con contrato o planilla en el área de tu formación. No
          cuentan las prácticas profesionales, las pasantías académicas, las horas sociales, el
          voluntariado, los proyectos académicos ni los trabajos freelance esporádicos: esos puedes
          mostrarlos como proyectos.
        </Texto>
      </Modal>
    </Contenedor>
  );
}
