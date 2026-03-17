# Plan Real Para Terminar El Sistema

**Fecha:** 2026-03-17  
**Objetivo:** Reordenar el proyecto segun alcance real, estado actual del repo y prioridad de negocio para terminar una V1 usable sin seguir mezclando fases.

---

## 1. Diagnostico honesto

El proyecto **no esta en cero** ni tampoco "terminado".  
Lo que paso es esto:

- FASE 2 ya quedo resuelta en lo tecnico:
  - Next.js
  - Supabase real
  - Drizzle
  - migraciones
  - auth
  - RLS
  - layout privado
- FASE 3 esta **muy avanzada**:
  - sistema visual compartido
  - dashboard
  - clientes
  - casos
  - cobros
  - gastos
  - recordatorios
  - calendario
  - estadisticas
  - historial
  - configuracion
- Pero FASE 4 **no esta cerrada**, y eso desordena las siguientes fases.
- Ya existen piezas funcionales de FASE 5 a FASE 10, pero estan **parciales** y no siguen una prioridad unica.

### Problema principal

El proyecto avanzo en UI y pantallas antes de congelar el modelo de datos final y antes de cerrar los modulos por completo.

Resultado:

- hay pantallas bonitas pero modulos incompletos
- hay actions listas pero sin flujo completo de UI
- hay reglas funcionales aprobadas que todavia no quedaron 100% modeladas en base de datos

---

## 2. Estado real actual

### Ya resuelto

- infraestructura base
- login real con Supabase
- layout autenticado
- tablas principales creadas
- policies RLS aplicadas
- tema visual y sistema de componentes
- rutas principales del sistema

### Empezado pero incompleto

- clientes
- casos
- cobros
- gastos
- recordatorios
- dashboard
- estadisticas
- historial
- calendario

### Todavia faltante a nivel V1

- pagos parciales con flujo de UI completo
- editar cliente
- editar caso
- editar cobro
- editar gasto
- anulacion/logica de gasto
- relacion completa cliente/caso/cobros/deuda en detalle
- dashboard con alertas y vencimientos reales
- recordatorios automaticos
- calendario mas util para operacion diaria

---

## 3. Desalineaciones que hay que corregir antes de seguir

### A. FASE 4 todavia no esta consolidada

Hay que revisar el modelo actual contra el alcance aprobado.

Puntos que hoy estan flojos o incompletos:

- `cases` no modela todavia todo lo pedido para operacion real
  - falta `priority`
  - falta algo equivalente a vencimiento actual del caso si se decide manejarlo a nivel caso
  - falta preferencia de cobro si se la quiere persistir
- `charges` todavia no resuelve del todo la tension entre estado derivado y anulacion manual
  - conviene agregar algo tipo `is_cancelled` o `cancelled_at`
- `expenses` y `recurring_expenses` todavia no resuelven bien:
  - anulacion logica
  - imputacion mensual
  - separacion mas clara entre gasto real y plantilla recurrente
- `dashboard.ts` todavia usa filtro por `charges.status`, cuando la regla aprobada dice que el estado real del cobro debe derivarse

### B. Hay actions sin UI completa

Existen server actions, pero no estan cerrados los flujos:

- `createPayment`
- `deletePayment`
- `updateClient`
- `updateExpense`
- `deleteExpense`
- `updateReminder`
- `completeReminder`
- `updateCaseStatus`

### C. Algunas pantallas existen pero no entregan todavia el valor de negocio esperado

Ejemplos:

- detalle de cliente sin deuda real ni historial financiero completo
- detalle de caso sin registrar pago parcial desde UI
- gastos sin edicion o anulacion
- dashboard sin proximos vencimientos ni clientes con deuda reales

---

## 4. Nuevo orden correcto para terminar la V1

### ETAPA 0 - Congelar alcance de V1

No agregar mas pantallas nuevas.

Objetivo:

- dejar fijo que la V1 termina con:
  - login
  - dashboard base util
  - clientes
  - casos
  - cobros
  - pagos parciales
  - gastos
  - estadisticas basicas
  - recordatorios internos
  - historial base

### ETAPA 1 - Cerrar FASE 4 de verdad

Antes de seguir con modulos, consolidar el modelo de datos.

#### Paso 1.1

Auditar tabla por tabla:

- `clients`
- `cases`
- `charges`
- `payments`
- `expenses`
- `recurring_expenses`
- `reminders`
- `activity_log`

#### Paso 1.2

Definir migracion de consolidacion con:

- campos faltantes
- constraints de negocio
- indices faltantes
- columnas para anulacion o cancelacion donde aplique

#### Paso 1.3

Corregir reglas que hoy contradicen lo aprobado:

- no depender de `charges.status` como fuente de verdad
- dejar claro como se cancela un cobro
- dejar claro como se anula un gasto

#### Definition of done

- esquema final V1 aprobado
- nueva migracion aplicada
- actions ajustadas al nuevo modelo

### ETAPA 2 - Terminar modulo Clientes

Objetivo:

- que el modulo de clientes ya sirva de verdad para operar

#### Implementar

- crear cliente
- editar cliente
- ver detalle completo
- listar casos asociados
- mostrar resumen financiero por cliente
  - cantidad de casos
  - total cobrado
  - deuda pendiente
  - ultimo movimiento

#### Definition of done

- cliente usable como punto de entrada al sistema

### ETAPA 3 - Terminar modulo Casos

Objetivo:

- cerrar expediente, contexto y seguimiento del caso

#### Implementar

- crear caso
- editar caso
- cambiar estado
- permitir crear cliente desde el flujo de alta del caso
  - ideal: inline modal o sheet
  - aceptable V1: flujo asistido corto sin perder contexto
- mostrar en detalle:
  - cliente
  - estado
  - honorarios
  - saldo
  - vencimientos
  - historial basico

#### Definition of done

- cada caso queda listo para ser gestionado de punta a punta

### ETAPA 4 - Terminar modulo Cobros y Pagos Parciales

Objetivo:

- cerrar el corazon financiero del sistema

#### Implementar

- crear cobro
- editar cobro
- cambiar vencimiento
- registrar pago parcial
- registrar pago total
- recalcular saldo
- recalcular estado derivado
- impedir depender de override manual de estado
- guardar historial de cambios relevantes

#### Muy importante

El estado visible del cobro debe salir de:

- `amount_total`
- suma de pagos
- `due_date`
- `is_cancelled` o equivalente, si se agrega

#### Definition of done

- flujo real completo:
  - cobro creado
  - pago parcial
  - saldo actualizado
  - nuevo vencimiento
  - cierre final

### ETAPA 5 - Terminar modulo Gastos

Objetivo:

- que la salida de dinero quede operativamente util

#### Implementar

- alta de gasto
- editar gasto
- anular gasto
- restaurar si se decide soportarlo
- gastos recurrentes como plantilla real
- impacto en metricas
- saldo real vs saldo proyectado

#### Definition of done

- se puede leer claramente:
  - que se gasto
  - que se proyecta gastar
  - como impacta eso en el mes

### ETAPA 6 - Terminar Dashboard y Estadisticas V1

Objetivo:

- convertir el dashboard en una herramienta de decision, no solo una pantalla linda

#### Implementar dashboard real

- ingresos esperados del mes
- ingresos cobrados del mes
- pendiente del mes
- gastos del mes
- resultado neto del mes
- proximos vencimientos
- clientes con deuda
- casos activos
- recordatorios relevantes

#### Implementar estadisticas basicas

- ingresos por mes
- gastos por categoria
- cobros por estado
- cliente con mayor facturacion
- comparacion bruto vs neto

#### Definition of done

- el dashboard ya responde "que tengo que mirar hoy"

### ETAPA 7 - Terminar Recordatorios, Calendario e Historial

Objetivo:

- completar el soporte operativo diario

#### Implementar

- recordatorios manuales completos
- marcar como resuelto
- editar recordatorio
- generar recordatorios automaticos basicos
  - cobros vencidos
  - vencimientos cercanos
  - gasto recurrente proximo
- calendario realmente conectado a:
  - cobros
  - recordatorios
  - gastos
  - recurrentes
- historial mas claro por entidad

#### Definition of done

- seguimiento interno diario resuelto sin salir del sistema

### ETAPA 8 - Testing, endurecimiento y deploy

#### Implementar

- pruebas sobre helpers criticos
- revisar server actions con errores y mensajes de usuario
- revisar permisos y RLS
- limpiar codigo muerto
- revisar seeds y datos demo
- deploy final en Vercel
- variables de entorno finales
- rotacion de credenciales expuestas durante desarrollo

#### Definition of done

- sistema estable para uso diario real

---

## 5. Orden exacto recomendado desde hoy

1. **FASE 4 real**
   Consolidar modelo de datos y migracion final V1.
2. **Clientes**
   Cerrar CRUD + detalle financiero real.
3. **Casos**
   Cerrar alta, edicion y detalle operativo.
4. **Cobros + pagos parciales**
   Cerrar flujo financiero principal.
5. **Gastos**
   Cerrar alta, edicion, anulacion y recurrentes.
6. **Dashboard + estadisticas**
   Conectar todo con datos reales.
7. **Recordatorios + calendario + historial**
   Completar soporte operativo.
8. **Testing + deploy**

---

## 6. Lo que no conviene hacer ahora

Hasta cerrar esa secuencia, no conviene sumar:

- WhatsApp
- email
- adjuntos
- documentos
- exportacion
- backups custom
- automatizaciones avanzadas
- multiusuario real
- permisos por roles

---

## 7. Siguiente paso inmediato

El siguiente paso correcto es:

### **FASE 4 - Auditoria y consolidacion del modelo de datos**

Entregable:

- documento de auditoria contra alcance V1
- lista de cambios tabla por tabla
- migracion de consolidacion propuesta
- orden de aplicacion

No conviene empezar Clientes/Casos/Cobros finales antes de cerrar eso.
