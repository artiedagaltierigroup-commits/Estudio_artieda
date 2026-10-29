# Brisa asigna tareas a Victoria Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir que Brisa asigne a Victoria tareas nuevas o existentes y conserve acceso a sus tareas creadas y a las que Victoria le asigne.

**Architecture:** `createdByUserId` y `assigneeUserId` definen la visibilidad de Brisa; `assigneeUserId` define la persona responsable. Las acciones validan la asignación y aplican ambos filtros al leer y modificar. Victoria conserva el alcance completo del estudio.

**Tech Stack:** Next.js 15, React 19, Drizzle/Postgres, Vitest.

---

### Task 1: Reglas de acceso y asignación

**Files:** `src/lib/reminder-assignment.test.ts`, `src/lib/reminder-assignment.ts`.

1. Escribir pruebas que permitan a Brisa asignar a sí misma o a Victoria, y rechacen terceros o colaboradoras inactivas.
2. Escribir pruebas que permitan a Brisa ver solo filas de su estudio creadas por ella o asignadas a ella, incluso cuando una tarea creada por Brisa se asignó a Victoria. Victoria ve todas las filas de su estudio.
3. Ejecutar `npx vitest run src/lib/reminder-assignment.test.ts --maxWorkers=1`; comprobar fallos por la regla antigua.
4. Implementar el cambio mínimo en `resolveReminderAssignee` y `canAccessReminder`.
5. Repetir el test y confirmar que pasa.

### Task 2: Acciones y consultas protegidas

**Files:** `src/actions/reminders.ts`, `src/actions/operational.ts`, `src/actions/operational-roles.integration.test.ts`, `src/actions/operational-access.test.ts`.

1. Añadir pruebas para lectura, creación y actualización de tareas de Brisa asignadas a Victoria; conservar tareas de Victoria asignadas a Brisa y negar acceso a tareas privadas de Victoria.
2. Ejecutar los tests relevantes y comprobar el fallo esperado.
3. Cambiar `reminderMutationWhere` para comparar `createdByUserId` o `assigneeUserId` con el actor de Brisa. Revisar proyecciones anidadas para que usen la misma regla.
4. Ejecutar los tests relevantes y confirmar que pasan.

### Task 3: Formularios de alta y edición

**Files:** `src/components/reminders/create-reminder-dialog.test.tsx`, `src/components/reminders/create-reminder-dialog.tsx`, `src/app/(dashboard)/collaborator-pages.test.tsx`, `src/app/(dashboard)/recordatorios/page.tsx`, `src/app/(dashboard)/recordatorios/[id]/editar/page.tsx`.

1. Añadir pruebas para el selector Brisa/Victoria en alta y edición, con Brisa seleccionada al crear.
2. Ejecutar los tests y comprobar el fallo esperado.
3. Mostrar el selector con identificadores válidos de actor/dueña y conservar las opciones actuales de Victoria.
4. Ejecutar los tests y confirmar que pasan.

### Task 4: Verificación y entrega

1. Ejecutar pruebas enfocadas, `npm run typecheck`, `npm test` y `npm run build`.
2. Revisar el diff y el estado de Git; confirmar que no hay migración ni datos modificados.
3. Publicar una vista previa comprobable y publicar en producción cuando el usuario lo autorice para este cambio.
