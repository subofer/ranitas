# Reglas de Desarrollo - Sistema de Gestión de Inventario

## Definiciones de lexico
- **Presentación**: Forma en que se comercializa un producto (Suelto por peso, Unidad Base, Caja, Pallet, bulto).
- **Tipo de recipiente**: Descripción del envase o embalaje del producto (ej: botella, bolsa, caja).
- **Unidad Base**: La unidad mínima de venta del producto (ej: 1 kg, 10g, 1 unidad).
- **Empaque**: Cualquier presentación que agrupe múltiples unidades base (ej: Caja de 12 unidades, Pallet de 48 cajas).
- **Factor de Conversión**: Cantidad de unidades base contenidas en una presentación de empaque (ej: Caja de 12 unidades tiene un factor de conversión de 12).
- **Insumo**: Cualquier producto o presentación que se consume para generar otro.
- **Receta**: Lista de insumos y cantidades necesarias para generar 1 unidad de una presentación.
- **Stock Suelto**: `stock_base` Cantidad de unidades base disponibles para venta directa.
- **Stock en Empaque**: `stock_empaque`Cantidad de presentaciones empaquetadas disponibles (ej: cajas, pallets).
- **Apertura de Empaque**: Acción de descomponer un empaque en sus unidades base correspondientes, 
afectando el stock.
- **Producir**: Acción de sumar stock a la presentacion producida consumiendo stock de la presentacion contenida. (ejemplo producir 1 caja de 12 unidades consume 12 unidades base, o producir bolsita de 200g de avena consume 200g de avena suelta).
- **Contacto**: Entidad que puede ser cliente, trabajador, marca o proveedor.
- **Cliente**: Contacto que adquiere productos del sistema.
- **Proveedor**: Contacto que suministra productos al sistema.
- **Trabajador**: Contacto que gestiona operaciones dentro del sistema.
- **Marca**: Contacto que representa la marca de un productos.
- **Categoría**: Clasificación asignada a productos para organización y filtrado.
- **Alias de Contacto**: Nombre alternativo para un contacto (proveedor/cliente), usado para mejorar el reconocimiento OCR en facturas escaneadas.
- **Alias por Proveedor/Presentación**: Nombre alternativo asignado a una presentación específica de un producto por un proveedor determinado.
- **Factor de conversión**: Cantidad de unidades base contenidas en una presentación de empaque (ej: Caja de 12 unidades tiene un factor de conversión de 12).


## Gestion de auditoría
- Cada acción que modifique stock debe registrar un evento de auditoría con detalles: tipo de acción, usuario, timestamp, cantidades antes y después.
- Los eventos de auditoría deben ser inmutables y consultables para revisiones futuras.
- Todas las acciones que modifiquen datos de la base de datos, dejan un registro en la tabla de auditoría.
- Las auditorias tienen nombres de acciones definidos en el sistema, como por ejemplo: "CREAR_FACTURA", "AJUSTAR_STOCK", "ABRIR_EMPAQUE", "PRODUCIR_PRODUCTO", "OLLAMA_FAILURE", "CREAR_ALIAS_CONTACTO", "DESACTIVAR_ALIAS_CONTACTO", "BUSCAR_PRODUCTO_IA", "CREAR_PRODUCTO_DESDE_IA".
- La auditoría "OLLAMA_FAILURE" registra fallos en el procesamiento de imágenes con IA (modelo, modo, archivo, error, timing).
- La auditoría "CREAR_ALIAS_CONTACTO" registra la creación de aliases para contactos (proveedor, alias, fuente, observaciones).
- La auditoría "DESACTIVAR_ALIAS_CONTACTO" registra la desactivación de aliases (proveedor, alias, motivo).
- La auditoría "BUSCAR_PRODUCTO_IA" registra búsquedas de información de productos con IA/Puppeteer (consulta, resultados, producto, marca, categorías).
- La auditoría "CREAR_PRODUCTO_DESDE_IA" registra la creación automática de productos desde información encontrada con IA.
- Algunas acciones tienen la posibilidad de deshacerse desde la auditoria, revirtiendo los cambios realizados y dejando un registro en la auditoría indicando la reversión.
- Debera existir un archivo de configuración donde se definan los nombres y descripcion de las acciones que dejan auditoría y cuales de ellas permiten reversión.
- La función `guardarAuditoriaOllamaFailure` en `prisma/serverActions/facturaActions.js` registra fallos de Ollama (actualmente por console.log, preparada para persistencia en BD).


## Informacion de producto
- El produco es en si la presentación "Unidad Base",
- El producto especifica si se vende suelto, si se produce y si se vende por unidad.
- Los productos que se producen tienen recetas asociadas.
- En el producto se especifica Nombre, marca, descripcion, categorias, el tipo de recipiente, su cantidad y unidad de medida,  (ej: kg, g, unidades)(con posibilidad de convertilas a equivalencias automaticamente).
- Cada producto debe tener al menos una presentación definida.
- El sistema debe permitir definir múltiples presentaciones por producto.
- El sistema debe validar que solo una presentación por producto  esté marcada como "Unidad Base".
- La presentación marcada como "Unidad Base" tiene factor de conversión 1.
- Las presentaciones tienen un "Factor de conversión" e indican que otra presentacion contienen.
- Cada presentacion puede tener mas de un proveedor asociado, cada proveedor puede tener un alias distinto para la misma presentacion.
- El sistema debe permitir asignar un alias por proveedor para cada presentación de un producto.
- Cada presentación puede tener su propio precio de compra y venta.
- Cada presentación puede tener su propio nivel de stock.
- El sistema debe permitir ajustar el stock de cada presentación individualmente.
- Cada presentación puede tener su propio nivel de stock crítico para alertas.
- El sistema debe permitir consultar el stock total y parcial de un producto sumando todas sus presentaciones.
- Cada presentación puede tener su propio código de barras.
- Cada presentación puede tener su propia imagen.
- Cada presentación tiene su propio historial de precios de compra y venta.
- El sistema debe permitir consultar el historial de precios, compra y venta por presentación.
- El sistema debe permitir definir un proveedor preferido por presentación.
- Cada presentacion puede tener su propio proveedor preferido.
- Cada producto puede tener múltiples categorías asignadas.
- Cada producto debe tener su su margen de ganancia definido por presentación.
- El sistema debe permitir definir descuentos por presentación.
- El producto puede ser una receta que produce otras presentaciones y puede consumir distintos productos.
- Las recetas deben definir los insumos necesarios por presentación producida.


## Lógica de Stock
- Diferenciar estrictamente entre `stock_base` (físico suelto) y `stock_empaque` (bultos cerrados).
- Cada presentacion, tiene su propio `factor_conversion`.
- Al registrar compras, especificar la presentación adquirida para ajustar el stock correctamente.
- El ingreso por factura suma a `stock_empaque` o `stock_base` según la presentación.
- Al registrar ventas, deducir del stock según la presentación vendida.
- Al abrir un empaque, ajustar ambos niveles de stock según el `factor_conversion`.
- Al producir, sumar `stock_base` y resta `stock_base` de los `insumos` de la `receta`.
- La acción "Abrir" resta 1 de `stock_empaque` y suma al stock del contenido segun `factor_conversion`.
- La accion "Cerrar" suma 1 a `stock_empaque` y resta del stock del contenido segun `factor_conversion`.

## Flujo de stock
- Al cargar una factura de compra, el stock se incrementa en `stock_empaque` si es producto en empaque y en `stock_base` si es unidad base.
- Al abrir un empaque, se reduce `stock_empaque` y se incrementa `stock_base` según el `factor_conversion`.
- Al vender productos, se reduce el stock de la presentación correspondiente (suelto o empaque).

## Flujo de Compras
- En el listado de productos puede verse el stock total desglosado por presentación y su estado de criticalidad basada en las ventas y los peridos de entrega del proveedor.
- Los Pedidos se convierten en Facturas (Conciliación).
- Al recibir una factura, permitir modificar: Cantidad Recibida, Precio, Descuentos.
- El stock se impacta solo al confirmar la factura.
- Cada presentación puede tener su propio tiempo estimado de entrega por parte del proveedor (por defecto la frecuencia de entrega del proveedor) editable desde el pedido si el proveedor lo informa.


## Arquitectura de UI
- Listados con filas expandibles para presentaciones.
- Modales de pedido vinculados automáticamente al `supplier_id` del producto.

## Estilos y convenciones de código
- Utilizar camelCase para nombres de variables y funciones.
- Utilizar PascalCase para nombres de clases y componentes React.
- Mantener una indentación consistente de 2 espacios.
- Escribir comentarios claros y concisos para explicar la lógica compleja.
- Dividir el código en funciones pequeñas y reutilizables, removiendo duplicación a cada paso.
- Seguir las mejores prácticas de seguridad y manejo de errores.
- Todos los handlers críticos deben estar protegidos con try/catch y mostrar mensajes de error amigables al usuario.
- Los errores de procesamiento de imágenes, cámara y Ollama deben registrarse en auditoría.
- Escribir pruebas unitarias para funciones críticas.
- Documentar las funciones públicas con JSDoc.
- Utilizar nombres descriptivos para variables y funciones.
- Evitar el uso de variables globales cuando sea posible.
- Mantener los archivos de código organizados por funcionalidad.
- Realizar revisiones de código antes de fusionar cambios importantes.
- Seguir las convenciones de commit de Git para mensajes claros y significativos.
- Utilizar control de versiones para gestionar cambios en el código.
- Mantener la documentación del proyecto actualizada con los cambios en el código.
- Utilizar herramientas de linting para asegurar la calidad del código.
- Optimizar el rendimiento del código cuando sea necesario.
- Utilizar patrones de diseño apropiados para resolver problemas comunes.
- Mantener la coherencia en el estilo de codificación en todo el proyecto.
- Luego de cada cambio de sintaxis, correr un lint y arreglar los errores y warnings.
- Siempre verificar que todos los estados useState estén correctamente declarados antes de usarlos.

# Reglas de Memoria del Proyecto

## Sistema de Carga de Facturas con IA (Última actualización: 25/01/2026)

### Componentes Principales
- **IaImage.jsx**: Componente principal para carga y análisis de facturas
  - Estados: 25 estados useState (file, preview, imagenOriginal, previewOriginal, result, errorMessage, parsedData, loading, etc.)
  - Hooks: useImageAutoFocus, useImageTransformations, useOllamaStatusContext
  - Funcionalidades: Upload (drag&drop + input), Cámara (móvil + desktop), Cropping manual/automático
  - Gestión dual de imágenes: Croppeada para LLM, Original para BD

### Flujo de Procesamiento de Imágenes
1. **Captura/Upload**: 
   - Drag & drop protegido con try/catch
   - Input file protegido con try/catch
   - Cámara con handler compartido `handleCameraCapture`
   - onFile guarda automáticamente imagen original (imagenOriginal, previewOriginal)
2. **Preprocesamiento**:
   - Auto-enfoque aplicado automáticamente
   - Posibilidad de deshacer auto-enfoque
   - Cropping manual por 4 vértices (ManualVertexCropper mejorado)
3. **Crop Manual (ManualVertexCropper)**:
   - Arrastre de puntos mejorado (área 15px, hover effects)
   - Previsualización en tiempo real del crop
   - Retorna objeto con ambas imágenes: { cropped: {file, preview}, original: {file, preview} }
   - Calidad JPEG: 0.95 para preservar detalles
4. **Optimización** (server):
   - Conversión a escala de grises
   - Auto-recorte de bordes
   - Compresión JPEG (85%)
   - Reducción ~66% del tamaño
5. **Análisis Ollama**:
   - Timeout: 10 minutos
   - Detección de errores GGML_ASSERT/panic
   - Registro de fallos en auditoría
   - Se envía imagen croppeada y procesada (file)
6. **Post-procesamiento**:
   - Normalización de totales y descuentos
   - Detección de devoluciones
   - Búsqueda automática de proveedor y productos

### Auditoría de Fallos
- **guardarAuditoriaOllamaFailure**: Registra fallos de procesamiento IA
  - Puntos de registro: Error HTTP, Timeout, Parse error, Error de conexión
  - Información: model, mode, fileName, fileSize, errorText, timing
  - Estado actual: Console.log (preparado para BD)

### Gestión de Imágenes Dual
- **Imagen Croppeada** (file, preview): Se usa para mostrar en UI y enviar al LLM
- **Imagen Original** (imagenOriginal, previewOriginal): Se guarda en BD para referencia futura
- **handleCrop**: Recibe objeto `{ cropped: {file, preview}, original: {file, preview} }`
- **handleGuardarFactura**: Guarda `imagenOriginal || file` en la base de datos

### Manejo de Errores
- Todos los handlers de upload/cámara con try/catch
- Mensajes de error amigables al usuario
- Estado `errorMessage` para mostrar errores en UI
- Botón "Reintentar" visible cuando hay errores retryables

### Crop Manual Mejorado
- **Arrastre de puntos**: Área de detección 15px, efectos hover (tamaño 8px→12px, color azul→rojo)
- **Cursores dinámicos**: crosshair (crear), grab (hover), grabbing (arrastrar)
- **Previsualización**: Botón "👁️ Previsualizar" muestra resultado en tiempo real
- **Layout adaptativo**: Split screen (1fr 1fr) cuando preview activa
- **Calidad alta**: JPEG 95% para preservar detalles del documento

### UX Móvil
- Botón pequeño de cámara (desktop + mobile)
- Botón grande de cámara solo móvil (`sm:hidden`)
- Optimización de imágenes capturadas (max 1200px, JPEG 85%)

## Sistema de Aliases para Proveedores (Última actualización: 26/01/2026)

### Descripción
Sistema que permite vincular nombres escaneados (que no se encontraron) con proveedores existentes, creando aliases para mejorar el reconocimiento automático en futuras cargas de facturas.

### Base de Datos
- **Modelo AliasContacto**: id, contactoId, alias (unique), fuente, activo, observaciones, creadoPor
- **Enum FuenteAlias**: MANUAL, IA_SCAN, IMPORTACION
- **Relación**: Contactos.aliases → AliasContacto[] (uno a muchos)
- **Indices**: contactoId, alias

### Server Actions (aliasActions.js)
- **buscarContactoPorNombreOAlias**: Busca contacto por nombre, nombreFantasia o alias
- **crearAliasContacto**: Crea nuevo alias con validación y auditoría
- **vincularNombreEscaneadoConContacto**: Función especializada para vincular nombres detectados por IA
- **desactivarAliasContacto**: Desactiva alias manteniendo histórico

### Búsqueda de Proveedores
- La función `buscarProveedor()` en facturaActions.js ahora busca también en aliases activos
- Los aliases tienen prioridad alta en el cálculo de similitud (bonus 2x en match exacto)
- Retorna `metodo: 'alias'` cuando encuentra match por alias

### Componentes UI
- **ModalVincularProveedor.jsx**: Modal para vincular nombre escaneado con proveedor existente
  - Props: nombreEscaneado, isOpen, onCancelar, onVinculado
  - Lista todos los proveedores con búsqueda en tiempo real
  - Selección visual con checkmark
  - Observaciones pre-llenadas
- **SelectorProveedorSimilar.jsx**: Modificado con botón "🔗 Vincular con Existente"
  - Integra ModalVincularProveedor
  - Handler handleProveedorVinculado

### Flujo de Usuario
1. Usuario carga factura → IA detecta "VALMAIRA S.A."
2. Sistema no encuentra proveedor (nombre, nombreFantasia, CUIT, aliases)
3. Se muestra SelectorProveedorSimilar con 3 opciones:
   - 🔗 Vincular con Existente
   - ➕ Crear Nuevo Contacto
   - ✓ Asociar con [seleccionado similar]
4. Usuario elige "Vincular con Existente" → Se abre ModalVincularProveedor
5. Usuario busca y selecciona "Valmaira SA"
6. Sistema crea alias y registra auditoría
7. Próxima vez que se escanee "VALMAIRA S.A." → Encuentra automáticamente "Valmaira SA"

### Auditoría
- **CREAR_ALIAS_CONTACTO**: Registra aliasId, contactoId, alias, fuente, observaciones
- **DESACTIVAR_ALIAS_CONTACTO**: Registra aliasId, alias, motivo

### API
- **GET /api/contactos?tipo=proveedor**: Retorna lista de contactos filtrada por tipo


