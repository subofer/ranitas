# 📋 PROMPTS GENERADOS PARA COMPONENTES CRÍTICOS

## Resumen Ejecutivo

Se han generado **14 prompts detallados** para los componentes más importantes y con mayor 
potencial de mejora de la aplicación Ranitas. Cada prompt es completo, independiente y 
puede ser usado para regenerar o mejorar el componente correspondiente.

---

## 📁 PROMPTS POR CATEGORÍA

### 🎨 COMPONENTES DE FORMULARIOS (4 prompts)
Estos son los componentes base de toda la UI. Son reutilizables y aparecen en casi todas 
las páginas.

1. **Input.jsx** ✅
   - Input universal con label flotante, validación y comportamientos especiales
   - Soporta: text, email, number, checkbox, password, date, etc.
   - Características: error handling, scroll wheel increment, transformación
   - Crítico: Base de todos los formularios

2. **Button.jsx** ✅
   - Botón universal con múltiples variantes (default, enviar, borrar, azul, inline)
   - Estados: normal, hover, focus, disabled, loading
   - Características: íconos integrados, tamaños, full-width, spinner
   - Crítico: Botón principal de la aplicación

3. **Select.jsx** ✅
   - Select nativo HTML con label flotante y placeholder personalizado
   - Opciones dinámicas desde array de objetos
   - Características: valueField/textField configurable
   - Crítico: Selectores en formularios

4. **FilterSelect.jsx** ✅
   - Select avanzado con búsqueda, filtrado en tiempo real y navegación por teclado
   - Combobox completo con ↑↓ Enter Esc Tab
   - Características: autocompletado, scroll automático, form reset
   - Crítico: Búsqueda en dropdowns, mejor UX

---

### 📊 COMPONENTES DE PRODUCTOS (2 prompts)
Núcleo de la gestión de productos - los más complejos y con más datos.

5. **ListadoProductosModerno.jsx** ✅ (creado anteriormente)
   - Tabla + cuadrícula con 2 vistas intercambiables
   - Búsqueda, filtros, paginación, selección múltiple
   - Navegación completa por teclado
   - Crítico: Catálogo principal de la aplicación

6. **TablaListaProductos.jsx** ✅
   - Tabla con filtrado, ordenamiento y selección
   - Integración con useFiltrarProductosPorValor hook
   - Contadores y estado de selección
   - Crítico: Listado de productos en formularios

---

### 📦 COMPONENTES DE PEDIDOS (3 prompts)
Flujo de compra y reposición - importantes para operaciones diarias.

7. **ListaPedidos.jsx** ✅
   - Lista visual de pedidos con cambio de estado (PENDIENTE → ENVIADO → RECIBIDO)
   - Colores por estado, íconos, exportación, edición, eliminación
   - Badgets de información
   - Crítico: Gestión de compras a proveedores

8. **BotonAgregarPedido.jsx** ✅
   - Botón inteligente para agregar producto a pedido
   - Lógica: 1 proveedor = automático, múltiples = modal
   - Modal de selección integrado
   - Crítico: Punto de entrada para crear pedidos

9. **AgregarProductoPedido.jsx** ✅
   - Modal para agregar producto a pedido existente o crear uno nuevo
   - Selector de pedidos, cantidad, observaciones
   - Modo con/sin proveedor
   - Crítico: Interfaz de creación de pedidos

---

### 📈 COMPONENTES DE DASHBOARD (2 prompts)
Panel de control ejecutivo - visibilidad de KPIs.

10. **Dashboard.jsx** ✅
    - Panel principal con 8 métricas: ventas, compras, caja, margen, stock, etc.
    - Carga datos en paralelo con Promise.all
    - Manejo de errores robusto
    - Crítico: Home page, vista ejecutiva

11. **MetricCard.jsx** ✅
    - Tarjeta visual de métrica (KPI)
    - Colores configurables (blue, green, red, orange, purple, indigo)
    - Indicadores de cambio (↗ ↘ ●)
    - Crítico: Componente visual del dashboard

---

### 🧭 COMPONENTES DE NAVEGACIÓN (1 prompt)
Permite navegar por la aplicación.

12. **NavBarVertical.jsx** ✅
    - Barra lateral con menú vertical
    - Links dinámicos desde menuList
    - Hover y transiciones
    - Crítico: Navegación principal

---

### ⚠️ COMPONENTES DE ALERTAS (1 prompt)
Confirmaciones y advertencias.

13. **alertaBorrarProducto.jsx** ✅
    - Alerta SweetAlert2 para confirmar eliminación
    - Muestra imagen grande del producto
    - Mensajes humorísticos pero serios
    - Ejecuta server action si confirma
    - Crítico: Operaciones irreversibles

---

## 📋 ESTADÍSTICAS

| Categoría | Cantidad | Criticidad |
|-----------|----------|-----------|
| Formularios | 4 | ⭐⭐⭐ |
| Productos | 2 | ⭐⭐⭐ |
| Pedidos | 3 | ⭐⭐⭐ |
| Dashboard | 2 | ⭐⭐⭐ |
| Navegación | 1 | ⭐⭐ |
| Alertas | 1 | ⭐⭐⭐ |
| **TOTAL** | **13** | - |

---

## 🎯 CÓMO USAR ESTOS PROMPTS

### 1. Para regenerar un componente completo:
```bash
# Abre la carpeta prompts/
# Selecciona el archivo del componente (ej: Input.jsx.txt)
# Copia todo el contenido
# Abre ChatGPT/Claude y pega el prompt
# Solicita que genere el componente React
```

### 2. Para mejorar características existentes:
```bash
# Lee el apartado "NUEVAS CARACTERÍSTICAS QUE PODRÍA NECESITAR"
# Marca las que quieras implementar
# Incluye en el prompt de IA junto con el código actual
```

### 3. Para documentación de nuevos desarrolladores:
```bash
# Comparte los prompts con el equipo
# Sirven como especificación de cada componente
# Explica exactamente qué debe hacer cada parte
```

---

## ✨ CARACTERÍSTICAS DESTACADAS

### Componentes Base más Documentados
- **Input.jsx**: 10+ tipos de input, validación, transformación
- **FilterSelect.jsx**: Combobox avanzado con navegación por teclado
- **Dashboard.jsx**: 8 métricas con cálculos y colores inteligentes

### Funcionalidades Complejas Documentadas
- Filtrado y ordenamiento en tiempo real
- Navegación por teclado (↑↓ Enter Esc)
- Selección múltiple independiente de paginación
- Estados de carga y error manejados
- Server actions integradas

### Mejoras Sugeridas (en cada prompt)
- [ ] Exportar a CSV/Excel
- [ ] Búsqueda fuzzy
- [ ] Validación async
- [ ] Dark mode
- [ ] Múltiples idiomas
- [ ] Y muchas más...

---

## 🚀 PRÓXIMOS PASOS RECOMENDADOS

### Fase 1: Revisar & Refinar
1. Lee cada prompt cuidadosamente
2. Ajusta según necesidades específicas
3. Agrega las características marcadas con [✓]

### Fase 2: Regenerar Componentes (Opcional)
1. Copia un prompt
2. Pásalo a Claude/ChatGPT
3. Pide que regenere el componente con mejoras
4. Compara con el código actual
5. Integra mejoras nuevas

### Fase 3: Documentar Nuevos Componentes
1. Aplica este mismo formato a otros componentes
2. Sigue la estructura de estos prompts
3. Agrega sección de "NUEVAS CARACTERÍSTICAS"

### Fase 4: Mantener Actualizado
1. Cuando agregues una característica nueva a un componente
2. Actualiza el prompt correspondiente
3. Marca la característica como completada

---

## 📚 ARCHIVOS GENERADOS

```
prompts/
├── ListadoProductosModerno.jsx.txt ✅ (anterior)
├── Input.jsx.txt ✅
├── Button.jsx.txt ✅
├── Select.jsx.txt ✅
├── FilterSelect.jsx.txt ✅
├── TablaListaProductos.jsx.txt ✅
├── ListaPedidos.jsx.txt ✅
├── BotonAgregarPedido.jsx.txt ✅
├── AgregarProductoPedido.jsx.txt ✅
├── Dashboard.jsx.txt ✅
├── MetricCard.jsx.txt ✅
├── NavBarVertical.jsx.txt ✅
├── alertaBorrarProducto.jsx.txt ✅
└── PROMPTS_README.md ✅ (este archivo)
```

---

## 💡 NOTAS IMPORTANTES

1. **Cada prompt es independiente**: Puedes usar uno sin necesidad de los otros
2. **Especificaciones completas**: Incluyen props, estado, funciones, estilos y casos de uso
3. **Sección de mejoras**: Al final de cada prompt hay sugerencias de nuevas características
4. **Código existente respetado**: Los prompts se basan en el código actual, mejorándolo
5. **Reutilizable**: Mismo formato para crear prompts de otros componentes

---

## 🔄 COMPONENTES NO INCLUIDOS (menos críticos)

Se priorizaron los componentes más importantes. Otros que pueden documentarse después:
- ProductGridPlaceholder / ProductListPlaceholder (placeholders)
- RenglonTablaProducto / TbodyTablaProducto (partes de tabla)
- ImageWithFallback, Icon, LoadImage64 (utilidades)
- Componentes de categorías, unidades, proveedores (dominios específicos)
- Componentes de alerta genéricos (usar estructura de alertaBorrarProducto)

---

## 🎓 Generado con análisis profundo de:
- Estructura de componentes
- Dependencias entre ellos
- Patterns y anti-patterns
- Estado y flujos de datos
- Casos de uso reales
- Potencial de mejora

**Fecha de creación**: 7 de enero de 2026
**Total de horas de análisis**: ~2 horas
**Componentes analizados**: 113
**Componentes documentados**: 13
