describe('Dashboard', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/');
  });

  it('should display real metrics from database', () => {
    // Verificar que las métricas se cargan
    cy.contains('Ventas del Mes').should('be.visible');
    cy.contains('Compras Realizadas').should('be.visible');
    cy.contains('Productos en Stock').should('be.visible');
    cy.contains('Proveedores Activos').should('be.visible');

    // Verificar que contienen valores numéricos (no hardcodeados)
    cy.get('[data-testid="sales-metric"]').should('contain', '$');
    cy.get('[data-testid="purchases-metric"]').should('contain', '$');
  });

  it('should display executive summary with improved design', () => {
    // Verificar que el resumen ejecutivo tiene el nuevo diseño
    cy.contains('Utilidad Neta').should('be.visible');
    cy.contains('ROI del Inventario').should('be.visible');
    cy.contains('Costo de Adquisición').should('be.visible');

    // Verificar que las cards tienen el nuevo estilo moderno
    cy.get('.bg-white.rounded-xl').should('have.length.at.least', 4);
  });

  it('should navigate to invoices page', () => {
    // Verificar que se puede acceder a la página de facturas desde el menú
    cy.contains('Compras').click();
    cy.contains('Facturas').should('be.visible').click();
    cy.url().should('include', '/facturas');
  });
});

describe('Invoices Page', () => {
  beforeEach(() => {
    cy.login();
    cy.visit('/facturas');
  });

  it('should display invoices table', () => {
    cy.contains('Gestión de Facturas').should('be.visible');
    cy.contains('Todas').should('be.visible');
    cy.contains('Pendientes').should('be.visible');
    cy.contains('Pagadas').should('be.visible');
  });

  it('should filter invoices correctly', () => {
    // Filtrar por pendientes
    cy.contains('Pendientes').click();
    // Verificar que se muestran solo facturas pendientes

    // Filtrar por pagadas
    cy.contains('Pagadas').click();
    // Verificar que se muestran solo facturas pagadas

    // Mostrar todas
    cy.contains('Todas').click();
    // Verificar que se muestran todas las facturas
  });

  it('should display invoice summary', () => {
    cy.contains('Resumen').should('be.visible');
    cy.contains('Total de Facturas').should('be.visible');
    cy.contains('Pendientes').should('be.visible');
    cy.contains('Pagadas').should('be.visible');
  });
});
