"use server"

import prisma from "../prisma";

export const getMarcasSelect = async () => {
  const marcas = await prisma.contactos.findMany({
    where: { esMarca: true },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  });

  return marcas;
};
