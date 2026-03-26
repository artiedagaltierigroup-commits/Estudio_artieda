# Graficos Lineales para Estadisticas

**Fecha:** 2026-03-26  
**Estado:** Diseno aprobado para implementacion  
**Objetivo:** Sumar tres graficos nuevos a la pantalla de `Estadisticas` sin reemplazar ninguno de los actuales, siguiendo la referencia visual compartida por la usuaria.

---

## 1. Alcance aprobado

La pantalla actual de `Estadisticas` ya contiene metricas, rankings y graficos operativos. El cambio aprobado no reemplaza esos bloques ni altera su funcion. Solo agrega nuevas visualizaciones para leer mejor la evolucion temporal del periodo filtrado.

Los tres graficos nuevos son:

1. `Ganancias brutas` como grafico principal justo despues del filtro.
2. `Gastos` despues de `Top clientes por cobrado` y `Top casos por cobrado`.
3. `Ganancias brutas vs gastos` al final de la pagina.

---

## 2. Interpretacion funcional

### Ganancias brutas

Para este trabajo, `ganancias brutas` significa `cobrado real` dentro del periodo seleccionado, es decir, pagos registrados en `payments` y no resultado neto.

### Gastos

El grafico de gastos usa egresos reales del periodo provenientes de `expenses`.

### Comparativo final

El ultimo grafico contrasta ambas curvas en el tiempo:

- linea 1: `Ganancias brutas`
- linea 2: `Gastos`

No muestra neto ni reemplaza el grafico actual de barras `Cobrado vs gastos`.

---

## 3. Orden visual aprobado

La composicion final queda asi:

1. Cabecera y filtros.
2. Nuevo grafico principal `Ganancias brutas`.
3. Tarjetas KPI existentes.
4. Graficos actuales ya presentes en la pantalla.
5. `Top clientes por cobrado`.
6. `Top casos por cobrado`.
7. Nuevo grafico `Gastos`.
8. Graficos actuales restantes sin eliminarse.
9. Nuevo grafico final `Ganancias brutas vs gastos`.

La condicion importante es mantener los graficos actuales y sumar los nuevos en los puntos pedidos por la usuaria.

---

## 4. Direccion visual

La referencia visual aprobada marca estos criterios:

- los primeros dos graficos nuevos deben tener una sola linea
- el ultimo debe tener dos lineas
- debe existir un relleno suave debajo de la linea, tipo area
- la lectura tiene que ser limpia, con foco en la curva y puntos discretos
- el lenguaje visual debe sentirse consistente con Recharts y con los tonos ya usados en la pantalla

Propuesta visual:

- `Ganancias brutas`: linea verde suave con area translucida
- `Gastos`: linea coral/roja con area translucida
- `Ganancias brutas vs gastos`: dos lineas, una verde y una coral, sin convertirlo en barras

---

## 5. Regla temporal

Los nuevos graficos deben responder al rango del filtro actual.

- si el rango tiene hasta 31 dias, la serie se agrupa por dia
- si el rango supera 31 dias, la serie se agrupa por mes

Esto mantiene la misma logica temporal que ya usa la pantalla para el cruce actual y evita inconsistencias entre bloques.

---

## 6. Estrategia tecnica aprobada

Se elige un componente reutilizable de lineas para evitar duplicar UI.

### Capa de datos

Crear una serie temporal base reutilizable para estadisticas que produzca, por punto del eje:

- `label`
- `grossIncome`
- `expenses`

Desde esa serie se podran alimentar:

- grafico de una linea para `Ganancias brutas`
- grafico de una linea para `Gastos`
- grafico de dos lineas para `Ganancias brutas vs gastos`
- grafico actual `Cobrado vs gastos`, si conviene mapear desde la misma fuente

### Capa de presentacion

Crear un componente de grafico lineal reutilizable que soporte:

- una serie
- dos series
- colores configurables
- tooltip consistente con moneda local

---

## 7. Riesgos a evitar

- confundir `ganancias brutas` con `neto`
- reemplazar o mover incorrectamente graficos actuales
- mezclar estilos de barras y lineas en los nuevos bloques
- usar una serie temporal distinta segun el grafico y generar desalineacion
- perder estados vacios claros cuando no hay datos suficientes

---

## 8. Resultado esperado

La pantalla de `Estadisticas` debe conservar todo lo que ya tiene y sumar tres graficos lineales que:

- respeten la referencia visual de la imagen
- reflejen el periodo filtrado
- distingan con claridad entre ganancias brutas y gastos
- mejoren la lectura temporal sin cambiar la base de calculo existente
