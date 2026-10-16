# Correcciones de firmas y revisión cruzada — 15 de octubre de 2026

Los cambios de este informe se implementaron en la copia de trabajo. Este documento no acredita un despliegue en producción. Las pruebas utilizaron bases PostgreSQL locales vacías, datos sintéticos, almacenamiento y correo simulados; `pdf-lib` se ejecutó realmente.

## Correcciones

- **A09:** abrir un enlace vencido conserva una aceptación `SIGNED`, su fecha y el estado de la solicitud. Expiración pública, tarea programada, seguimiento del correo, firma, envío, cancelación y cambios documentales coordinan sus escrituras mediante el mismo bloqueo de solicitud. La tarea y el píxel vuelven a comprobar el estado después del bloqueo; una lectura antigua no puede deshacer una firma completada.
- **A10:** sólo un borrador o solicitud preparada que nunca se envió admite reemplazo de documento o ubicación. La aceptación registra el hash exacto del original. El servidor comprueba ese hash antes de firmar y conserva el original después de finalizar; nunca vuelve a usar el PDF ya firmado como origen de una generación. Los artefactos nuevos usan nombres con hash.
- **A11:** se valida formato, longitud base64, tamaño, cabecera y dimensiones del PNG y se decodifica con el motor de PDF antes de guardar la aceptación. El límite es 512 KiB, dimensión máxima de 2048 píxeles y cuatro millones de píxeles. El lienzo se ajusta en pantallas de alta densidad. La generación y subida del PDF final ocurren antes de confirmar conjuntamente metadatos, estado y evento. Un fallo conserva un estado que permite reintentar. Repetir una aceptación confirmada no agrega otra firma ni genera otro PDF.
- **A18:** el punto público de seguimiento sólo admite apertura, inicio e interrupción; rechaza en ejecución un evento `signed` inventado. Los eventos de aceptación se crean dentro de la operación que guarda la firma.
- **A22:** límite compartido de PDF de 3 MiB en navegador y servidor, con validación real del PDF y sus páginas. El límite de petición configurado por el trabajo principal es 4 MiB. No se anuncia un tamaño de 10 MiB que el transporte no admite. Los documentos ya almacenados se conservan.
- **A25:** el visor React-PDF se importa sólo en navegador, sin ejecutarlo durante el renderizado del servidor. La reproducción que fallaba con `DOMMatrix is not defined` ahora carga el formulario. La comprobación posterior en navegador detectó además `Object.defineProperty called on non-object` al inicializar PDF.js con los mapas de código de Webpack en desarrollo. Se reprodujo ejecutando el paquete real de React-PDF compilado por el Webpack incluido en Next. Un alias exacto, sólo para cliente, usa la distribución minificada oficial de la misma versión de PDF.js y evita la colisión entre sus variables internas y el empaquetador; conserva el worker y las versiones instaladas. Existe un [reporte del mismo síntoma en PDF.js](https://github.com/mozilla/pdf.js/issues/20435); la causa y la corrección se comprobaron también con el código instalado localmente.

También se rechazan ubicaciones inválidas o fuera de página: una página inexistente ya no se sustituye silenciosamente por la última página del documento.

## Correo y recuperación

La ausencia de configuración del correo produce un error explícito y no registra direcciones ni enlaces secretos en consola. Los tokens se confirman antes de enviar invitaciones: si falla el segundo correo, el enlace ya enviado al primer destinatario conserva validez.

Si falla el correo de la copia final, la firma y el PDF permanecen guardados. La respuesta muestra un aviso; los indicadores de entrega permanecen pendientes y se registra esa situación en actividad. El detalle administrativo informa que puede descargarse el PDF para compartirlo.

**Limitación pendiente:** actualmente no existe un botón específico para reenviar la copia final ni una cola de reintentos automáticos. El botón «Reenviar pendientes» corresponde a invitaciones de firma, no a copias finales. La descarga manual sigue disponible. No se enviaron correos reales para validar la configuración del proveedor.

## Evidencia de pruebas

- Se reprodujeron 13 fallas en 16 escenarios iniciales de PostgreSQL antes de corregir las acciones de firmas.
- El bloque ampliado aprobó **55/55 pruebas en ocho archivos**, incluidos PNG/PDF, límites, importación del formulario, autorización del cron y concurrencia real en PostgreSQL.
- Tras endurecer el correo, el bloque de firmas y correo aprobó **30/30**, compuesto por 24 escenarios de integración y seis de correo. Incluye fallo de la copia final sin pérdida de la aceptación.
- Se reprodujeron por separado las carreras de cron y del píxel de correo: una lectura previa a la firma sobrescribía luego el estado completado. Ambas regresiones quedaron cubiertas.
- La regresión del visor ejecuta React-PDF/PDF.js y el empaquetador de Next reales, con mapas `eval-source-map`; sólo sustituye el constructor `DOMMatrix` necesario al importar en un contexto de prueba. Antes del alias produce exactamente el error del navegador; después inicializa los componentes, `getDocument` y la versión correcta. Junto con la comprobación SSR, **2/2 pruebas** aprobadas. Este caso verifica inicialización; la carga y visualización de un PDF en navegador y el build final corresponden a la validación visual y global del trabajo principal.

Las comprobaciones de integración rechazan conexiones distintas de las bases locales dedicadas. No cargan archivos de entorno reales. La validación global del proyecto, el build y cualquier comprobación posterior al despliegue se registran en el informe principal; estos resultados no sustituyen esa validación.

## Hallazgo adicional en la revisión de recurrentes

Cambiar un recurrente automático ya realizado a «por pagar» permitía convertir su ocurrencia en pendiente y crear otro gasto para el mismo período. La reproducción con sincronizaciones y pagos simultáneos produjo **dos gastos para una ocurrencia**.

Se agregó una corrección mínima: la sincronización conserva las ocurrencias `GENERATED` o vinculadas a un gasto y la acción de pago rechaza volver a realizar ese período. La suite local de recurrentes aprobó **22/22 pruebas**, incluidas dos nuevas sobre cambio de modo y concurrencia. No se conciliaron ni modificaron registros históricos del negocio.

## Límites del trabajo

Se protegen operaciones nuevas y reintentos de este flujo. No se repararon automáticamente solicitudes históricas que ya estuvieran firmadas sin PDF, ni se eliminaron archivos. Una subida externa completada seguida de un fallo de transacción puede dejar un objeto sin vínculo; su limpieza requiere una tarea de conciliación que conserve la evidencia documental. Tampoco se implementaron aquí los permisos por función ni se certifica que el sistema completo esté libre de errores.
