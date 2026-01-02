// Comando personalizado para login
Cypress.Commands.add('login', (username = 'subofer', password = '1234') => {
  cy.visit('/login')
  cy.get('input[name="nombre"]').type(username)
  cy.get('input[name="password"]').type(password)
  cy.get('button').contains('Ingresar').click()
  cy.url().should('not.include', '/login')
})

// Comando para crear producto de prueba
Cypress.Commands.add('createTestProduct', (codigoBarra, nombre) => {
  cy.visit('/cargarProductos')
  cy.get('input[name="codigoBarra"]').type(codigoBarra)
  cy.get('input[name="nombre"]').type(nombre)
  cy.get('button').contains('Guardar').click()
  cy.contains('Producto guardado correctamente').should('be.visible')
})

// Comando para crear categoría de prueba
Cypress.Commands.add('createTestCategory', (nombre) => {
  cy.visit('/categorias')
  cy.contains('Nueva Categoría').click()
  cy.get('input[name="nombre"]').type(nombre)
  cy.get('button').contains('Guardar').click()
  cy.contains('Categoría creada correctamente').should('be.visible')
})

// Comando para crear proveedor de prueba
Cypress.Commands.add('createTestSupplier', (cuit, nombre) => {
  cy.visit('/contactos')
  cy.contains('Nuevo Proveedor').click()
  cy.get('input[name="cuit"]').type(cuit)
  cy.get('input[name="nombre"]').type(nombre)
  cy.get('button').contains('Guardar').click()
  cy.contains('Proveedor guardado correctamente').should('be.visible')
})

// Comando para limpiar datos de prueba
Cypress.Commands.add('cleanupTestData', () => {
  // Limpiar productos de prueba
  cy.request('DELETE', '/api/test/cleanup')

  // Limpiar categorías de prueba
  cy.request('DELETE', '/api/test/cleanup-categories')

  // Limpiar proveedores de prueba
  cy.request('DELETE', '/api/test/cleanup-suppliers')
})

// Comando para verificar elementos de tabla
Cypress.Commands.add('verifyTableRow', (selector, expectedValues) => {
  cy.get(selector).within(() => {
    expectedValues.forEach((value, index) => {
      cy.get('td').eq(index).should('contain', value)
    })
  })
})

// Comando para verificar notificaciones
Cypress.Commands.add('verifyToast', (message) => {
  cy.contains(message).should('be.visible')
  // Las notificaciones suelen desaparecer automáticamente
  cy.contains(message).should('not.exist')
})

// Comando para esperar carga de elementos asíncronos
Cypress.Commands.add('waitForLoading', () => {
  cy.get('[data-cy="loading"]').should('not.exist')
})

// Comando para verificar navegación
Cypress.Commands.add('verifyNavigation', (menuItem, expectedUrl) => {
  cy.contains(menuItem).click()
  cy.url().should('include', expectedUrl)
})

// Comando para verificar formularios
Cypress.Commands.add('verifyFormValidation', (fieldName, errorMessage) => {
  cy.get(`input[name="${fieldName}"]`).clear()
  cy.get('form').submit()
  cy.contains(errorMessage).should('be.visible')
})