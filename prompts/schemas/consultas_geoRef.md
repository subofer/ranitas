PROMPT IDEAL PARA CONSULTAS DE GEOGRAFÍA (geoRef/)

## PROPÓSITO GENERAL
Funciones server-side para consultar datos geográficos (provincias, localidades, calles).

## MODELOS

### Provincias
- id: String
- nombre: String
- nombreCompleto: String
- isoId: String

### Localidades
- id: String
- nombre: String
- idProvincia: String (FK)
- nombreLocalidadCensal: String
- idDepartamento: String
- idLocalidadCensal: String
- idMunicipio: String

### Calles
- id: String
- nombre: String
- categoria: String
- idProvincia: String (FK)
- alturas: String
- idLocalidadCensal: String

## FUNCIONES PRINCIPALES

### getProvincias()
- Obtiene todas las provincias
- OrderBy: nombre ASC
- Retorna: array de provincias

### getProvinciaById(id)
- Obtiene provincia específica
- Include: localidades, calles

### getLocalidadesByProvincia(idProvincia)
- Obtiene localidades de provincia
- OrderBy: nombre ASC
- Retorna: array

### getLocalidadById(id)
- Obtiene localidad con relaciones

### getCallesByLocalidad(idLocalidad)
- Obtiene calles de localidad
- OrderBy: nombre ASC
- Retorna: array

### getCallesByProvincia(idProvincia)
- Obtiene calles de provincia
- OrderBy: nombre ASC

### getCalleById(id)
- Obtiene calle específica

## BÚSQUEDAS

### buscarProvincia(query)
- Búsqueda por nombre (LIKE insensitive)

### buscarLocalidad(query, idProvincia?)
- Búsqueda por nombre
- Opcional: filtrar por provincia

### buscarCalle(query, idProvincia?, idLocalidad?)
- Búsqueda por nombre
- Opcional: filtrar por provincia o localidad

### getCallesAutocomplete(query, idLocalidad)
- Autocomplete para búsqueda de calles
- Retorna: [{id, nombre}] limitado a 10

---

## VALIDACIONES

- Provincia existe
- Localidad existe
- Calle existe
- Relaciones geográficas válidas

---

## NUEVAS CARACTERÍSTICAS

- [ ] Geocodificación (lat/long)
- [ ] Distancias entre direcciones
- [ ] Mapas interactivos
- [ ] Código postal automático
- [ ] Validación de direcciones
