# Cierre del acceso público a cinco tablas

**Aplicado en producción el 15/10/2026 a las 21:22, hora de Argentina.** Se completó primero una copia nueva, se restauró en una base local aislada y luego se protegieron las cinco tablas indicadas en el hallazgo A01 de la auditoría. La comprobación posterior no detectó cambios en sus registros ni pérdida del acceso administrativo.

## Copia utilizada

Ubicación protegida:

`J:\Trabajo\Estudio Ariteda\Sistema\Copias de seguirdad\Manuales\2026-10-15_pre-rls\backup`

- Creada el **15/10/2026 a las 21:06**, antes de modificar permisos. PostgreSQL 17.6 de origen; herramientas nativas 17.11.
- Incluye archivo PostgreSQL restaurable, exportaciones SQL, roles sin sus contraseñas, datos de Auth, documentos de Storage y un bundle del código local anterior al cambio.
- Se verificaron nuevamente **51 archivos mediante SHA-256** y **16 objetos de Storage**, con 1.698.171 bytes en total. Todos los objetos se descargaron de nuevo, sin reutilizar enlaces físicos de copias antiguas.
- Los conteos de origen y el inventario de Storage permanecieron estables durante la copia. Se leyó por completo el archivo de restauración y se comprobó el bundle de Git.
- Se restauraron **53 tablas**, de los esquemas `public`, `auth`, `storage` y `drizzle`, en PostgreSQL local. Todos sus conteos coincidieron. Dos tablas vacías de vectores no aportaron secciones de datos al volcado.
- La carpeta nueva tiene acceso restringido al usuario de Windows, SYSTEM y Administradores. Los permisos de las copias antiguas no se modificaron.

La restauración valida la recuperación de esos datos en PostgreSQL. No constituye una reconstrucción completa de los servicios de Supabase, del envío de correos ni de la infraestructura desplegada. Los 16 archivos de Storage se validaron por tamaño y hash; no se subieron a otro proyecto.

El primer intento, conservado como `backup.incomplete-first`, se descartó por una diferencia en el conteo de `storage.migrations`. La copia válida es exclusivamente la carpeta `backup`, cuya repetición y verificación finalizaron correctamente.

## Cambio aplicado

Migración: `src/db/migrations/0012_secure_exposed_tables.sql`.

| Tabla | Antes: HEAD anónimo | Después: HEAD anónimo | Después: acceso administrativo |
|---|---:|---:|---:|
| `client_saved_signatures` | 200 | 401 | 200 |
| `recurring_expense_occurrences` | 200 | 401 | 200 |
| `signature_documents` | 200 | 401 | 200 |
| `signature_events` | 200 | 401 | 200 |
| `signature_requests` | 200 | 401 | 200 |

Se retiraron los privilegios directos de `PUBLIC` y `anon`. Para `authenticated` se conservaron las cuatro operaciones normales, con RLS y una política por operación que exige que `user_id` coincida con la identidad autenticada. Se retiraron privilegios excesivos como `TRUNCATE`. Son **20 políticas** en total.

Se conservaron el rol PostgreSQL utilizado por el servidor, sus privilegios y los del acceso administrativo, así como los buckets y políticas de Storage. Los recorridos públicos de firma resuelven sus tokens mediante el servidor; no necesitan acceso anónimo directo a estas tablas.

La aplicación del cambio fue una única transacción, con adquisición inmediata del bloqueo o cancelación (`NOWAIT`) y límites de tiempo. Se compararon conteos y huellas del contenido de las cinco tablas dentro de esa transacción: **coincidieron antes y después**. No se modificaron registros comerciales ni se reinició o desplegó la aplicación.

La migración quedó registrada en el historial Drizzle con `created_at = 1792109538073` y SHA-256 `84e31ef2279246528ae4621d578bccc44e0e9fe1a83b137628d0f960f8db5b62`. No volver a ejecutar su SQL manualmente sobre esta base.

## Pruebas y resultado

- **115 comprobaciones de permisos sobre PostgreSQL restaurado:** acceso anónimo, acceso propio y ajeno, intento de falsificar o cambiar propietario, identidad ausente, prohibición de truncado y operaciones del servidor/rol administrativo.
- Antes del cambio: 55 comprobaciones pasaban y 60 fallaban, demostrando el problema. Con la corrección: **115/115**.
- Se ensayó la reversión exclusivamente en la base local: RLS, políticas y privilegios coincidieron con el estado previo. Al reaplicar, nuevamente **115/115**. Los datos sintéticos de prueba se revirtieron en cada ejecución.
- En producción: las cinco solicitudes HEAD anónimas devolvieron 401, sin descargar registros. Las cinco administrativas devolvieron 200. Se verificaron RLS, las 20 políticas, la conservación de permisos del servidor y la conservación de Storage.
- A las **21:26**, `https://estudio-artieda.vercel.app/login` respondió 200 y la ruta de firma con un token sintético inexistente respondió 200 con el mensaje de enlace inválido. El bucket privado de documentos siguió disponible para el servidor.
- Suite existente en la copia de trabajo: 229/230 al primer intento; un test del lanzador de Windows excedió su límite de 5 segundos. La repetición aislada con un límite de 20 segundos pasó. No se cambió ese test.

No se realizaron firmas, cobros, envíos de correo ni recorridos autenticados completos sobre registros reales. Las verificaciones anteriores no certifican todas las pantallas o funciones del sistema.

La prueba reproducible está en `scripts/security/verify-exposed-tables.mjs`. Exige `RLS_TEST_DATABASE_URL`, un servidor local y la base `artieda_rls_verification`; no utiliza `DATABASE_URL` ni carga automáticamente credenciales de producción. Ejecutar únicamente contra una restauración aislada preparada con las funciones y roles de Supabase.

Al terminar se detuvo la instancia local y se comprobó que su puerto 55439 ya no estaba escuchando. La última comprobación de producción, a las **21:29**, confirmó nuevamente las cinco denegaciones anónimas y la conservación de permisos del servidor y Storage.

## Evidencia y reversión

Evidencia de esta ejecución: `output/remediation-2026-10-15/`, excluida de Git. Archivos principales: `backup-verification.json`, `restore-verification.json`, `rls-tests-before.json`, `rls-tests-reapplied.json`, `rollback-verification.json`, `applied-change.json`, `production-verification.json` y `service-access-current-url.json`.

Estado previo, SQL aplicado, SQL de reversión y comprobaciones posteriores:

`J:\Trabajo\Estudio Ariteda\Sistema\Copias de seguirdad\Manuales\2026-10-15_pre-rls\change-control`

`rollback.sql` se verificó localmente, pero **no se ejecutó en producción**. Restaura los permisos anteriores y, por tanto, volvería a abrir la exposición original; queda reservado para una regresión confirmada y revisada.

## Pendientes que siguen vigentes

- **A01 queda corregido** para estas cinco tablas. No se implementó todavía el modelo de equipo y permisos por función solicitado para los futuros usuarios; el control actual es por propietario.
- **A02 queda parcialmente atendido:** ya existe una copia actual con restauración probada. La tarea automática continúa pendiente de reparación. Docker falló porque el servicio WSL de Windows está deshabilitado (`Wsl/0x80070422`); esta copia se obtuvo sin Docker y no se cambiaron los servicios de Windows.
- Los permisos amplios de respaldos anteriores, los restantes hallazgos de la auditoría y la desalineación previa de los snapshots de Drizzle siguen pendientes. El snapshot de la migración personalizada mantiene el historial existente; no usar una regeneración global de esquema para aplicar esta corrección.
- La URL de aplicación de la configuración local apunta a un despliegue antiguo que devuelve 410. La dirección de producción confirmada por el titular es `https://estudio-artieda.vercel.app`. La configuración no se cambió como parte de esta intervención.

El código y la migración se conservaron localmente. No se hizo push, publicación de una nueva versión ni cambio de configuración en Vercel.
