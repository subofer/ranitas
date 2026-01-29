describe('Gestión de Proveedores', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
    cy.visit('/contactos')
    cy.url({ timeout: 15000 }).should('include', '/contactos')
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('debería mostrar la página de contactos/proveedores', () => {
    cy.contains('Contactos', { timeout: 10000 }).should('be.visible')
  })

  it('debería permitir crear nuevo proveedor', () => {
    const nombreProveedor = `Proveedor Test ${Date.now()}`
    const cuitProveedor = `20${Math.floor(Math.random() * 100000000000)}`

    cy.contains('Nuevo Contacto', { timeout: 10000 })
      .should('be.visible')
      .click()

    // Llenar formulario básico
    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .type(nombreProveedor, { delay: 50 })

    cy.get('input[name="cuit"]', { timeout: 10000 })
      .should('be.visible')
      .type(cuitProveedor, { delay: 50 })

    // Guardar
    cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()

    // Verificar que se creó
    cy.contains(/guardado|creado|actualiza/i, { timeout: 10000 }).should('be.visible')
  })

  it('debería permitir buscar proveedores', () => {
    cy.get('[data-cy="buscar-contacto"], input[placeholder*="buscar"]', { timeout: 10000 })
      .should('be.visible')
      .type('Proveedor', { delay: 50 })

    cy.get('[data-cy="contacto-row"], tbody tr, .contact-item', { timeout: 10000 })
      .should('exist')
  })

  it('debería permitir editar información de proveedor', () => {
    // Editar primer proveedor
    cy.get('[data-cy="editar-contacto"], button:contains("Editar")', { timeout: 10000 })
      .first()
      .click()

    const nuevoNombre = `Proveedor Editado ${Date.now()}`
    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(nuevoNombre, { delay: 50 })

    cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()
    cy.contains(/actualiza|guarda|creada/i, { timeout: 10000 }).should('be.visible')
  })

  it('debería mostrar lista de proveedores', () => {
    cy.get('[data-cy="contacto-row"], tbody tr, .contact-item', { timeout: 10000 })
      .should('exist')
  })

  it('debería permitir filtrar por tipo de contacto', () => {
    // Buscar field de filtro
    cy.get('[data-cy="filtro-tipo"], select, input[name*="tipo"]', { timeout: 10000 })
      .should('exist')
  })
})

    // Agregar dirección
    cy.contains('Agregar Dirección').click()

    // Seleccionar provincia
    cy.get('[data-cy="provincia-select"]').select('Buenos Aires')

    // Seleccionar localidad
    cy.get('[data-cy="localidad-select"]').select('La Plata')

    // Completar dirección
    cy.get('input[name="calle"]').type('Calle Principal')
    cy.get('input[name="numero"]').type('123')

    cy.get('button').contains('Guardar').click()
    cy.contains('Dirección agregada').should('be.visible')
  })
})
