# ImpulsaU — Criterios de aceptación: módulo `auth`

> **Versión:** 1.0 (fase 0) · **Fecha:** 3 de octubre de 2026
> **Base:** autenticación con Supabase Auth (especificación técnica, sección 20.3)
> **Formato:** Dado / Cuando / Entonces. Cada criterio tiene un identificador (`CA-xx.y`) que debe aparecer en el nombre de su prueba.

---

## Reglas comunes a todo el módulo

| ID | Regla |
|---|---|
| CA-00.1 | Todos los formularios se validan con los esquemas del contrato tanto en el frontend como en el backend; el backend nunca confía en la validación del navegador |
| CA-00.2 | Los mensajes de error **no revelan** si un correo existe o no en la plataforma |
| CA-00.3 | Registro, inicio de sesión y recuperación tienen límite de intentos por IP y por correo; al superarlo se responde `429` con un mensaje amable y tiempo de espera |
| CA-00.4 | Todas las pantallas del módulo cumplen accesibilidad AA (etiquetas en campos, foco visible, navegación con teclado) |
| CA-00.5 | La llave `service_role` de Supabase nunca llega al navegador |

---

## CU-01 · Registrarse como Talento

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-01.1 | Un visitante con datos válidos, 18 años o más, que marcó la declaración de cero experiencia | Envía el formulario | Se crea la cuenta en Supabase Auth y el perfil en `usuarios` y `talentos` con estado `pendiente_verificacion`; ve una pantalla que le pide revisar su correo |
| CA-01.2 | Un visitante menor de 18 años | Envía el formulario | El registro se rechaza con el mensaje "Debes tener 18 años o más"; no se crea nada en Supabase ni en la base |
| CA-01.3 | Un visitante que **no** marcó la declaración | Intenta enviar | El botón no envía y el campo muestra el error; si se fuerza la petición, el backend la rechaza con `422` |
| CA-01.4 | Estado académico "Estudiante" | Envía sin ciclo | Error de validación en el campo ciclo |
| CA-01.5 | Estado académico "Egresado" | Envía sin año de egreso | Error de validación en el campo año |
| CA-01.6 | Un correo que ya está registrado | Envía el formulario | Ve el mismo mensaje que en un registro exitoso ("Revisa tu correo"), sin revelar que la cuenta existe |
| CA-01.7 | Supabase crea la cuenta pero falla la creación del perfil | — | El backend elimina la cuenta de Auth (compensación) y responde un error genérico; no queda una cuenta huérfana |
| CA-01.8 | El usuario hace doble clic en "Crear cuenta" | — | Se crea una sola cuenta (llave de idempotencia) |
| CA-01.9 | Una contraseña de menos de 10 caracteres | Envía | Error de validación con los requisitos visibles |

## CU-02 · Registrarse como Empresa

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-02.1 | Datos válidos de empresa | Envía el formulario | Se crea la cuenta con rol `empresa` y estado de verificación `sin_solicitar`; tras confirmar el correo, ve la invitación a verificar la empresa |
| CA-02.2 | Marca "Somos una agencia de reclutamiento" | Envía sin declarar la empresa cliente | Error de validación |
| CA-02.3 | Una empresa registrada pero no verificada | Intenta publicar una vacante o mostrar interés | La acción está deshabilitada con el aviso "Verifica tu empresa para continuar" |

## CU-03 · Registrarse como Docente

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-03.1 | Un correo con un dominio institucional aprobado | Envía el formulario | Se crea la cuenta con rol `docente` vinculada a su institución |
| CA-03.2 | Un correo con un dominio no aprobado | Envía el formulario | Se rechaza con "Usa tu correo institucional"; se ofrece un enlace para solicitar la aprobación del dominio |

## CU-04 · Verificar correo

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-04.1 | Un usuario recién registrado | Abre el enlace del correo de verificación | Su cuenta pasa a `activo` y entra a completar su perfil |
| CA-04.2 | Un enlace vencido o ya usado | Lo abre | Ve "Este enlace ya no es válido" y un botón para reenviar el correo |
| CA-04.3 | Un usuario sin verificar | Intenta iniciar sesión | Ve "Confirma tu correo para continuar" con la opción de reenviarlo |
| CA-04.4 | Un usuario pide reenviar el correo varias veces seguidas | — | Se aplica un tiempo de espera entre reenvíos, visible en el botón |
| CA-04.5 | El correo de verificación | Llega al usuario | Está en español, con la identidad de ImpulsaU, y no cae en spam en Gmail ni Outlook (dominio con SPF y DKIM) |

## CU-05 · Iniciar sesión

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-05.1 | Credenciales correctas de una cuenta activa | Inicia sesión | Entra a la pantalla principal de su rol: Explorar (talento), Talento (empresa), Solicitudes (docente) o Moderación (admin) |
| CA-05.2 | Credenciales incorrectas | Inicia sesión | Ve "Correo o contraseña incorrectos" (sin indicar cuál) |
| CA-05.3 | Una cuenta suspendida | Inicia sesión | Ve "Tu cuenta está suspendida" con un medio de contacto |
| CA-05.4 | Marcó "Mantener sesión iniciada" | Cierra y vuelve a abrir el navegador | Sigue con la sesión iniciada |
| CA-05.5 | Una cuenta creada directamente en Supabase, sin perfil en ImpulsaU | Intenta usar cualquier función | El backend responde `403` y la app muestra "Completa tu registro"; el job de limpieza la elimina después de 24 horas |
| CA-05.6 | Una cuenta con primer empleo marcado | Inicia sesión | Entra normalmente, pero su perfil aparece como "Primer empleo conseguido" y no figura en búsquedas |

## CU-06 · Cerrar sesión

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-06.1 | Un usuario con sesión iniciada | Cierra sesión | Vuelve a la pantalla de inicio de sesión; las pantallas privadas ya no son accesibles con "atrás" del navegador |
| CA-06.2 | Un usuario con sesión en dos dispositivos | Elige "Cerrar sesión en todos los dispositivos" | En el otro dispositivo, la siguiente acción lo lleva al inicio de sesión |
| CA-06.3 | Un usuario con el chat abierto | Cierra sesión | Su conexión de Socket.IO se cierra |

## CU-07 · Renovar la sesión

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-07.1 | Un usuario activo cuyo token de acceso venció | Hace cualquier acción | La sesión se renueva sola y la acción se completa sin interrupción |
| CA-07.2 | Dos pestañas abiertas con la sesión | El token vence | Ambas siguen funcionando, sin cerrarse la sesión en ninguna |
| CA-07.3 | La sesión no se puede renovar (revocada o vencida por completo) | Hace una acción | Va al inicio de sesión con el aviso "Tu sesión terminó" y, tras entrar, vuelve a la pantalla donde estaba |
| CA-07.4 | El socket del chat | El token se renueva | El socket sigue conectado o se reconecta solo con el token nuevo, sin perder mensajes |

## CU-08 · Recuperar contraseña

| ID | Dado | Cuando | Entonces |
|---|---|---|---|
| CA-08.1 | Cualquier correo (exista o no) | Solicita recuperar la contraseña | Ve siempre "Si el correo está registrado, te enviamos un enlace" |
| CA-08.2 | Un usuario registrado | Abre el enlace de recuperación | Puede definir una contraseña nueva que cumpla los requisitos |
| CA-08.3 | Cambió la contraseña | — | Sus otras sesiones se cierran y debe volver a entrar en los demás dispositivos |
| CA-08.4 | Un enlace de recuperación vencido o usado | Lo abre | Ve "Este enlace ya no es válido" y puede pedir uno nuevo |

---

## Fuera del alcance de este módulo

- Inicio de sesión con Google u otros proveedores (posible mejora futura).
- Autenticación en dos pasos para usuarios finales.
- Cambio de correo electrónico (P3).

## Cómo se prueban

| Tipo de prueba | Criterios |
|---|---|
| Unitarias del caso de uso `Registrarse` | CA-01.2 a CA-01.5, CA-01.7, CA-01.9, CA-02.2, CA-03.2 |
| Integración (backend + Supabase dev) | CA-01.1, CA-01.6, CA-01.8, CA-05.5, CA-00.3 |
| E2E con Playwright | CA-01.1, CA-04.1, CA-05.1, CA-05.2, CA-06.1, CA-06.2, CA-07.2, CA-08.2 |
| Revisión manual en el preview | CA-04.5 (correo real en Gmail y Outlook) |
