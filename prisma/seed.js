const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Crear categorías
  const sinCategoria = await prisma.categorias.create({
    data: {
      nombre: 'Sin Categoria'
    },
  });

  // Crear un proveedor
  const proveedor = await prisma.contactos.create({
    data: {
      cuit: '20-29906618-9',
      nombre: 'Las Ranitas',
      telefono: '',
      email: ''
    },
  });

  // Crear un producto con precio
  const producto = await prisma.productos.create({
    data: {
      codigoBarra: '7790520025401',
      nombre: 'Off Extra Duración en Aerosol',
      precioActual: 1,
      stock: 10,
      unidad: 'unidad',
      descripcion: 'Off Extra Duración en Aerosol X170 ml',
      proveedores: {
        connect: { id: proveedor.id }
      },
      categoria : {
        connect: { id: sinCategoria.id },
      },
      precios: {
        create: { precio: 1 }
      }
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
