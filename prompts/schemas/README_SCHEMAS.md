# 🗄️ DOCUMENTACIÓN DE SCHEMA PRISMA Y CONSULTAS

## 📋 RESUMEN

Se ha documentado completamente el **schema de Prisma** y **todas las funciones de consultas** de la aplicación.

### 📊 Estadísticas

```
Schema Prisma:        1 archivo
Archivos de consultas: 9 archivos
Total prompts schema: 10 archivos
Modelos documentados: 16 modelos
Funciones documentadas: 100+ funciones
```

---

## 📂 ESTRUCTURA

### Schema Principal
- **schema.prisma.md** - Schema completo con todos los modelos y relaciones

### Consultas por Dominio (9 archivos)

#### 📦 Productos
- **consultas_productos.md**
  - ultimoPrecioDelProducto()
  - nuevoPrecioProducto()
  - getProductosPaginados()
  - getProductosByCategoria()
  - getProducto()
  - buscarProductoByCodigoDeBarras()
  - getProductosConStockBajo()
  - getProductosAgrupadosPorProveedor()
  - getProductosPorProveedor()

#### 📋 Pedidos
- **consultas_pedidos.md**
  - getPedidos()
  - getPedidoById()
  - getPedidosByProveedor()
  - crearPedido()
  - agregarProductoAPedido()
  - actualizarEstadoPedido()
  - eliminarPedido()
  - getProductosAgrupadosPorProveedor()
  - crearPedidosAutomaticos()

#### 📂 Categorías
- **consultas_categorias.md**
  - getCategorias()
  - getCategoriasConteo()
  - getCategoriaById()
  - crearCategoria()
  - actualizarCategoria()
  - borrarCategoria()
  - buscarCategoria()

#### 👥 Contactos
- **consultas_contactos.md**
  - getContactos()
  - getContactoById()
  - getProveedores()
  - getClientesInternosYMarcas()
  - crearContacto()
  - actualizarContacto()
  - borrarContacto()
  - buscarContactoPorNombre()
  - + Direcciones, Emails, Cuentas Bancarias

#### 📄 Documentos
- **consultas_documentos.md**
  - getDocumentos()
  - getDocumentoById()
  - getDocumentosByContacto()
  - getDocumentosByTipo()
  - getDocumentosByFecha()
  - crearDocumento()
  - agregarDetalleDocumento()
  - actualizarDocumento()
  - borrarDocumento()
  - + Analytics

#### 🎁 Presentaciones
- **consultas_presentaciones.md**
  - getPresentaciones()
  - getPresentacionesByProducto()
  - getPresentacionById()
  - crearPresentacion()
  - + Agrupaciones (composición)
  - convertirUnidades()

#### 📦 Tipos de Presentación
- **consultas_tiposPresentacion.md**
  - getTiposPresentacion()
  - getTipoPresentacionById()
  - crearTipoPresentacion()
  - actualizarTipoPresentacion()
  - borrarTipoPresentacion()

#### 🏭 Proveedores
- **consultas_proveedores.md**
  - getProveedores()
  - getProveedorById()
  - crearProveedor()
  - actualizarProveedor()
  - borrarProveedor()
  - getProductosDelProveedor()
  - getPedidosDelProveedor()
  - getEstadisticasProveedor()
  - + Relaciones

#### 👤 Usuarios
- **consultas_usuarios.md**
  - getUsuarios()
  - getUsuarioById()
  - getUsuarioByEmail()
  - crearUsuario()
  - cambiarPassword()
  - verificarPassword()
  - + Permisos

#### 📊 Dashboard
- **consultas_dashboard.md**
  - getDashboardStats()
  - getTotalVentas()
  - getTotalCompras()
  - getCaja()
  - getMargen()
  - getValorStockTotal()
  - + Métricas, Trends, Cash Flow
  - + Top products/providers
  - + Alertas

#### 🗺️ Geografía
- **consultas_geoRef.md**
  - getProvincias()
  - getLocalidadesByProvincia()
  - getCallesByLocalidad()
  - + Búsquedas y autocomplete

---

## 🎯 CÓMO USAR

### Para Entender el Schema
```
1. Lee: schema.prisma.md
2. Entiende: modelos, relaciones, enums
3. Revisa: constraints y validaciones
```

### Para Usar Funciones de Consultas
```
1. Identifica el dominio (productos, pedidos, etc)
2. Lee: consultas_[dominio].md
3. Copia la función que necesitas
4. Adaptala a tu caso de uso
```

### Para Agregar Nuevas Funciones
```
1. Decide qué datos necesitas
2. Escribe la función Prisma
3. Documenta en el archivo correspondiente
4. Agrega NUEVAS CARACTERÍSTICAS sugeridas
```

---

## 📚 MODELOS DOCUMENTADOS

| Modelo | Documento | Funciones |
|--------|-----------|-----------|
| Productos | consultas_productos.md | 9+ |
| Pedidos | consultas_pedidos.md | 9+ |
| Categorías | consultas_categorias.md | 7+ |
| Contactos | consultas_contactos.md | 10+ |
| Documentos | consultas_documentos.md | 9+ |
| Presentaciones | consultas_presentaciones.md | 8+ |
| TiposPresentacion | consultas_tiposPresentacion.md | 5+ |
| Proveedores | consultas_proveedores.md | 10+ |
| Usuarios | consultas_usuarios.md | 10+ |
| Dashboard | consultas_dashboard.md | 15+ |
| Geografía | consultas_geoRef.md | 10+ |

**TOTAL: 100+ funciones documentadas**

---

## 🔑 CARACTERÍSTICAS CLAVE

✅ **Schema Completo**: Todos los modelos y relaciones  
✅ **Funciones por Dominio**: Organizadas lógicamente  
✅ **Validaciones**: Qué se valida en cada función  
✅ **Ejemplos**: Parámetros esperados  
✅ **Relaciones**: Cómo se relacionan los datos  
✅ **Mejoras**: Ideas para nuevas features  
✅ **Búsquedas**: Funciones de búsqueda y filtrado  
✅ **Analytics**: Funciones agregadas para reportes  

---

## 🚀 PRÓXIMOS PASOS

1. **Usar las funciones**: Copia desde los prompts al código
2. **Agregar más**: Si necesitas nuevas funciones, sigue el patrón
3. **Mejorar**: Implementa las "NUEVAS CARACTERÍSTICAS" sugeridas
4. **Documentar**: Mantén los prompts actualizados

---

## 💡 EJEMPLOS DE USO

### Obtener productos con stock bajo
```
Lee: consultas_productos.md
Encuentra: getProductosConStockBajo()
Usa: await getProductosConStockBajo(minimoStock)
```

### Crear pedido automático
```
Lee: consultas_pedidos.md
Encuentra: crearPedidosAutomaticos()
Usa: await crearPedidosAutomaticos()
```

### Dashboard con estadísticas
```
Lee: consultas_dashboard.md
Encuentra: getDashboardStats()
Usa: const stats = await getDashboardStats()
```

---

**Todo el schema y funciones de base de datos están documentados y listos para usar.** 🎉
