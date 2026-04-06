# Privacidad de Montos Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Agregar un modo global para ocultar o mostrar montos monetarios en todo el sistema autenticado sin afectar formularios ni numeros no monetarios.

**Architecture:** La solucion se apoya en un provider cliente dentro de `DashboardShell` para manejar el estado global y persistirlo en `localStorage`. Los montos visibles pasan por una capa de presentacion reutilizable que decide entre mostrar `formatCurrency(...)` o una mascara, mientras que los inputs monetarios permanecen intactos.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, lucide-react, Vitest

---

### Task 1: Crear la capa pura de presentacion monetaria

**Files:**
- Create: `E:\Proyectos\GitHub\Estudio artieda\src\lib\money-visibility.ts`
- Create: `E:\Proyectos\GitHub\Estudio artieda\src\lib\money-visibility.test.ts`

**Step 1: Write the failing test**

Agregar tests para:

- devolver `***` cuando `hidden` sea `true`
- devolver `formatCurrency(...)` cuando `hidden` sea `false`
- aceptar `number`, `string`, `null` y `undefined`
- no romper el formato monetario existente cuando el valor esta visible

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/money-visibility.test.ts`  
Expected: FAIL porque el modulo aun no existe.

**Step 3: Write minimal implementation**

Crear un helper puro con una API pequena, por ejemplo:

- `MONEY_MASK`
- `formatDisplayCurrency(value, hidden)`

Internamente debe reutilizar `formatCurrency(...)` desde `src/lib/utils.ts`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/money-visibility.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/money-visibility.ts src/lib/money-visibility.test.ts
git commit -m "feat: add money visibility formatter"
```

### Task 2: Crear el estado global y el toggle del header

**Files:**
- Create: `E:\Proyectos\GitHub\Estudio artieda\src\components\system\money-visibility-provider.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\layout\dashboard-shell.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\layout\header.tsx`

**Step 1: Write the failing test**

Agregar tests al helper puro o a una funcion de lectura inicial para validar:

- default visible cuando no existe preferencia guardada
- lectura de `localStorage` cuando la preferencia existe

Si no conviene testear el provider directo, crear una funcion pura auxiliar en `src/lib/money-visibility.ts` y cubrirla ahi.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/money-visibility.test.ts`  
Expected: FAIL con el nuevo caso agregado.

**Step 3: Write minimal implementation**

Implementar en el provider:

- contexto con `isMoneyHidden`
- accion `toggleMoneyVisibility()`
- persistencia con una clave dedicada de `localStorage`

En `DashboardShell` envolver el contenido autenticado con el provider.

En `Header` agregar un boton con:

- `Eye` / `EyeOff` de `lucide-react`
- `title` accesible segun el estado
- estilo consistente con el resto de la cabecera

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/money-visibility.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/money-visibility.ts src/lib/money-visibility.test.ts src/components/system/money-visibility-provider.tsx src/components/layout/dashboard-shell.tsx src/components/layout/header.tsx
git commit -m "feat: add global money visibility toggle"
```

### Task 3: Crear el componente reutilizable para montos visibles

**Files:**
- Create: `E:\Proyectos\GitHub\Estudio artieda\src\components\system\money-amount.tsx`

**Step 1: Write the failing test**

Agregar al test del helper casos que documenten la salida esperada del texto mostrado para visible y oculto. El componente puede mantenerse sin test de render si solo compone provider + helper puro.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/money-visibility.test.ts`  
Expected: FAIL hasta cubrir el caso nuevo.

**Step 3: Write minimal implementation**

Crear un componente pequeno que:

- lea `isMoneyHidden` desde el provider
- reciba `value`
- renderice el texto usando `formatDisplayCurrency(value, isMoneyHidden)`
- soporte `className` opcional y wrapper configurable si hace falta

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/money-visibility.test.ts`  
Expected: PASS

### Task 4: Aplicar la mascara a dashboard y componentes compartidos

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\system\metric-card.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\dashboard\dashboard-charts.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\dashboard\recurring-payables-checklist.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\expenses\automatic-recurring-overview.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\components\estadisticas\estadisticas-charts.tsx`

**Step 1: Write the failing test**

Agregar un test de fuente o helper si hace falta para documentar que las metric cards del dashboard dejan de renderizar `formatCurrency(...)` directo para valores monetarios compartidos.

Una alternativa aceptable es ampliar `src/app/(dashboard)/cobros/page-layout.test.ts` o crear un test equivalente de strings para asegurar el uso del componente reutilizable en paginas clave.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/money-visibility.test.ts src/app/(dashboard)/cobros/page-layout.test.ts`  
Expected: FAIL por referencias directas antiguas o por expectativa nueva no satisfecha.

**Step 3: Write minimal implementation**

Reemplazar valores monetarios visibles por `MoneyAmount` o por la salida del helper en:

- cards del dashboard
- chips de saldo o deuda
- paneles destacados
- tooltips o leyendas monetarias de graficos

No tocar textos que solo muestren contadores o fechas.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/money-visibility.test.ts src/app/(dashboard)/cobros/page-layout.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(dashboard)/page.tsx src/components/system/metric-card.tsx src/components/dashboard/dashboard-charts.tsx src/components/dashboard/recurring-payables-checklist.tsx src/components/expenses/automatic-recurring-overview.tsx src/components/estadisticas/estadisticas-charts.tsx
git commit -m "feat: hide money values on dashboard surfaces"
```

### Task 5: Aplicar la mascara al resto de los modulos financieros

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\calendario\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\casos\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\casos\[id]\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\clientes\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\clientes\[id]\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\cobros\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\cobros\[id]\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\estadisticas\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\gastos\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\gastos\[id]\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\gastos\recurrentes\page.tsx`
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\recordatorios\page.tsx`

**Step 1: Write the failing test**

Agregar o ajustar tests ligeros de strings en las paginas mas sensibles para confirmar que los montos visibles pasan por la nueva capa y que los formularios no forman parte del cambio.

Priorizar:

- `src/app/(dashboard)/cobros/page-layout.test.ts`
- `src/lib/utils.test.ts`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/(dashboard)/cobros/page-layout.test.ts src/lib/utils.test.ts`  
Expected: FAIL con la expectativa nueva.

**Step 3: Write minimal implementation**

Sustituir cada `formatCurrency(...)` de presentacion visible por la capa reusable, revisando una por una las pantallas encontradas por busqueda.

No modificar:

- paginas `nuevo`
- paginas `editar`
- `currency-input`
- validaciones de acciones o logica de negocio

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/(dashboard)/cobros/page-layout.test.ts src/lib/utils.test.ts src/lib/money-visibility.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(dashboard)/calendario/page.tsx src/app/(dashboard)/casos/page.tsx src/app/(dashboard)/casos/[id]/page.tsx src/app/(dashboard)/clientes/page.tsx src/app/(dashboard)/clientes/[id]/page.tsx src/app/(dashboard)/cobros/page.tsx src/app/(dashboard)/cobros/[id]/page.tsx src/app/(dashboard)/estadisticas/page.tsx src/app/(dashboard)/gastos/page.tsx src/app/(dashboard)/gastos/[id]/page.tsx src/app/(dashboard)/gastos/recurrentes/page.tsx src/app/(dashboard)/recordatorios/page.tsx
git commit -m "feat: apply money privacy across financial pages"
```

### Task 6: Verificacion final

**Files:**
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\components\layout\header.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\components\system\money-visibility-provider.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\components\system\money-amount.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\page.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\cobros\page.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\gastos\page.tsx`

**Step 1: Run focused tests**

Run: `npm test -- src/lib/money-visibility.test.ts src/lib/utils.test.ts src/app/(dashboard)/cobros/page-layout.test.ts`  
Expected: PASS

**Step 2: Run build**

Run: `npm run build`  
Expected: PASS

**Step 3: Manual sanity check**

Confirmar manualmente que:

- el ojo aparece en el header del sistema autenticado
- al activarlo se ocultan montos en dashboard, cobros, clientes, casos, gastos y estadisticas
- fechas y porcentajes siguen visibles
- formularios de `nuevo` y `editar` siguen mostrando los importes editables
- recargar la pagina conserva la preferencia
