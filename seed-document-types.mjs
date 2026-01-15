import { seedDocumentTypes } from './prisma/seedDocumentTypes.js';

async function main() {
  const result = await seedDocumentTypes();
  console.log('Resultado:', result);
  process.exit(result.success ? 0 : 1);
}

main().catch(console.error);