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
    defaultCommandTimeout: 15000,
    requestTimeout: 20000,
    responseTimeout: 20000,
    watchForFileChanges: false,
    experimentalStudio: true,
    retries: {
      runMode: 2,
      openMode: 0
    },
    specPattern: 'cypress/e2e/**/*.cy.js',
    numTestsKeptInMemory: 1,
    chromeWebSecurity: false,
    trashAssetsBeforeRuns: true,
    waitForAnimations: true
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack'
    }
  }
})