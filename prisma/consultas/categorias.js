"use server"/*
export const getCategoria = async (idCategoria) => 
  await prisma.categorias.findFirst({
    where: {
      id: idCategoria,
    }
  });
*/
export const getCategorias = async () => await prisma.categorias.findMany();
