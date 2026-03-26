# Graficos Lineales para Estadisticas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar tres graficos lineales nuevos a `Estadisticas` para mostrar ganancias brutas, gastos y su comparacion temporal sin reemplazar los graficos actuales.

**Architecture:** La implementacion se apoya en una serie temporal base para estadisticas que agrupa por dia o por mes segun el rango filtrado. Sobre esa serie se monta un componente reutilizable de Recharts que permite renderizar graficos de una linea o de dos lineas con el estilo aprobado por la usuaria.

**Tech Stack:** Next.js App Router, TypeScript, Server Actions, Recharts, date-fns, Vitest

---

### Task 1: Crear y probar la serie temporal base

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\lib\statistics-insights.ts`
- Test: `E:\Proyectos\GitHub\Estudio artieda\src\lib\statistics-insights.test.ts`

**Step 1: Write the failing test**

Agregar tests para un helper que:

- agrupe por dia cuando el rango tiene hasta 31 dias
- agrupe por mes cuando el rango es mayor
- sume `grossIncome` y `expenses` en la misma serie
- preserve meses o dias sin movimiento cuando haga falta para una curva estable

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/statistics-insights.test.ts`  
Expected: FAIL porque el helper aun no existe.

**Step 3: Write minimal implementation**

Implementar el helper en `src/lib/statistics-insights.ts` y devolver una serie compatible con los nuevos charts.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/statistics-insights.test.ts`  
Expected: PASS

### Task 2: Extender el snapshot de estadisticas

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\actions\dashboard.ts`

**Step 1: Write the failing test**

Usar el helper probado para definir el nuevo contrato de datos esperado desde la action.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/statistics-insights.test.ts`  
Expected: PASS en helpers, pero la pagina aun no consume la nueva serie.

**Step 3: Write minimal implementation**

Modificar `getStatisticsSnapshot` para devolver:

- `trendSeries` con `label`, `grossIncome` y `expenses`

Mantener `movementSeries` y el resto de la respuesta actual para no quitar graficos existentes.

**Step 4: Run targeted tests**

Run: `npm test -- src/lib/statistics-insights.test.ts`  
Expected: PASS

### Task 3: Crear el componente reutilizable de lineas

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\estadisticas\estadisticas-charts.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\lib\statistics-presentation.ts`
- Test: `E:\Proyectos\GitHub\Estudio artieda\src\lib\statistics-presentation.test.ts`

**Step 1: Write the failing test**

Agregar tests para cualquier helper de presentacion nuevo que necesite el componente, por ejemplo altura minima o formateo auxiliar.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/statistics-presentation.test.ts`  
Expected: FAIL si se agrega helper nuevo.

**Step 3: Write minimal implementation**

Crear un componente interno reutilizable que soporte:

- una sola linea con area
- dos lineas con colores configurables
- tooltip monetario consistente

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/statistics-presentation.test.ts`  
Expected: PASS

### Task 4: Insertar los tres nuevos graficos en el orden aprobado

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\estadisticas\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\estadisticas\estadisticas-charts.tsx`

**Step 1: Write the failing test**

No hace falta test unitario de UI pura. La validacion va por build y smoke visual.

**Step 2: Run build baseline**

Run: `npm run build`  
Expected: PASS sin los nuevos bloques.

**Step 3: Write minimal implementation**

Insertar:

- `Ganancias brutas` debajo del filtro
- `Gastos` despues de `Top clientes por cobrado` y `Top casos por cobrado`
- `Ganancias brutas vs gastos` al final

Sin eliminar ni sustituir ningun grafico actual.

**Step 4: Run build to verify it passes**

Run: `npm run build`  
Expected: PASS

### Task 5: Verificacion final

**Files:**
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\estadisticas\page.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\components\estadisticas\estadisticas-charts.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\actions\dashboard.ts`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\lib\statistics-insights.ts`

**Step 1: Run focused tests**

Run: `npm test -- src/lib/statistics-insights.test.ts src/lib/statistics-presentation.test.ts`  
Expected: PASS

**Step 2: Run global build**

Run: `npm run build`  
Expected: PASS

**Step 3: Manual smoke check**

Verificar que:

- los tres graficos nuevos respetan el orden pedido
- los dos primeros tienen una sola linea
- el ultimo tiene dos lineas
- los graficos existentes siguen presentes
- tooltips y ejes muestran moneda correcta
