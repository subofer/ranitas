describe('Autenticación', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('debería mostrar página de login cuando no hay sesión', () => {
    cy.url().should('include', '/login')
    cy.contains('Las Ranitas').should('be.visible')
  })

  it('debería hacer login exitosamente con credenciales válidas', () => {
    cy.url().should('include', '/login')

    // Llenar formulario de login
    cy.get('input[name="nombre"]').type('subofer')
    cy.get('input[name="password"]').type('1234')

    // Hacer click en el botón de login
    cy.get('button').contains('Ingresar').click()

    // Debería redirigir a la página principal
    cy.url().should('not.include', '/login')
    cy.contains('Sistema de Gestión').should('be.visible')
  })

  it('debería mostrar error con credenciales inválidas', () => {
    cy.url().should('include', '/login')

    cy.get('input[name="nombre"]').type('usuario_invalido')
    cy.get('input[name="password"]').type('password_invalido')
    cy.get('button').contains('Ingresar').click()

    // Debería mostrar mensaje de error
    cy.contains('Credenciales incorrectas').should('be.visible')
  })

  it('debería mantener la sesión después del login', () => {
    // Login exitoso
    cy.get('input[name="nombre"]').type('subofer')
    cy.get('input[name="password"]').type('1234')
    cy.get('button').contains('Ingresar').click()

    // Recargar la página
    cy.reload()

    // Debería mantenerse logueado
    cy.url().should('not.include', '/login')
    cy.contains('Sistema de Gestión').should('be.visible')
  })
})
