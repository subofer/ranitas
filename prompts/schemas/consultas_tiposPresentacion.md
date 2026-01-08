PROMPT IDEAL PARA CONSULTAS DE TIPOS DE PRESENTACIÓN (tiposPresentacion.js)

## PROPÓSITO GENERAL
Funciones server-side para gestionar tipos de presentación (botellas, cajas, pallets, etc).

## FUNCIONES PRINCIPALES

### getTiposPresentacion()
- Obtiene todos los tipos de presentación
- Include: presentaciones que usan este tipo
- OrderBy: nombre ASC
- Retorna: array de tipos

### getTipoPresentacionById(id)
- Obtiene tipo específico
- Include: presentaciones

### crearTipoPresentacion(nombre, descripcion?)
- Crea nuevo tipo de presentación
- Parámetros:
  - nombre: String (UNIQUE, requerido) - ej: "Botella", "Caja", "Pallet"
  - descripcion: String (opcional)
- Validación: nombre único
- Retorna: tipo creado

### actualizarTipoPresentacion(id, datos)
- Actualiza tipo
- Campos: nombre, descripcion

### borrarTipoPresentacion(id)
- Elimina tipo
- Validación: no tiene presentaciones usando este tipo
- O: reasignar a otro tipo primero

### buscarTipoPresentacion(query)
- Búsqueda por nombre (LIKE insensitive)

## EJEMPLOS DE TIPOS

```
- Botella
- Lata
- Caja
- Bolsa
- Pallet
- Bidón
- Fardo
- Rollos
- Metros
- Kilos
- Litros
```

## VALIDACIONES

- Nombre requerido
- Nombre único

---

## NUEVAS CARACTERÍSTICAS

- [ ] Iconos por tipo
- [ ] Colores personalizados
- [ ] Símbolos/abreviaturas
