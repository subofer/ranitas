'use server'
import prisma from "../prisma";
import formToObject from "@/lib/formToObject"
import { revalidatePath } from 'next/cache'

export async function guardarProducto(formData) {
  const productObject = formToObject(formData)

  const categoriaId = parseInt(productObject.categoriaId) || 0;
  productObject.size = parseInt(productObject.size) || 0;
  const precio = parseFloat(productObject.precioActual) || 0;
  productObject.precioActual = precio

  delete productObject.categoriaId;
  delete productObject.precio;
  delete productObject.filterSelect;
  let response = ""
  try{
    await prisma.productos.create({
      data: {
        ...productObject,
        categoriaId,
        precios: {
          create: [{ precio }],
        },
      }
    })
    response = {error: false, msg:"Producto guardado con exito"}
  } catch(e) {
    console.log(e)
    console.log(e.code)
    console.log(e.meta)
    if(e.code == "P2002"){
      response = { meta: e.meta, error:true, msg:`Ya existe un producto con ${e.meta.target[0]} = ${productObject[e.meta.target[0]]}`}
      console.log(response)
    }

  }
  revalidatePath('/productos')
  return response
}

export async function guardarProductoBuscado(productObject) {
  const categoriaId = parseInt(productObject.categoriaId);
  const precio = parseFloat(productObject.precioActual) || 0;
  let response = ""
  try{
    await prisma.productos.create({
      data: {
        ...productObject,
        categoriaId,
        precios: {
          create: [{ precio }],
        },
      }
    })
    response = {error: false, msg:"Producto guardado con exito"}
  } catch(e) {
    if(e.code == "P2002"){
      response = { meta: e.meta, error:true, msg:`Ya existe un producto con ${e.meta.target[0]} = ${productObject[e.meta.target[0]]}`}
      console.log(response)
    }

  }
  revalidatePath('/productos')
  return response
}

export async function eliminarProductoConPreciosPorId(productoId) {
  const resultado = await prisma.$transaction(async (prisma) => {
    // Eliminar precios asociados al producto
    await prisma.precios.deleteMany({
      where: {
        productoId: productoId,
      },
    });

    // Eliminar el producto
    return await prisma.productos.delete({
      where: {
        id: productoId,
      },
    });
  });
  revalidatePath('/productos')
  return resultado;
}