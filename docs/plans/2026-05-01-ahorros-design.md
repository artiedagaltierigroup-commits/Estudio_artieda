# Ahorros Design

## Objetivo

Agregar una pantalla llamada Ahorros para crear metas de ahorro, registrar aportes y mostrar avance visual sin romper la lectura financiera existente.

## Decision Principal

Los aportes se gestionan desde Ahorros. Cada aporte crea automaticamente un gasto asociado para que Dashboard, Gastos y Estadisticas descuenten ese dinero de la ganancia disponible.

El gasto automatico debe quedar trazable, pero la operacion principal vive en Ahorros. Esto evita que un gasto editado manualmente deje inconsistente el progreso de la meta.

## Modelo

- `savings_goals`: nombre, descripcion opcional, fecha limite opcional, monto meta, estado, usuario y timestamps.
- `savings_contributions`: ahorro, monto, fecha, descripcion opcional, gasto asociado, usuario y timestamps.
- `expenses.origin`: nuevo origen `SAVINGS`.
- `expenses.savings_contribution_id`: referencia opcional al aporte que genero el gasto.

## Estados

- En progreso: estado operativo normal.
- Pausado: visible por filtro, no recomendado como vista inicial.
- Completado: se deriva cuando el total aportado alcanza o supera la meta.

## Pantalla

La ruta `/ahorros` muestra por defecto los ahorros en progreso. Los filtros rapidos viven en la URL para que el navegador recuerde la vista:

- En progreso
- Completados
- Pausados
- Todos

Cada ahorro se presenta como una tarjeta de meta con nombre, fecha limite, monto acumulado, faltante, barra de progreso y accion para anadir dinero.

## UX

La interfaz debe sentirse como control de reserva: sobria, clara, orientada a progreso. La firma visual es una barra de avance fuerte dentro de cada tarjeta, acompanada por el faltante y el estado.

## Seguridad

Las nuevas tablas quedan en `public`, por lo tanto deben tener RLS habilitado y politicas por `user_id`, siguiendo el patron existente del proyecto.
