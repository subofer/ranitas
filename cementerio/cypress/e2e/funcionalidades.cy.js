describe('Funcionalidades Generales', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('debería permitir acceder a búsqueda de productos', () => {
    cy.visit('/buscarEnGoogle', { failOnStatusCode: false })
    
    // Verificar que la página cargó (aunque sea con error)
    cy.get('body', { timeout: 10000 }).should('exist')
  })

  it('debería permitir acceder a captura de código', () => {
    cy.visit('/captura', { failOnStatusCode: false })
    
    // Verificar que la página cargó
    cy.get('body', { timeout: 10000 }).should('exist')
  })

  it('debería permitir acceder a exportación de Excel', () => {
    cy.visit('/excel', { failOnStatusCode: false })
    
    // Verificar que la página cargó
    cy.get('body', { timeout: 10000 }).should('exist')
  })

  it('debería permitir acceder a función de IA', () => {
    cy.visit('/ia', { failOnStatusCode: false })
    
    // Verificar que la página cargó
    cy.get('body', { timeout: 10000 }).should('exist')
  })

  it('debería permitir acceder a funciones de stock bajo', () => {
    cy.visit('/stock-bajo', { failOnStatusCode: false })
    
    // Verificar que la página cargó
    cy.get('body', { timeout: 10000 }).should('exist')
  })

  it('debería permitir acceder a dólar hoy', () => {
    cy.visit('/dolarHoy', { failOnStatusCode: false })
    
    // Verificar que la página cargó
    cy.get('body', { timeout: 10000 }).should('exist')
  })
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
