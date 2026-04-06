# Privacidad de Montos

**Fecha:** 2026-04-06  
**Estado:** Diseno aprobado para implementacion  
**Objetivo:** Incorporar una funcion global para ocultar o mostrar importes monetarios en todo el sistema autenticado, sin afectar fechas, porcentajes, contadores ni campos de carga o edicion.

---

## 1. Decision aprobada

Se agrega un modo de privacidad global para montos monetarios dentro del sistema.

El control visible sera un icono de ojo abierto o cerrado en la cabecera del panel autenticado. Su funcion sera alternar entre:

- mostrar montos reales
- ocultar montos mostrados con una mascara consistente

La decision aprobada es que el cambio aplique a todo el sistema y no solo a una pantalla puntual.

---

## 2. Alcance aprobado

El modo privacidad debe ocultar unicamente valores monetarios renderizados.

Incluye:

- saldos
- ingresos
- egresos
- totales
- subtotales
- deuda
- netos
- importes historicos o proyectados

No incluye:

- fechas
- porcentajes
- contadores de casos, clientes, cobros o recordatorios
- textos descriptivos
- estados
- campos de formularios en modo creacion o edicion

---

## 3. Comportamiento esperado

Cuando el modo privacidad esta desactivado, el sistema muestra los montos como hoy, usando el formato monetario actual.

Cuando el modo privacidad esta activado:

- los montos visibles se reemplazan por una mascara uniforme como `***`
- la regla aplica a tarjetas, tablas, badges, listados, detalles y leyendas monetarias
- el usuario puede seguir navegando sin perder la preferencia
- un recargo de pagina debe respetar la preferencia guardada

La mascara no debe intentar conservar longitud ni estructura decimal. La aprobacion funcional es esconder el dato, no insinuar su magnitud.

---

## 4. Estrategia tecnica aprobada

Se implementa un enfoque mixto:

1. Estado global de visibilidad de montos en el shell autenticado.
2. Persistencia en `localStorage` para conservar la preferencia entre navegaciones y recargas.
3. Capa de presentacion especifica para dinero mostrado, separada del helper de formateo actual.

`formatCurrency(...)` sigue existiendo como utilidad de formato monetario. La ocultacion no se resuelve alterando todo el comportamiento de esa funcion de bajo nivel, sino mediante una capa semantica de display para montos visibles.

Esto evita mezclar formateo puro con reglas de privacidad y deja claro que solo deben pasar por la mascara los datos que representan dinero en pantalla.

---

## 5. Ubicacion del estado global

El estado de visibilidad vive dentro del `DashboardShell`, que ya persiste la preferencia del menu lateral.

Desde ahi se provee:

- valor actual de visibilidad
- accion para alternar
- disponibilidad para toda la interfaz autenticada

El `Header` incorpora el boton del ojo y consume ese estado global.

---

## 6. Capa de presentacion monetaria

Se crea una pieza reutilizable para montos mostrados en pantalla.

Responsabilidades:

- recibir un valor monetario
- usar `formatCurrency(...)` cuando la visibilidad esta activa
- mostrar una mascara estable cuando la visibilidad esta oculta

Esta capa debe ser lo suficientemente simple como para insertarse en:

- metric cards
- textos inline
- chips o etiquetas
- bloques de detalle
- componentes de dashboard y estadisticas

---

## 7. Superficies a cubrir

La primera implementacion debe cubrir todos los lugares visibles donde hoy se usa `formatCurrency(...)` para renderizar dinero en el dashboard autenticado.

Eso incluye como minimo:

- dashboard principal
- cobros
- casos
- clientes
- gastos
- gastos recurrentes
- estadisticas
- calendario
- recordatorios y resumentes relacionados, cuando muestren importes
- componentes de graficos o tooltips que expongan montos como texto

Los formularios con `currency-input` no se modifican.

---

## 8. Accesibilidad y claridad visual

El boton del header debe dejar claro su estado actual con:

- icono de ojo abierto o cerrado
- `title` o etiqueta accesible correspondiente

Ejemplos validos:

- `Ocultar montos`
- `Mostrar montos`

La mascara debe verse deliberada y consistente, sin parecer un error de carga.

---

## 9. Riesgos a evitar

- ocultar numeros que no representan dinero
- ocultar campos de formularios y volver confusa la carga o edicion
- acoplar la regla de privacidad a `formatCurrency(...)` y terminar afectando usos no visuales
- dejar pantallas con comportamiento mixto donde algunos montos se ocultan y otros no
- perder la preferencia al cambiar de ruta o recargar

---

## 10. Validacion

La implementacion se considera correcta si:

1. El header del sistema autenticado muestra un control de ojo para alternar visibilidad.
2. Al activarlo, los montos mostrados pasan a una mascara uniforme.
3. Las fechas, porcentajes, contadores y otros numeros no monetarios siguen visibles.
4. Los formularios de creacion y edicion siguen mostrando y permitiendo editar montos normalmente.
5. La preferencia se conserva al navegar entre pantallas y al recargar.
6. Los principales modulos financieros del sistema responden de forma consistente al mismo toggle.
