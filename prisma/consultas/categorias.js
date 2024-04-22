"use server"
import prisma from "../prisma";

export const getCategorias = async () => {
 console.log('las categorias si las busca?')
 return await prisma.categorias.findMany({orderBy: [{nombre: 'asc'}]})
};

export const getCategoriasConteo = async () => (
  await prisma.categorias.findMany({
    select: {
      id: true,
      nombre: true,
      createdAt: true,
      _count: {
        select: { products: true },
      },
    },
  })
)

export const getCategoria = async (idCategoria) => (
  await prisma.categorias.findFirst({
    where: {
      id: idCategoria,
    }
  })
);

export const saveCategoria = async (nombre) => (
  await prisma.categorias.create({
    data: {
      nombre: nombre
    }
  })
);

export const deleteCategoria = async (idCategoria) => (
  await prisma.categorias.delete({
    where: {
      id: idCategoria
    }
  })
);

