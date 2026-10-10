import { Reflector } from '@nestjs/core';

export const MarcaPublica = Reflector.createDecorator<boolean>();

/** Marca una ruta (o un controlador) como accesible sin token. */
export const Publica = () => MarcaPublica(true);
