describe('Gestión de Categorías', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
    cy.visit('/categorias')
    cy.url({ timeout: 15000 }).should('include', '/categorias')
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('debería mostrar la lista de categorías', () => {
    cy.contains('Categorías', { timeout: 10000 }).should('be.visible')
    cy.get('[data-cy="categoria-row"], tbody tr', { timeout: 10000 }).should('exist')
  })

  it('debería crear una nueva categoría', () => {
    const nombreCategoria = `Categoría Test ${Date.now()}`

    // Hacer click en agregar nueva categoría
    cy.contains('Nueva Categoría', { timeout: 10000 }).should('be.visible').click()

    // Llenar formulario
    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(nombreCategoria, { delay: 50 })

    // Guardar
    cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()

    // Verificar que se creó
    cy.contains(/creada|guardada|actualiza/i, { timeout: 10000 }).should('be.visible')
    cy.contains(nombreCategoria, { timeout: 10000 }).should('be.visible')
  })

  it('debería editar una categoría existente', () => {
    // Esperar a que cargue la lista
    cy.get('[data-cy="editar-categoria"], tbody tr', { timeout: 10000 }).should('exist')

    // Hacer click en editar la primera categoría
    cy.get('[data-cy="editar-categoria"], button:contains("Editar")', { timeout: 10000 })
      .first()
      .click()

    const nuevoNombre = `Categoría Editada ${Date.now()}`
    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(nuevoNombre, { delay: 50 })

    cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()

    cy.contains(/actualiza|guarda|creada/i, { timeout: 10000 }).should('be.visible')
  })

  it('debería eliminar una categoría', () => {
    // Crear categoría de prueba primero
    const nombreTest = `Categoría Para Eliminar ${Date.now()}`
    
    cy.contains('Nueva Categoría', { timeout: 10000 }).click()
    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .type(nombreTest, { delay: 50 })
    cy.get('button').contains('Guardar', { timeout: 10000 }).click()

    cy.contains(nombreTest, { timeout: 10000 }).should('be.visible')

    // Ahora eliminarla
    cy.get('[data-cy="eliminar-categoria"], button:contains("Eliminar")', { timeout: 10000 })
      .last()
      .click()

    // Confirmar eliminación
    cy.contains('Sí', { timeout: 10000 }).should('be.visible').click()
    cy.contains(/eliminada|borrada|eliminado/i, { timeout: 10000 }).should('be.visible')
  })
})
