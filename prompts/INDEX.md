# 🎯 ÍNDICE RÁPIDO DE PROMPTS

## Acceso Rápido por Necesidad

### Necesito mejorar formularios
- 📝 [Input.jsx](Input.jsx.txt) - Campo de entrada universal
- 🔘 [Button.jsx](Button.jsx.txt) - Botones con variantes
- 📋 [Select.jsx](Select.jsx.txt) - Selector dropdown
- 🔎 [FilterSelect.jsx](FilterSelect.jsx.txt) - Selector con búsqueda

### Necesito mejorar listados de productos
- 📦 [ListadoProductosModerno.jsx](ListadoProductosModerno.jsx.txt) - Tabla + Cuadrícula (2 vistas)
- 📊 [TablaListaProductos.jsx](TablaListaProductos.jsx.txt) - Tabla con filtrado

### Necesito mejorar pedidos/compras
- 📮 [ListaPedidos.jsx](ListaPedidos.jsx.txt) - Listado de pedidos
- ➕ [BotonAgregarPedido.jsx](BotonAgregarPedido.jsx.txt) - Botón inteligente
- 🎯 [AgregarProductoPedido.jsx](AgregarProductoPedido.jsx.txt) - Modal de adición

### Necesito mejorar el dashboard
- 📈 [Dashboard.jsx](Dashboard.jsx.txt) - Panel principal con 8 métricas
- 📉 [MetricCard.jsx](MetricCard.jsx.txt) - Tarjeta de métrica individual

### Necesito mejorar navegación
- 🧭 [NavBarVertical.jsx](NavBarVertical.jsx.txt) - Barra lateral con menú

### Necesito mejorar alertas
- ⚠️ [alertaBorrarProducto.jsx](alertaBorrarProducto.jsx.txt) - Confirmación de eliminación

---

## 📊 Matriz de Complejidad vs Criticidad

```
CRITICIDAD
    ⭐⭐⭐
         │        FilterSelect
         │        Input, Button
         │        ListadoProductosModerno
         │        TablaListaProductos
         │        Dashboard
         │        ListaPedidos
         │        BotonAgregarPedido
         │        AgregarProductoPedido
         │        alertaBorrarProducto
    ⭐⭐
         │        Select
         │        NavBarVertical
         │        MetricCard
         └────────────────────────────────
           SIMPLE   MEDIO    COMPLEJO
```

---

## 🏆 TOP 5 Componentes para Mejorar PRIMERO

1. **FilterSelect.jsx** (⭐⭐⭐ Criticidad, 🔴 Complejidad)
   - Base de búsqueda en toda la app
   - Mejoraría significativamente UX
   - Mucha lógica de navegación por teclado

2. **Input.jsx** (⭐⭐⭐ Criticidad, 🟠 Complejidad)
   - Usado en 50+ formularios
   - Validación y transformación
   - Base de toda la UI

3. **Dashboard.jsx** (⭐⭐⭐ Criticidad, 🟠 Complejidad)
   - Home page principal
   - Integración con 2+ server actions
   - 8 métricas diferentes

4. **ListadoProductosModerno.jsx** (⭐⭐⭐ Criticidad, 🔴 Complejidad)
   - Página más visitada
   - 2 vistas (tabla + grid)
   - Navegación por teclado

5. **ListaPedidos.jsx** (⭐⭐⭐ Criticidad, 🟠 Complejidad)
   - Punto de entrada para compras
   - Estados y colores complejos
   - Múltiples acciones

---

## 📈 Estimación de Horas para Regenerar

| Componente | Regen | Testing | Review | TOTAL |
|-----------|-------|---------|--------|-------|
| Input.jsx | 2h | 1.5h | 0.5h | 4h |
| Button.jsx | 1h | 1h | 0.5h | 2.5h |
| Select.jsx | 1h | 0.5h | 0.5h | 2h |
| FilterSelect.jsx | 3h | 2h | 1h | 6h |
| TablaListaProductos.jsx | 2.5h | 2h | 1h | 5.5h |
| ListaPedidos.jsx | 2h | 1.5h | 0.5h | 4h |
| BotonAgregarPedido.jsx | 1.5h | 1h | 0.5h | 3h |
| AgregarProductoPedido.jsx | 2.5h | 1.5h | 0.5h | 4.5h |
| Dashboard.jsx | 2h | 1h | 0.5h | 3.5h |
| MetricCard.jsx | 0.5h | 0.5h | 0.25h | 1.25h |
| NavBarVertical.jsx | 0.5h | 0.5h | 0.25h | 1.25h |
| alertaBorrarProducto.jsx | 0.5h | 0.5h | 0.25h | 1.25h |

**Total estimado**: ~38 horas (1 semana de trabajo)
**Prioridad**: Hacer Top 5 primero (~24 horas)

---

## 🔗 Dependencias Entre Componentes

```
ListadoProductosModerno.jsx
├── Input.jsx (búsqueda)
├── FilterSelect.jsx (filtros)
├── Button.jsx (acciones)
├── BotonAgregarPedido.jsx (agregar pedido)
└── TablaListaProductos.jsx (vista tabla)

Dashboard.jsx
├── MetricCard.jsx (x8 métricas)
├── Button.jsx (acciones)
└── Icon.jsx (iconos)

ListaPedidos.jsx
├── Button.jsx (acciones)
├── Icon.jsx (estados)
├── AgregarProductoPedido.jsx (modal)
└── alertaBorrarProducto.jsx (eliminación)

AgregarProductoPedido.jsx
├── Input.jsx (cantidad)
├── FilterSelect.jsx (selector pedidos)
├── Button.jsx (enviar)
└── Select.jsx (proveedor)
```

---

## ⚡ Quick Copy-Paste para IA

### Para Input.jsx:
```
Lee el archivo: prompts/Input.jsx.txt
Usa el contenido como especificación para regenerar el componente
```

### Para generar múltiples:
```
1. Input.jsx.txt
2. Button.jsx.txt
3. FilterSelect.jsx.txt
Luego integra mejoras en el proyecto
```

---

## 📝 Estructura de Cada Prompt

Todos los prompts siguen esta estructura:

1. **PROPÓSITO GENERAL** - Qué hace el componente
2. **PROPS PRINCIPALES** - Interface del componente
3. **ESTADO** - Variables internas
4. **FUNCIONALIDADES PRINCIPALES** - Lógica detallada
5. **ESTRUCTURA DE DATOS** - Objetos esperados
6. **COMPORTAMIENTOS CLAVE** - Cómo funciona
7. **ESTILOS** - Tailwind + diseño
8. **CASOS DE USO** - Ejemplos de uso
9. **NOTAS TÉCNICAS** - Implementación
10. **NUEVAS CARACTERÍSTICAS** - Posibles mejoras

---

## 🎓 Cómo Usar Los Prompts

### Opción 1: Regenerar componente completo
```bash
1. Copia el contenido del archivo .txt
2. Abre ChatGPT/Claude
3. Pega el prompt
4. Pide: "Genera este componente React/Next.js"
5. Copia el código generado
6. Reemplaza el archivo original
```

### Opción 2: Agregar una sola característica
```bash
1. Lee la sección "NUEVAS CARACTERÍSTICAS"
2. Elige una que quieras
3. Copia el código actual + el prompt
4. Pide a IA: "Agrega esta característica: [descripción]"
5. Integra el cambio
```

### Opción 3: Entender un componente
```bash
1. Lee el archivo .txt correspondiente
2. Entiende la lógica en FUNCIONALIDADES PRINCIPALES
3. Ve CASOS DE USO para ejemplos
4. Consulta NOTAS TÉCNICAS para implementación
```

---

## 🚀 Recomendación Final

**Si solo tienes 1 hora**: Lee `FilterSelect.jsx.txt` y `Input.jsx.txt`
**Si tienes 4 horas**: Regenera `FilterSelect.jsx` completo
**Si tienes 1 día**: Regenera Top 3: FilterSelect, Input, Dashboard
**Si tienes 1 semana**: Regenera todos y crea prompts para componentes restantes

---

Última actualización: 7 de enero de 2026
