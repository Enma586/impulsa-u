import { auth } from '@impulsau/contracts';
import {
  AvisoError,
  Boton,
  Campo,
  Casilla,
  Contenedor,
  Dato,
  Enlace,
  Pila,
  Texto,
  Titulo,
} from '@impulsau/ui';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ErrorDeApi, mensajeDeError } from '../../../api/cliente';
import { crearResolver } from '../../../compartido/resolver';
import { registrarEmpresa } from '../../../sesion/acciones';

interface ValoresEmpresa {
  nombreComercial: string;
  correo: string;
  contrasena: string;
  esAgencia: boolean;
  clienteDeclarado: string;
  aceptaTerminos: boolean;
}

const CAMPOS: readonly string[] = [
  'nombreComercial',
  'correo',
  'contrasena',
  'esAgencia',
  'clienteDeclarado',
  'aceptaTerminos',
];

function aCandidato(v: ValoresEmpresa): Record<string, unknown> {
  return {
    nombreComercial: v.nombreComercial,
    correo: v.correo,
    contrasena: v.contrasena,
    esAgencia: v.esAgencia,
    ...(v.esAgencia && v.clienteDeclarado !== '' ? { clienteDeclarado: v.clienteDeclarado } : {}),
    aceptaTerminos: v.aceptaTerminos,
  };
}

const resolver = crearResolver<ValoresEmpresa>(
  auth.RegistrarEmpresaEntrada,
  aCandidato,
  (campo): campo is keyof ValoresEmpresa => CAMPOS.includes(campo),
);

export function PaginaRegistroEmpresa() {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<ValoresEmpresa>({
    resolver,
    defaultValues: {
      nombreComercial: '',
      correo: '',
      contrasena: '',
      esAgencia: false,
      clienteDeclarado: '',
      aceptaTerminos: false,
    },
    mode: 'onTouched',
  });
  const [aviso, setAviso] = useState<string | null>(null);
  const [correoRegistrado, setCorreoRegistrado] = useState<string | null>(null);
  const llave = useRef<{ cuerpo: string; id: string } | null>(null);
  const esAgencia = watch('esAgencia');

  const enviar = handleSubmit(async (valores) => {
    const validado = auth.RegistrarEmpresaEntrada.safeParse(aCandidato(valores));
    if (!validado.success) return;
    setAviso(null);

    const cuerpo = JSON.stringify(validado.data);
    if (llave.current?.cuerpo !== cuerpo) llave.current = { cuerpo, id: crypto.randomUUID() };
    try {
      await registrarEmpresa(validado.data, llave.current.id);
      setCorreoRegistrado(validado.data.correo);
    } catch (error: unknown) {
      setAviso(
        error instanceof ErrorDeApi && error.codigo === 'demasiadas_peticiones'
          ? 'Demasiados intentos. Espera un momento antes de volver a intentarlo.'
          : mensajeDeError(error),
      );
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
            cuenta y luego <Enlace href="/login">inicia sesión</Enlace>.
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
            <Dato color="acento">Crear cuenta de empresa</Dato>
            <Titulo nivel={1}>Encuentra talento con evidencia</Titulo>
          </Pila>

          <Controller
            control={control}
            name="nombreComercial"
            render={({ field, fieldState }) => (
              <Campo
                etiqueta="Nombre comercial"
                autoComplete="organization"
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
            name="esAgencia"
            render={({ field }) => (
              <Casilla seleccionada={field.value} onChange={field.onChange}>
                Soy una agencia de reclutamiento y publico vacantes para otra empresa.
              </Casilla>
            )}
          />
          {esAgencia && (
            <Controller
              control={control}
              name="clienteDeclarado"
              render={({ field, fieldState }) => (
                <Campo
                  etiqueta="¿Para qué empresa reclutas?"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  refInput={field.ref}
                  error={fieldState.error?.message}
                />
              )}
            />
          )}
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

          {aviso && <AvisoError titulo="No pudimos crear la cuenta">{aviso}</AvisoError>}

          <Boton type="submit" tamano="grande" anchoCompleto cargando={isSubmitting}>
            Crear cuenta de empresa
          </Boton>
          <Texto color="secundario">
            ¿Ya tienes cuenta? <Enlace href="/login">Inicia sesión</Enlace>
          </Texto>
        </Pila>
      </form>
    </Contenedor>
  );
}
