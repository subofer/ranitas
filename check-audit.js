const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAudit() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  
  console.log(`\n📊 Total de logs de auditoría mostrados: ${logs.length}\n`);
  console.log('═'.repeat(100));
  
  logs.forEach((log, index) => {
    console.log(`\n[${index + 1}] [${log.level}] ${log.action}`);
    console.log(`    Mensaje: ${log.message}`);
    console.log(`    Usuario: ${log.userId || '(sin usuario)'}`);
    console.log(`    Categoría: ${log.category}`);
    console.log(`    Ruta: ${log.path}`);
    if (log.metadata) {
      console.log(`    Metadata:`, JSON.stringify(log.metadata, null, 2));
    }
    console.log(`    Fecha: ${log.createdAt}`);
    console.log('─'.repeat(100));
  });
  
  await prisma.$disconnect();
}

checkAudit().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
