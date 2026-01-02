describe('Gestión de Productos', () => {
  beforeEach(() => {
    // Login antes de cada test
    cy.login('subofer', '1234')
    cy.visit('/cargarProductos')
  })

  it('debería mostrar el formulario de carga de productos', () => {
    cy.contains('Cargar Producto').should('be.visible')
    cy.get('input[name="codigoBarra"]').should('be.visible')
    cy.get('input[name="nombre"]').should('be.visible')
  })

  it('debería crear un producto exitosamente', () => {
    const codigoBarra = `TEST${Date.now()}`

    // Llenar formulario
    cy.get('input[name="codigoBarra"]').type(codigoBarra)
    cy.get('input[name="nombre"]').type('Producto de Prueba Cypress')

    // Seleccionar categoría
    cy.contains('Seleccionar Categorías').click()
    cy.get('[data-cy="categoria-option"]').first().click()

    // Seleccionar proveedor
    cy.contains('Seleccionar Proveedores').click()
    cy.get('[data-cy="proveedor-option"]').first().click()

    // Guardar producto
    cy.get('button').contains('Guardar').click()

    // Verificar que se creó exitosamente
    cy.contains('Producto guardado correctamente').should('be.visible')
  })

  it('debería mostrar error con código de barras duplicado', () => {
    // Intentar crear producto con código existente
    cy.get('input[name="codigoBarra"]').type('7790070410137') // Código que ya existe
    cy.get('input[name="nombre"]').type('Producto Duplicado')
    cy.get('button').contains('Guardar').click()

    // Debería mostrar error
    cy.contains('Código de barras ya existe').should('be.visible')
  })

  it('debería gestionar presentaciones del producto', () => {
    const codigoBarra = `TEST${Date.now()}`

    // Crear producto primero
    cy.get('input[name="codigoBarra"]').type(codigoBarra)
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
