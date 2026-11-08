import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BurbujaMensaje, CajaMensaje, ItemConversacion } from '../index';

function Caja({ alEnviar, maximo = 20 }: { alEnviar: () => void; maximo?: number }) {
  const [valor, setValor] = useState('');
  return (
    <CajaMensaje
      etiqueta="Escribe un mensaje"
      valor={valor}
      maximo={maximo}
      onCambio={setValor}
      onEnviar={alEnviar}
    />
  );
}

describe('CajaMensaje', () => {
  it('Enter envía y Shift+Enter agrega un salto de línea', async () => {
    const alEnviar = vi.fn();
    render(<Caja alEnviar={alEnviar} />);
    const campo = screen.getByRole('textbox', { name: 'Escribe un mensaje' });

    await userEvent.type(campo, 'Hola{Shift>}{Enter}{/Shift}mundo');
    expect(alEnviar).not.toHaveBeenCalled();
    expect(campo).toHaveProperty('value', 'Hola\nmundo');

    await userEvent.type(campo, '{Enter}');
    expect(alEnviar).toHaveBeenCalledOnce();
  });

  it('no envía un mensaje vacío ni uno que pasa del máximo', async () => {
    const alEnviar = vi.fn();
    render(<Caja alEnviar={alEnviar} maximo={5} />);
    const campo = screen.getByRole('textbox', { name: 'Escribe un mensaje' });
    const boton = screen.getByRole('button', { name: 'Enviar' });

    await userEvent.type(campo, '   {Enter}');
    expect(alEnviar).not.toHaveBeenCalled();
    expect(boton).toHaveProperty('disabled', true);

    await userEvent.clear(campo);
    await userEvent.type(campo, 'demasiado{Enter}');
    expect(alEnviar).not.toHaveBeenCalled();
    expect(screen.getByText('9/5')).toBeTruthy();
  });
});

describe('BurbujaMensaje', () => {
  it('un mensaje fallido lo dice con texto y permite reintentar', async () => {
    const alReintentar = vi.fn();
    render(
      <ul>
        <BurbujaMensaje
          texto="Hola"
          hora="10:00"
          propio
          estado="fallido"
          onReintentar={alReintentar}
        />
      </ul>,
    );
    expect(screen.getByText('No se envió')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(alReintentar).toHaveBeenCalledOnce();
  });

  it('el estado de un mensaje propio se muestra con texto', () => {
    render(
      <ul>
        <BurbujaMensaje texto="Hola" hora="10:00" propio estado="leido" />
      </ul>,
    );
    expect(screen.getByText('Leído')).toBeTruthy();
  });
});

describe('ItemConversacion', () => {
  it('el contador de no leídos tiene texto accesible y marca la conversación activa', () => {
    render(
      <ItemConversacion
        href="/mensajes/1"
        nombre="Ana Pérez"
        vista="Hola"
        hora="10:00"
        noLeidos={3}
        activa
      />,
    );
    const enlace = screen.getByRole('link');
    expect(enlace.textContent).toContain('3 sin leer');
    expect(enlace.getAttribute('aria-current')).toBe('page');
  });
});
