# Cierre Predeploy Y Tests De Calculos Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dejar el sistema realmente listo para deploy corrigiendo el build de produccion, resolviendo los pendientes funcionales visibles y ampliando la cobertura de tests sobre calculos financieros, fechas y reglas derivadas.

**Architecture:** El cierre se apoya en tres frentes. Primero, corregir el pipeline de build de Next.js para que la app compile en produccion de forma repetible. Segundo, decidir si la pantalla de configuracion se completa en V1 o se reduce para no exponer placeholders como parte del producto terminado. Tercero, blindar la capa de reglas con tests de regresion sobre helpers y calculos, priorizando saldos, pagos parciales, estados derivados, proyecciones recurrentes, rangos de fechas y comparaciones estadisticas.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, Drizzle ORM, Vitest

---

### Task 1: Corregir el build de produccion

**Files:**
- Modify: `next.config.ts`
- Modify: `package.json`
- Inspect/Modify: `src/app/layout.tsx`
- Inspect/Modify: `src/app/(dashboard)/layout.tsx`
- Inspect/Modify: `src/middleware.ts`
- Test: `npm run build`

**Step 1: Reproducir el fallo de build**

Run: `npm run build`
Expected: FAIL con `PageNotFoundError` para `/_document`

**Step 2: Auditar configuracion y entradas**

Revisar si el error nace por:
- cache vieja en `.next`
- mezcla de App Router con expectativa de Pages Router
- config experimental innecesaria
- importaciones o convenciones incompatibles con build de produccion

**Step 3: Aplicar la correccion minima**

Corregir solo lo necesario para que el build deje de buscar `/_document` en un proyecto que usa `src/app`.

**Step 4: Verificar build limpio**

Run: `Remove-Item -Recurse -Force .next; npm run build`
Expected: PASS sin `PageNotFoundError`

**Step 5: Commit**

```bash
git add next.config.ts package.json src/app/layout.tsx src/app/\(dashboard\)/layout.tsx src/middleware.ts
git commit -m "fix: restore production build"
```

### Task 2: Definir cierre de la pantalla de configuracion

**Files:**
- Modify: `src/app/(dashboard)/configuracion/page.tsx`
- Optional Create/Modify: `src/components/system/empty-state.tsx`
- Optional Create/Modify: `src/actions/demo-seed.ts`
- Test: navegacion manual de `/configuracion`

**Step 1: Tomar decision de producto**

Elegir una de estas dos opciones:
- completar una V1 minima de configuracion
- o dejar la pagina reducida a utilidades reales y quitar bloques marcados como pendientes

**Step 2: Si se mantiene minima, simplificar**

Dejar solo contenido real:
- estado de cuenta privada
- origen de datos
- semilla demo
- informacion operativa util

Quitar textos como `Pendiente de implementacion`.

**Step 3: Si se completa, implementar solo V1 real**

Agregar una configuracion chica y operativa, por ejemplo:
- metodos de cobro informativos
- preferencias visuales o de trabajo si ya existe soporte real

No sumar modulos nuevos sin persistencia real.

**Step 4: Verificar experiencia**

Comprobar que `/configuracion` ya no se sienta como placeholder.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/configuracion/page.tsx src/components/system/empty-state.tsx src/actions/demo-seed.ts
git commit -m "feat: close configuration page for v1"
```

### Task 3: Armar una matriz de calculos criticos

**Files:**
- Modify: `docs/plans/2026-03-25-cierre-predeploy-y-tests-calculos.md`
- Inspect: `src/lib/utils.ts`
- Inspect: `src/lib/charge-insights.ts`
- Inspect: `src/lib/case-insights.ts`
- Inspect: `src/lib/client-insights.ts`
- Inspect: `src/lib/expense-insights.ts`
- Inspect: `src/lib/analytics-insights.ts`
- Inspect: `src/lib/statistics-insights.ts`
- Inspect: `src/lib/operations-insights.ts`
- Inspect: `src/actions/recurring-expenses.ts`

**Step 1: Enumerar reglas numericas y temporales**

Cubrir al menos estos grupos:
- suma de pagos
- saldo pendiente
- neto mensual
- deuda por cliente
- deuda por caso
- gastos anulados fuera de metricas
- cobros cancelados fuera de metricas
- estado derivado por monto y vencimiento
- proyeccion mensual de recurrentes
- comparacion entre periodos
- armado de series por dia y por mes
- orden de proximos vencimientos y recordatorios

**Step 2: Marcar riesgos por borde**

Incluir:
- monto cero
- pagos exactos al total
- pagos parciales multiples
- fechas nulas
- fechas en limite de mes
- meses sin movimientos
- comparaciones con periodo previo vacio
- cobros cancelados con pagos historicos
- gastos anulados con fecha dentro del rango

**Step 3: Convertir la matriz en backlog de tests**

Agrupar por modulo y evitar duplicaciones.

**Matriz explicita de calculos criticos**

| Dominio | Reglas a blindar | Bordes que no pueden romperse | Archivos objetivo |
| --- | --- | --- | --- |
| Estado del cobro | saldo, monto pagado, vencido, pagado, parcial, cancelado | pago exacto, pago parcial multiple, sin vencimiento, cancelado con pagos | `src/lib/utils.ts`, `src/lib/charge-insights.ts` |
| Mutaciones de cobro | pago inicial al crear, preservacion de monto, validacion de entradas | monto cero, monto invalido, alta sin pago inicial | `src/lib/charge-mutations.ts` |
| Finanzas por caso | fee, cobrado, deuda, proximo vencimiento | caso sin cobros, cobros mezclados, cobros cancelados | `src/lib/case-insights.ts` |
| Finanzas por cliente | deuda total, cobrado total, portfolio status | multiples casos, casos cerrados, recordatorios abiertos | `src/lib/client-insights.ts`, `src/lib/detail-summaries.ts` |
| Gastos reales | suma, filtros, categorias, impacto en neto | gastos anulados, meses vacios, categorias vacias | `src/lib/expense-insights.ts`, `src/lib/expense-categories.ts` |
| Gastos recurrentes | proyeccion mensual, frecuencia mensual/trimestral/anual | inicio posterior, fin anterior, inactivo, borde de mes | `src/actions/recurring-expenses.ts` |
| Dashboard | expected income, collected, pending, neto, top clients, urgencias | periodo vacio, cobros cancelados, gastos anulados, sin recordatorios | `src/lib/analytics-insights.ts`, `src/actions/dashboard.ts` |
| Estadisticas | deltas, comparaciones, periodo previo, series | periodo previo en cero, delta plano, rangos cortos/largos | `src/lib/statistics-insights.ts`, `src/lib/statistics-presentation.ts` |
| Calendario y operaciones | armado del mes, orden de eventos, agrupacion por fecha | dias fuera del mes, eventos simultaneos, agenda vacia | `src/lib/operations-insights.ts` |

**Backlog de tests derivado**

- `src/lib/utils.test.ts`: estado derivado del cobro y labels base.
- `src/lib/charge-insights.test.ts`: resumen de pagos, saldo y prioridad de cancelacion.
- `src/lib/charge-mutations.test.ts`: reglas al crear cobro con y sin pago inicial.
- `src/lib/case-insights.test.ts`: deuda y vencimientos por caso.
- `src/lib/client-insights.test.ts`: consolidado financiero por cliente.
- `src/lib/detail-summaries.test.ts`: agregados de soporte para vistas de detalle.
- `src/lib/expense-insights.test.ts`: impacto de gastos reales y anulados.
- `src/lib/expense-categories.test.ts`: agrupacion y porcentajes por categoria.
- `src/actions/recurring-expenses.test.ts`: proyecciones por frecuencia y ventanas temporales.
- `src/lib/analytics-insights.test.ts`: ranking, breakdowns y prioridades del dashboard.
- `src/lib/statistics-insights.test.ts`: comparaciones, deltas y series.
- `src/lib/statistics-presentation.test.ts`: consistencia de salida para UI estadistica.
- `src/lib/operations-insights.test.ts`: calendario y agenda operativa.

### Task 4: Blindar helpers base de dinero y estados

**Files:**
- Modify: `src/lib/utils.test.ts`
- Modify: `src/lib/utils.ts`
- Modify: `src/lib/presentation.test.ts`
- Test: `npm test -- src/lib/utils.test.ts src/lib/presentation.test.ts`

**Step 1: Escribir tests faltantes**

Agregar casos para:
- `deriveChargeStatus`
- labels de estados
- formateo y conversiones usadas en UI si afectan lectura financiera

Escenarios minimos:
- pendiente sin pagos
- parcial con pagos intermedios
- pagado exacto
- vencido por fecha
- cancelado con `cancelledAt`
- prioridad de cancelacion por encima del resto

**Step 2: Ejecutar tests focalizados**

Run: `npm test -- src/lib/utils.test.ts src/lib/presentation.test.ts`
Expected: FAIL si falta cubrir algun edge case

**Step 3: Ajustar implementacion si corresponde**

Corregir minima logica solo si algun test revela inconsistencia real.

**Step 4: Verificar**

Run: `npm test -- src/lib/utils.test.ts src/lib/presentation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/utils.ts src/lib/utils.test.ts src/lib/presentation.test.ts
git commit -m "test: cover charge status math and labels"
```

### Task 5: Blindar calculos de cobros, pagos y saldos

**Files:**
- Modify: `src/lib/charge-insights.test.ts`
- Modify: `src/lib/charge-mutations.test.ts`
- Optional Modify: `src/lib/charge-insights.ts`
- Optional Modify: `src/lib/charge-mutations.ts`
- Test: `npm test -- src/lib/charge-insights.test.ts src/lib/charge-mutations.test.ts`

**Step 1: Escribir tests de resumen financiero**

Cubrir:
- suma total pagada
- saldo restante
- estado derivado final
- primer vencimiento relevante
- exclusiones por cancelacion

**Step 2: Escribir tests de mutaciones**

Cubrir:
- alta de cobro marcado como pagado
- pago inicial correcto
- rechazo de montos invalidos
- preservacion de datos cuando el alta no crea pago inicial

**Step 3: Ejecutar tests**

Run: `npm test -- src/lib/charge-insights.test.ts src/lib/charge-mutations.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/charge-insights.test.ts src/lib/charge-mutations.test.ts src/lib/charge-insights.ts src/lib/charge-mutations.ts
git commit -m "test: expand coverage for charges and payments math"
```

### Task 6: Blindar calculos por caso y por cliente

**Files:**
- Modify: `src/lib/case-insights.test.ts`
- Modify: `src/lib/client-insights.test.ts`
- Modify: `src/lib/detail-summaries.test.ts`
- Optional Modify: `src/lib/case-insights.ts`
- Optional Modify: `src/lib/client-insights.ts`
- Test: `npm test -- src/lib/case-insights.test.ts src/lib/client-insights.test.ts src/lib/detail-summaries.test.ts`

**Step 1: Agregar escenarios de caso**

Cubrir:
- honorarios vs cobrado
- saldo del caso
- multiples cobros con diferentes estados
- proximo vencimiento
- timeline vacio

**Step 2: Agregar escenarios de cliente**

Cubrir:
- suma consolidada de casos
- deuda total del cliente
- clientes con casos cerrados y activos mezclados
- recordatorios abiertos impactando portfolio status

**Step 3: Agregar escenarios de detalle**

Cubrir:
- resumen agregado por caso
- resumen agregado por cliente
- comportamiento con arrays vacios

**Step 4: Verificar**

Run: `npm test -- src/lib/case-insights.test.ts src/lib/client-insights.test.ts src/lib/detail-summaries.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/case-insights.test.ts src/lib/client-insights.test.ts src/lib/detail-summaries.test.ts src/lib/case-insights.ts src/lib/client-insights.ts
git commit -m "test: cover case and client financial summaries"
```

### Task 7: Blindar gastos, recurrentes y proyecciones

**Files:**
- Modify: `src/lib/expense-insights.test.ts`
- Modify: `src/lib/expense-categories.test.ts`
- Create or Modify: `src/actions/recurring-expenses.test.ts`
- Optional Modify: `src/lib/expense-insights.ts`
- Optional Modify: `src/actions/recurring-expenses.ts`
- Test: `npm test -- src/lib/expense-insights.test.ts src/lib/expense-categories.test.ts src/actions/recurring-expenses.test.ts`

**Step 1: Agregar tests de gastos reales**

Cubrir:
- suma por categoria
- exclusion de anulados
- filtros por tipo
- meses sin gastos

**Step 2: Agregar tests de recurrentes**

Cubrir:
- frecuencia mensual
- frecuencia trimestral
- frecuencia anual
- `startDate` posterior al mes consultado
- `endDate` anterior al mes consultado
- recurrente activo vs inactivo
- meses frontera

**Step 3: Ejecutar**

Run: `npm test -- src/lib/expense-insights.test.ts src/lib/expense-categories.test.ts src/actions/recurring-expenses.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/expense-insights.test.ts src/lib/expense-categories.test.ts src/actions/recurring-expenses.test.ts src/lib/expense-insights.ts src/actions/recurring-expenses.ts
git commit -m "test: cover expenses and recurring projections"
```

### Task 8: Blindar dashboard, estadisticas y series temporales

**Files:**
- Modify: `src/lib/analytics-insights.test.ts`
- Modify: `src/lib/statistics-insights.test.ts`
- Modify: `src/lib/statistics-presentation.test.ts`
- Modify: `src/lib/operations-insights.test.ts`
- Optional Modify: `src/lib/analytics-insights.ts`
- Optional Modify: `src/lib/statistics-insights.ts`
- Optional Modify: `src/lib/operations-insights.ts`
- Test: `npm test -- src/lib/analytics-insights.test.ts src/lib/statistics-insights.test.ts src/lib/statistics-presentation.test.ts src/lib/operations-insights.test.ts`

**Step 1: Agregar tests de analytics**

Cubrir:
- top clients
- breakdown por estado
- series mensuales netas
- proximos cobros ordenados
- recordatorios urgentes ordenados

**Step 2: Agregar tests de estadisticas**

Cubrir:
- deltas positivo, negativo y plano
- periodos previos equivalentes
- comparaciones con cero
- barras comparativas
- series diarias vs mensuales segun longitud del rango

**Step 3: Agregar tests de operaciones/calendario**

Cubrir:
- armado de mes calendario
- insercion correcta de eventos en celdas
- dias fuera del mes actual
- orden y agrupacion temporal

**Step 4: Ejecutar**

Run: `npm test -- src/lib/analytics-insights.test.ts src/lib/statistics-insights.test.ts src/lib/statistics-presentation.test.ts src/lib/operations-insights.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/analytics-insights.test.ts src/lib/statistics-insights.test.ts src/lib/statistics-presentation.test.ts src/lib/operations-insights.test.ts src/lib/analytics-insights.ts src/lib/statistics-insights.ts src/lib/operations-insights.ts
git commit -m "test: harden dashboard and date-based calculations"
```

### Task 9: Verificar flujo completo antes de deploy

**Files:**
- No code changes required by default
- Verify: `package.json`
- Verify: rutas en `src/app/(dashboard)`

**Step 1: Ejecutar suite completa**

Run: `npm test`
Expected: PASS

**Step 2: Ejecutar build limpio**

Run: `Remove-Item -Recurse -Force .next; npm run build`
Expected: PASS

**Step 3: Smoke test manual**

Validar al menos:
- login
- dashboard
- alta y edicion de cliente
- alta y edicion de caso
- alta de cobro
- pago parcial
- alta y anulacion de gasto
- recordatorio completar/reabrir
- calendario
- estadisticas
- historial

**Step 4: Checklist de release**

Confirmar:
- sin placeholders visibles de “pendiente”
- sin errores de build
- tests verdes
- rutas principales navegables

**Step 5: Commit**

```bash
git add .
git commit -m "chore: finalize predeploy verification"
```
