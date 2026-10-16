# Asignación de tareas por persona

## Objetivo

Convertir los recordatorios en tareas asignables sin crear un módulo separado. La dueña del estudio aparece como **Victoria** y el perfil colaborador se presenta como **Asistente legal**. La primera asistente es **Briza**.

## Modelo de acceso

Cada recordatorio registra quién lo creó y a quién está asignado. Victoria puede crear una tarea privada para sí misma o asignarla a un asistente legal activo de su estudio. Victoria ve todas las tareas del estudio y puede cambiar su asignación.

Un asistente legal solamente ve y modifica las tareas asignadas a su cuenta. Toda tarea creada por un asistente queda automáticamente asignada a ese mismo asistente y es visible para Victoria. El asistente no puede elegir una tarea privada ni cambiar su responsable.

Los recordatorios existentes se asignan a Briza durante la migración para conservar la visibilidad actual. La migración debe verificar que exista una única asistente activa para el estudio antes de hacer ese traspaso.

## Datos personales mínimos

La membresía privada del estudio incorpora un nombre visible. No se guardan apellido, documento, teléfono ni otros datos personales. Los valores iniciales son:

- `estudioartiedav@gmail.com`: Victoria.
- `legalesartieda@gmail.com`: Briza.

Las cuentas nuevas deberán tener un nombre visible al recibir acceso. El correo continúa siendo la identidad de autenticación, pero no se usa como etiqueta principal en las tareas.

## Pantallas

En la creación y edición de tareas, Victoria ve el campo **Responsable** con las opciones **Solo para Victoria** y cada asistente legal activo. Briza no ve ese selector; la pantalla explica que la tarea quedará asignada a ella y será visible para Victoria.

Las listas y tarjetas muestran **Asignada a: nombre** y **Creada por: nombre**. La navegación y el resto de las funciones del perfil Asistente legal permanecen iguales.

## Seguridad

El servidor calcula la visibilidad con la membresía vigente. No confía en campos ocultos ni en datos enviados por el navegador. Al crear o editar, valida que la persona asignada sea Victoria o una asistente activa del mismo estudio.

Las lecturas de Briza filtran por su UUID de asignación. Completar, reabrir y editar repiten el mismo control. El borrado continúa reservado a Victoria. Las políticas directas de base de datos siguen negando el acceso a colaboradores; la aplicación realiza las operaciones autorizadas desde el servidor.

## Compatibilidad y pruebas

La migración es aditiva y no elimina recordatorios. Se probarán los siguientes casos:

- Victoria ve todas las tareas y puede hacerlas privadas o asignarlas.
- Briza sólo ve las asignadas a ella.
- Una tarea creada por Briza queda asignada a Briza y visible para Victoria.
- Briza no puede ocultar, reasignar ni operar una tarea ajena mediante una solicitud manipulada.
- Los recordatorios existentes continúan visibles para Briza.
- El calendario, panel, clientes y casos respetan el mismo filtro.
- Los nombres visibles aparecen sin exponer información financiera.

Antes de producción se realizará una copia verificada, se ensayará la migración sobre una restauración aislada, se ejecutarán pruebas, tipos, revisión estática, compilación y comprobaciones de navegador para ambos perfiles.
