import { z } from 'zod';

/** Los mensajes de validación que no definió el contrato salen en español. */
z.config(z.locales.es());
