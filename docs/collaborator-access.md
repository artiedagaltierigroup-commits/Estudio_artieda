# Permisos del estudio

## Perfiles

| Función | Administradora | Colaborador |
| --- | --- | --- |
| Clientes y casos de su estudio | Acceso completo | Ver, crear y editar |
| Tareas y recordatorios | Acceso completo | Ver, crear, editar, completar y reabrir |
| Firmas y documentos | Acceso completo | Crear, cargar, enviar, reenviar, cancelar y descargar |
| Borrado permanente | Sí, sujeto a las reglas de cada módulo | No |
| Cobros, pagos, gastos y ahorros | Sí | No |
| Estadísticas e historial | Sí | No |
| Honorarios y medio de pago del caso | Sí | No |
| Textos libres y documentos ya existentes | Sí | Sí, según autorización expresa de la dueña |

La cuenta `estudioartiedav@gmail.com` conserva su rol y sus datos. La migración conserva el alcance individual de las demás cuentas preexistentes. No crea cuentas, invita personas ni envía correos.

## Seguridad

- `app_private.workspace_members` asigna el actor autenticado a un propietario del estudio. Las cuentas nuevas sin asignación quedan sin acceso.
- El servidor verifica la sesión con Supabase y consulta la asignación actual en cada operación. Los datos editables del usuario y las afirmaciones de rol del navegador no otorgan permisos.
- Las operaciones compartidas conservan el `user_id` de la dueña; `actor_user_id` identifica quién efectuó el cambio en el historial.
- Las consultas del colaborador seleccionan campos explícitos. No recuperan cobros ni devuelven honorarios, medios de pago, saldos o estados de deuda.
- Las acciones financieras y de eliminación exigen administradora. También están protegidas las direcciones directas y las descargas.
- Las 17 tablas de negocio conservan sus políticas por propietario y agregan una condición restrictiva de administradora para el acceso directo a Supabase. El colaborador trabaja mediante el servidor autorizado. Storage mantiene el mismo límite para los documentos de firma.
- Las notas y los PDF pueden contener importes escritos dentro de su contenido. Se comparten tal como indicó la usuaria; no se analiza ni modifica ese texto.

## Alta posterior de la persona

No hay una cuenta de colaborador de producción al entregar esta función. Cuando la dueña indique el correo:

1. Verificar la dirección y obtener autorización para crear o invitar a esa persona; no usar un correo ficticio en producción.
2. Crear o localizar su identidad en Supabase Auth por el canal administrativo. Una cuenta nueva no obtiene permisos automáticamente.
3. Verificar que no sea la dueña ni una cuenta con datos propios. Nunca reconvertir o mover una cuenta con información sin un procedimiento específico.
4. Desde una conexión administrativa del servidor, asignar el UUID confirmado a `app_private.workspace_members` con `role='COLLABORATOR'`, `owner_user_id` igual al UUID verificado de la dueña y `enabled=true`. No usar metadata editable ni abrir permisos de escritura sobre esta tabla.
5. Comprobar con la cuenta nueva los accesos operativos y la denegación de finanzas. Los registros creados deben conservar el propietario del estudio y registrar el actor.

Para suspender el acceso del colaborador, establecer `enabled=false` en su asignación y revocar sus sesiones. Las operaciones nuevas vuelven a consultar la asignación, sin esperar la renovación del token. La suspensión de la administradora también impide el acceso de sus colaboradores.

## Copias y reversión

El respaldo nativo incluye `app_private` junto con `public`, `auth`, `storage` y `drizzle`. Debe verificarse y restaurarse en una base aislada antes de cualquier cambio de permisos. Las herramientas son nativas de PostgreSQL y no dependen de Docker.

La migración `0014_workspace_roles` es aditiva: crea membresías, agrega una columna de auditoría y políticas; no actualiza ni elimina registros del negocio. Para una reversión inmediata de esta entrega, volver al despliegue anterior y conservar la migración aditiva. No borrar el esquema privado ni restaurar una copia completa sobre producción: eso podría perder operaciones posteriores. No dar de alta colaboradores mientras se opera con una versión anterior sin soporte de roles.

## Verificación

Las pruebas cubren permisos actuales, escalamiento mediante metadata, acceso directo a tablas y Storage, edición sin cambiar honorarios, relaciones entre cuentas, borrado, firmas y los dos perfiles de pantalla. Los ensayos de escritura y envío usan datos locales y correo simulado. La comprobación en producción es de salud pública, esquema y permisos; no presupone disponer de la contraseña de la dueña.
