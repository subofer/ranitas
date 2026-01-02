describe('Gestión de Categorías', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
  })

  it('debería mostrar la lista de categorías', () => {
    cy.visit('/categorias')
    cy.contains('Categorías').should('be.visible')
    cy.get('[data-cy="categoria-row"]').should('be.visible')
  })

  it('debería crear una nueva categoría', () => {
    cy.visit('/categorias')

    // Hacer click en agregar nueva categoría
    cy.contains('Nueva Categoría').click()

    const nombreCategoria = `Categoría Test ${Date.now()}`

    // Llenar formulario
    cy.get('input[name="nombre"]').type(nombreCategoria)

    // Guardar
    cy.get('button').contains('Guardar').click()

    // Verificar que se creó
    cy.contains('Categoría creada correctamente').should('be.visible')
    cy.contains(nombreCategoria).should('be.visible')
  })

  it('debería mostrar error con nombre duplicado', () => {
    cy.visit('/categorias')
    cy.contains('Nueva Categoría').click()

    // Intentar crear categoría con nombre existente
    cy.get('input[name="nombre"]').type('Alimentos') // Categoría que ya existe
    cy.get('button').contains('Guardar').click()

    cy.contains('Categoría ya existe').should('be.visible')
  })

  it('debería editar una categoría existente', () => {
    cy.visit('/categorias')

    // Hacer click en editar la primera categoría
    cy.get('[data-cy="editar-categoria"]').first().click()

    const nuevoNombre = `Categoría Editada ${Date.now()}`
    cy.get('input[name="nombre"]').clear().type(nuevoNombre)
    cy.get('button').contains('Guardar').click()

    cy.contains('Categoría actualizada').should('be.visible')
  })

  it('debería eliminar una categoría', () => {
    // Crear categoría de prueba primero
    cy.visit('/categorias')
    cy.contains('Nueva Categoría').click()
    const nombreTest = `Categoría Para Eliminar ${Date.now()}`
    cy.get('input[name="nombre"]').type(nombreTest)
    cy.get('button').contains('Guardar').click()

    // Ahora eliminarla
    cy.get('[data-cy="eliminar-categoria"]').last().click()
    cy.contains('Sí, eliminar').click()

    cy.contains('Categoría eliminada').should('be.visible')
    cy.contains(nombreTest).should('not.exist')
  })
})
