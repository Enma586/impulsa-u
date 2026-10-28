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

export function IconoCorazon({
  tamano = 18,
  relleno = false,
}: {
  tamano?: number;
  relleno?: boolean;
}) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill={relleno ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 21s-7-4.6-9.3-9A5.3 5.3 0 0 1 12 6.6 5.3 5.3 0 0 1 21.3 12C19 16.4 12 21 12 21z" />
    </svg>
  );
}

export function IconoCasa({ tamano = 20 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </Icono>
  );
}

export function IconoMaletin({ tamano = 20 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V4h6v3" />
    </Icono>
  );
}

export function IconoUsuario({ tamano = 20 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </Icono>
  );
}

export function IconoPapeles({ tamano = 20 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h7M9 17h7" />
    </Icono>
  );
}

export function IconoSalir({ tamano = 18 }: { tamano?: number }) {
  return (
    <Icono tamano={tamano}>
      <path d="M10 4H5v16h5" />
      <path d="M15 8l5 4-5 4" />
      <path d="M20 12H9" />
    </Icono>
  );
}
