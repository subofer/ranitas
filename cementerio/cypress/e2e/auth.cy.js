describe('Autenticación', () => {
  beforeEach(() => {
    cy.visit('/', { failOnStatusCode: false })
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
      win.sessionStorage.clear()
    })
  })

  it('debería mostrar página de login cuando no hay sesión', () => {
    cy.url({ timeout: 15000 }).should('include', '/login')
    cy.contains('Las Ranitas', { timeout: 10000 }).should('be.visible')
  })

  it('debería hacer login exitosamente con credenciales válidas', () => {
    cy.url({ timeout: 15000 }).should('include', '/login')
    
    // Verificar que se ve el formulario
    cy.get('form', { timeout: 10000 }).should('be.visible')
    
    // Ejecutar el login
    cy.login('subofer', '1234')
    
    // Debería redirigir exitosamente
    cy.url({ timeout: 20000 }).should('not.include', '/login')
  })

  it('debería mostrar error con credenciales inválidas', () => {
    cy.url({ timeout: 15000 }).should('include', '/login')
    
    // Verificar que se ven los inputs
    cy.get('form', { timeout: 10000 }).should('exist')
    
    // Intentar login con credenciales inválidas
    // Nota: Los inputs están cubiertos por el label flotante, así que usamos force: true
    cy.get('#nombre', { timeout: 10000 })
      .should('exist')
      .click({ force: true })
      .clear({ force: true })
      .type('usuario_invalido', { delay: 100, force: true })
    
    cy.wait(300)
    
    cy.get('#password', { timeout: 10000 })
      .should('exist')
      .click({ force: true })
      .clear({ force: true })
      .type('password_invalido', { delay: 100, force: true })
    
    cy.wait(300)
    
    cy.get('button', { timeout: 10000 })
      .contains('Ingresar')
      .click({ force: true })
    
    // Debe mantenerse en login o mostrar error
    cy.url({ timeout: 15000 }).should('include', '/login')
  })

  it('debería mantener la sesión después del login', () => {
    // Login exitoso
    cy.login('subofer', '1234')
    cy.url({ timeout: 20000 }).should('not.include', '/login')
    
    // Recargar la página
    cy.reload()
    
    // Debería mantenerse logueado
    cy.url({ timeout: 15000 }).should('not.include', '/login')
  })

  it('debería permitir logout', () => {
    cy.login('subofer', '1234')
    cy.url({ timeout: 20000 }).should('not.include', '/login')
    
    // Logout
    cy.logout()
    cy.url({ timeout: 15000 }).should('include', '/login')
  })
})
