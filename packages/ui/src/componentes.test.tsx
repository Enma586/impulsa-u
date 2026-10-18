import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  AvisoError,
  Avatar,
  Boton,
  Campo,
  Cargando,
  Casilla,
  Esqueleto,
  Modal,
  Pestanas,
  Segmentado,
  Selector,
} from './index';

describe('Boton', () => {
  it('llama onPress al hacer clic', async () => {
    const alPulsar = vi.fn();
    render(<Boton onPress={alPulsar}>Crear cuenta</Boton>);
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(alPulsar).toHaveBeenCalledOnce();
  });

  it('CA-01.8: mientras carga, el doble clic no repite la acción', async () => {
    const alPulsar = vi.fn();
    render(
      <Boton cargando onPress={alPulsar}>
        Crear cuenta
      </Boton>,
    );
    const boton = screen.getByRole('button', { name: 'Crear cuenta' });
    await userEvent.dblClick(boton);
    expect(alPulsar).not.toHaveBeenCalled();
    expect(boton.getAttribute('aria-disabled')).toBe('true');
  });

  it('deshabilitado no responde', async () => {
    const alPulsar = vi.fn();
    render(
      <Boton deshabilitado onPress={alPulsar}>
        Enviar
      </Boton>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(alPulsar).not.toHaveBeenCalled();
  });
});

describe('Campo', () => {
  it('asocia la etiqueta con el campo y entrega el valor escrito', async () => {
    const alCambiar = vi.fn();
    render(<Campo etiqueta="Nombre completo" onChange={alCambiar} />);
    await userEvent.type(screen.getByLabelText('Nombre completo'), 'Ana');
    expect(alCambiar).toHaveBeenLastCalledWith('Ana');
  });

  it('CA-01.9: muestra el error y lo vincula al campo con aria-describedby', () => {
    render(
      <Campo
        etiqueta="Crea una contraseña"
        tipo="contrasena"
        error="La contraseña debe tener al menos 10 caracteres"
      />,
    );
    const campo = screen.getByLabelText('Crea una contraseña');
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    const ids = (campo.getAttribute('aria-describedby') ?? '').split(' ');
    const textos = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    expect(textos).toContain('al menos 10 caracteres');
  });

  it('usa el tipo fecha nativo y muestra la ayuda', () => {
    render(
      <Campo etiqueta="Fecha de nacimiento" tipo="fecha" ayuda="Debes tener 18 años o más." />,
    );
    expect(screen.getByLabelText('Fecha de nacimiento').getAttribute('type')).toBe('date');
    expect(screen.getByText('Debes tener 18 años o más.')).toBeTruthy();
  });

  it('alterna la visibilidad de la contraseña', async () => {
    render(<Campo etiqueta="Contraseña" tipo="contrasena" />);
    const campo = screen.getByLabelText('Contraseña');
    expect(campo.getAttribute('type')).toBe('password');
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(campo.getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeTruthy();
  });
});

describe('Casilla', () => {
  it('CA-01.3: muestra su error hasta marcarla, con clic o teclado', async () => {
    const mensaje = 'Debes aceptar la declaración de cero experiencia';
    function Declaracion() {
      const [marcada, setMarcada] = useState(false);
      return (
        <Casilla seleccionada={marcada} onChange={setMarcada} error={marcada ? '' : mensaje}>
          Declaro que no tengo experiencia laboral formal
        </Casilla>
      );
    }
    render(<Declaracion />);
    const casilla = screen.getByRole('checkbox', { name: /Declaro que no tengo experiencia/ });
    expect(screen.getByText(mensaje)).toBeTruthy();
    casilla.focus();
    await userEvent.keyboard(' ');
    expect(casilla).toHaveProperty('checked', true);
    expect(screen.queryByText(mensaje)).toBeNull();
  });
});

describe('Segmentado', () => {
  it('CA-01.4: elige estudiante o egresado con clic y flechas', async () => {
    function Estado() {
      const [valor, setValor] = useState('estudiante');
      return (
        <>
          <Segmentado
            etiqueta="Estado académico"
            value={valor}
            onChange={setValor}
            opciones={[
              { valor: 'estudiante', etiqueta: 'Estudiante' },
              { valor: 'egresado', etiqueta: 'Egresado' },
            ]}
          />
          <output data-testid="valor">{valor}</output>
        </>
      );
    }
    render(<Estado />);
    await userEvent.click(screen.getByRole('radio', { name: 'Egresado' }));
    expect(screen.getByTestId('valor').textContent).toBe('egresado');
    screen.getByRole('radio', { name: 'Egresado' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByTestId('valor').textContent).toBe('estudiante');
  });
});

describe('Selector', () => {
  it('abre la lista y entrega la opción elegida', async () => {
    const alCambiar = vi.fn();
    render(
      <Selector
        etiqueta="Ciclo"
        onChange={alCambiar}
        opciones={[
          { valor: '1', etiqueta: 'Ciclo 1' },
          { valor: '2', etiqueta: 'Ciclo 2' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Ciclo/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Ciclo 2' }));
    expect(alCambiar).toHaveBeenCalledWith('2');
  });
});

describe('Pestanas', () => {
  it('cambia de panel con clic', async () => {
    render(
      <Pestanas
        etiquetaAria="Secciones"
        pestanas={[
          { id: 'a', etiqueta: 'Proyectos', contenido: <p>Lista de proyectos</p> },
          { id: 'b', etiqueta: 'Avales', contenido: <p>Lista de avales</p> },
        ]}
      />,
    );
    expect(screen.getByText('Lista de proyectos')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Avales' }));
    expect(screen.getByText('Lista de avales')).toBeTruthy();
    expect(screen.queryByText('Lista de proyectos')).toBeNull();
  });
});

describe('Modal', () => {
  it('muestra el título como nombre accesible y cierra con Escape', async () => {
    const alCambiar = vi.fn();
    render(
      <Modal abierto onCambioAbierto={alCambiar} titulo="¿Qué cuenta como experiencia?">
        Contenido
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: '¿Qué cuenta como experiencia?' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(alCambiar).toHaveBeenCalledWith(false);
  });

  it('no renderiza nada si está cerrado', () => {
    render(
      <Modal abierto={false} onCambioAbierto={() => undefined} titulo="Oculto">
        x
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('Estados y datos', () => {
  it('Cargando marca aria-busy y anuncia el estado', () => {
    render(
      <Cargando>
        <Esqueleto forma="bloque" />
      </Cargando>,
    );
    const region = screen.getByRole('status');
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.textContent).toContain('Cargando');
  });

  it('AvisoError es una alerta con título y texto', () => {
    render(<AvisoError titulo="No se pudo crear la cuenta">Inténtalo de nuevo.</AvisoError>);
    expect(screen.getByRole('alert').textContent).toContain('No se pudo crear la cuenta');
  });

  it('Avatar usa iniciales y nombre accesible', () => {
    render(<Avatar nombre="María López" />);
    expect(screen.getByRole('img', { name: 'María López' }).textContent).toBe('ML');
  });
});
