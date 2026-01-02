describe('Funcionalidades Avanzadas', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
  })

  it('debería buscar productos en Google', () => {
    cy.visit('/buscarEnGoogle')

    // Ingresar código de barras
    cy.get('input[name="codigoBarra"]').type('7790070410137')

    // Buscar
    cy.contains('Buscar en Google').click()

    // Verificar resultados
    cy.contains('Resultados de búsqueda').should('be.visible')
    cy.get('[data-cy="resultado-google"]').should('have.length.greaterThan', 0)
  })

  it('debería leer códigos de barras con cámara', () => {
    cy.visit('/captura')

    // Verificar que la cámara se activa
    cy.contains('Captura de Código').should('be.visible')

    // Simular código detectado (esto depende de la implementación real)
    cy.window().then((win) => {
      // Simular resultado de escaneo
      win.postMessage({
        type: 'barcode-detected',
        code: '7790070410137'
      }, '*')
    })

    // Verificar que procesa el código
    cy.contains('Código detectado').should('be.visible')
  })

  it('debería exportar datos a Excel', () => {
    cy.visit('/excel')

    // Seleccionar tipo de exportación
    cy.contains('Productos').click()

    // Exportar
    cy.contains('Exportar a Excel').click()

    // Verificar que se descarga
    cy.readFile('cypress/downloads/productos.xlsx').should('exist')
  })

  it('debería consultar a la IA', () => {
    cy.visit('/ia')

    // Ingresar consulta
    cy.get('textarea[name="consulta"]').type('¿Cuáles son los productos más vendidos?')

    // Enviar consulta
    cy.contains('Consultar IA').click()

    // Verificar respuesta
    cy.contains('Respuesta de IA').should('be.visible')
    cy.get('[data-cy="respuesta-ia"]').should('not.be.empty')
  })

  it('debería mostrar cotización del dólar actualizada', () => {
    // La cotización se muestra en el header o en una página específica
    cy.visit('/')

    // Verificar que se muestra la cotización
    cy.contains('Dólar').should('be.visible')
    cy.get('[data-cy="cotizacion-dolar"]').should('contain', '$')
  })

  it('debería navegar correctamente entre páginas', () => {
    // Verificar navegación desde el menú
    cy.visit('/')

    // Ir a productos
    cy.contains('Productos').click()
    cy.url().should('include', '/listadoProductos')

    // Ir a categorías
    cy.contains('Categorías').click()
    cy.url().should('include', '/categorias')

    // Ir a proveedores
    cy.contains('Proveedores').click()
    cy.url().should('include', '/contactos')

    // Ir a ventas
    cy.contains('Ventas').click()
    cy.url().should('include', '/venta')
  })

  it('debería manejar errores de red correctamente', () => {
    // Simular desconexión
    cy.intercept('GET', '/api/*', { forceNetworkError: true }).as('networkError')

    cy.visit('/listadoProductos')
    cy.wait('@networkError')

    // Debería mostrar error amigable
    cy.contains('Error de conexión').should('be.visible')
  })

  it('debería validar formularios correctamente', () => {
    cy.visit('/cargarProductos')

    // Intentar guardar sin datos
    cy.get('button').contains('Guardar').click()

    // Debería mostrar errores de validación
    cy.contains('Campo requerido').should('be.visible')
    cy.contains('Código de barras requerido').should('be.visible')
    cy.contains('Nombre requerido').should('be.visible')
  })

  it('debería manejar archivos de imagen', () => {
    cy.visit('/cargarProductos')

    // Subir imagen
    cy.get('input[type="file"]').selectFile('cypress/fixtures/producto-test.jpg', { force: true })

    // Verificar que se muestra preview
    cy.get('[data-cy="imagen-preview"]').should('be.visible')
  })

  it('debería mostrar gráficos correctamente', () => {
    cy.visit('/graficos') // Asumiendo que hay una página de gráficos

    // Verificar que se muestran gráficos
    cy.get('canvas').should('be.visible') // Chart.js usa canvas

    // Cambiar tipo de gráfico
    cy.contains('Ventas por mes').click()
    cy.contains('Productos más vendidos').click()
  })
})
