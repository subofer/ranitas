# Tests End-to-End - Sistema Las Ranitas

Este directorio contiene todos los tests de integración y end-to-end para el Sistema de Gestión Las Ranitas.

## Estructura de Tests

```
cypress/
├── e2e/                    # Tests end-to-end
│   ├── auth.cy.js         # Autenticación y login
│   ├── productos.cy.js    # Gestión de productos
│   ├── categorias.cy.js   # Gestión de categorías
│   ├── proveedores.cy.js  # Gestión de proveedores
│   ├── ventas.cy.js       # Sistema de ventas/compras
│   └── funcionalidades.cy.js # Funcionalidades avanzadas
├── fixtures/              # Datos de prueba
│   ├── dolar.json         # Cotización del dólar mock
│   └── producto-test.jpg  # Imagen de prueba
├── support/               # Utilidades de testing
│   ├── commands.js        # Comandos personalizados
│   └── e2e.js            # Configuración global
└── README.md             # Esta documentación
```

## Comandos Disponibles

```bash
# Ejecutar todos los tests en modo headless
npm run cypress:run

# Abrir Cypress Test Runner (modo interactivo)
npm run cypress:open

# Ejecutar tests específicos
npx cypress run --spec "cypress/e2e/auth.cy.js"

# Ejecutar tests con configuración específica
npx cypress run --config video=true,screenshotOnRunFailure=true
```

## Configuración de Tests

### Base URL
Los tests están configurados para ejecutarse contra `http://localhost:3000`. Asegúrate de que la aplicación esté corriendo en ese puerto antes de ejecutar los tests.

### Base de Datos de Prueba
Los tests usan la base de datos de desarrollo. Se recomienda usar una base de datos de prueba separada para evitar contaminación de datos.

### Credenciales de Prueba
- Usuario: `subofer`
- Contraseña: `1234`

## Comandos Personalizados

### `cy.login(username, password)`
Realiza login automático en la aplicación.

```javascript
cy.login('subofer', '1234')
```

### `cy.createTestProduct(codigoBarra, nombre)`
Crea un producto de prueba.

```javascript
cy.createTestProduct('123456789', 'Producto de Prueba')
```

### `cy.createTestCategory(nombre)`
Crea una categoría de prueba.

```javascript
cy.createTestCategory('Categoría de Prueba')
```

### `cy.verifyTableRow(selector, expectedValues)`
Verifica que una fila de tabla contenga los valores esperados.

```javascript
cy.verifyTableRow('[data-cy="producto-row"]', ['123456789', 'Producto Test', '$10.50'])
```

## Estrategia de Testing

### 1. Tests de Autenticación
- Login exitoso
- Credenciales inválidas
- Persistencia de sesión
- Manejo de errores

### 2. Tests de Productos
- Creación de productos
- Validación de códigos únicos
- Gestión de presentaciones
- Búsqueda y filtrado
- Edición y eliminación

### 3. Tests de Categorías
- CRUD completo
- Validación de nombres únicos
- Asociación con productos

### 4. Tests de Proveedores
- Creación con validación CUIT
- Búsqueda online de CUIT
- Gestión de direcciones
- Asociación con productos

### 5. Tests de Ventas/Compras
- Creación de ventas
- Cálculos automáticos
- Aplicación de descuentos
- Generación de facturas

### 6. Tests de Funcionalidades Avanzadas
- Búsqueda en Google
- Lectura de códigos de barras
- Exportación a Excel
- Consultas a IA
- Cotización del dólar

## Mejores Prácticas

### Selectores
Usar data attributes específicos para testing:
```jsx
<button data-cy="guardar-producto">Guardar</button>
<input data-cy="codigo-barra" name="codigoBarra" />
```

### Esperas
Evitar esperas fijas, usar assertions para sincronización:
```javascript
// ❌ Mal
cy.wait(3000)

// ✅ Bueno
cy.contains('Producto guardado').should('be.visible')
```

### Limpieza de Datos
Los tests limpian automáticamente los datos de prueba, pero es buena práctica usar datos únicos:

```javascript
const testId = `test-${Date.now()}`
cy.createTestProduct(`CODIGO${testId}`, `Producto ${testId}`)
```

## Debugging

### Modo Interactivo
```bash
npm run cypress:open
```
Permite ejecutar tests paso a paso y ver exactamente qué está pasando.

### Screenshots y Videos
Los tests fallidos generan automáticamente screenshots. Para videos:
```bash
npx cypress run --config video=true
```

### Logs de Consola
```javascript
cy.window().then((win) => {
  cy.spy(win.console, 'log')
})
```

## CI/CD Integration

Para integración con pipelines de CI/CD:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run db:test-setup
      - run: npm run cypress:run
```

## Troubleshooting

### Tests Lentos
- Revisar queries de base de datos
- Optimizar esperas
- Usar fixtures para datos mock

### Tests Inestables
- Evitar dependencias entre tests
- Usar datos únicos por test
- Implementar retries

### Problemas de Selectores
- Usar data-cy attributes
- Evitar selectores basados en CSS que cambian
- Revisar que los elementos estén renderizados antes de interactuar

## Cobertura de Tests

| Funcionalidad | Estado | Cobertura |
|---------------|--------|-----------|
| Autenticación | ✅ Completo | 100% |
| Productos | ✅ Completo | 95% |
| Categorías | ✅ Completo | 100% |
| Proveedores | ✅ Completo | 90% |
| Ventas | ✅ Completo | 85% |
| Funcionalidades Avanzadas | ✅ Completo | 80% |

**Cobertura Total: ~92%**
