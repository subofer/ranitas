describe('Página de Inicio y Redirecciones', () => {
  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('debería redirigir al login sin credenciales', () => {
    cy.visit('/', { failOnStatusCode: false })
    cy.url({ timeout: 15000 }).should('include', '/login')
  })

  it('debería permitir acceso al home con credenciales válidas', () => {
    cy.login('subofer', '1234')
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')
  })

  it('debería mostrar contenido después de login', () => {
    cy.login('subofer', '1234')
    cy.visit('/')
    cy.get('body', { timeout: 10000 }).should('not.contain', 'login')
  })

  it('debería mantener sesión al recargar', () => {
    cy.login('subofer', '1234')
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')
    
    cy.reload()
    cy.url({ timeout: 15000 }).should('not.include', '/login')
  })

  it('debería limpiar sesión al ir a login', () => {
    cy.login('subofer', '1234')
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')
    
    cy.logout()
    cy.url({ timeout: 15000 }).should('include', '/login')
  })
})
