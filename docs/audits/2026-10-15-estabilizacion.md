# Estabilización de cobros, firmas y operaciones

Trabajo iniciado el 15/10/2026, horario de Argentina. Este informe complementa la auditoría integral y los anexos de cobros, firmas y acceso a archivos. El registro de publicación al final distingue el código comprobado de lo que está efectivamente activo.

## Resultado comprobado

Se corrigieron las carreras de cobros y recurrentes, los reintentos que duplicaban operaciones, las transiciones y archivos de firmas, las relaciones entre propietarios, los cálculos y fechas señalados, las tareas protegidas y las pantallas afectadas. El respaldo local ya funciona sin Docker. No se conciliaron registros históricos ni se habilitaron usuarios nuevos.

La preparación de la aplicación parte del commit realmente desplegado, `8eb56384f69f92cd36aba665ddcbd68f428bb041`. Los cambios locales preexistentes, incluida una función de borrado de casos aún no publicada, quedaron fuera de esta entrega.

## Estado por hallazgo

| Hallazgo | Corrección y alcance |
|---|---|
| A01 | Protección de las cinco tablas ya aplicada en la intervención anterior. Se mantiene; 115 pruebas de permisos documentadas en el informe de cierre. |
| A02 | Copia nueva verificada y restaurada; tarea semanal reparada y ejecutada con éxito utilizando PostgreSQL nativo. Sigue requiriendo la sesión de Windows y el disco J: disponibles. |
| A03 | Destino, contenido y runtime restringidos a la cuenta actual, SYSTEM y Administradores. Los objetos nuevos se copian independientemente, sin enlaces físicos. No acredita cifrado del disco ni copia externa. |
| A04 | Next actualizado de 15.1.11 a 15.5.28 y dependencias compatibles actualizadas. Auditoría restante: 0 críticos, 5 altos y 3 moderados; el árbol de herramientas de Tailwind/PostCSS requiere una actualización mayor independiente. |
| A05 | Validación del propietario en casos, cobros y recordatorios, y filtrado de relaciones al leer. Pruebas PostgreSQL con dos identidades. |
| A06 | Auditoría interna y sincronización global separadas de acciones invocables desde navegador; módulos exclusivos del servidor. |
| A07 | Pagos y cambios del cobro comparten transacción y bloqueo. Se recalcula el saldo dentro de la operación. Reintentos de pago y alta de cobro usan identificadores estables. |
| A08 | Generación de ocurrencia, gasto y actividad atómica, coordinada por bloqueo. Cambiar un recurrente automático ya realizado a «por pagar» tampoco genera otro gasto. |
| A09 | Expiración, lectura pública y seguimiento de correo conservan las firmas finalizadas, incluso frente a operaciones simultáneas. |
| A10 | Documento y posiciones inmutables desde el envío; aceptación vinculada al hash exacto. Se conserva el original y se comprueba antes de generar el final. |
| A11 | PNG decodificado y limitado antes de aceptar. El PDF final se genera y guarda antes de confirmar la firma. Fallos permiten reintento; una aceptación confirmada no se duplica. |
| A12–A13 | Caja y proyección pendientes separadas, sin descontar dos veces recurrentes. La deuda se calcula sobre los mismos cobros, incluidos anticipos de otro mes. |
| A14 | Anulación conjunta de gasto y ocurrencia mediante estado CANCELLED. No se regenera automáticamente; reapertura explícita. La corrección no modifica los cinco casos históricos detectados. |
| A15–A16 | Importes finitos con dos decimales y cálculos en centavos. No se permite reducir un cobro por debajo de lo pagado. |
| A17 | Conservación del día ancla de recurrencias y calendario de Argentina, también en pagos iniciales y vencimientos después de las 21:00. |
| A18 | Lista permitida de eventos públicos: no puede inventarse un evento de firma desde el navegador. |
| A19 | Los cron llegan a sus validadores y exigen Bearer exacto y secreto configurado. No se ejecutan sin autorización. |
| A20 | Metadatos de migración reconciliados con las cinco columnas y el índice ya existentes; la siguiente migración no vuelve a crearlos. |
| A21 | Verificación de hashes antes y después de reutilizar un objeto; contraste final de tamaños e inventario. Copia semanal existente sólo se reutiliza si pasa verificación. |
| A22 | Límite coherente de PDF de 3 MiB, comprobado en cliente y servidor; petición configurada en 4 MiB. |
| A23 | Retirada la opción «Recordarme» que no cumplía su promesa; aviso de cierre de sesión en equipos compartidos. |
| A24 | Calendario móvil ajustado; ambos controles de mes visibles a 390 px. |
| A25 | Visor cargado sólo en navegador y ajuste preciso de PDF.js para Webpack. Se cargó y visualizó un PDF sintético sin errores de consola. |

Hallazgo adicional: las rutas guardadas en una fila propia no bastaban para autorizar una descarga administrativa. Ahora cada objeto debe pertenecer al usuario y a la solicitud autorizados. Se verificaron los 19 vínculos existentes en la copia restaurada: todos cumplen el formato admitido, incluida la compatibilidad histórica.

## Respaldo y cambio de base

Copia previa a esta intervención: `J:\Trabajo\Estudio Ariteda\Sistema\Copias de seguirdad\Manuales\2026-10-15_pre-estabilizacion\backup`, creada el 15/10 a las 22:58 de Argentina. Se comprobaron 53 hashes de artefactos y 16 objetos de Storage (1.698.171 bytes), inventarios estables y lectura completa del archivo PostgreSQL. La restauración local recuperó las 53 tablas con todos los conteos coincidentes. Es una prueba de restauración de base y archivos; no simula todos los servicios de Supabase.

El runtime instalado en `C:\ProgramData\EstudioArtieda\Backup` utiliza herramientas PostgreSQL 17.11. Se conservaron exactamente los secretos protegidos y la definición de la tarea «Estudio Artieda - Copia semanal». Su ejecución real del 15/10 a las 23:30 terminó con código 0. Próxima ejecución: domingo 18/10 a las 20:00. Carpeta de esa copia: `J:\Trabajo\Estudio Ariteda\Sistema\Copias de seguirdad\2026-10 Octubre\2026-10-05 al 2026-10-11`. El nombre identifica la semana; los datos se capturaron al ejecutar la tarea.

Docker no fue reparado ni es necesario para este respaldo. No se modificaron servicios de Windows. El instalador también elimina, sin seguirlo ni borrar su destino, un enlace heredado incorrecto que apuntaba desde las dependencias del respaldo a ProgramData.

La migración 0013 añade únicamente `CANCELLED` al tipo de estado de ocurrencias. Se ensayó sobre la copia restaurada: las huellas de todas las tablas comerciales permanecieron iguales. No contiene actualizaciones ni borrados de registros del negocio. La reversión prevista consiste en volver a la versión anterior de la aplicación y conservar el nuevo valor aditivo sin uso; no eliminar datos ni reconstruir el tipo.

## Verificación de la entrega

- Aplicación preparada para publicación: **366/366 pruebas**, ninguna fallida ni omitida; PostgreSQL real en cuatro bases locales dedicadas, datos sintéticos, correo y Storage simulados.
- Respaldo: **52/52 pruebas específicas**, incluidas PowerShell 5/7, permisos, enlaces, integridad y preservación de configuración.
- TypeScript independiente, lint sin advertencias y compilación optimizada: aprobados.
- Navegador: carga real del PDF sintético y su worker, sin errores de consola; calendario móvil a 390 px y acceso público.
- No se realizaron cobros, firmas, altas, anulaciones ni envíos de correo de prueba sobre clientes reales.

Los recuentos específicos de los anexos corresponden a fases anteriores; no deben sumarse entre sí. Evidencias principales locales: `output/remediation-core-2026-10-15/`, capturas en `output/playwright/` y anexos de cada corrección. Los archivos de salida permanecen ignorados por Git.

## Pendientes reales

1. **Equipo y permisos por función:** falta acordar qué puede hacer/ver cada función e implementar membresías, asignaciones y autorización en todos los canales. Las cuentas actuales siguen separadas por propietario. No conviene incorporar usuarios suponiendo que ya existe este modelo.
2. **Conciliación histórica:** cinco ocurrencias cuyo gasto está anulado y once gastos candidatos sin ocurrencia necesitan revisión comercial. No son once duplicados demostrados y no se alteraron por conjetura.
3. **Entrega de copias finales:** si falla el correo, la firma y el PDF quedan seguros y la interfaz avisa. Sigue faltando un reenvío dedicado/cola automática; puede descargarse manualmente.
4. **Recuperación operativa:** alerta por fallo o antigüedad, segunda copia externa, verificación de cifrado y de PITR del proveedor. La tarea local depende de sesión y disco disponibles.
5. **Escala y control:** pruebas de carga, paginación, agregados SQL, archivado/restauración y observabilidad. Las operaciones por Data API del propio dueño no se convierten aquí en un historial comercial inmutable.
6. **Dependencias restantes y recorridos reales:** actualización mayor del árbol de estilos, pruebas de correo real y validación operativa con cada futuro rol. No se certifica ausencia total de errores o vulnerabilidades.

Tras actualizar, las pestañas que conserven los formularios anteriores pueden pedir recargar antes de registrar un pago o un cobro; así obtienen el identificador necesario para evitar duplicados.

## Registro de publicación

Aplicación y migración preparadas y verificadas. Completar este apartado con el resultado efectivo del despliegue y los controles posteriores; hasta entonces no acredita que estas correcciones estén activas en la web.
