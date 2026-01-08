# 🧪 Guía para Generar Tests de Cypress - Consideraciones de Integración

## 📋 Contexto del Proyecto

**Stack:** Next.js 14+ con App Router + React + Custom Components + Cypress 15.8  
**Problema Descubierto:** Los componentes personalizados (especialmente Input) usan `position: fixed` y floating labels que cubren los elementos, causando problemas de interacción en Cypress.

---

## 🎯 Prompt para Generar Tests Específicos

### PROMPT BASE

```
Genera tests de Cypress E2E para [FUNCIONALIDAD].

CONSIDERACIONES CRÍTICAS:

1. **Componentes Personalizados (Input, Button):**
   - Los inputs tienen position: fixed y están cubiertos por floating labels
   - NO validar con .should('be.visible') - usar .should('exist') en su lugar
   - Usar force: true en click(), clear() y type() para forzar interacción
   - Validar valores con .invoke('val').should('equal', expectedValue) 
     en lugar de .should('have.value', expectedValue)

2. **Delays y Sincronización:**
   - Usar delay: 100 entre keystrokes: .type(text, { delay: 100, force: true })
   - Agregar cy.wait(300) después de rellenar inputs para que React procese
   - Agregar cy.wait(1000) después de clicks en botones con async handlers
   - Para formularios complejos, esperar la redirección: 
     cy.url({ timeout: 20000 }).should('not.include', '/pagina-anterior')

3. **Selectores Preferidos:**
   - Para inputs: usar ID primero (#nombre), luego name (input[name="nombre"])
   - Para botones: cy.get('button').contains('Texto del botón')
   - Para formularios: cy.get('form').should('exist')
   - Timeout mínimo: 10000ms para interacciones de usuario

4. **Estructura de Tests:**
   - beforeEach(): Limpiar localStorage/sessionStorage
   - afterEach(): Limpiar almacenamiento nuevamente
   - Use cy.login() custom command para autenticación
   - Verificar URLs como confirmación de éxito: cy.url().should('include', '/ruta')

5. **Patrón para Rellenar Formularios:**
   ```javascript
   // ✅ CORRECTO
   cy.get('#fieldName', { timeout: 10000 })
     .should('exist')
     .click({ force: true })
     .clear({ force: true })
     .type('value', { delay: 100, force: true })
     .invoke('val')
     .should('equal', 'value')
   
   cy.wait(300) // Esperar procesamiento React
   
   cy.get('button').contains('Guardar')
     .click({ force: true })
   
   cy.wait(1000) // Esperar async handler
   cy.url({ timeout: 15000 }).should('include', '/nueva-ruta')
   
   // ❌ INCORRECTO
   cy.get('input[name="fieldName"]').should('be.visible') // Fallará
   cy.get('input[name="fieldName"]').type('value') // Sin force, sin delay
   cy.get('input[name="fieldName"]').should('have.value', 'value') // No funciona con elementos cubiertos
   ```

6. **Errores Comunes a Evitar:**
   - No usar .should('be.visible') con componentes custom
   - No escribir sin delay en componentes React
   - No esperar respuesta del servidor sin cy.wait() adecuado
   - No verificar elementos sin timeout adecuado (mínimo 10000ms)
   - No asumir que el valor se actualizó sin un cy.wait()

7. **Verificaciones de Éxito:**
   - Cambio de URL (redirección)
   - Aparición de mensaje de éxito/error
   - Cambio en el DOM (elemento nuevo, elemento removido)
   - Cambio en localStorage/sessionStorage
   - Visibilidad de nuevo elemento

8. **Comandos Personalizados Disponibles:**
   - cy.login(username, password) - Login automático
   - cy.logout() - Logout con limpieza de storage
   - cy.fillInput(name, value) - Rellena inputs con todas las consideraciones
   - cy.loginAndVisit(path, username, password) - Login y navega
   - cy.createCategory(nombre) - Crear categoría (ejemplo)

Genera entre 3-5 tests que cubran:
- Caso exitoso principal
- Caso con datos inválidos/faltantes
- Caso con errores del servidor (si aplica)
- Verificación de persistencia de datos
- Navegación post-acción

Estructura cada test con describe(), it(), beforeEach(), afterEach().
Incluye logs descriptivos con cy.log() para debugging.
```

---

## 💡 Plantillas de Tests por Tipo

### Template 1: Test de Formulario Simple

```javascript
describe('Nombre de la Funcionalidad', () => {
  beforeEach(() => {
    // Limpiar almacenamiento
    cy.window().then((win) => {
      win.localStorage.clear()
      win.sessionStorage.clear()
    })
    // Navegar a la página
    cy.visit('/ruta-pagina')
    cy.url({ timeout: 15000 }).should('include', '/ruta-pagina')
  })

  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
      win.sessionStorage.clear()
    })
  })

  it('debería [acción esperada] exitosamente', () => {
    // Verificar que se ven los elementos iniciales
    cy.get('form', { timeout: 10000 }).should('exist')
    cy.contains('Algún Texto', { timeout: 10000 }).should('exist')

    // Rellenar formulario
    cy.get('#nombreCampo', { timeout: 10000 })
      .should('exist')
      .click({ force: true })
      .clear({ force: true })
      .type('valor', { delay: 100, force: true })
      .invoke('val')
      .should('equal', 'valor')

    cy.wait(300)

    cy.get('#otroCampo', { timeout: 10000 })
      .should('exist')
      .click({ force: true })
      .clear({ force: true })
      .type('otro valor', { delay: 100, force: true })
      .invoke('val')
      .should('equal', 'otro valor')

    cy.wait(300)

    // Enviar formulario
    cy.get('button').contains('Guardar', { timeout: 10000 })
      .should('exist')
      .click({ force: true })

    cy.wait(1000)

    // Verificar éxito
    cy.contains(/guardado|creado|actualizado/i, { timeout: 10000 }).should('exist')
    cy.url({ timeout: 15000 }).should('include', '/nueva-ruta')
  })

  it('debería mostrar error con datos inválidos', () => {
    cy.get('form', { timeout: 10000 }).should('exist')

    // Rellenar con datos inválidos
    cy.get('#email', { timeout: 10000 })
      .click({ force: true })
      .type('email-invalido', { delay: 100, force: true })

    cy.wait(300)

    cy.get('button').contains('Guardar').click({ force: true })
    cy.wait(1000)

    // Verificar que sigue en la misma página
    cy.url({ timeout: 10000 }).should('include', '/ruta-pagina')
    cy.contains(/error|inválido/i, { timeout: 10000 }).should('exist')
  })
})
```

### Template 2: Test de Lista/CRUD

```javascript
describe('CRUD de [Entidad]', () => {
  beforeEach(() => {
    cy.login('usuario', 'contraseña')
    cy.visit('/[entidades]')
    cy.url({ timeout: 15000 }).should('include', '/[entidades]')
  })

  it('debería listar todos los [entidades]', () => {
    cy.get('table, ul, div[role="list"]', { timeout: 10000 }).should('exist')
    cy.get('tr, li, [role="listitem"]', { timeout: 10000 }).should('have.length.greaterThan', 0)
  })

  it('debería crear un nuevo [entidad]', () => {
    cy.contains('Nuevo|Nueva|Crear', { timeout: 10000 }).click()
    cy.url({ timeout: 15000 }).should('include', '/[entidades]/nuevo')

    // Rellenar formulario (usar patrón de arriba)
    cy.get('#nombre').click({ force: true })
      .clear({ force: true })
      .type('Mi Nueva Entidad', { delay: 100, force: true })

    cy.wait(300)
    cy.get('button').contains('Guardar').click({ force: true })
    cy.wait(1000)

    // Verificar que aparece en la lista
    cy.contains('Mi Nueva Entidad', { timeout: 10000 }).should('exist')
  })

  it('debería actualizar un [entidad] existente', () => {
    // Encontrar un item y hacer click para editar
    cy.get('tr, li, [role="listitem"]', { timeout: 10000 })
      .first()
      .click({ force: true })

    cy.url({ timeout: 15000 }).should('include', '/[entidades]/')

    // Actualizar campo
    cy.get('#nombre').clear({ force: true })
      .type('Nombre Actualizado', { delay: 100, force: true })

    cy.wait(300)
    cy.get('button').contains('Guardar').click({ force: true })
    cy.wait(1000)

    // Verificar
    cy.contains('Nombre Actualizado', { timeout: 10000 }).should('exist')
  })

  it('debería eliminar un [entidad]', () => {
    cy.get('tr, li, [role="listitem"]', { timeout: 10000 })
      .first()
      .within(() => {
        cy.contains('Eliminar|Borrar').click({ force: true })
      })

    // Confirmar eliminación si hay modal
    cy.get('button').contains('Confirmar|Aceptar|Si', { timeout: 10000 })
      .click({ force: true })

    cy.wait(1000)
    cy.contains(/eliminado|borrado/i, { timeout: 10000 }).should('exist')
  })
})
```

### Template 3: Test de Flujo Completo

```javascript
describe('Flujo Completo de [Proceso]', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
      win.sessionStorage.clear()
    })
  })

  it('debería completar el flujo de [proceso] exitosamente', () => {
    // Paso 1: Login
    cy.visit('/')
    cy.url({ timeout: 15000 }).should('include', '/login')
    cy.login('usuario', 'contraseña')
    cy.url({ timeout: 20000 }).should('not.include', '/login')

    // Paso 2: Navegar a sección
    cy.visit('/[seccion]')
    cy.contains('[Título esperado]', { timeout: 10000 }).should('exist')

    // Paso 3: Realizar acción
    cy.contains('Crear|Nuevo').click({ force: true })
    cy.url({ timeout: 15000 }).should('include', '/[seccion]/nuevo')

    // Paso 4: Rellenar formulario multi-paso
    cy.get('#campo1').click({ force: true })
      .type('valor1', { delay: 100, force: true })
    cy.wait(300)

    cy.get('#campo2').click({ force: true })
      .type('valor2', { delay: 100, force: true })
    cy.wait(300)

    // Paso 5: Completar
    cy.get('button').contains('Completar|Guardar').click({ force: true })
    cy.wait(1000)

    // Paso 6: Verificar resultado
    cy.contains(/éxito|completado|guardado/i, { timeout: 10000 }).should('exist')
    cy.url({ timeout: 15000 }).should('include', '/[seccion]')

    // Paso 7: Logout
    cy.logout()
    cy.url({ timeout: 10000 }).should('include', '/login')
  })
})
```

---

## 🔍 Checklist para Generar Tests

Cuando generes un test, verifica que incluya:

- [ ] **Setup correcto:** beforeEach con limpieza de localStorage
- [ ] **Timeouts adecuados:** Mínimo 10000ms para encontrar elementos
- [ ] **force: true:** En todos los click, clear y type
- [ ] **Delays:** delay: 100 en type(), cy.wait(300) después de inputs
- [ ] **Validación correcta:** .invoke('val') en lugar de .should('have.value')
- [ ] **Verificación de éxito:** Cambio de URL o mensaje visible
- [ ] **Cleanup:** afterEach con limpieza de almacenamiento
- [ ] **Logs descriptivos:** cy.log() para tracing
- [ ] **Nombres descriptivos:** Tests que expliquen qué hace (should statement)
- [ ] **Manejo de errores:** Casos negativos y error handling

---

## 🛠️ Solución de Problemas

### Problema: "Element is not visible"
**Solución:** Agregar `{ force: true }` a click/clear/type

### Problema: "Expected input to have value X but got Y"
**Solución:** Cambiar a `.invoke('val').should('equal', X)` y agregar `cy.wait(300)`

### Problema: "Timed out retrying after 10000ms"
**Solución:** Aumentar timeout a 15000ms o verificar selector con `cy.get('selector').debug()`

### Problema: "Element is not actionable"
**Solución:** 
1. Agregar `{ force: true }`
2. Agregar delays con `{ delay: 100 }`
3. Verificar que el elemento existe con `.should('exist')`
4. No validar visibilidad, solo existencia

### Problema: "Form value not updating"
**Solución:** Agregar más delays, aumentar de 300ms a 500ms o 1000ms

---

## 📊 Matriz de Decisión para Validaciones

| Situación | Validación | Ejemplo |
|-----------|-----------|---------|
| Verificar que input tiene valor | `.invoke('val').should('equal', value)` | `.invoke('val').should('equal', 'Juan')` |
| Verificar que elemento existe | `.should('exist')` | `cy.get('#nombre').should('exist')` |
| Verificar visibilidad (solo si está realmente visible) | `.should('be.visible')` | `cy.get('button').contains('Guardar').should('be.visible')` |
| Verificar que desapareció | `.should('not.exist')` | `cy.contains('error').should('not.exist')` |
| Verificar redirección | `.should('include', '/ruta')` | `cy.url().should('include', '/dashboard')` |
| Verificar clase CSS | `.should('have.class', 'className')` | `.should('have.class', 'hidden')` |
| Verificar atributo | `.should('have.attr', 'attr', 'value')` | `.should('have.attr', 'disabled')` |
| Verificar texto | `.contains('texto')` o `.should('contain', 'texto')` | `cy.contains('Guardado')` |

---

## 🎬 Ejemplo Completo Comentado

```javascript
describe('Crear Nueva Categoría', () => {
  // Setup antes de cada test
  beforeEach(() => {
    // Limpiar datos del navegador
    cy.window().then((win) => {
      win.localStorage.clear()
      win.sessionStorage.clear()
    })
    
    // Hacer login (usa custom command que tiene todas las consideraciones)
    cy.login('subofer', '1234')
    
    // Navegar a la página de categorías
    cy.visit('/categorias')
    
    // Esperar a que la página cargue
    cy.url({ timeout: 15000 }).should('include', '/categorias')
  })

  // Cleanup después de cada test
  afterEach(() => {
    cy.window().then((win) => {
      win.localStorage.clear()
      win.sessionStorage.clear()
    })
  })

  // Test principal
  it('debería crear una nueva categoría exitosamente', () => {
    // Log para debugging
    cy.log('Iniciando creación de categoría')

    // Verificar que se ve el botón de crear
    cy.contains('Nueva Categoría', { timeout: 10000 })
      .should('exist')
      .click({ force: true })

    // Esperar que se abra el formulario
    cy.url({ timeout: 15000 }).should('include', '/categorias/nuevo')

    // Log
    cy.log('Rellenando formulario')

    // Rellenar el campo de nombre
    // IMPORTANTE: usar force:true, delay:100, e invoke('val') para validar
    cy.get('#nombre', { timeout: 10000 })
      .should('exist')                          // Solo verifica existencia
      .click({ force: true })                   // Fuerza click si está cubierto
      .clear({ force: true })                   // Fuerza limpiar
      .type('Mi Nueva Categoría', {             // Escribe con delays
        delay: 100,
        force: true
      })
      .invoke('val')                            // Obtiene el valor
      .should('equal', 'Mi Nueva Categoría')    // Verifica el valor

    // Esperar que React procese el cambio
    cy.wait(300)

    // Log
    cy.log('Enviando formulario')

    // Hacer click en guardar
    cy.get('button', { timeout: 10000 })
      .contains('Guardar')
      .should('exist')
      .click({ force: true })

    // Esperar que se procese el submit (async handler)
    cy.wait(1000)

    // Log
    cy.log('Verificando resultado')

    // Verificar que se muestra mensaje de éxito
    cy.contains(/creada|guardada|actualizado/i, { timeout: 10000 })
      .should('exist')

    // Verificar que se redirige a la lista
    cy.url({ timeout: 15000 }).should('include', '/categorias')

    // Verificar que la nueva categoría aparece en la lista
    cy.contains('Mi Nueva Categoría', { timeout: 10000 }).should('exist')
  })

  it('debería mostrar error si el nombre es vacío', () => {
    cy.contains('Nueva Categoría').click({ force: true })
    cy.url({ timeout: 15000 }).should('include', '/categorias/nuevo')

    // Intentar enviar sin rellenar
    cy.get('button').contains('Guardar').click({ force: true })
    cy.wait(1000)

    // Debe mostrar error
    cy.contains(/requerido|obligatorio|campo vacío/i, { timeout: 10000 })
      .should('exist')

    // Debe mantenerse en la página
    cy.url({ timeout: 10000 }).should('include', '/categorias/nuevo')
  })
})
```

---

## 📚 Referencias Útiles

**Archivos Clave del Proyecto:**
- `cypress/support/commands.js` - Comandos personalizados disponibles
- `cypress/support/e2e.js` - Configuración global de e2e
- `cypress.config.js` - Configuración de Cypress
- `app/components/formComponents/Input.jsx` - Componente Input (entiender su estructura)
- `cypress/e2e/auth.cy.js` - Ejemplo de tests que funcionan

**Problemas Conocidos:**
- Inputs con `position: fixed` + floating label cubren el elemento
- React components requieren delays para procesar state
- localStorage/sessionStorage deben limpiarse entre tests
- Algunos elementos requieren `force: true` incluso sin errores aparentes

**Mejores Prácticas:**
- Siempre usar timeouts, mínimo 10000ms
- Siempre limpiar storage en beforeEach y afterEach
- Usar cy.log() abundantemente para debugging
- Verificar selectores con `cy.get('selector').debug()`
- Hacer tests pequeños y enfocados
- Evitar assumptions sobre timing, siempre esperar explícitamente

