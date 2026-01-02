const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    watchForFileChanges: false,
    experimentalStudio: true,
    retries: {
      runMode: 2,
      openMode: 0
    },
    specPattern: 'cypress/e2e/**/*.cy.js'
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack'
    }
  }
})