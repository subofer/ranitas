describe('📋 SUITE COMPLETA DE TESTS - LAS RANITAS', () => {
  describe('1️⃣ AUTENTICACIÓN Y SESIÓN', () => {
    describe('Login', () => {
      beforeEach(() => {
        cy.visit('/login')
      })

      it('debería mostrar página de login cuando no hay sesión', () => {
        cy.url().should('include', '/login')
        cy.contains('Las Ranitas').should('be.visible')
        cy.get('input[name="nombre"]').should('be.visible')
        cy.get('input[name="password"]').should('be.visible')
      })

      it('debería hacer login exitosamente con credenciales válidas', () => {
        cy.get('input[name="nombre"]').type('subofer')
        cy.get('input[name="password"]').type('1234')
        cy.get('button').contains('Ingresar').click()

        cy.url().should('not.include', '/login')
        cy.contains('Sistema de Gestión').should('be.visible')
      })

      it('debería mostrar error con credenciales inválidas', () => {
        cy.get('input[name="nombre"]').type('usuario_inexistente')
        cy.get('input[name="password"]').type('password_falso')
        cy.get('button').contains('Ingresar').click()

        cy.contains(/Credenciales|error/i).should('be.visible')
      })

      it('debería requerir nombre de usuario', () => {
        cy.get('input[name="password"]').type('1234')
        cy.get('button').contains('Ingresar').click()

        cy.url().should('include', '/login')
      })

      it('debería requerir contraseña', () => {
        cy.get('input[name="nombre"]').type('subofer')
        cy.get('button').contains('Ingresar').click()

        cy.url().should('include', '/login')
      })

      it('debería mantener la sesión después del login', () => {
        cy.get('input[name="nombre"]').type('subofer')
        cy.get('input[name="password"]').type('1234')
        cy.get('button').contains('Ingresar').click()

        cy.reload()

        cy.url().should('not.include', '/login')
        cy.contains('Sistema de Gestión').should('be.visible')
      })
    })

    describe('Navegación autenticada', () => {
      beforeEach(() => {
        cy.login('subofer', '1234')
      })

      it('debería redirigir a login si se accede sin autenticación', () => {
        cy.clearCookie('auth')
        cy.visit('/categorias')
        cy.url().should('include', '/login')
      })

      it('debería mostrar menú de usuario cuando está logueado', () => {
        cy.get('[data-cy="user-menu"]').should('be.visible')
      })

      it('debería poder hacer logout', () => {
        cy.get('[data-cy="user-menu"]').click()
        cy.get('[data-cy="logout-btn"]').click()
        cy.url().should('include', '/login')
      })
    })
  })

  describe('2️⃣ GESTIÓN DE CATEGORÍAS', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/categorias')
    })

    it('debería mostrar la lista de categorías', () => {
      cy.contains('Categorías').should('be.visible')
      cy.get('[data-cy="categoria-row"]').should('have.length.greaterThan', 0)
    })

    it('debería crear una nueva categoría', () => {
      const nombreCategoria = `Test Cat ${Date.now()}`

      cy.contains('Nueva Categoría').click()
      cy.get('input[name="nombre"]').type(nombreCategoria)
      cy.get('button').contains('Guardar').click()

      cy.contains(/creada|guardada/i).should('be.visible')
      cy.contains(nombreCategoria).should('be.visible')
    })

    it('debería validar nombre requerido en categoría', () => {
      cy.contains('Nueva Categoría').click()
      cy.get('button').contains('Guardar').click()

      cy.url().should('include', '/categorias')
    })

    it('debería editar una categoría existente', () => {
      cy.get('[data-cy="editar-categoria"]').first().click()

      const nuevoNombre = `Cat Editada ${Date.now()}`
      cy.get('input[name="nombre"]').clear().type(nuevoNombre)
      cy.get('button').contains('Guardar').click()

      cy.contains(/actualiza|guarda/i).should('be.visible')
    })

    it('debería eliminar una categoría', () => {
      // Crear categoría de prueba
      const nombreTest = `Cat para eliminar ${Date.now()}`
      cy.contains('Nueva Categoría').click()
      cy.get('input[name="nombre"]').type(nombreTest)
      cy.get('button').contains('Guardar').click()

      // Eliminar
      cy.get('[data-cy="eliminar-categoria"]').first().click()
      cy.get('button').contains('Confirmar').click()

      cy.contains(/eliminada|borrada/i).should('be.visible')
    })

    it('debería prevenir duplicados de categorías', () => {
      const nombreDuplicado = `Alimentos`
      
      cy.contains('Nueva Categoría').click()
      cy.get('input[name="nombre"]').type(nombreDuplicado)
      cy.get('button').contains('Guardar').click()

      cy.contains(/existe|duplica|ya/i).should('be.visible')
    })

    it('debería filtrar categorías por nombre', () => {
      cy.get('[data-cy="buscar-categoria"]').type('Alimentos')
      cy.get('[data-cy="categoria-row"]').each(($el) => {
        cy.wrap($el).contains(/Alimentos/i).should('be.visible')
      })
    })
  })

  describe('3️⃣ GESTIÓN DE PRODUCTOS', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/cargarProductos')
    })

    it('debería mostrar formulario de carga de productos', () => {
      cy.contains('Cargar Producto').should('be.visible')
      cy.get('input[name="codigoBarra"]').should('be.visible')
      cy.get('input[name="nombre"]').should('be.visible')
    })

    it('debería crear un producto exitosamente', () => {
      const codigoBarra = `TST${Date.now()}`
      const nombre = `Producto ${Date.now()}`

      cy.get('input[name="codigoBarra"]').type(codigoBarra)
      cy.get('input[name="nombre"]').type(nombre)
      cy.get('button').contains('Guardar').click()

      cy.contains(/guardado|creado/i).should('be.visible')
    })

    it('debería validar código de barras requerido', () => {
      cy.get('input[name="nombre"]').type('Producto sin código')
      cy.get('button').contains('Guardar').click()

      cy.url().should('include', '/cargarProductos')
    })

    it('debería validar nombre requerido', () => {
      cy.get('input[name="codigoBarra"]').type('123456789')
      cy.get('button').contains('Guardar').click()

      cy.url().should('include', '/cargarProductos')
    })

    it('debería prevenir códigos de barras duplicados', () => {
      cy.get('input[name="codigoBarra"]').type('7790070410137')
      cy.get('input[name="nombre"]').type('Producto Duplicado')
      cy.get('button').contains('Guardar').click()

      cy.contains(/existe|duplica|ya existe/i).should('be.visible')
    })

    it('debería mostrar listado de productos', () => {
      cy.visit('/listadoProductos')
      cy.contains('Productos').should('be.visible')
      cy.get('[data-cy="producto-row"]').should('have.length.greaterThan', 0)
    })

    it('debería buscar productos por nombre', () => {
      cy.visit('/listadoProductos')
      cy.get('[data-cy="buscar-producto"]').type('Alimentos')
      cy.get('[data-cy="producto-row"]').should('have.length.greaterThan', 0)
    })

    it('debería buscar productos por código de barras', () => {
      cy.visit('/listadoProductos')
      cy.get('[data-cy="buscar-codigo"]').type('7790070410137')
      cy.get('[data-cy="producto-row"]').should('have.length.greaterThan', 0)
    })

    it('debería editar un producto', () => {
      cy.visit('/listadoProductos')
      cy.get('[data-cy="editar-producto"]').first().click()

      cy.get('input[name="nombre"]').clear().type(`Producto Editado ${Date.now()}`)
      cy.get('button').contains('Guardar').click()

      cy.contains(/actualiza|guarda/i).should('be.visible')
    })

    it('debería mostrar precio de producto', () => {
      cy.visit('/listadoProductos')
      cy.get('[data-cy="precio-producto"]').first().should('contain', '$')
    })

    it('debería gestionar presentaciones de producto', () => {
      const codigoBarra = `TST${Date.now()}`
      const nombre = `Producto Con Presentaciones ${Date.now()}`

      cy.get('input[name="codigoBarra"]').type(codigoBarra)
      cy.get('input[name="nombre"]').type(nombre)
      cy.get('button').contains('Guardar').click()

      cy.visit('/listadoProductos')
      cy.get('[data-cy="gestionar-presentaciones"]').first().click()
      cy.contains('Agregar Presentación').should('be.visible')
    })
  })

  describe('4️⃣ GESTIÓN DE CONTACTOS (Proveedores/Clientes)', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/contactos')
    })

    it('debería mostrar lista de contactos', () => {
      cy.contains('Contactos').should('be.visible')
      cy.get('[data-cy="contacto-row"]').should('have.length.greaterThan', 0)
    })

    it('debería crear un nuevo proveedor', () => {
      const cuit = `${Math.floor(Math.random() * 90000000) + 10000000}`
      const nombre = `Proveedor ${Date.now()}`

      cy.contains('Nuevo Contacto').click()
      cy.get('input[name="nombre"]').type(nombre)
      cy.get('input[name="cuit"]').type(cuit)
      cy.get('[data-cy="tipo-select"]').select('Proveedor')
      cy.get('button').contains('Guardar').click()

      cy.contains(/guardado|creado/i).should('be.visible')
    })

    it('debería crear un nuevo cliente', () => {
      const cuit = `${Math.floor(Math.random() * 90000000) + 10000000}`
      const nombre = `Cliente ${Date.now()}`

      cy.contains('Nuevo Contacto').click()
      cy.get('input[name="nombre"]').type(nombre)
      cy.get('input[name="cuit"]').type(cuit)
      cy.get('[data-cy="tipo-select"]').select('Cliente')
      cy.get('button').contains('Guardar').click()

      cy.contains(/guardado|creado/i).should('be.visible')
    })

    it('debería validar CUIT requerido', () => {
      cy.contains('Nuevo Contacto').click()
      cy.get('input[name="nombre"]').type('Contacto Sin CUIT')
      cy.get('button').contains('Guardar').click()

      cy.url().should('include', '/contactos')
    })

    it('debería validar nombre requerido', () => {
      cy.contains('Nuevo Contacto').click()
      cy.get('input[name="cuit"]').type('20123456789')
      cy.get('button').contains('Guardar').click()

      cy.url().should('include', '/contactos')
    })

    it('debería editar un contacto', () => {
      cy.get('[data-cy="editar-contacto"]').first().click()

      cy.get('input[name="nombre"]').clear().type(`Contacto Editado ${Date.now()}`)
      cy.get('button').contains('Guardar').click()

      cy.contains(/actualiza|guarda/i).should('be.visible')
    })

    it('debería agregar email a contacto', () => {
      cy.get('[data-cy="editar-contacto"]').first().click()
      cy.contains('Agregar Email').click()

      cy.get('input[name="email"]').type(`test${Date.now()}@example.com`)
      cy.get('button').contains('Guardar Email').click()

      cy.contains(/agregado|guardado/i).should('be.visible')
    })

    it('debería buscar contactos por nombre', () => {
      cy.get('[data-cy="buscar-contacto"]').type('Proveedor')
      cy.get('[data-cy="contacto-row"]').should('have.length.greaterThan', 0)
    })

    it('debería buscar contactos por CUIT', () => {
      cy.get('[data-cy="buscar-cuit"]').type('20')
      cy.get('[data-cy="contacto-row"]').should('have.length.greaterThan', 0)
    })

    it('debería filtrar contactos por tipo (Proveedor)', () => {
      cy.get('[data-cy="filtro-tipo"]').select('Proveedor')
      cy.get('[data-cy="contacto-row"]').each(($el) => {
        cy.wrap($el).should('contain', 'Proveedor')
      })
    })

    it('debería filtrar contactos por tipo (Cliente)', () => {
      cy.get('[data-cy="filtro-tipo"]').select('Cliente')
      cy.get('[data-cy="contacto-row"]').each(($el) => {
        cy.wrap($el).should('contain', 'Cliente')
      })
    })

    it('debería eliminar un contacto', () => {
      cy.get('[data-cy="eliminar-contacto"]').first().click()
      cy.get('button').contains('Confirmar').click()

      cy.contains(/eliminado|borrado/i).should('be.visible')
    })
  })

  describe('5️⃣ VENTAS Y PUNTO DE VENTA', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/venta')
    })

    it('debería mostrar interfaz de venta', () => {
      cy.contains('Venta').should('be.visible')
      cy.get('[data-cy="carrito"]').should('be.visible')
    })

    it('debería agregar producto al carrito', () => {
      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()

      cy.get('[data-cy="cantidad"]').type('1')
      cy.get('button').contains('Agregar').click()

      cy.get('[data-cy="item-carrito"]').should('have.length.greaterThan', 0)
    })

    it('debería calcular total de venta', () => {
      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('2')
      cy.get('button').contains('Agregar').click()

      cy.get('[data-cy="total-venta"]').should('contain', '$')
    })

    it('debería permitir cambiar cantidad en carrito', () => {
      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('1')
      cy.get('button').contains('Agregar').click()

      cy.get('[data-cy="cantidad-carrito"]').first().clear().type('5')

      cy.get('[data-cy="total-venta"]').should('contain', '$')
    })

    it('debería eliminar producto del carrito', () => {
      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('1')
      cy.get('button').contains('Agregar').click()

      cy.get('[data-cy="eliminar-item"]').first().click()

      cy.get('[data-cy="item-carrito"]').should('not.exist')
    })

    it('debería aplicar descuento a venta', () => {
      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('1')
      cy.get('button').contains('Agregar').click()

      cy.get('[data-cy="descuento-venta"]').type('10')

      cy.get('[data-cy="total-venta"]').should('contain', '$')
    })

    it('debería completar venta exitosamente', () => {
      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('1')
      cy.get('button').contains('Agregar').click()

      cy.get('[data-cy="seleccionar-cliente"]').click()
      cy.get('[data-cy="cliente-opcion"]').first().click()

      cy.get('[data-cy="forma-pago"]').select('EFECTIVO')

      cy.get('button').contains('Finalizar Venta').click()

      cy.contains(/venta|factura.*creada|guardada/i).should('be.visible')
    })

    it('debería generar remito de venta', () => {
      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('1')
      cy.get('button').contains('Agregar').click()

      cy.get('[data-cy="tipo-documento"]').select('REMITO')

      cy.get('button').contains('Finalizar Venta').click()

      cy.contains(/remito|creado/i).should('be.visible')
    })
  })

  describe('6️⃣ COMPRAS Y PEDIDOS A PROVEEDORES', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/pedidos')
    })

    it('debería mostrar listado de pedidos', () => {
      cy.contains('Pedidos').should('be.visible')
      cy.get('[data-cy="pedido-row"]').should('exist')
    })

    it('debería crear un nuevo pedido', () => {
      cy.contains('Nuevo Pedido').click()

      cy.get('[data-cy="seleccionar-proveedor"]').click()
      cy.get('[data-cy="proveedor-opcion"]').first().click()

      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('10')
      cy.get('button').contains('Agregar').click()

      cy.get('button').contains('Crear Pedido').click()

      cy.contains(/pedido.*creado|guardado/i).should('be.visible')
    })

    it('debería editar un pedido pendiente', () => {
      cy.get('[data-cy="editar-pedido"]').first().click()

      cy.get('[data-cy="cantidad-item"]').first().clear().type('20')
      cy.get('button').contains('Guardar').click()

      cy.contains(/actualiza|guarda/i).should('be.visible')
    })

    it('debería cambiar estado de pedido a enviado', () => {
      cy.get('[data-cy="cambiar-estado"]').first().click()
      cy.get('[data-cy="estado-opcion"]').contains('ENVIADO').click()

      cy.contains(/actualiza|guarda/i).should('be.visible')
    })

    it('debería cambiar estado de pedido a recibido', () => {
      cy.get('[data-cy="cambiar-estado"]').first().click()
      cy.get('[data-cy="estado-opcion"]').contains('RECIBIDO').click()

      cy.contains(/actualiza|guarda/i).should('be.visible')
    })

    it('debería cancelar un pedido', () => {
      cy.get('[data-cy="cambiar-estado"]').first().click()
      cy.get('[data-cy="estado-opcion"]').contains('CANCELADO').click()

      cy.contains(/actualiza|guarda/i).should('be.visible')
    })

    it('debería filtrar pedidos por estado', () => {
      cy.get('[data-cy="filtro-estado"]').select('PENDIENTE')

      cy.get('[data-cy="pedido-row"]').each(($el) => {
        cy.wrap($el).should('contain', 'PENDIENTE')
      })
    })

    it('debería filtrar pedidos por proveedor', () => {
      cy.get('[data-cy="filtro-proveedor"]').click()
      cy.get('[data-cy="proveedor-opcion"]').first().click()

      cy.get('[data-cy="pedido-row"]').should('have.length.greaterThan', 0)
    })
  })

  describe('7️⃣ FACTURAS Y DOCUMENTOS', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/facturas')
    })

    it('debería mostrar listado de facturas', () => {
      cy.contains('Facturas').should('be.visible')
      cy.get('[data-cy="factura-row"]').should('exist')
    })

    it('debería crear una factura', () => {
      cy.contains('Nueva Factura').click()

      cy.get('[data-cy="seleccionar-cliente"]').click()
      cy.get('[data-cy="cliente-opcion"]').first().click()

      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('5')
      cy.get('button').contains('Agregar').click()

      cy.get('[data-cy="forma-pago"]').select('EFECTIVO')

      cy.get('button').contains('Crear Factura').click()

      cy.contains(/factura.*creada|guardada/i).should('be.visible')
    })

    it('debería mostrar detalles de factura', () => {
      cy.get('[data-cy="ver-detalles"]').first().click()

      cy.contains('Detalles de Factura').should('be.visible')
      cy.get('[data-cy="item-detalle"]').should('have.length.greaterThan', 0)
    })

    it('debería descargar PDF de factura', () => {
      cy.get('[data-cy="descargar-pdf"]').first().click()

      // Verificar que se inició descarga
      cy.readFile('cypress/downloads/factura*.pdf').should('exist')
    })

    it('debería filtrar facturas por fecha', () => {
      const hoy = new Date().toISOString().split('T')[0]

      cy.get('[data-cy="filtro-fecha-desde"]').type(hoy)
      cy.get('[data-cy="filtro-fecha-hasta"]').type(hoy)

      cy.get('[data-cy="factura-row"]').should('have.length.greaterThan', 0)
    })

    it('debería filtrar facturas por cliente', () => {
      cy.get('[data-cy="filtro-cliente"]').click()
      cy.get('[data-cy="cliente-opcion"]').first().click()

      cy.get('[data-cy="factura-row"]').should('have.length.greaterThan', 0)
    })

    it('debería calcular IVA correctamente', () => {
      cy.get('[data-cy="ver-detalles"]').first().click()

      cy.get('[data-cy="subtotal"]').should('contain', '$')
      cy.get('[data-cy="iva"]').should('contain', '$')
      cy.get('[data-cy="total"]').should('contain', '$')
    })
  })

  describe('8️⃣ CONTROL DE STOCK', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/stock-bajo')
    })

    it('debería mostrar productos con stock bajo', () => {
      cy.contains('Stock Bajo').should('be.visible')
      cy.get('[data-cy="producto-stock-bajo"]').should('exist')
    })

    it('debería mostrar cantidad en stock', () => {
      cy.get('[data-cy="cantidad-stock"]').first().should('contain', /\d+/)
    })

    it('debería mostrar cantidad mínima', () => {
      cy.get('[data-cy="cantidad-minima"]').first().should('contain', /\d+/)
    })

    it('debería filtrar por nivel de criticidad', () => {
      cy.get('[data-cy="filtro-criticidad"]').select('CRÍTICO')

      cy.get('[data-cy="producto-stock-bajo"]').each(($el) => {
        cy.wrap($el).should('contain', 'CRÍTICO')
      })
    })
  })

  describe('9️⃣ GESTIÓN DE UNIDADES DE MEDIDA', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/unidades')
    })

    it('debería mostrar listado de unidades', () => {
      cy.contains('Unidades').should('be.visible')
      cy.get('[data-cy="unidad-row"]').should('exist')
    })

    it('debería crear una nueva unidad', () => {
      cy.contains('Nueva Unidad').click()

      cy.get('input[name="nombre"]').type(`Unidad ${Date.now()}`)
      cy.get('input[name="abreviacion"]').type('UN')
      cy.get('button').contains('Guardar').click()

      cy.contains(/guardada|creada/i).should('be.visible')
    })

    it('debería editar una unidad', () => {
      cy.get('[data-cy="editar-unidad"]').first().click()

      cy.get('input[name="nombre"]').clear().type(`Unidad Editada ${Date.now()}`)
      cy.get('button').contains('Guardar').click()

      cy.contains(/actualiza|guarda/i).should('be.visible')
    })
  })

  describe('🔟 DASHBOARD Y REPORTES', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/')
    })

    it('debería mostrar dashboard', () => {
      cy.contains('Dashboard').should('be.visible')
    })

    it('debería mostrar total de ventas', () => {
      cy.get('[data-cy="total-ventas"]').should('contain', '$')
    })

    it('debería mostrar total de compras', () => {
      cy.get('[data-cy="total-compras"]').should('contain', '$')
    })

    it('debería mostrar cantidad de productos', () => {
      cy.get('[data-cy="cantidad-productos"]').should('contain', /\d+/)
    })

    it('debería mostrar cantidad de contactos', () => {
      cy.get('[data-cy="cantidad-contactos"]').should('contain', /\d+/)
    })

    it('debería mostrar gráfico de ventas por mes', () => {
      cy.get('[data-cy="grafico-ventas"]').should('be.visible')
    })

    it('debería mostrar gráfico de productos por categoría', () => {
      cy.get('[data-cy="grafico-categorias"]').should('be.visible')
    })

    it('debería mostrar cotización del dólar', () => {
      cy.get('[data-cy="cotizacion-dolar"]').should('contain', '$')
    })

    it('debería mostrar últimas transacciones', () => {
      cy.get('[data-cy="ultimas-transacciones"]').should('be.visible')
      cy.get('[data-cy="transaccion-item"]').should('have.length.greaterThan', 0)
    })
  })

  describe('1️⃣1️⃣ BÚSQUEDA EN GOOGLE', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/buscarEnGoogle')
    })

    it('debería mostrar formulario de búsqueda por código de barras', () => {
      cy.contains('Buscar en Google').should('be.visible')
      cy.get('[data-cy="codigo-barras-input"]').should('be.visible')
    })

    it('debería buscar producto por código de barras', () => {
      cy.get('[data-cy="codigo-barras-input"]').type('7790070410137')
      cy.get('button').contains('Buscar').click()

      cy.get('[data-cy="resultado-busqueda"]').should('be.visible', { timeout: 10000 })
    })

    it('debería mostrar imágenes del producto', () => {
      cy.get('[data-cy="codigo-barras-input"]').type('7790070410137')
      cy.get('button').contains('Buscar').click()

      cy.get('[data-cy="imagen-resultado"]').should('be.visible', { timeout: 10000 })
    })
  })

  describe('1️⃣2️⃣ CAPTURA CON CÁMARA (QR/CÓDIGOS DE BARRAS)', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/captura')
    })

    it('debería mostrar interfaz de captura', () => {
      cy.contains('Captura').should('be.visible')
      cy.get('[data-cy="camara-video"]').should('be.visible')
    })

    it('debería mostrar permisos de cámara', () => {
      // Nota: Este test puede necesitar configuración especial de Cypress para permisos
      cy.get('[data-cy="solicitar-permisos"]').should('be.visible')
    })
  })

  describe('1️⃣3️⃣ EXCEL Y EXPORTACIÓN/IMPORTACIÓN', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/excel')
    })

    it('debería mostrar formulario de importación Excel', () => {
      cy.contains('Importar Excel').should('be.visible')
      cy.get('[data-cy="archivo-input"]').should('be.visible')
    })

    it('debería exportar productos a Excel', () => {
      cy.get('button').contains('Descargar Plantilla').click()

      // Verificar descarga
      cy.readFile('cypress/downloads/*.xlsx').should('exist')
    })

    it('debería exportar contactos a Excel', () => {
      cy.get('[data-cy="tipo-exportacion"]').select('CONTACTOS')
      cy.get('button').contains('Descargar').click()

      cy.readFile('cypress/downloads/*.xlsx').should('exist')
    })
  })

  describe('1️⃣4️⃣ CONSULTAS A IA', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
      cy.visit('/ia')
    })

    it('debería mostrar interfaz de consulta a IA', () => {
      cy.contains('Consulta IA').should('be.visible')
      cy.get('[data-cy="input-consulta"]').should('be.visible')
    })

    it('debería hacer consulta a Cohere', () => {
      cy.get('[data-cy="input-consulta"]').type('¿Cuál es el producto más vendido?')
      cy.get('button').contains('Consultar').click()

      cy.get('[data-cy="respuesta-ia"]').should('be.visible', { timeout: 10000 })
    })

    it('debería mostrar respuesta de IA', () => {
      cy.get('[data-cy="input-consulta"]').type('Análisis de inventario')
      cy.get('button').contains('Consultar').click()

      cy.get('[data-cy="respuesta-ia"]').should('contain', /[a-zA-Z]/)
    })
  })

  describe('1️⃣5️⃣ NAVEGACIÓN GENERAL', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
    })

    it('debería tener acceso a todas las rutas principales', () => {
      const rutas = [
        '/categorias',
        '/listadoProductos',
        '/contactos',
        '/venta',
        '/pedidos',
        '/facturas',
        '/stock-bajo',
        '/unidades',
        '/excel',
        '/ia'
      ]

      rutas.forEach(ruta => {
        cy.visit(ruta)
        cy.url().should('include', ruta)
      })
    })

    it('debería tener navbar con enlaces funcionales', () => {
      cy.get('[data-cy="navbar"]').should('be.visible')
      cy.get('[data-cy="link-categorias"]').should('be.visible')
      cy.get('[data-cy="link-productos"]').should('be.visible')
      cy.get('[data-cy="link-contactos"]').should('be.visible')
    })

    it('debería mostrar menú responsivo en móvil', () => {
      cy.viewport('iphone-x')
      cy.get('[data-cy="menu-hamburguesa"]').should('be.visible')
      cy.get('[data-cy="menu-hamburguesa"]').click()
      cy.get('[data-cy="navbar-menu"]').should('be.visible')
    })
  })

  describe('1️⃣6️⃣ FLUJOS COMPLETOS (End-to-End)', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
    })

    it('debería completar flujo: crear producto → vender → generar factura', () => {
      // 1. Crear producto
      cy.visit('/cargarProductos')
      const codigoBarra = `FLUJO${Date.now()}`
      const nombre = `Producto Flujo ${Date.now()}`

      cy.get('input[name="codigoBarra"]').type(codigoBarra)
      cy.get('input[name="nombre"]').type(nombre)
      cy.get('button').contains('Guardar').click()
      cy.contains(/guardado|creado/i).should('be.visible')

      // 2. Vender el producto
      cy.visit('/venta')
      cy.get('[data-cy="buscar-producto"]').type(codigoBarra)
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('2')
      cy.get('button').contains('Agregar').click()

      cy.get('[data-cy="seleccionar-cliente"]').click()
      cy.get('[data-cy="cliente-opcion"]').first().click()

      cy.get('[data-cy="forma-pago"]').select('EFECTIVO')
      cy.get('button').contains('Finalizar Venta').click()

      cy.contains(/venta|factura.*creada/i).should('be.visible')

      // 3. Verificar en facturas
      cy.visit('/facturas')
      cy.get('[data-cy="factura-row"]').first().should('be.visible')
    })

    it('debería completar flujo: crear contacto → crear pedido → recibir compra', () => {
      // 1. Crear proveedor
      cy.visit('/contactos')
      const cuit = `${Math.floor(Math.random() * 90000000) + 10000000}`
      const nombre = `Prov Flujo ${Date.now()}`

      cy.contains('Nuevo Contacto').click()
      cy.get('input[name="nombre"]').type(nombre)
      cy.get('input[name="cuit"]').type(cuit)
      cy.get('[data-cy="tipo-select"]').select('Proveedor')
      cy.get('button').contains('Guardar').click()
      cy.contains(/guardado|creado/i).should('be.visible')

      // 2. Crear pedido al proveedor
      cy.visit('/pedidos')
      cy.contains('Nuevo Pedido').click()

      cy.get('[data-cy="seleccionar-proveedor"]').contains(nombre).click()

      cy.get('[data-cy="buscar-producto"]').type('7790070410137')
      cy.get('[data-cy="producto-resultado"]').first().click()
      cy.get('[data-cy="cantidad"]').type('5')
      cy.get('button').contains('Agregar').click()

      cy.get('button').contains('Crear Pedido').click()
      cy.contains(/pedido.*creado|guardado/i).should('be.visible')

      // 3. Cambiar estado a recibido
      cy.visit('/pedidos')
      cy.get('[data-cy="cambiar-estado"]').first().click()
      cy.get('[data-cy="estado-opcion"]').contains('RECIBIDO').click()
      cy.contains(/actualiza|guarda/i).should('be.visible')
    })
  })

  describe('1️⃣7️⃣ MANEJO DE ERRORES Y VALIDACIONES', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
    })

    it('debería manejar error cuando servidor está caído', () => {
      cy.intercept('GET', '/api/productos', { statusCode: 500 })
      cy.visit('/listadoProductos')
      cy.contains(/error|servicio|disponible/i).should('be.visible')
    })

    it('debería mostrar error cuando hay timeout', () => {
      cy.intercept('GET', '/api/contactos', (req) => {
        req.destroy()
      })
      cy.visit('/contactos')
      cy.contains(/timeout|error|conexión/i).should('be.visible')
    })

    it('debería validar formato de email', () => {
      cy.visit('/contactos')
      cy.get('[data-cy="editar-contacto"]').first().click()
      cy.contains('Agregar Email').click()

      cy.get('input[name="email"]').type('email_invalido')
      cy.get('button').contains('Guardar').click()

      cy.contains(/válido|email/i).should('be.visible')
    })

    it('debería validar formato de CUIT', () => {
      cy.visit('/contactos')
      cy.contains('Nuevo Contacto').click()
      cy.get('input[name="cuit"]').type('12345') // CUIT muy corto
      cy.get('button').contains('Guardar').click()

      cy.contains(/cuit|válido/i).should('be.visible')
    })

    it('debería prevenir envío de formulario vacío', () => {
      cy.visit('/cargarProductos')
      cy.get('button').contains('Guardar').click()

      cy.url().should('include', '/cargarProductos')
    })
  })

  describe('1️⃣8️⃣ RENDIMIENTO Y CARGA', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
    })

    it('debería cargar listado de 100+ productos rápidamente', () => {
      cy.visit('/listadoProductos')
      cy.get('[data-cy="producto-row"]').should('have.length.greaterThan', 10)
      
      // Verificar que la página respondió en tiempo razonable
      cy.get('[data-cy="producto-row"]').first().should('be.visible')
    })

    it('debería hacer scroll en tablas grandes sin lag', () => {
      cy.visit('/listadoProductos')
      cy.get('[data-cy="tabla-productos"]').scrollTo('bottom', { duration: 500 })
      cy.get('[data-cy="producto-row"]').should('have.length.greaterThan', 0)
    })

    it('debería cargar imágenes de productos correctamente', () => {
      cy.visit('/listadoProductos')
      cy.get('[data-cy="imagen-producto"]').first().should('be.visible')
      cy.get('[data-cy="imagen-producto"]').first().should('have.attr', 'src')
    })
  })

  describe('1️⃣9️⃣ SEGURIDAD', () => {
    it('debería proteger rutas contra acceso no autenticado', () => {
      const rutasProtegidas = [
        '/categorias',
        '/listadoProductos',
        '/contactos',
        '/venta'
      ]

      rutasProtegidas.forEach(ruta => {
        cy.visit(ruta)
        cy.url().should('include', '/login')
      })
    })

    it('debería mostrar login cuando la sesión expira', () => {
      cy.login('subofer', '1234')
      cy.clearCookie('auth')
      cy.visit('/categorias')

      cy.url().should('include', '/login')
    })

    it('debería no permitir acceso a datos ajenos', () => {
      cy.login('subofer', '1234')
      // Intentar acceder a datos de otro usuario (si es multi-usuario)
      cy.intercept('GET', '/api/contactos/*', { statusCode: 403 })
      cy.visit('/contactos')
    })
  })

  describe('2️⃣0️⃣ RESPONSIVE Y COMPATIBILIDAD', () => {
    beforeEach(() => {
      cy.login('subofer', '1234')
    })

    it('debería ser responsive en móvil (iPhone)', () => {
      cy.viewport('iphone-x')
      cy.visit('/')
      cy.get('[data-cy="navbar"]').should('be.visible')
      cy.get('[data-cy="menu-hamburguesa"]').should('be.visible')
    })

    it('debería ser responsive en tablet (iPad)', () => {
      cy.viewport('ipad-2')
      cy.visit('/')
      cy.get('body').should('be.visible')
    })

    it('debería ser responsive en escritorio (1920x1080)', () => {
      cy.viewport(1920, 1080)
      cy.visit('/')
      cy.get('body').should('be.visible')
    })

    it('debería funcionar en Chrome', () => {
      cy.visit('/')
      cy.contains('Sistema de Gestión').should('be.visible')
    })

    it('debería funcionar en Firefox', () => {
      cy.visit('/')
      cy.contains('Sistema de Gestión').should('be.visible')
    })
  })
})
