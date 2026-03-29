# Gastos Recurrentes De Dos Modos Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separar los recurrentes en `Gasto programado` y `Gasto por pagar`, con ocurrencias por periodo, generacion automatica de gastos reales, checklist en dashboard y respaldo por cron + auto-recuperacion al abrir la app.

**Architecture:** La configuracion madre vive en `recurring_expenses`, pero cada periodo real se materializa en `recurring_expense_occurrences`. Los `Gastos programados` crean su gasto real automaticamente al vencer; los `Gastos por pagar` crean una ocurrencia pendiente/vencida y solo generan gasto real cuando el usuario marca pagado.

**Tech Stack:** Next.js App Router, server actions, Drizzle ORM, Postgres/Supabase, Vitest, Vercel Cron.

---

### Task 1: Extender modelo de datos

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/db/migrations/0004_recurring_expense_modes.sql`

**Steps:**
1. Agregar enums y columnas para modo, prioridad, aviso previo, dia de pago y origen de gasto.
2. Crear tabla de ocurrencias recurrentes.
3. Agregar referencias desde ocurrencias a gastos reales.
4. Mantener compatibilidad con recurrentes existentes.

### Task 2: Cubrir motor de ocurrencias con tests

**Files:**
- Create: `src/lib/recurring-expense-occurrences.test.ts`
- Create: `src/lib/recurring-expense-occurrences.ts`

**Steps:**
1. Escribir tests fallando para fechas automaticas, por pagar, semestrales y estados.
2. Implementar el motor minimo para calcular vencimientos y ventanas de aviso.
3. Correr la suite puntual y dejarla en verde.

### Task 3: Sincronizacion y marcado pagado

**Files:**
- Create: `src/actions/recurring-expense-occurrences.ts`
- Modify: `src/actions/recurring-expenses.ts`
- Modify: `src/actions/dashboard.ts`
- Modify: `src/actions/calendar.ts`

**Steps:**
1. Sincronizar ocurrencias pendientes/automaticas al abrir modulos clave.
2. Generar gasto real automatico para `Gasto programado`.
3. Marcar/desmarcar pago para `Gasto por pagar` creando o anulando gasto real.
4. Exponer lectura para dashboard y recordatorios.

### Task 4: UI de formulario y dashboard

**Files:**
- Modify: `src/components/expenses/recurring-expense-form.tsx`
- Modify: `src/app/(dashboard)/gastos/recurrentes/page.tsx`
- Modify: `src/app/(dashboard)/gastos/recurrentes/[id]/editar/page.tsx`
- Modify: `src/app/(dashboard)/page.tsx`
- Create: `src/components/dashboard/recurring-payables-checklist.tsx`

**Steps:**
1. Mostrar selector de modo con `Gasto por pagar` por defecto.
2. Adaptar campos condicionales por modo.
3. Agregar checklist con pendientes/pagados, barra temporal y checkbox.
4. Mantener la pantalla de recurrentes clara para ambos modos.

### Task 5: Historial, reminders y despliegue

**Files:**
- Modify: `src/app/(dashboard)/gastos/page.tsx`
- Modify: `src/app/(dashboard)/recordatorios/page.tsx`
- Modify: `src/lib/utils.ts`
- Modify: `vercel.json`

**Steps:**
1. Mostrar origen del gasto real en historial.
2. Integrar `Gastos por pagar` al circuito de alertas operativas.
3. Configurar cron diario en Vercel.
4. Verificar tests, build, migracion, push y deploy.
