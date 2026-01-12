const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugProductos() {
  try {
    // Obtener primer producto
    const producto = await prisma.productos.findFirst({
      take: 1,
    });

    if (!producto) {
      console.log('No hay productos');
      process.exit(0);
    }

    console.log('Producto:', producto.id, producto.nombre);
    console.log('---');

    // Verificar referencias en DetalleDocumento
    const detalles = await prisma.detalleDocumento.findMany({
      where: { idProducto: producto.id }
    });
    console.log('DetalleDocumento:', detalles.length);
    if (detalles.length > 0) console.log(detalles);

    // Verificar referencias en Presentaciones
    const presentaciones = await prisma.presentaciones.findMany({
      where: { productoId: producto.id }
    });
    console.log('Presentaciones:', presentaciones.length);
    if (presentaciones.length > 0) console.log(presentaciones);

    // Verificar referencias en ProductoProveedor
    const proveedores = await prisma.productoProveedor.findMany({
      where: { productoId: producto.id }
    });
    console.log('ProductoProveedor:', proveedores.length);
    if (proveedores.length > 0) console.log(proveedores);

    // Verificar referencias en Precios
    const precios = await prisma.precios.findMany({
      where: { idProducto: producto.id }
    });
    console.log('Precios:', precios.length);
    if (precios.length > 0) console.log(precios);

    // Intentar eliminar
    console.log('---');
    console.log('Intentando eliminar...');
    
    try {
      await prisma.productos.delete({
        where: { id: producto.id }
      });
      console.log('✓ Eliminado correctamente');
    } catch (e) {
      console.log('✗ Error:', e.code, e.message);
    }

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

debugProductos();
