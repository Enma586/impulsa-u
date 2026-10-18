import { tema } from './contrato.css';

/** Anillo de foco visible con el token `foco` (sección 11.7). */
export const anilloFoco = {
  outline: `2px solid ${tema.color.foco}`,
  outlineOffset: '2px',
} as const;
