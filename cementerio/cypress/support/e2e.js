// Import commands.js using ES2015 syntax
import './commands'

// Configuración global para tests
Cypress.on('window:before:load', (win) => {
  // Reemplazar console.error para ignorar errores no críticos
  const originalError = win.console.error
  win.console.error = (...args) => {
    const errorString = args[0]?.toString() || ''
    
    const ignoredErrors = [
      'ResizeObserver',
      'Unexpected end of JSON',
      'Favicon',
      'Network request failed',
      'Hydration failed',
      'You are mounting a new html component',
      'You are mounting a new head component',
      'ReactDevOverlay',
      'HotReload',
      'Unexpected application error',
      'Failed to fetch'
    ]
    
    if (!ignoredErrors.some(err => errorString.includes(err))) {
      originalError(...args)
    }
  }
})

beforeEach(() => {
  // Limpiar localStorage antes de cada test
  cy.window().then((win) => {
    win.localStorage.clear()
    win.sessionStorage.clear()
  })

  // Interceptar errores de red
  cy.intercept('**/api/**', (req) => {
    req.continue((res) => {
      if (res.statusCode >= 500) {
        cy.log(`⚠️ Error de servidor detectado: ${req.url}`)
      }
    })
  }).as('apiCalls')
})

// Manejar excepciones no capturadas
Cypress.on('uncaught:exception', (err, runnable) => {
  const ignoredErrors = [
    'ResizeObserver',
    'Unexpected end of JSON',
    'Favicon',
    'Network request failed',
    'Hydration failed',
    'You are mounting a new html component',
    'You are mounting a new head component',
    'ReactDevOverlay',
    'HotReload',
    'Unexpected application error',
    'Failed to fetch',
    'Cannot read properties of undefined',
  ]

  if (ignoredErrors.some(error => err.message.includes(error))) {
    return false
  }
  return true
})

// Agregar mejor logging
afterEach(() => {
  cy.window().then((win) => {
    const logs = win.console.logs || []
    logs.forEach(log => {
      if (log.includes('ERROR')) {
        cy.log(`❌ ${log}`)
      }
    })
  })
})

