// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })


Cypress.Commands.add('login', () => {
  cy.visit('/')
  cy.wait(1000);
  cy.get('input[name="nombre"]')
    .should('be.visible')
    .focus()
    .type('subofer', { force: true });

  cy.get('input[name="password"]')
    .should('be.visible')
    .focus()
    .type('1234', { force: true });
  const button = cy.get('button').contains('Ingresar').click().then(() => {
    cy.wait(500); // Esperar un momento después del clic
  });
  cy.wait(500);
  return button;
});


Cypress.Commands.add('logina', () => {
  cy.session('loginSession', () => {
    cy.visit('/login?goNext=/');
    
    cy.get('input[name="nombre"]').type('subofer', { force: true });
    cy.get('input[name="password"]').type('1234', { force: true });
    cy.get('button').contains('Ingresar').click();
    
    cy.url().should('not.include', '/login'); // Verificar que el login fue exitoso
  });
});