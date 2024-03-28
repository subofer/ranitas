'use server'
import prisma from "../prisma";
import formToObject from "@/lib/formToObject"
import { textos } from "@/lib/manipularTextos";
import { revalidatePath } from 'next/cache'

export async function guardarProducto(prevState, formData, formDataReady) {
  const productObject = formData ? formToObject(formData) : formToObject(prevState);

  productObject.categoriaId = parseInt(productObject.categoriaId, 10) || null;
  productObject.size = parseFloat(productObject.size) || null;
  const precioActual = parseFloat(productObject.precioActual) || 0;
  productObject.precioActual = precioActual
  productObject.nombre = textos.mayusculas.primeras(productObject.nombre);

  delete productObject.precio;
  delete productObject.filterSelect;

  let response = "";

  try {
    const productoExistente = await prisma.productos.findUnique({
      where: { codigoBarra: productObject.codigoBarra },
    });

    if (productoExistente) {
      // Producto existe, verifica si el precio ha cambiado.
      if (productoExistente.precioActual !== precioActual) {
        // Crea un nuevo registro de precio.
        await prisma.precios.create({
          data: {
            precio: precioActual,
            productoId: productoExistente.id,
          },
        });
      }

      // Actualiza el producto existente (excluyendo la creación de un precio directamente aquí).
      await prisma.productos.update({
        where: { codigoBarra: productObject.codigoBarra },
        data: {
          ...productObject,
          categoriaId: productObject.categoriaId,
          precios: undefined, // Evita intentar crear precios directamente aquí.
        },
      });
      response = { error: false, msg: "Producto actualizado con éxito" };
    } else {
      // Producto no existe, crea uno nuevo.
      await prisma.productos.create({
        data: {
          ...productObject,
          categoriaId: productObject.categoriaId,
          precios: {
            create: [{ precio: precioActual }],
          },
        },
      });
      response = { error: false, msg: "Producto guardado con éxito" };
    }
  } catch (e) {
    console.error(e);
    response = { error: true, msg: "Error al guardar el producto" };
    if (e.code === "P2002") {
      response.msg = `Ya existe un producto con el código de barras ${productObject.codigoBarra}`;
    }
  }

  revalidatePath('/productos');
  return response;
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