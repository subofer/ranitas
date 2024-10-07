import { menuListHorizontal } from '../../app/components/Navegacion/menuList';

describe('Menú de Navegación', () => {

  beforeEach(() => {
    // Usamos cy.session() para gestionar la sesión y evitar el login en cada prueba
    cy.visit('/')
    cy.session('loginSession', () => {
      cy.login(); // Realizar el login usando el comando personalizado
      cy.url().should('eq', 'http://localhost:3000/'); // Verificar que el login fue exitoso
    });
  });

  menuListHorizontal.forEach(({ menu, subMenu }) => {
    describe(`Menú: ${menu}`, () => {
      it(`debería mostrar el menú principal: ${menu}`, () => {
        cy.contains(menu, { timeout: 5000 }).should('be.visible');
      });

      // Si tiene submenús, crear tests para cada submenú
      if (subMenu.length > 0) {
        describe(`Submenús de ${menu}`, () => {
          
          before(() => {
            cy.contains(menu).click(); // Abrir el menú principal antes de verificar los submenús
          });

          subMenu.forEach(({ menu: subMenuName }) => {
            
            it(`debería mostrar el submenú: ${subMenuName}`, () => {
              cy.contains(subMenuName, { timeout: 5000 }).should('be.visible'); // Verificar el submenú
            });
          });
        });
      }
    });
  });
});
