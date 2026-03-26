# Rediseño de Estadísticas

**Fecha:** 2026-03-17  
**Estado:** Diseño aprobado para implementación  
**Objetivo:** Convertir la pantalla de `Estadísticas` en una herramienta analítica realmente útil para operación y lectura financiera, sin volverla pesada ni inventar complejidad que hoy el sistema no necesita.

---

## 1. Diagnóstico de la pantalla actual

La pantalla actual funciona como un resumen visual agradable, pero todavía no opera como un tablero analítico completo.

Problemas detectados:

- no tiene filtros suficientes
- varios gráficos no responden a preguntas concretas de negocio
- la distribución de gastos por categoría usa un donut que ya no escala con la cantidad y longitud de categorías actuales
- la pantalla mezcla una lógica fija de 12 meses con una lectura mensual puntual sin darle control a la usuaria
- faltan rankings y cruces que ayuden a decidir rápidamente a quién cobrar, qué categorías están consumiendo más dinero y dónde está el problema financiero del período

---

## 2. Enfoques evaluados

### Opción A — Mejora mínima

Mantener la pantalla actual y solo cambiar algunos gráficos, agregando un filtro de fechas.

Ventajas:

- rápida de implementar
- bajo riesgo

Desventajas:

- se queda corta enseguida
- no resuelve el problema central de utilidad

### Opción B — Escritorio analítico balanceado

Rehacer la pantalla con filtros realmente útiles, KPIs accionables, gráficos mejor elegidos y rankings operativos.

Ventajas:

- suficientemente potente para uso diario real
- se apoya bien en los datos que el sistema ya maneja
- no sobrecarga la interfaz

Desventajas:

- requiere tocar bastante la capa analítica y la UI

### Opción C — Cabina analítica completa

Agregar muchos filtros, comparativas avanzadas, varias vistas y análisis cruzados de alta complejidad.

Ventajas:

- máxima profundidad

Desventajas:

- demasiado para la etapa actual
- mayor riesgo de sobrecarga visual
- probable desperdicio para una usuaria única

### Recomendación final

Se elige la **Opción B — Escritorio analítico balanceado**.

---

## 3. Objetivo funcional de la nueva pantalla

La pantalla debe responder de forma rápida y clara estas preguntas:

- cuánto se cobró en el período
- cuánto queda por cobrar
- cuánto se gastó
- cuál fue el resultado neto
- qué clientes deben más
- qué casos tienen mayor saldo abierto
- en qué categorías se está yendo la plata
- cómo evolucionan ingresos, gastos y resultado en el tiempo

No debe reemplazar al dashboard diario. Debe funcionar como una pantalla de análisis y decisión.

---

## 4. Filtros aprobados

La nueva cabecera de filtros debe incluir:

- `Desde`
- `Hasta`
- `Cliente`
- `Caso`
- `Estado del cobro`
- `Categoría de gasto`

### Criterio de diseño

- `Desde` y `Hasta` son la base obligatoria
- `Cliente` y `Caso` permiten bajar de una vista global a una lectura puntual
- `Estado del cobro` sirve para estudiar pendientes, parciales, vencidos o cobrados
- `Categoría de gasto` conecta directamente con el nuevo catálogo unificado de gastos

### Criterio de alcance

No se incluye por ahora:

- método de pago
- prioridad del caso
- tipo de gasto como filtro principal

Eso puede venir después si realmente se necesita.

---

## 5. Nueva estructura de la pantalla

La pantalla se organiza en cuatro bloques:

### A. Cabecera analítica

Contiene:

- título `Estadísticas`
- breve explicación
- barra de filtros
- botón para limpiar filtros

### B. KPIs principales

Seis tarjetas en la parte superior:

- `Ingresos cobrados`
- `Pendiente por cobrar`
- `Gastos`
- `Resultado neto`
- `Cobros vencidos`
- `Clientes con deuda`

Estas tarjetas deben responder siempre al rango y filtros aplicados.

### C. Bloque central de gráficos

Gráficos principales:

1. `Ingresos vs gastos vs neto`
   - gráfico combinado por período
   - permite comparar evolución temporal

2. `Cobros por estado`
   - gráfico de barras
   - reemplaza visuales menos claros tipo pie/donut

3. `Gastos por categoría`
   - barras horizontales
   - ordenadas de mayor a menor
   - mostrar top categorías + `Otras`

4. `Top clientes por cobrado`
   - barras o tarjetas compactas

5. `Clientes con más deuda`
   - listado/ranking

### D. Bloque inferior de detalle operativo

Tablas o listas cortas con:

- `Casos con mayor saldo pendiente`
- `Categorías con mayor gasto`
- `Clientes con mayor facturación`

Este bloque no debe ser una tabla gigantesca. Debe ser un resumen accionable.

---

## 6. Cambio importante de visualización

### Distribución por categoría

Se elimina el donut actual para gastos por categoría.

Nuevo criterio:

- usar barras horizontales
- mostrar top 6 o top 8
- agrupar el resto como `Otras`
- incluir monto y porcentaje

Motivo:

- los nombres son largos
- ya hay más categorías
- el donut se vuelve ilegible

### Cobros por estado

Conviene pasar de un pie a barras o columnas para mejorar la lectura comparativa.

---

## 7. Datos que debe consumir

La pantalla debe apoyarse en una capa analítica más flexible que la actual.

Se necesita una acción o conjunto de helpers que acepte filtros y devuelva:

- métricas generales del período
- serie temporal de ingresos
- serie temporal de gastos
- serie temporal de neto
- distribución de cobros por estado
- distribución de gastos por categoría
- top clientes por cobrado
- top clientes por deuda
- top casos por saldo pendiente

### Restricción importante

La analítica debe seguir usando:

- cobros realmente pagados desde `payments`
- gastos reales desde `expenses`
- estados de cobro derivados

No debe depender de valores inconsistentes ni de caches como fuente principal de verdad.

---

## 8. Comportamiento esperado

### Sin filtros especiales

La pantalla debe abrir con una vista útil por defecto, recomendada:

- últimos 12 meses para evolución
- y KPIs del rango activo

### Con filtros activos

Todos los KPIs, gráficos y rankings deben responder al mismo conjunto de filtros.

### Vacíos y datos insuficientes

Cada gráfico debe tener un estado vacío claro y útil, no solo un bloque vacío.

---

## 9. Riesgos a evitar

- mezclar gráficos decorativos con análisis real
- seguir usando donut para categorías largas
- meter demasiados filtros y volver la pantalla pesada
- duplicar exactamente el dashboard
- usar categorías libres en estadísticas sin una estrategia de catálogo común
- dejar rankings sin orden útil

---

## 10. Resultado esperado

La nueva pantalla de `Estadísticas` debe sentirse como una mesa de control financiera:

- clara
- filtrable
- orientada a decisiones
- útil para detectar deuda, gasto, evolución y concentración de ingresos

No tiene que ser una BI compleja. Tiene que ser una pantalla que realmente sirva para entender el estudio.
