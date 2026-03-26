# Centro de Ayuda del Sistema Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reemplazar la pantalla actual de `Configuracion` por un centro de ayuda del sistema con buscador, accesos por modulo y contenido operativo reutilizable.

**Architecture:** La implementacion separa los datos de ayuda de la UI para que el contenido pueda crecer sin inflar la pagina. Un helper puro resuelve el filtrado y se prueba con Vitest; la pantalla solo consume resultados y renderiza secciones y tarjetas.

**Tech Stack:** Next.js App Router, TypeScript, React 19, Tailwind CSS, Vitest, lucide-react

---

### Task 1: Crear el modelo de ayuda y el filtrado

**Files:**
- Create: `E:\Proyectos\GitHub\Estudio artieda\src\lib\help-center.ts`
- Test: `E:\Proyectos\GitHub\Estudio artieda\src\lib\help-center.test.ts`

**Step 1: Write the failing test**

Agregar tests para verificar que el buscador:

- devuelve todo el contenido sin query
- encuentra coincidencias por titulo y palabras clave
- permite buscar tareas como `registrar pago`
- tolera mayusculas y minusculas
- devuelve vacio cuando no hay coincidencias

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/help-center.test.ts`  
Expected: FAIL porque el modulo aun no existe.

**Step 3: Write minimal implementation**

Crear el modulo con:

- tipos para modulos y entradas
- coleccion de modulos principales
- coleccion inicial de entradas de ayuda
- helper de filtrado reutilizable

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/help-center.test.ts`  
Expected: PASS

### Task 2: Crear componentes livianos de ayuda

**Files:**
- Create: `E:\Proyectos\GitHub\Estudio artieda\src\components\help\help-search.tsx`
- Create: `E:\Proyectos\GitHub\Estudio artieda\src\components\help\help-module-grid.tsx`
- Create: `E:\Proyectos\GitHub\Estudio artieda\src\components\help\help-entry-list.tsx`

**Step 1: Write the failing test**

No hace falta test unitario de presentacion si la logica ya esta aislada en el helper.

**Step 2: Write minimal implementation**

Crear componentes simples y reutilizables para renderizar:

- buscador
- modulos navegables
- listado de entradas filtradas

**Step 3: Manual review**

Verificar que los componentes acepten props simples y no dupliquen logica de filtrado.

### Task 3: Reescribir la pagina de configuracion como centro de ayuda

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\configuracion\page.tsx`

**Step 1: Write the failing test**

No hace falta test unitario de pagina completa. La verificacion se apoya en el helper y en el build.

**Step 2: Write minimal implementation**

Reemplazar el contenido actual por:

- header con nueva identidad
- buscador visible
- resumen del sistema
- accesos por modulo
- tareas frecuentes
- resultados filtrables
- estado vacio

**Step 3: Run targeted tests**

Run: `npm test -- src/lib/help-center.test.ts`  
Expected: PASS

### Task 4: Actualizar la navegacion del shell

**Files:**
- Modify: `E:\Proyectos\GitHub\Estudio artieda\src\lib\app-shell.ts`

**Step 1: Write minimal implementation**

Renombrar el item del menu y su descripcion para que deje de leerse como configuracion.

**Step 2: Run verification**

Run: `npm test -- src/lib/app-shell.test.ts`  
Expected: PASS si hay cobertura afectada, o sin cambios si el test no valida ese label.

### Task 5: Verificacion final

**Files:**
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\lib\help-center.ts`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\app\(dashboard)\configuracion\page.tsx`
- Verify: `E:\Proyectos\GitHub\Estudio artieda\src\lib\app-shell.ts`

**Step 1: Run focused tests**

Run: `npm test -- src/lib/help-center.test.ts src/lib/app-shell.test.ts`  
Expected: PASS

**Step 2: Run build**

Run: `npm run build`  
Expected: PASS

**Step 3: Manual sanity check**

Confirmar que:

- el menu muestra la nueva etiqueta
- la pantalla carga sin errores
- el buscador filtra por modulos, tareas y conceptos
- existen respuestas para cobros, gastos, casos y recordatorios
