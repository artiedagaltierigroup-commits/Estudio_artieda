# Centro de Ayuda del Sistema

**Fecha:** 2026-03-26  
**Estado:** Diseno aprobado para implementacion  
**Objetivo:** Reemplazar el uso actual de `Configuracion` por una pantalla guia del sistema con buscador, accesos por modulo y contenido operativo para orientar el uso diario del estudio.

---

## 1. Decision aprobada

La pagina `Configuracion` deja de funcionar como una pantalla de ajustes generales y pasa a ser un `Centro de ayuda del sistema`.

El item sigue ocupando ese lugar funcional dentro de la app, pero ya no se presenta como configuracion. En el menu lateral se renombra para representar una ayuda operativa real.

---

## 2. Alcance aprobado

La nueva pantalla debe cubrir:

1. Buscador visible en la cabecera.
2. Accesos rapidos a cada modulo principal.
3. Guia sobre que hace cada pantalla.
4. Respuestas operativas sobre como hacer tareas frecuentes.
5. Explicacion de estados, tipos y conceptos del sistema.

Ejemplos expresamente pedidos:

- como cargar un cobro
- tipos de cobros y sus estados
- como crear un gasto
- explicacion de cada pagina del sistema

---

## 3. Enfoque funcional aprobado

Se implementa un centro de ayuda local, mantenido desde frontend, con contenido curado y filtrable.

No se conecta a datos reales ni a IA. La funcion de esta pantalla es orientar, explicar y llevar rapido a los modulos correctos.

Esto permite:

- una experiencia estable y veloz
- contenido consistente con el sistema real
- testear el buscador sin depender de backend
- crecer mas adelante con nuevas entradas o categorias

---

## 4. Estructura de la pantalla

La composicion aprobada queda asi:

1. Cabecera con nombre de ayuda, descripcion y buscador principal.
2. Tarjetas de navegacion por modulo.
3. Bloques destacados de tareas frecuentes.
4. Secciones de ayuda filtrables por busqueda.
5. Estado vacio cuando no hay coincidencias.

Los modulos a cubrir inicialmente son:

- Dashboard
- Clientes
- Casos
- Cobros
- Calendario
- Gastos
- Gastos recurrentes
- Recordatorios
- Estadisticas
- Historial

---

## 5. Modelo de contenido

El contenido se organiza como una coleccion tipada de entradas de ayuda.

Cada entrada debe incluir:

- `id`
- `module`
- `title`
- `summary`
- `content`
- `keywords`
- `href`
- `kind`

Los `kind` iniciales pueden separar:

- `screen`
- `task`
- `concept`

Esto permite mezclar explicaciones por pantalla, pasos operativos y definiciones del sistema dentro del mismo buscador.

---

## 6. Cobertura minima de contenido

La primera version debe incluir al menos:

### Pantallas

- para que sirve cada modulo principal
- que se puede consultar o hacer dentro de cada uno

### Tareas

- como crear un cliente
- como crear un caso
- como cargar un cobro
- como registrar un pago
- como crear un gasto
- como crear un recordatorio

### Conceptos

- estados de caso: `activo`, `cerrado`, `suspendido`
- estados de cobro: `pendiente`, `parcial`, `pagado`, `vencido`, y contemplar `cancelado` como estado derivado visible en lecturas del sistema
- tipos de gasto: `operativo`, `impuesto`, `servicio`, `otro`
- diferencia entre gastos comunes y recurrentes

---

## 7. Estrategia tecnica aprobada

### Capa de datos

Crear una utilidad nueva para alojar:

- los modulos navegables
- la coleccion de entradas de ayuda
- la funcion de filtrado por texto

### Capa de UI

Crear componentes livianos para:

- buscador de ayuda
- tarjetas de modulos
- tarjetas de resultados o secciones

La pagina de `configuracion` se reescribe para consumir esa capa y deja de mostrar estado del workspace o datos demo como bloque principal de la experiencia.

### Menu lateral

Actualizar la metadata de navegacion para renombrar el item visible del menu y su descripcion.

---

## 8. Comportamiento del buscador

Si no hay texto, la pantalla muestra el contenido agrupado por tipo o modulo.

Si hay texto, el sistema filtra por coincidencias en:

- titulo
- resumen
- contenido
- palabras clave
- modulo

El filtrado debe ser tolerante a mayusculas y minusculas.

Ejemplos esperados:

- `cobro`
- `registrar pago`
- `gasto`
- `vencido`
- `caso`
- `recordatorio`

---

## 9. Riesgos a evitar

- convertir la pantalla en un bloque gigante de texto sin jerarquia
- dejar contenido importante escondido si no se busca
- usar nombres que sigan sonando a configuracion
- hardcodear toda la logica de ayuda dentro del JSX
- duplicar informacion inconsistente con estados y tipos reales del sistema

---

## 10. Validacion

La implementacion se considera correcta si:

1. El menu ya no muestra `Configuracion` sino la nueva identidad de ayuda.
2. La pagina principal muestra un buscador funcional.
3. Buscar terminos operativos devuelve contenido relevante.
4. La pantalla sirve tanto para descubrir modulos como para resolver dudas rapidas.
5. El contenido inicial refleja los estados y tipos definidos actualmente por el sistema.
