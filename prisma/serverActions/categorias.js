"use server"
import prisma from "../prisma";
import formToObject from "@/lib/formToObject"
import { textos } from "@/lib/manipularTextos";
import { revalidatePath } from 'next/cache'
import { auditAction } from "@/lib/actions/audit";
import { getSession } from "@/lib/sesion/sesion";

const revalidarCategorias = () => revalidatePath('/categorias');

// Las categorias se guardaran con las primeras letras en mayusculas.
export async function guardarCategoria(formData) {
  let response = ""
  const categoryObject = formToObject(formData)
  categoryObject.nombre = textos.mayusculas.primeras(categoryObject.nombre)
  const session = await getSession();
  const userId = session?.user || 'Sistema';

  try{
    if(categoryObject.nombre == "0" || !categoryObject?.nombre ){
      throw { error: true, code: "P2008", meta: {target: ["nombre"]}, data:categoryObject}
    }
    if(categoryObject.nombre.length < 3 ){
      throw { error: true, code: "P2009", meta: {target: ["nombre"]}, data:categoryObject}
    }

    const categoriaCreada = await prisma.categorias.create({
      data: {
        ...categoryObject,
      }
    })

    // Auditar éxito
    await auditAction({
      level: 'SUCCESS',
      action: 'GUARDAR_CATEGORIA',
      message: `Categoría guardada: ${categoriaCreada.nombre}`,
      category: 'DB',
      metadata: { categoriaId: categoriaCreada.id, categoriaName: categoriaCreada.nombre },
      userId
    });

    response = {
      error: false,
      msg:"Categoria guardada con exito",
      data: categoriaCreada
    }

  } catch(e) {
    response = { ...e, error:true }
    switch (e.code) {
      case "P2002": response.msg = `Ya existe una categoría con ${e.meta.target[0]} = ${categoryObject[e.meta.target[0]]}`;break;
      case "P2003": response.msg = "La referencia entre las tablas no se puede resolver.";break;
      case "P2004": response.msg = "Error en el formato de los datos ingresados.";break;
      case "P2008": response.msg = "El nombre no puede estar vacio, ni ser 0";break;
      case "P2009": response.msg = "El nombre no puede tener menos de 3 caracteres";break;
      default     : response.msg = "Ha ocurrido un error desconocido.";break;
    }

    // Auditar error
    await auditAction({
      level: 'ERROR',
      action: 'GUARDAR_CATEGORIA',
      message: response.msg,
      category: 'DB',
      metadata: { categoriaData: categoryObject },
      userId
    });

  }finally{
    revalidarCategorias()
    return response
  }
}

export async function borrarCategoria(categoriaId) {
  let result;
  const session = await getSession();
  const userId = session?.user || 'Sistema';

  try{
    result = await prisma.categorias.delete({
      where: {id: categoriaId}
    })

    // Auditar éxito
    await auditAction({
      level: 'SUCCESS',
      action: 'ELIMINAR_CATEGORIA',
      message: `Categoría eliminada: ${result.nombre}`,
      category: 'DB',
      metadata: { categoriaId, categoriaName: result.nombre },
      userId
    });

    return { error: false, msg: "Categoría eliminada", data: result };
  } catch(e) {
    // Auditar error
    await auditAction({
      level: 'ERROR',
      action: 'ELIMINAR_CATEGORIA',
      message: e.message,
      category: 'DB',
      metadata: { categoriaId },
      userId
    });

    return { error: true, msg: e.message };
  } finally {
    revalidarCategorias()
  }
}