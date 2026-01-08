describe('Sistema de Ventas', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
    cy.visit('/venta')
    cy.url({ timeout: 15000 }).should('include', '/venta')
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('debería mostrar la página de ventas', () => {
    cy.contains('Venta', { timeout: 10000 }).should('exist')
  })

  it('debería mostrar formulario de venta', () => {
    cy.get('[data-cy="buscar-producto"], input[placeholder*="buscar"]', { timeout: 10000 })
      .should('exist')
  })

  it('debería permitir buscar productos', () => {
    cy.get('[data-cy="buscar-producto"], input[placeholder*="buscar"]', { timeout: 10000 })
      .should('be.visible')
      .type('producto', { delay: 50 })
  })

  it('debería mostrar carrito de venta', () => {
    cy.get('[data-cy="carrito"], .cart, table', { timeout: 10000 })
      .should('exist')
  })

  it('debería permitir ingresar cantidad de producto', () => {
    cy.get('[data-cy="cantidad"], input[name="cantidad"], input[placeholder*="cantidad"]', { timeout: 10000 })
      .should('exist')
      .type('1', { delay: 50 })
  })

  it('debería mostrar opciones de forma de pago', () => {
    cy.get('[data-cy="forma-pago"], select, input[name*="pago"]', { timeout: 10000 })
      .should('exist')
  })

  it('debería tener botón para completar venta', () => {
    cy.get('button').contains(/Vender|Finalizar|Completar|Guardar/, { timeout: 10000 })
      .should('exist')
  })
})
    cy.contains('Descuento aplicado').should('be.visible')
  })

  it('debería registrar compras de proveedores', () => {
    cy.visit('/compras')

    // Seleccionar proveedor
    cy.contains('Seleccionar Proveedor').click()
    cy.get('[data-cy="proveedor-option"]').first().click()

    // Agregar productos a la compra
    cy.contains('Agregar Producto').click()

    // Buscar y seleccionar producto
    cy.get('[data-cy="producto-search"]').type('Producto')
    cy.get('[data-cy="producto-option"]').first().click()

    // Ingresar cantidad y precio
    cy.get('input[name="cantidad"]').type('10')
    cy.get('input[name="precioUnitario"]').type('100.50')

    cy.contains('Agregar').click()

    // Procesar compra
    cy.contains('Procesar Compra').click()

    // Verificar que se registró
    cy.contains('Compra registrada').should('be.visible')
  })

  it('debería generar facturas automáticamente', () => {
    cy.visit('/venta')

    // Completar una venta
    cy.contains('Seleccionar Cliente').click()
    cy.get('[data-cy="cliente-option"]').first().click()

    cy.contains('Agregar Producto').click()
    cy.get('[data-cy="producto-search"]').type('Producto')
    cy.get('[data-cy="producto-option"]').first().click()
    cy.get('input[name="cantidad"]').type('1')
    cy.contains('Agregar').click()

    cy.contains('Procesar Venta').click()

    // Verificar que se generó factura
    cy.contains('Factura generada').should('be.visible')
    cy.contains('N° de factura').should('be.visible')
  })
})
