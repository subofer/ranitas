'use server'
import prisma from "../prisma";
import formToObject from "@/lib/formToObject"
import { texto } from "@/lib/manipularTextos";
import { revalidatePath } from 'next/cache'

// Las categorias se guardaran con la primer letra en mayusculas.

export async function guardarCategoria(formData) {
  const categoryObject = formToObject(formData)
  console.log("aca" + categoryObject.nombre)
  categoryObject.nombre = texto.mayusculas.primeras(categoryObject.nombre)
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
  try{
    await prisma.categorias.delete({
      where: {id: categoriaId}
    })
  } catch(e) {
      //console.log(e)
    }
  revalidatePath('/categorias')
}