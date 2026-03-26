# Cierre De FASE 4 - Modelo De Datos V1

**Fecha:** 2026-03-17  
**Objetivo:** Congelar el modelo de datos V1 real del sistema para poder terminar los modulos sin seguir mezclando arquitectura, UI y reglas de negocio.

---

## 1. Resultado de FASE 4

FASE 4 queda cerrada con estos entregables:

- esquema consolidado en Drizzle
- migracion de consolidacion aplicada en Supabase
- actions corregidas para respetar reglas de negocio aprobadas
- indices y constraints base listos para operar la V1

---

## 2. Decisiones cerradas del modelo

### clients

Se mantiene como entidad base de relacion comercial y operativa.

Campos relevantes V1:

- `user_id`
- `name`
- `tax_id`
- `email`
- `phone`
- `address`
- `notes`
- timestamps

Decision:

- un cliente puede tener muchos casos
- un cliente puede tener recordatorios propios

### cases

Se consolida como expediente principal de trabajo.

Campos relevantes V1:

- `client_id`
- `title`
- `description`
- `status`
- `priority`
- `fee`
- `preferred_payment_method`
- `start_date`
- `end_date`
- timestamps

Decision:

- la prioridad queda persistida
- la preferencia de cobro queda persistida
- `end_date` no puede ser menor a `start_date`

### charges

Se consolida como compromiso de cobro de un caso.

Campos relevantes V1:

- `case_id`
- `description`
- `amount_total`
- `due_date`
- `follow_up_date`
- `status`
- `cancelled_at`
- `cancellation_reason`
- `notes`
- timestamps

Decision central:

- `status` queda solo como cache o apoyo operativo
- la fuente de verdad sigue siendo derivada desde:
  - total
  - pagos registrados
  - vencimiento
  - cancelacion

Regla V1:

- si `cancelled_at` existe, el cobro se considera cancelado
- si no esta cancelado, el estado visible se deriva
- no se usa override manual como fuente de verdad

### payments

Se mantiene como registro historico de pagos parciales o totales.

Campos relevantes V1:

- `charge_id`
- `amount`
- `payment_date`
- `method`
- `notes`
- `created_at`

Decision:

- un cobro puede tener muchos pagos
- el saldo siempre se calcula a partir de pagos reales

### expenses

Se consolida como gasto real imputable al resultado.

Campos relevantes V1:

- `description`
- `amount`
- `type`
- `category`
- `date`
- `applies_to_month`
- `receipt_url`
- `voided_at`
- `void_reason`
- `notes`
- timestamps

Decision:

- no se elimina como modelo funcional; se habilita anulacion logica
- las metricas deben ignorar gastos anulados
- `applies_to_month` permite separar fecha real de imputacion mensual

### recurring_expenses

Se consolida como plantilla de gasto recurrente.

Campos relevantes V1:

- `description`
- `amount`
- `type`
- `category`
- `frequency`
- `start_date`
- `end_date`
- `active`
- `notes`
- timestamps

Decision:

- `frequency` queda tipada con enum:
  - `monthly`
  - `quarterly`
  - `yearly`
- `end_date` puede ser null para gastos fijos sin limite

### reminders

Se consolida como modulo flexible de seguimiento.

Campos relevantes V1:

- `case_id` nullable
- `client_id` nullable
- `title`
- `description`
- `reminder_date`
- `priority`
- `completed`
- `completed_at`
- timestamps

Decision:

- puede existir recordatorio por caso
- puede existir recordatorio por cliente
- puede existir recordatorio general

### activity_log

Se consolida como historial base de cambios.

Campos relevantes V1:

- `entity_type`
- `entity_id`
- `action`
- `previous_value`
- `new_value`
- `note`
- `created_at`

Decision:

- no depender solo de metadata
- guardar valor anterior y nuevo para soportar auditoria simple desde V1

---

## 3. Reglas funcionales ya resueltas

- el estado real del cobro no depende de `charges.status`
- dashboard y listados dejan de confiar en `status` como fuente de verdad
- los cobros cancelados quedan fuera de metricas normales
- los gastos anulados quedan fuera de metricas y calendario
- recordatorios completados guardan `completed_at`

---

## 4. Migracion de consolidacion

Migracion aplicada:

- `src/db/migrations/0002_small_titania.sql`

Incluye:

- nuevo enum `case_priority`
- nuevas columnas para `cases`, `charges`, `expenses`, `recurring_expenses` y `reminders`
- nuevos indices de consulta operativa
- nuevos checks de fechas y montos positivos

---

## 5. Definition Of Done de FASE 4

FASE 4 se considera cerrada porque:

- el modelo ya cubre el alcance V1 aprobado
- la migracion ya esta aplicada en Supabase
- build y tests pasan con el nuevo esquema
- la siguiente etapa ya puede enfocarse en modulos y no en redisenar tablas

---

## 6. Orden correcto despues de FASE 4

1. Terminar modulo Clientes
2. Terminar modulo Casos
3. Terminar modulo Cobros y pagos parciales
4. Terminar modulo Gastos
5. Conectar Dashboard y Estadisticas con datos reales
6. Cerrar Recordatorios, Calendario e Historial
7. Testing final, endurecimiento y deploy
