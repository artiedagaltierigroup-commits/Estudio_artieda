# Cobros y pagos: corrección local verificada

Fecha de trabajo: 15/10/2026. Este bloque corrige A07, A15, A16 y la relación cobro–caso de A05. No modifica datos históricos, esquema, migraciones ni producción; necesita desplegar el código junto con sus formularios.

## Comportamiento corregido

- Crear un pago, editar/reprogramar/cancelar/borrar un cobro y borrar un pago usan transacciones. Las operaciones sobre un mismo cobro adquieren el mismo bloqueo de fila antes de modificarlo. El saldo se vuelve a leer dentro del bloqueo.
- Importes positivos finitos, máximo `9999999999.99`, hasta dos decimales. Los cálculos se hacen en centavos enteros. Se rechazan `NaN`, infinitos, exponentes, negativos, exceso de escala y fechas inexistentes antes de escribir.
- No se admite bajar el total por debajo de lo pagado. El cobro inicial, su pago opcional y ambos registros de actividad se confirman o revierten juntos. La auditoría de los otros cambios también comparte la transacción.
- El formulario asigna un UUID al intento de pago. Repetir el mismo UUID y contenido confirma el pago existente sin duplicarlo ni repetir la auditoría. Otro propietario, contenido o cobro no puede reutilizarlo. Un reintento tardío tampoco recrea un pago eliminado.
- El alta de cobros también usa un UUID estable generado en el servidor y conservado en el formulario. Los intentos con el mismo identificador se serializan en PostgreSQL; se compara el contenido normalizado con la auditoría original, incluido el pago inicial. Un reintento no repite el cobro/pago, no revierte ediciones posteriores ni recrea un cobro eliminado.
- Crear/editar cobros exige un caso y cliente del propietario autenticado. Las lecturas filtran los padres en SQL y los pagos por propietario. La invalidación tras borrar pagos usa sus relaciones verificadas, sin confiar en los IDs enviados por el navegador.
- El formulario muestra errores, conserva sus datos e identificación ante fallas y asigna un intento nuevo sólo después de una confirmación. La opción de pago inicial se muestra sólo en alta, no en edición.
- El pago inicial y la fecha sugerida del formulario usan el calendario de Argentina, también después de las 21:00 cuando UTC ya pasó al día siguiente.

## Pruebas y reproducción

Se usó exclusivamente PostgreSQL local en `127.0.0.1:55439`, base `artieda_payments_test`, con esquema restaurado y datos sintéticos. La suite rechaza cualquier host no local o nombre diferente y nunca carga archivos `.env`.

1. Antes de corregir: 20 pruebas, 8 aprobadas y 12 fallidas. Se reprodujeron dos pagos aceptados sobre un único saldo, rechazo de los últimos centavos, aceptación de NaN, duplicación por reintentos, total inferior al cobrado, vínculos ajenos y escrituras parciales tras fallar pago/auditoría.
2. El resumen monetario tenía una prueba adicional fallida: saldo `0.19999999999999998` en lugar de `0.20`.
3. Una prueba posterior reprodujo que un reintento recreaba un pago eliminado; se agregó la comprobación de su auditoría de borrado.
4. La ampliación al alta de cobros reprodujo seis fallas: dos altas concurrentes con identificadores distintos a los solicitados, repetición de pago inicial, reutilización con distinto contenido y falta de protección frente a otros propietarios/borrados. Se conservaron los detalles en `output/charge-retries-before.log`.
5. Resultado final: **55/55 pruebas aprobadas**, incluidas **45 pruebas de integración real**, 6 del resumen de cobros y 4 del pago inicial. También se corrigió el tipo del ejecutor SQL de una prueba sin introducir `any`.
6. Revisión posterior: se agregó una regresión de fecha local a `2026-10-16T01:30Z`. Falló al devolver el día 16 y pasó al devolver el día 15 de Argentina. La suite de pago inicial quedó en **5/5**, con evidencia en `output/charge-local-date-before.json` y `output/charge-local-date-after.json`; la verificación conjunta posterior se centraliza en la tarea principal.

Las carreras con edición, cancelación y borrado se coordinan mediante bloqueos de prueba en PostgreSQL y verifican que el pago ya llegó a ejecutarse mientras la otra operación está bloqueada. Los errores inducidos por triggers comprueban rollback real. Las pruebas limpian sus filas sintéticas.

Evidencia local ignorada por Git: `output/payments-before.json`, `output/payment-cent-summary-before.json`, `output/payments-deleted-retry-before.json`, `output/charge-retries-before.log`, `output/charge-retries-after.json` y `output/payments-expanded.json`.

Para repetir, establecer `PAYMENTS_TEST_DATABASE_URL` con una conexión a esa base local y ejecutar:

```text
npx vitest run src/actions/payments.integration.test.ts src/lib/charge-insights.test.ts src/lib/charge-mutations.test.ts --maxWorkers=1 --testTimeout=20000 --hookTimeout=60000
```

## Límites y seguimiento

- Las pestañas abiertas con los formularios anteriores carecen del UUID: el servidor pide actualizar la página antes de cobrar o crear un cobro.
- Dos operaciones deliberadamente independientes, con identificadores diferentes, siguen permitidas. La idempotencia protege los reintentos de una misma operación, no intenta deducir duplicados por coincidencia de importe o descripción.
- No se cambió el borrado en cascada ni se conciliaron importes históricos. Un identificador de pago eliminado se conserva como utilizado mientras exista su auditoría.
- No se realizaron pruebas con sesiones productivas, correos o datos reales, ni se afirma un despliegue. La revisión global de tipos/build y la integración de los otros módulos corresponden al cierre de la tarea principal.
