# Firmas Multiples Design

## Objetivo

Convertir el Centro de firmas de un flujo de un solo firmante a un flujo de uno o varios destinatarios en paralelo, manteniendo simple la experiencia publica: cada destinatario recibe su link, dibuja su firma una sola vez y el sistema ubica esa firma en todos los espacios asignados dentro del PDF.

## Decisiones Cerradas

- La firma es **en paralelo**: todos los destinatarios pueden recibir el correo y firmar sin esperar a otros.
- La solicitud puede tener **un solo destinatario** o varios. El flujo de un destinatario debe seguir siendo natural.
- El limite interno es 50 destinatarios. No se muestra en la UI salvo cuando se alcanza.
- Cada destinatario puede estar asociado a un cliente distinto.
- El caso se asocia a la solicitud completa, no a cada destinatario.
- Cada destinatario firma una sola vez.
- Cada destinatario puede tener uno o varios espacios de firma en el PDF.
- La pagina publica no muestra el PDF ni rectangulos. Solo muestra el mensaje, un pad de firma, boton para limpiar y boton para confirmar.
- No hay accion de rechazo. Si alguien no firma, queda pendiente.
- El PDF final se genera automaticamente solo cuando todos los destinatarios firmaron.
- Desde el detalle interno se puede generar/descargar un PDF con las firmas existentes hasta ese momento.
- Ese PDF parcial no necesita constancia especial, listado de pendientes ni cambio de estado global.
- Las solicitudes pueden cancelarse o eliminarse.

## Modelo Conceptual

### Solicitud

Representa el documento, asunto, mensaje, caso opcional, estado global y artefactos finales.

El estado global se calcula o sincroniza desde los destinatarios:

- `DRAFT`: faltan datos, documento o ubicaciones.
- `READY`: tiene documento, destinatarios y espacios validos.
- `SENT`: enviada, sin firmas aun.
- `PARTIALLY_SIGNED`: al menos un destinatario firmo y falta al menos uno.
- `SIGNED`: todos los destinatarios firmaron y el PDF final esta generado.
- `EXPIRED`: todos los destinatarios pendientes vencieron o la solicitud vencio.
- `CANCELLED`: cancelada internamente.

### Destinatario

Representa a una persona que debe firmar. Tiene su propio email, token, estado, fechas y datos de tracking.

Estados por destinatario:

- `DRAFT`
- `READY`
- `SENT`
- `EMAIL_OPENED`
- `LINK_OPENED`
- `SIGNING_STARTED`
- `SIGNED`
- `EXPIRED`
- `CANCELLED`

No existe `REJECTED`.

### Espacio de Firma

Cada espacio pertenece a un destinatario y define:

- pagina
- x/y normalizados
- ancho/alto normalizados
- color/indice visual
- orden dentro del destinatario

Un destinatario debe tener al menos un espacio antes de enviar.

### Eventos

Los eventos deben poder apuntar a:

- solicitud completa, para eventos globales;
- destinatario, para aperturas, envios, firma, reenvios y vencimientos;
- espacio de firma cuando el evento sea de ubicacion.

El timeline interno debe poder mostrar eventos agrupados por destinatario.

## Flujo Interno: Nueva Solicitud

La pantalla debe tener:

1. Documento PDF.
2. Caso opcional global.
3. Destinatarios.
4. Ubicacion de firmas por destinatario.
5. Correo.
6. Crear y enviar.

La seccion de destinatarios funciona como lista dinamica:

- arranca con un destinatario;
- boton `Agregar destinatario`;
- cada destinatario tiene nombre, apellido, email, DNI/CUIT opcional y cliente opcional;
- al seleccionar cliente, se autocompletan nombre, apellido, email y DNI/CUIT si existen;
- cada bloque muestra una etiqueta de color que se usa tambien en el PDF.

La asociacion de cliente vive dentro de cada destinatario. El caso queda fuera, como dato global de la solicitud.

## Editor de Ubicaciones

El PDF muestra todos los espacios de firma.

Comportamiento:

- se selecciona un destinatario activo;
- `Agregar espacio` crea un nuevo rectangulo para ese destinatario;
- cada destinatario tiene un color distinto;
- el rectangulo activo se distingue con borde mas fuerte y controles visibles;
- cada espacio se puede mover, redimensionar y borrar;
- se valida que cada destinatario tenga al menos un espacio.

## Flujo Publico

El link es por destinatario, no por solicitud.

La pagina publica muestra:

- titulo o asunto;
- mensaje del estudio;
- nombre del firmante;
- pad de firma;
- icono/boton para limpiar;
- boton `Confirmar y enviar firma`;
- mensaje de gracias despues de firmar.

El firmante no ve el PDF, no elige ubicacion y no ve a otros destinatarios.

Cuando firma:

1. Se guarda la imagen de firma del destinatario.
2. Se marca ese destinatario como `SIGNED`.
3. Se registra evento con fecha, IP, user-agent y hashes.
4. Si todos firmaron, se genera el PDF final con todas las firmas.
5. Si faltan firmas, la solicitud queda `PARTIALLY_SIGNED`.

## Detalle Interno

El detalle debe mostrar:

- estado global;
- progreso: firmados / total;
- tabla de destinatarios con estado individual;
- acciones por destinatario: reenviar, copiar link, ver eventos;
- acciones globales: reenviar pendientes, cancelar/eliminar, descargar PDF final si existe;
- accion manual: generar/descargar PDF con firmas actuales.

El PDF preview interno debe mostrar los espacios por color y destinatario.

## PDFs y Storage

Mientras no hayan firmado todos, hay que conservar el PDF base/original.

Cuando todos firmaron:

- se genera el PDF final;
- se guarda como firmado;
- se puede aplicar la politica de optimizacion y eliminar/reemplazar el original.

Cuando se genera manualmente un PDF con firmas actuales:

- se genera bajo demanda o se guarda como artefacto temporal;
- no cambia el estado global;
- no reemplaza al PDF final.

## Migracion

Las solicitudes existentes de un solo firmante deben migrarse a:

- una fila en `signature_recipients`;
- una fila en `signature_placements` con el rectangulo actual;
- eventos antiguos asociados al destinatario cuando sea posible.

Esto permite no perder solicitudes existentes y mantener compatibilidad.

## Riesgos

- La migracion debe preservar tokens existentes o regenerarlos con cuidado.
- El envio de mails debe pasar de un token por solicitud a un token por destinatario.
- El PDF final no debe generarse dos veces en condiciones de carrera cuando firma el ultimo destinatario.
- El estado global no debe depender solo del ultimo evento.
- Las descargas deben seguir respetando `userId`.

## Criterios de Aceptacion

- Se puede crear una solicitud con un destinatario y funciona como antes.
- Se puede crear una solicitud con varios destinatarios.
- Cada destinatario puede tener uno o varios espacios en el PDF.
- Cada destinatario recibe su propio link.
- La pagina publica solo permite firmar al destinatario del token.
- Cuando firma una persona y faltan otras, la solicitud queda parcialmente firmada.
- Cuando firman todos, se genera el PDF final con todas las firmas.
- Desde detalle se puede reenviar a todos los pendientes o a uno puntual.
- Desde detalle se puede generar PDF con las firmas existentes.
- El detalle muestra quien firmo y quien sigue pendiente.
