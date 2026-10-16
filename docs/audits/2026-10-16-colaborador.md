# Entrega del perfil Colaborador — 16 de octubre de 2026

El perfil está publicado en https://estudio-artieda.vercel.app. La cuenta `estudioartiedav@gmail.com` conserva su acceso de administradora. No se creó, invitó ni convirtió ninguna cuenta de colaborador: falta que la dueña indique el correo.

## Alcance entregado

- Acceso compartido a todos los clientes, casos, tareas/recordatorios y firmas del estudio; creación y edición dentro de ese alcance.
- Recordatorios: completar, reabrir y editar, incluyendo su fecha y hora de Argentina.
- Firmas: preparar, cargar documentos, enviar, reenviar, cancelar y descargar. Las pruebas no enviaron correos reales.
- Sin módulos, controles, consultas ni campos financieros para colaboradores: cobros, pagos, gastos, ahorros, estadísticas, honorarios, medios de pago y estados derivados de deuda. Tampoco acceden al historial administrativo.
- Sin borrado permanente para colaboradores.
- Notas, recordatorios escritos y documentos compartidos íntegramente, incluidos los importes que puedan aparecer en su texto, conforme a la decisión expresa de la usuaria.

Los límites se verifican en el servidor y en las políticas de acceso directo a base de datos y Storage. Ocultar enlaces es una medida de presentación adicional. Las nuevas cuentas sin asignación administrativa no obtienen acceso.

La matriz completa, el alta futura, la suspensión y la reversión están en [collaborator-access.md](../collaborator-access.md).

## Producción

| Componente | Evidencia |
| --- | --- |
| Código publicado | `4130ba681cc0043f4a4f22f9be38391790b26fea`, rama `codex/collaborator-access` |
| Despliegue nuevo | `dpl_4hzUYAgK393HX111r4F2amUH3RGb`, estado `READY`, destino `production` |
| Dirección del despliegue | `https://estudio-artieda-1hi1i4yyg-waltergaltieris-projects.vercel.app` |
| Alias público confirmado | `https://estudio-artieda.vercel.app` |
| Despliegue anterior para reversión | `dpl_BS2PrwNHoceFbQiNPzz9yMnzb1At`, commit `eafc4af50e9380336d09870fdf8e568422dbe208` |
| Migración | `0014_workspace_roles`, aplicada el 16/10/2026 a las 04:13:40 UTC (01:13:40 Argentina) |
| SHA-256 de la migración | `bb21a461637a53ff8efba20b7b6525756b361bc496ef8563ee9fa09e6c86c4c6` |

La migración se ensayó primero sobre una restauración aislada del respaldo. En producción, las huellas de las filas de negocio antes y después coincidieron. Se conservaron las tres cuentas existentes con su alcance individual; ninguna se convirtió en colaborador. Se verificó la lectura de la dueña bajo las políticas de base de datos. La migración agrega membresías privadas, auditoría del actor y restricciones; no modifica registros del negocio.

Después del despliegue se verificaron:

- Inicio de sesión HTTP 200.
- Dos rutas de tareas programadas rechazan llamadas sin autorización con HTTP 401.
- Enlace de firma inválido muestra el mensaje esperado.
- Las 17 tablas de negocio rechazan acceso anónimo y siguen disponibles para el servidor autorizado.
- Membresías privadas, 17 restricciones de tablas y una restricción de Storage presentes; migración registrada y dueña preservada.

Estas comprobaciones no escribieron datos de negocio ni enviaron correos.

## Pruebas

| Verificación | Resultado |
| --- | --- |
| Suite completa de la aplicación publicada | 488/488, sin fallos ni omisiones |
| Tipos, revisión estática y compilación local | Aprobados |
| Compilación de Vercel | Aprobada |
| Respaldo nativo, incluyendo esquema privado y transición sin ese esquema | 56/56, sin fallos ni omisiones |
| Copia principal después de sincronizar | Tipos aprobados y 77/77 pruebas seleccionadas de permisos, operaciones y pantallas |

La prueba de navegador utilizó una copia aislada con datos sintéticos y sustituciones de autenticación y URL de Storage. Las decisiones de autorización, acciones y consultas reales se mantuvieron: 15 pantallas de colaborador, 11 de administradora, cinco URL restringidas, menú móvil y guardados de caso y recordatorios. Se comprobó que honorarios y medio de pago permanecieran intactos y que las operaciones registraran a su autor. No se probó una sesión autenticada de la dueña en producción porque no se disponía de ella.

Se revisaron además referencias entre cuentas en casos, cobros, pagos y firmas: no se encontraron cruces en producción. Las consultas se endurecieron para no exponer relaciones de otra cuenta aunque existieran datos inconsistentes.

## Respaldos

Antes de la migración:

`J:\Trabajo\Estudio Ariteda\Sistema\Copias de seguirdad\Manuales\2026-10-16_pre-colaborador\backup`

Creado a las 03:47:50 UTC. Se verificaron 55 hashes, 16 objetos de Storage y la lectura completa del archivo. Se restauró en PostgreSQL aislado: las 53 tablas verificadas coincidieron en cantidad de filas. La migración se ensayó sobre esa restauración conservando las huellas de los datos.

Después de la publicación:

`J:\Trabajo\Estudio Ariteda\Sistema\Copias de seguirdad\Manuales\2026-10-16T04-22-13.663Z-683953ee-96ba-4b09-bb6c-64595aad938e`

Verificado a las 04:25:02 UTC: 54 hashes de archivos, 16 objetos de Storage, archivo leído completo, esquema privado con tabla/datos/función y tres membresías administrativas preservadas. El bundle Git fue verificado y contiene el commit publicado `4130ba6`. El manifiesto identifica el HEAD antiguo de la carpeta principal; el bundle incluye todas las ramas, por lo que la presencia del commit publicado se comprobó expresamente.

El respaldo semanal instalado ahora incluye `app_private`; conserva su horario y sus credenciales protegidas. Usa PostgreSQL nativo y no necesita Docker. La restauración comprobada fue de PostgreSQL; no se afirma haber reconstruido todos los servicios administrados de Supabase.

## Estado del trabajo local y evidencias

El código publicado se conserva en el worktree `stabilize-production/Estudio artieda`, rama `codex/collaborator-access`. La carpeta principal recibió 86 archivos mediante comparación y fusión controlada. Se preservaron los cambios previos de la usuaria, incluida su función local de borrado de casos; esa función queda restringida a administradora en la copia local y no se incorporó a este despliegue. No se restableció la carpeta principal ni se incluyeron sus cambios ajenos en el commit de entrega.

Los resultados detallados están en `output/roles-2026-10-16/` de la carpeta principal: `tests-success.json`, `visual-summary.json`, `migration-production-applied.json`, `migration-production-verified.json`, `production-check.json`, `backup-verification.json`, `restore-verification.json`, `backup-post-role-verified.json`, `primary-sync.json` y sus registros. Las capturas sintéticas están en `output/playwright/`.

La entrega verifica este alcance y sus regresiones; no equivale a certificar que el sistema completo carezca de errores o vulnerabilidades futuras.
