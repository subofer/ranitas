// ============= AUTENTICACIÓN =============

// Login mejorado y robusto - Cypress
// NOTA: Los inputs tienen position: fixed y están cubiertos por el label flotante
// Por eso se usa force: true en lugar de verificar que sea visible
Cypress.Commands.add('login', (username = 'subofer', password = '1234') => {
  cy.visit('/login', { onBeforeLoad: (win) => { win.localStorage.clear() } })
  cy.url({ timeout: 15000 }).should('include', '/login')
  
  // Esperar a que la forma esté completamente cargada
  cy.get('form', { timeout: 15000 }).should('exist')
  
  // Obtener el input de nombre por ID
  // Usa force: true porque el label flotante cubre el elemento (position: fixed)
  cy.get('#nombre', { timeout: 15000 })
    .should('exist')
    .click({ force: true })
    .clear({ force: true })
    .type(username, { delay: 100, force: true })
    .invoke('val')
    .should('equal', username)
  
  // Esperar un momento para que React procese
  cy.wait(300)
  
  // Obtener el input de contraseña por ID
  cy.get('#password', { timeout: 15000 })
    .should('exist')
    .click({ force: true })
    .clear({ force: true })
    .type(password, { delay: 100, force: true })
    .invoke('val')
    .should('equal', password)
  
  // Esperar un momento para que React procese
  cy.wait(300)
  
  // Esperar a que el botón esté disponible y hacer click
  cy.get('button', { timeout: 10000 })
    .contains('Ingresar')
    .click({ force: true })
  
  // Esperar a que se redirige (puede tardar más con el delay de 100ms)
  cy.url({ timeout: 20000 }).should('not.include', '/login')
})

// Logout mejorado
Cypress.Commands.add('logout', () => {
  // Primero intentar encontrar el menú de usuario y hacer click
  cy.get('.relative', { timeout: 5000 }).then(($relatives) => {
    // Buscar el elemento que tiene "Salir" en su texto
    let found = false
    for (let el of $relatives) {
      if (el.textContent.includes('Salir')) {
        cy.wrap(el).click({ force: true })
        cy.wait(500)
        // Luego buscar el enlace Salir dentro del menú abierto
        cy.wrap(el).find('li').then(($li) => {
          if ($li.length > 0) {
            cy.wrap($li).first().click({ force: true })
            found = true
          }
        })
        break
      }
    }
  })
  
  // Siempre limpiar el storage para estar seguros
  cy.window().then((win) => {
    win.localStorage.clear()
    win.sessionStorage.clear()
  })
  
  // Navegar a login
  cy.visit('/login')
  cy.url({ timeout: 10000 }).should('include', '/login')
})

// Login y navegar
Cypress.Commands.add('loginAndVisit', (path, username = 'subofer', password = '1234') => {
  cy.login(username, password)
  cy.visit(path)
})

// ============= CATEGORÍAS =============

// Crear categoría mejorada
Cypress.Commands.add('createCategory', (nombre) => {
  cy.visit('/categorias')
  cy.contains('Nueva Categoría', { timeout: 10000 }).should('be.visible').click()
  
  cy.get('input[name="nombre"]', { timeout: 10000 })
    .should('be.visible')
    .type(nombre, { delay: 50 })
  
  cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()
  cy.contains(/creada|guardada|actualiza/i, { timeout: 10000 }).should('be.visible')
})

// Editar categoría
Cypress.Commands.add('editCategory', (nombreActual, nombreNuevo) => {
  cy.visit('/categorias')
  
  cy.get('[data-cy="editar-categoria"]', { timeout: 10000 })
    .should('have.length.greaterThan', 0)
    .first()
    .click()
  
  cy.get('input[name="nombre"]', { timeout: 10000 })
    .should('be.visible')
    .clear()
    .type(nombreNuevo, { delay: 50 })
  
  cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()
  cy.contains(/actualiza|guarda|creada/i, { timeout: 10000 }).should('be.visible')
})

// Eliminar categoría
Cypress.Commands.add('deleteCategory', (nombre) => {
  cy.visit('/categorias')
  
  cy.get('[data-cy="eliminar-categoria"]', { timeout: 10000 })
    .should('have.length.greaterThan', 0)
    .first()
    .click()
  
  // Confirmar eliminación
  cy.contains('Sí', { timeout: 10000 }).should('be.visible').click()
  cy.contains(/eliminada|borrada|eliminado/i, { timeout: 10000 }).should('be.visible')
})

// ============= PRODUCTOS =============

// Crear producto mejorada
Cypress.Commands.add('createProduct', (codigoBarra, nombre, categoria = null) => {
  cy.visit('/cargarProductos')
  
  cy.get('input[name="codigoBarra"]', { timeout: 10000 })
    .should('be.visible')
    .type(codigoBarra, { delay: 50 })
  
  cy.get('input[name="nombre"]', { timeout: 10000 })
    .should('be.visible')
    .type(nombre, { delay: 50 })
  
  if (categoria) {
    cy.contains('Seleccionar Categorías', { timeout: 10000 }).click()
    cy.contains(categoria, { timeout: 10000 }).click()
  }
  
  cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()
  cy.contains(/guardado|creado|actualiza/i, { timeout: 10000 }).should('be.visible')
})

// Buscar producto
Cypress.Commands.add('searchProduct', (termino) => {
  cy.visit('/listadoProductos')
  
  cy.get('[data-cy="buscar-producto"], input[placeholder*="buscar"]', { timeout: 10000 })
    .should('be.visible')
    .type(termino, { delay: 50 })
  
  cy.get('[data-cy="producto-row"], tbody tr', { timeout: 10000 })
    .should('have.length.greaterThan', 0)
})

// Editar producto
Cypress.Commands.add('editProduct', (codigoBarra, nombreNuevo) => {
  cy.visit('/listadoProductos')
  
  cy.get('[data-cy="editar-producto"]', { timeout: 10000 })
    .should('have.length.greaterThan', 0)
    .first()
    .click()
  
  cy.get('input[name="nombre"]', { timeout: 10000 })
    .should('be.visible')
    .clear()
    .type(nombreNuevo, { delay: 50 })
  
  cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()
  cy.contains(/actualiza|guarda|creada/i, { timeout: 10000 }).should('be.visible')
})

// ============= CONTACTOS =============

// Crear contacto/proveedor
Cypress.Commands.add('createContact', (nombre, cuit, tipo = 'Proveedor') => {
  cy.visit('/contactos')
  cy.contains('Nuevo Contacto', { timeout: 10000 }).should('be.visible').click()
  
  cy.get('input[name="nombre"]', { timeout: 10000 })
    .should('be.visible')
    .type(nombre, { delay: 50 })
  
  cy.get('input[name="cuit"]', { timeout: 10000 })
    .should('be.visible')
    .type(cuit, { delay: 50 })
  
  cy.get('[data-cy="tipo-select"], select', { timeout: 10000 })
    .first()
    .select(tipo)
  
  cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()
  cy.contains(/guardado|creado|actualiza/i, { timeout: 10000 }).should('be.visible')
})

// Buscar contacto
Cypress.Commands.add('searchContact', (termino) => {
  cy.visit('/contactos')
  
  cy.get('[data-cy="buscar-contacto"], input[placeholder*="buscar"]', { timeout: 10000 })
    .should('be.visible')
    .type(termino, { delay: 50 })
  
  cy.get('[data-cy="contacto-row"], tbody tr', { timeout: 10000 })
    .should('have.length.greaterThan', 0)
})

// Editar contacto
Cypress.Commands.add('editContact', (nombreActual, nombreNuevo) => {
  cy.visit('/contactos')
  
  cy.get('[data-cy="editar-contacto"]', { timeout: 10000 })
    .should('have.length.greaterThan', 0)
    .first()
    .click()
  
  cy.get('input[name="nombre"]', { timeout: 10000 })
    .should('be.visible')
    .clear()
    .type(nombreNuevo, { delay: 50 })
  
  cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()
  cy.contains(/actualiza|guarda|creada/i, { timeout: 10000 }).should('be.visible')
})

// ============= VENTAS =============

// Agregar producto al carrito
Cypress.Commands.add('addToCart', (codigoBarras, cantidad) => {
  cy.visit('/venta')
  
  cy.get('[data-cy="buscar-producto"], input[placeholder*="código"]', { timeout: 10000 })
    .should('be.visible')
    .type(codigoBarras, { delay: 50 })
  
  cy.get('[data-cy="producto-resultado"]', { timeout: 10000 })
    .should('have.length.greaterThan', 0)
    .first()
    .click()
  
  cy.get('[data-cy="cantidad"], input[name="cantidad"]', { timeout: 10000 })
    .should('be.visible')
    .type(cantidad, { delay: 50 })
  
  cy.get('button').contains('Agregar', { timeout: 10000 }).should('be.visible').click()
})

// Completar venta
Cypress.Commands.add('completeSale', (codigoBarras, cantidad, cliente = null, formaPago = 'EFECTIVO') => {
  cy.addToCart(codigoBarras, cantidad)
  
  if (cliente) {
    cy.get('[data-cy="seleccionar-cliente"]', { timeout: 10000 }).click()
    cy.contains(cliente, { timeout: 10000 }).click()
  }
  
  cy.get('[data-cy="forma-pago"]', { timeout: 10000 }).select(formaPago)
  cy.get('button').contains('Finalizar Venta', { timeout: 10000 }).should('be.visible').click()
  cy.contains(/venta|factura|creada|guardada/i, { timeout: 10000 }).should('be.visible')
})

// ============= PEDIDOS =============

// Crear pedido
Cypress.Commands.add('createPurchaseOrder', (proveedor, codigoBarras, cantidad) => {
  cy.visit('/pedidos')
  cy.contains('Nuevo Pedido', { timeout: 10000 }).should('be.visible').click()
  
  cy.get('[data-cy="seleccionar-proveedor"]', { timeout: 10000 })
    .should('be.visible')
    .click()
  cy.contains(proveedor, { timeout: 10000 }).click()
  
  cy.get('[data-cy="buscar-producto"]', { timeout: 10000 })
    .should('be.visible')
    .type(codigoBarras, { delay: 50 })
  
  cy.get('[data-cy="producto-resultado"]', { timeout: 10000 })
    .should('have.length.greaterThan', 0)
    .first()
    .click()
  
  cy.get('[data-cy="cantidad"]', { timeout: 10000 }).type(cantidad, { delay: 50 })
  cy.get('button').contains('Agregar', { timeout: 10000 }).should('be.visible').click()
  cy.get('button').contains('Crear Pedido', { timeout: 10000 }).should('be.visible').click()
  
  cy.contains(/pedido|creado|guardado|actualiza/i, { timeout: 10000 }).should('be.visible')
})

// ============= UTILIDADES GENERALES =============

// Esperar a elemento
Cypress.Commands.add('waitForElement', (selector, timeout = 15000) => {
  cy.get(selector, { timeout }).should('exist')
})

// Verificar visibilidad
Cypress.Commands.add('shouldBeVisible', (selector, timeout = 15000) => {
  cy.get(selector, { timeout }).should('be.visible')
})

// Rellenar input por name (más robusto con componentes custom)
Cypress.Commands.add('fillInput', (name, value) => {
  cy.get(`#${name}, input[name="${name}"]`, { timeout: 10000 })
    .should('be.visible')
    .click({ force: true })
    .focus()
    .clear({ force: true })
    .type(value, { delay: 100, force: true })
    .should('have.value', value)
  cy.wait(300)  // Esperar a que React procese
})

// Click por data-cy
Cypress.Commands.add('clickByCy', (dataCy) => {
  cy.get(`[data-cy="${dataCy}"]`, { timeout: 10000 })
    .should('be.visible')
    .click()
})

// Verificar texto visible
Cypress.Commands.add('shouldContainText', (text, timeout = 10000) => {
  cy.contains(text, { timeout }).should('be.visible')
})

// Verificar tabla
Cypress.Commands.add('verifyTableRow', (selector, expectedValues) => {
  cy.get(selector, { timeout: 10000 }).within(() => {
    expectedValues.forEach((value, index) => {
      cy.get('td').eq(index).should('contain', value)
    })
  })
})

// Esperar carga
Cypress.Commands.add('waitForLoading', () => {
  cy.get('[data-cy="loading"], .loader, .spinner', { timeout: 15000 }).should('not.exist')
})

// Verificar navegación
Cypress.Commands.add('verifyNavigation', (menuItem, expectedUrl) => {
  cy.contains(menuItem, { timeout: 10000 }).should('be.visible').click()
  cy.url({ timeout: 15000 }).should('include', expectedUrl)
})

// Validación de formulario
Cypress.Commands.add('verifyFormValidation', (fieldName, errorMessage) => {
  cy.get(`input[name="${fieldName}"]`, { timeout: 10000 }).clear()
  cy.get('form', { timeout: 10000 }).submit()
  cy.contains(errorMessage, { timeout: 10000 }).should('be.visible')
})

// Limpiar datos de prueba
Cypress.Commands.add('cleanupTestData', () => {
  cy.request({
    method: 'DELETE',
    url: '/api/test/cleanup',
    failOnStatusCode: false
  }).then((res) => {
    cy.log('✅ Test data cleaned up')
  })
})

// Verificar notificación/toast
Cypress.Commands.add('verifyToast', (message, timeout = 8000) => {
  cy.contains(message, { timeout }).should('be.visible')
  cy.contains(message, { timeout: 500 }).should('not.exist')
})