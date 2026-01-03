"use server"
import prisma from "../prisma";

export const ultimoPrecioDelProducto = async (idDelProducto) => await prisma.precios.findFirst({
  where: {
    productoId: idDelProducto,
  },
  orderBy: {
    createdAt: 'desc',
  },
});

export const nuevoPrecioProducto = async (idDelProducto, nuevoPrecio) => {
  await prisma.precios.create({
    data: {
      precio: nuevoPrecio,
      idProducto: idDelProducto,
    },
  });
}


export const getProductos = async () => {
  const productos = await prisma.productos.findMany({
    include: {
      categorias: true,
      precios: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
      proveedores: {
        orderBy: {
          createdAt: 'desc', // Ordenar en ProductoProveedor
        },
        include: {
          proveedor: true, // Incluir información del proveedor
        },
      },
      presentaciones: {
        include: {
          tipoPresentacion: true,
          contenidas: {
            include: {
              presentacionContenida: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
          contenedoras: {
            include: {
              presentacionContenedora: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return productos;
};

export const contarProductos = async () => await prisma.productos.count();

export const getProductoPorCodigoBarra = async (codigoBarra) => {
  const producto = await prisma.productos.findUnique({
    where: {
      codigoBarra: codigoBarra,
    },
    include: {
      categorias: true,
      proveedores: {
        include: {
          proveedor: true, // Incluir los detalles del proveedor desde la tabla intermedia
        },
      },
      precios: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      presentaciones: {
        include: {
          tipoPresentacion: true,
          contenidas: {
            include: {
              presentacionContenida: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
          contenedoras: {
            include: {
              presentacionContenedora: {
                include: {
                  tipoPresentacion: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Aquí puedes definir el objeto por defecto que deseas retornar si no se encuentra el producto
  const respuestaPorDefecto = {error: true, msg: "producto no encontrado"}; // Ajusta esto según lo que necesites

  return producto || respuestaPorDefecto;
}
