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

export const getProductos = async () => {
  const productos = await prisma.productos.findMany({
    include:{
      categorias: true,
      precios: {
        orderBy: {
          createdAt: 'asc',
        },
        take: 1,
      },
      proveedores: {
        orderBy: {
          createdAt: 'desc',
        },
      }
    }
  })

  return productos
}

export const contarProductos = async () => await prisma.productos.count();

export const getProductoPorCodigoBarra = async (codigoBarra) => {
  const producto = await prisma.productos.findUnique({
    where: {
      codigoBarra: codigoBarra,
    },
    include: {
      categorias: true,
      proveedores: true,
      precios: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });

  // Aquí puedes definir el objeto por defecto que deseas retornar si no se encuentra el producto
  const respuestaPorDefecto = {error: true, msg: "producto no encontrado"}; // Ajusta esto según lo que necesites

  return producto || respuestaPorDefecto;
}
