describe('Gestión de Contactos', () => {
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

  it('debería cargar la página de contactos sin errores', () => {
    cy.contains('Contactos', { timeout: 10000 }).should('be.visible')
  })

  it('debería mostrar lista de contactos', () => {
    cy.get('[data-cy="contacto-row"], tbody tr, .contact-item', { timeout: 10000 })
      .should('exist')
  })

  it('debería permitir crear nuevo contacto', () => {
    const nombreContacto = `Contacto Test ${Date.now()}`
    const cuitContacto = `20${Math.floor(Math.random() * 100000000000)}`

    cy.contains('Nuevo Contacto', { timeout: 10000 })
      .should('be.visible')
      .click()

    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .type(nombreContacto, { delay: 50 })

    cy.get('input[name="cuit"]', { timeout: 10000 })
      .should('be.visible')
      .type(cuitContacto, { delay: 50 })

    cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()

    cy.contains(/guardado|creado|actualiza/i, { timeout: 10000 }).should('be.visible')
  })

  it('debería permitir buscar contactos', () => {
    cy.get('[data-cy="buscar-contacto"], input[placeholder*="buscar"]', { timeout: 10000 })
      .should('be.visible')
      .type('Contacto', { delay: 50 })

    cy.get('[data-cy="contacto-row"], tbody tr, .contact-item', { timeout: 10000 })
      .should('exist')
  })

  it('debería permitir editar contacto', () => {
    // Obtener el nombre del primer contacto
    cy.get('[data-cy="editar-contacto"], button:contains("Editar")', { timeout: 10000 })
      .first()
      .click()

    const nuevoNombre = `Contacto Editado ${Date.now()}`
    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type(nuevoNombre, { delay: 50 })

    cy.get('button').contains('Guardar', { timeout: 10000 }).should('be.visible').click()

    cy.contains(/actualiza|guarda|creada/i, { timeout: 10000 }).should('be.visible')
  })
})

      // Verificar que cambió a activo
      cy.get('.bg-blue-600').should('exist');
    });
  });
});
