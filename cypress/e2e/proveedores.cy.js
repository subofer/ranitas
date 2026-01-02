describe('Gestión de Proveedores', () => {
  beforeEach(() => {
    cy.login('subofer', '1234')
  })

  it('debería mostrar la lista de proveedores', () => {
    cy.visit('/contactos')
    cy.contains('Proveedores').should('be.visible')
    cy.get('[data-cy="proveedor-row"]').should('be.visible')
  })

  it('debería crear un nuevo proveedor', () => {
    cy.visit('/contactos')

    // Hacer click en crear proveedor
    cy.contains('Nuevo Proveedor').click()

    const cuitProveedor = `30123456780` // CUIT de prueba
    const nombreProveedor = `Proveedor Test ${Date.now()}`

    // Llenar formulario básico
    cy.get('input[name="cuit"]').type(cuitProveedor)
    cy.get('input[name="nombre"]').type(nombreProveedor)

    // Agregar teléfono
    cy.get('input[name="telefono"]').type('0800-123-4567')

    // Guardar
    cy.get('button').contains('Guardar').click()

    // Verificar que se creó
    cy.contains('Proveedor guardado correctamente').should('be.visible')
    cy.contains(nombreProveedor).should('be.visible')
  })

  it('debería validar CUIT automáticamente', () => {
    cy.visit('/contactos')
    cy.contains('Nuevo Proveedor').click()

    // Ingresar CUIT inválido
    cy.get('input[name="cuit"]').type('123456789')

    // El sistema debería mostrar validación
    cy.contains('CUIT inválido').should('be.visible')
  })

  it('debería buscar proveedor por CUIT online', () => {
    cy.visit('/contactos')
    cy.contains('Nuevo Proveedor').click()

    // Ingresar CUIT válido
    cy.get('input[name="cuit"]').type('30710814568') // CUIT de ejemplo

    // Hacer click en buscar CUIT
    cy.contains('Buscar CUIT').click()

    // Debería completar datos automáticamente
    cy.get('input[name="nombre"]').should('not.have.value', '')
  })

  it('debería editar información de proveedor', () => {
    cy.visit('/contactos')

    // Editar primer proveedor
    cy.get('[data-cy="editar-proveedor"]').first().click()

    const nuevoTelefono = `0800-${Date.now().toString().slice(-7)}`
    cy.get('input[name="telefono"]').clear().type(nuevoTelefono)

    cy.get('button').contains('Guardar').click()
    cy.contains('Proveedor actualizado').should('be.visible')
  })

  it('debería agregar dirección al proveedor', () => {
    cy.visit('/contactos')
    cy.contains('Nuevo Proveedor').click()

    const nombreProveedor = `Proveedor con Dirección ${Date.now()}`
    cy.get('input[name="cuit"]').type('30123456781')
    cy.get('input[name="nombre"]').type(nombreProveedor)

    // Agregar dirección
    cy.contains('Agregar Dirección').click()

    // Seleccionar provincia
    cy.get('[data-cy="provincia-select"]').select('Buenos Aires')

    // Seleccionar localidad
    cy.get('[data-cy="localidad-select"]').select('La Plata')

    // Completar dirección
    cy.get('input[name="calle"]').type('Calle Principal')
    cy.get('input[name="numero"]').type('123')

    cy.get('button').contains('Guardar').click()
    cy.contains('Dirección agregada').should('be.visible')
  })
})
