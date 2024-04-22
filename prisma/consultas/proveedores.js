"use server"
import prisma from "../prisma";
import { deleteContacto } from "../serverActions/contactos";

const incluirTodo = {
  include:{
    emails: true,
    productos: true,
    direcciones: {
      include: {
        provincia: true,
        localidad: true,
        calle: true,
      }
    }
  }
}

export const getProveedoresSelect = async () => {
  console.log('pero lo busca o no?')
  return await prisma.contactos.findMany({
    where: { esProveedor: true },
    orderBy: { nombre: 'asc' },
  });
};

export const getProveedoresByIds = async (idList) => {
  return await prisma.user.findMany({
    where: {
      id: {
        in: idList,
      },
    },
  });
}


export const getProveedoresCompletos = async () => {
  return await prisma.contactos.findMany({
    where: { esProveedor: true },
    orderBy: { nombre: 'asc' },
    ...incluirTodo,
  });
};

export const getProveedorByCuit = async (cuitBuscado) => (
  await prisma.contactos.findFirst({
    where: {
      cuit: cuitBuscado,
      esProveedor: true,
    },
    ...incluirTodo,
  })
);

export const getProveedorById = async (idProveedor) => (
  await prisma.contactos.findFirst({
    where: {
      id: idProveedor,
      esProveedor: true,
    },
    ...incluirTodo,
  })
);

export const deleteProveedor = async (idProveedor) => (
  await deleteContacto(idProveedor)
);
