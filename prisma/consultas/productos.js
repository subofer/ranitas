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
      productoId: idDelProducto,
    },
  });
  
  await prisma.productos.update({
    where: {
      id: idDelProducto,
    },
    data: {
      precioActual: nuevoPrecio,
    },
  });
}

export const getProductos = async () => await prisma.productos.findMany({
  include:{
    categoria: true,
    precios: {
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    }
  }
})

export const getProductoPorCodigoBarra = async (codigoBarra) => (
  await prisma.productos.findUnique({
    where: {
      codigoBarra: codigoBarra,
    },
    include: {
      categoria: true,
      precios: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
  })
)

