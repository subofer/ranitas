"use server"
import prisma from "../prisma";
import { textos } from "@/lib/manipularTextos";
import { revalidatePath } from 'next/cache'

const revalidarProductos = () => revalidatePath("/cargarProductos");

export async function guardarProducto(formData) {
  const transformedData = {
    codigoBarra: formData.codigoBarra,
    descripcion: formData.descripcion,
    unidad: formData.unidad,
    imagen: formData.imagen,
    size: parseFloat(formData.size) || null,
    nombre: textos.mayusculas.primeras(formData.nombre),
  };

  const relaciones = { update: {}, create: {} };

  if (formData.categorias) {
    // Para update, primero desconectar todas las categorías existentes
    if (formData.id) {
      relaciones.update.categorias = {
        set: [], // Desconectar todas primero
        connect: formData.categorias.map(({ id }) => ({ id })), // Luego conectar las nuevas
      };
    } else {
      // Para create, solo conectar
      relaciones.create.categorias = {
        connect: formData.categorias.map(({ id }) => ({ id })),
      };
    }
  } else if (formData.id) {
    // Si no hay categorías pero es update, desconectar todas
    relaciones.update.categorias = {
      set: [],
    };
  }

  if (formData.proveedores?.length > 0) {
    const proveedoresValidos = formData.proveedores.map(p => p.proveedor).filter(p => p.id); // Solo con ID
    relaciones.create.proveedores = {
      connectOrCreate: proveedoresValidos.map(({ id, codigoProveedor }) => ({
        where: {
          proveedorId_productoId: {
            proveedorId: id, // Usa el ID del proveedor
            productoId: formData.id
          },
        },
        create: {
          proveedor: { connect: { id } }, // Conectá el proveedor existente
          codigo: codigoProveedor || formData.nombre, // Usá el código o el nombre del producto
        },
      })),
    };
    relaciones.update.proveedores = relaciones.create.proveedores;
  }

  // Manejar presentaciones - Eliminar todas las existentes y crear las nuevas
  if (formData.id) {
    // Primero eliminar todas las presentaciones existentes del producto
    await prisma.presentaciones.deleteMany({
      where: {
        productoId: formData.id
      }
    });
  }

  // Crear todas las presentaciones nuevas
  if (formData.presentaciones?.length > 0) {
    relaciones.create.presentaciones = {
      create: formData.presentaciones.map(presentacion => ({
        nombre: presentacion.nombre,
        tipoPresentacionId: presentacion.tipoPresentacionId,
        cantidad: parseFloat(presentacion.cantidad) || 1,
        unidadMedida: presentacion.unidadMedida,
        contenidoPorUnidad: presentacion.contenidoPorUnidad ? parseFloat(presentacion.contenidoPorUnidad) : null,
        unidadContenido: presentacion.unidadContenido || null,
      })),
    };
    relaciones.update.presentaciones = relaciones.create.presentaciones;
  }

  try {
    // Solo eliminar proveedores no deseados si es un update y hay proveedores
    if (formData.id && formData.proveedores?.length >= 0) {
      const proveedoresIds = formData.proveedores
        .map(p => p.proveedor?.id)
        .filter(id => id); // Filtrar IDs válidos

      if (proveedoresIds.length > 0) {
        await prisma.productoProveedor.deleteMany({
          where: {
            productoId: formData.id,
            proveedorId: { notIn: proveedoresIds }
          }
        });
      }
    }

    const producto = await prisma.productos.upsert({
      where: { codigoBarra: formData.codigoBarra },
      update: {
        ...transformedData,
        ...relaciones.update,
      },
      create: {
        ...transformedData,
        ...relaciones.create,
      },
      include: {
        categorias: true,
        proveedores: true, // Esto incluye los códigos por proveedor
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

    return { error: false, msg: "Producto procesado con éxito", data: producto };
  } catch (error) {
    console.error("Error al guardar el producto:", error);
    let msg = "Error al procesar el producto";
    if (error.code === "P2002") {
      msg = `Ya existe un producto con el código de barras ${formData.codigoBarra}.`;
    }
    return { error: true, msg, data: null };
  } finally {
    revalidarProductos();
  }
}









export async function guardarProductoBuscado(productObject) {
  const response = await guardarProducto(productObject)
  revalidarProductos();
  return response
}

export async function eliminarProductoConPreciosPorId(idProducto) {
  try{
    const resultado = await prisma.$transaction(async (prisma) => {
      // Eliminar precios asociados al producto
      const resultadoBorrarPrecios = await prisma.precios.deleteMany({
        where: {
          idProducto: idProducto,
        },
      });

      // Eliminar el producto
      const resultadoBorrarProducto = await prisma.productos.delete({
        where: {
          id: idProducto,
        },
      });
      return {resultadoBorrarPrecios, resultadoBorrarProducto}
    });
    return resultado;
  }catch(e){
    let msg;
    switch (e.code) {
      case "P2003":
        msg = {
          title: '¡No se borro!',
          text: 'No se puede borrar este producto, esta cargado en facturas',
          icon: 'info',
        }
      break;
      default:
        msg = {
          title: '¡No se borro!',
          text: e.code,
          icon: 'info',
        }
      break;
      }

    return {error: true, code: e.code, msg}
  } finally {
    revalidarProductos();
  }
}