'use server'
import prisma from "../prisma";
import { textos } from "@/lib/manipularTextos";
import { revalidatePath } from 'next/cache'

const revalidarProductos = () => revalidatePath("/cargarProductos");
export async function guardarProducto(formData) {
  // Transformación de datos básicos
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

  const relaciones = { update:{}, create:{} }

  // Preparación de los datos de relaciones
  if (formData.precioActual) {
    relaciones.create.precios = {
      create: [{ precio: transformedData.precioActual }],
    };
    relaciones.update.precios = {
      ...relaciones.create.precios,
    };
  }

  if (formData.categorias) {
    relaciones.create.categorias = {
      connect: formData.categorias.map(({id}) => ({id})),
    };
    relaciones.update.categorias = {
      set: [],
      ...relaciones.create.categorias,
    };
  }

  if (formData.proveedores) {
    relaciones.create.proveedores = {
      connect: formData.proveedores.map(({id}) => ({id})),
    };
    relaciones.update.proveedores = {
      set: [],
      ...relaciones.create.proveedores,
    };
  }

  try {
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
        proveedores: true,
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
    console.log('finaly, revalidar productos')
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