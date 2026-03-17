# Product Scope Design

**Producto:** Sistema web personal de gestion para estudio juridico individual

**Estado:** Definicion funcional aprobada para continuar con setup e implementacion incremental

---

## 1. Estructura funcional aprobada

Pantallas objetivo del sistema:

1. Login
2. Dashboard principal
3. Clientes
4. Detalle de cliente
5. Casos
6. Crear / editar caso
7. Cobros
8. Registrar cobro / pago parcial
9. Calendario financiero
10. Gastos
11. Crear / editar gasto
12. Estadisticas / metricas
13. Notificaciones / recordatorios
14. Configuracion

## 2. Decision de alcance por version

### V1 obligatoria

- Login real con Supabase Auth
- Dashboard con metricas basicas y alertas
- Clientes
- Casos
- Cobros
- Pagos parciales
- Gastos
- Estadisticas basicas
- Recordatorios internos simples
- Historial de cambios base

### V1.1

- Calendario avanzado
- Gastos recurrentes automaticos
- Historial mas detallado
- Mejores metricas
- Exportacion

### V2

- Recordatorios por email o WhatsApp
- Adjuntos
- Documentos por caso
- Plantillas
- Automatizaciones avanzadas

## 3. Reglas funcionales aprobadas

- Un cliente puede tener muchos casos
- Un caso puede tener muchos cobros, pagos parciales y seguimientos
- Al crear un caso se debe poder seleccionar cliente existente o crear uno nuevo en el mismo flujo
- Los cobros admiten pagos parciales, cambios de vencimiento y correcciones, pero con historial
- Los gastos pueden dejar el saldo del periodo en negativo; no deben bloquearse
- Editar, anular o restaurar gastos debe recalcular metricas
- Deben coexistir saldo proyectado y saldo real
- Deben existir recordatorios manuales y automaticos
- Debe haber historial con accion, fecha, valor anterior, valor nuevo y observacion

## 4. Decision tecnica sobre cobros

El estado del cobro se considera derivado.

Fuente de verdad:

- saldo pendiente
- fecha de vencimiento

Uso permitido de `charges.status`:

- cache de lectura
- ayuda para filtros rapidos

Uso no permitido de `charges.status`:

- reglas de negocio
- calculo financiero
- validaciones de dominio
- auditoria

### Tension pendiente a cerrar

Se pidio "cambiar estado manualmente" y al mismo tiempo se definio que el estado es derivado.

Recomendacion:

- no permitir cambio manual de `pendiente`, `parcial`, `vencido` o `cobrado`
- permitir acciones que cambian la fuente de verdad: registrar pago, editar monto, mover vencimiento
- si hace falta una anulacion manual, modelarla aparte como `cancelled_at` o `is_cancelled`, no como override del estado derivado

## 5. Dashboard y metricas aprobadas

Bloques base:

- ingresos esperados del mes
- ingresos cobrados del mes
- pendiente del mes
- gastos del mes
- resultado neto del mes
- cantidad de cobros vencidos
- clientes con mayor facturacion
- proximos vencimientos

Filtros deseados:

- mes
- anio
- rango de fechas
- cliente
- estado del caso
- estado del cobro
- metodo de cobro

Separacion analitica aprobada:

- vista de ingresos
- vista de gastos
- vista financiera completa

## 6. Diseno visual aprobado

Direccion visual:

- femenino pero profesional
- limpio
- moderno
- sobrio
- no infantil

Paleta base:

- rosa principal `#E89AB4`
- rosa suave `#F7D6E0`
- rosa oscuro `#C76C8A`
- crema `#FFF8FB`
- gris topo `#8A7C84`
- gris texto `#4B4450`
- verde exito `#7BBE9E`
- rojo alerta `#D96C6C`
- lila complementario `#C9B6E4`

Lineamientos UI:

- fondo claro
- cards con bordes redondeados
- sombras suaves
- tipografia elegante y legible
- iconos finos
- mucho espacio en blanco
- tablas limpias
- chips de color para estados
- graficos simples y amables

## 7. Mapeo de fases

### FASE 2

- proyecto base
- auth
- DB
- deployment
- layout y placeholders

### FASE 3

- diseno UI base
- sistema de componentes
- tema visual rosa profesional

### FASE 4

- modelo de datos final
- migraciones estables
- seed inicial

### FASE 5 a FASE 10

- clientes
- casos
- cobros
- gastos
- dashboard analitico
- recordatorios

### FASE 11 y FASE 12

- testing
- optimizacion
- deploy final

## 8. Decision operativa para FASE 2

Aunque ya este definido el mapa completo del producto, FASE 2 no debe implementar la funcionalidad completa de estas pantallas.

En FASE 2 solo se construye:

- login
- dashboard shell
- sidebar
- topbar
- rutas base
- placeholders navegables
- autenticacion
- infraestructura de datos

Todo lo demas queda planificado para las fases posteriores.
