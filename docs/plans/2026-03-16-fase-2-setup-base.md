# FASE 2 Setup Base Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dejar operativa la base tecnica del sistema web para gestion personal de una abogada con Next.js, Supabase y Drizzle, sin avanzar todavia a modulos completos de negocio.

**Architecture:** Monolito web con Next.js App Router desplegable en Vercel, autenticacion con Supabase Auth, base Postgres en Supabase y acceso a datos con Drizzle ORM. La aplicacion usa Server Actions para mutaciones, Server Components para lectura principal y una estructura simple orientada a una sola usuaria, pero con `user_id` en todas las tablas para soportar multiusuario en el futuro.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Supabase, Drizzle ORM, Zod, React Hook Form, Recharts, date-fns, Vercel

---

## Fase 2 Scope

- Inicializar el proyecto y dejar el entorno de desarrollo funcionando
- Configurar Supabase Auth y Postgres
- Configurar Drizzle y la estrategia de migraciones
- Crear la primera version del esquema de base de datos
- Proteger rutas privadas
- Crear layout base autenticado
- Dejar listas paginas placeholder y componentes base

## Orden de implementacion

1. Crear proyecto Next.js con App Router y TypeScript
2. Instalar y configurar Tailwind CSS
3. Instalar y configurar shadcn/ui
4. Definir estructura base de carpetas
5. Crear proyecto Supabase y configurar Auth
6. Conectar Supabase con Next.js
7. Instalar y configurar Drizzle ORM
8. Crear primera migracion con enums, tablas, relaciones e indices
9. Aplicar RLS y policies minimas
10. Crear middleware y guardas de rutas
11. Construir layout autenticado base con sidebar y topbar
12. Crear paginas iniciales vacias o con placeholders
13. Verificar build, login, session y migraciones

## Base de datos inicial

### Orden exacto de tablas

1. `clients`
2. `cases`
3. `charges`
4. `payments`
5. `expenses`
6. `recurring_expenses`
7. `reminders`
8. `activity_log`

### Campos minimos por tabla

- `clients`: `id`, `user_id`, `full_name`, `dni_cuit`, `email`, `phone`, `notes`, `created_at`, `updated_at`
- `cases`: `id`, `user_id`, `client_id`, `title`, `status`, `description`, `opened_at`, `closed_at`, `created_at`, `updated_at`
- `charges`: `id`, `user_id`, `case_id`, `title`, `amount_total`, `due_date`, `status`, `notes`, `created_at`, `updated_at`
  - `status` queda permitido solo como cache opcional de lectura
  - la fuente de verdad del estado del cobro debe derivarse siempre de saldo pendiente y fecha de vencimiento
- `payments`: `id`, `user_id`, `charge_id`, `amount`, `payment_date`, `payment_method`, `notes`, `created_at`
- `expenses`: `id`, `user_id`, `title`, `amount`, `expense_date`, `category`, `notes`, `created_at`, `updated_at`
- `recurring_expenses`: `id`, `user_id`, `title`, `amount`, `frequency`, `start_date`, `end_date`, `is_active`, `notes`, `created_at`, `updated_at`
  - `frequency` debe ser enum cerrado con valores `monthly`, `quarterly`, `yearly`
- `reminders`: `id`, `user_id`, `case_id`, `client_id`, `title`, `description`, `remind_at`, `priority`, `is_done`, `created_at`, `updated_at`
- `activity_log`: `id`, `user_id`, `entity_type`, `entity_id`, `action`, `previous_value`, `new_value`, `created_at`

### Relaciones iniciales

- `cases.client_id -> clients.id`
- `charges.case_id -> cases.id`
- `payments.charge_id -> charges.id`
- `reminders.case_id -> cases.id` nullable
- `reminders.client_id -> clients.id` nullable

### Constraints iniciales

- Todas las tablas con `user_id not null`
- `amount` y `amount_total` con precision decimal fija
- `status`, `frequency`, `priority` y `entity_type` como enums
- `payments.amount > 0`
- `charges.amount_total > 0`
- `expenses.amount > 0`
- `recurring_expenses.amount > 0`
- `closed_at >= opened_at` cuando ambos existan
- `end_date >= start_date` en recurrentes cuando ambos existan
- no usar `charges.status` como fuente de verdad en reglas de negocio, reportes ni validaciones

### Indices iniciales

- Indice simple por `user_id` en todas las tablas
- Indice compuesto `cases(user_id, client_id)`
- Indice compuesto `charges(user_id, case_id, status)`
- Indice compuesto `charges(user_id, due_date)`
- Indice compuesto `payments(user_id, payment_date)`
- Indice compuesto `expenses(user_id, expense_date)`
- Indice compuesto `recurring_expenses(user_id, is_active)`
- Indice compuesto `reminders(user_id, remind_at, is_done)`
- Indice compuesto `reminders(user_id, client_id)`
- Indice compuesto `reminders(user_id, case_id)`
- Indice compuesto `activity_log(user_id, created_at desc)`

## Seguridad

- Login solo con email y password
- No usar login simulado/local si Supabase Auth ya forma parte del stack aprobado
- Registro publico deshabilitado desde Supabase Auth
- Creacion manual de la primera usuaria desde dashboard SQL o Auth admin
- Middleware para redireccionar anonimos a `/login`
- Server Actions que leen `auth.getUser()` y operan solo con `user.id`
- Todas las queries filtradas por `user_id`
- RLS habilitado en todas las tablas desde la primera migracion SQL
- Policies minimas V1:
  - `select` solo si `auth.uid() = user_id`
  - `insert` solo si `auth.uid() = user_id`
  - `update` solo si `auth.uid() = user_id`
  - `delete` solo si `auth.uid() = user_id`

## Layout base

- Grupo publico `(auth)` con `/login`
- Grupo privado `(dashboard)` con layout autenticado
- Sidebar con accesos a Dashboard, Clientes, Casos, Cobros, Calendario, Gastos, Estadisticas, Notificaciones, Historial, Configuracion
- Topbar con titulo dinamico, buscador opcional pospuesto y menu de usuaria con logout
- Paginas iniciales: dashboard, clientes, casos, cobros, calendario, gastos, gastos/recurrentes, estadisticas, notificaciones, historial, configuracion
- En Fase 2 solo placeholders o listas vacias con CTA primario

## Diferir para fases posteriores

- CRUDs completos con tablas avanzadas
- Filtros complejos y busqueda global
- Upload de archivos y recibos
- Reportes complejos y estadisticas avanzadas
- Automatizacion de vencimientos
- Notificaciones email o WhatsApp
- Roles, permisos y multiusuario real

## Verificacion minima

- `npm run build`
- Login funcional con la usuaria inicial
- Redireccion de rutas privadas funcionando
- Migraciones aplicadas sin errores
- Lectura de sesion disponible en Server Components y Server Actions
- RLS bloqueando acceso cruzado entre usuarios

## Nota de contexto

El workspace actual ya contiene parte de este setup e incluso modulos adelantados. Para ejecutar la fase de forma disciplinada conviene tratar este documento como el alcance correcto de FASE 2 y posponer cualquier funcionalidad que exceda setup base.
