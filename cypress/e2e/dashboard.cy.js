describe('Dashboard', () => {
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

  it('debería cargar el dashboard correctamente', () => {
    // Verificar que la página cargó
    cy.contains('Sistema', { timeout: 10000 }).should('exist')
    
    // Esperar a que carguen los datos
    cy.get('[data-cy="loading"], .loader, .spinner', { timeout: 15000 }).should('not.exist')
  })

  it('debería mostrar título del dashboard', () => {
    cy.contains(/dashboard|resumen|inicio|sistema/i, { timeout: 10000 }).should('be.visible')
  })

  it('debería mostrar módulos principales', () => {
    // Verificar que se muestran opciones de navegación
    cy.get('nav, aside, [role="navigation"]', { timeout: 10000 }).should('exist')
  })

  it('debería permitir navegación a productoss', () => {
    cy.contains(/productos|listado/i, { timeout: 10000 }).should('exist')
    cy.contains('Productos', { timeout: 10000 }).first().click()
    
    cy.url({ timeout: 15000 }).should('include', '/productos')
  })

  it('debería permitir navegación a categorías', () => {
    cy.contains('Categorías', { timeout: 10000 }).should('exist')
    cy.contains('Categorías', { timeout: 10000 }).click()
    
    cy.url({ timeout: 15000 }).should('include', '/categorias')
  })

  it('debería permitir navegación a contactos', () => {
    cy.contains('Contactos', { timeout: 10000 }).should('exist')
    cy.contains('Contactos', { timeout: 10000 }).click()
    
    cy.url({ timeout: 15000 }).should('include', '/contactos')
  })

  it('debería permitir navegación a pedidos', () => {
    cy.contains('Pedidos', { timeout: 10000 }).should('exist')
    cy.contains('Pedidos', { timeout: 10000 }).click()
    
    cy.url({ timeout: 15000 }).should('include', '/pedidos')
  })

  it('debería permitir logout desde el dashboard', () => {
    cy.logout()
    cy.url({ timeout: 15000 }).should('include', '/login')
  })
})

describe('Navegación Principal', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
    cy.visit('/')
  })

  it('debería mostrar menú de navegación', () => {
    cy.get('nav, aside, [role="navigation"]', { timeout: 10000 }).should('exist')
  })

  it('debería tener todos los módulos principales accesibles', () => {
    const modulos = ['Productos', 'Categorías', 'Contactos', 'Pedidos']
    
    modulos.forEach((modulo) => {
      cy.contains(modulo, { timeout: 10000 }).should('exist')
    })
  })
})
    // Verificar que se muestran todas las facturas
  });

  it('should display invoice summary', () => {
    cy.contains('Resumen').should('be.visible');
    cy.contains('Total de Facturas').should('be.visible');
    cy.contains('Pendientes').should('be.visible');
    cy.contains('Pagadas').should('be.visible');
  });
});
