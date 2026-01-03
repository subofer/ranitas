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
  return await prisma.contactos.findMany({
    where: { esProveedor: true },
    orderBy: { nombre: 'asc' },
  });
};

export const getProveedoresByIds = async (idList) => {
  return await prisma.contactos.findMany({
    where: {
      id: {
        in: idList,
      },
      esProveedor: true,
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

// Obtener productos de un proveedor específico con precios
export const getProductosPorProveedor = async (idProveedor) => {
  const proveedor = await prisma.contactos.findUnique({
    where: { id: idProveedor },
    select: {
      id: true,
      nombre: true,
      telefono: true,
      email: true,
      cuit: true
    }
  });

  const productos = await prisma.productos.findMany({
    where: {
      proveedores: {
        some: {
          idProveedor: idProveedor
        }
      }
    },
    include: {
      categorias: true,
      precios: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { nombre: 'asc' }
  });

  return {
    proveedor,
    productos
  };
};

// Obtener todos los proveedores con sus productos y precios
export const getProveedoresConProductos = async () => {
  return await prisma.contactos.findMany({
    where: { esProveedor: true },
    include: {
      productos: {
        include: {
          producto: {
            include: {
              categorias: true,
              precios: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          }
        }
      }
    },
    orderBy: { nombre: 'asc' }
  });
};
