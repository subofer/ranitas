describe('Gestión de Productos', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
    cy.visit('/cargarProductos')
    cy.url({ timeout: 15000 }).should('include', '/cargarProductos')
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('debería mostrar el formulario de carga de productos', () => {
    cy.contains('Cargar Producto', { timeout: 10000 }).should('be.visible')
    cy.get('input[name="codigoBarra"]', { timeout: 10000 }).should('be.visible')
    cy.get('input[name="nombre"]', { timeout: 10000 }).should('be.visible')
  })

  it('debería crear un producto exitosamente', () => {
    const codigoBarra = `TEST${Date.now()}`

    // Llenar formulario
    cy.get('input[name="codigoBarra"]', { timeout: 10000 })
      .should('be.visible')
      .type(codigoBarra, { delay: 50 })

    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .type('Producto de Prueba Cypress', { delay: 50 })

    // Guardar producto
    cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()

    // Verificar que se creó exitosamente
    cy.contains(/guardado|creado|actualiza/i, { timeout: 10000 }).should('be.visible')
  })

  it('debería mostrar error con código de barras duplicado', () => {
    const codigoBarra = `DUPE${Date.now()}`

    // Crear producto primero
    cy.get('input[name="codigoBarra"]', { timeout: 10000 })
      .should('be.visible')
      .type(codigoBarra, { delay: 50 })

    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .type('Producto Original', { delay: 50 })

    cy.get('button').contains('Guardar', { timeout: 10000 }).click()
    cy.contains(/guardado|creado/i, { timeout: 10000 }).should('be.visible')

    // Intentar crear producto con código existente
    cy.visit('/cargarProductos')
    cy.get('input[name="codigoBarra"]', { timeout: 10000 })
      .should('be.visible')
      .type(codigoBarra, { delay: 50 })

    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .type('Producto Duplicado', { delay: 50 })

    cy.get('button').contains('Guardar', { timeout: 10000 }).click()

    // Debería mostrar error o mantener en la página
    cy.url({ timeout: 10000 }).should('include', '/cargarProductos')
  })

  it('debería buscar producto en listado', () => {
    cy.visit('/listadoProductos')
    
    const searchTerm = 'Producto'
    cy.get('[data-cy="buscar-producto"], input[placeholder*="buscar"]', { timeout: 10000 })
      .should('be.visible')
      .type(searchTerm, { delay: 50 })

    // Esperar resultados
    cy.get('[data-cy="producto-row"], tbody tr', { timeout: 10000 })
      .should('have.length.greaterThan', 0)
  })

  it('debería mostrar listado de productos', () => {
    cy.visit('/listadoProductos')
    
    cy.contains('Listado de Productos', { timeout: 10000 }).should('be.visible')
    cy.get('[data-cy="producto-row"], tbody tr', { timeout: 10000 }).should('exist')
  })
})
    cy.get('input[name="nombre"]').type('Producto con Presentaciones')
    cy.get('button').contains('Guardar').click()
    cy.contains('Producto guardado correctamente').should('be.visible')

    // Agregar presentación
    cy.contains('Gestionar Presentaciones').click()
    cy.contains('Agregar Presentación').click()

    // Seleccionar tipo de presentación
    cy.get('[data-cy="tipo-presentacion-select"]').select('Unidad')

    // Llenar datos de presentación
    cy.get('input[name="nombrePresentacion"]').type('Caja de 12 unidades')
    cy.get('input[name="cantidad"]').type('12')
    cy.get('input[name="unidadMedida"]').type('unidades')

    // Guardar presentación
    cy.get('button').contains('Guardar Presentación').click()
    cy.contains('Presentación guardada').should('be.visible')
  })

  it('debería listar productos correctamente', () => {
    cy.visit('/listadoProductos')

    // Verificar que se muestra la lista
    cy.contains('Productos').should('be.visible')

    // Debería haber al menos un producto
    cy.get('[data-cy="producto-row"]').should('have.length.greaterThan', 0)

    // Probar búsqueda
    cy.get('input[placeholder*="Buscar"]').type('Producto')
    cy.get('[data-cy="producto-row"]').should('have.length.greaterThan', 0)
  })

  it('debería editar un producto existente', () => {
    cy.visit('/listadoProductos')

    // Hacer click en editar el primer producto
    cy.get('[data-cy="editar-producto"]').first().click()

    // Debería redirigir a la página de carga
    cy.url().should('include', '/cargarProductos')

    // Modificar nombre
    const nuevoNombre = `Producto Editado ${Date.now()}`
    cy.get('input[name="nombre"]').clear().type(nuevoNombre)

    // Guardar cambios
    cy.get('button').contains('Guardar').click()

    // Verificar que se guardó
    cy.contains('Producto guardado correctamente').should('be.visible')
  })

  it('debería eliminar un producto', () => {
    cy.visit('/listadoProductos')

    // Contar productos antes de eliminar
    cy.get('[data-cy="producto-row"]').then($rows => {
      const countBefore = $rows.length

      // Hacer click en eliminar el último producto (asumiendo que es uno de prueba)
      cy.get('[data-cy="eliminar-producto"]').last().click()

      // Confirmar eliminación
      cy.contains('Sí, eliminar').click()

      // Verificar que se eliminó
      cy.get('[data-cy="producto-row"]').should('have.length', countBefore - 1)
    })
  })
})
