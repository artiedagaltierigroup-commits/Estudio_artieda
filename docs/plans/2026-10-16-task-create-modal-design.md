# Diseño: alta de tareas en ventana modal

## Objetivo

Liberar espacio en la pantalla de Tareas y mantener completo el formulario existente de alta rápida.

## Interacción

- El encabezado de Tareas muestra un botón primario `Nueva tarea` con el icono `+` a la derecha.
- Al activarlo se abre una ventana modal centrada.
- La ventana conserva título, fecha y hora, asignación, prioridad, cliente, caso y descripción.
- La ventana se puede cerrar con la `X`, el botón `Cancelar`, Escape o un clic fuera del contenido.
- Al guardar, se conserva la acción actual: se crea la tarea y se vuelve a `/recordatorios`, mostrando la lista actualizada.
- En pantallas pequeñas, la ventana usa casi toda la altura disponible y permite desplazarse internamente.

## Cambios en la pantalla

- Se elimina el formulario fijo `Alta rápida`.
- Se elimina completamente el bloque `Criterio / Como leer el panel`.
- Las métricas y las listas de tareas pendientes y resueltas mantienen su comportamiento actual.

## Implementación

El formulario se moverá a un componente cliente dedicado que controla la apertura de un diálogo accesible de Radix UI. La página de servidor seguirá cargando permisos y referencias y conservará la misma acción de servidor para crear la tarea.

## Verificación

- Prueba automatizada del contenido y los controles del diálogo para Victoria y Briza.
- Prueba de la página para confirmar que el botón está en el encabezado y que ya no aparecen los bloques fijos.
- Comprobación manual en escritorio y celular.
- Ejecución de pruebas, tipos, lint y compilación antes de desplegar.
