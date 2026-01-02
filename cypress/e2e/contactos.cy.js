describe('Contactos', () => {
  beforeEach(() => {
    cy.login();
  });

  it('should load contactos page without errors', () => {
    cy.visit('/contactos');

    // Verificar que no hay errores de React
    cy.get('body').should('not.contain', 'Cannot update a component');

    // Verificar que se carga correctamente
    cy.contains('Contactos').should('be.visible');
  });

  it('should display contactos list with loading state', () => {
    cy.visit('/contactos');

    // Verificar que muestra el estado de carga inicialmente
    cy.get('.animate-spin').should('exist');

    // Verificar que eventualmente carga los contactos
    cy.get('.animate-spin').should('not.exist');
  });

  it('should handle empty contactos list gracefully', () => {
    // Este test verifica que si no hay contactos, se maneje correctamente
    cy.visit('/contactos');

    // Si no hay contactos, debería mostrar un mensaje o tabla vacía
    cy.get('body').should('not.contain', 'Cannot update a component');
  });

  it('should display modern switch toggles in contact form', () => {
    cy.visit('/contactos');

    // Verificar que los switches tienen el diseño moderno
    cy.get('[data-testid="contact-form"]').within(() => {
      // Verificar switches de es proveedor, es interno, es marca
      cy.contains('Es Proveedor').should('be.visible');
      cy.contains('Es Interno').should('be.visible');
      cy.contains('Es Marca').should('be.visible');

      // Verificar que los switches tienen el estilo moderno
      cy.get('.bg-gray-50.rounded-lg').should('have.length.at.least', 3);

      // Verificar que los toggles cambian de color cuando están activos
      cy.get('.bg-blue-600').should('exist'); // Switches activos
      cy.get('.bg-gray-300').should('exist'); // Switches inactivos
    });
  });

  it('should toggle switches correctly', () => {
    cy.visit('/contactos');

    // Hacer clic en un switch y verificar que cambia
    cy.get('[data-testid="contact-form"]').within(() => {
      // Encontrar un switch inactivo y hacer clic
      cy.get('.bg-gray-300').first().click();

      // Verificar que cambió a activo
      cy.get('.bg-blue-600').should('exist');
    });
  });
});
