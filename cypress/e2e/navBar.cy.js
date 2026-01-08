describe('Menú de Navegación', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('debería mostrar navegación principal', () => {
    cy.get('nav, aside, [role="navigation"]', { timeout: 10000 }).should('exist')
  })

  it('debería tener enlace a Productos', () => {
    cy.contains('Producto', { timeout: 10000 }).should('exist')
  })

  it('debería tener enlace a Categorías', () => {
    cy.contains('Categoría', { timeout: 10000 }).should('exist')
  })

  it('debería tener enlace a Contactos', () => {
    cy.contains('Contacto', { timeout: 10000 }).should('exist')
  })

  it('debería tener enlace a Pedidos', () => {
    cy.contains('Pedido', { timeout: 10000 }).should('exist')
  })

  it('debería permitir navegación a Productos', () => {
    cy.contains('Producto', { timeout: 10000 }).first().click()
    cy.url({ timeout: 15000 }).should('include', '/producto')
  })

  it('debería permitir navegación a Categorías', () => {
    cy.contains('Categoría', { timeout: 10000 }).first().click()
    cy.url({ timeout: 15000 }).should('include', '/categoria')
  })

  it('debería permitir navegación a Contactos', () => {
    cy.contains('Contacto', { timeout: 10000 }).first().click()
    cy.url({ timeout: 15000 }).should('include', '/contacto')
  })
})
