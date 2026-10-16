# Asignación de tareas por persona Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Permitir que Victoria conserve tareas privadas o las asigne a asistentes legales, mientras cada asistente sólo ve sus tareas y toda tarea creada por un asistente sigue visible para Victoria.

**Architecture:** Extender la membresía privada con un nombre visible y los recordatorios con creador y responsable. Centralizar las reglas en un módulo puro y aplicarlas en todas las consultas y mutaciones del servidor; las pantallas sólo presentan las opciones que el servidor autoriza. Una migración Drizzle aditiva conserva los datos y asigna los recordatorios existentes a Briza.

**Tech Stack:** Next.js 15, React 19, TypeScript, Drizzle ORM, PostgreSQL/Supabase, Zod, Vitest.

---

### Task 1: Codificar las reglas de asignación con TDD

**Files:**
- Create: `src/lib/reminder-assignment.test.ts`
- Create: `src/lib/reminder-assignment.ts`

**Step 1: Write the failing tests**

Probar que:

- Victoria puede elegir privado (`null`) o una membresía `COLLABORATOR` activa del mismo estudio.
- Briza recibe siempre su propio UUID y no puede enviar `assigneeUserId`.
- Un asistente no puede leer ni operar recordatorios asignados a otra persona.
- Una membresía deshabilitada, de otro estudio o administradora no es un destino válido.

**Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/lib/reminder-assignment.test.ts --maxWorkers=1`

Expected: FAIL porque el módulo todavía no existe.

**Step 3: Write minimal implementation**

Crear funciones puras para resolver el responsable solicitado y evaluar la visibilidad por `{ role, actorUserId, ownerUserId }`. Usar `null` como “Sólo para Victoria”.

**Step 4: Run test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run src/lib/reminder-assignment.test.ts --maxWorkers=1`

Expected: PASS.

**Step 5: Commit**

Commit: `test: define reminder assignment rules`.

### Task 2: Extender el esquema y preparar la migración

**Files:**
- Modify: `src/db/schema.ts`
- Create: `src/db/migrations/0015_reminder_assignment.sql`
- Modify: `src/db/migrations/meta/_journal.json`
- Create: `src/db/migrations/meta/0015_snapshot.json`
- Create: `src/db/migrations/reminder-assignment.migration.test.ts`

**Step 1: Write the failing migration test**

Comprobar estáticamente y contra PostgreSQL aislado que la migración:

- agrega `display_name` a `app_private.workspace_members`;
- agrega `created_by_user_id` y `assignee_user_id` a `public.reminders`;
- registra claves foráneas seguras e índice `(user_id, assignee_user_id)`;
- asigna Victoria y Briza por correo;
- conserva el número y contenido de recordatorios;
- asigna los recordatorios existentes a la única asistente activa del estudio;
- aborta si el estudio objetivo no tiene exactamente una asistente activa.

**Step 2: Run test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/db/migrations/reminder-assignment.migration.test.ts --maxWorkers=1`

Expected: FAIL por ausencia de la migración/columnas.

**Step 3: Implement the schema and migration**

Agregar `displayName` no nulo a membresías, `createdByUserId` y `assigneeUserId` anulables a recordatorios, índices y relaciones necesarias. La migración rellena creador con la dueña y responsable con Briza para el estudio Artieda; otras cuentas conservan un nombre derivado de su correo y sus tareas quedan privadas para su dueña.

**Step 4: Generate and review Drizzle metadata**

Run: `npm run db:generate`

Revisar manualmente el SQL generado, el snapshot y el journal. No usar `db:push` ni introducir historial de migraciones de Supabase.

**Step 5: Run migration tests**

Run: `node node_modules/vitest/vitest.mjs run src/db/migrations/reminder-assignment.migration.test.ts --maxWorkers=1`

Expected: PASS, sin cambios de filas de negocio fuera de las nuevas columnas.

**Step 6: Commit**

Commit: `feat: store task creators and assignees`.

### Task 3: Incluir nombres visibles en el acceso de trabajo

**Files:**
- Modify: `src/lib/workspace-access.ts`
- Modify: `src/lib/workspace-access.test.ts`
- Modify: `src/lib/workspace-access.integration.test.ts`
- Modify: `src/lib/workspace-permissions.ts`

**Step 1: Write failing tests**

Esperar que `getWorkspaceAccess()` devuelva `displayName`, que rechace nombres vacíos y mantenga la validación de Victoria/Briza desde membresías privadas.

**Step 2: Verify RED**

Run: `node node_modules/vitest/vitest.mjs run src/lib/workspace-access.test.ts src/lib/workspace-access.integration.test.ts --maxWorkers=1`

Expected: FAIL por campo faltante.

**Step 3: Implement and verify GREEN**

Devolver el nombre visible protegido y agregar la etiqueta de presentación `Asistente legal` sin cambiar el rol interno `COLLABORATOR`.

**Step 4: Commit**

Commit: `feat: expose protected workspace display names`.

### Task 4: Aplicar visibilidad y asignación a las acciones del servidor

**Files:**
- Modify: `src/actions/reminders.ts`
- Modify: `src/actions/operational.ts`
- Modify: `src/lib/operational-projections.ts`
- Modify: `src/actions/operational-access.test.ts`
- Modify: `src/actions/operational-roles.integration.test.ts`
- Create: `src/actions/reminder-assignment.integration.test.ts`

**Step 1: Write failing action tests**

Cubrir creación privada/asignada por Victoria, autoasignación de Briza, rechazo de campos falsificados, lectura sólo de tareas asignadas, protección de editar/completar/reabrir y visibilidad total para Victoria. Incluir recordatorios anidados en clientes/casos y nombres `createdByName`/`assigneeName`.

**Step 2: Verify RED**

Run: `node node_modules/vitest/vitest.mjs run src/actions/operational-access.test.ts src/actions/operational-roles.integration.test.ts src/actions/reminder-assignment.integration.test.ts --maxWorkers=1`

Expected: FAIL con la visibilidad compartida actual.

**Step 3: Implement minimal server behavior**

Validar el responsable contra `workspace_members`, filtrar en las consultas antes de proyectar, autoasignar las altas del asistente, conservar asignación en ediciones del asistente y repetir el control en cambios de estado. Revalidar panel, calendario, clientes y casos afectados.

**Step 4: Verify GREEN**

Ejecutar los tres archivos hasta que pasen sin omisiones.

**Step 5: Commit**

Commit: `feat: enforce per-person task visibility`.

### Task 5: Actualizar las pantallas de tareas

**Files:**
- Modify: `src/app/(dashboard)/recordatorios/page.tsx`
- Modify: `src/app/(dashboard)/recordatorios/[id]/editar/page.tsx`
- Modify: `src/components/operational/workspace-pages.tsx`
- Modify: `src/components/operational/reminder-calendar.tsx`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/lib/app-shell.ts`
- Modify: `src/app/(dashboard)/collaborator-pages.test.tsx`
- Modify: `src/components/operational/workspace-pages.test.tsx`
- Create: `src/app/(dashboard)/recordatorios/reminder-assignment-ui.test.tsx`

**Step 1: Write failing UI tests**

Probar que Victoria ve “Solo para Victoria” y Briza como responsable; Briza no ve selector y sí el aviso de autoasignación; las tarjetas muestran “Asignada a” y “Creada por”; la interfaz usa “Asistente legal”, Victoria y Briza en lugar de “Administradora”.

**Step 2: Verify RED**

Run: `node node_modules/vitest/vitest.mjs run "src/app/(dashboard)/recordatorios/reminder-assignment-ui.test.tsx" "src/app/(dashboard)/collaborator-pages.test.tsx" src/components/operational/workspace-pages.test.tsx --maxWorkers=1`

Expected: FAIL porque los controles y etiquetas aún no existen.

**Step 3: Implement UI**

Agregar selector sólo para Victoria, texto informativo para Briza y etiquetas de creador/responsable en pendientes y resueltos. Mantener los campos y estilos actuales.

**Step 4: Verify GREEN and commit**

Commit: `feat: show task ownership and assignment controls`.

### Task 6: Verificación integral local

**Files:**
- Modify: `docs/collaborator-access.md`
- Create: `docs/audits/2026-10-16-asignacion-tareas.md`

**Step 1: Run focused tests**

Ejecutar todos los archivos nuevos y modificados con PostgreSQL sintético aislado.

**Step 2: Run the complete suite**

Run: `node node_modules/vitest/vitest.mjs run --maxWorkers=1`

Expected: todas las pruebas pasan, cero omitidas.

**Step 3: Run static and build checks**

Run: `node node_modules/typescript/bin/tsc --noEmit --incremental false`

Run: `node node_modules/eslint/bin/eslint.js src --ext .ts,.tsx --max-warnings=0`

Run: `node node_modules/next/dist/bin/next build`

Expected: exit 0 en los tres.

**Step 4: Verify browser behavior**

Con fixture sintético separado, comprobar Victoria y Briza en escritorio y móvil: creación, edición, visibilidad, calendario y URL manipulada. No usar datos reales para escrituras.

**Step 5: Document and commit**

Actualizar la matriz de permisos y registrar evidencias sin contraseñas ni claves.

### Task 7: Respaldo, migración y publicación segura

**Files:**
- Create under ignored evidence folder: `output/task-assignment-2026-10-16/*`

**Step 1: Create and verify a fresh production backup**

Usar el respaldo PostgreSQL nativo ya instalado. Verificar hashes, Storage, lectura total del archivo y restaurar en una base aislada.

**Step 2: Rehearse exact migration on restored data**

Comparar conteos y huellas antes/después, verificar nombres, creador/responsable y la visibilidad de Victoria/Briza.

**Step 3: Prepare production migration**

Exigir respaldo reciente, restauración coincidente, hash exacto de SQL y todos los controles locales aprobados.

**Step 4: Apply migration once**

Usar transacción, tiempos máximos y bloqueo breve. No repetir `apply`; después usar sólo `verify`.

**Step 5: Deploy Vercel production**

Publicar desde la rama limpia `codex/reminder-assignment` y confirmar estado `READY` y alias canónico.

**Step 6: Verify production read-only behavior**

Comprobar migración, cuatro membresías, nombres Victoria/Briza, asignación de recordatorios existentes, rutas públicas y bloqueo de tablas. No crear tareas reales ni enviar correos.

**Step 7: Run and verify post-release backup**

Confirmar que el nuevo esquema y los datos de asignación están incluidos. Registrar despliegue anterior para reversión.

**Step 8: Commit final audit evidence references**

Commit: `docs: record task assignment production verification`.
