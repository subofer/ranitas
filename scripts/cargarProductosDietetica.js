const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearProductosDietetica() {
  try {
    console.log('Iniciando carga de productos de dietética argentina...');

    // Limpiar productos existentes
    console.log('Limpiando productos existentes...');
    await prisma.presentaciones.deleteMany();
    await prisma.productoProveedor.deleteMany();
    await prisma.productos.deleteMany();
    await prisma.contactos.deleteMany({ where: { esProveedor: true } });

    // 1. Proteína de Suero
    const proteina = await prisma.productos.create({
      data: {
        codigoBarra: "779001234567890",
        nombre: "Proteína de Suero Premium",
        descripcion: "Proteína de suero de leche concentrada, ideal para recuperación muscular",
        size: 1,
        unidad: "kg",
        imagen: "/productos/proteina.jpg",
        categorias: {
          connectOrCreate: {
            where: { nombre: "Proteínas" },
            create: { nombre: "Proteínas" }
          }
        },
        proveedores: {
          create: {
            proveedor: {
              connectOrCreate: {
                where: { cuit: "30-12345678-9" },
                create: {
                  nombre: "Suplementos Argentinos SA",
                  cuit: "30-12345678-9",
                  telefono: "+54 11 1234-5678",
                  esProveedor: true
                }
              }
            },
            codigo: "PROT-001"
          }
        }
      }
    });

    // Crear presentaciones para la proteína
    await prisma.presentaciones.create({
      data: {
        nombre: "Proteína 1kg",
        productoId: proteina.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 1,
        unidadMedida: "kg",
        contenidoPorUnidad: 1000,
        unidadContenido: "g"
      }
    });

    await prisma.presentaciones.create({
      data: {
        nombre: "Proteína 2kg",
        productoId: proteina.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 2,
        unidadMedida: "kg",
        contenidoPorUnidad: 2000,
        unidadContenido: "g"
      }
    });

    await prisma.presentaciones.create({
      data: {
        nombre: "Proteína 500g",
        productoId: proteina.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 0.5,
        unidadMedida: "kg",
        contenidoPorUnidad: 500,
        unidadContenido: "g"
      }
    });

    // 2. Creatina Monohidrato
    const creatina = await prisma.productos.create({
      data: {
        codigoBarra: "779001234567891",
        nombre: "Creatina Monohidrato Pura",
        descripcion: "Creatina monohidrato micronizada para máxima absorción",
        size: 300,
        unidad: "g",
        imagen: "/productos/creatina.jpg",
        categorias: {
          connectOrCreate: {
            where: { nombre: "Aminoácidos" },
            create: { nombre: "Aminoácidos" }
          }
        },
        proveedores: {
          create: {
            proveedor: {
              connectOrCreate: {
                where: { cuit: "30-12345678-9" },
                create: {
                  nombre: "Suplementos Argentinos SA",
                  cuit: "30-12345678-9",
                  telefono: "+54 11 1234-5678",
                  esProveedor: true
                }
              }
            },
            codigo: "CREA-001"
          }
        }
      }
    });

    // Crear presentaciones para la creatina
    await prisma.presentaciones.create({
      data: {
        nombre: "Creatina 300g",
        productoId: creatina.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 300,
        unidadMedida: "g",
        contenidoPorUnidad: 300,
        unidadContenido: "g"
      }
    });

    await prisma.presentaciones.create({
      data: {
        nombre: "Creatina 500g",
        productoId: creatina.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 500,
        unidadMedida: "g",
        contenidoPorUnidad: 500,
        unidadContenido: "g"
      }
    });

    await prisma.presentaciones.create({
      data: {
        nombre: "Creatina 1kg",
        productoId: creatina.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 1000,
        unidadMedida: "g",
        contenidoPorUnidad: 1000,
        unidadContenido: "g"
      }
    });

    // 3. BCAA en pastillas
    const bcaa = await prisma.productos.create({
      data: {
        codigoBarra: "779001234567892",
        nombre: "BCAA 2:1:1 en Pastillas",
        descripcion: "Aminoácidos ramificados en relación 2:1:1 para recuperación muscular",
        size: 120,
        unidad: "pastillas",
        imagen: "/productos/bcaa.jpg",
        categorias: {
          connectOrCreate: {
            where: { nombre: "Aminoácidos" },
            create: { nombre: "Aminoácidos" }
          }
        },
        proveedores: {
          create: {
            proveedor: {
              connectOrCreate: {
                where: { cuit: "30-12345678-9" },
                create: {
                  nombre: "Suplementos Argentinos SA",
                  cuit: "30-12345678-9",
                  telefono: "+54 11 1234-5678",
                  esProveedor: true
                }
              }
            },
            codigo: "BCAA-001"
          }
        }
      }
    });

    // Crear presentaciones para BCAA
    await prisma.presentaciones.create({
      data: {
        nombre: "BCAA 120 pastillas",
        productoId: bcaa.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 120,
        unidadMedida: "pastillas",
        contenidoPorUnidad: 120,
        unidadContenido: "pastillas"
      }
    });

    await prisma.presentaciones.create({
      data: {
        nombre: "BCAA 240 pastillas",
        productoId: bcaa.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 240,
        unidadMedida: "pastillas",
        contenidoPorUnidad: 240,
        unidadContenido: "pastillas"
      }
    });

    // 4. Vitamina C efervescente
    const vitaminaC = await prisma.productos.create({
      data: {
        codigoBarra: "779001234567893",
        nombre: "Vitamina C Efervescente",
        descripcion: "Vitamina C de rápida absorción en tabletas efervescentes",
        size: 20,
        unidad: "comprimidos",
        imagen: "/productos/vitamina-c.jpg",
        categorias: {
          connectOrCreate: {
            where: { nombre: "Vitaminas" },
            create: { nombre: "Vitaminas" }
          }
        },
        proveedores: {
          create: {
            proveedor: {
              connectOrCreate: {
                where: { cuit: "30-87654321-0" },
                create: {
                  nombre: "Vitaminas del Sur",
                  cuit: "30-87654321-0",
                  telefono: "+54 11 9876-5432",
                  esProveedor: true
                }
              }
            },
            codigo: "VITC-001"
          }
        }
      }
    });

    // Crear presentaciones para Vitamina C
    await prisma.presentaciones.create({
      data: {
        nombre: "Vitamina C 20 efervescentes",
        productoId: vitaminaC.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 20,
        unidadMedida: "comprimidos",
        contenidoPorUnidad: 20,
        unidadContenido: "comprimidos"
      }
    });

    await prisma.presentaciones.create({
      data: {
        nombre: "Vitamina C 40 efervescentes",
        productoId: vitaminaC.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 40,
        unidadMedida: "comprimidos",
        contenidoPorUnidad: 40,
        unidadContenido: "comprimidos"
      }
    });

    // 5. Yerba Mate Orgánica
    const yerbaMate = await prisma.productos.create({
      data: {
        codigoBarra: "779001234567894",
        nombre: "Yerba Mate Orgánica Premium",
        descripcion: "Yerba mate orgánica certificada, cosecha argentina",
        size: 500,
        unidad: "g",
        imagen: "/productos/yerba-mate.jpg",
        categorias: {
          connectOrCreate: {
            where: { nombre: "Naturales" },
            create: { nombre: "Naturales" }
          }
        },
        proveedores: {
          create: {
            proveedor: {
              connectOrCreate: {
                where: { cuit: "30-11223344-5" },
                create: {
                  nombre: "Estancias del Mate",
                  cuit: "30-11223344-5",
                  telefono: "+54 0376 456-7890",
                  esProveedor: true
                }
              }
            },
            codigo: "YERBA-001"
          }
        }
      }
    });

    // Crear presentaciones para Yerba Mate
    await prisma.presentaciones.create({
      data: {
        nombre: "Yerba Mate 500g",
        productoId: yerbaMate.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 500,
        unidadMedida: "g",
        contenidoPorUnidad: 500,
        unidadContenido: "g"
      }
    });

    await prisma.presentaciones.create({
      data: {
        nombre: "Yerba Mate 1kg",
        productoId: yerbaMate.id,
        tipoPresentacionId: "e8d01ccc-917a-4467-b43b-30aa2b96275b",
        cantidad: 1000,
        unidadMedida: "g",
        contenidoPorUnidad: 1000,
        unidadContenido: "g"
      }
    });

    await prisma.presentaciones.create({
      data: {
        nombre: "Pack Yerba Mate 3x500g",
        productoId: yerbaMate.id,
        tipoPresentacionId: "4d3ecefc-a6d7-4202-b7d7-f457eb3e9640",
        cantidad: 3,
        unidadMedida: "unidades",
        contenidoPorUnidad: 500,
        unidadContenido: "g"
      }
    });

    console.log('✅ Productos de dietética argentina creados exitosamente:');
    console.log(`- ${proteina.nombre} (${proteina.presentaciones?.length || 0} presentaciones)`);
    console.log(`- ${creatina.nombre} (${creatina.presentaciones?.length || 0} presentaciones)`);
    console.log(`- ${bcaa.nombre} (${bcaa.presentaciones?.length || 0} presentaciones)`);
    console.log(`- ${vitaminaC.nombre} (${vitaminaC.presentaciones?.length || 0} presentaciones)`);
    console.log(`- ${yerbaMate.nombre} (${yerbaMate.presentaciones?.length || 0} presentaciones)`);

  } catch (error) {
    console.error('❌ Error creando productos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

crearProductosDietetica();
