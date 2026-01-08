PROMPT IDEAL PARA CONSULTAS DE CONTACTOS (contactos.js)

## PROPÓSITO GENERAL
Funciones server-side para gestionar contactos (proveedores, clientes, marcas).

## FUNCIONES PRINCIPALES

### getContactos()
- Obtiene todos los contactos
- Parámetros opcionales: filtros (esProveedor, esMarca, esInterno)
- Include: direcciones, emails, cuentaBancaria
- OrderBy: nombre ASC
- Retorna: array de contactos

### getContactoById(id)
- Obtiene contacto específico con todas relaciones
- Include: direcciones, emails, cuentaBancaria, productos, documentos

### getProveedores()
- Obtiene solo contactos donde esProveedor = true
- Include: productos (ProductoProveedor)
- Útil para selects de pedidos

### getClientesInternosYMarcas()
- Obtiene contactos internos y marcas
- Where: esInterno OR esMarca

### crearContacto(datos)
- Crea nuevo contacto
- Parámetros:
  - cuit: String (UNIQUE)
  - nombre: String (UNIQUE, requerido)
  - telefono: String
  - iva: String
  - esProveedor: Boolean
  - esMarca: Boolean
  - esInterno: Boolean
- Validación: cuit y nombre únicos

### actualizarContacto(id, datos)
- Actualiza datos del contacto
- Campos: nombre, telefono, iva, flags de tipo (esProveedor, etc)

### borrarContacto(id)
- Elimina contacto
- Validación: no tiene pedidos activos
- O: reasignar pedidos primero

### buscarContactoPorNombre(query)
- Búsqueda por nombre (LIKE insensitive)
- Retorna: matches

### buscarContactoPorCuit(cuit)
- Búsqueda por CUIT exacto
- Retorna: contacto único o null

## RELACIONES CON DIRECCIONES

### agregarDireccion(idContacto, datosDireccion)
- Agrega dirección a contacto
- Parámetros: calle, número, piso, localidad, provincia

### actualizarDireccion(idDireccion, datos)

### borrarDireccion(idDireccion)

## RELACIONES CON EMAILS

### agregarEmail(idContacto, email)
- Agrega email a contacto
- Validación: email único

### borrarEmail(idEmail)

## VALIDACIONES

- CUIT válido (formato Argentina)
- Nombre requerido
- Email formato válido (si existe)
- Teléfono formato válido (si existe)

---

## NUEVAS CARACTERÍSTICAS

- [ ] Importar desde CSV
- [ ] Duplicado detection (CUIT similar)
- [ ] Historial de transacciones
- [ ] Calificación de proveedor
- [ ] Seguimiento de pagos
