describe('Página de Login', () => {
  beforeEach(() => {
    cy.visit('/login')
    cy.url({ timeout: 15000 }).should('include', '/login')
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('debería mostrar el formulario de login', () => {
    cy.get('input[name="nombre"]', { timeout: 10000 }).should('be.visible')
    cy.get('input[name="password"]', { timeout: 10000 }).should('be.visible')
    cy.get('button').contains('Ingresar', { timeout: 10000 }).should('be.visible')
  })

  it('debería tener títulos y labels visibles', () => {
    cy.contains('Las Ranitas', { timeout: 10000 }).should('be.visible')
  })

  it('debería permitir ingresar datos en los inputs', () => {
    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .type('subofer', { delay: 50 })
      .should('have.value', 'subofer')

    cy.get('input[name="password"]', { timeout: 10000 })
      .should('be.visible')
      .type('1234', { delay: 50 })
      .should('have.value', '1234')
  })

  it('debería mostrar error con credenciales incorrectas', () => {
    cy.get('input[name="nombre"]', { timeout: 10000 })
      .should('be.visible')
      .type('usuario_invalido', { delay: 50 })

    cy.get('input[name="password"]', { timeout: 10000 })
      .should('be.visible')
      .type('password_invalido', { delay: 50 })

    cy.get('button').contains('Ingresar', { timeout: 10000 }).click()

    // Debe mantenerse en login
    cy.url({ timeout: 15000 }).should('include', '/login')
  })

  it('debería redirigir con credenciales correctas', () => {
    cy.login('subofer', '1234')
    cy.url({ timeout: 15000 }).should('not.include', '/login')
  })

  it('debería limpiar inputs al cambiar de página', () => {
    cy.visit('/login')
    cy.get('input[name="nombre"]', { timeout: 10000 }).type('test', { delay: 50 })
    cy.visit('/login')
    cy.get('input[name="nombre"]', { timeout: 10000 }).should('have.value', '')
  })
})
