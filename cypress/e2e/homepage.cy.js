describe('Redirección al login sin credenciales', () => {
  it('debería redirigir al login cuando no se han proporcionado credenciales', () => {
    cy.visit('/'); // Intenta visitar la página de inicio
    cy.url().should('include', '/login'); // Verifica que la URL contenga '/login'
    cy.url().should('include', 'goNext=/'); // Verifica que la URL contenga 'goNext=/'
  });
});
