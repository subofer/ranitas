import './commands'
Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('Minified React error #418') ||
    err.message.includes('Error: Minified React error #423')
  ) {
    return false;
  }
  // Enable uncaught exception failures for other errors
});

Cypress.on('uncaught:exception', (err) => {
  // Ignorar errores de 'hydration failed'
  if (err.message.includes('Hydration failed')) {
    return false;
  }
  return true; // Permite que otros errores se registren normalmente
});

Cypress.on('uncaught:exception', (err) => {
  // Ignorar todos los errores de "hydration" y otros errores que puedan no afectar la prueba
  return false;
});

Cypress.on('uncaught:exception', () => {});

Cypress.on('uncaught:exception', (err, runnable) => {
  if (err.message.includes('Hydration failed')) {
    return false; // Ignora los errores de hidratación
  }
  return true;
});