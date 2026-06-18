# Eliminar Casos Design

## Contexto

El sistema ya permite borrar algunas entidades, pero los casos no tienen una accion de eliminacion disponible. La necesidad concreta es resolver duplicados creados por error: el usuario quiere eliminar un caso y que deje de impactar en el sistema.

## Decision

Usaremos borrado definitivo para casos. Al eliminar un caso, se borra la fila de `cases`. Por las relaciones existentes, los cobros asociados se eliminan en cascada y sus pagos tambien se eliminan en cascada. Los recordatorios y solicitudes de firma vinculados al caso conservan su registro, pero quedan sin relacion con ese caso porque sus claves foraneas usan `onDelete: "set null"`.

## Experiencia de usuario

La accion aparecera como "Eliminar" en el detalle del caso. Antes de ejecutar, el sistema mostrara una confirmacion clara indicando que la accion no se puede deshacer y que tambien se eliminaran los cobros y pagos asociados. Al confirmar, el usuario volvera a `/casos` y el caso dejara de verse en listados, cliente, cobros, dashboard y estadisticas por haber sido eliminado definitivamente.

## Backend

Se agregara una accion `deleteCase(id: string)` en `src/actions/cases.ts`. La accion validara el usuario autenticado, buscara el caso por `id` y `userId`, devolvera error si no existe, registrara actividad con los datos del caso eliminado y luego ejecutara el borrado. Despues revalidara las rutas afectadas: `/casos`, `/clientes/{clientId}`, `/cobros`, `/`, `/estadisticas` y, si aplica, la ruta del caso.

## Frontend

Se agregara un componente cliente pequeno para manejar la confirmacion y llamada a la accion de servidor. El detalle del caso lo renderizara como accion destructiva secundaria, usando icono de papelera y texto explicito.

## Testing

Se agregaran pruebas focalizadas para la accion de servidor. Deben cubrir que no se borra un caso inexistente o ajeno, que se borra el caso correcto, que se registra actividad y que se revalidan las rutas principales. Tambien se hara una verificacion manual minima de la pantalla del detalle para confirmar que el usuario puede ejecutar el flujo.
