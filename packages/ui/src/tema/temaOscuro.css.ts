import { createTheme } from '@vanilla-extract/css';
import { tema } from './contrato.css';
import { familias, valoresOscuro } from './valores';

export const temaOscuro = createTheme(tema, { color: valoresOscuro, fuente: familias });
