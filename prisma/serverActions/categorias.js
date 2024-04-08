'use server'
import prisma from "../prisma";
import formToObject from "@/lib/formToObject"
import { textos } from "@/lib/manipularTextos";
import { revalidatePath } from 'next/cache'

// Las categorias se guardaran con la primer letra en mayusculas.
export async function guardarCategoria(formData) {
  const categoryObject = formToObject(formData)
  categoryObject.nombre = textos.mayusculas.primeras(categoryObject.nombre)
  delete categoryObject.filterSelect;

  let response = ""
  try{
    await prisma.categorias.create({
      data: {
        ...categoryObject,
      }
    })
    response = {meta:e.meta, error: false, msg:"Categoria guardada con exito"}
  } catch(e) {
    if(e.code == "P2002"){
      response = { meta: e.meta, error:true, msg:`Ya existe una categoria con ${e.meta.target[0]} = ${categoryObject[e.meta.target[0]]}`}
      console.log(response)
    }
  }
  revalidatePath('/categorias')
  return response
}

export async function borrarCategoria(categoriaId) {
  let result;
  try{
    result = await prisma.categorias.delete({
      where: {id: categoriaId}
    })
    return result;
  } catch(e) {
      result = {error: e,}
  } finally {
    revalidatePath('/categorias')
    return result;
  }
}