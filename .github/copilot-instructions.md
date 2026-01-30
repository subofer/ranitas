# Reglas de Desarrollo - Sistema de Gestión de Inventario (SGI)

## 1. Definiciones de Léxico (Core)
- **Producto**: Es la "Unidad Base" (mínima unidad de venta: 1 kg, 1 unidad, etc.).
- **Presentación**: Forma de comercialización (Suelto, Unidad Base, Caja, Pallet, Bulto).
- **Unidad Base**: Punto de referencia con **Factor de Conversión = 1**.
- **Empaque**: Presentación que agrupa múltiples unidades base.
- **Factor de Conversión**: Cantidad de unidades base en una presentación (Ej: Caja de 12u = Factor 12).
- **Tipo de Recipiente**: Envase físico (botella, bolsa, caja).
- **Insumo**: Producto consumido para generar otro.
- **Receta**: Lista de insumos para generar 1 unidad de una presentación producida.
- **Stock Suelto (`stock_base`)**: Cantidad de unidades base disponibles para venta directa.
- **Stock en Empaque (`stock_empaque`)**: Cantidad de bultos cerrados disponibles.
- **Apertura de Empaque**: Descomponer 1 empaque en sus unidades base (Resta 1 `stock_empaque`, suma N `stock_base`).
- **Producir**: Sumar stock a la presentación producida consumiendo stock de la presentación contenida o insumos.
- **Contacto**: Entidad genérica (Cliente, Trabajador, Marca o Proveedor).
- **Alias de Contacto**: Nombre alternativo para mejorar el reconocimiento OCR/IA en facturas.
- **Alias por Proveedor/Presentación**: Nombre específico asignado por un proveedor a una presentación.

## 2. Gestión de Auditoría e Inmutabilidad
- **Inmutabilidad**: Todo cambio en stock o datos de BD debe registrar un evento de auditoría (Acción, Usuario, Timestamp, Delta).
- **Acciones Definidas**: `CREAR_FACTURA`, `AJUSTAR_STOCK`, `ABRIR_EMPAQUE`, `PRODUCIR_PRODUCTO`, `OLLAMA_FAILURE`, `CREAR_ALIAS_CONTACTO`, `DESACTIVAR_ALIAS_CONTACTO`, `BUSCAR_PRODUCTO_IA`, `CREAR_PRODUCTO_DESDE_IA`.
- **Auditoría de IA (OLLAMA_FAILURE)**: Registra fallos de procesamiento (modelo, modo, archivo, error, timing).
- **Reversión**: Solo las acciones definidas en el archivo de configuración permiten "Deshacer", registrando la reversión como un nuevo evento.
- **Persistencia**: La función `guardarAuditoriaIaFailure` gestiona los fallos de la IA local.

## 3. Información de Producto y Presentaciones
- **Jerarquía**: Un Producto -> Múltiples Presentaciones.
- **Validación**: Solo una presentación por producto puede ser "Unidad Base".
- **Atributos de Presentación**:
  - Código de barras e imagen propia.
  - Precio de compra, venta y margen de ganancia independiente.
  - Niveles de stock y stock crítico para alertas.
  - Factor de conversión y referencia a qué otra presentación contiene.
  - Proveedor preferido y alias específicos por proveedor.
- **Atributos de Producto**: Nombre, marca, descripción, categorías y tipo de recipiente.
- **Precios**: Registro histórico obligatorio de cambios en precios de compra y venta.

## 4. Lógica y Flujo de Stock
- **Diferenciación Estricta**: `stock_base` vs `stock_empaque`.
- **Ingreso (Compras)**: Incrementa según la presentación (Empaque -> `stock_empaque`, Base -> `stock_base`).
- **Salida (Ventas)**: Deduce de la presentación vendida.
- **Transformación**: 
  - **Abrir**: Resta 1 `stock_empaque`, suma según `factor_conversion` al stock del contenido.
  - **Cerrar**: Suma 1 `stock_empaque`, resta del stock del contenido.
  - **Producir**: Suma `stock_base` al producto final y resta de los `insumos` según la `receta`.

## 5. Sistema de Carga de Facturas con IA
- **Componente Principal**: `IaImage.jsx`.
- **Gestión Dual de Imágenes**:
  - **Auto Crop**: El sistema se vale de YoloV26 corriendo en ranitas-vision para detectar bordes y croppear automáticamente. # Prompt optimizado para capturar cualquier formato de comprobante
  target_classes = ["piece of paper", "receipt", "invoice", "document", "ticket"]
  Inyección en el modelo YOLOE -> model.set_classes(target_classes, model.get_text_pe(target_classes))
  - **Visualizador de imagenes**: Permite (control+ruedita):zoom, (control+clic y mover:)pan y cropping automatico con opcion de correccion manual, todo en el mismo componente.
  - **Imagen Croppeada**: Para visualización en UI y envío al LLM.
  - **Imagen Original**: Referencia persistente para auditoría en BD.

- **ManualVertexCropper**: Ajuste por 4 vértices (área 15px, hover effects, calidad JPEG 0.95).
- **Pipeline de Procesamiento**: 
  1. Captura (Mobile/Desktop).
  2. Preprocesamiento Auto-crop Yolo, opcion de correccion manual.
  3. Análisis (Qwen2.5-VL con timeout 10min).
  4. Post-procesamiento (Normalización de totales, búsqueda de proveedores y productos, presentacion, decuentos, impuestos, devoluciones).

## 6. Sistema de Aliases para Proveedores
- **Objetivo**: Vincular nombres detectados por IA con proveedores existentes.
- **Prioridad**: Los aliases tienen **bonus 2x** en match exacto durante la búsqueda de proveedores.
- **Flujo**:
  1. IA detecta nombre desconocido.
  2. `ModalVincularProveedor.jsx` permite elegir proveedor existente.
  3. Se crea registro en `AliasContacto` (fuentes: MANUAL, IA_SCAN, IMPORTACION).
  4. Auditoría registra `CREAR_ALIAS_CONTACTO`.

## 7. Convenciones de Código y Estilos
- **Nomenclatura**: camelCase para variables/funciones; PascalCase para Componentes/Clases.
- **Estructura**: Indentación de 2 espacios. Funciones pequeñas, modulares y sin duplicación.
- **Seguridad**: Handlers críticos protegidos con `try/catch`. Errores de hardware (Ollama, Cámara) logueados en auditoría.
- **Calidad**: Uso de Linting obligatorio, JSDoc para funciones públicas y verificación estricta de `useState`.
- **Arquitectura UI**: Filas expandibles para presentaciones y modales vinculados por `supplier_id`.

POR AHORA NO HACEMOS NUNCA TESTS AUTOMATIZADOS.