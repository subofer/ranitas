'use server'
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
    stock: parseInt(formData.stock) || 0,
    size: parseFloat(formData.size) || null,
    precioActual: parseFloat(formData.precioActual) || 0,
    nombre: textos.mayusculas.primeras(formData.nombre),
  };

  const relaciones = { update: {}, create: {} };

  if (formData.precioActual) {
    relaciones.create.precios = {
      create: [{ precio: transformedData.precioActual }],
    };
    relaciones.update.precios = relaciones.create.precios;
  }

  if (formData.categorias) {
    relaciones.create.categorias = {
      connect: formData.categorias.map(({ id }) => ({ id })),
    };
    relaciones.update.categorias = relaciones.create.categorias;
  }

  if (formData.proveedores.length > 0) {
    const proveedoresValidos = formData.proveedores.map(p => p.proveedor).filter(p => p.id); // Solo con ID
    console.log('proveedoresValidos', proveedoresValidos)
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

  try {
    // Paso 1: Eliminar relaciones de proveedores anteriores que no están en el form
    await prisma.productoProveedor.deleteMany({
      where: {
        productoId: formData.id,
        proveedorId: { notIn: formData.proveedores.map(p => p.proveedor.id) }
      }
    });

    // Paso 2: Upsert del producto
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
        precios: true,
        proveedores: true, // Esto incluye los códigos por proveedor
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