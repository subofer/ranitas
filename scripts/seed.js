const fs = require('fs');

// Path del package.json
const packagePath = './package.json';

// Leer el package.json
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Agregar type: module
packageJson.type = 'module';

// Escribir el package.json modificado
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');

// Correr el seed script
const { exec } = require('child_process');
exec('npx prisma db seed', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
  }
  console.log(`stdout: ${stdout}`);

  // Volver a quitar type: module
  delete packageJson.type;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
});
