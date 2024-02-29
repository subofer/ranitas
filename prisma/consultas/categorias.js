"use server"
import prisma from "../prisma";

export const getCategorias = async () => (
  await prisma.categorias.findMany()
);

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

