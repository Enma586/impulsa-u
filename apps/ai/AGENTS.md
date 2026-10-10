# apps/ai

Servicio de IA propio (NestJS + node-llama-cpp + Transformers.js), mismas convenciones que el backend. Sin APIs externas de IA.

- Toda respuesta del modelo se valida con Zod antes de salir.
- Se autentica con `AI_SERVICE_TOKEN`.
