describe('Sistema de Ventas y Compras', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
  })

  it('debería mostrar la página de ventas', () => {
    cy.visit('/venta')
    cy.contains('Sistema de Ventas').should('be.visible')
  })

  it('debería crear una nueva venta', () => {
    cy.visit('/venta')

    // Seleccionar cliente
    cy.contains('Seleccionar Cliente').click()
    cy.get('[data-cy="cliente-option"]').first().click()

    // Agregar producto a la venta
    cy.contains('Agregar Producto').click()
    cy.get('[data-cy="producto-search"]').type('Producto')

    // Seleccionar primer producto encontrado
    cy.get('[data-cy="producto-option"]').first().click()

    // Ingresar cantidad
    cy.get('input[name="cantidad"]').type('2')

    // Agregar a la venta
    cy.contains('Agregar').click()

    // Verificar que se agregó
    cy.contains('Producto agregado').should('be.visible')

    // Procesar venta
    cy.contains('Procesar Venta').click()

    // Verificar que se completó
    cy.contains('Venta completada').should('be.visible')
  })

  it('debería calcular totales correctamente', () => {
    cy.visit('/venta')

    // Agregar múltiples productos
    cy.contains('Agregar Producto').click()

    // Producto 1
    cy.get('[data-cy="producto-search"]').first().type('Producto')
    cy.get('[data-cy="producto-option"]').first().click()
    cy.get('input[name="cantidad"]').first().type('1')
    cy.contains('Agregar').first().click()

    // Producto 2
    cy.contains('Agregar Producto').click()
    cy.get('[data-cy="producto-search"]').last().type('Producto')
    cy.get('[data-cy="producto-option"]').first().click()
    cy.get('input[name="cantidad"]').last().type('1')
    cy.contains('Agregar').last().click()

    // Verificar que el total se calcula
    cy.get('[data-cy="total-venta"]').should('contain', '$')
    cy.get('[data-cy="total-venta"]').invoke('text').should('match', /\$\d+\.\d{2}/)
  })

  it('debería aplicar descuentos', () => {
    cy.visit('/venta')

    // Agregar producto
    cy.contains('Agregar Producto').click()
    cy.get('[data-cy="producto-search"]').type('Producto')
    cy.get('[data-cy="producto-option"]').first().click()
    cy.get('input[name="cantidad"]').type('1')
    cy.contains('Agregar').click()

    // Aplicar descuento
    cy.contains('Aplicar Descuento').click()
    cy.get('input[name="descuento"]').type('10') // 10%
    cy.contains('Aplicar').click()

    // Verificar que el descuento se aplicó
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
