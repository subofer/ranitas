# 📋 GUÍA COMPLETA DE TESTS CON CYPRESS

## 📊 Resumen de la Suite de Tests

La suite completa de tests cubre **20 categorías principales** con más de **150+ casos de prueba** que incluyen:

```
✅ 1.  Autenticación y Sesión (6 tests)
✅ 2.  Gestión de Categorías (7 tests)
✅ 3.  Gestión de Productos (9 tests)
✅ 4.  Gestión de Contactos (10 tests)
✅ 5.  Ventas y Punto de Venta (7 tests)
✅ 6.  Compras y Pedidos (7 tests)
✅ 7.  Facturas y Documentos (7 tests)
✅ 8.  Control de Stock (4 tests)
✅ 9.  Gestión de Unidades (3 tests)
✅ 10. Dashboard y Reportes (9 tests)
✅ 11. Búsqueda en Google (3 tests)
✅ 12. Captura con Cámara (2 tests)
✅ 13. Excel y Exportación (3 tests)
✅ 14. Consultas a IA (3 tests)
✅ 15. Navegación General (3 tests)
✅ 16. Flujos Completos E2E (2 tests)
✅ 17. Manejo de Errores (5 tests)
✅ 18. Rendimiento y Carga (3 tests)
✅ 19. Seguridad (3 tests)
✅ 20. Responsive y Compatibilidad (5 tests)
```

---

## 🚀 INSTALACIÓN Y CONFIGURACIÓN

### 1. Requisitos previos
```bash
# Node.js >= 18
# npm >= 9
```

### 2. Instalar Cypress (ya debería estar instalado)
```bash
npm install cypress --save-dev
```

### 3. Inicializar base de datos
```bash
npm run db:up        # Inicia PostgreSQL en Docker
npm run prisma:gen  # Genera cliente de Prisma
npm run seed        # Carga datos iniciales
```

### 4. Iniciar servidor de desarrollo
```bash
npm run dev
```

---

## 🎯 EJECUTAR LOS TESTS

### Abrir Cypress en modo interactivo
```bash
npm run cypress:open
```
O directamente:
```bash
npx cypress open
```

Esto abre el **Cypress Test Runner** donde puedes:
- Ver todos los tests en la lista
- Ejecutar tests individuales
- Ver ejecución en tiempo real
- Hacer debugging interactivo

### Ejecutar todos los tests en línea de comandos
```bash
npm run cypress:run
```

### Ejecutar un archivo de test específico
```bash
npx cypress run --spec "cypress/e2e/suite-completa.cy.js"
```

### Ejecutar un test específico (por nombre)
```bash
npx cypress run --spec "cypress/e2e/suite-completa.cy.js" --env grep="debería hacer login"
```

### Ejecutar en browser específico
```bash
# Chrome
npx cypress run --browser chrome

# Firefox
npx cypress run --browser firefox

# Edge
npx cypress run --browser edge
```

### Ejecutar tests en headless mode (sin UI)
```bash
npx cypress run --headless
```

### Ejecutar con video grabado
```bash
npx cypress run --record
```

---

## 🎮 COMANDOS PERSONALIZADOS DISPONIBLES

### Autenticación
```javascript
// Login simple
cy.login('subofer', '1234')

// Login y navegar a ruta
cy.loginAndVisit('/categorias')

// Logout
cy.logout()
```

### Categorías
```javascript
// Crear categoría
cy.createCategory('Mi Categoría')

// Editar categoría
cy.editCategory('Categoría Vieja', 'Categoría Nueva')

// Eliminar categoría
cy.deleteCategory('Mi Categoría')
```

### Productos
```javascript
// Crear producto
cy.createProduct('123456789', 'Mi Producto')

// Buscar producto
cy.searchProduct('termino')

// Editar producto
cy.editProduct('123456789', 'Nombre Nuevo')
```

### Contactos
```javascript
// Crear contacto
cy.createContact('Nombre', '20123456789', 'Proveedor')

// Buscar contacto
cy.searchContact('termino')

// Editar contacto
cy.editContact('Nombre Viejo', 'Nombre Nuevo')

// Agregar email
cy.addEmailToContact('Nombre', 'email@example.com')
```

### Ventas
```javascript
// Agregar al carrito
cy.addToCart('123456789', 2)

// Completar venta
cy.completeSale('123456789', 2, 'Cliente', 'EFECTIVO')
```

### Pedidos
```javascript
// Crear pedido
cy.createPurchaseOrder('Proveedor', '123456789', 10)

// Cambiar estado
cy.changePurchaseOrderStatus('RECIBIDO')
```

### Facturas
```javascript
// Crear factura
cy.createInvoice('Cliente', '123456789', 5, 'EFECTIVO')
```

### Utilidades
```javascript
// Esperar elemento
cy.waitAndCheck('[data-cy="elemento"]')

// Seleccionar dropdown
cy.selectDropdown('tipo-select', 'opcion')

// Rellenar input
cy.fillInput('nombre', 'valor')

// Click por data-cy
cy.clickByCy('boton-guardar')

// Verificar texto
cy.shouldContainText('Texto esperado')
```

---

## 📝 ESTRUCTURA DE TESTS

### Ejemplo simple
```javascript
describe('Gestión de Categorías', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
    cy.visit('/categorias')
  })

  it('debería crear una nueva categoría', () => {
    cy.contains('Nueva Categoría').click()
    cy.get('input[name="nombre"]').type('Test')
    cy.get('button').contains('Guardar').click()
    cy.contains(/creada|guardada/i).should('be.visible')
  })
})
```

### Ejemplo avanzado con flujo completo
```javascript
describe('Flujo de venta completa', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
  })

  it('debería completar venta de principio a fin', () => {
    // 1. Crear producto
    cy.createProduct('123456789', 'Producto Test')
    
    // 2. Vender
    cy.completeSale('123456789', 2, 'Cliente', 'EFECTIVO')
    
    // 3. Verificar factura
    cy.visit('/facturas')
    cy.get('[data-cy="factura-row"]').first().should('be.visible')
  })
})
```

---

## 🔍 ASSERTIONS COMUNES

```javascript
// Verificar visibilidad
cy.get('[data-cy="elemento"]').should('be.visible')

// Verificar texto
cy.contains('Texto').should('exist')

// Verificar URL
cy.url().should('include', '/categorias')

// Verificar cantidad de elementos
cy.get('[data-cy="fila"]').should('have.length.greaterThan', 0)

// Verificar valor de input
cy.get('input[name="nombre"]').should('have.value', 'test')

// Verificar atributo
cy.get('a').should('have.attr', 'href', '/ruta')

// Verificar clase
cy.get('.elemento').should('have.class', 'activo')

// Verificar contenido
cy.get('table').should('contain', 'Valor')
```

---

## 🐛 DEBUGGING

### Usar .debug() para ver estado
```javascript
cy.get('[data-cy="elemento"]')
  .debug()
  .click()
```

### Ver todo lo que está en el DOM
```javascript
cy.get('body').debug()
```

### Pausa en un punto
```javascript
cy.pause()
cy.get('[data-cy="elemento"]').click()
cy.pause()
```

### Ver logs en consola
```javascript
cy.log('Mi mensaje de debug')
```

### Inspeccionar elemento
```javascript
cy.get('[data-cy="elemento"]').then(($el) => {
  console.log($el.text())
  console.log($el.attr('class'))
})
```

---

## ⚙️ CONFIGURACIÓN AVANZADA

### cypress.config.js (ya configurado)
```javascript
{
  baseUrl: 'http://localhost:3000',
  viewportWidth: 1280,
  viewportHeight: 720,
  defaultCommandTimeout: 10000,
  requestTimeout: 15000,
  retries: { runMode: 2, openMode: 0 },
  video: false,
  screenshotOnRunFailure: true
}
```

### Variables de entorno
```bash
# Crear archivo cypress.env.json
{
  "USERNAME": "subofer",
  "PASSWORD": "1234",
  "BASE_URL": "http://localhost:3000"
}
```

Usar en tests:
```javascript
const username = Cypress.env('USERNAME')
cy.login(username, Cypress.env('PASSWORD'))
```

---

## 🎬 FIXTURES (DATOS DE PRUEBA)

Archivo: `cypress/fixtures/testdata.json`

```json
{
  "usuario": { "nombre": "subofer", "password": "1234" },
  "productos": [{ "codigoBarra": "123", "nombre": "Producto" }]
}
```

Usar en tests:
```javascript
cy.fixture('testdata').then((data) => {
  cy.login(data.usuario.nombre, data.usuario.password)
})
```

---

## 🚦 EJECUTAR EN CI/CD (GitHub Actions)

Archivo: `.github/workflows/cypress.yml`

```yaml
name: Cypress Tests
on: [push, pull_request]
jobs:
  cypress-run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run db:up
      - run: npm run dev &
      - run: npx cypress run
```

---

## 📊 REPORTE DE COBERTURA

Para generar reportes:

```bash
# Instalar dependencia
npm install --save-dev @cypress/schematic

# Ejecutar con reporte
npx cypress run --reporter json --reporter-options outputFile=cypress-report.json
```

Instalar cypress-mochawesome para reportes HTML:
```bash
npm install --save-dev cypress-mochawesome-reporter

# En cypress/support/e2e.js:
import 'cypress-mochawesome-reporter/register'
```

---

## ✅ MEJORES PRÁCTICAS

### 1. **Usar data-cy en lugar de selectores complejos**
```javascript
// ✅ BIEN
cy.get('[data-cy="boton-guardar"]').click()

// ❌ MAL
cy.get('button.btn-primary:nth-child(2)').click()
```

### 2. **Evitar hardcodes de espera (use .should())**
```javascript
// ✅ BIEN
cy.get('[data-cy="elemento"]').should('be.visible')

// ❌ MAL
cy.wait(2000)
cy.get('[data-cy="elemento"]')
```

### 3. **Reutilizar custom commands**
```javascript
// ✅ BIEN
cy.login('user', 'pass')
cy.createCategory('Mi Cat')

// ❌ MAL
cy.visit('/login')
cy.get('input').type('user')
// ... repetir código
```

### 4. **Usar beforeEach para setup común**
```javascript
// ✅ BIEN
describe('Suite', () => {
  beforeEach(() => {
    cy.login('user', 'pass')
  })
  
  it('test 1', () => { /* ... */ })
  it('test 2', () => { /* ... */ })
})

// ❌ MAL
describe('Suite', () => {
  it('test 1', () => {
    cy.login('user', 'pass')
    // test...
  })
})
```

### 5. **Naming descriptivo en tests**
```javascript
// ✅ BIEN
it('debería crear una categoría y verificar que aparece en la lista', () => {})

// ❌ MAL
it('test 1', () => {})
```

---

## 🎯 CHECKLIST ANTES DE COMMIT

- [ ] Todos los tests pasan localmente
- [ ] No hay console.log() de debug
- [ ] Se usan data-cy en selectores
- [ ] Los tests son independientes (no dependen uno de otro)
- [ ] Se limpian datos de prueba después
- [ ] Timeout es apropiado (no muy corto ni muy largo)
- [ ] Mensajes de error son claros

---

## 🆘 TROUBLESHOOTING

### Tests fallan aleatoriamente
```javascript
// Aumentar timeout
cy.get('[data-cy="elemento"]', { timeout: 15000 })

// Esperar elemento específico
cy.get('[data-cy="loader"]').should('not.exist')
cy.get('[data-cy="contenido"]').should('be.visible')
```

### "Element not found" error
```javascript
// Verificar que el elemento existe
cy.get('[data-cy="elemento"]').debug()

// Scroll hasta elemento
cy.get('[data-cy="elemento"]').scrollIntoView().click()
```

### Tests fallan en CI pero pasan localmente
```javascript
// Agregar waits para operaciones asincrónicas
cy.intercept('POST', '/api/login').as('loginRequest')
cy.get('button').click()
cy.wait('@loginRequest')
```

### Timeout en servidor
```javascript
// Aumentar timeout global en cypress.config.js
defaultCommandTimeout: 20000
requestTimeout: 20000
```

---

## 📚 RECURSOS ADICIONALES

- [Documentación oficial de Cypress](https://docs.cypress.io)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [API Reference](https://docs.cypress.io/api/table-of-contents)
- [Debugging Guide](https://docs.cypress.io/guides/guides/debugging)

---

## 📞 CONTACTO Y SOPORTE

Para reportar problemas con los tests:
1. Ejecuta `npm run cypress:open` y reproduce el error
2. Revisa los logs en `cypress/logs/`
3. Abre un issue con screenshot/video del problema
