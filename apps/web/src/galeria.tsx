import {
  AvisoError,
  Avatar,
  Boton,
  Campo,
  Cargando,
  Casilla,
  Contenedor,
  Dato,
  Esqueleto,
  Fila,
  Grilla,
  Insignia,
  Modal,
  Pestanas,
  Pila,
  ProveedorTema,
  Segmentado,
  Selector,
  Separador,
  Tarjeta,
  Texto,
  Titulo,
  type NombreTema,
} from '@impulsau/ui';
import { useState } from 'react';

/** Catálogo de los componentes de packages/ui, para revisarlos en ambos temas. */
export function Galeria() {
  const [tema, setTema] = useState<NombreTema>('oscuro');
  const [estado, setEstado] = useState('estudiante');
  const [declaracion, setDeclaracion] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  return (
    <ProveedorTema tema={tema}>
      <Contenedor ancho="ancho">
        <Pila espacio={32}>
          <Pila espacio={8}>
            <Dato color="acento">Sistema de diseño</Dato>
            <Titulo nivel={1}>Componentes</Titulo>
            <Segmentado
              etiqueta="Tema"
              value={tema}
              onChange={(valor) => {
                setTema(valor === 'claro' ? 'claro' : 'oscuro');
              }}
              opciones={[
                { valor: 'oscuro', etiqueta: 'Oscuro' },
                { valor: 'claro', etiqueta: 'Claro' },
              ]}
            />
          </Pila>

          <Pila espacio={12}>
            <Dato>Botones</Dato>
            <Fila espacio={10} alinear="centro">
              <Boton>Crear cuenta</Boton>
              <Boton variante="secundario">Ver cambios</Boton>
              <Boton variante="fantasma">Cancelar</Boton>
              <Boton variante="advertencia">Reintentar en 20 s</Boton>
              <Boton cargando>Enviando</Boton>
              <Boton deshabilitado>Deshabilitado</Boton>
            </Fila>
          </Pila>

          <Separador />

          <Pila espacio={14}>
            <Dato>Formulario</Dato>
            <Grilla columnas={2} espacio={14}>
              <Campo etiqueta="Nombre completo" defaultValue="María López" />
              <Campo
                etiqueta="Correo electrónico"
                tipo="correo"
                defaultValue="maria.lopez@correo.com"
              />
              <Campo etiqueta="Crea una contraseña" tipo="contrasena" defaultValue="0123456789" />
              <Campo
                etiqueta="Fecha de nacimiento"
                tipo="fecha"
                ayuda="Debes tener 18 años o más."
              />
              <Campo
                etiqueta="Contraseña con error"
                tipo="contrasena"
                error="La contraseña debe tener al menos 10 caracteres"
              />
              <Selector
                etiqueta="Ciclo"
                opciones={[
                  { valor: '1', etiqueta: 'Ciclo 1' },
                  { valor: '2', etiqueta: 'Ciclo 2' },
                ]}
              />
            </Grilla>
            <Segmentado
              etiqueta="Estado académico"
              value={estado}
              onChange={setEstado}
              opciones={[
                { valor: 'estudiante', etiqueta: 'Estudiante' },
                { valor: 'egresado', etiqueta: 'Egresado' },
              ]}
            />
            <Casilla
              seleccionada={declaracion}
              onChange={setDeclaracion}
              error={declaracion ? '' : 'Debes aceptar la declaración de cero experiencia'}
            >
              Declaro que no tengo experiencia laboral formal en mi área.
            </Casilla>
            <AvisoError titulo="No pudimos crear la cuenta">
              Inténtalo de nuevo en unos minutos.
            </AvisoError>
          </Pila>

          <Separador />

          <Pila espacio={12}>
            <Dato>Datos</Dato>
            <Fila espacio={8} alinear="centro">
              <Insignia>Neutro</Insignia>
              <Insignia tono="logro">Logro</Insignia>
              <Insignia tono="falta">Falta</Insignia>
              <Insignia tono="aval">Aval docente</Insignia>
              <Avatar nombre="María López" tamano="pequeno" />
              <Avatar nombre="María López" />
              <Avatar nombre="María López" tamano="grande" />
            </Fila>
          </Pila>

          <Grilla columnas={2} espacio={16}>
            <Tarjeta corte="grande">
              <Pila espacio={8}>
                <Dato>Tarjeta con corte</Dato>
                <Titulo nivel={3} tamano="pequeno">
                  Proyecto con evidencia
                </Titulo>
                <Texto color="secundario">Esquina cortada de 36 px.</Texto>
              </Pila>
            </Tarjeta>
            <Tarjeta elevada>
              <Pila espacio={8}>
                <Dato>Tarjeta elevada</Dato>
                <Texto>Superficie elevada sin corte.</Texto>
              </Pila>
            </Tarjeta>
          </Grilla>

          <Pestanas
            etiquetaAria="Secciones de ejemplo"
            pestanas={[
              {
                id: 'proyectos',
                etiqueta: 'Proyectos',
                contenido: <Texto>Panel de proyectos.</Texto>,
              },
              { id: 'avales', etiqueta: 'Avales', contenido: <Texto>Panel de avales.</Texto> },
            ]}
          />

          <Cargando>
            <Tarjeta>
              <Pila espacio={10}>
                <Fila espacio={12} alinear="centro">
                  <Esqueleto forma="circulo" />
                  <Esqueleto ancho="mitad" />
                </Fila>
                <Esqueleto forma="titulo" ancho="tresCuartos" />
                <Esqueleto forma="bloque" />
              </Pila>
            </Tarjeta>
          </Cargando>

          <Fila>
            <Boton
              variante="secundario"
              onPress={() => {
                setModalAbierto(true);
              }}
            >
              Abrir modal
            </Boton>
          </Fila>
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
              Las prácticas, pasantías, horas sociales y el voluntariado no cuentan como experiencia
              laboral formal.
            </Texto>
          </Modal>
        </Pila>
      </Contenedor>
    </ProveedorTema>
  );
}
