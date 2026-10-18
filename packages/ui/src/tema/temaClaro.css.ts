import { createTheme } from '@vanilla-extract/css';
import { tema } from './contrato.css';
import { familias, valoresClaro } from './valores';

export const temaClaro = createTheme(tema, { color: valoresClaro, fuente: familias });
