// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Configuración global para tests
beforeEach(() => {
  // Limpiar localStorage antes de cada test
  cy.window().then((win) => {
    win.localStorage.clear()
  })

  // Configurar interceptores globales si es necesario
  cy.intercept('GET', '/api/dolar', { fixture: 'dolar.json' }).as('getDolar')
})

// Configuración para manejar errores no capturados
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  // útil para errores de librerías externas que no afectan la funcionalidad
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  if (err.message.includes('Script error')) {
    return false
  }
  // Para otros errores, dejar que fallen los tests
  return true
})

// Configuración para screenshots automáticos en fallos
afterEach(function() {
  if (this.currentTest.state === 'failed') {
    // Tomar screenshot automático en caso de fallo
    const screenshotName = `${this.currentTest.title} -- ${Date.now()}`
    cy.screenshot(screenshotName, { capture: 'fullPage' })
  }
})