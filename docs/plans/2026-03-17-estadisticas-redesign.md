# Estadísticas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rehacer la pantalla de `Estadísticas` para que tenga filtros útiles, KPIs accionables, gráficos legibles y rankings financieros consistentes con el sistema actual.

**Architecture:** La implementación se apoya en una nueva capa analítica filtrable desde `src/actions/dashboard.ts`, que alimenta una cabecera de filtros, una fila de KPIs y una composición nueva de gráficos y rankings. Se mantiene el stack actual de Next.js App Router, Server Components y Recharts, evitando introducir APIs nuevas o lógica duplicada fuera de la capa analítica.

**Tech Stack:** Next.js App Router, TypeScript, Server Actions, Drizzle ORM, Recharts, date-fns, shadcn/ui, Vitest

---

### Task 1: Definir el contrato analítico filtrable

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\actions\dashboard.ts`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\lib\analytics-insights.ts`
- Test: `E:\Proyectos\GitHub\Estudio artieda\src\lib\analytics-insights.test.ts`

**Step 1: Write the failing test**

Agregar tests para helpers que:

- agrupen gastos por categoría
- devuelvan top categorías + `Otras`
- devuelvan top clientes por deuda
- devuelvan top casos por saldo pendiente

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/analytics-insights.test.ts`  
Expected: FAIL por helpers inexistentes o comportamiento incompleto.

**Step 3: Write minimal implementation**

Implementar en `src/lib/analytics-insights.ts`:

- `buildExpensesByCategory`
- `buildTopDebtClients`
- `buildTopPendingCases`
- helper para agrupar categorías menores en `Otras`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/analytics-insights.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/analytics-insights.ts src/lib/analytics-insights.test.ts src/actions/dashboard.ts
git commit -m "feat: add filtered analytics helpers"
```

### Task 2: Extender la action de estadísticas con filtros reales

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\actions\dashboard.ts`
- Test: `E:\Proyectos\GitHub\Estudio artieda\src\lib\analytics-insights.test.ts`

**Step 1: Write the failing test**

Agregar tests o fixtures que validen:

- filtro por `clientId`
- filtro por `caseId`
- filtro por `chargeStatus`
- filtro por `expenseCategory`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/analytics-insights.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

Modificar `getAnalyticsSnapshot` o crear una nueva action específica para estadísticas filtradas que devuelva:

- KPIs del período
- series mensuales o del rango
- gastos por categoría
- cobros por estado
- top clientes por cobrado
- clientes con deuda
- casos con saldo pendiente

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/analytics-insights.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/actions/dashboard.ts src/lib/analytics-insights.test.ts
git commit -m "feat: add filtered statistics snapshot"
```

### Task 3: Crear la barra de filtros de la pantalla

**Files:**
- Create: `E:\Proyectos\GitHub\Estudio artieda\src\components\estadisticas\estadisticas-filters.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\estadisticas\page.tsx`

**Step 1: Write the failing test**

No hace falta test unitario primero si el componente es puramente visual y server-driven. Validar con build.

**Step 2: Run build to verify the current page still lacks the new filter bar**

Run: `npm run build`  
Expected: PASS, pero sin nueva UI.

**Step 3: Write minimal implementation**

Crear un componente con:

- `Desde`
- `Hasta`
- `Cliente`
- `Caso`
- `Estado del cobro`
- `Categoría de gasto`
- botón `Filtrar`
- botón `Limpiar`

El componente debe leer y escribir vía query params.

**Step 4: Run build to verify it passes**

Run: `npm run build`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/estadisticas/estadisticas-filters.tsx src/app/(dashboard)/estadisticas/page.tsx
git commit -m "feat: add statistics filter bar"
```

### Task 4: Reorganizar KPIs y layout principal de Estadísticas

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\estadisticas\page.tsx`

**Step 1: Write the failing test**

No hace falta test unitario. Validar por build y revisión visual.

**Step 2: Run build to snapshot the current state**

Run: `npm run build`  
Expected: PASS

**Step 3: Write minimal implementation**

Reorganizar la página para tener:

- cabecera
- barra de filtros
- fila de 6 KPIs:
  - ingresos cobrados
  - pendiente por cobrar
  - gastos
  - resultado neto
  - cobros vencidos
  - clientes con deuda

**Step 4: Run build to verify it passes**

Run: `npm run build`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(dashboard)/estadisticas/page.tsx
git commit -m "feat: reorganize statistics overview metrics"
```

### Task 5: Rehacer los gráficos con visuales más útiles

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\estadisticas\estadisticas-charts.tsx`
- Test: `E:\Proyectos\GitHub\Estudio artieda\src\lib\analytics-insights.test.ts`

**Step 1: Write the failing test**

Agregar test para el helper que construye categorías top + `Otras`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/analytics-insights.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

Cambiar:

- `Gastos por categoría` de donut a barras horizontales
- `Cobros por estado` a barras o columnas
- mantener `Ingresos vs gastos vs neto`
- mantener `Top clientes`
- agregar `Clientes con deuda` o `Casos con mayor saldo pendiente`

**Step 4: Run tests and build**

Run: `npm test -- src/lib/analytics-insights.test.ts`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/estadisticas/estadisticas-charts.tsx src/lib/analytics-insights.test.ts
git commit -m "feat: redesign statistics charts for usability"
```

### Task 6: Agregar rankings inferiores y estados vacíos útiles

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\estadisticas\estadisticas-charts.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\estadisticas\page.tsx`

**Step 1: Write the failing test**

No hace falta test unitario específico si solo cambia composición visual y lectura de props.

**Step 2: Run build to snapshot current state**

Run: `npm run build`  
Expected: PASS

**Step 3: Write minimal implementation**

Agregar bloques inferiores para:

- clientes con más deuda
- casos con mayor saldo pendiente
- categorías con mayor gasto

Mejorar mensajes vacíos en cada sección.

**Step 4: Run build to verify it passes**

Run: `npm run build`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/estadisticas/estadisticas-charts.tsx src/app/(dashboard)/estadisticas/page.tsx
git commit -m "feat: add statistics rankings and empty states"
```

### Task 7: Verificación final end-to-end

**Files:**
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\estadisticas\page.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\components\estadisticas\estadisticas-charts.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\actions\dashboard.ts`

**Step 1: Run focused tests**

Run: `npm test -- src/lib/analytics-insights.test.ts`  
Expected: PASS

**Step 2: Run global build**

Run: `npm run build`  
Expected: PASS

**Step 3: Manual smoke checks**

Verificar visualmente:

- filtros responden
- KPIs cambian con filtros
- barras por categoría no pisan texto
- cobros por estado se entienden
- rankings inferiores tienen sentido

**Step 4: Commit**

```bash
git add src/app/(dashboard)/estadisticas/page.tsx src/components/estadisticas/estadisticas-charts.tsx src/actions/dashboard.ts src/lib/analytics-insights.ts src/lib/analytics-insights.test.ts
git commit -m "feat: deliver usable statistics dashboard"
```
