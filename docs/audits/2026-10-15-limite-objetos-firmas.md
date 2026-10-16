# Límite de acceso a objetos de firmas

Corrección local del 15/10/2026, sin acceso ni modificaciones en producción.

Un propietario autenticado puede editar campos de sus propias filas mediante Data API. Por eso una ruta de Storage guardada en una fila autorizada no demuestra que el objeto también le pertenezca. Las descargas administrativas, URLs firmadas y generación de PDFs confiaban en esas rutas y podían actuar como intermediarias para leer archivos de otro propietario o de otra solicitud.

## Corrección

- Antes de acceder a Storage con privilegios administrativos, se exige la estructura exacta `usuario/signature-requests/solicitud/categoría/archivo`, con el usuario y la solicitud derivados de la sesión o del enlace validado, nunca del prefijo proporcionado por el dato.
- Sólo se admiten las categorías `original`, `signed`, `signature` y `certificate`. Se rechazan rutas absolutas, segmentos adicionales, `.`/`..`, barras invertidas, codificación porcentual simple o doble, parámetros, fragmentos y caracteres de control.
- Se conserva la compatibilidad con originales históricos retenidos mediante una ruta dentro de `signed`, siempre dentro del mismo usuario y solicitud.
- También se valida la pertenencia de las relaciones cargadas: documento, cliente, caso, destinatarios, ubicaciones y eventos. Una relación cruzada falla antes de devolver metadatos privados, generar certificados o acceder a objetos.
- La protección se aplica a PDF firmado, imagen, PDF parcial, constancia, copia final por token, URL firmada del original y lectura de original/firmas previas al aceptar una nueva firma.

## Evidencia

Se reprodujeron **10 fallos de autorización entre 11 escenarios** antes del cambio, con base y Storage simulados y dos propietarios sintéticos. Las rutas devolvían archivos o URLs ajenos. Después de corregir pasaron **34/34 pruebas**, incluyendo rutas, relaciones, intentos de atravesar directorios y compatibilidad histórica.

Archivos de evidencia locales: `output/signature-storage-scope-before.log` y `output/signature-storage-scope-after.json`. El primer intento de reporte JSON no llegó a ejecutar pruebas; no se usa como evidencia.

Se añadieron dos escenarios a la suite PostgreSQL de firmas: ruta de original ajena con hash correcto y ruta ajena de una firma anterior. La suite completa pasó **26/26 pruebas** contra PostgreSQL local con datos sintéticos (`output/signature-final-review.json`). La comprobación del destinatario usa su ID, sin depender del orden de filas de la consulta. El fixture original de esa suite usa ahora la estructura canónica de producción.

Esto cierra la lectura de objetos fuera de la solicitud autorizada. **No implementa roles de equipo ni convierte las filas editables por su propietario en registros inmutables.** La matriz de permisos por función y las restricciones adicionales de escritura siguen siendo un trabajo separado.
