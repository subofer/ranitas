describe('Login Page', () => {
  beforeEach(() => {
    // Visitar la página solo una vez
    cy.visit('/login?goNext=/');
    cy.wait(1000); // Esperar 1 segundo para asegurarnos de que todo el DOM se haya cargado
  });

  describe('Verificación de inputs', () => {
    it('debería mostrar el input de nombre de usuario', () => {
      cy.get('input[name="nombre"]').should('exist');
    });

    it('debería mostrar el input de contraseña', () => {
      cy.get('input[name="password"]').should('exist');
    });
  });

  describe('Interacción con el formulario', () => {
    it('debería permitir ingresar un nombre de usuario y una contraseña', () => {
      cy.get('input[name="nombre"]').type('subofer', { force: true });
      cy.get('input[name="password"]').type('1234', { force: true });
    });

    it('debería mostrar un error si no se ingresan datos', () => {
      cy.get('button').contains('Ingresar').click();
      // Verificar que seguimos en la página de login
      cy.url().should('include', '/login');
      // Verificar que se muestra un mensaje de error
      cy.contains('Credenciales incorrectas').should('be.visible');
    });

    it('debería mostrar un error si las credenciales son incorrectas', () => {
      cy.get('input[name="nombre"]').type('subofer', { force: true });
      cy.get('input[name="password"]').type('incorrect_password', { force: true });
      cy.get('button').contains('Ingresar').click();
      // Verificar que seguimos en la página de login
      cy.url().should('include', '/login');
      // Verificar que se muestra un mensaje de error
      cy.contains('Credenciales incorrectas').should('be.visible');
    });

    it('debería redirigir correctamente si las credenciales son correctas', () => {
      cy.get('input[name="nombre"]').type('subofer', { force: true });
      cy.get('input[name="password"]').type('1234', { force: true });
      cy.get('button').contains('Ingresar').click();
      // Verificar que redirige a la página principal
      cy.url().should('eq', 'http://localhost:3000/');
    });
  });
});
