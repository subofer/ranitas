const { eliminarProductoConPreciosPorId } = require('./prisma/serverActions/productos');

async function testDelete() {
  try {
    // Buscar un producto válido para probar
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const producto = await prisma.productos.findFirst({
      include: { precios: true, detalleDocumento: true }
    });
    
    if (!producto) {
      console.log('No hay productos disponibles');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`\nProbando eliminación de: ${producto.nombre} (ID: ${producto.id})`);
    console.log(`Precios: ${producto.precios.length}`);
    console.log(`Detalles de documento: ${producto.detalleDocumento.length}`);
    
    // Intentar eliminar
    const resultado = await eliminarProductoConPreciosPorId(producto.id, 'testUser');
    console.log('\nResultado:', JSON.stringify(resultado, null, 2));
    
    // Verificar auditoría
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('\n📊 Últimos logs de auditoría:');
    logs.forEach(log => {
      console.log(`[${log.level}] ${log.action} - Usuario: ${log.userId} - Metadata:`, log.metadata);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testDelete();
