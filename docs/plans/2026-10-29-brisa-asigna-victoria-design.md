# Brisa asigna tareas a Victoria — diseño

## Regla aprobada

Brisa puede crear y editar tareas asignadas a sí misma o a Victoria. Brisa puede ver y modificar las tareas que creó ella, cualquiera sea la persona asignada, y las tareas que Victoria le asignó a Brisa. No puede ver tareas creadas por Victoria para Victoria. Victoria ve y edita todas las tareas de su estudio.

## Interfaz y datos

El alta y la edición muestran «Asignar a» con Brisa y Victoria para Brisa. El alta mantiene Brisa como valor inicial. El identificador de Victoria se representa como asignación nula, igual que las tareas privadas actuales de Victoria; la visibilidad de Brisa se determina por `createdByUserId` o `assigneeUserId`. La base de datos ya guarda ambos campos, por lo que no se requiere migración.

## Autorización

El servidor valida que una colaboradora activa solo seleccione su propio usuario o la dueña. La lista, las vistas anidadas de cliente/caso y las operaciones de editar, resolver y reabrir restringen a Brisa a filas que creó o que tiene asignadas, además del estudio propietario. La actualización en SQL repite esa condición para evitar carreras o accesos directos. Victoria conserva acceso completo.

## Verificación

Pruebas de visibilidad y asignación por rol, formularios de alta/edición y operaciones protegidas. Comprobación de tipos, pruebas relevantes y compilación de producción. No se alteran tareas existentes ni se requiere una copia de base de datos para este cambio de código.
