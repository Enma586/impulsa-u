import type { ReactNode } from 'react';

function Icono({ tamano, children }: { tamano: number; children: ReactNode }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconoCheck({ tamano = 16 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M5 12l5 5 9-10" />
    </Icono>
  );
}

export function IconoOjo({ tamano = 18 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Icono>
  );
}

export function IconoOjoTachado({ tamano = 18 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <path d="M4 4l16 16" />
    </Icono>
  );
}

export function IconoChevron({ tamano = 16 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M6 9l6 6 6-6" />
    </Icono>
  );
}

export function IconoCerrar({ tamano = 18 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icono>
  );
}

export function IconoAlerta({ tamano = 18 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18h.01" />
    </Icono>
  );
}
