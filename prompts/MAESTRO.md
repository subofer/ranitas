# 📚 ÍNDICE MAESTRO DE PROMPTS - RANITAS

## 🎯 Estructura Completa de Documentación

La carpeta `prompts/` ahora refleja la estructura del proyecto y contiene especificaciones para TODOS los componentes, páginas, hooks, contextos y esquemas.

---

## 📁 ESTRUCTURA DE CARPETAS

```
prompts/
│
├── 🎨 formComponents/          [Componentes de formulario]
│   ├── Input.jsx.txt
│   ├── Button.jsx.txt
│   ├── Select.jsx.txt
│   ├── FilterSelect.jsx.txt
│   ├── Label.jsx.txt
│   ├── CheckBox.jsx.txt
│   ├── Switch.jsx.txt
│   ├── Icon.jsx.txt
│   └── ... (más)
│
├── 📦 productos/               [Componentes de productos]
│   ├── ListadoProductosModerno.jsx.txt ⭐
│   ├── TablaListaProductos.jsx.txt
│   ├── ImagenProducto.jsx.txt
│   └── ... (más)
│
├── 📮 pedidos/                 [Componentes de pedidos]
│   ├── ListaPedidos.jsx.txt ⭐
│   ├── BotonAgregarPedido.jsx.txt
│   ├── AgregarProductoPedido.jsx.txt
│   └── ... (más)
│
├── 📈 dashboard/               [Componentes del dashboard]
│   ├── Dashboard.jsx.txt ⭐
│   ├── MetricCard.jsx.txt
│   └── ... (más)
│
├── 🧭 navegacion/              [Componentes de navegación]
│   ├── NavBarVertical.jsx.txt
│   └── ... (más)
│
├── ui/                         [Componentes de UI]
│   ├── ErrorNotification.jsx.txt
│   └── ... (más)
│
├── alertas/                    [Componentes de alertas]
│   ├── alertaBorrarProducto.jsx.txt
│   └── ... (más)
│
├── categorias/                 [Componentes de categorías]
│   └── ListadoCategorias.jsx.txt
│
├── contactos/                  [Componentes de contactos]
│   └── ListadoContactos.jsx.txt
│
├── proveedores/                [Componentes de proveedores]
│   └── ListadoProveedores.jsx.txt
│
├── unidades/                   [Componentes de unidades]
├── excell/                     [Componentes de Excel]
├── graficos/                   [Componentes de gráficos]
├── ia/                         [Componentes de IA]
├── camara/                     [Componentes de cámara]
├── geoRef/                     [Componentes de geolocalización]
├── userMenu/                   [Componentes de menú usuario]
├── venta/                      [Componentes de venta]
│
├── paginas/                    [Especificaciones de páginas]
│   ├── listadoProductos.md
│   ├── cargarProductos.md
│   ├── pedidos.md
│   └── ... (más)
│
├── publicas_pages/             [Páginas públicas]
│   └── login.md
│
├── hooks/                      [Hooks de React]
│   ├── useErrorNotification.md
│   ├── useFiltrarProductos.md
│   └── ... (más)
│
├── contexts/                   [Contextos de React]
│   └── ... (más)
│
├── schemas/                    [Esquemas Prisma]
│   ├── Product.prisma.md
│   ├── Order.prisma.md
│   └── ... (más)
│
├── serverActions/              [Server Actions de Next.js]
│   ├── productos.md
│   ├── pedidos.md
│   └── ... (más)
│
├── 📄 00_INICIO_AQUI.md        [COMIENZA AQUÍ]
├── 📄 INDEX.md                 [Índice rápido]
├── 📄 PROMPTS_README.md        [Guía de prompts TOP 13]
└── 📄 MAESTRO.md               [Este archivo]
```

---

## 🎯 PROMPTS CREADOS HASTA AHORA (21)

### ✅ Fase 1: Componentes Críticos (13)
```
formComponents/  → Input, Button, Select, FilterSelect
productos/       → ListadoProductosModerno, TablaListaProductos
pedidos/         → ListaPedidos, BotonAgregarPedido, AgregarProductoPedido
dashboard/       → Dashboard, MetricCard
navegacion/      → NavBarVertical
alertas/         → alertaBorrarProducto
```

### ✅ Fase 2: Componentes Adicionales (8)
```
formComponents/  → Label, CheckBox, Switch, Icon
ui/              → ErrorNotification
productos/       → ImagenProducto
contactos/       → ListadoContactos
proveedores/     → ListadoProveedores
categorias/      → ListadoCategorias
```

---

## 📊 COBERTURA ACTUAL

| Categoría | Prompts | Componentes | % |
|-----------|---------|------------|---|
| formComponents | 8 | 18 | 44% |
| productos | 3 | 20 | 15% |
| pedidos | 3 | 8 | 37% |
| alertas | 1 | 9 | 11% |
| dashboard | 2 | 3 | 67% |
| navegacion | 1 | 3 | 33% |
| ui | 1 | 4 | 25% |
| categorias | 1 | 7 | 14% |
| contactos | 1 | 3 | 33% |
| proveedores | 1 | 3 | 33% |
| **TOTAL** | **21** | **113** | **18.6%** |

---

## 🚀 CÓMO NAVEGAR

### Para encontrar un componente:
1. Busca su categoría en la estructura arriba
2. Abre el archivo `.txt` correspondiente
3. Lee el prompt completo

### Para regenerar:
1. Copia el contenido del `.txt`
2. Pega en ChatGPT/Claude
3. Pide regeneración
4. Integra en tu proyecto

### Para entender la app:
1. Comienza con `00_INICIO_AQUI.md`
2. Lee `INDEX.md` para matriz de prioridades
3. Lee `PROMPTS_README.md` para detalles TOP 13
4. Explora archivos específicos por carpeta

---

## 🎓 CATEGORÍAS Y SUS COMPONENTES

### 🎨 formComponents/ (18 componentes, 8 prompts)
**Base de toda la UI**
- ✅ Input.jsx
- ✅ Button.jsx
- ✅ Select.jsx
- ✅ FilterSelect.jsx
- ✅ Label.jsx
- ✅ CheckBox.jsx
- ✅ Switch.jsx
- ✅ Icon.jsx
- InputSelect
- InputArrayList
- SelectSearch
- FormCard
- FormContainer
- Title
- Phill (?)
- CameraCapture
- SelectorImagenes
- EditarCodigoForm

### 📦 productos/ (20 componentes, 3 prompts)
**Gestión y visualización de productos**
- ✅ ListadoProductosModerno.jsx
- ✅ TablaListaProductos.jsx
- ✅ ImagenProducto.jsx
- ListadoProductos
- TbodyTablaProducto
- RenglonTablaProducto
- TablaListaVenta
- DetalleProducto
- ProductosPorProveedorServer
- GestionPresentaciones
- SelectTipoPresentacion
- BotonEditarProducto
- BotonEliminarProducto
- TablaProductosData
- TituloFiltreoInput
- FiltroTablaProductos
- ResultadoBusqueda
- FiltrarPorClave
- CopyToClipBoard
- ProductListPlaceholder
- ProductGridPlaceholder

### 📮 pedidos/ (8 componentes, 3 prompts)
**Gestión de pedidos y compras**
- ✅ ListaPedidos.jsx
- ✅ BotonAgregarPedido.jsx
- ✅ AgregarProductoPedido.jsx
- CrearPedidoAutomatico
- EditarPedido
- ExportarPedido
- PedidosPorProveedor

### ⚠️ alertas/ (9 componentes, 1 prompt)
**Alertas y confirmaciones**
- ✅ alertaBorrarProducto.jsx
- alertaBorrarProveedor
- alertaBorrarCategoria
- alertaCrearCodigoDeBarras
- alertaLeerCodigoBarra
- alertaTotalCompra
- camaraError
- alertaSiNoAction (genérica)

### 📈 dashboard/ (3 componentes, 2 prompts)
**Panel de control**
- ✅ Dashboard.jsx
- ✅ MetricCard.jsx
- DashboardCard

### 🧭 navegacion/ (3 componentes, 1 prompt)
**Navegación**
- ✅ NavBarVertical.jsx
- NavBarHorizontal
- menuList

### ui/ (4 componentes, 1 prompt)
**Componentes UI genéricos**
- ✅ ErrorNotification.jsx
- ImageWithFallback
- PaginationControls
- NotificationRenderer

### categorias/ (7 componentes, 1 prompt)
**Gestión de categorías**
- ✅ ListadoCategorias.jsx
- EditarCategoriaModal
- RenglonCategorias
- RenderCategorias
- SelectCategoria
- SelectCategoriaClient
- InputArrayListCategorias

### contactos/ (3 componentes, 1 prompt)
**Gestión de contactos**
- ✅ ListadoContactos.jsx
- ListadoContactosCliente
- CargarContacto
- RenglonTablaContacto

### proveedores/ (3 componentes, 1 prompt)
**Gestión de proveedores**
- ✅ ListadoProveedores.jsx
- RenglonProveedor
- SelectProveedorClient
- ProductosPorProveedor
- InputArrayListProveedores

### unidades/ (4 componentes)
**Gestión de unidades**
- ListadoUnidades
- RenglonUnidades
- SelectUnidades
- SelectUnidadesClient

### venta/ (1 componente)
**Gestión de ventas**
- ListadoVenta

### excell/ (2 componentes)
**Exportación a Excel**
- tablaExcell
- objetoEnTabla

### graficos/ (2 componentes)
**Gráficos**
- LineGraph
- LineGraphClient

### ia/ (1 componente)
**Componentes de IA**
- IaPromp

### camara/ (1 componente)
**Componentes de cámara**
- Scanner

### geoRef/ (3 componentes)
**Geolocalización**
- SelectProvinciaClient
- SelectLocalidadClient
- SelectCalleClient

### userMenu/ (1 componente)
**Menú de usuario**
- UserMenu

### publicas_pages/ (1 página)
**Páginas públicas**
- login

### dolarHoy/ (2 componentes)
**Dólar del día**
- DolarHoy
- DolarHoyServer

### Fallback/ (1 componente)
**Fallbacks**
- FallbackComponent

### HiglightMatch, Image, LoadImage64, Skeleton
**Componentes simples**

### Tablas/
**Componente tabla base**
- Tablas

---

## 📈 PLAN DE EXPANSIÓN

### Fase 3 (Próximo): Componentes Restantes (30+)
- [ ] formComponents: InputSelect, InputArrayList, SelectSearch, etc
- [ ] productos: ListadoProductos, TbodyTablaProducto, etc
- [ ] alertas: alertaBorrarProveedor, alertaBorrarCategoria, etc
- [ ] Todos los demás componentes

### Fase 4: Páginas
- [ ] Documentar cada página en app/(paginas)
- [ ] Documentar login en publicas_pages
- [ ] Estructura de layouts

### Fase 5: Backend
- [ ] Esquemas Prisma
- [ ] Server Actions
- [ ] Consultas (queries)
- [ ] Hooks personalizados
- [ ] Contextos

### Fase 6: Documentación Completa
- [ ] Guía de arquitectura
- [ ] Patrones de diseño
- [ ] Flujos de datos
- [ ] Mejores prácticas

---

## 🎯 PRÓXIMOS PASOS

1. **AHORA**: Usar los 21 prompts existentes
2. **Esta semana**: Crear 30+ más para otros componentes
3. **Este mes**: Documentar páginas, hooks, contextos
4. **Este trimestre**: Documentar backend completo

---

## 📝 ESTADÍSTICAS

- **Total de componentes**: 113
- **Prompts creados**: 21
- **Cobertura**: 18.6%
- **Carpetas de estructura**: 20
- **Archivos de documentación**: 4

---

**Última actualización**: 7 de enero de 2026
**Versión**: 2.0 (Estructura Completa)
