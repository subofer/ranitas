"use server"
import prisma from "../prisma";

export const getProveedores = async () => (
  await prisma.proveedores.findMany({orderBy: [{nombre: 'asc'}]})
);


export const getProveedorByCuit = async (cuitProveedor) => (
  await prisma.proveedores.findFirst({
    where: {
      cuit: cuitProveedor,
    }
  })
);

export const getProveedorById = async (idProveedor) => (
  await prisma.proveedores.findFirst({
    where: {
      id: idProveedor,
    }
  })
);

export const deleteProveedor = async (idProveedor) => (
  await prisma.proveedores.delete({
    where: {
      id: idProveedor
    }
  })
);

