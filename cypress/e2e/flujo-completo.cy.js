describe('Flujo Completo del Sistema', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
    })
  })

  it('debería permitir acceder a todas las funcionalidades principales', () => {
    // HOME
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')
    cy.contains('Sistema', { timeout: 10000 }).should('exist')

    // PRODUCTOS
    cy.visit('/cargarProductos')
    cy.url({ timeout: 15000 }).should('include', '/cargarProductos')

    // CATEGORÍAS
    cy.visit('/categorias')
    cy.url({ timeout: 15000 }).should('include', '/categorias')

    // CONTACTOS
    cy.visit('/contactos')
    cy.url({ timeout: 15000 }).should('include', '/contactos')

    // VENTA
    cy.visit('/venta')
    cy.url({ timeout: 15000 }).should('include', '/venta')
  })

  it('debería mantener sesión activa durante navegación', () => {
    // Navegar múltiples veces
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')

    cy.visit('/categorias')
    cy.url({ timeout: 15000 }).should('not.include', '/login')

    cy.visit('/contactos')
    cy.url({ timeout: 15000 }).should('not.include', '/login')

    // Volver al home
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')
  })

  it('debería poder navegar usando el menú principal', () => {
    cy.visit('/')
    
    // Verificar que existen opciones de navegación
    cy.get('nav, aside, [role="navigation"]', { timeout: 10000 }).should('exist')
    
    // Verificar enlaces principales
    cy.contains('Producto', { timeout: 10000 }).should('exist')
    cy.contains('Categoría', { timeout: 10000 }).should('exist')
    cy.contains('Contacto', { timeout: 10000 }).should('exist')
  })

  it('debería permitir cerrar sesión desde cualquier página', () => {
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')

    // Logout
    cy.logout()
    cy.url({ timeout: 15000 }).should('include', '/login')
  })

  it('debería recargar estado al volver de logout', () => {
    // Login
    cy.login('subofer', '1234')
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')

    // Logout
    cy.logout()
    cy.url({ timeout: 15000 }).should('include', '/login')

    // Login de nuevo
    cy.login('subofer', '1234')
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('not.include', '/login')
  })
})
    cy.visit('/venta')

    // Seleccionar cliente (asumiendo que hay clientes existentes)
    cy.contains('Seleccionar Cliente').click()
    cy.get('[data-cy="cliente-option"]').first().click()

    // Agregar el producto creado
    cy.contains('Agregar Producto').click()
    cy.get('[data-cy="producto-search"]').type(productoNombre)
    cy.get('[data-cy="producto-option"]').first().click()
    cy.get('input[name="cantidad"]').type('2')
    cy.contains('Agregar').click()

    // Verificar cálculo de total
    cy.get('[data-cy="total-venta"]').should('contain', '201.00') // 2 * 100.50

    // Procesar venta
    cy.contains('Procesar Venta').click()
    cy.contains('Venta completada').should('be.visible')

    // 7. VERIFICAR QUE SE GENERÓ FACTURA
    cy.contains('Factura generada').should('be.visible')
    cy.contains('N° de factura').should('be.visible')
  })

  it('debería manejar errores correctamente en flujo completo', () => {
    cy.login('subofer', '1234')

    // Intentar crear producto con código duplicado
    cy.visit('/cargarProductos')
    cy.get('input[name="codigoBarra"]').type('7790070410137') // Código existente
    cy.get('input[name="nombre"]').type('Producto Duplicado')
    cy.get('button').contains('Guardar').click()

    // Debería mostrar error
    cy.contains('Código de barras ya existe').should('be.visible')

    // Intentar venta sin productos
    cy.visit('/venta')
    cy.contains('Seleccionar Cliente').click()
    cy.get('[data-cy="cliente-option"]').first().click()
    cy.contains('Procesar Venta').click()

    // Debería mostrar error
    cy.contains('Debe agregar al menos un producto').should('be.visible')
  })

  it('debería mantener consistencia de datos entre módulos', () => {
    cy.login('subofer', '1234')

    // Crear producto con proveedor específico
    const testId = Date.now()
    const codigoProducto = `CONSISTENCY${testId}`
    const nombreProducto = `Producto Consistency ${testId}`
    const nombreProveedor = `Proveedor Consistency ${testId}`

    // Crear proveedor
    cy.createTestSupplier('30123456781', nombreProveedor)

    // Crear producto asociado
    cy.visit('/cargarProductos')
    cy.get('input[name="codigoBarra"]').type(codigoProducto)
    cy.get('input[name="nombre"]').type(nombreProducto)

    cy.contains('Seleccionar Proveedores').click()
    cy.contains(nombreProveedor).click()

    cy.get('button').contains('Guardar').click()
    cy.contains('Producto guardado correctamente').should('be.visible')

    // Verificar que la asociación se mantiene en productos por proveedor
    cy.visit('/productosProveedor')
    cy.contains('Seleccionar Proveedor').click()
    cy.contains(nombreProveedor).click()

    // Debería aparecer el producto creado
    cy.contains(nombreProducto).should('be.visible')
    cy.contains(codigoProducto).should('be.visible')
  })

  it('debería exportar datos correctamente', () => {
    cy.login('subofer', '1234')

    // Crear algunos datos de prueba
    cy.createTestProduct(`EXPORT${Date.now()}`, 'Producto para Exportar')

    // Ir a exportación
    cy.visit('/excel')

    // Seleccionar productos
    cy.contains('Productos').click()

    // Exportar
    cy.contains('Exportar a Excel').click()

    // Verificar que se descargó el archivo
    cy.readFile('cypress/downloads/productos.xlsx').should('exist')

    // Verificar contenido del archivo (si es posible)
    cy.task('readExcelFile', 'cypress/downloads/productos.xlsx').then((data) => {
      expect(data).to.have.length.greaterThan(0)
      expect(data[0]).to.have.property('codigoBarra')
      expect(data[0]).to.have.property('nombre')
    })
  })

  after(() => {
    // Limpiar datos de prueba después de todos los tests
    cy.cleanupTestData()
  })
})
